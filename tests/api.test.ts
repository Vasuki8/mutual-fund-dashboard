import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { getFund, searchSchemes, validateFundResponse } from '../src/lib/api.ts';
import { exportBackup, importBackup } from '../src/lib/storage.ts';
import type { FundData } from '../src/lib/types.ts';

const CODE = 122639;
const NAME = 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth';
function payload(code = CODE, data: unknown[] = [
  { date: '19-10-2026', nav: '90.35460' },
  { date: '16-10-2026', nav: '90.88440' },
]) {
  return { status: 'SUCCESS', meta: {
    fund_house: 'PPFAS Mutual Fund', scheme_type: 'Open Ended Schemes',
    scheme_category: 'Equity Scheme - Flexi Cap Fund', scheme_code: code,
    scheme_name: NAME, isin_growth: 'INF879O01027', isin_div_reinvestment: null,
  }, data };
}
function cached(code = CODE, fetchedAt = new Date().toISOString()): FundData {
  return {
    meta: { schemeCode: code, schemeName: NAME, fundHouse: 'PPFAS Mutual Fund',
      schemeType: 'Open Ended Schemes', schemeCategory: 'Equity Scheme - Flexi Cap Fund',
      isinGrowth: 'INF879O01027', isinDivReinvestment: null },
    points: [{ date: '2026-10-16', nav: 90.8844 }, { date: '2026-10-19', nav: 90.3546 }],
    fetchedAt, source: 'mfapi.in', fromCache: false, stale: false, warnings: [],
  };
}
async function seed(funds: FundData[] = []) {
  await importBackup(JSON.stringify({ version: 1, createdAt: new Date().toISOString(),
    settings: { version: 1, watchlist: [], compared: [], riskFreeRate: 0.06, lastFund: null }, funds }));
}
beforeEach(() => seed());

test('normalizes provider dates to ascending ISO observations while retaining full plan identity', () => {
  const fund = validateFundResponse(payload(), CODE);
  assert.deepEqual(fund.points, [{ date: '2026-10-16', nav: 90.8844 }, { date: '2026-10-19', nav: 90.3546 }]);
  assert.equal(fund.meta.schemeName, NAME);
  assert.equal(fund.meta.schemeCode, CODE);
  assert.equal(fund.source, 'mfapi.in');
  assert.equal(fund.fromCache, false);
  assert.equal(fund.stale, false);
  assert.ok(Number.isFinite(Date.parse(fund.fetchedAt)));
});

test('retains the archive retrieval time and stale warning instead of reporting a fresh provider fetch', async t => {
  const fetchedAt = new Date(Date.now() - 7 * 3600_000).toISOString();
  const provenance = { fetchedAt, archivedAt: fetchedAt, fromArchive: true, stale: true,
    coverageStart: '2026-10-16', coverageEnd: '2026-10-19', observationCount: 2,
    warnings: ['Provider unavailable; retained the shared archive.'] };
  t.mock.method(globalThis, 'fetch', async () => Response.json({ ...payload(), _fundscope: provenance }));
  const result = await getFund(CODE);
  assert.equal(result.fetchedAt, fetchedAt);
  assert.equal(result.stale, true);
  assert.deepEqual(result.archive, provenance);
  assert.ok(result.warnings.includes(provenance.warnings[0]));
  const exported = JSON.parse(await exportBackup());
  assert.equal(exported.funds[0].fetchedAt, fetchedAt);
  assert.equal(exported.funds[0].archive.observationCount, 2);
});

test('rejects malformed archive provenance instead of silently relabelling it as current', () => {
  assert.throws(() => validateFundResponse({ ...payload(), _fundscope: { fetchedAt: 'not-a-date' } }, CODE), /archive|provenance/i);
});

test('rejects the provider HTTP-200 SUCCESS shape for an unknown code', () => {
  assert.throws(() => validateFundResponse({ ...payload(0), data: [] }, CODE), /scheme|code|identity/i);
});

test('rejects a different plan code even when NAV observations exist', () => {
  assert.throws(() => validateFundResponse(payload(120716), CODE), /scheme|code|identity/i);
});

test('rejects unsuccessful payload status', () => {
  assert.throws(() => validateFundResponse({ ...payload(), status: 'ERROR' }, CODE), /status|unsuccessful/i);
});

