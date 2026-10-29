import type { FundData, Scheme } from './types.ts';
import { validateArchiveProvenance } from './provenance.ts';
import { validateRejectedZeroNavDates } from './nav-quality-evidence.ts';
import { getApiConnection, isStaticRuntime } from './runtime.ts';
import { loadSharedFund, searchCurrentOpenEndedCatalogue } from './shared-archive.ts';
import { getCachedFund, getCachedSearch, normalizeNavRecords, putCachedFund, putCachedSearch,
  assertStorageGeneration, getStorageGeneration, storageWarning, validSchemeCode, validateScheme } from './storage.ts';

// The Pages build uses MFAPI directly. Legacy browsers keep the same-origin
// service, while Node consumers retain direct access for source validation.
const { baseUrl: BASE_URL, credentials: REQUEST_CREDENTIALS } = getApiConnection();
const HISTORY_TTL = 6 * 60 * 60 * 1_000;
const SEARCH_TTL = 24 * 60 * 60 * 1_000;
const REQUEST_TIMEOUT = 35_000;
const MAX_RETRY_WAIT = 5_000;
const pendingFunds = new Map<string, Promise<FundData>>();
const pendingSourceFunds = new Map<string, Promise<FundData>>();
const pendingSearches = new Map<string, Promise<Scheme[]>>();
let activeRequests = 0;
const waiting: Array<() => void> = [];

class ProviderError extends Error {
  status: number | null;
  retryAfter: number | null;
  transient: boolean;
  constructor(message: string, status: number | null = null, retryAfter: number | null = null, transient = false) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.retryAfter = retryAfter;
    this.transient = transient;
  }
}

async function requestSlot<T>(action: () => Promise<T>): Promise<T> {
  await new Promise<void>(resolve => {
    if (activeRequests < 3) { activeRequests += 1; resolve(); }
    else waiting.push(resolve);
  });
  try { return await action(); }
  finally {
    const next = waiting.shift();
    if (next) next();
    else activeRequests -= 1;
  }
}

function retryDelay(header: string | null): number | null {
  if (header === null) return null;
  const seconds = Number(header);
  if (header.trim() && Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

async function fetchOnce(path: string, generation: number): Promise<unknown> {
  return requestSlot(async () => {
    assertStorageGeneration(generation);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      let response: Response;
      try {
        response = await fetch(`${BASE_URL}${path}`, {
          signal: controller.signal, credentials: REQUEST_CREDENTIALS, headers: { Accept: 'application/json' }, cache: 'no-store',
        });
      } catch (error) {
        const message = controller.signal.aborted ? 'Fund data request timed out after 35 seconds.' : 'Fund data could not be reached. Check your connection and try again.';
        const transient = error instanceof TypeError || controller.signal.aborted
          || (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name));
        throw new ProviderError(message, null, null, transient);
      }
      if (!response.ok) {
        throw new ProviderError(`MFAPI request failed (HTTP ${response.status}).`, response.status,
          retryDelay(response.headers.get('Retry-After')), [408, 425, 429, 500, 502, 503, 504].includes(response.status));
      }
      let content: string;
      try { content = await response.text(); }
      catch { throw new ProviderError('MFAPI response could not be read.', null, null, true); }
      if (content.length > 10 * 1024 * 1024) throw new ProviderError('MFAPI response exceeds the supported size limit.');
      try { return JSON.parse(content) as unknown; }
      catch { throw new ProviderError('MFAPI returned invalid JSON.'); }
    } finally { clearTimeout(timeout); }
  });
}

async function requestJson(path: string, generation: number): Promise<unknown> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    assertStorageGeneration(generation);
    try {
      const result = await fetchOnce(path, generation);
      assertStorageGeneration(generation);
      return result;
    }
    catch (error) {
      assertStorageGeneration(generation);
      if (!(error instanceof ProviderError) || !error.transient || attempt > 0
          || (error.retryAfter !== null && error.retryAfter > MAX_RETRY_WAIT)) throw error;
      await new Promise(resolve => setTimeout(resolve, error.retryAfter ?? 250));
    }
  }
  throw new Error('MFAPI request failed.');
}

function metadataString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) throw new Error(`Invalid ${field} metadata from MFAPI.`);
  return value;
}

