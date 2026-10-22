import assert from 'node:assert/strict';
import test from 'node:test';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { runTranche as runCollector, catalogueSlot, selectWork, createSource, collectionEnabled } from '../scripts/github-history-v2.ts';
import { calculateCounts, validateCheckpoint, validateHistoryShard,
  type ArchiveAssetRef, type ArchiveCheckpoint, type ArchiveSnapshot, type HistoryShard } from '../scripts/archive-model.ts';
import type { ArchiveStore } from '../scripts/archive-store.ts';

const START = Date.parse('2026-10-21T08:00:00.000Z');
const CODE = 118955;
// Synthetic providers start work at invocation. Real transport boundary tests
// below call runCollector directly and forward onStart into createSource.
const runTranche = (options: Parameters<typeof runCollector>[0]) => {
  const injected = options.source;
  return runCollector({ ...options, source: injected ? (path, onStart) => {
    onStart?.(); return injected(path);
  } : undefined });
};
const rawCatalogue = (codes = [CODE], date = '21-10-2026') => codes.map(schemeCode => ({ schemeCode, schemeName: `Fund ${schemeCode}`, date, nav: '11.00' }));
const history = (code = CODE, data = [{ date: '21-10-2026', nav: '11.00' }, { date: '20-10-2026', nav: '10.00' }]) => ({
  status: 'SUCCESS', meta: { scheme_code: code, scheme_name: `Fund ${code}`, fund_house: 'Test AMC', scheme_type: 'Open Ended', scheme_category: 'Equity' }, data,
});

class MemoryStore implements ArchiveStore {
  snapshot: ArchiveSnapshot | null = null;
  assets = new Map<string, unknown>();
  commits = 0;
  failCommit = false;
  async loadSnapshot() { return structuredClone(this.snapshot); }
  async readAssetBytes(ref: ArchiveAssetRef) { return gzipSync(Buffer.from(JSON.stringify(this.assets.get(ref.sha256)))); }
  async readShard(ref: ArchiveAssetRef, bucket: string) { return validateHistoryShard(structuredClone(this.assets.get(ref.sha256)), bucket); }
  async writeJSON(kind: string, value: unknown) {
    const json = Buffer.from(JSON.stringify(value)); const body = gzipSync(json);
    const sha256 = createHash('sha256').update(body).digest('hex');
    const name = `${kind}-${sha256}.json.gz`;
    const ref: ArchiveAssetRef = { id: this.assets.size + 1, releaseTag: 'fundscope-mfapi-v2-data-000001', name,
      url: `https://github.com/Vasuki8/mutual-fund-dashboard/releases/download/fundscope-mfapi-v2-data-000001/${name}`,
      sha256, bytes: body.length, expandedBytes: json.length };
    this.assets.set(sha256, structuredClone(value)); return ref;
  }
  async commitCheckpoint(checkpoint: ArchiveCheckpoint, expectedSequence: number | null) {
    assert.equal(this.snapshot?.checkpoint.sequence ?? null, expectedSequence);
    if (this.failCommit) throw new Error('readback_failed');
    const catalogue = structuredClone(this.assets.get(checkpoint.catalogue.sha256)) as ArchiveSnapshot['catalogue'];
    validateCheckpoint(checkpoint, catalogue);
    this.snapshot = { checkpoint: structuredClone(checkpoint), catalogue }; this.commits += 1;
  }
}

test('catalogue refresh slots cover both daily UTC windows and midnight', () => {
  assert.equal(catalogueSlot(Date.parse('2026-10-21T06:59:59Z')), '2026-10-20T19:00:00.000Z');
  assert.equal(catalogueSlot(START), '2026-10-21T07:00:00.000Z');
  assert.equal(catalogueSlot(Date.parse('2026-10-21T19:00:00Z')), '2026-10-21T19:00:00.000Z');
});

