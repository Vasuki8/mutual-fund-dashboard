import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CALCULATION_VERSION,
  absoluteReturn,
  alignFunds,
  cagr,
  daysBetween,
  drawdownSeries,
  drawdownStats,
  isGrowthScheme,
  monthlyReturns,
  parseNavDate,
  periodStart,
  riskStats,
  rollingReturns,
  rollingReturnSummary,
  selectPeriod,
  trailingReturn,
} from '../src/lib/analytics.ts';
import type { NavPoint } from '../src/lib/types.ts';

const point = (date: string, nav: number): NavPoint => ({ date, nav });
const close = (actual: number | null, expected: number, tolerance = 1e-12) => {
  assert.notEqual(actual, null);
  assert.ok(Math.abs(actual! - expected) <= tolerance, `${actual} is not close to ${expected}`);
};

function monthlyHistory(returns: number[]): NavPoint[] {
  let nav = 100;
  return [point('2022-12-31', nav), ...returns.map((value, index) => {
    nav *= 1 + value;
    const date = new Date(Date.UTC(2023, index + 1, 0)).toISOString().slice(0, 10);
    return point(date, nav);
  })];
}

test('exports the calculation contract version', () => {
  assert.equal(CALCULATION_VERSION, '1.3.0');
});

test('parses provider dates as real calendar dates and rejects overflow', () => {
  assert.equal(parseNavDate('29-02-2024'), '2024-02-29');
  assert.equal(parseNavDate(' 31-12-2023 '), '2023-12-31');
  for (const input of ['29-02-2023', '31-04-2024', '00-01-2024', '01-13-2024', '2024-02-29', '1-1-2024', '']) {
    assert.equal(parseNavDate(input), null, input);
  }
});

test('calendar day counts preserve leap days and do not depend on daylight saving time', () => {
  assert.equal(daysBetween('2021-01-01', '2023-01-01'), 730);
  assert.equal(daysBetween('2023-03-01', '2024-03-01'), 366);
  assert.equal(daysBetween('2024-03-09', '2024-03-11'), 2);
  assert.equal(daysBetween('2024-03-11', '2024-03-09'), -2);
});

test('period boundaries clamp month ends and leap anniversaries', () => {
  assert.equal(periodStart('2024-03-31', '1M'), '2024-02-29');
  assert.equal(periodStart('2023-05-31', '3M'), '2023-02-28');
  assert.equal(periodStart('2024-08-31', '6M'), '2024-02-29');
  assert.equal(periodStart('2024-02-29', '1Y'), '2023-02-28');
  assert.equal(periodStart('2024-02-29', '3Y'), '2021-02-28');
  assert.equal(periodStart('2024-02-29', '5Y'), '2019-02-28');
  assert.equal(periodStart('2024-02-29', 'MAX'), null);
});

test('period selection uses the preceding point within seven days and preserves identity', () => {
  const points = [point('2023-01-20', 90), point('2023-01-24', 100), point('2023-02-01', 101), point('2024-01-31', 120)];
  const snapshot = [...points];
  const selected = selectPeriod(points, '1Y');
  assert.deepEqual(selected, points.slice(1));
  assert.equal(selected[0], points[1]);
  assert.deepEqual(points, snapshot);
  assert.deepEqual(selectPeriod(points, 'MAX'), points);
});

test('period selection exposes a shorter available range when its predecessor is stale', () => {
  const points = [point('2023-01-23', 90), point('2023-02-01', 100), point('2024-01-31', 120)];
  assert.deepEqual(selectPeriod(points, '1Y'), points.slice(1));
  assert.deepEqual(selectPeriod([], '1Y'), []);
});

test('100 to 121 over 730 days is 21% absolute and 10% ACT/365 CAGR', () => {
  const points = [point('2021-01-01', 100), point('2023-01-01', 121)];
  close(absoluteReturn(points), 0.21);
  close(cagr(points), 0.1);
});

test('insufficient return histories and CAGR shorter than 365 days are unavailable', () => {
  for (const points of [[], [point('2024-01-01', 100)]]) {
    assert.equal(absoluteReturn(points), null);
    assert.equal(cagr(points), null);
    assert.equal(trailingReturn(points, 1), null);
  }
  assert.equal(cagr([point('2023-01-01', 100), point('2023-12-31', 110)]), null);
});