export function validateFundResponse(payload: unknown, code: number): FundData {
  if (!validSchemeCode(code)) throw new Error('Invalid requested scheme code.');
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid MFAPI fund response.');
  const body = payload as Record<string, unknown>;
  if (body.status !== 'SUCCESS') throw new Error('MFAPI returned an unsuccessful response status.');
  if (!body.meta || typeof body.meta !== 'object' || Array.isArray(body.meta)) throw new Error('Missing scheme metadata from MFAPI.');
  const meta = body.meta as Record<string, unknown>;
  if (meta.scheme_code !== code) throw new Error('MFAPI scheme code does not match the requested plan identity.');
  const scheme = validateScheme({ schemeCode: meta.scheme_code, schemeName: meta.scheme_name,
    isinGrowth: meta.isin_growth, isinDivReinvestment: meta.isin_div_reinvestment });
  const normalized = normalizeNavRecords(body.data, 'mfapi');
  const archive = validateArchiveProvenance(body._fundscope);
  if (archive && (archive.observationCount !== normalized.points.length
    || archive.coverageStart !== normalized.points[0].date || archive.coverageEnd !== normalized.points.at(-1)!.date)) {
    throw new Error('Archive provenance does not match its observation count or coverage.');
  }
  if (archive?.rejectedZeroNavDates !== undefined
    && normalized.warnings.some(warning => /^(Invalid NAV|Conflicting NAV)/.test(warning))) {
    throw new Error('Archived rejection evidence cannot account for additional invalid NAV observations.');
  }
  const warnings = [...new Set([...normalized.warnings, ...(archive?.warnings ?? [])])];
  const rejectedZeroNavDates = validateRejectedZeroNavDates(archive ? archive.rejectedZeroNavDates : normalized.rejectedZeroNavDates,
    warnings, normalized.points.map(point => point.date));
  const sourceObservedAt = archive?.archivedAt ?? new Date().toISOString();
  return { meta: { ...scheme, fundHouse: metadataString(meta.fund_house, 'fund house'),
    schemeType: metadataString(meta.scheme_type, 'scheme type'), schemeCategory: metadataString(meta.scheme_category, 'scheme category') },
    points: normalized.points, fetchedAt: archive?.fetchedAt ?? sourceObservedAt, sourceObservedAt,
    source: 'mfapi.in', fromCache: false, stale: archive?.stale ?? false,
    warnings, ...(rejectedZeroNavDates ? { rejectedZeroNavDates } : {}), ...(archive ? { archive } : {}) };
}

function fresh(fetchedAt: string, ttl: number): boolean {
  const age = Date.now() - Date.parse(fetchedAt);
  return Number.isFinite(age) && age >= 0 && age < ttl;
}

function decorate(fund: FundData, fromCache: boolean, stale: boolean, message?: string): FundData {
  const result = structuredClone(fund);
  result.fromCache = fromCache;
  result.stale = stale || fund.stale;
  result.warnings = [...new Set([...result.warnings, ...(message ? [message] : []), ...(storageWarning() ? [storageWarning()!] : [])])];
  return result;
}

/** Share actual source fetch/validation, independently of archive and force policy. */
async function requestSourceFund(code: number, generation: number): Promise<FundData> {
  assertStorageGeneration(generation);
  const key = `${generation}:${code}`;
  let pending = pendingSourceFunds.get(key);
  if (!pending) {
    pending = (async () => {
      const payload = await requestJson(`/mf/${code}`, generation);
      assertStorageGeneration(generation);
      return validateFundResponse(payload, code);
    })();
    pendingSourceFunds.set(key, pending);
  }
  try {
    const fund = await pending;
    assertStorageGeneration(generation);
    return fund;
  } finally {
    if (pendingSourceFunds.get(key) === pending) pendingSourceFunds.delete(key);
  }
}

async function refreshFund(code: number, cached: FundData | null, generation: number, force = false): Promise<FundData> {
  let fallback = cached;
  let archiveWarning = '';
  if (isStaticRuntime() && !force) {
    try {
      const payload = await loadSharedFund(code);
      assertStorageGeneration(generation);
      if (payload) {
        fallback = await putCachedFund(validateFundResponse(payload, code), generation);
        assertStorageGeneration(generation);
        if (!fallback.stale && fresh(fallback.fetchedAt, HISTORY_TTL)) return decorate(fallback, false, false);
      }
    } catch {
      assertStorageGeneration(generation);
      archiveWarning = 'The shared archive could not be verified; this history was requested directly from MFAPI.';
    }
  }
  try {
    const fund = await requestSourceFund(code, generation);
    assertStorageGeneration(generation);
    const saved = await putCachedFund(fund, generation);
    assertStorageGeneration(generation);
    if (saved.points.at(-1)!.date > fund.points.at(-1)!.date) {
      return decorate(saved, true, true, 'A newer saved history was retained instead of an older provider response.');
    }
    return decorate(saved, false, false, archiveWarning || undefined);
  } catch (error) {
    assertStorageGeneration(generation);
    if (!fallback && isStaticRuntime() && force) {
      try {
        const payload = await loadSharedFund(code);
        assertStorageGeneration(generation);
        if (payload) fallback = await putCachedFund(validateFundResponse(payload, code), generation);
      } catch { assertStorageGeneration(generation); }
    }
    assertStorageGeneration(generation);
    if (!fallback) throw error;
    const reason = error instanceof Error ? error.message : 'The provider could not be reached.';
    return decorate(fallback, true, true, `Refresh failed: ${reason} Showing the saved history fetched ${fallback.fetchedAt}.`);
  }
}

