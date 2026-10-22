import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareBackfill, continueBackfill } from '../scripts/backfill-control.ts';

const START = Date.parse('2026-10-22T08:00:00.000Z');
const REPOSITORY = 'Vasuki8/mutual-fund-dashboard';
const PATH = '.github/workflows/github-history.yml';
const iso = (value: number) => new Date(value).toISOString();
const counts = { total: 20, attempted: 10, saved: 10, clean: 10, qualityIssues: 0,
  sourceGaps: 0, pending: 10, refreshPending: 0, bulkPassComplete: false, coverageComplete: false };
const ref = (kind: string) => ({ id: 1, releaseTag: 'fundscope-mfapi-v2-data-000001',
  name: `${kind}-${'a'.repeat(64)}.json.gz`, sha256: 'a'.repeat(64), bytes: 10, expandedBytes: 20,
  url: `https://github.com/${REPOSITORY}/releases/download/fundscope-mfapi-v2-data-000001/${kind}-${'a'.repeat(64)}.json.gz` });
function snapshot(sequence = 7, updatedAt = START - 16 * 60_000) {
  return { catalogue: { version: 1, fetchedAt: iso(updatedAt), entries: [], warnings: [] },
    checkpoint: { version: 2, source: 'mfapi.in', sequence, updatedAt: iso(updatedAt), counts: { ...counts },
      catalogue: ref('catalogue'), shards: { '3125': ref('history-3125') },
      lastCatalogueError: null, sourceRetryAt: null } };
}
function run(id: number, position = 1, rootId = 100) {
  return { id, workflow_id: 44, path: PATH, head_branch: 'main', repository: { full_name: REPOSITORY },
    event: 'workflow_dispatch', status: id === 100 ? 'in_progress' : 'completed',
    conclusion: id === 100 ? null : 'success', run_attempt: 1, created_at: iso(START),
    display_title: `FundScope archive · ${rootId} · ${position}/12` };
}
function fixture() {
  let time = START;
  let saved: ReturnType<typeof snapshot> | null = snapshot();
  const env: Record<string, string> = { GITHUB_REPOSITORY: REPOSITORY, GITHUB_REF: 'refs/heads/main',
    FUNDSCOPE_GITHUB_ARCHIVE_ENABLED: 'true', GITHUB_TOKEN: 'fixture-token', GITHUB_RUN_ID: '100',
    GITHUB_RUN_ATTEMPT: '1', BACKFILL_INPUTS: '{}' };
  const runs = new Map([[100, run(100)]]);
  const requests: { url: string; method: string; body: unknown }[] = [];
  const waits: number[] = [];
  let reads = 0;
  let afterRead: (() => void) | undefined;
  let publication: unknown;
  let publicationFailures = 0;
  let dispatchStatus = 200;
  let loseDispatch = false;
  const publicRef = (value: ReturnType<typeof ref>) => ({ path: `archive/${value.name}`,
    sha256: value.sha256, bytes: value.bytes, expandedBytes: value.expandedBytes });
  const live = () => ({ version: 2, source: 'mfapi.in', status: 'ready', collectionEnabled: true, sequence: saved!.checkpoint.sequence,
    checkpointAt: saved!.checkpoint.updatedAt, counts: saved!.checkpoint.counts,
    catalogue: publicRef(saved!.checkpoint.catalogue),
    shards: Object.fromEntries(Object.entries(saved!.checkpoint.shards).map(([key, value]) => [key, publicRef(value)])) });
  const fetcher = async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(String(input)); const method = init.method ?? 'GET';
    requests.push({ url: url.href, method, body: init.body ? JSON.parse(String(init.body)) : undefined });
    assert.equal(init.redirect, 'error'); assert.equal(init.credentials, 'omit');
    assert.ok(init.signal, 'all controller requests must have a timeout');
    if (url.hostname === 'api.github.com') {
      const headers = new Headers(init.headers);
      assert.equal(headers.get('Authorization'), 'Bearer fixture-token');
      assert.equal(headers.get('X-GitHub-Api-Version'), '2022-11-28');
      if (method === 'POST') {
        if (loseDispatch) throw new Error('lost response after dispatch');
        return dispatchStatus === 204 ? new Response(null, { status: 204 })
          : Response.json({ workflow_run_id: 102, html_url: 'https://github.com/example/run/102' }, { status: dispatchStatus });
      }
      const metadata = runs.get(Number(url.pathname.split('/').at(-1)));
      return Response.json(metadata ?? {}, { status: metadata ? 200 : 404 });
    }
    assert.equal(url.origin, 'https://vasuki8.github.io');
    assert.equal(url.pathname, '/mutual-fund-dashboard/archive/manifest.json');
    assert.ok(url.search, 'publication requests must bypass caches');
    assert.equal(new Headers(init.headers).has('Authorization'), false);
    if (publicationFailures-- > 0) return new Response(null, { status: 404 });
    return Response.json(publication ?? live());
  };
  const options = { env, fetch: fetcher, now: () => time, sleep: async (ms: number) => { waits.push(ms); time += ms; },
    store: { loadSnapshot: async () => { reads++; const result = structuredClone(saved); afterRead?.(); return result; } } };
  const context = () => ({ rootRunId: '100', parentRunId: null, runId: env.GITHUB_RUN_ID,
    runAttempt: Number(env.GITHUB_RUN_ATTEMPT), position: 1, deadline: iso(START + 4 * 3600_000), startingSequence: 6 });
  const result = () => ({ changed: true, sequence: saved!.checkpoint.sequence, attempted: 5, firstAttempted: 5,
    historiesAdded: 5, deferred: 0, counts: structuredClone(saved!.checkpoint.counts),
    sourceRetryAt: saved!.checkpoint.sourceRetryAt, lastCatalogueError: saved!.checkpoint.lastCatalogueError });
  return { options, env, runs, requests, waits, context, result, live,
    get saved() { return saved; }, set saved(value) { saved = value; },
    get time() { return time; }, set time(value) { time = value; }, get reads() { return reads; },
    set afterRead(value: (() => void) | undefined) { afterRead = value; },
    set publication(value: unknown) { publication = value; }, set publicationFailures(value: number) { publicationFailures = value; },
    set dispatchStatus(value: number) { dispatchStatus = value; }, set loseDispatch(value: boolean) { loseDispatch = value; } };
}
function child(value: ReturnType<typeof fixture>, position = 2) {
  value.env.GITHUB_RUN_ID = '101';
  value.env.BACKFILL_INPUTS = JSON.stringify({ root_run_id: '100', parent_run_id: '100', chain_position: String(position), expected_sequence: '7' });
  value.runs.set(100, { ...run(100), status: 'completed', conclusion: 'success' });
  value.runs.set(101, { ...run(101, position), status: 'in_progress', conclusion: null });
}

