import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { afterEach, beforeEach, test } from 'node:test';
import { getFund, searchSchemes } from '../src/lib/api.ts';
import { exportBackup, importBackup, putCachedSearch } from '../src/lib/storage.ts';
import type { Scheme } from '../src/lib/types.ts';
import type { TestContext } from 'node:test';

const runtimeGlobal = globalThis as typeof globalThis & { __FUNDSCOPE_STATIC__?: boolean };
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const CODE = 123456;
const BUCKET = String(Math.floor(CODE / 32));
let run = 0;
let base: URL;

function source(data = [{ date: '20-10-2026', nav: '10.1' }, { date: '19-10-2026', nav: '10' }]) {
  return { status: 'SUCCESS', meta: { scheme_code: CODE, scheme_name: 'Example Direct Growth',
    fund_house: 'Example Mutual Fund', scheme_type: 'Open Ended', scheme_category: 'Equity' }, data };
}
function backup(funds: unknown[] = []) {
  return JSON.stringify({ version: 1, createdAt: new Date().toISOString(), funds,
    settings: { version: 1, watchlist: [], compared: [], riskFreeRate: 0.06, lastFund: null } });
}
beforeEach(async () => {
  await importBackup(backup());
  runtimeGlobal.__FUNDSCOPE_STATIC__ = true;
  base = new URL(`https://snapshot-${++run}.example/mutual-fund-dashboard/`);
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: base } });
});
afterEach(() => {
  delete runtimeGlobal.__FUNDSCOPE_STATIC__;
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

function install(t: TestContext, options: { fetchedAt?: string; source?: (url: URL) => Response | Promise<Response>;
  pending?: Scheme[]; manifest?: () => Response | Promise<Response>;
  catalogue?: (bytes: Buffer) => Response | Promise<Response>;
  shard?: (bytes: Buffer) => Response | Promise<Response> } = {}) {
  const now = new Date().toISOString();
  const fetchedAt = options.fetchedAt ?? now;
  function compressed(value: unknown, name: string) {
    const json = Buffer.from(JSON.stringify(value));
    const bytes = gzipSync(json);
    return { bytes, descriptor: { path: `archive/${name}.json.gz`, bytes: bytes.length, expandedBytes: json.length,
      sha256: createHash('sha256').update(bytes).digest('hex') } };
  }
  const catalogue = compressed({ version: 1, fetchedAt: now, warnings: [], entries: [
    { schemeCode: CODE, schemeName: 'Example Direct Growth', latestDate: '2026-10-20', nav: '10.1', current: true },
    ...(options.pending ?? []).map(scheme => ({ ...scheme, latestDate: null, nav: null, current: true })),
  ] }, 'catalogue');
  const shard = compressed({ version: 2, bucket: BUCKET, records: [
    { version: 1, schemeCode: CODE, fetchedAt, archivedAt: fetchedAt, coverageStart: '2026-10-19', coverageEnd: '2026-10-20',
      unresolved: false, warnings: [], payload: source() },
  ] }, 'shard');
  const manifest = { version: 2, source: 'mfapi.in', status: 'ready', collectionEnabled: true, sequence: 1, generatedAt: now, checkpointAt: now,
    catalogueFetchedAt: now, latestNavDate: '2026-10-20', catalogue: catalogue.descriptor, shards: { [BUCKET]: shard.descriptor },
    issues: [], warnings: [], counts: { total: 1 + (options.pending?.length ?? 0), attempted: 1, saved: 1, clean: 1, qualityIssues: 0, sourceGaps: 0,
      pending: options.pending?.length ?? 0, refreshPending: 0, bulkPassComplete: !options.pending?.length, coverageComplete: !options.pending?.length } };
  let sourceRequests = 0;
  const requests: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(init?.credentials, 'omit');
    requests.push(url.href);
    if (url.origin === 'https://api.mfapi.in') { sourceRequests += 1; return options.source?.(url) ?? Response.json(source()); }
    assert.equal(url.origin, base.origin);
    if (url.pathname.endsWith('/manifest.json')) return options.manifest?.() ?? Response.json(manifest);
    if (url.pathname.endsWith('/catalogue.json.gz')) return options.catalogue?.(catalogue.bytes) ?? new Response(new Uint8Array(catalogue.bytes));
    if (url.pathname.endsWith('/shard.json.gz')) return options.shard?.(shard.bytes) ?? new Response(new Uint8Array(shard.bytes));
    return new Response('', { status: 404 });
  });
  return { requests, manifest, sourceRequests: () => sourceRequests };
}