test('rejects empty observations and incomplete scheme metadata', () => {
  assert.throws(() => validateFundResponse(payload(CODE, []), CODE), /NAV|observation/i);
  const incomplete = payload();
  incomplete.meta.fund_house = '';
  assert.throws(() => validateFundResponse(incomplete, CODE), /metadata|fund.house/i);
});

test('rejects unusable NAV histories including impossible UTC calendar dates', () => {
  assert.throws(() => validateFundResponse(payload(CODE, [
    { date: '31-02-2026', nav: '10' }, { date: '01-01-2026', nav: '0' },
    { date: '02-01-2026', nav: '-3' }, { date: '03-01-2026', nav: 'NaN' },
    { date: '04-01-2026', nav: null }, { date: '05-01-2026', nav: true },
  ]), CODE), /invalid|usable|NAV/i);
});

test('preserves a blocking invalid-data warning when only some observations are usable', () => {
  const fund = validateFundResponse(payload(CODE, [
    { date: '28-02-2024', nav: '10' }, { date: '29-02-2024', nav: '10.1' },
    { date: '29-02-2025', nav: '11' },
  ]), CODE);
  assert.deepEqual(fund.points.map(point => point.date), ['2024-02-28', '2024-02-29']);
  assert.ok(fund.warnings.some(warning => /invalid/i.test(warning)));
});

test('consolidates identical duplicate dates without declaring a conflict', () => {
  const fund = validateFundResponse(payload(CODE, [
    { date: '19-10-2026', nav: '90.35460' }, { date: '19-10-2026', nav: '90.3546' },
  ]), CODE);
  assert.equal(fund.points.length, 1);
  assert.ok(fund.warnings.some(warning => /duplicate/i.test(warning)));
  assert.equal(fund.warnings.some(warning => /conflict/i.test(warning)), false);
});

test('conflicting dates select a deterministic NAV and block analytics', () => {
  const rows = [{ date: '19-10-2026', nav: '90' }, { date: '19-10-2026', nav: '91' }];
  const forward = validateFundResponse(payload(CODE, rows), CODE);
  const reverse = validateFundResponse(payload(CODE, [...rows].reverse()), CODE);
  assert.deepEqual(forward.points, reverse.points);
  assert.equal(forward.points[0].nav, 90);
  assert.ok(forward.warnings.some(warning => /conflict/i.test(warning)));
});

test('flags moves over forty percent as unresolved discontinuities', () => {
  const fund = validateFundResponse(payload(CODE, [
    { date: '01-01-2025', nav: '10' }, { date: '02-01-2025', nav: '15' },
  ]), CODE);
  assert.ok(fund.warnings.some(warning => /discontinuity/i.test(warning)));
  const boundary = validateFundResponse(payload(CODE, [
    { date: '01-01-2025', nav: '10' }, { date: '02-01-2025', nav: '14' },
  ]), CODE);
  assert.equal(boundary.warnings.some(warning => /discontinuity/i.test(warning)), false);
});

test('empty search completes without a network request', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected network request'); });
  assert.deepEqual(await searchSchemes('   '), []);
});

test('name search encodes the query and reuses the fresh query cache', async t => {
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requests += 1;
    assert.equal(new URL(String(input)).searchParams.get('q'), 'Large & Mid Cap');
    return Response.json([{ schemeCode: CODE, schemeName: NAME }]);
  });
  const first = await searchSchemes('Large & Mid Cap');
  const second = await searchSchemes('  large & mid cap  ');
  assert.deepEqual(first, [{ schemeCode: CODE, schemeName: NAME }]);
  assert.deepEqual(second, first);
  assert.equal(requests, 1);
});

test('numeric search looks up exact fund metadata', async t => {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    assert.equal(new URL(String(input)).pathname, `/mf/${CODE}`);
    return Response.json(payload());
  });
  const results = await searchSchemes(String(CODE));
  assert.equal(results[0].schemeCode, CODE);
  assert.equal(results[0].schemeName, NAME);
});

test('successful history is reused from cache and returned values cannot corrupt that cache', async t => {
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => { requests += 1; return Response.json(payload()); });
  const first = await getFund(CODE);
  first.points[0].nav = 1;
  const next = await getFund(CODE);
  assert.equal(next.fromCache, true);
  assert.equal(next.stale, false);
  assert.equal(next.points[0].nav, 90.8844);
  assert.equal(requests, 1);
});