test('trailing one year uses absolute return at a clamped leap anniversary', () => {
  const points = [point('2023-02-27', 100), point('2023-03-01', 108), point('2024-02-29', 120)];
  close(trailingReturn(points, 1), 0.2);
});

test('trailing multi-year returns annualize using actual observation dates', () => {
  const points = [point('2020-12-31', 100), point('2024-01-01', 133.1)];
  close(trailingReturn(points, 3), Math.pow(1.331, 365 / 1096) - 1);
});

test('trailing returns reject shorter horizons, stale predecessors, and future substitutes', () => {
  assert.equal(trailingReturn([point('2023-01-11', 100), point('2024-01-10', 120)], 1), null);
  assert.equal(trailingReturn([point('2022-12-31', 100), point('2023-01-11', 105), point('2024-01-10', 120)], 1), null);
  assert.equal(trailingReturn([point('2023-01-10', 100), point('2024-01-10', 120)], 3), null);
  assert.equal(trailingReturn([point('2023-01-10', 100), point('2024-01-10', 120)], 0), null);
  close(trailingReturn([point('2023-01-03', 100), point('2024-01-10', 120)], 1), 0.2);
});

test('drawdown identifies a 25% loss and its exact peak, trough, and final recovery', () => {
  const points = [point('2024-01-01', 100), point('2024-01-02', 120), point('2024-01-03', 90), point('2024-01-04', 120)];
  assert.deepEqual(drawdownSeries(points), points.map((value, index) => ({ date: value.date, value: [0, 0, -0.25, 0][index] })));
  assert.deepEqual(drawdownStats(points), {
    maxDrawdown: -0.25, currentDrawdown: 0, peakDate: '2024-01-02', troughDate: '2024-01-03', recoveryDate: '2024-01-04',
  });
});

test('drawdown starts within its selected window and an unrecovered deeper loss replaces the episode', () => {
  const points = [point('2024-01-01', 100), point('2024-01-02', 80), point('2024-01-03', 110), point('2024-01-04', 70)];
  close(drawdownStats(points).maxDrawdown, 70 / 110 - 1);
  assert.equal(drawdownStats(points).peakDate, '2024-01-03');
  assert.equal(drawdownStats(points).troughDate, '2024-01-04');
  assert.equal(drawdownStats(points).recoveryDate, null);
  assert.deepEqual(drawdownSeries(points.slice(1, 3)).map(value => value.value), [0, 0]);
  assert.deepEqual(drawdownStats([]), { maxDrawdown: null, currentDrawdown: null, peakDate: null, troughDate: null, recoveryDate: null });
  assert.deepEqual(drawdownStats([point('2024-01-01', 100)]), { maxDrawdown: 0, currentDrawdown: 0, peakDate: null, troughDate: null, recoveryDate: null });
});

test('monthly returns use consecutive eligible month ends without bridging a missing month', () => {
  const points = [point('2022-12-30', 100), point('2023-01-31', 110), point('2023-03-31', 121), point('2023-04-28', 133.1), point('2023-05-16', 140)];
  const returns = monthlyReturns(points);
  assert.deepEqual(returns.map(({ year, month, date }) => ({ year, month, date })), [
    { year: 2023, month: 1, date: '2023-01-31' },
    { year: 2023, month: 4, date: '2023-04-28' },
  ]);
  returns.forEach(value => close(value.value, 0.1));
});

test('monthly returns reject stale month ends even when a later month is valid', () => {
  const points = [point('2022-12-23', 100), point('2023-01-31', 110), point('2023-02-28', 121)];
  const returns = monthlyReturns(points);
  assert.deepEqual(returns.map(value => value.month), [2]);
  close(returns[0].value, 0.1);
});

test('latest month is excluded until complete using UTC, with a seven-day historical tolerance', context => {
  context.mock.method(Date, 'now', () => Date.parse('2024-02-29T23:30:00Z'));
  const points = [point('2023-12-31', 100), point('2024-01-31', 110), point('2024-02-27', 121)];
  assert.deepEqual(monthlyReturns(points).map(value => value.month), [1]);
  assert.deepEqual(monthlyReturns([...points, point('2024-02-29', 121)]).map(value => value.month), [1, 2]);
  context.mock.method(Date, 'now', () => Date.parse('2024-03-01T00:00:00Z'));
  assert.deepEqual(monthlyReturns(points).map(value => value.month), [1, 2]);
});