test('an enabled root is fenced to its verified checkpoint and four-hour window', async () => {
  const value = fixture();
  const prepared = await prepareBackfill(value.options);
  assert.equal(prepared.collect, true);
  assert.equal(prepared.expectedSequence, 7);
  assert.deepEqual(prepared.context, { ...value.context(), startingSequence: 7 });
  assert.equal(value.reads, 2);
});

test('disabled collection avoids credentials, metadata reads and checkpoint reads', async () => {
  const value = fixture(); value.env.FUNDSCOPE_GITHUB_ARCHIVE_ENABLED = 'false'; value.env.GITHUB_TOKEN = '';
  assert.equal((await prepareBackfill(value.options)).collect, false);
  assert.equal(value.requests.length, 0); assert.equal(value.reads, 0);
});

test('root pacing waits for fifteen minutes after the latest checkpoint before rechecking it', async () => {
  const value = fixture(); value.saved!.checkpoint.updatedAt = iso(START - 5 * 60_000);
  assert.equal((await prepareBackfill(value.options)).collect, true);
  assert.equal(value.time, START + 10 * 60_000); assert.equal(value.waits.reduce((a, b) => a + b, 0), 10 * 60_000);
  assert.equal(value.reads, 2);
});

test('a changed checkpoint during pacing prevents collection instead of silently accepting a new starting point', async () => {
  const value = fixture(); value.saved!.checkpoint.updatedAt = iso(START - 5 * 60_000);
  value.afterRead = () => { value.saved!.checkpoint.sequence = 8; };
  const prepared = await prepareBackfill(value.options);
  assert.equal(prepared.collect, false); assert.match(prepared.reason, /checkpoint/);
});