test('concurrent refreshes for one scheme share a single request', async t => {
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    requests += 1;
    await new Promise(resolve => setTimeout(resolve, 5));
    return Response.json(payload());
  });
  const results = await Promise.all([getFund(CODE), getFund(CODE), getFund(CODE, { force: true })]);
  assert.equal(requests, 1);
  assert.deepEqual(results[0].points, results[2].points);
});

test('limits simultaneous provider requests to three', async t => {
  let active = 0;
  let maximum = 0;
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active -= 1;
    return Response.json(payload(Number(new URL(String(input)).pathname.split('/').at(-1))));
  });
  const results = await Promise.all([122631, 122632, 122633, 122634, 122635].map(code => getFund(code)));
  assert.equal(results.length, 5);
  assert.equal(maximum, 3);
});

test('a failed force refresh retains the good cache and explains the fallback', async t => {
  const previous = cached();
  previous.warnings = ['Previously detected invalid observation was excluded.'];
  await seed([previous]);
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => { requests += 1; return new Response('', { status: 400 }); });
  const result = await getFund(CODE, { force: true });
  assert.equal(result.fromCache, true);
  assert.equal(result.stale, true);
  assert.deepEqual(result.points, previous.points);
  assert.ok(result.warnings.some(warning => /refresh|network/i.test(warning)));
  assert.ok(result.warnings.includes(previous.warnings[0]));
  assert.equal(requests, 1);
  assert.equal(JSON.parse(await exportBackup()).funds[0].fetchedAt, previous.fetchedAt);
});

test('expired histories survive a transient outage after one capped retry', async t => {
  await seed([cached(CODE, new Date(Date.now() - 7 * 3600_000).toISOString())]);
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    requests += 1;
    return new Response('', { status: 503, headers: { 'Retry-After': '0' } });
  });
  const result = await getFund(CODE);
  assert.equal(result.stale, true);
  assert.equal(result.fromCache, true);
  assert.equal(requests, 2);
});

test('an older provider response never replaces a newer saved observation', async t => {
  await seed([cached()]);
  t.mock.method(globalThis, 'fetch', async () => Response.json(payload(CODE, [
    { date: '16-10-2026', nav: '90.88440' },
  ])));
  const result = await getFund(CODE, { force: true });
  assert.equal(result.points.at(-1)?.date, '2026-10-19');
  assert.equal(result.fromCache, true);
  assert.ok(result.warnings.some(warning => /older|newer/i.test(warning)));
  assert.equal(JSON.parse(await exportBackup()).funds[0].points.at(-1).date, '2026-10-19');
});

test('a shortened same-date source refresh retains older saved observations and applies valid corrections', async t => {
  await seed([cached()]);
  t.mock.method(globalThis, 'fetch', async () => Response.json(payload(CODE, [
    { date: '19-10-2026', nav: '91.00' },
  ])));
  const result = await getFund(CODE, { force: true });
  assert.deepEqual(result.points, [{ date: '2026-10-16', nav: 90.8844 }, { date: '2026-10-19', nav: 91 }]);
  assert.ok(result.warnings.some(warning => /retained/i.test(warning)));
  assert.deepEqual(JSON.parse(await exportBackup()).funds[0].points, result.points);
});

test('archive provenance must agree with the returned observation count and coverage', () => {
  const now = new Date().toISOString();
  const provenance = { fetchedAt: now, archivedAt: now, fromArchive: true, stale: false,
    coverageStart: '2026-10-16', coverageEnd: '2026-10-19', observationCount: 3, warnings: [] };
  assert.throws(() => validateFundResponse({ ...payload(), _fundscope: provenance }, CODE), /provenance|coverage|count/i);
  assert.throws(() => validateFundResponse({ ...payload(), _fundscope: { ...provenance,
    observationCount: 2, coverageStart: '2025-01-01' } }, CODE), /provenance|coverage|count/i);
});

test('a transient provider failure may recover on the single retry', async t => {
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    requests += 1;
    return requests === 1
      ? new Response('', { status: 503, headers: { 'Retry-After': '0' } })
      : Response.json(payload());
  });
  assert.equal((await getFund(CODE)).fromCache, false);
  assert.equal(requests, 2);
});

