import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { runTranche } from '../scripts/github-history-v2.ts';
import { auditArchiveSnapshot } from '../scripts/archive-data-audit.ts';
import { validateCheckpoint, validateHistoryShard,
  type ArchiveAssetRef, type ArchiveCheckpoint, type ArchiveSnapshot } from '../scripts/archive-model.ts';
import type { ArchiveStore } from '../scripts/archive-store.ts';

const NOW = Date.parse('2026-10-27T12:00:00.000Z');
const DAY = 86_400_000;
// The assertion keeps the pre-implementation fixture type-correct. Before the
// new policy exists the engine ignores this option and the request tests fail.
const scoped = (options: Parameters<typeof runTranche>[0]) =>
  runTranche({ ...options, activeRepairOnly: true } as Parameters<typeof runTranche>[0]);

type Entry = { schemeCode: number; schemeName: string; date: string | null; nav: string | null };
const entry = (code: number, date: string | null, nav: string | null = '10.00'): Entry =>
  ({ schemeCode: code, schemeName: `Synthetic ${code} Growth`, date, nav });
const iso = (date: string) => date.slice(6,10) + '-' + date.slice(3,5) + '-' + date.slice(0,2);
const sourceDate = (date: string) => date.slice(8,10) + '-' + date.slice(5,7) + '-' + date.slice(0,4);
function history(value: Entry, flagged = false) {
  const date = value.date ?? '26-10-2026';
  const prior = sourceDate(new Date(Date.parse(iso(date)) - DAY).toISOString().slice(0,10));
  return { status: 'SUCCESS', meta: { scheme_code: value.schemeCode, scheme_name: value.schemeName,
    fund_house: 'Synthetic AMC', scheme_type: 'Open Ended', scheme_category: 'Debt' },
    data: [{ date, nav: value.nav ?? '10.00' }, { date: prior, nav: flagged ? '3.00' : value.nav ?? '10.00' }] };
}

class MemoryStore implements ArchiveStore {
  snapshot: ArchiveSnapshot | null = null;
  assets = new Map<string, unknown>();
  shardReads = 0;
  async loadSnapshot() { return structuredClone(this.snapshot); }
  async readAssetBytes(ref: ArchiveAssetRef) { return gzipSync(Buffer.from(JSON.stringify(this.assets.get(ref.sha256)))); }
  async readShard(ref: ArchiveAssetRef, bucket: string) {
    this.shardReads++;
    return validateHistoryShard(structuredClone(this.assets.get(ref.sha256)), bucket);
  }
  async writeJSON(kind: string, value: unknown) {
    const json = Buffer.from(JSON.stringify(value));
    const body = gzipSync(json);
    const sha256 = createHash('sha256').update(body).digest('hex');
    const name = `${kind}-${sha256}.json.gz`;
    const ref: ArchiveAssetRef = { id: this.assets.size + 1, releaseTag: 'fundscope-mfapi-v2-data-000001', name,
      url: `https://github.com/Vasuki8/mutual-fund-dashboard/releases/download/fundscope-mfapi-v2-data-000001/${name}`,
      sha256, bytes: body.length, expandedBytes: json.length };
    this.assets.set(sha256, structuredClone(value));
    return ref;
  }
  async commitCheckpoint(checkpoint: ArchiveCheckpoint, expected: number | null) {
    assert.equal(this.snapshot?.checkpoint.sequence ?? null, expected);
    const catalogue = structuredClone(this.assets.get(checkpoint.catalogue.sha256)) as ArchiveSnapshot['catalogue'];
    validateCheckpoint(checkpoint, catalogue);
    this.snapshot = { checkpoint: structuredClone(checkpoint), catalogue };
  }
}
function sourceFor(entries: Entry[], calls: string[], flagged = false) {
  return async (path: string, onStart?: () => void) => {
    calls.push(path);
    if (path === '/mf/latest') return entries;
    onStart?.();
    const found = entries.find(e => `/mf/${e.schemeCode}` === path);
    assert.ok(found, `Unexpected source history request: ${path}`);
    return history(found, flagged);
  };
}

test('30-day repair scope includes the boundary and excludes old, future, invalid and unlisted identities before requests', async () => {
  const store = new MemoryStore();
  const rows = [entry(100033, '27-09-2026'), entry(119436, '26-09-2026'),
    entry(100047, '19-10-2026'), entry(145535, '27-10-2026'), entry(145536, '28-10-2026'),
    entry(154804, '27-10-2026', '0'), entry(100046, null), entry(100051, '26-10-2026', 'Infinity'),
    entry(900001, '26-10-2026')];
  const calls: string[] = [];
  const result = await scoped({ store, now: () => NOW, minCatalogueSize: 1, source: sourceFor(rows, calls) });
  assert.deepEqual(calls.filter(path => path !== '/mf/latest').sort(), ['/mf/100033', '/mf/100047', '/mf/145535']);
  assert.equal(result.attempted, 3);
  assert.equal(result.counts?.total, 9, 'Stored catalogue is not filtered to the repair population.');
  assert.equal(result.counts?.saved, 3);
  assert.equal(result.counts?.pending, 6, 'Excluded first attempts are not falsely marked complete.');
  assert.equal(result.counts?.coverageComplete, false);
  assert.equal(store.snapshot!.checkpoint.states[119436].attempts, 0);
  assert.equal(store.snapshot!.checkpoint.states[900001].attempts, 0);
});

