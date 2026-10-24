import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { test } from 'node:test';
import { createSharedArchiveClient, validateSharedManifest } from '../src/lib/shared-archive.ts';

const BASE = 'https://example.test/mutual-fund-dashboard/';
const NOW = '2026-10-21T12:00:00.000Z';
const CODE = 123456;
const BUCKET = String(Math.floor(CODE / 32));
function document() {
  return { version: 1, schemeCode: CODE, fetchedAt: NOW, archivedAt: NOW, coverageStart: '2026-10-19', coverageEnd: '2026-10-20',
    unresolved: false, warnings: [], payload: { status: 'SUCCESS', meta: { scheme_code: CODE, scheme_name: 'Example Direct Growth',
      fund_house: 'Example Mutual Fund', scheme_type: 'Open Ended', scheme_category: 'Equity' },
    data: [{ date: '20-10-2026', nav: '10.1' }, { date: '19-10-2026', nav: '10' }] } };
}
function asset(value: unknown, name: string) {
  const json = Buffer.from(JSON.stringify(value));
  const bytes = gzipSync(json);
  return { bytes, descriptor: { path: `archive/${name}.json.gz`, bytes: bytes.length, expandedBytes: json.length,
    sha256: createHash('sha256').update(bytes).digest('hex') } };
}
function fixture(history: unknown = document()) {
  const catalogue = asset({ version: 1, fetchedAt: NOW, warnings: [], entries: [
    { schemeCode: CODE, schemeName: 'Example Direct Growth', latestDate: '2026-10-20', nav: '10.1', current: true },
  ] }, 'catalogue');
  const shard = asset({ version: 2, bucket: BUCKET, records: [history] }, 'shard');
  const manifest = { version: 2, source: 'mfapi.in', status: 'ready', collectionEnabled: true, sequence: 1, generatedAt: NOW, checkpointAt: NOW,
    catalogueFetchedAt: NOW, latestNavDate: '2026-10-20', catalogue: catalogue.descriptor,
    shards: { [BUCKET]: shard.descriptor }, warnings: [], issues: [],
    counts: { total: 1, attempted: 1, saved: 1, clean: 1, qualityIssues: 0, sourceGaps: 0,
      pending: 0, refreshPending: 0, bulkPassComplete: true, coverageComplete: true } };
  const files = new Map<string, unknown>([['archive/manifest.json', manifest],
    [catalogue.descriptor.path, catalogue.bytes], [shard.descriptor.path, shard.bytes]]);
  const requests: string[] = [];
  const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(url.origin, new URL(BASE).origin);
    assert.equal(init?.credentials, 'omit');
    assert.equal(init?.redirect, 'error');
    requests.push(url.pathname);
    const value = files.get(url.pathname.replace('/mutual-fund-dashboard/', ''));
    if (value === undefined) return new Response('', { status: 404 });
    return Buffer.isBuffer(value) ? new Response(new Uint8Array(value)) : Response.json(value);
  };
  return { manifest, files, requests, catalogue, shard,
    reader: createSharedArchiveClient({ baseUrl: BASE, fetch: fetcher, now: () => Date.parse(NOW) }) };
}

test('a verified same-origin shard retains exact history coverage and retrieval provenance', async () => {
  const f = fixture();
  const payload = await f.reader.loadFund(CODE);
  assert.equal(payload?.meta.scheme_code, CODE);
  assert.equal(payload?._fundscope.observationCount, 2);
  assert.equal(payload?._fundscope.coverageStart, '2026-10-19');
  assert.equal(payload?._fundscope.fetchedAt, NOW);
  assert.equal(payload?._fundscope.stale, false);
  assert.equal(f.requests.length, 3);
  await f.reader.loadFund(CODE);
  assert.equal(f.requests.length, 3, 'Immutable snapshot files should be reused.');
});

test('catalogue search is available from the verified snapshot without MFAPI', async () => {
  const f = fixture();
  assert.deepEqual(await f.reader.search('EXAMPLE direct'), [{ schemeCode: CODE, schemeName: 'Example Direct Growth' }]);
  assert.deepEqual(await f.reader.search('not present'), []);
  assert.equal(f.requests.some(path => path.includes('shard')), false);
});

