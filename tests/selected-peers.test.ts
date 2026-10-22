import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectedPeerSummary } from '../src/lib/selected-peers.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';

const nav = (date: string, value: number): NavPoint => ({ date, nav: value });
function fund(code: number, ending: number, options: {
  name?: string; house?: string; category?: string; type?: string;
  points?: NavPoint[]; warnings?: string[]; stale?: boolean;
} = {}): FundData {
  return {
    meta: {
      schemeCode: code,
      schemeName: options.name ?? ('Test Strategy ' + code + ' - Direct Plan - Growth'),
      fundHouse: options.house ?? 'Test AMC',
      schemeCategory: options.category ?? 'Equity Scheme - Flexi Cap Fund',
      schemeType: options.type ?? 'Open Ended Schemes',
    },
    points: options.points ?? [nav('2023-01-01', 100), nav('2023-06-01', 105), nav('2024-01-01', ending)],
    fetchedAt: '2024-01-02T12:00:00Z',
    source: 'mfapi.in', fromCache: false, stale: options.stale ?? false,
    warnings: options.warnings ?? [],
  };
}
const near = (value: number | null, expected: number) => {
  assert.ok(value !== null && Math.abs(value - expected) < 1e-10, String(value) + ' != ' + expected);
};

test('peer median and midrank percentiles use the same validated exact dates', () => {
  const funds = [fund(100001, 120), fund(100002, 110), fund(100003, 90)];
  const result = selectedPeerSummary(funds, 'MAX');
  assert.equal(result.available, true);
  assert.equal(result.category, 'Equity Scheme - Flexi Cap Fund');
  assert.equal(result.plan, 'Direct');
  assert.equal(result.metric, 'CAGR');
  assert.equal(result.eligibleCount, 3);
  assert.equal(result.observationCount, 3);
  near(result.median, 0.1);
  near(result.rows[0].returnValue, 0.2);
  near(result.rows[0].percentile, 100 * 2.5 / 3);
  near(result.rows[1].percentile, 50);
  near(result.rows[2].percentile, 100 * 0.5 / 3);
  assert.equal(result.start, '2023-01-01');
  assert.equal(result.end, '2024-01-01');
});

test('identical returns receive identical midrank percentiles, with no synthetic leader', () => {
  const result = selectedPeerSummary([fund(100001, 110), fund(100002, 110)], 'MAX');
  assert.equal(result.available, true);
  near(result.rows[0].percentile, 50);
  near(result.rows[1].percentile, 50);
  near(result.median, .1);
});

test('periods shorter than 365 days report absolute returns instead of annualizing', () => {
  const funds = [
    fund(100001, 120, { points: [nav('2024-01-01', 100), nav('2024-03-01', 105), nav('2024-06-01', 120)] }),
    fund(100002, 115, { points: [nav('2024-01-01', 100), nav('2024-03-01', 102), nav('2024-06-01', 115)] }),
  ];
  const result = selectedPeerSummary(funds, 'MAX');
  assert.equal(result.metric, 'Absolute return');
  near(result.median, .175);
});

test('mixed category, mixed scheme type or mixed plan prevents fabricated ranks', () => {
  const different = [
    fund(100002, 110, { category: 'Equity Scheme - Small Cap Fund' }),
    fund(100002, 110, { type: 'Close Ended Schemes' }),
    fund(100002, 110, { name: 'Test Strategy 100002 - Regular Plan - Growth' }),
  ];
  const keywords = [/category/i, /type/i, /Direct or Regular/i];
  different.forEach((second, i) => {
    const result = selectedPeerSummary([fund(100001, 120), second], 'MAX');
    assert.equal(result.available, false);
    assert.match(result.reason ?? '', keywords[i]);
    assert.equal(result.eligibleCount, 0);
    assert.deepEqual(result.rows, []);
  });
});

test('NAV-only peer analysis excludes distributions and unresolved quality issues', () => {
  const idcw = selectedPeerSummary([
    fund(100001, 120),
    fund(100002, 110, { name: 'Test Strategy 100002 - Direct Plan - IDCW' }),
  ], 'MAX');
  assert.equal(idcw.available, false);
  assert.match(idcw.reason ?? '', /Growth/i);
  const invalid = selectedPeerSummary([
    fund(100001, 120),
    fund(100002, 110, { warnings: ['Invalid NAV observations were excluded (1); derived analytics are blocked until the data is resolved.'] }),
  ], 'MAX');
  assert.equal(invalid.available, false);
  assert.match(invalid.reason ?? '', /quality/i);
});

test('apparent duplicate growth share-class variants are not independent peers', () => {
  const same = selectedPeerSummary([
    fund(100001, 120, { name: 'HDFC Flexi Cap Fund - Direct Plan - Growth', house: 'HDFC Mutual Fund' }),
    fund(100002, 122, { name: 'HDFC Flexi Cap Fund - Direct Growth Option', house: 'HDFC Mutual Fund' }),
  ], 'MAX');
  assert.equal(same.available, false);
  assert.match(same.reason ?? '', /same underlying fund/i);
  assert.equal(selectedPeerSummary([fund(100001,120),fund(100001,110)], 'MAX').available, false);
});

test('uses intersection of dates, never replaces a missing observation with zero', () => {
  const result = selectedPeerSummary([
    fund(100001, 120, { points: [nav('2024-01-01', 100), nav('2024-02-01', 105), nav('2024-04-01', 120)] }),
    fund(100002, 115, { points: [nav('2024-01-01', 100), nav('2024-04-01', 115)] }),
  ], 'MAX');
  assert.equal(result.available, true);
  assert.equal(result.observationCount, 2);
  assert.equal(result.metric, 'Absolute return');
  near(result.rows[0].returnValue, .2);
  near(result.rows[1].returnValue, .15);
});

test('no common dates and stale data are represented accurately', () => {
  const missing = selectedPeerSummary([
    fund(100001, 120, { points: [nav('2023-01-01',100),nav('2024-01-01',120)] }),
    fund(100002, 110, { points: [nav('2023-01-02',100),nav('2024-01-02',110)] }),
  ], 'MAX');
  assert.equal(missing.available, false);
  assert.match(missing.reason ?? '', /exact NAV observation/i);
  const stale = selectedPeerSummary([fund(100001,120,{stale:true}),fund(100002,110)],'MAX');
  assert.equal(stale.available, true);
  assert.equal(stale.staleCount, 1);
});
