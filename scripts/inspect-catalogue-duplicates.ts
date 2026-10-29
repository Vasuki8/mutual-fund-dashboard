import { createHash } from 'node:crypto';
import { createGitHubStore, readLimited } from './archive-store.ts';
import { scheme } from '../server/validation.ts';

// Temporary read-only inspection: at most three metadata requests, no retries or archive writes.
const deadline = Date.now() + 90_000;
const emit = (value: Record<string, unknown>) => console.log(JSON.stringify(value));
let requests = 0;
async function request(path: string): Promise<unknown> {
  if (requests >= 3 || Date.now() >= deadline || !(path === '/mf'
    || /^\/mf\?limit=1&offset=[1-9]\d{0,5}$/.test(path) && Number(path.split('=').at(-1)) <= 100_000)) {
    throw new Error('probe_bound');
  }
  requests++;
  const response = await fetch('https://api.mfapi.in' + path, { redirect: 'error', credentials: 'omit',
    headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(Math.min(12_000, deadline - Date.now())) });
  emit({ phase: 'response', request: requests, status: response.status });
  if (!response.ok) { await response.body?.cancel(); throw new Error('probe_http_failure'); }
  const bytes = await readLimited(response, 32 * 1024 * 1024);
  const value: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'));
  emit({ phase: 'payload', request: requests, bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'), array: Array.isArray(value),
    rows: Array.isArray(value) ? value.length : null });
  return value;
}
try {
  const store = createGitHubStore({ repository: 'Vasuki8/mutual-fund-dashboard',
    token: process.env.GITHUB_TOKEN ?? '', deadline });
  const saved = await store.loadSnapshot();
  if (!saved) throw new Error('saved_snapshot_required');
  emit({ phase: 'baseline', sequence: saved.checkpoint.sequence, catalogueFetchedAt: saved.catalogue.fetchedAt,
    previousEntries: saved.catalogue.entries.length, sourceRetryAt: saved.checkpoint.sourceRetryAt });
  if (saved.checkpoint.sourceRetryAt && Date.parse(saved.checkpoint.sourceRetryAt) > Date.now()) {
    emit({ phase: 'complete', outcome: 'deferred_source_cooldown', requests: 0, archiveWrites: 0 });
    process.exit(0);
  }
  const raw = await request('/mf');
  if (!Array.isArray(raw) || !raw.length || raw.length > 100_000) throw new Error('probe_shape');
  const byCode = new Map<number, { identity: string; raw: string; count: number }>();
  let invalid = 0, duplicates = 0, conflicts = 0, rawDifferences = 0;
  const parsed: (string | null)[] = [];
  for (const row of raw) {
    try {
      const identity = scheme(row), serialized = JSON.stringify(identity), serializedRaw = JSON.stringify(row);
      parsed.push(serialized);
      const previous = byCode.get(identity.schemeCode);
      if (!previous) byCode.set(identity.schemeCode, { identity: serialized, raw: serializedRaw, count: 1 });
      else {
        duplicates++; previous.count++;
        if (previous.identity !== serialized) conflicts++;
        if (previous.raw !== serializedRaw) rawDifferences++;
      }
    } catch { invalid++; parsed.push(null); }
  }
  const occurrences = [...byCode.values()].map(value => value.count);
  emit({ phase: 'identities', rows: raw.length, uniqueSchemes: byCode.size, invalidRows: invalid,
    repeatedRows: duplicates, conflictingValidatedRows: conflicts, differingRawRepeatedRows: rawDifferences,
    twoIdenticalIdentityPasses: raw.length % 2 === 0 && parsed.slice(0, raw.length / 2)
      .every((value, index) => value !== null && value === parsed[index + raw.length / 2]),
    minimumOccurrences: occurrences.reduce((a, b) => Math.min(a, b), Infinity),
    maximumOccurrences: occurrences.reduce((a, b) => Math.max(a, b), 0) });
  if (!invalid && !conflicts && byCode.size > 0) {
    for (const offset of [...new Set([raw.length, byCode.size])]) {
      const tail = await request(`/mf?limit=1&offset=${offset}`);
      emit({ phase: 'pagination', offset, array: Array.isArray(tail), rows: Array.isArray(tail) ? tail.length : null,
        matchesObservedOffset: Array.isArray(tail) && (offset === raw.length ? tail.length === 0
          : tail.length === 1 && JSON.stringify(scheme(tail[0])) === parsed[offset]) });
    }
  }
} catch (error) {
  const known = ['probe_bound', 'probe_http_failure', 'probe_shape', 'response_size_invalid', 'response_body_missing'];
  emit({ phase: 'failure', code: error instanceof Error && known.includes(error.message) ? error.message
    : error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'probe_timeout' : 'probe_read_or_validation_failure' });
}
emit({ phase: 'complete', requests, archiveWrites: 0, historyRequests: 0 });