test('a verified return index exposes a complete-page ranking input without fetching history shards', async () => {
  const f = fixture();
  const payload = { version:1, source:'mfapi.in', sequence:1, catalogueFetchedAt:NOW,
    entries:[{ schemeCode:CODE,navDate:'2026-10-20',oneYear:null,threeYear:null,fiveYear:null }] };
  const compressed=asset(payload,'returns-temp');
  compressed.descriptor.path = 'archive/returns-' + compressed.descriptor.sha256 + '.json.gz';
  Object.assign(f.manifest,{returns:compressed.descriptor});
  f.files.set(compressed.descriptor.path,compressed.bytes);
  const rows=await f.reader.loadReturns();
  assert.equal(rows?.[CODE].navDate,'2026-10-20');
  assert.equal(rows?.[CODE].oneYear,null);
  assert.equal(Object.keys(rows??{}).length,1);
  assert.ok(!f.requests.some(path=>path.includes('shard')),
    'Loading global sort values must never download every NAV shard.');
});

test('tampered or cross-checkpoint return indexes fail closed', async () => {
  const broken = [
    {version:1,source:'mfapi.in',sequence:2,catalogueFetchedAt:NOW,entries:[]},
    {version:1,source:'mfapi.in',sequence:1,catalogueFetchedAt:NOW,
      entries:[{schemeCode:999999,navDate:'2026-10-20',oneYear:.1,threeYear:null,fiveYear:null}]},
  ];
  for(const index of broken){
    const f=fixture(), compressed=asset(index,'returns-temp');
    compressed.descriptor.path='archive/returns-'+compressed.descriptor.sha256+'.json.gz';
    Object.assign(f.manifest,{returns:compressed.descriptor});
    f.files.set(compressed.descriptor.path,compressed.bytes);
    await assert.rejects(f.reader.loadReturns(),/index|scheme|checkpoint|return/i);
  }
  const f=fixture();
  Object.assign(f.manifest,{returns:{path:'archive/other-file.json.gz',sha256:'a'.repeat(64),
    bytes:100,expandedBytes:100}});
  await assert.rejects(f.reader.loadReturns(),/return index path/i);
});

test('full published directory and verified categories are loaded without history-shard downloads', async () => {
  const f=fixture();
  const payload={version:1,source:'mfapi.in',sequence:1,catalogueFetchedAt:NOW,
    entries:[{schemeCode:CODE,schemeCategory:'Equity Scheme - Flexi Cap Fund'}]};
  const categoryAsset=asset(payload,'categories-temp');
  categoryAsset.descriptor.path='archive/categories-'+categoryAsset.descriptor.sha256+'.json.gz';
  Object.assign(f.manifest,{categories:categoryAsset.descriptor});
  f.files.set(categoryAsset.descriptor.path,categoryAsset.bytes);
  assert.deepEqual(await f.reader.loadDirectory(),[
    {schemeCode:CODE,schemeName:'Example Direct Growth'},
  ]);
  assert.deepEqual(await f.reader.loadCategories(),{[CODE]:'Equity Scheme - Flexi Cap Fund'});
  assert.equal(f.requests.some(path=>path.includes('/history-')||path.includes('/shard')),false,
    'Rendering 20/50/100 rows and the category selector must not download every history.');
});

test('category metadata cannot be injected from another checkpoint or unsafe asset', async () => {
  const fixtureWithCategory=(payload:unknown)=>{
    const f=fixture();
    const stored=asset(payload,'categories-temp');
    stored.descriptor.path='archive/categories-'+stored.descriptor.sha256+'.json.gz';
    Object.assign(f.manifest,{categories:stored.descriptor});
    f.files.set(stored.descriptor.path,stored.bytes);
    return f;
  };
  const valid={version:1,source:'mfapi.in',sequence:1,catalogueFetchedAt:NOW,
    entries:[{schemeCode:CODE,schemeCategory:'Debt Scheme - Liquid Fund'}]};
  for(const changed of [
    {...valid,sequence:2},
    {...valid,entries:[]},
    {...valid,entries:[{schemeCode:999999,schemeCategory:'Equity'}]},
  ]) await assert.rejects(fixtureWithCategory(changed).reader.loadCategories(),/category|checkpoint/i);
  const unsafe=fixture();
  Object.assign(unsafe.manifest,{categories:{...unsafe.catalogue.descriptor,
    path:'archive/../../secrets.json.gz'}});
  await assert.rejects(unsafe.reader.loadCategories(),/asset|path/i);
  const noIndex=fixture();
  assert.equal(await noIndex.reader.loadCategories(),null,'Old manifests remain backward compatible.');
  assert.equal((await noIndex.reader.loadDirectory())?.length,1);
});