test('deadline deferral saves the catalogue without consuming source attempts', async () => {
  const store = new MemoryStore(); let time = START; const requested: string[] = [];
  const result = await runTranche({ store, now: () => time, deadline: START + 2000, reserveMs: 1000, minCatalogueSize: 1,
    source: async path => { requested.push(path); time += 1500; return rawCatalogue(); } });
  assert.deepEqual(requested, ['/mf/latest']);
  assert.equal(result.firstAttempted, 0);
  assert.equal(result.historiesAdded, 0);
  assert.equal(store.snapshot!.checkpoint.states[CODE].attempts, 0);
  assert.deepEqual(store.snapshot!.checkpoint.counts, { total: 1, attempted: 0, saved: 0, clean: 0,
    qualityIssues: 0, sourceGaps: 0, pending: 1, refreshPending: 0, bulkPassComplete: false, coverageComplete: false });
});

test('a saved short refresh retains history and applies corrections without restarting completed work', async () => {
  const store = new MemoryStore(); let time = START;
  await runTranche({ store, now: () => time, minCatalogueSize: 1,
    source: async path => path === '/mf/latest' ? rawCatalogue() : history() });
  const initial = store.snapshot!;
  assert.equal(initial.checkpoint.counts.coverageComplete, true);
  const noop = await runTranche({ store, now: () => time + 1000, minCatalogueSize: 1, source: async () => { throw new Error('unexpected request'); } });
  assert.equal(noop.changed, false);
  time = Date.parse('2026-10-21T20:00:00Z');
  await runTranche({ store, now: () => time, minCatalogueSize: 1, source: async path => path === '/mf/latest'
    ? rawCatalogue([CODE], '22-10-2026') : history(CODE, [{ date: '22-10-2026', nav: '11.50' }, { date: '21-10-2026', nav: '11.10' }]) });
  const bucket = String(Math.floor(CODE / 32));
  const shard = await store.readShard(store.snapshot!.checkpoint.shards[bucket], bucket);
  assert.deepEqual(shard.records[0].payload.data, [{ date: '22-10-2026', nav: '11.50' }, { date: '21-10-2026', nav: '11.10' }, { date: '20-10-2026', nav: '10.00' }]);
  assert.equal(store.snapshot!.checkpoint.states[CODE].attempts, 2);
});

test('source failure is durable, backs off, and cannot claim complete coverage', async () => {
  const store = new MemoryStore();
  const result = await runTranche({ store, now: () => START, minCatalogueSize: 1, source: async path => {
    if (path === '/mf/latest') return rawCatalogue();
    throw new Error('untrusted URL token=should-not-appear');
  } });
  const state = store.snapshot!.checkpoint.states[CODE];
  assert.equal(state.attempts, 1); assert.equal(state.status, 'source-error');
  assert.equal(result.firstAttempted, 1);
  assert.equal(result.historiesAdded, 0);
  assert.ok(Date.parse(state.nextAttemptAt!) > START);
  assert.equal(state.lastError, 'source_unavailable');
  assert.equal(store.snapshot!.checkpoint.counts.bulkPassComplete, true);
  assert.equal(store.snapshot!.checkpoint.counts.coverageComplete, false);
  assert.equal(selectWork(store.snapshot!.catalogue, store.snapshot!.checkpoint.states, START + 1000).length, 0);
});

test('continuation progress distinguishes newly saved first attempts from refreshes and no-ops', async () => {
  const store = new MemoryStore();
  const first = await runTranche({ store, now: () => START, minCatalogueSize: 1,
    source: async path => path === '/mf/latest' ? rawCatalogue([CODE, CODE + 1]) : history(Number(path.split('/').at(-1))) });
  assert.equal(first.firstAttempted, 2);
  assert.equal(first.historiesAdded, 2);
  const noop = await runTranche({ store, now: () => START + 1000, source: async () => { throw new Error('unexpected request'); } });
  assert.equal(noop.firstAttempted, 0);
  assert.equal(noop.historiesAdded, 0);
  const refresh = await runTranche({ store, now: () => START + 12 * 3600_000, minCatalogueSize: 1,
    source: async path => path === '/mf/latest' ? rawCatalogue([CODE, CODE + 1], '22-10-2026')
      : history(Number(path.split('/').at(-1)), [{ date: '22-10-2026', nav: '11.00' }, { date: '21-10-2026', nav: '11.00' }]) });
  assert.equal(refresh.attempted, 2);
  assert.equal(refresh.firstAttempted, 0);
  assert.equal(refresh.historiesAdded, 0);
});