test('initial static fund loads use the verified shared history before making provider requests', async t => {
  const f = install(t);
  const result = await getFund(CODE);
  assert.equal(result.points.length, 2);
  assert.equal(result.archive?.fromArchive, true);
  assert.equal(result.stale, false);
  assert.equal(f.sourceRequests(), 0);
  assert.equal(f.requests.length, 3);
  assert.equal(JSON.parse(await exportBackup()).funds[0].archive.observationCount, 2);
});

test('manual refresh requests MFAPI directly instead of trusting a fresh published snapshot', async t => {
  const f = install(t);
  assert.equal((await getFund(CODE, { force: true })).points.length, 2);
  assert.equal(f.sourceRequests(), 1);
  assert.equal(f.requests.length, 1);
});

test('a failed manual source request can still open a verified shared history with an explicit warning', async t => {
  const f = install(t, { source: () => new Response('', { status: 400 }) });
  const result = await getFund(CODE, { force: true });
  assert.equal(result.points.length, 2);
  assert.equal(result.fromCache, true);
  assert.equal(result.stale, true);
  assert.ok(result.warnings.some(warning => /refresh failed/i.test(warning)));
  assert.equal(f.sourceRequests(), 1);
});

test('a current direct response supplements older shared history instead of discarding earlier dates', async t => {
  const f = install(t, { fetchedAt: new Date(Date.now() - 8 * 3600_000).toISOString(),
    source: () => Response.json(source([{ date: '21-10-2026', nav: '10.2' }])) });
  const result = await getFund(CODE);
  assert.deepEqual(result.points.map(point => point.date), ['2026-10-19', '2026-10-20', '2026-10-21']);
  assert.equal(result.archive, undefined, 'A local union is not the unchanged published payload.');
  assert.equal(result.stale, false);
  assert.equal(f.sourceRequests(), 1);
});

test('corrupt shared files fall back to MFAPI without admitting the bad archive into browser storage', async t => {
  const f = install(t, { shard: () => new Response('corrupt') });
  const result = await getFund(CODE);
  assert.equal(result.points.length, 2);
  assert.equal(result.archive, undefined);
  assert.ok(result.warnings.some(warning => /shared archive could not be verified/i.test(warning)));
  assert.equal(f.sourceRequests(), 1);
});

test('shared catalogue search resolves a name without source or history requests', async t => {
  const f = install(t, { source: () => new Response('', { status: 400 }) });
  assert.deepEqual(await searchSchemes('Example Direct'), [{ schemeCode: CODE, schemeName: 'Example Direct Growth' }]);
  assert.equal(f.sourceRequests(), 0);
  assert.equal(f.requests.some(url => url.includes('/shard.json.gz')), false);
});

const pendingScheme: Scheme = { schemeCode: 234567, schemeName: 'Example Small Cap - Direct Plan - Growth' };
const limitedSourceResults: Scheme[] = Array.from({ length: 15 }, (_, index) => ({
  schemeCode: 100000 + index, schemeName: `Example Legacy Plan ${index} - Regular - Growth`,
}));

test('a complete catalogue finds direct plans omitted from a successful limited provider response', async t => {
  const f = install(t, { pending: [pendingScheme], source: () => Response.json(limitedSourceResults) });
  assert.deepEqual(await searchSchemes('Example'), [
    { schemeCode: CODE, schemeName: 'Example Direct Growth' }, pendingScheme,
  ]);
  assert.equal(f.sourceRequests(), 0);
  assert.equal(f.requests.some(url => url.includes('/shard.json.gz')), false,
    'Discovery must include a pending history without downloading any history shards.');
});

test('a previously cached limited search cannot hide current catalogue matches', async t => {
  const f = install(t, { pending: [pendingScheme], source: () => Response.json(limitedSourceResults) });
  await putCachedSearch('example', limitedSourceResults);
  assert.deepEqual(await searchSchemes('  EXAMPLE  '), [
    { schemeCode: CODE, schemeName: 'Example Direct Growth' }, pendingScheme,
  ]);
  assert.equal(f.sourceRequests(), 0);
});

test('numeric catalogue search resolves an exact pending scheme without validating its history', async t => {
  const similar: Scheme = { schemeCode: 2345670, schemeName: 'Another Direct Growth' };
  const f = install(t, { pending: [pendingScheme, similar], source: () => new Response('', { status: 400 }) });
  assert.deepEqual(await searchSchemes('00234567'), [pendingScheme]);
  assert.equal(f.sourceRequests(), 0);
  assert.equal(f.requests.some(url => url.includes('/shard.json.gz')), false);
});