test('disabled publication does not invent zero coverage or request a history shard', async () => {
  const f = fixture();
  f.files.set('archive/manifest.json', { version: 2, source: 'mfapi.in', status: 'disabled', generatedAt: NOW,
    message: 'Shared archive publication is not enabled.' });
  assert.equal((await f.reader.loadManifest()).status, 'disabled');
  assert.equal(await f.reader.loadFund(CODE), null);
  assert.equal(await f.reader.search('Example'), null);
  assert.equal(f.requests.length, 1);
});

test('a paused collection preserves verified shared history without losing its explicit paused state', async () => {
  const f = fixture();
  f.manifest.collectionEnabled = false;
  const manifest = await f.reader.loadManifest();
  assert.equal(manifest.status, 'ready');
  if (manifest.status !== 'ready') throw new Error('Expected the retained ready snapshot.');
  assert.equal(manifest.collectionEnabled, false);
  assert.equal(manifest.counts.saved, 1);
  assert.equal((await f.reader.loadFund(CODE))?.data.length, 2);
  const missingFlag = { ...f.manifest };
  Reflect.deleteProperty(missingFlag, 'collectionEnabled');
  assert.throws(() => validateSharedManifest(missingFlag), /collection|checkpoint/i);
});

test('health-breakdown metadata is authenticated by matching checkpoint counters and remains optional', async()=>{
  const f=fixture();
  const health={
    version:1,sourceErrors:{},
    quality:{invalidOnly:0,discontinuityOnly:0,both:0,other:0},
    latestNav:{missingValue:0,missingDate:0,before2010:0,from2010Through2020:0,since2021:1},
    historyBehind:{oneDay:0,twoToSevenDays:0,eightToThirtyDays:0,overThirtyDays:0},
    retries:{due:0,future:0},
  };
  assert.equal((await f.reader.loadManifest()).status,'ready');
  const valid=validateSharedManifest({...f.manifest,health});
  assert.equal(valid.status,'ready');
  if(valid.status!=='ready')throw new Error('Missing verified manifest');
  assert.deepEqual(valid.health,health);
  for(const forged of [
    {...health,quality:{...health.quality,invalidOnly:1}},
    {...health,sourceErrors:{source_history_zero_nav_only:1}},
    {...health,latestNav:{...health.latestNav,missingDate:1}},
    {...health,retries:{...health.retries,due:2}},
  ])assert.throws(()=>validateSharedManifest({...f.manifest,health:forged}),/health|checkpoint/i);
});

test('manifest accounting cannot claim complete coverage while refresh work or source gaps remain', () => {
  const f = fixture();
  assert.throws(() => validateSharedManifest({ ...f.manifest, counts: { ...f.manifest.counts, sourceGaps: 1 } }), /counts|coverage/i);
  assert.throws(() => validateSharedManifest({ ...f.manifest, counts: { ...f.manifest.counts, refreshPending: 1 } }), /counts|coverage/i);
  assert.throws(() => validateSharedManifest({ ...f.manifest, counts: { ...f.manifest.counts, attempted: 0 } }), /counts|coverage/i);
});

test('asset paths cannot escape the published archive directory or contact another origin', () => {
  const f = fixture();
  for (const path of ['https://evil.example/steal.json.gz', '//evil.example/a.json.gz', '../a.json.gz', 'archive/%2e%2e/a.json.gz', 'archive/a.json.gz?x=1']) {
    assert.throws(() => validateSharedManifest({ ...f.manifest, catalogue: { ...f.manifest.catalogue, path } }), /asset|path/i);
  }
});

