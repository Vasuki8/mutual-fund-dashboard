import assert from 'node:assert/strict';
import test from 'node:test';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { runTranche as runCollector, catalogueSlot, selectWork, createSource, collectionEnabled, classifyInvalidHistory, hasVerifiedReconciliationProgress } from '../scripts/github-history-v2.ts';
import { calculateCounts, validateCheckpoint, validateHistoryShard,
  type ArchiveAssetRef, type ArchiveCheckpoint, type ArchiveSnapshot, type ArchiveSchemeState, type HistoryShard } from '../scripts/archive-model.ts';
import type { ArchiveStore } from '../scripts/archive-store.ts';
import { continueBackfill } from '../scripts/backfill-control.ts';

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

test('first-pass continuation counts only saved schemes still eligible after UTC midnight', async () => {
  for (const agesOut of [true, false]) {
    const store = new MemoryStore();
    const start = Date.parse('2026-10-21T23:59:59.000Z'); let time = start;
    const sourceCalls: string[] = [];
    const sourceDate = agesOut ? '21-09-2026' : '22-09-2026';
    const result = await runTranche({ store, now: () => time, minCatalogueSize: 1, maxSchemes: 1, activeRepairOnly: true,
      source: async path => {
        sourceCalls.push(path);
        if (path === '/mf/latest') return [...rawCatalogue([100601], sourceDate), ...rawCatalogue([CODE])];
        assert.equal(path, '/mf/100601'); time = Date.parse('2026-10-22T00:00:01.000Z');
        return history(100601, [{ date: sourceDate, nav: '11.00' }, { date: '20-09-2026', nav: '10.00' }]);
      } });
    assert.deepEqual(sourceCalls, ['/mf/latest', '/mf/100601']);
    assert.equal(result.firstAttempted, 1); assert.equal(result.historiesAdded, 1);
    assert.equal(result.activeRepairProgress!.after.pending, 1);
    if (agesOut) assert.deepEqual(result.activeRepairProgress!.before, result.activeRepairProgress!.after);
    const checkpoint = store.snapshot!.checkpoint; const requests: string[] = [];
    const publicRef = (ref: ArchiveAssetRef) => ({ path: `archive/${ref.name}`, sha256: ref.sha256,
      bytes: ref.bytes, expandedBytes: ref.expandedBytes });
    const outcome = await continueBackfill({ store, result, now: () => time,
      context: { rootRunId: '100', parentRunId: null, runId: '100', runAttempt: 1, position: 1,
        startingSequence: null, deadline: new Date(start + 4 * 3600_000).toISOString() },
      env: { GITHUB_REPOSITORY: 'Vasuki8/mutual-fund-dashboard', GITHUB_REF: 'refs/heads/main',
        FUNDSCOPE_GITHUB_ARCHIVE_ENABLED: 'true', GITHUB_TOKEN: 'fixture-token', GITHUB_RUN_ID: '100', GITHUB_RUN_ATTEMPT: '1' },
      fetch: async (_input, init) => {
        requests.push(init?.method ?? 'GET');
        return Response.json(init?.method === 'POST' ? { workflow_run_id: 102 } : {
          version: 2, source: 'mfapi.in', status: 'ready', collectionEnabled: true,
          sequence: checkpoint.sequence, checkpointAt: checkpoint.updatedAt, counts: checkpoint.counts,
          catalogue: publicRef(checkpoint.catalogue),
          shards: Object.fromEntries(Object.entries(checkpoint.shards).map(([key, ref]) => [key, publicRef(ref)])),
        });
      } });
    assert.equal(outcome.reason, agesOut ? 'no_first_pass_progress' : 'dispatched');
    assert.deepEqual(requests, agesOut ? ['GET'] : ['GET', 'POST']);
    assert.equal(store.snapshot!.checkpoint.states[100601].observationCount, 2);
    assert.equal(store.snapshot!.checkpoint.states[CODE].attempts, 0);
  }
});

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