test('zero monthly returns have zero volatility and undefined ratios', () => {
  const stats = riskStats(monthlyHistory(Array(12).fill(0)));
  assert.deepEqual(stats, { volatility: 0, sharpe: null, sortino: null, monthlyCount: 12, positiveMonths: 0, bestMonth: 0, worstMonth: 0 });
});

test('constant NAV below a positive target has a defined negative Sortino', () => {
  const stats = riskStats(monthlyHistory(Array(12).fill(0)), 0.06);
  assert.equal(stats.volatility, 0);
  assert.equal(stats.sharpe, null);
  close(stats.sortino, -Math.sqrt(12));
});

test('risk uses sample monthly deviation and downside shortfalls divided by all periods', () => {
  const stats = riskStats(monthlyHistory(Array.from({ length: 12 }, (_, index) => index % 2 === 0 ? 0.1 : -0.1)), 0.06);
  const target = Math.pow(1.06, 1 / 12) - 1;
  close(stats.volatility, Math.sqrt(1.44 / 11));
  close(stats.sharpe, -target * 12 / Math.sqrt(1.44 / 11));
  close(stats.sortino, -target * Math.sqrt(12) / ((0.1 + target) / Math.sqrt(2)));
  assert.equal(stats.monthlyCount, 12);
  assert.equal(stats.positiveMonths, 6);
  close(stats.bestMonth, 0.1);
  close(stats.worstMonth, -0.1);
});

test('risk statistics require twelve complete monthly returns and preserve available summaries', () => {
  const stats = riskStats(monthlyHistory(Array(11).fill(0.02)));
  assert.equal(stats.monthlyCount, 11);
  assert.equal(stats.positiveMonths, 11);
  close(stats.bestMonth, 0.02);
  close(stats.worstMonth, 0.02);
  assert.equal(stats.volatility, null);
  assert.equal(stats.sharpe, null);
  assert.equal(stats.sortino, null);
  assert.deepEqual(riskStats([]), { volatility: null, sharpe: null, sortino: null, monthlyCount: 0, positiveMonths: 0, bestMonth: null, worstMonth: null });
});

test('no downside deviation leaves Sortino unavailable without hiding positive outcomes', () => {
  const stats = riskStats(monthlyHistory(Array.from({ length: 12 }, (_, index) => index % 2 === 0 ? 0.01 : 0.02)));
  assert.ok(stats.volatility! > 0);
  assert.ok(stats.sharpe! > 0);
  assert.equal(stats.sortino, null);
  assert.equal(stats.positiveMonths, 12);
});

test('rolling one-year windows clamp leap days and return actual reported endpoints', () => {
  const points = [point('2020-02-29', 100), point('2020-03-02', 102), point('2021-02-26', 110), point('2021-03-01', 112), point('2021-03-02', 113)];
  const returns = rollingReturns(points, 1);
  assert.deepEqual(returns.map(({ start, end }) => ({ start, end })), [
    { start: '2020-02-29', end: '2021-02-26' },
    { start: '2020-03-02', end: '2021-03-02' },
  ]);
  close(returns[0].value, 0.1);
  close(returns[1].value, 113 / 102 - 1);
});

test('rolling windows require complete anniversaries and an endpoint no more than seven days earlier', () => {
  assert.deepEqual(rollingReturns([point('2020-02-29', 100), point('2021-02-27', 110)], 1), []);
  assert.deepEqual(rollingReturns([point('2020-02-29', 100), point('2021-02-20', 110), point('2021-03-01', 120)], 1), []);
  const returns = rollingReturns([point('2020-02-29', 100), point('2021-02-21', 110), point('2021-03-01', 120)], 1);
  assert.equal(returns.length, 1);
  assert.equal(returns[0].end, '2021-02-21');
  close(returns[0].value, 0.1);
  assert.deepEqual(rollingReturns([], 1), []);
  assert.deepEqual(rollingReturns([point('2020-01-01', 100)], 0), []);
});

test('multi-year rolling returns use actual elapsed days for CAGR', () => {
  const returns = rollingReturns([point('2020-02-29', 100), point('2023-02-27', 133.1), point('2023-03-01', 150)], 3);
  assert.equal(returns.length, 1);
  assert.equal(returns[0].end, '2023-02-27');
  close(returns[0].value, Math.pow(1.331, 365 / 1094) - 1);
});

