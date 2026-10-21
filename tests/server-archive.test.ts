import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';

const module = await import('../server/archive.ts').catch(() => null);
test('persistent server archive implementation is available', () => {
  assert.ok(module?.handleRequest, 'The server must implement the persistent archive API.');
});

const DDL = `
CREATE TABLE fundscope_state (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE fundscope_archives (scheme_code INTEGER PRIMARY KEY, scheme_name TEXT NOT NULL, object_key TEXT NOT NULL, version INTEGER NOT NULL, fetched_at TEXT NOT NULL, archived_at TEXT NOT NULL, coverage_start TEXT NOT NULL, coverage_end TEXT NOT NULL, observation_count INTEGER NOT NULL, unresolved INTEGER NOT NULL DEFAULT 0);
CREATE TABLE fundscope_runs (id TEXT PRIMARY KEY, status TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, processed INTEGER NOT NULL DEFAULT 0, failed INTEGER NOT NULL DEFAULT 0, cursor INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL, catalogue_count INTEGER NOT NULL, queue_key TEXT NOT NULL, error TEXT);
CREATE TABLE fundscope_requests (key TEXT PRIMARY KEY, run_id TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE fundscope_failures (scheme_code INTEGER PRIMARY KEY, run_id TEXT, attempts INTEGER NOT NULL, error TEXT NOT NULL, last_attempt_at TEXT NOT NULL, next_retry_at INTEGER NOT NULL);
CREATE TABLE fundscope_leases (key TEXT PRIMARY KEY, owner TEXT NOT NULL, expires_at INTEGER NOT NULL);
`;