test('obsolete MFAPI zero-only histories remain explicitly unavailable and recheck weekly', async () => {
  const store = new MemoryStore();
  const invalid = history(CODE, Array.from({length:4}, (_, i) => ({
    date: `${String(21-i).padStart(2,'0')}-10-2026`, nav:'0.00000',
  })));
  const result = await runTranche({ store, now:()=>START, minCatalogueSize:1,
    source: async path=>path==='/mf/latest'?rawCatalogue([CODE], '21-10-2006'):invalid });
  assert.equal(result.historiesAdded,0);
  assert.equal(result.counts!.saved,0);
  assert.equal(result.counts!.sourceGaps,1);
  assert.equal(result.counts!.pending,0);
  const state=store.snapshot!.checkpoint.states[CODE];
  assert.equal(state.status,'source-error');
  assert.equal(state.lastError,'source_history_zero_nav_only');
  assert.equal(state.observationCount,0);
  assert.equal(state.nextAttemptAt,new Date(START+7*86400_000).toISOString());
  assert.equal(selectWork(store.snapshot!.catalogue,store.snapshot!.checkpoint.states,START+86400_000).length,0,
    'Do not repeatedly request confirmed all-zero historical NAVs every 15 minutes.');
  assert.equal(selectWork(store.snapshot!.catalogue,store.snapshot!.checkpoint.states,START+7*86400_000).length,1,
    'Retest on a bounded cadence in case the provider fixes its history later.');
});

for (const condition of ['empty', 'zero-only'] as const) {
  test(`recent ${condition} histories use bounded exponential backoff and can recover`, async () => {
    const store = new MemoryStore(); let time = START;
    const unavailable = history(CODE, condition === 'empty' ? [] : [{ date: '21-10-2026', nav: '0.00000' }]);
    const source = async (path: string) => path === '/mf/latest' ? rawCatalogue() : unavailable;
    await runTranche({ store, now: () => time, minCatalogueSize: 1, source });
    let state = store.snapshot!.checkpoint.states[CODE];
    assert.equal(state.nextAttemptAt, new Date(time + 15 * 60_000).toISOString());
    assert.equal(state.observationCount, 0);
    assert.equal(store.snapshot!.checkpoint.counts.coverageComplete, false);
    assert.equal(selectWork(store.snapshot!.catalogue, store.snapshot!.checkpoint.states, time + 14 * 60_000).length, 0);

    time += 15 * 60_000;
    await runTranche({ store, now: () => time, source });
    state = store.snapshot!.checkpoint.states[CODE];
    assert.equal(state.failures, 2);
    assert.equal(state.nextAttemptAt, new Date(time + 30 * 60_000).toISOString());

    time += 30 * 60_000;
    const recovered = await runTranche({ store, now: () => time, source: async () => history() });
    assert.equal(recovered.historiesAdded, 1);
    assert.equal(recovered.counts!.sourceGaps, 0);
    assert.equal(store.snapshot!.checkpoint.states[CODE].nextAttemptAt, null);
    assert.equal(store.snapshot!.checkpoint.states[CODE].observationCount, 2);
  });
}

test('saved weekly empty-history retries recover when the catalogue becomes recent and normal backoff is due', async () => {
  const store = new MemoryStore();
  await runTranche({ store, now: () => START, minCatalogueSize: 1,
    source: async path => path === '/mf/latest' ? rawCatalogue([CODE], '21-10-2006') : history(CODE, []) });
  const retryAt = new Date(START + 7 * 86400_000).toISOString();
  assert.equal(store.snapshot!.checkpoint.states[CODE].nextAttemptAt, retryAt);
  const requests: string[] = [];
  const recovered = await runTranche({ store, now: () => START + 12 * 3600_000, minCatalogueSize: 1,
    source: async path => { requests.push(path); return path === '/mf/latest' ? rawCatalogue() : history(); } });
  assert.deepEqual(requests, ['/mf/latest', `/mf/${CODE}`]);
  assert.equal(recovered.historiesAdded, 1);
  assert.equal(store.snapshot!.checkpoint.states[CODE].nextAttemptAt, null);
  assert.equal(store.snapshot!.checkpoint.states[CODE].attempts, 2);
});

