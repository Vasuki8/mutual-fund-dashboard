import { buildCatalogue, scheme } from '../server/validation.ts';
import type { Catalogue } from '../server/types.ts';
import { validateCatalogue } from './archive-model.ts';

interface CatalogueDiagnostic {
  stage: 'configuration' | 'bulk_nav' | 'membership_list' | 'membership_crosscheck' | 'terminal_probe';
  reason: 'minimum_size_invalid' | 'response_not_array' | 'row_count_out_of_range'
    | 'scheme_identity_invalid' | 'scheme_code_invalid' | 'scheme_name_invalid' | 'isin_invalid'
    | 'duplicate_scheme_code' | 'catalogue_invalid' | 'catalogue_entry_invalid' | 'catalogue_membership_invalid'
    | 'validation_failed' | 'large_contraction' | 'bulk_codes_missing' | 'terminal_not_empty';
  rows?: number;
  previousEntries?: number;
  listedSchemes?: number;
  bulkNavSchemes?: number;
}
export class CatalogueIntegrityError extends Error {
  readonly diagnostic?: CatalogueDiagnostic;
  constructor(code: 'source_catalogue_invalid' | 'source_catalogue_incomplete' | 'source_catalogue_membership_conflict',
    diagnostic?: CatalogueDiagnostic) {
    super(code); this.name = 'CatalogueIntegrityError'; this.diagnostic = diagnostic;
  }
}
function requireValue(value: unknown, code: ConstructorParameters<typeof CatalogueIntegrityError>[0],
  diagnostic: CatalogueDiagnostic): asserts value {
  if (!value) throw new CatalogueIntegrityError(code, diagnostic);
}
/** Only known validator messages become static reasons; source text is never logged. */
function validationReason(error: unknown): CatalogueDiagnostic['reason'] {
  const reasons = new Map<string, CatalogueDiagnostic['reason']>([
    ['Invalid MFAPI scheme identity.', 'scheme_identity_invalid'],
    ['Invalid MFAPI scheme code.', 'scheme_code_invalid'],
    ['Invalid MFAPI scheme name.', 'scheme_name_invalid'],
    ['Invalid MFAPI ISIN.', 'isin_invalid'],
    ['Duplicate scheme code in the MFAPI latest catalogue.', 'duplicate_scheme_code'],
    ['catalogue_invalid', 'catalogue_invalid'],
    ['catalogue_entry_invalid', 'catalogue_entry_invalid'],
    ['catalogue_membership_invalid', 'catalogue_membership_invalid'],
  ]);
  return error instanceof Error ? reasons.get(error.message) ?? 'validation_failed' : 'validation_failed';
}

/**
 * The bulk NAV cache is not an authoritative scheme-membership list.
 * Three bounded metadata requests use the caller's existing transport and
 * deadline/cooldown rules. No full histories are requested here.
 * https://www.mfapi.in/docs/openapi.json
 */
