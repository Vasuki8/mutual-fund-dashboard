import assert from 'node:assert/strict';
import test from 'node:test';
import { simulateSip } from '../src/lib/sip.ts';
import type { NavPoint } from '../src/lib/types.ts';

const nav = (date: string, value: number): NavPoint => ({ date, nav: value });
const approx = (actual: number | null, expected: number, tol = 1e-8) => {
  assert.ok(actual !== null && Math.abs(actual - expected) <= tol, String(actual) + ' != ' + expected);
};

test('historical SIP clamps month ends without drifting after February and purchases fractional units', () => {
  const points = [nav('2024-01-31', 100), nav('2024-02-29', 200), nav('2024-03-31', 100)];
  const result = simulateSip(points, 'MAX', 1000);
  assert.equal(result.reason, null);
  assert.deepEqual(result.contributions.map(item => item.scheduledDate),
    ['2024-01-31', '2024-02-29', '2024-03-31']);
  assert.deepEqual(result.contributions.map(item => item.navDate),
    ['2024-01-31', '2024-02-29', '2024-03-31']);
  assert.equal(result.scheduledCount, 3);
  assert.equal(result.skippedCount, 0);
  approx(result.units, 25);
  approx(result.invested, 3000);
  approx(result.endingValue, 2500);
  approx(result.gain, -500);
  approx(result.gainShare, -1 / 6);
  assert.equal(result.annualizedXirr, null, 'Never annualize cash flows over less than one year.');
  assert.deepEqual(result.timeline.map(point => point.invested), [1000, 2000, 3000]);
  assert.deepEqual(result.timeline.map(point => point.value), [1000, 3000, 2500]);
});

test('uses the first reported NAV after a scheduled date, never a predecessor', () => {
  const points = [nav('2024-01-01', 100), nav('2024-01-31', 500), nav('2024-02-02', 200), nav('2024-03-01', 400)];
  const result = simulateSip(points, 'MAX', 1000);
  assert.equal(result.reason, null);
  assert.deepEqual(result.contributions.map(item => item.navDate),
    ['2024-01-01', '2024-02-02', '2024-03-01']);
  assert.equal(result.contributions[1].nav, 200, 'Must use Feb 2, not Jan 31.');
  assert.equal(result.skippedCount, 0);
});

test('skips missing months; a NAV eight days later is not an executed cash flow', () => {
  const points = [nav('2024-01-01', 100), nav('2024-02-09', 110), nav('2024-03-01', 120)];
  const result = simulateSip(points, 'MAX', 1000);
  assert.deepEqual(result.contributions.map(item => item.scheduledDate),
    ['2024-01-01', '2024-03-01']);
  assert.equal(result.scheduledCount, 3);
  assert.equal(result.skippedCount, 1);
  assert.equal(result.contributions.some(item => item.navDate === '2024-02-09'), false);
  assert.equal(result.navObservations, 3);
});

test('custom range never executes on a preceding chart-baseline NAV', () => {
  const points = [nav('2023-12-29', 100), nav('2024-01-02', 125),
    nav('2024-02-01', 100), nav('2024-03-01', 110), nav('2024-04-01', 120)];
  const result = simulateSip(points, {start: '2024-01-01', end: '2024-03-15'}, 1000);
  assert.equal(result.reason, null);
  assert.equal(result.requestedStart, '2024-01-01');
  assert.equal(result.valuationDate, '2024-03-01');
  assert.equal(result.actualStart, '2024-01-02');
  assert.deepEqual(result.contributions.map(item => item.navDate),
    ['2024-01-02', '2024-02-01', '2024-03-01']);
  assert.deepEqual(result.timeline.map(item => item.date),
    ['2024-01-02', '2024-02-01', '2024-03-01']);
  approx(result.invested, 3000);
  assert.equal(result.annualizedXirr, null);
});