test('future source pauses and insufficient window after pacing skip collection without waiting', async () => {
  for (const reason of ['pause', 'window']) {
    const value = fixture();
    if (reason === 'pause') value.saved!.checkpoint.sourceRetryAt = iso(START + 60_000);
    else { value.runs.get(100)!.created_at = iso(START - 3 * 3600_000 - 45 * 60_000); value.saved!.checkpoint.updatedAt = iso(START); }
    assert.equal((await prepareBackfill(value.options)).collect, false);
    assert.deepEqual(value.waits, []);
  }
});

test('a valid child verifies its successful parent, root lineage and exact expected sequence', async () => {
  const value = fixture(); child(value);
  const prepared = await prepareBackfill(value.options);
  assert.equal(prepared.collect, true); assert.equal(prepared.context!.position, 2);
  assert.equal(prepared.context!.parentRunId, '100');
  assert.ok(value.requests.some(request => request.url.endsWith('/actions/runs/100')));
});

test('a third tranche retains the original root deadline and dispatches through its distinct parent lineage', async () => {
  const value = fixture(); value.env.GITHUB_RUN_ID = '102';
  value.env.BACKFILL_INPUTS = JSON.stringify({ root_run_id: '100', parent_run_id: '101', chain_position: '3', expected_sequence: '7' });
  value.runs.set(100, { ...run(100), status: 'completed', conclusion: 'success', created_at: iso(START - 45 * 60_000) });
  value.runs.set(101, { ...run(101, 2), created_at: iso(START - 20 * 60_000) });
  value.runs.set(102, { ...run(102, 3), status: 'in_progress', conclusion: null });
  const prepared = await prepareBackfill(value.options);
  assert.equal(prepared.collect, true);
  assert.equal(prepared.context!.deadline, iso(START - 45 * 60_000 + 4 * 3600_000));
  assert.equal(prepared.context!.parentRunId, '101'); assert.equal(prepared.context!.position, 3);
  value.saved!.checkpoint.sequence = 8; value.saved!.checkpoint.updatedAt = iso(START);
  value.saved!.checkpoint.counts = { ...counts, attempted: 15, saved: 15, clean: 15, pending: 5 };
  assert.equal((await continueBackfill({ ...value.options, context: prepared.context, result: value.result() })).dispatched, true);
  const posts = value.requests.filter(request => request.method === 'POST'); assert.equal(posts.length, 1);
  assert.deepEqual(posts[0].body, { ref: 'main', return_run_details: true,
    inputs: { root_run_id: '100', parent_run_id: '102', chain_position: '4', expected_sequence: '8' } });
});

test('a stale child checkpoint skips collection and never waits', async () => {
  const value = fixture(); child(value); value.saved!.checkpoint.sequence = 8;
  const prepared = await prepareBackfill(value.options);
  assert.equal(prepared.collect, false); assert.match(prepared.reason, /sequence|checkpoint/); assert.deepEqual(value.waits, []);
});