test('recognized weekly source gaps honor normal backoff while other errors and obsolete gaps retain their retry', () => {
  const entry = { ...rawCatalogue()[0], latestDate: '2026-10-21', current: true };
  const catalogue = { version: 1 as const, fetchedAt: new Date(START).toISOString(), warnings: [], entries: [entry] };
  const state: ArchiveSchemeState = {
    code: CODE, status: 'source-error', attempts: 1, failures: 1, lastAttemptAt: new Date(START).toISOString(),
    nextAttemptAt: new Date(START + 7 * 86400_000).toISOString(), historyFetchedAt: null,
    coverageStart: null, coverageEnd: null, latestNav: null, observationCount: 0,
    quality: false, warnings: [], lastError: 'source_history_empty',
  };
  for (const lastError of ['source_history_empty', 'source_history_zero_nav_only']) {
    const states = { [CODE]: { ...state, lastError } };
    assert.equal(selectWork(catalogue, states, START + 14 * 60_000).length, 0);
    assert.equal(selectWork(catalogue, states, START + 15 * 60_000).length, 1);
    states[CODE].attempts = 20; states[CODE].failures = 20;
    assert.equal(selectWork(catalogue, states, START + 23 * 3600_000).length, 0);
    assert.equal(selectWork(catalogue, states, START + 24 * 3600_000).length, 1);
    states[CODE].attempts = 1; states[CODE].failures = 1;
    assert.equal(selectWork({ ...catalogue, entries: [{ ...entry, latestDate: '2006-10-21' }] }, states,
      START + 24 * 3600_000).length, 0);
  }
  for (const lastError of ['source_transport', 'source_history_invalid', 'source_http_429', 'source_http_503']) {
    assert.equal(selectWork(catalogue, { [CODE]: { ...state, lastError } }, START + 24 * 3600_000).length, 0);
  }
});

test('source-wide cooldown still blocks recognized weekly source gaps whose normal backoff has expired', async () => {
  const store = new MemoryStore();
  await runTranche({ store, now: () => START, minCatalogueSize: 1,
    source: async path => path === '/mf/latest' ? rawCatalogue() : history(CODE, []) });
  store.snapshot!.checkpoint.states[CODE].nextAttemptAt = new Date(START + 7 * 86400_000).toISOString();
  store.snapshot!.checkpoint.sourceRetryAt = new Date(START + 3600_000).toISOString();
  const snapshot = structuredClone(store.snapshot);
  const result = await runTranche({ store, now: () => START + 30 * 60_000,
    source: async () => { throw new Error('No requests are allowed during the saved source-wide cooldown.'); } });
  assert.equal(result.attempted, 0);
  assert.deepEqual(store.snapshot, snapshot);
});

test('payload diagnostics are narrow safe codes, not untrusted source strings or zero-valued assets',()=>{
  const good=history();
  assert.deepEqual(classifyInvalidHistory(history(CODE,[{date:'21-10-2026',nav:'0.00000'}])),
    {code:'source_history_zero_nav_only',recheckMs:7*86400_000});
  assert.deepEqual(classifyInvalidHistory({...good,data:[]}),
    {code:'source_history_empty',recheckMs:7*86400_000});
  assert.equal(classifyInvalidHistory({...good,status:'FAILED;token=secret'}).code,'source_history_unsuccessful');
  assert.equal(classifyInvalidHistory(history(CODE,[{date:'21-10-2026',nav:'10.00'},{date:'20-10-2026',nav:'0.00000'}])).code,
    'source_history_invalid', 'Do not classify partially usable histories as entirely empty.');
  assert.equal(classifyInvalidHistory({data:[{nav:'0.00000'}]}).code,'source_history_unsuccessful');
  assert.equal(classifyInvalidHistory(null).code,'source_history_invalid');
  assert.equal(classifyInvalidHistory({...good,data:[{date:'bad',nav:'zero'}]}).code,'source_history_invalid');
  assert.equal(classifyInvalidHistory({...good,data:[{date:'bad',nav:'10.00'}]}).code,'source_history_invalid');
});

test('recent source discrepancies take precedence over obsolete historical date gaps',()=>{
  const at=Date.parse('2026-10-23T12:00:00.000Z');
  const make=(code:number,latestDate:string,coverageEnd:string,quality:boolean,hasSaved:boolean)=>{
    const state: ArchiveSchemeState={code,status:quality?'quality':'source-error',attempts:2,failures:2,
      lastAttemptAt:'2026-10-22T12:00:00.000Z',nextAttemptAt:'2026-10-23T10:00:00.000Z',
      historyFetchedAt:hasSaved?'2026-10-22T12:00:00.000Z':null,
      coverageStart:hasSaved?'2006-01-01':null,coverageEnd:hasSaved?coverageEnd:null,
      latestNav:hasSaved?'10.00':null,observationCount:hasSaved?10:0,
      quality,warnings:quality?['Invalid NAV observations were excluded (1).']:[],lastError:quality?null:'source_history_invalid'};
    return [ {schemeCode:code,schemeName:'Synthetic '+code,latestDate,nav:'10.00',current:true},state ] as const;
  };
  const old=make(10001,'2007-04-13','2007-04-12',false,true);
  const active=make(10002,'2026-10-22','2026-10-21',true,true);
  const missing=make(10003,'2026-10-20','',false,false);
  const quality=make(10004,'2022-05-10','2022-05-10',true,true);
  const entries=[old,active,missing,quality];
  const catalogue={version:1 as const,fetchedAt:'2026-10-23T10:00:00.000Z',
    warnings:[],entries:entries.map(x=>x[0])};
  const states=Object.fromEntries(entries.map(([item,state])=>[item.schemeCode,state]));
  assert.deepEqual(selectWork(catalogue,states,at,4,16).map(x=>x.schemeCode),[10003,10002,10004,10001],
    'A due missing recent history precedes saved latest-date lag; legacy records remain eligible.');
  assert.equal(selectWork(catalogue,states,at,1,16)[0].schemeCode,10003);
});