test('a stale continuation checkpoint fence stops before any source request or write', async () => {
  const store = new MemoryStore();
  await runTranche({ store, now: () => START, minCatalogueSize: 1,
    source: async path => path === '/mf/latest' ? rawCatalogue() : history() });
  const previous = structuredClone(store.snapshot); let requests = 0;
  await assert.rejects(runTranche({ store, expectedSequence: null, now: () => START + 12 * 3600_000,
    minCatalogueSize: 1, source: async () => { requests += 1; return rawCatalogue(); } }), /checkpoint_conflict/);
  assert.equal(requests, 0);
  assert.equal(store.commits, 1);
  assert.deepEqual(store.snapshot, previous);
  const accepted = await runTranche({ store, expectedSequence: 1, now: () => START + 1000,
    source: async () => { requests += 1; throw new Error('unexpected request'); } });
  assert.equal(accepted.changed, false);
  assert.equal(requests, 0);
});

test('new and disappeared schemes retain stable history buckets and join the queue', async () => {
  const store = new MemoryStore();
  await runTranche({ store, now: () => START, minCatalogueSize: 1, source: async path => path === '/mf/latest' ? rawCatalogue() : history() });
  await runTranche({ store, now: () => START + 12 * 3600_000, minCatalogueSize: 1,
    source: async path => path === '/mf/latest' ? rawCatalogue([CODE + 100]) : history(Number(path.split('/').at(-1))) });
  assert.equal(store.snapshot!.catalogue.entries.length, 2);
  assert.equal(store.snapshot!.catalogue.entries.find(entry => entry.schemeCode === CODE)!.current, false);
  assert.equal(store.snapshot!.checkpoint.states[CODE].attempts, 1);
  assert.equal(store.snapshot!.checkpoint.states[CODE + 100].attempts, 1);
  assert.equal(store.snapshot!.checkpoint.counts.saved, 2);
});

test('failed publication leaves saved progress intact and retry merges from the previous checkpoint', async () => {
  const store = new MemoryStore(); store.failCommit = true;
  await assert.rejects(runTranche({ store, now: () => START, minCatalogueSize: 1,
    source: async path => path === '/mf/latest' ? rawCatalogue() : history() }), /readback_failed/);
  assert.equal(store.snapshot, null);
  store.failCommit = false;
  await runTranche({ store, now: () => START, minCatalogueSize: 1,
    source: async path => path === '/mf/latest' ? rawCatalogue() : history() });
  assert.equal(store.snapshot!.checkpoint.sequence, 1);
  assert.equal(store.snapshot!.checkpoint.states[CODE].attempts, 1);
});

test('stored identity, range and count mismatches fail closed', async () => {
  const store = new MemoryStore();
  await runTranche({ store, now: () => START, minCatalogueSize: 1, source: async path => path === '/mf/latest' ? rawCatalogue() : history() });
  const snapshot = store.snapshot!;
  const corrupt = structuredClone(snapshot.checkpoint); corrupt.counts.saved += 1;
  assert.throws(() => validateCheckpoint(corrupt, snapshot.catalogue), /count/);
  const bucket = String(Math.floor(CODE / 32));
  const shard = await store.readShard(snapshot.checkpoint.shards[bucket], bucket);
  shard.records[0].coverageStart = '2000-01-01';
  assert.throws(() => validateHistoryShard(shard, bucket), /coverage/);
});

