import assert from 'node:assert/strict';
import test from 'node:test';
import { continueBackfill } from '../scripts/backfill-control.ts';
import { pendingState, type ArchiveSnapshot, type ArchiveAssetRef } from '../scripts/archive-model.ts';

const NOW = Date.parse('2026-10-22T08:00:00.000Z');
const asOf = new Date(NOW).toISOString();
const ACTIVE = 118955;
const EXCLUDED = [154858, 154859, 154860, 154861];
const after = { total: 1, attempted: 1, saved: 1, clean: 1, qualityIssues: 0,
  sourceGaps: 0, pending: 0, refreshPending: 0, bulkPassComplete: true, coverageComplete: true };
const before = { ...after, refreshPending: 1, coverageComplete: false };
const asset = (kind: string): ArchiveAssetRef => ({ id: 1, releaseTag: 'fundscope-mfapi-v2-data-000001',
  name: `${kind}-${'a'.repeat(64)}.json.gz`, sha256: 'a'.repeat(64), bytes: 10, expandedBytes: 20,
  url: `https://github.com/Vasuki8/mutual-fund-dashboard/releases/download/fundscope-mfapi-v2-data-000001/${kind}-${'a'.repeat(64)}.json.gz` });

function fixture() {
  const snapshot: ArchiveSnapshot = {
    catalogue: { version: 1, fetchedAt: asOf, warnings: [], entries: [ACTIVE, ...EXCLUDED].map(schemeCode => ({
      schemeCode, schemeName: `Fund ${schemeCode}`, isinGrowth: null, isinDivReinvestment: null,
      latestDate: '2026-10-22', nav: '11.00', current: true,
    })) },
    checkpoint: { version: 2, source: 'mfapi.in', sequence: 7, updatedAt: asOf,
      catalogueFetchedAt: asOf, catalogueSlot: '2026-10-22T07:00:00.000Z', catalogue: asset('catalogue'),
      shards: { [String(Math.floor(ACTIVE / 32))]: asset(`history-${Math.floor(ACTIVE / 32)}`) },
      states: Object.fromEntries([ACTIVE, ...EXCLUDED].map(code => [code, pendingState(code)])),
      counts: { ...after, total: 5, pending: 4, bulkPassComplete: false, coverageComplete: false },
      lastCatalogueError: null, sourceRetryAt: null,
    },
  };
  snapshot.checkpoint.states[ACTIVE] = { ...pendingState(ACTIVE), status: 'clean', attempts: 2,
    lastAttemptAt: asOf, historyFetchedAt: asOf, coverageStart: '2026-10-21', coverageEnd: '2026-10-22',
    latestNav: '11.00', observationCount: 2 };
  const requests: { method: string; url: string }[] = [];
  const publicRef = (ref: ArchiveAssetRef) => ({ path: `archive/${ref.name}`, sha256: ref.sha256, bytes: ref.bytes, expandedBytes: ref.expandedBytes });
  const result = { changed: true, sequence: 7, attempted: 1, firstAttempted: 0, historiesAdded: 0,
    reconciliationAdvanced: true, deferred: 0, counts: structuredClone(snapshot.checkpoint.counts),
    lastCatalogueError: null as string | null, sourceRetryAt: null as string | null,
    activeRepairProgress: { asOf, before: { ...before }, after: { ...after } },
  };
  const context = { rootRunId: '100', parentRunId: null as string | null, runId: '100', runAttempt: 1, position: 1,
    startingSequence: 6, deadline: new Date(NOW + 4 * 3600_000).toISOString() };
  const env = { GITHUB_REPOSITORY: 'Vasuki8/mutual-fund-dashboard', GITHUB_REF: 'refs/heads/main',
    FUNDSCOPE_GITHUB_ARCHIVE_ENABLED: 'true', GITHUB_TOKEN: 'fixture-token', GITHUB_RUN_ID: '100', GITHUB_RUN_ATTEMPT: '1' };
  const options = { env, now: () => NOW, store: { loadSnapshot: async () => structuredClone(snapshot) },
    fetch: async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input), method = init?.method ?? 'GET';
      requests.push({ method, url });
      if (method === 'POST') {
        assert.equal(url, 'https://api.github.com/repos/Vasuki8/mutual-fund-dashboard/actions/workflows/github-history.yml/dispatches');
        const body = JSON.parse(String(init?.body));
        assert.equal(body.inputs.expected_sequence, '7');
        assert.equal(body.inputs.chain_position, '2');
        return Response.json({ workflow_run_id: 102 });
      }
      assert.equal(new URL(url).origin, 'https://vasuki8.github.io');
      return Response.json({ version: 2, source: 'mfapi.in', status: 'ready', collectionEnabled: true,
        sequence: 7, checkpointAt: asOf, counts: snapshot.checkpoint.counts,
        catalogue: publicRef(snapshot.checkpoint.catalogue),
        shards: Object.fromEntries(Object.entries(snapshot.checkpoint.shards).map(([key, ref]) => [key, publicRef(ref)])) });
    },
  };
  return { snapshot, result, context, options, requests };
}