test('due recent missing histories are selected before 40 routine lag refreshes even with strict shard limits',()=>{
  const now=Date.parse('2026-10-26T17:00:00.000Z');
  const lagging=Array.from({length:40},(_,i)=>{
    const code=130000+32*i;
    const entry={schemeCode:code,schemeName:'Current lag '+code,
      latestDate:'2026-10-26',nav:'12.00',current:true};
    const state:ArchiveSchemeState={
      code,status:'clean',attempts:4,failures:0,
      lastAttemptAt:'2026-10-20T12:00:00.000Z',nextAttemptAt:null,
      historyFetchedAt:'2026-10-20T12:00:00.000Z',
      coverageStart:'2024-01-01',coverageEnd:'2026-10-25',
      latestNav:'11.95',observationCount:500,quality:false,warnings:[],lastError:null,
    };
    return [entry,state] as const;
  });
  const code=154804;
  const missing:ArchiveSchemeState={
    code,status:'source-error',attempts:2,failures:1,
    lastAttemptAt:'2026-10-26T16:00:00.000Z',
    nextAttemptAt:'2026-10-26T16:15:00.000Z',
    historyFetchedAt:null,coverageStart:null,coverageEnd:null,latestNav:null,
    observationCount:0,quality:false,warnings:[],lastError:'source_history_empty',
  };
  const catalogue={version:1 as const,fetchedAt:new Date(now).toISOString(),warnings:[],
    entries:[...lagging.map(([entry])=>entry),
      {schemeCode:code,schemeName:'Recent no history',latestDate:'2026-10-26',nav:'10.50',current:true}]};
  const states:Record<string,ArchiveSchemeState>=Object.fromEntries([...lagging.map(([entry,state])=>[
    entry.schemeCode,state] as const),[code,missing]]);
  const selected=selectWork(catalogue,states,now,8,8);
  assert.equal(selected[0].schemeCode,code,
    'Recent missing history must not be starved by older last-attempt timestamps of routine lag tasks.');
  assert.equal(selected.length,8);
  assert.equal(new Set(selected.map(entry=>Math.floor(entry.schemeCode/32))).size,8,
    'The original per-run shard limit still holds.');
  // A not-yet-due source gap must never bypass retry backoff just because it is high priority.
  const waiting:ArchiveSchemeState={...missing,lastAttemptAt:new Date(now).toISOString(),
    nextAttemptAt:new Date(now+3600_000).toISOString()};
  const eligible=selectWork(catalogue,{...states,[code]:waiting},now,8,8);
  assert.ok(!eligible.some(entry=>entry.schemeCode===code),
    'Backoff remains binding for source-history-empty cases.');
  assert.equal(eligible[0].schemeCode,130000);
});