test('a partial numeric catalogue match does not replace the exact requested scheme', async t => {
  const requestedCode = 12345;
  const f = install(t, { source: url => {
    assert.equal(url.pathname, `/mf/${requestedCode}`);
    return Response.json({ ...source(), meta: { ...source().meta, scheme_code: requestedCode } });
  } });
  assert.deepEqual(await searchSchemes(String(requestedCode)), [
    { schemeCode: requestedCode, schemeName: 'Example Direct Growth' },
  ]);
  assert.equal(f.sourceRequests(), 1);
});

test('a scheme absent from the catalogue can still be found through provider search', async t => {
  const newest: Scheme = { schemeCode: 345678, schemeName: 'New House Direct Growth' };
  const f = install(t, { source: url => {
    assert.equal(url.searchParams.get('q'), 'New House');
    return Response.json([newest]);
  } });
  assert.deepEqual(await searchSchemes('New House'), [newest]);
  assert.equal(f.sourceRequests(), 1);
});

test('an unavailable shared manifest falls back to provider search', async t => {
  const f = install(t, { manifest: () => new Response('', { status: 404 }), source: () => Response.json([pendingScheme]) });
  assert.deepEqual(await searchSchemes('Example Small Cap'), [pendingScheme]);
  assert.equal(f.sourceRequests(), 1);
});

test('a corrupt catalogue falls back without using its unverified names', async t => {
  const f = install(t, { catalogue: () => new Response('corrupt'), source: () => Response.json([pendingScheme]) });
  assert.deepEqual(await searchSchemes('Example Small Cap'), [pendingScheme]);
  assert.equal(f.sourceRequests(), 1);
});

test('concurrent catalogue searches share reads and return independent results', async t => {
  const f = install(t, { pending: [pendingScheme], source: () => Response.json(limitedSourceResults) });
  const [first, second] = await Promise.all([searchSchemes('Example'), searchSchemes(' example ')]);
  assert.deepEqual(first, [{ schemeCode: CODE, schemeName: 'Example Direct Growth' }, pendingScheme]);
  first[0].schemeName = 'Changed by caller';
  assert.equal(second[0].schemeName, 'Example Direct Growth');
  assert.equal(f.requests.filter(url => url.includes('/catalogue.json.gz')).length, 1);
  assert.equal(f.sourceRequests(), 0);
});

test('a backup restore supersedes a search waiting for the shared catalogue', async t => {
  let release!: () => void;
  let started!: () => void;
  const began = new Promise<void>(resolve => { started = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const f = install(t, { source: () => new Response('', { status: 400 }), catalogue: async bytes => {
    started(); await gate; return new Response(new Uint8Array(bytes));
  } });
  const pending = searchSchemes('Example').then(value => ({ value, error: null }), error => ({ value: null, error }));
  await began;
  await importBackup(backup());
  release();
  assert.match((await pending).error?.message ?? '', /superseded|restore/i);
  assert.equal(f.sourceRequests(), 0, 'An obsolete catalogue read must not start a provider fallback.');
});

test('restoring a backup supersedes a history request waiting on a shared shard', async t => {
  let release!: (response: Response) => void;
  let started!: () => void;
  let bytes: Buffer;
  const began = new Promise<void>(resolve => { started = resolve; });
  install(t, { shard: value => {
    bytes = value;
    started();
    return new Promise<Response>(resolve => { release = resolve; });
  } });
  const pending = getFund(CODE).then(value => ({ value, error: null }), error => ({ value: null, error }));
  await began;
  const restored = { meta: { schemeCode: CODE, schemeName: 'Example Direct Growth', fundHouse: 'Example Mutual Fund',
    schemeType: 'Open Ended', schemeCategory: 'Equity' }, points: [{ date: '2026-10-20', nav: 99 }],
    fetchedAt: new Date().toISOString(), source: 'mfapi.in', fromCache: false, stale: false, warnings: [] };
  await importBackup(backup([restored]));
  release(new Response(new Uint8Array(bytes!)));
  assert.match((await pending).error?.message ?? '', /superseded|restore/i);
  assert.equal((await getFund(CODE)).points[0].nav, 99);
});

test('a manual refresh during an archive read still performs its requested source fetch', async t => {
  let release!: () => void;
  let started!: () => void;
  const began = new Promise<void>(resolve => { started = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const f = install(t, { shard: async bytes => { started(); await gate; return new Response(new Uint8Array(bytes)); } });
  const archive = getFund(CODE);
  await began;
  const manual = getFund(CODE, { force: true });
  release();
  await Promise.all([archive, manual]);
  assert.equal(f.sourceRequests(), 1);
});