export async function getFund(code: number, options: { force?: boolean } = {}): Promise<FundData> {
  if (!validSchemeCode(code)) throw new Error('Invalid requested scheme code.');
  const generation = getStorageGeneration();
  // A manual source refresh must not be absorbed by an in-flight archive read.
  const key = `${generation}:${code}${isStaticRuntime() && options.force ? ':source' : ''}`;
  const current = pendingFunds.get(key);
  if (current) {
    const result = await current;
    assertStorageGeneration(generation);
    return structuredClone(result);
  }
  const cached = await getCachedFund(code, generation);
  assertStorageGeneration(generation);
  if (!options.force && cached && !cached.stale && fresh(cached.fetchedAt, HISTORY_TTL)) {
    return decorate(cached, true, false, `Using cached NAV history fetched ${cached.fetchedAt}.`);
  }
  const pending = pendingFunds.get(key);
  if (pending) {
    const result = await pending;
    assertStorageGeneration(generation);
    return structuredClone(result);
  }
  const request = refreshFund(code, cached, generation, options.force === true);
  pendingFunds.set(key, request);
  try {
    const result = await request;
    assertStorageGeneration(generation);
    return structuredClone(result);
  } finally { if (pendingFunds.get(key) === request) pendingFunds.delete(key); }
}

function searchResults(payload: unknown): Scheme[] {
  if (!Array.isArray(payload) || payload.length > 50_000) throw new Error('Invalid MFAPI search results: expected a scheme array.');
  const results = new Map<number, Scheme>();
  for (const entry of payload) {
    const scheme = validateScheme(entry);
    const existing = results.get(scheme.schemeCode);
    if (existing && existing.schemeName !== scheme.schemeName) throw new Error('Conflicting scheme identities in MFAPI search results.');
    results.set(scheme.schemeCode, scheme);
  }
  return [...results.values()];
}

export async function searchSchemes(query: string): Promise<Scheme[]> {
  const generation = getStorageGeneration();
  const trimmed = query.trim().replace(/\s+/g, ' ');
  if (!trimmed) return [];
  if (trimmed.length > 200) throw new Error('Search query exceeds the 200-character limit.');
  const numericCode = /^\d+$/.test(trimmed) ? Number(trimmed) : null;
  if (numericCode !== null && !validSchemeCode(numericCode)) throw new Error('Invalid requested scheme code.');
  const key = trimmed.toLowerCase();
  const requestKey = `${generation}:${key}`;
  const running = pendingSearches.get(requestKey);
  if (running) {
    const results = await running;
    assertStorageGeneration(generation);
    return structuredClone(results);
  }
  const request = (async () => {
    let shared: Scheme[] | null = null;
    if (isStaticRuntime()) {
      // An empty verified match is a real result. Never fall back to a raw
      // MFAPI query that would re-introduce closed or stale schemes.
      try { shared = await searchCurrentOpenEndedCatalogue(numericCode === null ? trimmed : String(numericCode)); }
      catch {
        assertStorageGeneration(generation);
        throw new Error('Current open-ended fund directory is unavailable. Check Data Status and retry.');
      }
      assertStorageGeneration(generation);
      if (shared === null) throw new Error('Current open-ended fund directory is unavailable. Retry after archive publication.');
      if (numericCode !== null) shared = shared.filter(scheme => scheme.schemeCode === numericCode);
      return shared;
    }
    if (numericCode !== null) {
      const { meta } = await getFund(numericCode);
      assertStorageGeneration(generation);
      return [validateScheme(meta)];
    }
    const cached = await getCachedSearch(key, generation);
    assertStorageGeneration(generation);
    if (cached && fresh(cached.fetchedAt, SEARCH_TTL)) return cached.schemes;
    let results: Scheme[];
    try { results = searchResults(await requestJson(`/mf/search?q=${encodeURIComponent(trimmed)}`, generation)); }
    catch (error) {
      assertStorageGeneration(generation);
      if (shared === null) throw error;
      results = shared;
    }
    assertStorageGeneration(generation);
    await putCachedSearch(key, results, generation);
    assertStorageGeneration(generation);
    return results;
  })();
  pendingSearches.set(requestKey, request);
  try {
    const results = await request;
    assertStorageGeneration(generation);
    return structuredClone(results);
  } finally { if (pendingSearches.get(requestKey) === request) pendingSearches.delete(requestKey); }
}
