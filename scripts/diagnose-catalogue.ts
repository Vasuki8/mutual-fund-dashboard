import { createHash } from 'node:crypto';
import { createGitHubStore, readLimited } from './archive-store.ts';
import { fetchVerifiedCatalogue } from './verified-catalogue.ts';
import { scheme, validCode } from '../server/validation.ts';

// Temporary read-only incident probe. No retries, history requests or archive writes.
const deadline = Date.now() + 90_000;
const emit = (event: Record<string, unknown>) => console.log(JSON.stringify(event));
const store = createGitHubStore({ repository: 'Vasuki8/mutual-fund-dashboard',
  token: process.env.GITHUB_TOKEN ?? '', deadline });
const saved = await store.loadSnapshot();
if (!saved) throw new Error('saved_snapshot_required');
emit({ phase: 'baseline', sequence: saved.checkpoint.sequence,
  catalogueFetchedAt: saved.catalogue.fetchedAt, entries: saved.catalogue.entries.length,
  lastCatalogueError: saved.checkpoint.lastCatalogueError });
if (saved.checkpoint.sourceRetryAt && Date.parse(saved.checkpoint.sourceRetryAt) > Date.now()) {
  emit({ phase: 'complete', outcome: 'deferred_source_cooldown',
    physicalSourceRequests: 0, archiveWrites: 0, historyRequests: 0 });
  process.exit(0);
}
let requests = 0;
let paused = false;
const cache = new Map<string, unknown>();
async function source(path: string): Promise<unknown> {
  if (cache.has(path)) return cache.get(path);
  if (paused || requests >= 3 || Date.now() >= deadline) throw new Error('probe_stopped');
  if (path !== '/mf/latest' && path !== '/mf' && !/^\/mf\?limit=1&offset=[1-9]\d{0,5}$/.test(path)) {
    throw new Error('probe_path_invalid');
  }
  requests++;
  const response = await fetch('https://api.mfapi.in' + path, { redirect: 'error', credentials: 'omit',
    headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(Math.min(12_000, deadline - Date.now())) });
  const headerBytes = response.headers.get('content-length');
  emit({ phase: 'response', endpoint: path, status: response.status,
    declaredBytes: headerBytes && /^\d+$/.test(headerBytes) ? Number(headerBytes) : null,
    jsonContentType: /application\/json/i.test(response.headers.get('content-type') ?? ''),
    hasRetryAfter: response.headers.has('retry-after') });
  if (!response.ok) {
    paused = response.status === 429 || response.status === 503 && response.headers.has('retry-after');
    await response.body?.cancel();
    throw new Error('probe_http_error');
  }
  let bytes: Uint8Array;
  try { bytes = await readLimited(response, 32 * 1024 * 1024); }
  catch (error) {
    const failure = error instanceof Error && ['response_size_invalid','response_body_missing'].includes(error.message)
      ? error.message : error instanceof Error && ['TimeoutError','AbortError'].includes(error.name)
        ? 'response_timeout' : 'response_read_failed';
    emit({ phase: 'body', endpoint: path, failure }); throw new Error('probe_body_invalid');
  }
  let raw: unknown;
  try { raw = JSON.parse(Buffer.from(bytes).toString('utf8')); }
  catch { emit({ phase: 'body', endpoint: path, bytes: bytes.length, failure: 'json_parse_failed' }); throw new Error('probe_json_invalid'); }
  cache.set(path, raw);
  const rows = Array.isArray(raw) ? raw : [];
  const codes = new Set<number>();
  let duplicates = 0, invalid = 0;
  const examples: Record<string, unknown>[] = [];
  for (const row of rows.slice(0, 100_000)) {
    try {
      const identity = scheme(row);
      if (codes.has(identity.schemeCode)) duplicates++;
      codes.add(identity.schemeCode);
    } catch {
      invalid++;
      if (examples.length < 5) {
        const r = row && typeof row === 'object' && !Array.isArray(row) ? row as Record<string, unknown> : {};
        examples.push({ code: validCode(r.schemeCode) ? r.schemeCode : null,
          fields: ['schemeCode','schemeName','isinGrowth','isinDivReinvestment'].map(key => ({
            field: key, type: r[key] === null ? 'null' : typeof r[key],
            length: typeof r[key] === 'string' ? r[key].length : null,
            blank: typeof r[key] === 'string' ? !r[key].trim() : null })) });
      }
    }
  }
  emit({ phase: 'payload', endpoint: path, bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'), array: Array.isArray(raw),
    rows: rows.length, validUniqueCodes: codes.size, invalidIdentities: invalid,
    duplicateIdentities: duplicates, maxCode: codes.size ? [...codes].reduce((a,b) => Math.max(a,b), 0) : null,
    inspectedRows: Math.min(rows.length, 100_000), examples });
  return raw;
}
try {
  const result = await fetchVerifiedCatalogue(source, saved.catalogue, Date.now);
  emit({ phase: 'validation', outcome: 'passed', membership: result.membership });
} catch (error) {
  const known = new Set(['source_catalogue_invalid','source_catalogue_incomplete','source_catalogue_membership_conflict',
    'probe_stopped','probe_path_invalid','probe_http_error','probe_body_invalid','probe_json_invalid']);
  emit({ phase: 'validation', outcome: 'failed', code: error instanceof Error && known.has(error.message)
    ? error.message : 'probe_transport_or_validation_error' });
}
emit({ phase: 'complete', physicalSourceRequests: requests, archiveWrites: 0, historyRequests: 0 });
