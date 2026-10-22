import assert from 'node:assert/strict';
import { test } from 'node:test';
import { absoluteReturn, alignFunds, monthlyReturns, riskStats, selectPeriod, selectRange, validateDateRange } from '../src/lib/analytics.ts';
import type { NavPoint, Period } from '../src/lib/types.ts';

const point = (date: string, nav = 100): NavPoint => ({ date, nav });

test('date ranges accept real Gregorian dates, leap years, and equal boundaries', () => {
  for (const range of [
    { start: '2024-01-01', end: '2024-12-31' },
    { start: '2024-02-29', end: '2024-02-29' },
    { start: '2000-02-29', end: '2400-02-29' },
    { start: '0001-01-01', end: '9999-12-31' },
  ]) assert.equal(validateDateRange(range), null, JSON.stringify(range));
});

test('date ranges require both boundaries', () => {
  for (const range of [
    { start: '', end: '' },
    { start: '', end: '2024-03-01' },
    { start: '2024-03-01', end: '' },
  ]) assert.match(validateDateRange(range) ?? '', /both.*start.*end/i);
});

test('date ranges reject malformed ISO dates without trimming or coercion', () => {
  for (const value of ['2024-2-01', '2024-02-1', '01-02-2024', '2024-02-01T00:00:00Z', ' 2024-02-01', '2024-02-01 ', '2024-02-01\n', '2024-02-01\r\n', 'not-a-date']) {
    assert.match(validateDateRange({ start: value, end: '2024-12-31' }) ?? '', /start date.*YYYY-MM-DD/i, value);
    assert.match(validateDateRange({ start: '2024-01-01', end: value }) ?? '', /end date.*YYYY-MM-DD/i, value);
  }
});

test('date ranges reject calendar overflows and years outside 0001 through 9999', () => {
  for (const value of ['2023-02-29', '1900-02-29', '2100-02-29', '2024-04-31', '2024-00-10', '2024-13-01', '2024-01-00', '2024-01-32', '0000-01-01', '10000-01-01']) {
    assert.match(validateDateRange({ start: value, end: '9999-12-31' }) ?? '', /start date.*valid/i, value);
    assert.match(validateDateRange({ start: '0001-01-01', end: value }) ?? '', /end date.*valid/i, value);
  }
});

test('date ranges explain reversed boundaries', () => {
  assert.match(validateDateRange({ start: '2024-03-02', end: '2024-03-01' }) ?? '', /start date.*on or before.*end date/i);
});

test('custom ranges use exact boundaries and preserve point identity and input order', () => {
  const points = [point('2024-01-02', 90), point('2024-01-05', 100), point('2024-01-08', 110), point('2024-01-10', 120), point('2024-01-11', 130)];
  const snapshot = [...points];
  const selected = selectRange(points, { start: '2024-01-05', end: '2024-01-10' });
  assert.deepEqual(selected, points.slice(1, 4));
  assert.equal(selected[0], points[1]);
  assert.equal(selected[2], points[3]);
  assert.notEqual(selected, points);
  assert.deepEqual(points, snapshot);
});

test('a weekend start can use the preceding Friday when the interval has a later observation', () => {
  const points = [point('2024-01-04'), point('2024-01-05'), point('2024-01-08'), point('2024-01-10')];
  assert.deepEqual(selectRange(points, { start: '2024-01-06', end: '2024-01-09' }), points.slice(1, 3));
});

test('a custom start includes a predecessor exactly seven calendar days earlier', () => {
  const points = [point('2024-01-01'), point('2024-01-11'), point('2024-01-15')];
  assert.deepEqual(selectRange(points, { start: '2024-01-08', end: '2024-01-15' }), points);
});

test('a custom start skips an eight-day-old predecessor and exposes the shorter range', () => {
  const points = [point('2024-01-01'), point('2024-01-11'), point('2024-01-15')];
  assert.deepEqual(selectRange(points, { start: '2024-01-09', end: '2024-01-15' }), points.slice(1));
});

