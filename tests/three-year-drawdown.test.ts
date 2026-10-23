import assert from 'node:assert/strict';
import { test } from 'node:test';
import { threeYearMaxDrawdown } from '../src/lib/analytics.ts';
import { archivedFundReturns, localFundReturns, returnValue, sortFundSchemes, validateReturnIndex } from '../src/lib/fund-sort.ts';
import type { NavPoint, FundData, Scheme } from '../src/lib/types.ts';
import type { HistoryDocument } from '../server/types.ts';

const point = (date: string, nav: number): NavPoint => ({ date, nav });
const around = (actual: number | null, expected: number) => {
  assert.notEqual(actual, null);
  assert.ok(Math.abs(actual! - expected) < 1e-12, `${actual} differs from ${expected}`);
};
const points: NavPoint[] = [
  point('2022-01-10', 900), // Older peak must not enter trailing 3Y.
  point('2023-01-10', 100),
  point('2023-06-01', 150),
  point('2023-11-01', 90),
  point('2024-06-01', 140),
  point('2025-01-10', 170),
  point('2026-01-10', 220),
];

test('three-year max drawdown ignores earlier NAV peaks and measures an observed trough', () => {
  const unchanged = structuredClone(points);
  around(threeYearMaxDrawdown(points), 90 / 150 - 1);
  assert.deepEqual(points, unchanged);
});

test('three-year max drawdown requires an eligible full three-year NAV baseline', () => {
  assert.equal(threeYearMaxDrawdown([]), null);
  assert.equal(threeYearMaxDrawdown([point('2024-01-10', 150)]), null);
  assert.equal(threeYearMaxDrawdown(points.filter(row => row.date >= '2024-01-10')), null);
  assert.equal(threeYearMaxDrawdown([
    point('2023-01-01', 100),point('2024-01-10', 150),point('2026-01-10', 120),
  ]), null, 'A starting NAV nine days before the three-year anniversary cannot qualify.');
  assert.equal(threeYearMaxDrawdown([
    point('2023-01-11', 100),point('2024-01-10', 150),point('2026-01-10', 120),
  ]), null, 'A future baseline is not a predecessor NAV.');
  around(threeYearMaxDrawdown([
    point('2023-01-03', 100),point('2024-01-10', 150),point('2026-01-10', 120),
  ]), 120 / 150 - 1, 'A valid seven-day predecessor baseline is eligible.');
});

test('a zero drawdown is valid; leap-day windows use calendar anniversaries', () => {
  around(threeYearMaxDrawdown([
    point('2024-02-28', 100), point('2025-02-28', 105), point('2026-02-28', 110), point('2027-02-28', 120),
  ]), 0);
  around(threeYearMaxDrawdown([
    point('2024-02-27', 100), point('2024-02-29', 130),
    point('2025-02-28', 65), point('2027-02-28', 150),
  ]), -.5);
});

const history = (name = 'Example Scheme - Direct Plan - Growth', unresolved = false): HistoryDocument => ({
  version: 1, schemeCode: 118955, fetchedAt: '2026-01-11T10:00:00.000Z',
  archivedAt: '2026-01-11T10:01:00.000Z', coverageStart: '2022-01-10', coverageEnd: '2026-01-10',
  unresolved, warnings: [], payload: {
    status: 'SUCCESS', meta: { scheme_code: 118955, scheme_name: name, fund_house: 'Example AMC',
      scheme_type: 'Open Ended', scheme_category: 'Equity' },
    data: points.map(p => ({ date: p.date.slice(8,10) + '-' + p.date.slice(5,7) + '-' + p.date.slice(0,4),
      nav: String(p.nav) })).reverse(),
  },
});

const localFund = (doc: HistoryDocument): FundData => ({
  meta: { schemeCode: doc.schemeCode, schemeName: doc.payload.meta.scheme_name,
    fundHouse: doc.payload.meta.fund_house, schemeType: doc.payload.meta.scheme_type,
    schemeCategory: doc.payload.meta.scheme_category },
  points, fetchedAt: doc.fetchedAt, source: 'mfapi.in', fromCache: false, stale: false, warnings: [],
});