test('does not retry ahead of a provider Retry-After beyond the bounded wait', async t => {
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    requests += 1;
    return new Response('', { status: 429, headers: { 'Retry-After': '3600' } });
  });
  await assert.rejects(getFund(CODE), /429|rate/i);
  assert.equal(requests, 1);
});

test('search distinguishes no matches from HTTP and malformed payload errors', async t => {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const query = new URL(String(input)).searchParams.get('q');
    if (query === 'absent') return Response.json([]);
    if (query === 'bad') return new Response('', { status: 400 });
    return Response.json({ status: 'SUCCESS' });
  });
  assert.deepEqual(await searchSchemes('absent'), []);
  await assert.rejects(searchSchemes('bad'), /400/i);
  await assert.rejects(searchSchemes('malformed'), /invalid|array|search/i);
});

test('an invalid successful HTTP payload without cache is an explicit error', async t => {
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    requests += 1;
    return Response.json({ ...payload(0), data: [] });
  });
  await assert.rejects(getFund(CODE), /scheme|code|identity/i);
  assert.equal(requests, 1);
});

test('a response begun before restore cannot replace a restored same-date NAV or feed a new request', async t => {
  const previous = cached();
  previous.points = [{ date: '2026-10-16', nav: 100 }, { date: '2026-10-19', nav: 110 }];
  await seed([previous]);
  let release!: (response: Response) => void;
  let started!: () => void;
  const began = new Promise<void>(resolve => { started = resolve; });
  t.mock.method(globalThis, 'fetch', async () => {
    started();
    return new Promise<Response>(resolve => { release = resolve; });
  });
  const oldResult = getFund(CODE, { force: true });
  const oldOutcome = oldResult.then(value => ({ value, error: null }), error => ({ value: null, error }));
  await began;
  const restored = cached();
  restored.points = [{ date: '2026-10-16', nav: 100 }, { date: '2026-10-19', nav: 105 }];
  await seed([restored]);
  const nextResult = getFund(CODE);
  release(Response.json(payload(CODE, [{ date: '16-10-2026', nav: '100' }, { date: '19-10-2026', nav: '120' }])));
  const old = await oldOutcome;
  const next = await nextResult;
  assert.ok(old.error instanceof Error, 'The old request must reject after restore.');
  assert.match(old.error.message, /restore|supersed|generation/i);
  assert.equal(next.points.at(-1)?.nav, 105);
  assert.equal(JSON.parse(await exportBackup()).funds[0].points.at(-1).nav, 105);
});

test('a failed pre-restore refresh cannot return its captured old cache', async t => {
  await seed([cached()]);
  let release!: (response: Response) => void;
  let started!: () => void;
  const began = new Promise<void>(resolve => { started = resolve; });
  t.mock.method(globalThis, 'fetch', async () => {
    started();
    return new Promise<Response>(resolve => { release = resolve; });
  });
  const old = getFund(CODE, { force: true });
  const outcome = old.then(value => ({ value, error: null }), error => ({ value: null, error }));
  await began;
  const restored = cached();
  restored.points[1].nav = 92;
  await seed([restored]);
  release(new Response('', { status: 400 }));
  const result = await outcome;
  assert.ok(result.error instanceof Error, 'An old fallback must be superseded, not returned.');
  assert.match(result.error.message, /restore|supersed|generation/i);
  assert.equal((await getFund(CODE)).points.at(-1)?.nav, 92);
});

test('post-restore forced refreshes do not join pre-restore network promises', async t => {
  await seed([cached()]);
  let release!: (response: Response) => void;
  let started!: () => void;
  let requests = 0;
  const began = new Promise<void>(resolve => { started = resolve; });
  t.mock.method(globalThis, 'fetch', async () => {
    requests += 1;
    if (requests === 1) {
      started();
      return new Promise<Response>(resolve => { release = resolve; });
    }
    return Response.json(payload(CODE, [{ date: '19-10-2026', nav: '95' }]));
  });
  const old = getFund(CODE, { force: true });
  const outcome = old.then(() => 'resolved', () => 'rejected');
  await began;
  await seed([cached()]);
  const next = getFund(CODE, { force: true });
  await new Promise(resolve => setImmediate(resolve));
  release(Response.json(payload(CODE, [{ date: '19-10-2026', nav: '120' }])));
  assert.equal((await next).points.at(-1)?.nav, 95);
  assert.equal(await outcome, 'rejected');
  assert.equal(requests, 2);
});