test('a custom end uses only NAVs on or before the requested date', () => {
  const points = [point('2024-01-02'), point('2024-01-05'), point('2024-01-08')];
  assert.deepEqual(selectRange(points, { start: '2024-01-02', end: '2024-01-07' }), points.slice(0, 2));
});

test('custom ranges can shorten either boundary to the available history', () => {
  const points = [point('2024-01-05'), point('2024-01-08'), point('2024-01-10')];
  assert.deepEqual(selectRange(points, { start: '2023-01-01', end: '2024-01-08' }), points.slice(0, 2));
  assert.deepEqual(selectRange(points, { start: '2024-01-08', end: '2025-01-01' }), points.slice(1));
  assert.deepEqual(selectRange(points, { start: '2023-01-01', end: '2025-01-01' }), points);
});

test('custom ranges never replace empty or entirely out-of-history selections with all history', () => {
  const points = [point('2024-01-05'), point('2024-01-08')];
  assert.deepEqual(selectRange([], { start: '2024-01-01', end: '2024-01-31' }), []);
  assert.deepEqual(selectRange(points, { start: '2023-01-01', end: '2024-01-04' }), []);
  assert.deepEqual(selectRange(points, { start: '2024-01-09', end: '2024-01-10' }), []);
  assert.deepEqual(selectRange(points, { start: '2024-02-01', end: '2024-03-01' }), []);
});

test('a weekend-only interval with no reported NAV is empty despite an eligible Friday baseline', () => {
  const points = [point('2024-01-05'), point('2024-01-08')];
  assert.deepEqual(selectRange(points, { start: '2024-01-06', end: '2024-01-07' }), []);
});

test('a one-day custom range retains an exact observation but cannot establish a return', () => {
  const points = [point('2024-01-04'), point('2024-01-05'), point('2024-01-08')];
  const selected = selectRange(points, { start: '2024-01-05', end: '2024-01-05' });
  assert.deepEqual(selected, [points[1]]);
  assert.equal(absoluteReturn(selected), null);
  assert.deepEqual(selectRange(points, { start: '2024-01-06', end: '2024-01-06' }), []);
});

test('invalid custom ranges return an empty selection', () => {
  const points = [point('2024-01-05'), point('2024-01-08')];
  for (const range of [
    { start: '', end: '2024-01-08' },
    { start: '2024-01-05', end: '' },
    { start: '2024-01-09', end: '2024-01-05' },
    { start: '2023-02-29', end: '2024-01-08' },
    { start: '2024-01-05', end: '2024-1-08' },
  ]) assert.deepEqual(selectRange(points, range), [], JSON.stringify(range));
});

test('preset range selection retains every existing preset contract', () => {
  const points = [point('2018-12-31'), point('2019-02-28'), point('2021-02-26'), point('2023-02-28'), point('2023-08-31'), point('2023-11-30'), point('2024-01-31'), point('2024-02-29')];
  const periods: Period[] = ['1M', '3M', '6M', '1Y', '3Y', '5Y', 'MAX'];
  for (const period of periods) {
    assert.deepEqual(selectRange(points, period), selectPeriod(points, period), period);
    assert.deepEqual(selectRange([], period), [], period);
  }
});

test('custom comparison intersects actual dates before choosing its eligible starting baseline', () => {
  const first = [point('2024-01-01', 90), point('2024-01-05', 100), point('2024-01-06', 105), point('2024-01-10', 110), point('2024-01-15', 120)];
  const second = [point('2024-01-01', 100), point('2024-01-04', 110), point('2024-01-06', 115), point('2024-01-10', 120), point('2024-01-15', 125), point('2024-01-16', 130)];
  const aligned = alignFunds([first, second], { start: '2024-01-05', end: '2024-01-12' });
  assert.deepEqual(aligned.dates, ['2024-01-01', '2024-01-06', '2024-01-10']);
  assert.equal(aligned.start, '2024-01-01');
  assert.equal(aligned.end, '2024-01-10');
  assert.deepEqual(aligned.series.map(points => points.map(point => point.date)), [aligned.dates, aligned.dates]);
  assert.equal(aligned.series[0][0], first[0]);
  assert.equal(aligned.series[1][0], second[0]);
});