test('due clean date lag precedes saved quality and source-error retries after missing histories', () => {
  const now = Date.parse('2026-10-26T17:00:00.000Z');
  const codes = [130000, 130032, 130064, 130096, 130128];
  const catalogue = { version: 1 as const, fetchedAt: new Date(now).toISOString(), warnings: [],
    entries: codes.map(schemeCode => ({ schemeCode, schemeName: `Fund ${schemeCode}`,
      latestDate: '2026-10-26', nav: '11.00', current: true })) };
  const clean: ArchiveSchemeState = { code: 130064, status: 'clean', attempts: 2, failures: 0,
    lastAttemptAt: '2026-10-25T12:00:00.000Z', nextAttemptAt: null,
    historyFetchedAt: '2026-10-25T12:00:00.000Z', coverageStart: '2026-10-23',
    coverageEnd: '2026-10-24', latestNav: '10.90', observationCount: 2,
    quality: false, warnings: [], lastError: null };
  const retry = { ...clean, lastAttemptAt: '2026-10-24T12:00:00.000Z',
    historyFetchedAt: '2026-10-24T12:00:00.000Z', failures: 1,
    nextAttemptAt: '2026-10-24T12:15:00.000Z' };
  const states: Record<string, ArchiveSchemeState> = {
    130000: { ...retry, code: 130000, status: 'quality', quality: true,
      warnings: ['Invalid NAV observations were excluded (1).'] },
    130032: { ...retry, code: 130032, status: 'source-error', lastError: 'source_unavailable' },
    130064: clean,
    130096: { ...retry, code: 130096, status: 'source-error', lastError: 'source_history_empty',
      observationCount: 0, historyFetchedAt: null, coverageStart: null, coverageEnd: null, latestNav: null },
    130128: { ...clean, code: 130128, status: 'pending', attempts: 0, lastAttemptAt: null,
      observationCount: 0, historyFetchedAt: null, coverageStart: null, coverageEnd: null, latestNav: null },
  };
  assert.deepEqual(selectWork(catalogue, states, now).map(entry => entry.schemeCode),
    [130128, 130096, 130064, 130000, 130032],
    'Never-attempted and recent missing histories stay first; saved issue retries cannot preempt clean date lag.');
});

