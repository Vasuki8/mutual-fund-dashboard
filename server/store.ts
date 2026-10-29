import { ApiError } from './types.ts';
import type { ArchiveBindings, ArchiveIndex, Catalogue, CatalogueState, FailureRow, HistoryDocument,
  RunRow, Runtime, WorkQueue } from './types.ts';
import { dateISO, mergeHistory, validateHistory } from './validation.ts';
import { validateRejectedZeroNavDates } from '../src/lib/nav-quality-evidence.ts';

const LEASE_MILLISECONDS = 90_000;

export class ArchiveStore {
  env: ArchiveBindings;
  db: Pick<D1Database, 'prepare' | 'batch'>;
  runtime: Runtime;
  constructor(env: ArchiveBindings, runtime: Runtime) {
    this.env = env;
    // A primary-first session preserves read-after-write consistency if D1 read replicas are enabled.
    this.db = typeof env.DB.withSession === 'function' ? env.DB.withSession('first-primary') : env.DB;
    this.runtime = runtime;
  }

  async all<T>(sql: string, ...bindings: (string | number | null)[]): Promise<T[]> {
    const result = await this.db.prepare(sql).bind(...bindings).all<T>();
    if (!result.success) throw new ApiError('Archive database read failed.', 503);
    return result.results;
  }

  async first<T>(sql: string, ...bindings: (string | number | null)[]): Promise<T | null> {
    return this.db.prepare(sql).bind(...bindings).first<T>();
  }

  async run(sql: string, ...bindings: (string | number | null)[]): Promise<number> {
    const result = await this.db.prepare(sql).bind(...bindings).run();
    if (!result.success) throw new ApiError('Archive database write failed.', 503);
    return result.meta.changes;
  }

  async state<T>(key: string): Promise<T | null> {
    const row = await this.first<{ value: string }>('SELECT value FROM fundscope_state WHERE key = ?', key);
    return row ? JSON.parse(row.value) as T : null;
  }

  async object<T>(key: string): Promise<T> {
    const object = await this.env.BUCKET.get(key);
    if (!object) throw new ApiError('An archive object is temporarily unavailable.', 503);
    return object.json<T>();
  }

  async put(key: string, value: unknown): Promise<void> {
    const result = await this.env.BUCKET.put(key, JSON.stringify(value), { httpMetadata: { contentType: 'application/json' } });
    if (!result) throw new ApiError('Archive object write failed.', 503);
  }

  async catalogue(): Promise<{ state: CatalogueState | null; catalogue: Catalogue | null }> {
    const state = await this.state<CatalogueState>('catalogue');
    return { state, catalogue: state ? await this.object<Catalogue>(state.key) : null };
  }

  async indexes(): Promise<ArchiveIndex[]> {
    return this.all<ArchiveIndex>('SELECT * FROM fundscope_archives');
  }

  async index(code: number): Promise<ArchiveIndex | null> {
    return this.first<ArchiveIndex>('SELECT * FROM fundscope_archives WHERE scheme_code = ?', code);
  }

  async history(code: number): Promise<HistoryDocument | null> {
    const index = await this.index(code);
    if (!index) return null;
    const document = await this.object<HistoryDocument>(index.object_key);
    if (document.version !== 1 || document.schemeCode !== code || document.payload?.meta.scheme_code !== code) {
      throw new ApiError('Archived scheme identity is invalid.', 503);
    }
    validateRejectedZeroNavDates(document.rejectedZeroNavDates, document.warnings,
      document.payload.data.map(point => dateISO(point.date)!));
    return document;
  }