test('selection is bounded by both schemes and stable buckets and reconciles after seven days', async () => {
  const store = new MemoryStore(); const codes = Array.from({ length: 40 }, (_, i) => CODE + i * 32);
  await runTranche({ store, now: () => START, maxShards: 2, minCatalogueSize: 1,
    source: async path => path === '/mf/latest' ? rawCatalogue(codes) : history(Number(path.split('/').at(-1))) });
  assert.equal(store.snapshot!.checkpoint.counts.attempted, 2);
  assert.equal(selectWork(store.snapshot!.catalogue, store.snapshot!.checkpoint.states, START, 512, 16).length, 16);
  const one = new MemoryStore();
  await runTranche({ store: one, now: () => START, minCatalogueSize: 1, source: async path => path === '/mf/latest' ? rawCatalogue() : history() });
  const later = START + 7 * 86400_000;
  assert.equal(calculateCounts(one.snapshot!.catalogue, one.snapshot!.checkpoint.states, later).refreshPending, 1);
  assert.equal(selectWork(one.snapshot!.catalogue, one.snapshot!.checkpoint.states, later).length, 1);
});

test('two in-flight source requests complete while later deadline work remains unattempted', async () => {
  const store = new MemoryStore(); let time = START; let active = 0; let maximum = 0;
  const codes = Array.from({ length: 6 }, (_, index) => CODE + index);
  const result = await runTranche({ store, now: () => time, deadline: START + 7000, reserveMs: 1000, minCatalogueSize: 1,
    source: async path => {
      if (path === '/mf/latest') return rawCatalogue(codes);
      active += 1; maximum = Math.max(maximum, active);
      await new Promise(resolve => setTimeout(resolve, 5));
      time = START + 6000; active -= 1; return history(Number(path.split('/').at(-1)));
    } });
  assert.equal(maximum, 2); assert.equal(result.attempted, 2); assert.equal(result.deferred, 4);
  assert.equal(store.snapshot!.checkpoint.counts.pending, 4);
});

test('source failures retain quality flags and old observations independently', async () => {
  const store = new MemoryStore();
  await runTranche({ store, now: () => START, minCatalogueSize: 1, source: async path => path === '/mf/latest' ? rawCatalogue()
    : history(CODE, [{ date: '21-10-2026', nav: '11.00' }, { date: '20-10-2026', nav: '1.00' }]) });
  assert.equal(store.snapshot!.checkpoint.states[CODE].quality, true);
  assert.equal(store.snapshot!.checkpoint.counts.qualityIssues, 1);
  await runTranche({ store, now: () => START + 16 * 60_000, minCatalogueSize: 1, source: async () => { throw new Error('offline'); } });
  const current = store.snapshot!.checkpoint;
  assert.equal(current.counts.saved, 1); assert.equal(current.counts.qualityIssues, 1); assert.equal(current.counts.sourceGaps, 1);
  assert.equal(current.counts.coverageComplete, false);
  const bucket = String(Math.floor(CODE / 32));
  assert.equal((await store.readShard(current.shards[bucket], bucket)).records[0].payload.data.length, 2);
});

test('an older response preserves the successful full-history timestamp and stays unresolved', async () => {
  const store = new MemoryStore();
  await runTranche({ store, now: () => START, minCatalogueSize: 1, source: async path => path === '/mf/latest' ? rawCatalogue() : history() });
  const before = store.snapshot!.checkpoint.states[CODE].historyFetchedAt;
  await runTranche({ store, now: () => START + 7 * 86400_000, minCatalogueSize: 1,
    source: async path => path === '/mf/latest' ? rawCatalogue() : history(CODE, [{ date: '20-10-2026', nav: '9.00' }]) });
  const state = store.snapshot!.checkpoint.states[CODE];
  assert.equal(state.historyFetchedAt, before); assert.equal(state.coverageEnd, '2026-10-21');
  assert.equal(state.quality, true); assert.equal(store.snapshot!.checkpoint.counts.coverageComplete, false);
});