test('custom comparison rejects stale common predecessors even if individual funds have nearer dates', () => {
  const first = [point('2024-01-01'), point('2024-01-08'), point('2024-01-12'), point('2024-01-15')];
  const second = [point('2024-01-01'), point('2024-01-07'), point('2024-01-12'), point('2024-01-16')];
  const aligned = alignFunds([first, second], { start: '2024-01-09', end: '2024-01-15' });
  assert.deepEqual(aligned.dates, ['2024-01-12']);
  assert.equal(aligned.start, '2024-01-12');
  assert.equal(aligned.end, '2024-01-12');
});

test('custom comparison keeps an empty result when the requested interval contains no common observation', () => {
  const first = [point('2024-01-01'), point('2024-01-05'), point('2024-01-10')];
  const second = [point('2024-01-01'), point('2024-01-06'), point('2024-01-10')];
  const empty = { dates: [], series: [[], []], start: null, end: null };
  assert.deepEqual(alignFunds([first, second], { start: '2024-01-05', end: '2024-01-06' }), empty);
  assert.deepEqual(alignFunds([first, second], { start: '2024-02-01', end: '2024-03-01' }), empty);
  assert.deepEqual(alignFunds([first, second], { start: '2024-01-10', end: '2024-01-01' }), empty);
  assert.deepEqual(alignFunds([first, []], { start: '2024-01-01', end: '2024-01-31' }), empty);
  assert.deepEqual(alignFunds([], { start: '2024-01-01', end: '2024-01-31' }), { ...empty, series: [] });
});

test('a custom cutoff excludes a historical partial month even after the wall clock advances', context => {
  const points = [point('2023-12-31', 100), point('2024-01-31', 110), point('2024-02-27', 121)];
  context.mock.method(Date, 'now', () => Date.parse('2025-01-01T00:00:00Z'));
  assert.deepEqual(monthlyReturns(points, '2024-02-27').map(value => value.month), [1]);
  context.mock.method(Date, 'now', () => Date.parse('2026-01-01T00:00:00Z'));
  assert.deepEqual(monthlyReturns(points, '2024-02-27').map(value => value.month), [1]);
  assert.deepEqual(monthlyReturns(points).map(value => value.month), [1, 2]);
});

test('a future custom end does not complete the current calendar month early', context => {
  context.mock.method(Date, 'now', () => Date.parse('2024-01-26T12:00:00Z'));
  const points = [point('2023-12-31', 100), point('2024-01-26', 110)];
  assert.deepEqual(monthlyReturns(points), []);
  for (const throughDate of ['2024-01-31', '2024-12-31']) {
    assert.deepEqual(monthlyReturns(points, throughDate), [], throughDate);
  }
  context.mock.method(Date, 'now', () => Date.parse('2024-02-01T00:00:00Z'));
  assert.deepEqual(monthlyReturns(points, '2024-01-31').map(value => value.month), [1]);
});

test('a custom cutoff excludes every month whose calendar end is after it', () => {
  const points = [point('2023-12-31', 100), point('2024-01-31', 110), point('2024-02-29', 121), point('2024-03-31', 133.1)];
  assert.deepEqual(monthlyReturns(points, '2024-01-31').map(value => value.month), [1]);
  assert.deepEqual(monthlyReturns(points, '2024-01-30'), []);
});