test('constant NAV across one year gives approximately zero money-weighted XIRR', () => {
  const dates = Array.from({length: 13}, (_, month) =>
    new Date(Date.UTC(2023, month, 1)).toISOString().slice(0,10));
  const result = simulateSip(dates.map(date => nav(date, 100)), 'MAX', 1000);
  assert.equal(result.scheduledCount, 13);
  assert.equal(result.contributions.length, 13);
  assert.equal(result.invested, 13000);
  assert.equal(result.endingValue, 13000);
  approx(result.annualizedXirr, 0);
});

test('dated money-weighted return satisfies the independently evaluated cash-flow equation', () => {
  const points = Array.from({length: 13}, (_, month) =>
    nav(new Date(Date.UTC(2023, month, 1)).toISOString().slice(0,10), 100 + month * 5));
  const result = simulateSip(points, 'MAX', 1000);
  const rate = result.annualizedXirr;
  assert.ok(rate !== null && rate > 0, 'Rising NAV creates a positive money-weighted return.');
  const expected = result.contributions.reduce((sum, contribution) =>
    sum + contribution.amount * Math.pow(1 + rate!,
      (Date.parse(result.valuationDate!+'T00:00:00Z') - Date.parse(contribution.navDate+'T00:00:00Z')) / 86400000 / 365),0);
  approx(expected, result.endingValue!, 1e-5);
});

test('unavailable ranges, malformed input, duplicate dates and invalid amounts fail closed', () => {
  assert.match(simulateSip([], 'MAX', 1000).reason ?? '', /No NAV/);
  const list = [nav('2024-01-01', 100), nav('2024-03-01', 110)];
  for (const amount of [-100, 0, Number.NaN, Number.POSITIVE_INFINITY, 10_000_001]) {
    assert.match(simulateSip(list, 'MAX', amount).reason ?? '', /contribution/i);
  }
  assert.match(simulateSip([...list].reverse(), 'MAX', 1000).reason ?? '', /unique, ascending/);
  assert.match(simulateSip([list[0], list[0]], 'MAX', 1000).reason ?? '', /unique, ascending/);
  assert.match(simulateSip([nav('2024-01-01', -1)], 'MAX', 1000).reason ?? '', /positive values/);
  assert.match(simulateSip(list, {start:'2023-01-01',end:'2023-12-01'}, 1000).reason ?? '', /within the requested period/);
  assert.match(simulateSip(list, {start:'2024-04-01',end:'2024-01-01'}, 1000).reason ?? '', /valid custom/);
});

test('no scheduled installment has an eligible NAV and no purchase is fabricated', () => {
  const points = [nav('2024-01-10', 100), nav('2024-02-10', 120), nav('2024-03-10', 125)];
  const result = simulateSip(points, {start:'2024-01-01',end:'2024-03-15'}, 1000);
  assert.match(result.reason ?? '', /None of the scheduled dates/);
  assert.equal(result.scheduledCount, 3);
  assert.equal(result.skippedCount, 3);
  assert.equal(result.contributions.length, 0);
  assert.equal(result.endingValue, null);
  assert.equal(result.annualizedXirr, null);
});

test('custom final NAV never includes a newer observation beyond the end date', () => {
  const points=[nav('2023-01-01',100), nav('2024-01-01',200), nav('2025-01-01',50)];
  const fixed=simulateSip(points,{start:'2023-01-01',end:'2024-01-01'},1000);
  assert.equal(fixed.valuationDate,'2024-01-01');
  assert.equal(fixed.timeline.at(-1)?.date,'2024-01-01');
  assert.ok(fixed.contributions.every(row=>row.navDate<='2024-01-01'));
  assert.equal(simulateSip(points,'MAX',1000).valuationDate,'2025-01-01');
});


test('extreme NAV units never turn into an infinite simulated return or value', () => {
  const result = simulateSip([nav('2024-01-01', Number.MIN_VALUE),
    nav('2024-02-01', Number.MIN_VALUE)], 'MAX', 1000);
  assert.match(result.reason ?? '', /safe numeric range/);
  assert.equal(result.endingValue, null);
  assert.equal(result.annualizedXirr, null);
});