test('partial, malformed, out-of-range and fabricated continuation inputs fail closed', async () => {
  for (const patch of [{ parent_run_id: '' }, { chain_position: '13' }, { chain_position: '1' },
    { chain_position: '2x' }, { expected_sequence: '0' }, { root_run_id: '101' }]) {
    const value = fixture(); child(value);
    value.env.BACKFILL_INPUTS = JSON.stringify({ ...JSON.parse(value.env.BACKFILL_INPUTS), ...patch });
    await assert.rejects(prepareBackfill(value.options));
    assert.equal(value.reads, 0);
  }
});

test('wrong parent conclusion, attempt, workflow, repository, branch or run-name rejects lineage', async () => {
  for (const patch of [{ conclusion: 'failure' }, { status: 'in_progress', conclusion: null }, { run_attempt: 2 },
    { workflow_id: 45 }, { path: '.github/workflows/other.yml' }, { repository: { full_name: 'other/repo' } },
    { head_branch: 'feature' }, { display_title: 'FundScope archive · 100 · 8/12' }]) {
    const value = fixture(); child(value); Object.assign(value.runs.get(100)!, patch);
    await assert.rejects(prepareBackfill(value.options));
    assert.equal(value.reads, 0);
  }
});

test('current metadata must match its environment and intended workflow', async () => {
  for (const patch of [{ id: 900 }, { run_attempt: 2 }, { event: 'pull_request' }, { head_branch: 'feature' },
    { path: '.github/workflows/other.yml' }, { status: 'completed', conclusion: 'success' }]) {
    const value = fixture(); Object.assign(value.runs.get(100)!, patch);
    await assert.rejects(prepareBackfill(value.options));
  }
});

test('null input context is accepted for scheduled roots but rejected for manual dispatch', async () => {
  const scheduled = fixture(); scheduled.env.BACKFILL_INPUTS = 'null'; scheduled.runs.get(100)!.event = 'schedule';
  assert.equal((await prepareBackfill(scheduled.options)).collect, true);
  const manual = fixture(); manual.env.BACKFILL_INPUTS = 'null';
  await assert.rejects(prepareBackfill(manual.options));
});

test('a root without a checkpoint uses an explicit null starting sequence', async () => {
  const value = fixture(); value.saved = null;
  const prepared = await prepareBackfill(value.options);
  assert.equal(prepared.collect, true); assert.equal(prepared.expectedSequence, null);
  assert.equal(prepared.context!.startingSequence, null);
});

test('a verified published advance dispatches exactly one bounded successor with fixed main and lineage', async () => {
  const value = fixture();
  const continued = await continueBackfill({ ...value.options, context: value.context(), result: value.result() });
  assert.equal(continued.dispatched, true); assert.equal(continued.childRunId, 102);
  const post = value.requests.filter(request => request.method === 'POST'); assert.equal(post.length, 1);
  assert.ok(post[0].url.endsWith('/actions/workflows/github-history.yml/dispatches'));
  assert.deepEqual(post[0].body, { ref: 'main', return_run_details: true,
    inputs: { root_run_id: '100', parent_run_id: '100', chain_position: '2', expected_sequence: '7' } });
  assert.ok(value.requests[0].url.startsWith('https://vasuki8.github.io/'));
});

test('publication verification retries bounded GETs and never sends GitHub credentials to Pages', async () => {
  const value = fixture(); value.publicationFailures = 2;
  assert.equal((await continueBackfill({ ...value.options, context: value.context(), result: value.result() })).dispatched, true);
  assert.deepEqual(value.waits, [10_000, 10_000]);
  assert.equal(value.requests.filter(request => request.method === 'GET').length, 3);
});