test('comparison intersects actual dates and computes its period from the common endpoint', () => {
  const a = [point('2023-01-01', 100), point('2023-01-10', 101), point('2023-02-01', 105), point('2024-01-01', 120), point('2024-01-10', 130)];
  const b = [point('2022-12-31', 90), point('2023-01-01', 100), point('2023-01-10', 104), point('2023-02-02', 110), point('2024-01-01', 125)];
  const aligned = alignFunds([a, b], '1Y');
  assert.deepEqual(aligned.dates, ['2023-01-01', '2023-01-10', '2024-01-01']);
  assert.equal(aligned.start, '2023-01-01');
  assert.equal(aligned.end, '2024-01-01');
  assert.deepEqual(aligned.series.map(points => points.map(value => value.date)), [aligned.dates, aligned.dates]);
  assert.equal(aligned.series[0][0], a[0]);
  assert.equal(aligned.series[1][0], b[1]);
});

test('comparison preserves every fund and handles empty or disjoint histories', () => {
  const first = [point('2023-01-01', 100), point('2024-01-01', 110)];
  assert.deepEqual(alignFunds([], 'MAX'), { dates: [], series: [], start: null, end: null });
  assert.deepEqual(alignFunds([first, []], 'MAX'), { dates: [], series: [[], []], start: null, end: null });
  assert.deepEqual(alignFunds([first, [point('2023-01-02', 100)]], 'MAX'), { dates: [], series: [[], []], start: null, end: null });
});

test('Growth classification rejects IDCW and dividend options before accepting Growth', () => {
  assert.equal(isGrowthScheme('Example Equity Fund - Direct Plan - Growth'), true);
  assert.equal(isGrowthScheme('Example Equity Fund (GROWTH)'), true);
  assert.equal(isGrowthScheme('Example Equity Fund - IDCW'), false);
  assert.equal(isGrowthScheme('Example Equity Fund - Dividend Reinvestment'), false);
  assert.equal(isGrowthScheme('Example Growth Fund - IDCW'), false);
  assert.equal(isGrowthScheme('Example Fund Growth / Dividend options'), false);
  assert.equal(isGrowthScheme('Example Fund - Payout of Income Distribution cum Capital Withdrawal'), false);
  assert.equal(isGrowthScheme('Example Growthful Fund - Direct Plan'), false);
  assert.equal(isGrowthScheme('Example Fund - Direct Plan'), false);
});

test('rolling percentile interpolates ordered overlapping outcomes without changing their order', () => {
  const input = [
    {start:'2020-01-01',end:'2021-01-01',value:0.40},
    {start:'2020-01-02',end:'2021-01-02',value:-0.20},
    {start:'2020-01-03',end:'2021-01-03',value:0},
    {start:'2020-01-04',end:'2021-01-04',value:0.10},
    {start:'2020-01-05',end:'2021-01-05',value:0.20},
  ];
  const original = structuredClone(input);
  const summary = rollingReturnSummary(input);
  assert.equal(summary.count, 5);
  close(summary.min, -0.2);
  close(summary.p10, -0.12);
  close(summary.median, 0.1);
  close(summary.max, 0.4);
  close(summary.positiveShare, 0.6);
  assert.equal(summary.firstStart, '2020-01-01');
  assert.equal(summary.lastStart, '2020-01-05');
  assert.deepEqual(input, original);
});

test('rolling consistency exposes insufficient observations without an invented success percentage', () => {
  assert.deepEqual(rollingReturnSummary([]), {count:0,min:null,p10:null,median:null,max:null,
    positiveShare:null,firstStart:null,lastStart:null});
  const one = rollingReturnSummary([{start:'2024-01-01',end:'2025-01-01',value:-0.05}]);
  assert.equal(one.count, 1);
  close(one.p10, -0.05);
  assert.equal(one.positiveShare, 0);
});

test('Sortino target is independent of the Sharpe risk-free assumption', () => {
  const points = monthlyHistory(Array.from({length:12}, (_,index)=>index%2===0?0.10:-0.10));
  const combined = riskStats(points, 0.06, undefined, 0);
  const sameTarget = riskStats(points, 0.06);
  close(combined.sharpe, sameTarget.sharpe!);
  assert.notEqual(combined.sortino, sameTarget.sortino);
  const invalidRiskFree = riskStats(points, -1.1, undefined, 0);
  assert.equal(invalidRiskFree.sharpe, null);
  assert.notEqual(invalidRiskFree.sortino, null);
  const invalidTarget = riskStats(points, 0, undefined, Number.NaN);
  assert.notEqual(invalidTarget.sharpe, null);
  assert.equal(invalidTarget.sortino, null);
});