test('a weekend month end counts only when the requested cutoff reaches the calendar boundary', context => {
  context.mock.method(Date, 'now', () => Date.parse('2025-01-01T00:00:00Z'));
  const points = [point('2024-01-31', 100), point('2024-02-29', 110), point('2024-03-29', 121)];
  assert.deepEqual(monthlyReturns(points, '2024-03-30').map(value => value.month), [2]);
  const complete = monthlyReturns(points, '2024-03-31');
  assert.deepEqual(complete.map(value => value.month), [2, 3]);
  assert.equal(complete[1].date, '2024-03-29');
  assert.ok(Math.abs(complete[1].value - 0.1) < 1e-12);
});

test('custom complete months retain the seven-day limit and never bridge missing or stale month ends', () => {
  const points = [point('2023-12-24', 100), point('2024-01-24', 110), point('2024-02-21', 120), point('2024-03-29', 130), point('2024-04-30', 143), point('2024-06-30', 150)];
  const returns = monthlyReturns(points, '2024-06-30');
  assert.deepEqual(returns.map(({ month, date }) => ({ month, date })), [
    { month: 1, date: '2024-01-24' },
    { month: 4, date: '2024-04-30' },
  ]);
  returns.forEach(value => assert.ok(Math.abs(value.value - 0.1) < 1e-12));
});

test('custom risk ratios remain unavailable when a partial final month leaves only eleven complete returns', context => {
  context.mock.method(Date, 'now', () => Date.parse('2025-01-01T00:00:00Z'));
  let nav = 100;
  const points = [point('2022-12-31', nav), ...Array.from({ length: 12 }, (_, index) => {
    nav *= 1 + (index % 2 === 0 ? 0.02 : -0.01);
    const date = index === 11 ? '2023-12-27' : new Date(Date.UTC(2023, index + 1, 0)).toISOString().slice(0, 10);
    return point(date, nav);
  })];
  const stats = riskStats(points, 0.06, '2023-12-27');
  assert.equal(stats.monthlyCount, 11);
  assert.equal(stats.positiveMonths, 6);
  assert.equal(stats.volatility, null);
  assert.equal(stats.sharpe, null);
  assert.equal(stats.sortino, null);
  assert.ok(riskStats(points, 0.06).volatility! > 0);
  assert.deepEqual(riskStats(points, 0.06, '2023-12-31'), riskStats(points, 0.06));
});

test('custom risk summaries exclude the return of a partial final month', context => {
  context.mock.method(Date, 'now', () => Date.parse('2025-01-01T00:00:00Z'));
  const points = [point('2023-12-31', 100), point('2024-01-31', 110), point('2024-02-27', 55)];
  const stats = riskStats(points, 0, '2024-02-27');
  assert.equal(stats.monthlyCount, 1);
  assert.equal(stats.positiveMonths, 1);
  assert.ok(Math.abs(stats.bestMonth! - 0.1) < 1e-12);
  assert.ok(Math.abs(stats.worstMonth! - 0.1) < 1e-12);
});

test('a future custom end cannot count the current month toward the twelve-return risk threshold', context => {
  context.mock.method(Date, 'now', () => Date.parse('2024-12-27T12:00:00Z'));
  let nav = 100;
  const points = [point('2023-12-31', nav), ...Array.from({ length: 12 }, (_, index) => {
    nav *= 1 + (index % 2 === 0 ? 0.02 : -0.01);
    const date = index === 11 ? '2024-12-27' : new Date(Date.UTC(2024, index + 1, 0)).toISOString().slice(0, 10);
    return point(date, nav);
  })];
  const stats = riskStats(points, 0.06, '2024-12-31');
  assert.equal(stats.monthlyCount, 11);
  assert.equal(stats.volatility, null);
  assert.equal(stats.sharpe, null);
  assert.equal(stats.sortino, null);
  assert.deepEqual(stats, riskStats(points, 0.06));
  context.mock.method(Date, 'now', () => Date.parse('2025-01-01T00:00:00Z'));
  const complete = riskStats(points, 0.06, '2024-12-31');
  assert.equal(complete.monthlyCount, 12);
  assert.ok(complete.volatility! > 0);
});