test('long HTTP-date rate limits are persisted without an immediate retry', async () => {
  const store = new MemoryStore(); let requests = 0;
  const provider = createSource({ now: () => START, deadline: START + 60_000, fetch: async () => {
    requests += 1; return new Response(null, { status: 429, headers: { 'Retry-After': new Date(START + 3600_000).toUTCString() } });
  } });
  await runTranche({ store, now: () => START, minCatalogueSize: 1,
    source: path => path === '/mf/latest' ? Promise.resolve(rawCatalogue()) : provider(path) });
  assert.equal(requests, 1);
  assert.equal(store.snapshot!.checkpoint.states[CODE].lastError, 'source_http_429');
  assert.equal(store.snapshot!.checkpoint.states[CODE].nextAttemptAt, new Date(START + 3600_000).toISOString());
});

test('CLI publication remains disabled before credentials or repository access are considered', () => {
  assert.equal(collectionEnabled({ FUNDSCOPE_GITHUB_ARCHIVE_ENABLED: 'false', GITHUB_TOKEN: '', GITHUB_REPOSITORY: '' }), false);
  assert.throws(() => collectionEnabled({ FUNDSCOPE_GITHUB_ARCHIVE_ENABLED: 'true', GITHUB_REPOSITORY: 'other/repo' }), /repository_not_authorized/);
  assert.throws(() => collectionEnabled({ FUNDSCOPE_GITHUB_ARCHIVE_ENABLED: 'true', GITHUB_REPOSITORY: 'Vasuki8/mutual-fund-dashboard',
    GITHUB_REF: 'refs/heads/feature' }), /branch_not_authorized/);
});

test('a source-wide rate limit stops new requests and persists a cooldown across tranches', async () => {
  const store = new MemoryStore(); const codes = Array.from({ length: 6 }, (_, index) => CODE + index);
  let requests = 0;
  const provider = createSource({ now: () => START, deadline: START + 60_000, fetch: async input => {
    requests += 1; const code = Number(String(input).split('/').at(-1));
    if (code === CODE) return new Response(null, { status: 429, headers: { 'Retry-After': '3600' } });
    await new Promise(resolve => setTimeout(resolve, 5)); return Response.json(history(code));
  } });
  const first = await runTranche({ store, now: () => START, minCatalogueSize: 1,
    source: path => path === '/mf/latest' ? Promise.resolve(rawCatalogue(codes)) : provider(path) });
  assert.equal(requests, 2); assert.equal(first.attempted, 2); assert.equal(first.deferred, 4);
  assert.equal(store.snapshot!.checkpoint.sourceRetryAt, new Date(START + 3600_000).toISOString());
  assert.equal(store.snapshot!.checkpoint.counts.pending, 4);
  const paused = await runTranche({ store, now: () => START + 30 * 60_000, minCatalogueSize: 1,
    source: async () => { throw new Error('source request during persisted cooldown'); } });
  assert.equal(paused.changed, false); assert.equal(paused.attempted, 0);
  const resumed = await runTranche({ store, now: () => START + 61 * 60_000, minCatalogueSize: 1,
    source: async path => history(Number(path.split('/').at(-1))) });
  assert.equal(resumed.counts!.coverageComplete, true);
  assert.equal(store.snapshot!.checkpoint.sourceRetryAt, null);
});

test('a catalogue NAV correction on the same date schedules history reconciliation', async () => {
  const store = new MemoryStore();
  await runTranche({ store, now: () => START, minCatalogueSize: 1,
    source: async path => path === '/mf/latest' ? rawCatalogue() : history() });
  await runTranche({ store, now: () => START + 12 * 3600_000, minCatalogueSize: 1,
    source: async path => path === '/mf/latest' ? [{ ...rawCatalogue()[0], nav: '11.125000000001' }]
      : history(CODE, [{ date: '21-10-2026', nav: '11.125000000001' }, { date: '20-10-2026', nav: '10.00' }]) });
  const state = store.snapshot!.checkpoint.states[CODE];
  assert.equal(state.attempts, 2); assert.equal(state.latestNav, '11.125000000001');
  assert.equal(store.snapshot!.checkpoint.counts.coverageComplete, true);
  const equivalent = structuredClone(store.snapshot!.catalogue);
  equivalent.entries[0].nav = '011.1250000000010';
  assert.equal(selectWork(equivalent, store.snapshot!.checkpoint.states, START + 13 * 3600_000).length, 0);
});