test('a corrupted compressed file is rejected before its history can enter the cache', async () => {
  const f = fixture();
  f.files.set(f.shard.descriptor.path, gzipSync(Buffer.from('{"invalid":true}')));
  await assert.rejects(f.reader.loadFund(CODE), /digest|size|length|integrity/i);
});

test('the decompressed size must agree with the verified manifest', async () => {
  const f = fixture();
  f.manifest.shards[BUCKET].expandedBytes -= 1;
  await assert.rejects(f.reader.loadFund(CODE), /size|limit|length/i);
});

test('wrong scheme identity and forged history coverage are rejected', async () => {
  const wrong = document();
  wrong.schemeCode += 32;
  wrong.payload.meta.scheme_code += 32;
  await assert.rejects(fixture(wrong).reader.loadFund(CODE), /identity|scheme|bucket/i);
  const coverage = document();
  coverage.coverageStart = '2020-01-01';
  await assert.rejects(fixture(coverage).reader.loadFund(CODE), /coverage|range/i);
});

test('latest catalogue dates do not silently turn lagging history into fresh full coverage', async () => {
  const f = fixture();
  const catalogue = asset({ version: 1, fetchedAt: NOW, warnings: [], entries: [
    { schemeCode: CODE, schemeName: 'Example Direct Growth', latestDate: '2026-10-21', nav: '10.2', current: true },
  ] }, 'new-catalogue');
  f.manifest.catalogue = catalogue.descriptor;
  f.manifest.latestNavDate = '2026-10-21';
  f.manifest.counts.refreshPending = 1;
  f.manifest.counts.coverageComplete = false;
  f.files.set(catalogue.descriptor.path, catalogue.bytes);
  const payload = await f.reader.loadFund(CODE);
  assert.equal(payload?._fundscope.stale, true);
  assert.equal(payload?.data.length, 2, 'The latest quote must not be inserted as invented full history.');
  assert.ok(payload?._fundscope.warnings.some(warning => /catalogue|reconciliation/i.test(warning)));
});

test('same-date source NAV corrections make the shared history stale without changing its observations', async () => {
  const f = fixture();
  const catalogue = asset({ version: 1, fetchedAt: NOW, warnings: [], entries: [
    { schemeCode: CODE, schemeName: 'Example Direct Growth', latestDate: '2026-10-20', nav: '10.2000', current: true },
  ] }, 'corrected-catalogue');
  f.manifest.catalogue = catalogue.descriptor;
  f.manifest.counts.refreshPending = 1;
  f.manifest.counts.coverageComplete = false;
  f.files.set(catalogue.descriptor.path, catalogue.bytes);
  const payload = await f.reader.loadFund(CODE);
  assert.equal(payload?._fundscope.stale, true);
  assert.equal(payload?.data[0].nav, '10.1');
  assert.ok(payload?._fundscope.warnings.some(warning => /correction|differs/i.test(warning)));
});

test('equivalent latest NAV decimal spellings do not create a false correction warning', async () => {
  const f = fixture();
  const catalogue = asset({ version: 1, fetchedAt: NOW, warnings: [], entries: [
    { schemeCode: CODE, schemeName: 'Example Direct Growth', latestDate: '2026-10-20', nav: '010.1000', current: true },
  ] }, 'equivalent-catalogue');
  f.manifest.catalogue = catalogue.descriptor;
  f.files.set(catalogue.descriptor.path, catalogue.bytes);
  assert.equal((await f.reader.loadFund(CODE))?._fundscope.stale, false);
});

test('publication and history retrieval timestamps must follow their actual event order', async () => {
  const f = fixture();
  assert.throws(() => validateSharedManifest({ ...f.manifest, catalogueFetchedAt: '2026-10-21T13:00:00.000Z' }), /timestamp|checkpoint|provenance/i);
  assert.throws(() => validateSharedManifest({ ...f.manifest, generatedAt: '2026-10-21T11:00:00.000Z' }), /timestamp|checkpoint|provenance/i);
  const futureRetrieval = document();
  futureRetrieval.fetchedAt = '2026-10-21T13:00:00.000Z';
  await assert.rejects(fixture(futureRetrieval).reader.loadFund(CODE), /timestamp|provenance/i);
});