test('excluded pending schemes do not stop a verified improvement in the active repair queue', async () => {
  const f = fixture();
  const outcome = await continueBackfill({ ...f.options, context: f.context, result: f.result });
  assert.equal(outcome.dispatched, true);
  assert.equal(outcome.childRunId, 102);
  assert.deepEqual(f.requests.map(request => request.method), ['GET', 'POST']);
  assert.equal(f.snapshot.checkpoint.counts.pending, 4);
  assert.deepEqual(EXCLUDED.map(code => f.snapshot.checkpoint.states[code].attempts), [0, 0, 0, 0]);
});

test('an unchanged active queue stops even with excluded schemes still pending', async () => {
  const f = fixture(); f.result.activeRepairProgress.before = { ...after }; f.result.reconciliationAdvanced = false;
  const outcome = await continueBackfill({ ...f.options, context: f.context, result: f.result });
  assert.equal(outcome.reason, 'no_reconciliation_progress');
  assert.deepEqual(f.requests.map(request => request.method), ['GET']);
});

test('a remaining eligible first attempt keeps the first-pass progress requirement', async () => {
  const f = fixture(); const pendingCode = 100601;
  f.snapshot.catalogue.entries.push({ schemeCode: pendingCode, schemeName: 'Eligible pending fund',
    isinGrowth: null, isinDivReinvestment: null, latestDate: '2026-10-22', nav: '11.00', current: true });
  f.snapshot.checkpoint.states[pendingCode] = pendingState(pendingCode);
  f.snapshot.checkpoint.counts.total = 6; f.snapshot.checkpoint.counts.pending = 5;
  f.result.counts = structuredClone(f.snapshot.checkpoint.counts);
  for (const value of [f.result.activeRepairProgress.before, f.result.activeRepairProgress.after]) {
    value.total = 2; value.pending = 1; value.bulkPassComplete = false; value.coverageComplete = false;
  }
  const outcome = await continueBackfill({ ...f.options, context: f.context, result: f.result });
  assert.equal(outcome.reason, 'no_first_pass_progress');
  assert.deepEqual(f.requests.map(request => request.method), ['GET']);
});

test('older results without scoped evidence retain the conservative full-archive rule', async () => {
  const f = fixture();
  const { activeRepairProgress: _omitted, ...legacy } = f.result;
  const outcome = await continueBackfill({ ...f.options, context: f.context, result: legacy });
  assert.equal(outcome.reason, 'no_first_pass_progress');
  assert.deepEqual(f.requests.map(request => request.method), ['GET']);
});

test('active progress rejects altered counts, timestamps, arithmetic and inconsistent flags before dispatch', async () => {
  for (const scenario of ['time', 'future', 'after', 'negative', 'noninteger', 'wrong-total', 'arithmetic', 'flag', 'oversized-delta']) {
    const f = fixture(); const proof = f.result.activeRepairProgress;
    if (scenario === 'time') proof.asOf = '2026-10-21T08:00:00.000Z';
    if (scenario === 'future') { proof.asOf = '2026-10-23T08:00:00.000Z'; f.snapshot.checkpoint.updatedAt = proof.asOf; }
    if (scenario === 'after') proof.after.pending = 1;
    if (scenario === 'negative') proof.before.clean = -1;
    if (scenario === 'noninteger') proof.before.refreshPending = 0.5;
    if (scenario === 'wrong-total') proof.before.total = 2;
    if (scenario === 'arithmetic') proof.before.saved = 0;
    if (scenario === 'flag') f.result.reconciliationAdvanced = false;
    if (scenario === 'oversized-delta') proof.before.sourceGaps = 2;
    await assert.rejects(continueBackfill({ ...f.options, context: f.context, result: f.result }), /repair_progress/, scenario);
    assert.equal(f.requests.filter(request => request.method === 'POST').length, 0, scenario);
  }
});

test('the active progress route preserves source cooldown and chain cap stops', async () => {
  for (const scenario of ['pause', 'cap']) {
    const f = fixture();
    if (scenario === 'pause') {
      const until = new Date(NOW + 60_000).toISOString();
      f.snapshot.checkpoint.sourceRetryAt = until; f.result.sourceRetryAt = until;
    } else {
      f.context.position = 12; f.context.parentRunId = '111'; f.context.runId = '112'; f.options.env.GITHUB_RUN_ID = '112';
    }
    const outcome = await continueBackfill({ ...f.options, context: f.context, result: f.result });
    assert.equal(outcome.reason, scenario === 'pause' ? 'source_paused' : 'chain_limit');
    assert.deepEqual(f.requests.map(request => request.method), ['GET']);
  }
});