export async function fetchVerifiedCatalogue(
  source: (path: string) => Promise<unknown>, previous: Catalogue | null,
  now: () => number, minimumSize = 10_000): Promise<Catalogue> {
  requireValue(Number.isSafeInteger(minimumSize) && minimumSize >= 1 && minimumSize <= 100_000,
    'source_catalogue_invalid', { stage: 'configuration', reason: 'minimum_size_invalid' });
  const rawLatest = await source('/mf/latest');
  requireValue(Array.isArray(rawLatest), 'source_catalogue_invalid', { stage: 'bulk_nav', reason: 'response_not_array' });
  requireValue(rawLatest.length >= minimumSize && rawLatest.length <= 100_000,
    'source_catalogue_invalid', { stage: 'bulk_nav', reason: 'row_count_out_of_range', rows: rawLatest.length });
  let next: Catalogue;
  try { next = validateCatalogue(buildCatalogue(rawLatest, previous, [], new Date(now()).toISOString())); }
  catch (error) { throw new CatalogueIntegrityError('source_catalogue_invalid', {
    stage: 'bulk_nav', reason: validationReason(error), rows: rawLatest.length, previousEntries: previous?.entries.length ?? 0 }); }

  const rawList = await source('/mf');
  requireValue(Array.isArray(rawList), 'source_catalogue_invalid', { stage: 'membership_list', reason: 'response_not_array' });
  requireValue(rawList.length >= minimumSize && rawList.length <= 100_000,
    'source_catalogue_invalid', { stage: 'membership_list', reason: 'row_count_out_of_range', rows: rawList.length });
  const listing = new Map<number, ReturnType<typeof scheme>>();
  try {
    for (const raw of rawList) {
      const identity = scheme(raw);
      requireValue(!listing.has(identity.schemeCode), 'source_catalogue_invalid', {
        stage: 'membership_list', reason: 'duplicate_scheme_code', rows: rawList.length });
      listing.set(identity.schemeCode, identity);
    }
  } catch (error) {
    if (error instanceof CatalogueIntegrityError) throw error;
    throw new CatalogueIntegrityError('source_catalogue_invalid', {
      stage: 'membership_list', reason: validationReason(error), rows: rawList.length });
  }
  // A sudden large disappearance is ambiguous, even if both endpoints share
  // an upstream partial cache. Preserve the prior catalogue for review.
  if (previous && previous.entries.length >= 100) {
    requireValue(listing.size >= previous.entries.length * 0.9, 'source_catalogue_incomplete', {
      stage: 'membership_list', reason: 'large_contraction', listedSchemes: listing.size, previousEntries: previous.entries.length });
  }
  const bulkCodes = new Set(rawLatest.map(raw => scheme(raw).schemeCode));
  requireValue([...bulkCodes].every(code => listing.has(code)), 'source_catalogue_membership_conflict', {
    stage: 'membership_crosscheck', reason: 'bulk_codes_missing', listedSchemes: listing.size, bulkNavSchemes: bulkCodes.size });

  // Verify that the unpaginated response was not merely a default first page.
  // A nonempty terminal page (including a concurrent source expansion) fails
  // closed; do not silently publish a partial or mixed membership snapshot.
  const tail = await source(`/mf?limit=1&offset=${listing.size}`);
  requireValue(Array.isArray(tail), 'source_catalogue_incomplete', { stage: 'terminal_probe', reason: 'response_not_array' });
  requireValue(tail.length === 0, 'source_catalogue_incomplete', { stage: 'terminal_probe', reason: 'terminal_not_empty', rows: tail.length });

  const entries = new Map(next.entries.map(entry => [entry.schemeCode, { ...entry, current: false }]));
  for (const identity of listing.values()) {
    const saved = entries.get(identity.schemeCode);
    entries.set(identity.schemeCode, { ...saved, ...identity, current: true,
      latestDate: saved?.latestDate ?? null, nav: saved?.nav ?? null });
  }
  const absent = entries.size - listing.size;
  const missingBulkNav = listing.size - bulkCodes.size;
  const warnings = next.warnings.filter(warning =>
    !/^\d+ previously known scheme\(s\) are absent from the current provider catalogue and remain retained\.$/.test(warning));
  if (absent) warnings.push(`${absent} previously known scheme(s) are absent from the independently verified source scheme list; saved observations remain retained.`);
  if (missingBulkNav) warnings.push(`${missingBulkNav} listed scheme(s) are absent from the bulk NAV response; original saved NAV observations are retained where available, without assigning a new price or date.`);
  const fetchedAt = new Date(now()).toISOString();
  return validateCatalogue({ version: 1, fetchedAt,
    entries: [...entries.values()].sort((left, right) => left.schemeCode - right.schemeCode), warnings,
    membership: { source: 'mf-list', verifiedAt: fetchedAt, listedSchemes: listing.size,
      bulkNavSchemes: bulkCodes.size, missingBulkNav } });
}