test('an unmatched published sequence, timestamp, counters, catalogue, shard or enable state prevents dispatch after six checks', async () => {
  for (const changed of ['sequence', 'checkpointAt', 'counts', 'catalogue', 'shards', 'collectionEnabled']) {
    const value = fixture(); const live = structuredClone(value.live());
    if (changed === 'sequence') live.sequence--;
    if (changed === 'checkpointAt') live.checkpointAt = iso(START);
    if (changed === 'counts') live.counts.saved--;
    if (changed === 'catalogue') live.catalogue.sha256 = 'b'.repeat(64);
    if (changed === 'shards') live.shards['9999'] = live.shards['3125'];
    if (changed === 'collectionEnabled') live.collectionEnabled = false;
    value.publication = live;
    await assert.rejects(continueBackfill({ ...value.options, context: value.context(), result: value.result() }), /publish/);
    assert.equal(value.requests.length, 6); assert.deepEqual(value.waits, Array(5).fill(10_000));
  }
});

test('result and checkpoint disagreements stop before publication or dispatch', async () => {
  for (const patch of [{ sequence: 6 }, { counts: { ...counts, saved: 9 } }, { sourceRetryAt: iso(START + 60_000) },
    { lastCatalogueError: 'source_unavailable' }, { firstAttempted: 6 }, { historiesAdded: -1 }]) {
    const value = fixture();
    await assert.rejects(continueBackfill({ ...value.options, context: value.context(), result: { ...value.result(), ...patch } }));
    assert.equal(value.requests.length, 0);
  }
});

test('chain cap, recovery attempt, no progress, no pending work, pause and window limit all verify publication then stop', async () => {
  for (const stop of ['cap', 'recovery', 'first', 'saved', 'pending', 'pause', 'catalogue', 'window', 'unchanged']) {
    const value = fixture(); const context = value.context(); const result = value.result();
    if (stop === 'cap') { context.position = 12; context.parentRunId = '111'; context.runId = '112'; value.env.GITHUB_RUN_ID = '112'; }
    if (stop === 'recovery') { context.runAttempt = 2; value.env.GITHUB_RUN_ATTEMPT = '2'; }
    if (stop === 'first') result.firstAttempted = 0;
    if (stop === 'saved') result.historiesAdded = 0;
    if (stop === 'pending') { value.saved!.checkpoint.counts.pending = 0; result.counts.pending = 0; }
    if (stop === 'pause') { value.saved!.checkpoint.sourceRetryAt = iso(START + 60_000); result.sourceRetryAt = value.saved!.checkpoint.sourceRetryAt; }
    if (stop === 'catalogue') { value.saved!.checkpoint.lastCatalogueError = 'source_unavailable'; result.lastCatalogueError = 'source_unavailable'; }
    if (stop === 'window') { context.deadline = iso(START + 20 * 60_000); value.saved!.checkpoint.updatedAt = iso(START); }
    if (stop === 'unchanged') { result.changed = false; result.attempted = 0; result.firstAttempted = 0; result.historiesAdded = 0; context.startingSequence = 7; }
    const continued = await continueBackfill({ ...value.options, context, result });
    assert.equal(continued.dispatched, false, stop);
    assert.equal(value.requests.length, 1, stop); assert.equal(value.requests[0].method, 'GET');
  }
});

test('a continuation-only retry verifies the original publication but cannot dispatch another child', async () => {
  const value = fixture(); const context = value.context(); value.env.GITHUB_RUN_ATTEMPT = '2';
  const continued = await continueBackfill({ ...value.options, context, result: value.result() });
  assert.equal(continued.dispatched, false); assert.equal(value.requests.length, 1);
  assert.equal(value.requests[0].method, 'GET');
});

test('an uncertain dispatch is never retried, while legacy 204 success is accepted', async () => {
  const uncertain = fixture(); uncertain.loseDispatch = true;
  await assert.rejects(continueBackfill({ ...uncertain.options, context: uncertain.context(), result: uncertain.result() }), /dispatch/);
  assert.equal(uncertain.requests.filter(request => request.method === 'POST').length, 1);
  const legacy = fixture(); legacy.dispatchStatus = 204;
  assert.equal((await continueBackfill({ ...legacy.options, context: legacy.context(), result: legacy.result() })).dispatched, true);
});