test('429 without Retry-After persists a conservative source-wide cooldown immediately', async () => {
  const store = new MemoryStore(); let requests = 0;
  const provider = createSource({ now: () => START, deadline: START + 60_000, fetch: async () => {
    requests += 1; return new Response(null, { status: 429 });
  } });
  await runTranche({ store, now: () => START, minCatalogueSize: 1,
    source: path => path === '/mf/latest' ? Promise.resolve(rawCatalogue()) : provider(path) });
  assert.equal(requests, 1);
  assert.equal(store.snapshot!.checkpoint.sourceRetryAt, new Date(START + 15 * 60_000).toISOString());
  assert.equal(store.snapshot!.checkpoint.counts.coverageComplete, false);
});

test('the source deadline before the first HTTP request leaves history work unattempted', async () => {
  const store = new MemoryStore(); let time = START;
  await runTranche({ store, now: () => time, deadline: START + 2000, reserveMs: 1000, minCatalogueSize: 1,
    source: async () => { time += 1500; return rawCatalogue(); } });
  time = START + 5000;
  const workDeadline = START + 10_000; let fetches = 0;
  const provider = createSource({ now: () => time, deadline: workDeadline, fetch: async () => {
    fetches += 1; return Response.json(history());
  } });
  const result = await runCollector({ store, now: () => time, deadline: workDeadline + 2000, reserveMs: 2000,
    source: (path, onStart) => { time = workDeadline; return provider(path, onStart); } });
  assert.equal(fetches, 0); assert.equal(result.attempted, 0); assert.equal(result.deferred, 1);
  const state = store.snapshot!.checkpoint.states[CODE];
  assert.equal(state.status, 'pending'); assert.equal(state.attempts, 0); assert.equal(state.lastAttemptAt, null);
  assert.equal(state.lastError, null); assert.equal(state.nextAttemptAt, null);
  assert.equal(store.snapshot!.checkpoint.counts.pending, 1);
  assert.equal(store.snapshot!.checkpoint.counts.bulkPassComplete, false);
});

test('a deadline blocking a retry retains the attempt for the HTTP request that already started', async () => {
  const store = new MemoryStore(); let time = START;
  await runTranche({ store, now: () => time, deadline: START + 2000, reserveMs: 1000, minCatalogueSize: 1,
    source: async () => { time += 1500; return rawCatalogue(); } });
  time = START + 5000;
  const workDeadline = START + 10_000; let fetches = 0; let afterFetchClockReads = 0;
  const clock = () => {
    // The first two reads allow parsing Retry-After and scheduling a retry;
    // the next read reaches the deadline at the retry's request-start guard.
    if (fetches > 0 && ++afterFetchClockReads >= 3) time = workDeadline;
    return time;
  };
  const provider = createSource({ now: clock, deadline: workDeadline, fetch: async () => {
    fetches += 1; return new Response(null, { status: 502, headers: { 'Retry-After': '0' } });
  } });
  const result = await runCollector({ store, now: () => time, deadline: workDeadline + 2000, reserveMs: 2000, source: provider });
  assert.equal(fetches, 1); assert.equal(result.attempted, 1);
  const state = store.snapshot!.checkpoint.states[CODE];
  assert.equal(state.attempts, 1); assert.equal(state.status, 'source-error');
  assert.equal(state.lastError, 'source_deadline'); assert.ok(state.nextAttemptAt);
  assert.equal(store.snapshot!.checkpoint.counts.pending, 0);
  assert.equal(store.snapshot!.checkpoint.counts.coverageComplete, false);
});