test('repairing an active scheme preserves excluded histories and flags in the same rewritten shard', async () => {
  const store = new MemoryStore();
  const initial = [entry(100033, '26-10-2026'), entry(100046, '26-09-2026'), entry(100047, '26-10-2026')];
  await runTranche({ store, now: () => NOW - DAY, minCatalogueSize: 1, source: sourceFor(initial, [], true) });
  const before = structuredClone(store.snapshot!);
  const bucket = String(Math.floor(100033 / 32));
  assert.equal(bucket, String(Math.floor(100046 / 32)));
  const saved = await store.readShard(before.checkpoint.shards[bucket], bucket);
  // 100046 is now 31 days old; 100047 retains a recent NAV but disappears from latest membership.
  const latest = [entry(100033, '27-10-2026'), entry(100046, '26-09-2026')];
  const calls: string[] = [];
  await scoped({ store, now: () => NOW, minCatalogueSize: 1, source: sourceFor(latest, calls, true) });
  assert.deepEqual(calls, ['/mf/latest', '/mf/100033']);
  const after = store.snapshot!;
  const rewritten = await store.readShard(after.checkpoint.shards[bucket], bucket);
  for (const code of [100046, 100047]) {
    assert.deepEqual(after.checkpoint.states[code], before.checkpoint.states[code]);
    assert.deepEqual(rewritten.records.find(doc => doc.schemeCode === code), saved.records.find(doc => doc.schemeCode === code));
    assert.equal(after.checkpoint.states[code].quality, true, 'Out of scope does not mean repaired.');
  }
  assert.equal(after.catalogue.entries.find(e => e.schemeCode === 100047)?.current, false);
  assert.equal(after.checkpoint.counts.saved, 3);
});

test('a stale whole catalogue causes no history requests or shard reads rather than resetting the recency clock', async () => {
  const store = new MemoryStore();
  const calls: string[] = [];
  const rows = [entry(100033, '01-09-2026'), entry(119436, '01-09-2026')];
  const result = await scoped({ store, now: () => NOW, minCatalogueSize: 1, source: sourceFor(rows, calls) });
  assert.deepEqual(calls, ['/mf/latest']);
  assert.equal(store.shardReads, 0);
  assert.equal(result.attempted, 0);
  assert.equal(result.counts?.pending, 2);
  assert.equal(result.counts?.coverageComplete, false);
});

test('a previously excluded scheme re-enters repair after a new positive catalogue NAV', async () => {
  const store = new MemoryStore();
  const first: string[] = [];
  await scoped({ store, now: () => NOW, minCatalogueSize: 1,
    source: sourceFor([entry(100033, '26-09-2026')], first) });
  assert.deepEqual(first, ['/mf/latest']);
  const next: string[] = [];
  const result = await scoped({ store, now: () => NOW + DAY, minCatalogueSize: 1,
    source: sourceFor([entry(100033, '28-10-2026')], next) });
  assert.deepEqual(next, ['/mf/latest', '/mf/100033']);
  assert.equal(result.historiesAdded, 1);
  assert.equal(store.snapshot!.checkpoint.states[100033].attempts, 1);
  assert.equal(store.snapshot!.checkpoint.counts.total, 1);
});

test('active-only repair still respects retry backoff for an empty source history', async () => {
  const store = new MemoryStore();
  const rows = [entry(100033, '27-10-2026')];
  const source = async (path: string, onStart?: () => void) => {
    if (path === '/mf/latest') return rows;
    onStart?.();
    return { ...history(rows[0]), data: [] };
  };
  await scoped({ store, now: () => NOW, minCatalogueSize: 1, source });
  const before = structuredClone(store.snapshot!);
  const result = await scoped({ store, now: () => NOW + 60_000,
    source: async () => { throw new Error('Backoff must prevent a source request.'); } });
  assert.equal(result.attempted, 0);
  assert.deepEqual(store.snapshot, before);
  assert.equal(before.checkpoint.states[100033].nextAttemptAt, new Date(NOW + 15 * 60_000).toISOString());
});

test('active repair audit uses 30-day eligibility without reducing all-history quality totals', async () => {
  const store = new MemoryStore();
  const rows = [entry(100033, '27-09-2026'), entry(100047, '26-09-2026'), entry(119436, '19-10-2026')];
  await runTranche({ store, now: () => NOW, minCatalogueSize: 1, source: sourceFor(rows, [], true) });
  const before = structuredClone(store.snapshot!);
  const report = auditArchiveSnapshot(store.snapshot!, NOW);
  assert.equal(report.currentlyReporting.navRecencyDays, 30);
  assert.equal(report.currentlyReporting.reporting, 2);
  assert.equal(report.currentlyReporting.discontinuityOnly, 2);
  assert.deepEqual(report.currentlyReporting.examples.discontinuityOnly, [100033, 119436]);
  assert.equal(report.counts.qualityIssues, 3, 'Historical warnings remain in full-universe accounting.');
  assert.deepEqual(store.snapshot, before, 'Audit remains read only.');
});