class SqlStatement {
  db: DatabaseSync;
  sql: string;
  values: any[] = [];
  constructor(db: DatabaseSync, sql: string) { this.db = db; this.sql = sql; }
  bind(...values: any[]) { this.values = values; return this; }
  async first(column?: string) {
    const row = this.db.prepare(this.sql).get(...this.values) as Record<string, unknown> | undefined;
    return column ? row?.[column] ?? null : row ?? null;
  }
  async all() { return { results: this.db.prepare(this.sql).all(...this.values), success: true, meta: {} }; }
  execute() {
    const result = this.db.prepare(this.sql).run(...this.values);
    return { results: [], success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
  }
  async run() { return this.execute(); }
}

class SqliteD1 {
  sqlite = new DatabaseSync(':memory:');
  constructor() { this.sqlite.exec(DDL); }
  prepare(sql: string) { return new SqlStatement(this.sqlite, sql); }
  async batch(statements: SqlStatement[]) {
    this.sqlite.exec('BEGIN');
    try {
      const results = statements.map(statement => statement.execute());
      this.sqlite.exec('COMMIT');
      return results;
    } catch (error) { this.sqlite.exec('ROLLBACK'); throw error; }
  }
}

class MemoryR2 {
  values = new Map<string, string>();
  failWrites = false;
  async get(key: string) {
    const value = this.values.get(key);
    return value === undefined ? null : { text: async () => value, json: async () => JSON.parse(value) };
  }
  async put(key: string, value: string) {
    if (this.failWrites) throw new Error('Storage temporarily unavailable.');
    this.values.set(key, value);
    return { key };
  }
  async delete(key: string) { this.values.delete(key); }
}

const CODE = 122639;
const NAME = 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth';
function history(code = CODE, data = [
  { date: '19-10-2026', nav: '90.3546000' },
  { date: '01-01-2005', nav: '10.0000001' },
]) {
  return { status: 'SUCCESS', meta: { scheme_code: code, scheme_name: code === CODE ? NAME : `Scheme ${code}`,
    fund_house: 'PPFAS Mutual Fund', scheme_type: 'Open Ended Schemes',
    scheme_category: 'Equity Scheme - Flexi Cap Fund', isin_growth: null, isin_div_reinvestment: null }, data };
}
function latest(codes = [CODE], date = '19-10-2026') {
  return codes.map(schemeCode => ({ schemeCode, schemeName: schemeCode === CODE ? NAME : `Scheme ${schemeCode}`,
    nav: '90.3546000', date, isinGrowth: null, isinDivReinvestment: null }));
}

function harness() {
  const DB = new SqliteD1();
  const BUCKET = new MemoryR2();
  let clock = Date.parse('2026-10-21T05:37:00Z');
  let fetcher: (url: string, init?: RequestInit) => Promise<Response> = async url => {
    const path = new URL(url).pathname;
    if (path === '/mf/latest') return Response.json(latest());
    return Response.json(history(Number(path.split('/').at(-1))));
  };
  let calls = 0;
  const bindings = { DB, BUCKET, FUNDSCOPE_SYNC_TOKEN: 'test-token' };
  const options = { now: () => new Date(clock), sleep: async (ms: number) => { clock += ms; },
    fetch: async (url: string | URL | Request, init?: RequestInit) => { calls += 1; return fetcher(String(url), init); } };
  async function request(path: string, body?: unknown, token: string | null = 'test-token') {
    assert.ok(module);
    return module.handleRequest(new Request(`https://fundscope.test${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(token === null ? {} : { 'x-fundscope-sync-token': token }), 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), bindings as any, options as any);
  }
  return { DB, BUCKET, bindings, options, request, setFetch: (fn: typeof fetcher) => { fetcher = fn; },
    advance: (ms: number) => { clock += ms; }, callCount: () => calls };
}

if (module) {
  test('sync rejects absent, wrong, or unconfigured token before any provider or storage work', async () => {
    const h = harness();
    for (const token of [null, 'wrong-token']) {
      const response = await h.request('/api/sync/start', { idempotencyKey: 'auth' }, token);
      assert.equal(response.status, 401);
      assert.match((await response.json()).error, /unauthorized/i);
    }
    h.bindings.FUNDSCOPE_SYNC_TOKEN = '';
    assert.equal((await h.request('/api/sync/start', { idempotencyKey: 'auth' })).status, 503);
    assert.equal(h.callCount(), 0);
    assert.equal(h.BUCKET.values.size, 0);
    assert.equal(h.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM fundscope_runs').get()?.n, 0);
  });

  test('empty deployment reports zero coverage and the two UTC schedule times', async () => {
    const response = await harness().request('/api/data/status');
    assert.equal(response.status, 200);
    const status = await response.json();
    assert.equal(status.catalogueCount, 0);
    assert.equal(status.archivedCount, 0);
    assert.equal(status.lastCatalogueSyncAt, null);
    assert.deepEqual(status.schedule, { timezone: 'UTC', times: ['05:37', '17:37'] });
    assert.ok(status.warnings.length);
  });

  test('on-demand full history is durable, precise, cached for six hours, and retrievable without the provider', async () => {
    const h = harness();
    const initial = await (await h.request(`/api/mf/${CODE}`)).json();
    assert.equal(initial.data.length, 2);
    assert.equal(initial.data[1].nav, '10.0000001');
    assert.equal(initial._fundscope.coverageStart, '2005-01-01');
    assert.equal(initial._fundscope.fromArchive, false);
    h.setFetch(async () => { throw new TypeError('offline'); });
    const cached = await (await h.request(`/api/mf/${CODE}`)).json();
    assert.equal(cached._fundscope.fromArchive, true);
    assert.equal(cached._fundscope.stale, false);
    assert.deepEqual(cached.data, initial.data);
    assert.equal(h.callCount(), 1);
    h.advance(7 * 60 * 60 * 1000);
    const stale = await (await h.request(`/api/mf/${CODE}`)).json();
    assert.equal(stale._fundscope.stale, true);
    assert.equal(stale._fundscope.fetchedAt, initial._fundscope.fetchedAt);
    assert.deepEqual(stale.data, initial.data);
    const status = await (await h.request('/api/data/status')).json();
    assert.equal(status.archivedCount, 1);
    assert.equal(status.observationCount, 2);
  });

  test('shortened histories preserve older dates and apply source corrections without losing NAV precision', async () => {
    const h = harness();
    await h.request(`/api/mf/${CODE}`);
    h.advance(7 * 60 * 60 * 1000);
    h.setFetch(async () => Response.json(history(CODE, [
      { date: '20-10-2026', nav: '91.1234567890123' },
      { date: '19-10-2026', nav: '90.400000000001' },
    ])));
    const result = await (await h.request(`/api/mf/${CODE}`)).json();
    assert.deepEqual(result.data, [
      { date: '20-10-2026', nav: '91.1234567890123' },
      { date: '19-10-2026', nav: '90.400000000001' },
      { date: '01-01-2005', nav: '10.0000001' },
    ]);
    assert.equal(result._fundscope.observationCount, 3);
    assert.match(result._fundscope.warnings.join(' '), /retained|shorter|absent/i);
  });

  test('older provider histories never replace newer observations or advance successful freshness', async () => {
    const h = harness();
    const first = await (await h.request(`/api/mf/${CODE}`)).json();
    h.advance(7 * 60 * 60 * 1000);
    h.setFetch(async () => Response.json(history(CODE, [{ date: '01-01-2005', nav: '9.00000' }])));
    const result = await (await h.request(`/api/mf/${CODE}`)).json();
    assert.deepEqual(result.data, first.data);
    assert.equal(result._fundscope.fetchedAt, first._fundscope.fetchedAt);
    assert.equal(result._fundscope.stale, true);
  });

  test('unknown-code SUCCESS, empty histories, and entirely invalid NAVs cannot create archives', async () => {
    for (const payload of [
      { status: 'SUCCESS', meta: { scheme_code: 0 }, data: [] },
      history(CODE, []),
      history(CODE, [{ date: '31-02-2026', nav: '10' }]),
      history(CODE, [{ date: '19-10-2026', nav: '0' }]),
      history(CODE + 1),
    ]) {
      const h = harness();
      h.setFetch(async () => Response.json(payload));
      const response = await h.request(`/api/mf/${CODE}`);
      assert.equal(response.status, 502);
      assert.ok((await response.json()).error);
      assert.equal((await (await h.request('/api/data/status')).json()).archivedCount, 0);
    }
  });

  test('mixed-quality history remains visible with blocking warnings and unresolved coverage', async () => {
    const h = harness();
    h.setFetch(async () => Response.json(history(CODE, [
      { date: '19-10-2026', nav: '11.00000' }, { date: '19-10-2026', nav: '10.00000' },
      { date: '18-10-2026', nav: '0' }, { date: '17-10-2026', nav: '9.00000' },
    ])));
    const response = await h.request(`/api/mf/${CODE}`);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.data.length, 2);
    assert.equal(result.data[0].nav, '10.00000');
    assert.match(result._fundscope.warnings.join(' '), /Invalid NAV/);
    assert.match(result._fundscope.warnings.join(' '), /Conflicting NAV/);
    assert.equal(result._fundscope.stale, true);
    assert.equal((await (await h.request('/api/data/status')).json()).historyBacklog, 1);
  });

  test('catalogue success alone is partial coverage and start is idempotent', async () => {
    const h = harness();
    h.setFetch(async () => Response.json(latest([CODE, CODE + 1, CODE + 2])));
    const first = await (await h.request('/api/sync/start', { idempotencyKey: 'first' })).json();
    const again = await (await h.request('/api/sync/start', { idempotencyKey: 'first' })).json();
    assert.equal(again.runId, first.runId);
    assert.equal(first.pending, 3);
    assert.equal(first.archivedCount, 0);
    assert.equal(h.callCount(), 1);
    const finished = await (await h.request('/api/sync/finish', { runId: first.runId })).json();
    assert.equal(finished.status, 'partial');
    assert.equal(finished.pending, 3);
    const replay = await (await h.request('/api/sync/start', { idempotencyKey: 'first' })).json();
    assert.equal(replay.status, 'partial');
    assert.equal(h.callCount(), 1);
    const status = await (await h.request('/api/data/status')).json();
    assert.equal(status.catalogueCount, 3);
    assert.equal(status.historyBacklog, 3);
    assert.equal(status.lastCatalogueSyncAt, '2026-10-21T05:37:00.000Z');
  });

  test('bounded steps persist full histories across independent request objects and resume checkpoints', async () => {
    const h = harness();
    const codes = [CODE, CODE + 1, CODE + 2];
    h.setFetch(async url => new URL(url).pathname === '/mf/latest'
      ? Response.json(latest(codes)) : Response.json(history(Number(new URL(url).pathname.split('/').at(-1)))));
    const run = await (await h.request('/api/sync/start', { idempotencyKey: 'resume' })).json();
    let progress = await (await h.request('/api/sync/step', { runId: run.runId, limit: 1 })).json();
    assert.equal(progress.processed, 1);
    assert.equal(progress.pending, 2);
    assert.equal(progress.archivedCount, 1);
    progress = await (await h.request('/api/sync/step', { runId: run.runId, limit: 2 })).json();
    assert.equal(progress.processed, 3);
    assert.equal(progress.pending, 0);
    const done = await (await h.request('/api/sync/finish', { runId: run.runId })).json();
    assert.equal(done.status, 'completed');
    const status = await (await h.request('/api/data/status')).json();
    assert.equal(status.observationCount, 6);
    assert.equal(status.historyBacklog, 0);
    assert.equal(status.archivedCount, 3);
    for (const code of codes) assert.equal((await (await h.request(`/api/mf/${code}`)).json()).data[1].date, '01-01-2005');
  });

  test('a failed history remains durable pending work and does not block successful neighbours', async () => {
    const h = harness();
    h.setFetch(async url => {
      const path = new URL(url).pathname;
      if (path === '/mf/latest') return Response.json(latest([CODE, CODE + 1]));
      return path.endsWith(String(CODE)) ? Response.json(history(CODE)) : new Response('unavailable', { status: 503 });
    });
    const run = await (await h.request('/api/sync/start', { idempotencyKey: 'fail' })).json();
    const progress = await (await h.request('/api/sync/step', { runId: run.runId, limit: 2 })).json();
    assert.equal(progress.processed, 1);
    assert.equal(progress.failed, 1);
    assert.equal(progress.pending, 1);
    assert.equal(progress.archivedCount, 1);
    const finished = await (await h.request('/api/sync/finish', { runId: run.runId })).json();
    assert.equal(finished.status, 'partial');
    assert.equal(h.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM fundscope_failures').get()?.n, 1);
    h.advance(60 * 60 * 1000);
    h.setFetch(async url => new URL(url).pathname === '/mf/latest'
      ? Response.json(latest([CODE, CODE + 1])) : Response.json(history(CODE + 1)));
    const next = await (await h.request('/api/sync/start', { idempotencyKey: 'retry' })).json();
    const recovered = await (await h.request('/api/sync/step', { runId: next.runId, limit: 2 })).json();
    assert.equal(recovered.pending, 0);
    assert.equal(recovered.archivedCount, 2);
    assert.equal(h.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM fundscope_failures').get()?.n, 0);
  });

  test('failed R2 snapshot writes preserve the prior successful catalogue and timestamp', async () => {
    const h = harness();
    const first = await (await h.request('/api/sync/start', { idempotencyKey: 'before-storage-failure' })).json();
    await h.request('/api/sync/finish', { runId: first.runId });
    const before = await (await h.request('/api/data/status')).json();
    h.advance(12 * 60 * 60 * 1000);
    h.BUCKET.failWrites = true;
    h.setFetch(async () => Response.json(latest([CODE, CODE + 1])));
    const failed = await h.request('/api/sync/start', { idempotencyKey: 'storage-failure' });
    assert.equal(failed.status, 503);
    const after = await (await h.request('/api/data/status')).json();
    assert.equal(after.catalogueCount, before.catalogueCount);
    assert.equal(after.lastCatalogueSyncAt, before.lastCatalogueSyncAt);
  });

  test('disappeared catalogue schemes stay searchable and their full histories stay retrievable', async () => {
    const h = harness();
    await h.request(`/api/mf/${CODE}`);
    const run = await (await h.request('/api/sync/start', { idempotencyKey: 'old-catalogue' })).json();
    await h.request('/api/sync/finish', { runId: run.runId });
    h.advance(12 * 60 * 60 * 1000);
    h.setFetch(async url => new URL(url).pathname === '/mf/latest'
      ? Response.json(latest([CODE + 1])) : new Response('offline', { status: 503 }));
    await h.request('/api/sync/start', { idempotencyKey: 'new-catalogue' });
    const schemes = await (await h.request('/api/mf/search?q=Parag')).json();
    assert.ok(schemes.some((scheme: any) => scheme.schemeCode === CODE));
    const exact = await (await h.request(`/api/mf/search?q=${CODE}`)).json();
    assert.equal(exact[0].schemeCode, CODE);
    assert.equal((await (await h.request(`/api/mf/${CODE}`)).json()).data.length, 2);
    assert.equal((await (await h.request('/api/data/status')).json()).catalogueCount, 2);
  });

  test('a durable lease rejects overlapping sync steps without duplicate checkpoint advancement', async () => {
    const h = harness();
    const run = await (await h.request('/api/sync/start', { idempotencyKey: 'lease' })).json();
    let release!: () => void;
    let started!: () => void;
    const entered = new Promise<void>(resolve => { started = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    h.setFetch(async () => { started(); await gate; return Response.json(history()); });
    const first = h.request('/api/sync/step', { runId: run.runId, limit: 1 });
    await entered;
    const overlap = await h.request('/api/sync/step', { runId: run.runId, limit: 1 });
    assert.equal(overlap.status, 409);
    release();
    assert.equal((await (await first).json()).processed, 1);
    assert.equal((await (await h.request('/api/sync/finish', { runId: run.runId })).json()).processed, 1);
  });

  test('sync clamps work to twenty schemes and never exceeds two concurrent provider requests', async () => {
    const h = harness();
    const codes = Array.from({ length: 25 }, (_, index) => CODE + index);
    let active = 0;
    let maximum = 0;
    h.setFetch(async url => {
      const path = new URL(url).pathname;
      if (path === '/mf/latest') return Response.json(latest(codes));
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise(resolve => setImmediate(resolve));
      active -= 1;
      return Response.json(history(Number(path.split('/').at(-1))));
    });
    const run = await (await h.request('/api/sync/start', { idempotencyKey: 'bounded' })).json();
    const progress = await (await h.request('/api/sync/step', { runId: run.runId, limit: 1000 })).json();
    assert.equal(progress.processed, 20);
    assert.equal(progress.pending, 5);
    assert.ok(maximum <= 2);
  });

  test('a slower old request cannot downgrade a newer concurrently archived correction or freshness', async () => {
    const h = harness();
    let release!: () => void;
    let started!: () => void;
    const entered = new Promise<void>(resolve => { started = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    let count = 0;
    h.setFetch(async () => {
      count += 1;
      if (count === 1) {
        started();
        await gate;
        return Response.json(history(CODE, [
          { date: '19-10-2026', nav: '90.00000' }, { date: '01-01-2005', nav: '10.00000' },
        ]));
      }
      return Response.json(history(CODE, [
        { date: '20-10-2026', nav: '91.00000' }, { date: '19-10-2026', nav: '90.5000001' },
      ]));
    });
    const slow = h.request(`/api/mf/${CODE}`);
    await entered;
    h.advance(1000);
    const newer = await (await h.request(`/api/mf/${CODE}`)).json();
    release();
    const late = await (await slow).json();
    assert.equal(late._fundscope.stale, false);
    assert.equal(late._fundscope.fetchedAt, newer._fundscope.fetchedAt);
    const saved = await (await h.request(`/api/mf/${CODE}`)).json();
    assert.equal(saved._fundscope.stale, false);
    assert.deepEqual(saved.data, [
      { date: '20-10-2026', nav: '91.00000' }, { date: '19-10-2026', nav: '90.5000001' },
      { date: '01-01-2005', nav: '10.00000' },
    ]);
  });

  test('a crash after history publication resumes without fetching or counting that history twice', async () => {
    const h = harness();
    const run = await (await h.request('/api/sync/start', { idempotencyKey: 'checkpoint' })).json();
    const original = h.DB.prepare.bind(h.DB);
    let fail = true;
    h.DB.prepare = (sql: string) => {
      const statement = original(sql);
      if (fail && sql.includes('SET cursor = cursor +')) {
        statement.run = async () => { fail = false; throw new Error('Interrupted before checkpoint'); };
      }
      return statement;
    };
    assert.equal((await h.request('/api/sync/step', { runId: run.runId, limit: 1 })).status, 503);
    const calls = h.callCount();
    const resumed = await (await h.request('/api/sync/step', { runId: run.runId, limit: 1 })).json();
    assert.equal(resumed.processed, 1);
    assert.equal(resumed.archivedCount, 1);
    assert.equal(resumed.pending, 0);
    assert.equal(h.callCount(), calls);
  });

  test('long Retry-After is durable and is not retried early within an invocation', async () => {
    const h = harness();
    const run = await (await h.request('/api/sync/start', { idempotencyKey: 'retry-after' })).json();
    h.setFetch(async () => new Response('rate limit', { status: 429, headers: { 'Retry-After': '120' } }));
    const before = h.callCount();
    const result = await (await h.request('/api/sync/step', { runId: run.runId, limit: 1 })).json();
    assert.equal(result.failed, 1);
    assert.equal(result.pending, 1);
    assert.equal(h.callCount() - before, 1);
    const failure = h.DB.sqlite.prepare('SELECT * FROM fundscope_failures').get()!;
    assert.ok(Number(failure.next_retry_at) >= Date.parse('2026-10-21T05:39:00Z'));
  });

  test('catalogue retains schemes with null latest NAV and never publishes an invalid empty replacement', async () => {
    const h = harness();
    h.setFetch(async () => Response.json([{ ...latest()[0], nav: null }]));
    const run = await (await h.request('/api/sync/start', { idempotencyKey: 'null-nav' })).json();
    assert.equal(run.catalogueCount, 1);
    await h.request('/api/sync/finish', { runId: run.runId });
    const before = await (await h.request('/api/data/status')).json();
    assert.equal(before.latestNavDate, null);
    assert.match(before.warnings.join(' '), /invalid latest NAV/i);
    h.advance(12 * 60 * 60 * 1000);
    h.setFetch(async () => Response.json([]));
    assert.equal((await h.request('/api/sync/start', { idempotencyKey: 'empty-source' })).status, 502);
    const after = await (await h.request('/api/data/status')).json();
    assert.equal(after.catalogueCount, 1);
    assert.equal(after.lastCatalogueSyncAt, before.lastCatalogueSyncAt);
  });

  test('refreshes and new-scheme backfill both make progress in a small invocation', async () => {
    const h = harness();
    const oldCodes = Array.from({ length: 6 }, (_, index) => CODE + index);
    const newCodes = Array.from({ length: 6 }, (_, index) => CODE + 6 + index);
    for (const code of oldCodes) await h.request(`/api/mf/${code}`);
    h.advance(12 * 60 * 60 * 1000);
    const visited: number[] = [];
    h.setFetch(async url => {
      const path = new URL(url).pathname;
      if (path === '/mf/latest') return Response.json(latest([...oldCodes, ...newCodes], '20-10-2026'));
      const code = Number(path.split('/').at(-1));
      visited.push(code);
      return Response.json(history(code, [{ date: '20-10-2026', nav: '91.00000' }, { date: '19-10-2026', nav: '90.00000' }]));
    });
    const run = await (await h.request('/api/sync/start', { idempotencyKey: 'fair' })).json();
    const result = await (await h.request('/api/sync/step', { runId: run.runId, limit: 4 })).json();
    assert.equal(result.processed, 4);
    assert.equal(visited.filter(code => oldCodes.includes(code)).length, 2);
    assert.equal(visited.filter(code => newCodes.includes(code)).length, 2);
    assert.equal(result.archivedCount, 8);
  });

  test('a new scheduled idempotency key refreshes the catalogue even when the previous run was interrupted', async () => {
    const h = harness();
    const old = await (await h.request('/api/sync/start', { idempotencyKey: 'morning-interrupted' })).json();
    h.advance(12 * 60 * 60 * 1000);
    h.setFetch(async () => Response.json(latest([CODE, CODE + 1], '20-10-2026')));
    const next = await (await h.request('/api/sync/start', { idempotencyKey: 'evening' })).json();
    assert.notEqual(next.runId, old.runId);
    assert.equal(next.catalogueCount, 2);
    assert.equal(next.pending, 2);
    const replay = await (await h.request('/api/sync/start', { idempotencyKey: 'morning-interrupted' })).json();
    assert.equal(replay.runId, old.runId);
    assert.equal(replay.status, 'partial');
    assert.equal((await (await h.request('/api/data/status')).json()).latestNavDate, '2026-10-20');
    assert.equal(h.callCount(), 2);
  });

  test('a slow step checkpoints its current pair and stops launching pairs after its elapsed budget', async () => {
    const h = harness();
    const codes = Array.from({ length: 6 }, (_, index) => CODE + index);
    h.setFetch(async () => Response.json(latest(codes)));
    const run = await (await h.request('/api/sync/start', { idempotencyKey: 'elapsed-budget' })).json();
    h.setFetch(async url => {
      h.advance(4_000);
      return Response.json(history(Number(new URL(url).pathname.split('/').at(-1))));
    });
    const result = await (await h.request('/api/sync/step', { runId: run.runId, limit: 20 })).json();
    assert.equal(result.processed, 2);
    assert.equal(result.pending, 4);
    assert.equal(result.archivedCount, 2);
  });

  test('an earlier failed sync fetch cannot leave a failure after a concurrent successful on-demand archive', async () => {
    const h = harness();
    const run = await (await h.request('/api/sync/start', { idempotencyKey: 'failure-race' })).json();
    let release!: () => void;
    let started!: () => void;
    const entered = new Promise<void>(resolve => { started = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    let calls = 0;
    h.setFetch(async () => {
      calls += 1;
      if (calls === 1) { started(); await gate; return new Response('offline', { status: 503 }); }
      if (calls === 2) return Response.json(history());
      return new Response('offline', { status: 503 });
    });
    const pending = h.request('/api/sync/step', { runId: run.runId, limit: 1 });
    await entered;
    h.advance(1000);
    assert.equal((await h.request(`/api/mf/${CODE}`)).status, 200);
    release();
    const result = await (await pending).json();
    assert.equal(result.pending, 0);
    assert.equal(result.processed, 1);
    assert.equal(result.archivedCount, 1);
    assert.equal(h.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM fundscope_failures').get()?.n, 0);
  });

  test('a truncated clean response cannot clear blocking quality warnings on retained historical observations', async () => {
    const h = harness();
    h.setFetch(async () => Response.json(history(CODE, [
      { date: '19-10-2026', nav: '100.000' },
      { date: '18-10-2026', nav: '99.000' }, { date: '18-10-2026', nav: '99.100' },
    ])));
    const first = await (await h.request(`/api/mf/${CODE}`)).json();
    assert.match(first._fundscope.warnings.join(' '), /Conflicting NAV/);
    h.advance(7 * 60 * 60 * 1000);
    h.setFetch(async () => Response.json(history(CODE, [{ date: '20-10-2026', nav: '100.100' }])));
    const retained = await (await h.request(`/api/mf/${CODE}`)).json();
    assert.equal(retained.data.length, 3);
    assert.equal(retained._fundscope.stale, true);
    assert.match(retained._fundscope.warnings.join(' '), /Conflicting NAV/);
    assert.equal((await (await h.request('/api/data/status')).json()).historyBacklog, 1);
    h.advance(7 * 60 * 60 * 1000);
    h.setFetch(async () => Response.json(history(CODE, [
      { date: '20-10-2026', nav: '100.100' }, { date: '19-10-2026', nav: '100.000' }, { date: '18-10-2026', nav: '99.100' },
    ])));
    const corrected = await (await h.request(`/api/mf/${CODE}`)).json();
    assert.equal(corrected._fundscope.stale, false);
    assert.equal(corrected._fundscope.warnings.some((warning: string) => /Conflicting NAV/.test(warning)), false);
    assert.equal(corrected.data[2].nav, '99.100');
  });

  test('a newer catalogue observation invalidates an otherwise fresh six-hour history cache', async () => {
    const h = harness();
    await h.request(`/api/mf/${CODE}`);
    h.advance(60 * 60 * 1000);
    h.setFetch(async url => new URL(url).pathname === '/mf/latest'
      ? Response.json(latest([CODE], '20-10-2026'))
      : Response.json(history(CODE, [{ date: '20-10-2026', nav: '91.000001' }, { date: '19-10-2026', nav: '90.3546000' }])));
    await h.request('/api/sync/start', { idempotencyKey: 'new-date' });
    const refreshed = await (await h.request(`/api/mf/${CODE}`)).json();
    assert.equal(refreshed._fundscope.coverageEnd, '2026-10-20');
    assert.equal(refreshed._fundscope.stale, false);
    assert.equal(refreshed.data.at(-1).date, '01-01-2005');
  });

  test('provider transport archives history through Workers-compatible manual redirect mode', async () => {
    const h = harness();
    let redirectMode: RequestRedirect | undefined;
    h.setFetch(async (_url, init) => {
      redirectMode = init?.redirect;
      // workerd rejects error mode while constructing Request, before contacting the origin.
      if (redirectMode === 'error') throw new TypeError('Invalid redirect value, must be one of "follow" or "manual"');
      return Response.json(history());
    });
    const response = await h.request(`/api/mf/${CODE}`);
    assert.equal(response.status, 200);
    assert.equal(redirectMode, 'manual');
    const result = await response.json();
    assert.equal(result._fundscope.observationCount, 2);
    assert.equal(result.data[1].nav, '10.0000001');
    assert.equal((await (await h.request('/api/data/status')).json()).archivedCount, 1);
  });

  test('upstream redirects to another host are never followed or archived', async () => {
    for (const status of [300, 301, 302, 303, 307, 308, 399]) {
      const h = harness();
      const visited: string[] = [];
      const target = 'https://unexpected.example/history';
      h.setFetch(async (url, init) => {
        visited.push(url);
        // Model fetch's follow behavior so a regression to follow would accept the other host.
        if (init?.redirect === 'follow') {
          visited.push(target);
          return Response.json(history());
        }
        return new Response(null, { status, headers: { Location: target } });
      });
      const response = await h.request(`/api/mf/${CODE}`);
      assert.equal(response.status, 502);
      assert.match((await response.json()).error, /redirect/i);
      assert.deepEqual(visited, [`https://api.mfapi.in/mf/${CODE}`]);
      assert.equal(h.BUCKET.values.size, 0);
      assert.equal((await (await h.request('/api/data/status')).json()).archivedCount, 0);
    }
  });
}