test('a clean refresh escapes 16 quality shards and earns continuation without clearing raw quality flags', async () => {
  const store = new MemoryStore(); let time = START;
  // Official roster members in sixteen different shards; CODE occupies a seventeenth.
  const qualityCodes = [100033, 100064, 100119, 100128, 100174, 100218, 100224, 100264,
    100291, 100320, 100352, 100384, 100417, 100470, 100480, 100519];
  const codes = [...qualityCodes, CODE];
  const response = (code: number, refreshed = false) => history(code, [
    ...(refreshed ? [{ date: '21-10-2026', nav: '11.00' }] : []),
    { date: '20-10-2026', nav: '11.00' },
    ...(code === CODE ? [] : [{ date: '19-10-2026', nav: '0.00000' }]),
    { date: '18-10-2026', nav: '10.90' },
  ]);
  await runTranche({ store, now: () => time, activeRepairOnly: true, minCatalogueSize: 1,
    source: async path => path === '/mf/latest' ? rawCatalogue(codes, '20-10-2026')
      : response(Number(path.split('/').at(-1))) });
  time += 60_000;
  await runTranche({ store, now: () => time, activeRepairOnly: true, minCatalogueSize: 1,
    source: async path => response(Number(path.split('/').at(-1))) });
  assert.equal(store.snapshot!.checkpoint.counts.saved, 17);
  const startingSequence = store.snapshot!.checkpoint.sequence;
  time = START + 12 * 3600_000;
  const requested: number[] = [];
  const result = await runTranche({ store, now: () => time, activeRepairOnly: true, minCatalogueSize: 1,
    source: async path => {
      if (path === '/mf/latest') return rawCatalogue(codes);
      const code = Number(path.split('/').at(-1)); requested.push(code); return response(code, true);
    } });
  assert.equal(result.attempted, 16);
  assert.equal(new Set(requested.map(code => Math.floor(code / 32))).size, 16);
  assert.equal(result.activeRepairProgress!.before.refreshPending, 17);
  assert.equal(result.activeRepairProgress!.after.refreshPending, 16,
    'One clean history must catch up even when sixteen older quality retries occupy distinct shards.');
  assert.equal(result.reconciliationAdvanced, true);
  assert.equal(result.firstAttempted, 0); assert.equal(result.historiesAdded, 0);
  const checkpoint = store.snapshot!.checkpoint;
  assert.equal(checkpoint.states[CODE].coverageEnd, '2026-10-21');
  assert.equal(checkpoint.counts.qualityIssues, 16);
  for (const code of qualityCodes) {
    const bucket = String(Math.floor(code / 32));
    const shard = await store.readShard(checkpoint.shards[bucket], bucket);
    assert.equal(shard.records[0].unresolved, true);
    assert.ok(shard.records[0].warnings.some(warning => warning.startsWith('Invalid NAV')));
  }
  const publicRef = (ref: ArchiveAssetRef) => ({ path: `archive/${ref.name}`, sha256: ref.sha256,
    bytes: ref.bytes, expandedBytes: ref.expandedBytes });
  const methods: string[] = [];
  const outcome = await continueBackfill({ store, result, now: () => time,
    context: { rootRunId: '100', parentRunId: null, runId: '100', runAttempt: 1, position: 1,
      startingSequence, deadline: new Date(time + 4 * 3600_000).toISOString() },
    env: { GITHUB_REPOSITORY: 'Vasuki8/mutual-fund-dashboard', GITHUB_REF: 'refs/heads/main',
      FUNDSCOPE_GITHUB_ARCHIVE_ENABLED: 'true', GITHUB_TOKEN: 'fixture-token', GITHUB_RUN_ID: '100', GITHUB_RUN_ATTEMPT: '1' },
    fetch: async (_input, init) => {
      methods.push(init?.method ?? 'GET');
      return Response.json(init?.method === 'POST' ? { workflow_run_id: 102 } : {
        version: 2, source: 'mfapi.in', status: 'ready', collectionEnabled: true,
        sequence: checkpoint.sequence, checkpointAt: checkpoint.updatedAt, counts: checkpoint.counts,
        catalogue: publicRef(checkpoint.catalogue),
        shards: Object.fromEntries(Object.entries(checkpoint.shards).map(([key, ref]) => [key, publicRef(ref)])),
      });
    } });
  assert.equal(outcome.reason, 'dispatched');
  assert.deepEqual(methods, ['GET', 'POST']);
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

test('post-first-pass repair progress means verified lower backlog or more clean histories',()=>{
  const previous={total:20,attempted:20,saved:18,clean:13,qualityIssues:5,
    sourceGaps:2,pending:0,refreshPending:10,bulkPassComplete:true,coverageComplete:false};
  assert.equal(hasVerifiedReconciliationProgress(null,previous),false);
  assert.equal(hasVerifiedReconciliationProgress(previous,{...previous}),false);
  assert.equal(hasVerifiedReconciliationProgress(previous,{...previous,refreshPending:9}),true);
  assert.equal(hasVerifiedReconciliationProgress(previous,{...previous,qualityIssues:4,clean:14}),true);
  assert.equal(hasVerifiedReconciliationProgress(previous,{...previous,sourceGaps:1,saved:19}),true);
  assert.equal(hasVerifiedReconciliationProgress(previous,{...previous,sourceGaps:3,refreshPending:11}),false);
  assert.equal(hasVerifiedReconciliationProgress(previous,{...previous,total:21,clean:14}),false,
    'Adding or deleting catalogue schemes is not by itself source-quality cleanup.');
});

test('active repair progress compares the same catalogue while excluded identities stay pending', async () => {
  const store = new MemoryStore();
  const excluded = [154858, 154859, 154860, 154861];
  await runTranche({ store, now: () => START, activeRepairOnly: true, minCatalogueSize: 1,
    source: async path => path === '/mf/latest' ? rawCatalogue([CODE, ...excluded], '20-10-2026')
      : history(CODE, [{ date: '20-10-2026', nav: '11.00' }, { date: '19-10-2026', nav: '10.00' }]) });
  const originalExcluded = excluded.map(code => structuredClone(store.snapshot!.checkpoint.states[code]));
  const later = Date.parse('2026-10-21T20:00:00.000Z');
  const requested: string[] = [];
  const result = await runTranche({ store, now: () => later, activeRepairOnly: true, minCatalogueSize: 1,
    source: async path => { requested.push(path); return path === '/mf/latest' ? rawCatalogue([CODE, ...excluded]) : history(); } });
  assert.equal(result.reconciliationAdvanced, true,
    'A verified active refresh counts even when the old global backlog omitted the new catalogue date lag.');
  assert.deepEqual(requested, ['/mf/latest', `/mf/${CODE}`]);
  assert.equal(result.counts!.pending, 4);
  assert.equal(result.firstAttempted, 0); assert.equal(result.historiesAdded, 0);
  assert.deepEqual(excluded.map(code => store.snapshot!.checkpoint.states[code]), originalExcluded);
  assert.deepEqual(result.activeRepairProgress, {
    asOf: '2026-10-21T20:00:00.000Z',
    before: { total: 1, attempted: 1, saved: 1, clean: 1, qualityIssues: 0, sourceGaps: 0,
      pending: 0, refreshPending: 1, bulkPassComplete: true, coverageComplete: false },
    after: { total: 1, attempted: 1, saved: 1, clean: 1, qualityIssues: 0, sourceGaps: 0,
      pending: 0, refreshPending: 0, bulkPassComplete: true, coverageComplete: true },
  });
});

test('a fund aging out at the UTC boundary cannot manufacture active repair progress', async () => {
  const store = new MemoryStore(); const excluded = [154858, 154859, 154860, 154861];
  const oldDate = '21-09-2026';
  await runTranche({ store, now: () => START, activeRepairOnly: true, minCatalogueSize: 1,
    source: async path => path === '/mf/latest' ? rawCatalogue([CODE, ...excluded], oldDate)
      : history(CODE, [{ date: oldDate, nav: '11.00' }, { date: '20-09-2026', nav: '10.00' }]) });
  const states = structuredClone(store.snapshot!.checkpoint.states);
  const requested: string[] = [];
  const result = await runTranche({ store, now: () => Date.parse('2026-10-22T00:00:00.000Z'),
    activeRepairOnly: true, minCatalogueSize: 1,
    source: async path => { requested.push(path); return rawCatalogue([CODE, ...excluded], oldDate); } });
  assert.deepEqual(requested, ['/mf/latest']);
  assert.equal(result.attempted, 0); assert.equal(result.reconciliationAdvanced, false);
  assert.equal(result.counts!.total, 5); assert.equal(result.counts!.saved, 1);
  assert.equal(result.counts!.pending, 4);
  assert.deepEqual(store.snapshot!.checkpoint.states, states);
  const empty = { total: 0, attempted: 0, saved: 0, clean: 0, qualityIssues: 0,
    sourceGaps: 0, pending: 0, refreshPending: 0, bulkPassComplete: false, coverageComplete: false };
  assert.deepEqual(result.activeRepairProgress, { asOf: '2026-10-22T00:00:00.000Z', before: empty, after: empty });
});

test('no-op collector never claims post-first-pass repair progress',async()=>{
  const store=new MemoryStore();
  await runTranche({store,now:()=>START,minCatalogueSize:1,
    source:async path=>path==='/mf/latest'?rawCatalogue():history()});
  const result=await runTranche({store,now:()=>START+60_000,minCatalogueSize:1,
    source:async()=>{throw Error('No source request expected');}});
  assert.equal(result.changed,false);
  assert.equal(result.reconciliationAdvanced,false);
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


test('a restarted backfill reuses scheme identities and consolidates repeated provider NAV dates', async () => {
  const store = new MemoryStore();
  const codes = [CODE, CODE + 1];
  const duplicateDates = (code: number) => history(code, [
    { date: '21-10-2026', nav: '11.00' },
    { date: '21-10-2026', nav: '11.0' },
    { date: '20-10-2026', nav: '10.00' },
  ]);
  const firstRequests: string[] = [];
  const initial = await runTranche({
    store, now: () => START, minCatalogueSize: 1,
    source: async path => {
      firstRequests.push(path);
      return path === '/mf/latest' ? rawCatalogue(codes) : duplicateDates(Number(path.split('/').at(-1)));
    },
  });
  assert.deepEqual(firstRequests.filter(path => path !== '/mf/latest').sort(),
    codes.map(code => '/mf/' + code).sort(), 'Each scheme is fetched only once during its first pass.');
  assert.equal(initial.sequence, 1);
  assert.equal(initial.firstAttempted, 2);
  assert.equal(initial.historiesAdded, 2);
  assert.equal(initial.counts?.saved, 2);
  assert.equal(initial.counts?.attempted, 2);
  assert.equal(initial.counts?.clean, 2);
  assert.equal(initial.counts?.pending, 0);

  const bucket = String(Math.floor(CODE / 32));
  const checkRecords = async (active: MemoryStore, expectedAttempts: number) => {
    const snapshot = active.snapshot!;
    const shard = await active.readShard(snapshot.checkpoint.shards[bucket], bucket);
    assert.equal(shard.records.length, 2, 'Only one record per distinct scheme code may be stored.');
    assert.deepEqual(shard.records.map(record => record.schemeCode), codes);
    for (const record of shard.records) {
      assert.equal(record.payload.data.length, 2);
      assert.equal(new Set(record.payload.data.map(point => point.date)).size, 2,
        'Identical date rows from MFAPI must not be appended to stored NAV history.');
      assert.match(record.warnings.join(' '), /Identical duplicate NAV dates were consolidated/);
      assert.equal(snapshot.checkpoint.states[record.schemeCode].observationCount, 2);
      assert.equal(snapshot.checkpoint.states[record.schemeCode].attempts, expectedAttempts);
    }
  };
  await checkRecords(store, 1);

  const beforeReplay = structuredClone(store.snapshot);
  const unchanged = await runTranche({
    store, now: () => START + 1000, expectedSequence: 1, minCatalogueSize: 1,
    source: async () => { throw new Error('An up-to-date checkpoint should not re-fetch these schemes.'); },
  });
  assert.equal(unchanged.changed, false);
  assert.equal(unchanged.historiesAdded, 0);
  assert.equal(unchanged.firstAttempted, 0);
  assert.equal(store.commits, 1);
  assert.deepEqual(store.snapshot, beforeReplay);

  // Simulate a new Actions runner: the process has no private collector state,
  // only the durable release checkpoint and previously written content assets.
  const restarted = new MemoryStore();
  restarted.snapshot = structuredClone(store.snapshot);
  restarted.assets = new Map(store.assets);
  const later = START + 8 * 86_400_000;
  const refreshRequests: string[] = [];
  const refreshed = await runTranche({
    store: restarted, now: () => later, expectedSequence: 1, minCatalogueSize: 1,
    source: async path => {
      refreshRequests.push(path);
      return path === '/mf/latest' ? rawCatalogue(codes) : duplicateDates(Number(path.split('/').at(-1)));
    },
  });
  assert.deepEqual(refreshRequests.filter(path => path !== '/mf/latest').sort(),
    codes.map(code => '/mf/' + code).sort());
  assert.equal(refreshed.sequence, 2);
  assert.equal(refreshed.attempted, 2);
  assert.equal(refreshed.firstAttempted, 0);
  assert.equal(refreshed.historiesAdded, 0, 'A routine refresh must not count the same fund again.');
  assert.equal(refreshed.counts?.saved, 2);
  assert.equal(refreshed.counts?.attempted, 2);
  assert.equal(refreshed.counts?.clean, 2);
  assert.equal(restarted.snapshot!.checkpoint.sequence, 2);
  await checkRecords(restarted, 2);
});

test('duplicate catalogue scheme codes are rejected before publishing a new archive', async () => {
  const store = new MemoryStore();
  const requested: string[] = [];
  const duplicated = [...rawCatalogue(), ...rawCatalogue()];
  await assert.rejects(runTranche({
    store, now: () => START, minCatalogueSize: 1,
    source: async path => { requested.push(path); return duplicated; },
  }), /source_catalogue_invalid/);
  assert.deepEqual(requested, ['/mf/latest'], 'A bad catalogue must not trigger per-scheme requests.');
  assert.equal(store.snapshot, null);
  assert.equal(store.commits, 0);
});

test('shard validation rejects duplicated scheme records and duplicated stored NAV dates', async () => {
  const store = new MemoryStore();
  await runTranche({
    store, now: () => START, minCatalogueSize: 1,
    source: async path => path === '/mf/latest' ? rawCatalogue() : history(),
  });
  const bucket = String(Math.floor(CODE / 32));
  const shard = await store.readShard(store.snapshot!.checkpoint.shards[bucket], bucket);
  const repeatedScheme = structuredClone(shard);
  repeatedScheme.records.push(structuredClone(shard.records[0]));
  assert.throws(() => validateHistoryShard(repeatedScheme, bucket), /history_document_invalid/);
  const repeatedDate = structuredClone(shard);
  repeatedDate.records[0].payload.data.push(structuredClone(shard.records[0].payload.data[0]));
  assert.throws(() => validateHistoryShard(repeatedDate, bucket), /history_observations_invalid/);
  assert.equal(store.snapshot!.checkpoint.counts.saved, 1);
  assert.equal(store.commits, 1);
});

test('conflicting source NAV values for one date are never counted as two observations', async () => {
  const store = new MemoryStore();
  await runTranche({
    store, now: () => START, minCatalogueSize: 1,
    source: async path => path === '/mf/latest' ? rawCatalogue() : history(CODE, [
      { date: '21-10-2026', nav: '11.00' },
      { date: '21-10-2026', nav: '11.25' },
      { date: '20-10-2026', nav: '10.00' },
    ]),
  });
  const snapshot = store.snapshot!;
  const bucket = String(Math.floor(CODE / 32));
  const shard = await store.readShard(snapshot.checkpoint.shards[bucket], bucket);
  assert.equal(shard.records.length, 1);
  assert.equal(shard.records[0].payload.data.length, 2);
  assert.equal(shard.records[0].unresolved, true);
  assert.match(shard.records[0].warnings.join(' '), /Conflicting NAV values/);
  assert.equal(snapshot.checkpoint.counts.saved, 1);
  assert.equal(snapshot.checkpoint.counts.clean, 0);
  assert.equal(snapshot.checkpoint.counts.qualityIssues, 1);
});
