import { buildCatalogue, scheme } from '../server/validation.ts';
import type { Catalogue } from '../server/types.ts';
import { validateCatalogue } from './archive-model.ts';

export class CatalogueIntegrityError extends Error {
  constructor(code: 'source_catalogue_invalid' | 'source_catalogue_incomplete' | 'source_catalogue_membership_conflict') {
    super(code); this.name = 'CatalogueIntegrityError';
  }
}
function requireValue(value: unknown, code: ConstructorParameters<typeof CatalogueIntegrityError>[0]): asserts value {
  if (!value) throw new CatalogueIntegrityError(code);
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
    'source_catalogue_invalid');
  const rawLatest = await source('/mf/latest');
  requireValue(Array.isArray(rawLatest) && rawLatest.length >= minimumSize && rawLatest.length <= 100_000,
    'source_catalogue_invalid');
  let next: Catalogue;
  try { next = validateCatalogue(buildCatalogue(rawLatest, previous, [], new Date(now()).toISOString())); }
  catch { throw new CatalogueIntegrityError('source_catalogue_invalid'); }

  const rawList = await source('/mf');
  requireValue(Array.isArray(rawList) && rawList.length >= minimumSize && rawList.length <= 100_000,
    'source_catalogue_invalid');
  const listing = new Map<number, ReturnType<typeof scheme>>();
  try {
    for (const raw of rawList) {
      const identity = scheme(raw);
      requireValue(!listing.has(identity.schemeCode), 'source_catalogue_invalid');
      listing.set(identity.schemeCode, identity);
    }
  } catch { throw new CatalogueIntegrityError('source_catalogue_invalid'); }
  // A sudden large disappearance is ambiguous, even if both endpoints share
  // an upstream partial cache. Preserve the prior catalogue for review.
  if (previous && previous.entries.length >= 100) {
    requireValue(listing.size >= previous.entries.length * 0.9, 'source_catalogue_incomplete');
  }
  const bulkCodes = new Set(rawLatest.map(raw => scheme(raw).schemeCode));
  requireValue([...bulkCodes].every(code => listing.has(code)), 'source_catalogue_membership_conflict');

  // Verify that the unpaginated response was not merely a default first page.
  // A nonempty terminal page (including a concurrent source expansion) fails
  // closed; do not silently publish a partial or mixed membership snapshot.
  const tail = await source(`/mf?limit=1&offset=${listing.size}`);
  requireValue(Array.isArray(tail) && tail.length === 0, 'source_catalogue_incomplete');

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