  async persistHistory(parsed: ReturnType<typeof validateHistory>, fetchedAt: string, expectedLatest: string | null = null): Promise<HistoryDocument> {
    const code = parsed.payload.meta.scheme_code;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const previousIndex = await this.index(code);
      const previous = previousIndex ? await this.object<HistoryDocument>(previousIndex.object_key) : null;
      const document = mergeHistory(parsed, previous, fetchedAt, this.runtime.now().toISOString(), expectedLatest);
      const key = `histories/${code}/${crypto.randomUUID()}.json`;
      await this.put(key, document);
      // An immutable object is published only if the exact index version read above remains current.
      // A losing writer rereads and merges; neither newer observations nor earlier dates can be lost.
      const changed = await this.run(`INSERT INTO fundscope_archives
        (scheme_code, scheme_name, object_key, version, fetched_at, archived_at, coverage_start, coverage_end, observation_count, unresolved)
        VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(scheme_code) DO UPDATE SET scheme_name = excluded.scheme_name, object_key = excluded.object_key,
        version = fundscope_archives.version + 1, fetched_at = excluded.fetched_at, archived_at = excluded.archived_at,
        coverage_start = excluded.coverage_start, coverage_end = excluded.coverage_end,
        observation_count = excluded.observation_count, unresolved = excluded.unresolved
        WHERE fundscope_archives.version = ?`, code, document.payload.meta.scheme_name, key, document.fetchedAt,
      document.archivedAt, document.coverageStart, document.coverageEnd, document.payload.data.length,
      document.unresolved ? 1 : 0, previousIndex?.version ?? 0);
      if (changed) {
        if (!document.unresolved) await this.run(`DELETE FROM fundscope_failures WHERE scheme_code = ? AND EXISTS
          (SELECT 1 FROM fundscope_archives WHERE scheme_code = ? AND object_key = ? AND unresolved = 0)`, code, code, key);
        return document;
      }
      // A definite CAS miss cannot have published this object. Old published objects are never removed here.
      await this.env.BUCKET.delete(key).catch(() => undefined);
    }
    throw new ApiError('Another refresh is updating this scheme; retry shortly.', 409, 1000);
  }

  async runRow(id: string): Promise<RunRow> {
    const row = await this.first<RunRow>('SELECT * FROM fundscope_runs WHERE id = ?', id);
    if (!row) throw new ApiError('Unknown synchronization run.', 404);
    return row;
  }

  async queue(run: RunRow): Promise<WorkQueue> {
    const queue = await this.object<WorkQueue>(run.queue_key);
    if (queue.version !== 1 || queue.runId !== run.id || queue.items.length !== run.total) {
      throw new ApiError('Synchronization checkpoint is invalid.', 503);
    }
    return queue;
  }

  async failures(): Promise<FailureRow[]> { return this.all<FailureRow>('SELECT * FROM fundscope_failures'); }

  async failure(code: number, runId: string | null, error: unknown,
    attemptedAt = this.runtime.now().toISOString(), expectedLatest: string | null = null): Promise<boolean> {
    const previous = await this.first<FailureRow>('SELECT * FROM fundscope_failures WHERE scheme_code = ?', code);
    const wait = Math.max(error instanceof ApiError ? error.retryAfter ?? 0 : 0,
      Math.min(6 * 60 * 60 * 1000, 60_000 * 2 ** Math.min(previous?.attempts ?? 0, 9)));
    const message = error instanceof ApiError ? error.message : 'Archive persistence was temporarily unavailable.';
    await this.run(`INSERT INTO fundscope_failures (scheme_code, run_id, attempts, error, last_attempt_at, next_retry_at)
      SELECT ?, ?, 1, ?, ?, ? WHERE NOT EXISTS
      (SELECT 1 FROM fundscope_archives WHERE scheme_code = ? AND unresolved = 0 AND fetched_at >= ? AND (? IS NULL OR coverage_end >= ?))
      ON CONFLICT(scheme_code) DO UPDATE SET run_id = excluded.run_id,
      attempts = fundscope_failures.attempts + 1, error = excluded.error,
      last_attempt_at = excluded.last_attempt_at, next_retry_at = excluded.next_retry_at
      WHERE fundscope_failures.last_attempt_at <= excluded.last_attempt_at`,
    code, runId, message.slice(0, 500), attemptedAt, this.runtime.now().getTime() + wait, code, attemptedAt, expectedLatest, expectedLatest);
    const current = await this.index(code);
    return !(current && !current.unresolved && current.fetched_at >= attemptedAt
      && (expectedLatest === null || current.coverage_end >= expectedLatest));
  }

  async acquireLease(): Promise<string> {
    const owner = crypto.randomUUID();
    const now = this.runtime.now().getTime();
    const changed = await this.run(`INSERT INTO fundscope_leases (key, owner, expires_at) VALUES ('sync', ?, ?)
      ON CONFLICT(key) DO UPDATE SET owner = excluded.owner, expires_at = excluded.expires_at
      WHERE fundscope_leases.expires_at <= ?`, owner, now + LEASE_MILLISECONDS, now);
    if (!changed) throw new ApiError('A synchronization operation is already running. Retry shortly.', 409, 2000);
    return owner;
  }

  async renewLease(owner: string): Promise<void> {
    const now = this.runtime.now().getTime();
    const changed = await this.run('UPDATE fundscope_leases SET expires_at = ? WHERE key = ? AND owner = ? AND expires_at > ?',
      now + LEASE_MILLISECONDS, 'sync', owner, now);
    if (!changed) throw new ApiError('The synchronization lease expired; the checkpoint remains resumable.', 409, 1000);
  }

  async releaseLease(owner: string): Promise<void> {
    await this.run('DELETE FROM fundscope_leases WHERE key = ? AND owner = ?', 'sync', owner);
  }
}
