import type { ArchiveProvenance, SyncProgress, SyncStatus } from '../src/lib/sync-types.ts';
import type { Scheme } from '../src/lib/types.ts';
import { ApiError } from './types.ts';
import type { ArchiveBindings, ArchiveIndex, Catalogue, CatalogueState, FailureRow, HistoryDocument,
  QueueItem, RunRow, Runtime, RuntimeOptions, WorkQueue } from './types.ts';
import { buildCatalogue, searchResults, validCode, validateHistory } from './validation.ts';
import { Provider } from './provider.ts';
import { ArchiveStore } from './store.ts';

const HISTORY_TTL = 6 * 60 * 60 * 1000;

async function authenticate(request: Request, secret: string | undefined): Promise<void> {
  if (!secret) throw new ApiError('Server sync authentication is not configured.', 503);
  const supplied = request.headers.get('x-fundscope-sync-token') ?? '';
  if (!supplied || supplied.length > 8192) throw new ApiError('Unauthorized synchronization request.', 401);
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(secret)),
    crypto.subtle.digest('SHA-256', encoder.encode(supplied)),
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  if (difference !== 0) throw new ApiError('Unauthorized synchronization request.', 401);
}

function normalizedRuntime(options: RuntimeOptions): Runtime {
  return { fetch: options.fetch ?? globalThis.fetch.bind(globalThis), now: options.now ?? (() => new Date()),
    sleep: options.sleep ?? (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))) };
}

function identifier(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 100 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new ApiError(`Invalid ${name}; expected a nonempty string of at most 100 characters.`, 400);
  }
  return value;
}

