import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { getApiConnection, isStaticRuntime, loadDataStatus } from '../src/lib/runtime.ts';
import { importBackup } from '../src/lib/storage.ts';

const runtimeGlobal = globalThis as typeof globalThis & { __FUNDSCOPE_STATIC__?: boolean; window?: unknown };
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

beforeEach(async () => {
  await importBackup(JSON.stringify({ version: 1, createdAt: new Date().toISOString(),
    settings: { version: 1, watchlist: [], compared: [], riskFreeRate: 0.06, lastFund: null }, funds: [] }));
});

afterEach(() => {
  delete runtimeGlobal.__FUNDSCOPE_STATIC__;
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

function browser() { Object.defineProperty(globalThis, 'window', { configurable: true, value: {} }); }

test('the absent build flag preserves legacy browser and Node source selection', () => {
  assert.equal(isStaticRuntime(), false);
  assert.deepEqual(getApiConnection(), { baseUrl: 'https://api.mfapi.in', credentials: 'omit' });
  browser();
  assert.deepEqual(getApiConnection(), { baseUrl: '/api', credentials: 'same-origin' });
  runtimeGlobal.__FUNDSCOPE_STATIC__ = false;
  assert.equal(isStaticRuntime(), false);
  assert.deepEqual(getApiConnection(), { baseUrl: '/api', credentials: 'same-origin' });
});

test('the static build uses MFAPI directly even in a browser', () => {
  browser();
  runtimeGlobal.__FUNDSCOPE_STATIC__ = true;
  assert.equal(isStaticRuntime(), true);
  assert.deepEqual(getApiConnection(), { baseUrl: 'https://api.mfapi.in', credentials: 'omit' });
});

test('static search and history requests use the direct source with no credentials', async t => {
  browser();
  runtimeGlobal.__FUNDSCOPE_STATIC__ = true;
  const { searchSchemes, getFund } = await import('../src/lib/api.ts?runtime-static');
  const paths: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://api.mfapi.in');
    assert.equal(init?.credentials, 'omit');
    paths.push(url.pathname);
    if (url.pathname === '/mf/search') return Response.json([{ schemeCode: 122640, schemeName: 'Static Test Direct Growth' }]);
    assert.equal(url.pathname, '/mf/122640');
    return Response.json({ status: 'SUCCESS', meta: { scheme_code: 122640, scheme_name: 'Static Test Direct Growth',
      fund_house: 'Test Mutual Fund', scheme_type: 'Open Ended', scheme_category: 'Equity' }, data: [{ date: '19-10-2026', nav: '100' }] });
  });
  assert.equal((await searchSchemes('Static source routing test'))[0].schemeCode, 122640);
  assert.equal((await getFund(122640, { force: true })).points[0].nav, 100);
  assert.deepEqual(paths, ['/mf/search', '/mf/122640']);
});

test('the legacy browser client keeps same-origin requests and credentials', async t => {
  browser();
  const { searchSchemes } = await import('../src/lib/api.ts?runtime-legacy');
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    assert.equal(input, '/api/mf/search?q=Legacy%20source%20routing%20test');
    assert.equal(init?.credentials, 'same-origin');
    return Response.json([]);
  });
  assert.deepEqual(await searchSchemes('Legacy source routing test'), []);
});

test('static data status checks MFAPI without requesting the shared archive', async t => {
  browser();
  runtimeGlobal.__FUNDSCOPE_STATIC__ = true;
  const requests: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    requests.push(url);
    assert.equal(new URL(url).origin, 'https://api.mfapi.in');
    assert.equal(new URL(url).pathname, '/mf/search');
    assert.equal(init?.credentials, 'omit');
    return Response.json([]);
  });
  const result = await loadDataStatus(new AbortController().signal);
  assert.equal(result.kind, 'browser');
  if (result.kind !== 'browser') throw new Error('Expected browser data status.');
  assert.equal(result.sourceAvailable, true);
  assert.equal(result.fundCount, 0);
  assert.equal(result.sourceError, null);
  assert.ok(Number.isFinite(Date.parse(result.checkedAt)));
  assert.equal(requests.length, 1);
  assert.equal(requests.some(url => url.includes('/api/data/status')), false);
  assert.equal('archivedCount' in result, false);
  assert.equal('schedule' in result, false);
});

test('static status reports source failure without discarding local cache coverage', async t => {
  browser();
  runtimeGlobal.__FUNDSCOPE_STATIC__ = true;
  await importBackup(JSON.stringify({ version: 1, createdAt: new Date().toISOString(),
    settings: { version: 1, watchlist: [], compared: [], riskFreeRate: 0.06, lastFund: null },
    funds: [{ meta: { schemeCode: 122639, schemeName: 'Test Fund Direct Growth', fundHouse: 'Test', schemeType: 'Open Ended', schemeCategory: 'Equity' },
      points: [{ date: '2026-10-19', nav: 100 }], fetchedAt: '2026-10-20T10:00:00.000Z', source: 'mfapi.in', fromCache: false, stale: false, warnings: [] }],
  }));
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  const result = await loadDataStatus(new AbortController().signal);
  assert.equal(result.kind, 'browser');
  if (result.kind !== 'browser') throw new Error('Expected browser data status.');
  assert.equal(result.sourceAvailable, false);
  assert.equal(result.fundCount, 1);
  assert.match(result.sourceError ?? '', /could not be reached/i);
  assert.equal('archivedCount' in result, false);
});

test('a successful HTTP response with invalid source data is not an availability success', async t => {
  runtimeGlobal.__FUNDSCOPE_STATIC__ = true;
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Provider unavailable' }));
  const result = await loadDataStatus(new AbortController().signal);
  assert.equal(result.kind, 'browser');
  if (result.kind !== 'browser') throw new Error('Expected browser data status.');
  assert.equal(result.sourceAvailable, false);
  assert.match(result.sourceError ?? '', /invalid response/i);
});

test('a malformed source record and invalid JSON both fail the static availability check', async t => {
  runtimeGlobal.__FUNDSCOPE_STATIC__ = true;
  let request = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    request += 1;
    return request === 1 ? Response.json([{ schemeCode: 'wrong', schemeName: 'Invalid' }]) : new Response('<html>Unavailable</html>');
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await loadDataStatus(new AbortController().signal);
    assert.equal(result.kind, 'browser');
    if (result.kind !== 'browser') throw new Error('Expected browser data status.');
    assert.equal(result.sourceAvailable, false);
    assert.match(result.sourceError ?? '', /invalid response/i);
  }
});

test('legacy data status continues to use the same-origin archive endpoint', async t => {
  browser();
  const snapshot = { source: 'mfapi.in', catalogueCount: 12, archivedCount: 4, observationCount: 500, historyBacklog: 8,
    lastCatalogueSyncAt: null, latestNavDate: null, lastHistorySyncAt: null, lastRun: null,
    schedule: { timezone: 'UTC', times: ['05:37', '17:37'] }, warnings: [] };
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    assert.equal(input, '/api/data/status');
    assert.equal(init?.credentials, 'same-origin');
    return Response.json(snapshot);
  });
  assert.deepEqual(await loadDataStatus(new AbortController().signal), { kind: 'archive', status: snapshot });
});