test('shared archive and a loaded fund produce identical three-year drawdown values', () => {
  const doc = history();
  const archived = archivedFundReturns(doc);
  const local = localFundReturns(localFund(doc));
  assert.ok(archived);
  around(archived!.threeYearMaxDrawdown ?? null, -.4);
  around(local.threeYearMaxDrawdown ?? null, -.4);
  assert.equal(archived!.threeYearMaxDrawdown, local.threeYearMaxDrawdown);
  assert.equal(archivedFundReturns(history('Example Scheme - Direct Plan - IDCW')), null);
  assert.equal(archivedFundReturns(history(undefined, true)), null);
  assert.equal(localFundReturns({ ...localFund(doc), warnings: [
    'Unresolved discontinuity: historical values are inconsistent.',
  ]}).threeYearMaxDrawdown, null);
});

test('v2 indexes include validated downside; v1 indexes remain readable without fabricating a value', () => {
  const base = { source: 'mfapi.in', sequence: 41, catalogueFetchedAt: '2026-01-11T10:00:00.000Z' };
  const row = { schemeCode: 118955, navDate: '2026-01-10',
    oneYear: .1, threeYear: .12, fiveYear: null, threeYearMaxDrawdown: -.4 };
  const codes = new Set([118955, 118956]);
  const check = (value:unknown) => validateReturnIndex(value, 41, base.catalogueFetchedAt, codes, 2);
  const v2 = { ...base, version: 2, entries: [row] };
  assert.deepEqual(check(v2)[118955], row);
  assert.equal(returnValue(check(v2)[118955], 'dd3'), -.4);
  const v1row = { schemeCode: row.schemeCode, navDate: row.navDate,
    oneYear: row.oneYear, threeYear: row.threeYear, fiveYear: row.fiveYear };
  const v1 = check({ ...base, version: 1, entries: [v1row] });
  assert.deepEqual(v1[118955], v1row);
  assert.equal(returnValue(v1[118955], 'dd3'), null);

  for (const bad of [
    { ...v2, entries: [{ ...row, threeYearMaxDrawdown: undefined }] },
    { ...v2, entries: [{ ...row, threeYearMaxDrawdown: .01 }] },
    { ...v2, entries: [{ ...row, threeYearMaxDrawdown: -1 }] },
    { ...v2, entries: [{ ...row, threeYearMaxDrawdown: -1.1 }] },
    { ...v2, entries: [{ ...row, threeYearMaxDrawdown: NaN }] },
    { ...v2, entries: [{ ...row, threeYearMaxDrawdown: '0' }] },
  ]) assert.throws(() => check(bad), /drawdown/i);
});

test('globally sorted downside metrics rank all pages with unavailable observations last', () => {
  const schemes: Scheme[] = Array.from({ length: 21 }, (_, i) => ({
    schemeCode: i+1, schemeName: `Example ${String(21-i).padStart(2,'0')} - Direct Plan - Growth`,
  }));
  const map = Object.fromEntries(schemes.slice(0, 17).map(s => [s.schemeCode,
    { schemeCode: s.schemeCode, navDate: '2026-01-10',
      oneYear: .12, threeYear: .14, fiveYear: null, threeYearMaxDrawdown: s.schemeCode / -100 },
  ]));
  const safe = sortFundSchemes(schemes, { key: 'dd3', desc: true }, map);
  assert.deepEqual(safe.slice(0,8).map(s=>s.schemeCode), [1,2,3,4,5,6,7,8]);
  assert.deepEqual(safe.slice(8,16).map(s=>s.schemeCode), [9,10,11,12,13,14,15,16]);
  assert.deepEqual(safe.slice(16).map(s=>s.schemeCode), [17,21,20,19,18]);

  const worst = sortFundSchemes(schemes, { key: 'dd3', desc: false }, map);
  assert.deepEqual(worst.slice(0,8).map(s=>s.schemeCode), [17,16,15,14,13,12,11,10]);
  assert.deepEqual(worst.slice(-4).map(s=>s.schemeCode), [21,20,19,18]);
});