async function bodyObject(request: Request): Promise<Record<string, unknown>> {
  if (Number(request.headers.get('Content-Length')) > 16_384) throw new ApiError('Request body is too large.', 413);
  const text = await request.text();
  if (text.length > 16_384) throw new ApiError('Request body is too large.', 413);
  let body: unknown;
  try { body = JSON.parse(text); } catch { throw new ApiError('Expected a JSON request body.', 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError('Expected a JSON object.', 400);
  return body as Record<string, unknown>;
}

function buildQueue(catalogue: Catalogue, indexes: ArchiveIndex[], failures: FailureRow[], now: number): QueueItem[] {
  const archived = new Map(indexes.map(index => [index.scheme_code, index]));
  const failed = new Map(failures.map(failure => [failure.scheme_code, failure]));
  const refresh: QueueItem[] = [];
  const backfill: QueueItem[] = [];
  for (const entry of catalogue.entries) {
    const index = archived.get(entry.schemeCode);
    const item = { code: entry.schemeCode, latestDate: entry.latestDate };
    if (!index) backfill.push(item);
    else if (index.unresolved || failed.has(entry.schemeCode)
      || (entry.latestDate !== null && entry.latestDate > index.coverage_end)
      || now - Date.parse(index.fetched_at) >= HISTORY_TTL) refresh.push(item);
  }
  const retryOrder = (a: QueueItem, b: QueueItem) => {
    const left = failed.get(a.code);
    const right = failed.get(b.code);
    return Number((left?.next_retry_at ?? 0) > now) - Number((right?.next_retry_at ?? 0) > now)
      || (left?.attempts ?? 0) - (right?.attempts ?? 0);
  };
  refresh.sort((a, b) => retryOrder(a, b)
    || archived.get(a.code)!.fetched_at.localeCompare(archived.get(b.code)!.fetched_at) || a.code - b.code);
  backfill.sort((a, b) => retryOrder(a, b) || a.code - b.code);
  // Reserve every other slot for backfill while both groups exist. Sorting refreshes by
  // oldest successful fetch prevents the same low scheme codes monopolizing later runs.
  const work: QueueItem[] = [];
  for (let index = 0; index < Math.max(refresh.length, backfill.length); index += 1) {
    if (refresh[index]) work.push(refresh[index]);
    if (backfill[index]) work.push(backfill[index]);
  }
  return work;
}

class Service {
  store: ArchiveStore;
  provider: Provider;
  runtime: Runtime;
  constructor(env: ArchiveBindings, runtime: Runtime) {
    if (!env.DB || !env.BUCKET) throw new ApiError('Persistent archive storage is not configured.', 503);
    this.runtime = runtime;
    this.store = new ArchiveStore(env, runtime);
    this.provider = new Provider(runtime);
  }

  private provenance(document: HistoryDocument, fromArchive: boolean, stale = document.unresolved, extra: string[] = []): ArchiveProvenance {
    return { fetchedAt: document.fetchedAt, archivedAt: document.archivedAt, fromArchive, stale,
      coverageStart: document.coverageStart, coverageEnd: document.coverageEnd,
      observationCount: document.payload.data.length, warnings: [...new Set([...document.warnings, ...extra])] };
  }

  async fund(code: number): Promise<HistoryDocument['payload'] & { _fundscope: ArchiveProvenance }> {
    const cached = await this.store.history(code);
    const catalogue = await this.store.catalogue().catch(() => null);
    const expectedLatest = catalogue?.catalogue?.entries.find(entry => entry.schemeCode === code)?.latestDate ?? null;
    const catalogueWarnings = catalogue === null ? ['Catalogue freshness metadata is temporarily unavailable.'] : [];
    const age = cached ? this.runtime.now().getTime() - Date.parse(cached.fetchedAt) : Infinity;
    if (cached && age >= 0 && age < HISTORY_TTL && (!expectedLatest || cached.coverageEnd >= expectedLatest)) {
      return { ...cached.payload, _fundscope: this.provenance(cached, true, cached.unresolved || catalogue === null, catalogueWarnings) };
    }
    const fetchedAt = this.runtime.now().toISOString();
    try {
      const parsed = validateHistory(await this.provider.json(`/mf/${code}`), code);
      const document = await this.store.persistHistory(parsed, fetchedAt, expectedLatest);
      if (document.unresolved) await this.store.failure(code, null,
        new ApiError('Source history quality or latest-date coverage remains unresolved.'), fetchedAt, expectedLatest);
      return { ...document.payload, _fundscope: this.provenance(document, document.fetchedAt !== fetchedAt,
        document.unresolved || catalogue === null, catalogueWarnings) };
    } catch (error) {
      // Re-read the index: another request may have published a newer valid object while this one failed.
      const retained = await this.store.history(code).catch(() => cached) ?? cached;
      if (!retained) throw error;
      const reason = error instanceof ApiError ? error.message : 'Archive refresh could not be persisted.';
      return { ...retained.payload, _fundscope: this.provenance(retained, true, true,
        [`Refresh failed: ${reason} Showing saved history fetched ${retained.fetchedAt}.`]) };
    }
  }

  async search(query: string): Promise<Scheme[]> {
    const trimmed = query.trim().replace(/\s+/g, ' ');
    if (!trimmed) return [];
    if (trimmed.length > 200) throw new ApiError('Search query exceeds the 200-character limit.', 400);
    const lower = trimmed.toLowerCase();
    const catalogue = (await this.store.catalogue()).catalogue;
    const numeric = /^\d+$/.test(trimmed);
    const code = numeric ? Number(trimmed) : null;
    if (numeric && !validCode(code)) throw new ApiError('Invalid requested scheme code.', 400);
    const matches = (catalogue?.entries ?? []).filter(entry => numeric ? entry.schemeCode === code
      : entry.schemeName.toLowerCase().includes(lower));
    const local = matches.map(({ schemeCode, schemeName, isinGrowth, isinDivReinvestment }) => ({ schemeCode, schemeName,
      ...(isinGrowth === undefined ? {} : { isinGrowth }), ...(isinDivReinvestment === undefined ? {} : { isinDivReinvestment }) }));
    if (numeric) {
      if (local.length) return local;
      const indexed = await this.store.index(code!);
      if (indexed) return [{ schemeCode: code!, schemeName: indexed.scheme_name }];
      const fund = await this.fund(code!);
      return [{ schemeCode: code!, schemeName: fund.meta.scheme_name,
        isinGrowth: fund.meta.isin_growth, isinDivReinvestment: fund.meta.isin_div_reinvestment }];
    }
    try {
      const remote = searchResults(await this.provider.json(`/mf/search?q=${encodeURIComponent(trimmed)}`));
      const union = new Map(local.map(entry => [entry.schemeCode, entry]));
      for (const entry of remote) union.set(entry.schemeCode, entry);
      return [...union.values()];
    } catch (error) {
      if (catalogue) return local;
      // Before the first catalogue sync, on-demand archives still provide a durable search fallback.
      const saved = (await this.store.indexes()).filter(index => index.scheme_name.toLowerCase().includes(lower))
        .map(index => ({ schemeCode: index.scheme_code, schemeName: index.scheme_name }));
      if (saved.length) return saved;
      throw error;
    }
  }

  async status(): Promise<SyncStatus> {
    const [{ state, catalogue }, indexes, failures, lastRun] = await Promise.all([
      this.store.catalogue(), this.store.indexes(), this.store.failures(),
      this.store.first<RunRow>('SELECT * FROM fundscope_runs ORDER BY started_at DESC, rowid DESC LIMIT 1'),
    ]);
    const archived = new Map(indexes.map(index => [index.scheme_code, index]));
    const known = new Map((catalogue?.entries ?? []).map(entry => [entry.schemeCode, entry.latestDate]));
    for (const index of indexes) if (!known.has(index.scheme_code)) known.set(index.scheme_code, index.coverage_end);
    const failed = new Set(failures.map(failure => failure.scheme_code));
    let backlog = 0;
    for (const [code, latest] of known) {
      const index = archived.get(code);
      if (!index || index.unresolved || failed.has(code) || (latest !== null && latest > index.coverage_end)) backlog += 1;
    }
    const successful = indexes.filter(index => !index.unresolved).map(index => index.fetched_at).sort();
    const warnings = [...(catalogue?.warnings ?? []),
      ...(!state ? ['The initial catalogue synchronization has not completed; full-universe coverage is not yet known.'] : []),
      ...(backlog ? [`${backlog} known scheme(s) still require history backfill, refresh, or source-quality resolution.`] : []),
      ...(lastRun?.status === 'failed' && lastRun.error ? [`Last synchronization failed: ${lastRun.error}`] : []),
    ];
    return { source: 'mfapi.in', catalogueCount: known.size, archivedCount: indexes.length,
      observationCount: indexes.reduce((total, index) => total + index.observation_count, 0), historyBacklog: backlog,
      lastCatalogueSyncAt: state?.fetchedAt ?? null, latestNavDate: state?.latestNavDate ?? null,
      lastHistorySyncAt: successful.at(-1) ?? null,
      lastRun: lastRun ? { id: lastRun.id, status: lastRun.status, startedAt: lastRun.started_at,
        finishedAt: lastRun.finished_at, processed: lastRun.processed, failed: lastRun.failed, error: lastRun.error } : null,
      schedule: { timezone: 'UTC', times: ['05:37', '17:37'] }, warnings };
  }

  private async progress(run: RunRow): Promise<SyncProgress> {
    const [archived, unresolved] = await Promise.all([
      this.store.first<{ count: number }>('SELECT COUNT(*) AS count FROM fundscope_archives'),
      this.store.first<{ count: number }>('SELECT COUNT(*) AS count FROM fundscope_failures WHERE run_id = ?', run.id),
    ]);
    return { runId: run.id, status: run.status, processed: run.processed, failed: run.failed,
      pending: Math.max(0, run.total - run.cursor) + (unresolved?.count ?? 0), catalogueCount: run.catalogue_count,
      archivedCount: archived?.count ?? 0 };
  }

  async start(key: string): Promise<SyncProgress> {
    const owner = await this.store.acquireLease();
    let runId: string | null = null;
    try {
      const existing = await this.store.first<{ run_id: string }>('SELECT run_id FROM fundscope_requests WHERE key = ?', key);
      if (existing) return this.progress(await this.store.runRow(existing.run_id));
      runId = crypto.randomUUID();
      const startedAt = this.runtime.now().toISOString();
      const payload = await this.provider.json('/mf/latest', true);
      const [{ catalogue: previous }, indexes, failures] = await Promise.all([
        this.store.catalogue(), this.store.indexes(), this.store.failures(),
      ]);
      const catalogue = buildCatalogue(payload, previous, indexes, startedAt);
      const queue: WorkQueue = { version: 1, runId, items: buildQueue(catalogue, indexes, failures, this.runtime.now().getTime()) };
      const catalogueKey = `catalogues/${runId}.json`;
      const latestKey = `latest/${runId}.json`;
      const queueKey = `queues/${runId}.json`;
      // Publish neither pointer nor success timestamp until all immutable objects are durable.
      await this.store.put(latestKey, payload);
      await this.store.put(catalogueKey, catalogue);
      await this.store.put(queueKey, queue);
      await this.store.renewLease(owner);
      const latestDates = catalogue.entries.filter(entry => entry.nav && entry.latestDate).map(entry => entry.latestDate!).sort();
      const state: CatalogueState = { key: catalogueKey, latestKey, catalogueCount: catalogue.entries.length,
        latestNavDate: latestDates.at(-1) ?? null, fetchedAt: startedAt, runId };
      const fence = "EXISTS (SELECT 1 FROM fundscope_leases WHERE key = 'sync' AND owner = ?)";
      const statements = [
        this.store.db.prepare(`UPDATE fundscope_runs SET status = 'partial', finished_at = ?, error = ?
          WHERE status = 'running' AND ${fence}`).bind(startedAt,
          'A new scheduled snapshot superseded this interrupted invocation; histories and remaining work are retained.', owner),
        this.store.db.prepare(`INSERT INTO fundscope_runs
          (id, status, started_at, total, catalogue_count, queue_key) SELECT ?, 'running', ?, ?, ?, ? WHERE ${fence}`)
          .bind(runId, startedAt, queue.items.length, catalogue.entries.length, queueKey, owner),
        this.store.db.prepare(`INSERT INTO fundscope_requests (key, run_id, created_at) SELECT ?, ?, ? WHERE ${fence}`)
          .bind(key, runId, startedAt, owner),
        this.store.db.prepare(`INSERT INTO fundscope_state (key, value, updated_at) SELECT 'catalogue', ?, ? WHERE ${fence}
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).bind(JSON.stringify(state), startedAt, owner),
      ];
      const writes = await this.store.db.batch(statements);
      if (writes.some(write => !write.success)) throw new ApiError('Catalogue checkpoint could not be published.', 503);
      if (writes.slice(1).some(write => write.meta.changes !== 1)) throw new ApiError('The synchronization lease changed before catalogue publication.', 409, 1000);
      return this.progress(await this.store.runRow(runId));
    } catch (error) {
      // A failed attempt is diagnostic only: do not publish its snapshot or reserve the idempotency
      // key, so retrying the same request can recover from a transient pre-publication failure.
      if (runId && !(await this.store.first<{ id: string }>('SELECT id FROM fundscope_runs WHERE id = ?', runId).catch(() => null))) {
        await this.store.run(`INSERT INTO fundscope_runs (id, status, started_at, finished_at, total, catalogue_count, queue_key, error)
          SELECT ?, 'failed', ?, ?, 0, 0, '', ? WHERE EXISTS
          (SELECT 1 FROM fundscope_leases WHERE key = 'sync' AND owner = ?)`, runId, this.runtime.now().toISOString(), this.runtime.now().toISOString(),
        error instanceof ApiError ? error.message : 'Catalogue storage was temporarily unavailable.', owner).catch(() => undefined);
      }
      throw error;
    } finally { await this.store.releaseLease(owner).catch(() => undefined); }
  }

  async step(runId: string, limit: number): Promise<SyncProgress> {
    const beganAt = this.runtime.now().getTime();
    const owner = await this.store.acquireLease();
    try {
      let run = await this.store.runRow(runId);
      if (run.status !== 'running') return this.progress(run);
      const queue = await this.store.queue(run);
      const stop = Math.min(run.cursor + limit, queue.items.length);
      while (run.cursor < stop) {
        // A final in-flight pair may need two 12-second attempts plus Retry-After. Stop
        // launching after eight seconds so the invocation fits the runner's 40-second budget.
        if (this.runtime.now().getTime() - beganAt >= 8_000) break;
        await this.store.renewLease(owner);
        const batch = queue.items.slice(run.cursor, Math.min(run.cursor + 2, stop));
        const results = await Promise.all(batch.map(async item => {
          const index = await this.store.index(item.code);
          if (index && !index.unresolved && index.fetched_at >= run.started_at
            && (!item.latestDate || index.coverage_end >= item.latestDate)) return true;
          const failure = await this.store.first<FailureRow>('SELECT * FROM fundscope_failures WHERE scheme_code = ?', item.code);
          if (failure && failure.next_retry_at > this.runtime.now().getTime()) {
            await this.store.run('UPDATE fundscope_failures SET run_id = ? WHERE scheme_code = ?', runId, item.code);
            return false;
          }
          const fetchedAt = this.runtime.now().toISOString();
          try {
            const parsed = validateHistory(await this.provider.json(`/mf/${item.code}`), item.code);
            const document = await this.store.persistHistory(parsed, fetchedAt, item.latestDate);
            if (document.unresolved) throw new ApiError('Source history quality or latest-date coverage remains unresolved.');
            return true;
          } catch (error) {
            await this.store.renewLease(owner);
            const stillUnresolved = await this.store.failure(item.code, runId, error, fetchedAt, item.latestDate);
            return !stillUnresolved;
          }
        }));
        await this.store.renewLease(owner);
        const succeeded = results.filter(Boolean).length;
        const changed = await this.store.run(`UPDATE fundscope_runs SET cursor = cursor + ?, processed = processed + ?, failed = failed + ?
          WHERE id = ? AND status = 'running' AND cursor = ? AND EXISTS
          (SELECT 1 FROM fundscope_leases WHERE key = 'sync' AND owner = ? AND expires_at > ?)`,
        batch.length, succeeded, batch.length - succeeded, runId, run.cursor, owner, this.runtime.now().getTime());
        if (!changed) throw new ApiError('Synchronization checkpoint changed; resume the current run.', 409, 1000);
        run = await this.store.runRow(runId);
      }
      return this.progress(run);
    } finally { await this.store.releaseLease(owner).catch(() => undefined); }
  }

  async finish(runId: string): Promise<SyncProgress> {
    const owner = await this.store.acquireLease();
    try {
      const run = await this.store.runRow(runId);
      if (run.status !== 'running') return this.progress(run);
      const progress = await this.progress(run);
      const status = progress.pending === 0 ? 'completed' : 'partial';
      await this.store.renewLease(owner);
      const changed = await this.store.run(`UPDATE fundscope_runs SET status = ?, finished_at = ?, error = ? WHERE id = ? AND status = 'running'
        AND EXISTS (SELECT 1 FROM fundscope_leases WHERE key = 'sync' AND owner = ?)`,
        status, this.runtime.now().toISOString(), status === 'partial' ? `${progress.pending} scheme(s) remain pending or unresolved; future runs will continue the archive.` : null, runId, owner);
      if (!changed) throw new ApiError('The synchronization lease changed before finishing.', 409, 1000);
      return this.progress(await this.store.runRow(runId));
    } finally { await this.store.releaseLease(owner).catch(() => undefined); }
  }
}

export async function handleRequest(request: Request, env: ArchiveBindings, options: RuntimeOptions = {}): Promise<Response> {
  const headers = { 'Cache-Control': 'private, no-store', 'Content-Type': 'application/json; charset=utf-8' };
  try {
    const url = new URL(request.url);
    const sync = /^\/api\/sync\/(start|step|finish)$/.exec(url.pathname);
    const fund = /^\/api\/mf\/([1-9]\d*)$/.exec(url.pathname);
    if (!sync && !fund && !['/api/data/status', '/api/mf/search'].includes(url.pathname)) throw new ApiError('Unknown API endpoint.', 404);
    if (request.method !== (sync ? 'POST' : 'GET')) throw new ApiError('Method not allowed.', 405);
    if (sync) await authenticate(request, env.FUNDSCOPE_SYNC_TOKEN);
    const service = new Service(env, normalizedRuntime(options));
    let result: unknown;
    if (sync) {
      const body = await bodyObject(request);
      if (sync[1] === 'start') result = await service.start(identifier(body.idempotencyKey, 'idempotency key'));
      else {
        const runId = identifier(body.runId, 'run ID');
        if (sync[1] === 'finish') result = await service.finish(runId);
        else {
          if (body.limit !== undefined && (typeof body.limit !== 'number' || !Number.isFinite(body.limit))) throw new ApiError('Invalid batch limit.', 400);
          const limit = Math.min(20, Math.max(1, Math.floor(body.limit as number ?? 10)));
          result = await service.step(runId, limit);
        }
      }
    } else if (fund) {
      const code = Number(fund[1]);
      if (!validCode(code)) throw new ApiError('Invalid requested scheme code.', 400);
      result = await service.fund(code);
    } else if (url.pathname === '/api/mf/search') result = await service.search(url.searchParams.get('q') ?? '');
    else result = await service.status();
    return Response.json(result, { status: 200, headers });
  } catch (error) {
    const known = error instanceof ApiError;
    return Response.json({ error: known ? error.message : 'The persistent archive is temporarily unavailable. Please retry.' }, {
      status: known ? error.status : 503,
      headers: { ...headers, ...(known && error.retryAfter !== null ? { 'Retry-After': String(Math.max(1, Math.ceil(error.retryAfter / 1000))) } : {}) },
    });
  }
}
