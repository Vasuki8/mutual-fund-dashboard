import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { monthlyDownsideStats, monthlyReturns } from '../src/lib/analytics.ts';

const item = (year: number, month: number, value: number) =>
  ({ year, month, value, date: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10) });
const close = (actual: number | null, expected: number) => {
  assert.notEqual(actual, null);
  assert.ok(Math.abs(actual! - expected) < 1e-12, `${actual} != ${expected}`);
};

test('insufficient history does not fabricate downside frequencies or tails', () => {
  const stats = monthlyDownsideStats([item(2023, 1, -.2), item(2023, 3, .1)]);
  assert.equal(stats.monthlyCount, 2);
  assert.equal(stats.lossMonths, 1);
  assert.equal(stats.lossShare, null);
  assert.equal(stats.longestLossStreak, null);
  assert.equal(stats.percentile5, null);
  assert.equal(stats.tailMean, null);
  assert.equal(stats.worstMonths.length, 0);
});

test('negative months and streaks do not bridge unobserved calendar months', () => {
  const returns = [
    item(2023, 1, -.03), item(2023, 2, -.02),
    item(2023, 4, -.09), item(2023, 5, -.08), item(2023, 6, -.01),
    ...Array.from({ length: 7 }, (_, i) => item(2023 + Math.floor((i + 6) / 12), (i + 6) % 12 + 1, .02)),
  ];
  const copy = structuredClone(returns);
  const stats = monthlyDownsideStats([...returns].reverse());
  assert.equal(stats.monthlyCount, 12);
  assert.equal(stats.lossMonths, 5);
  close(stats.lossShare, 5 / 12);
  assert.equal(stats.longestLossStreak, 3);
  assert.equal(stats.percentile5, null);
  assert.equal(stats.tailMean, null);
  assert.equal(stats.worstMonths[0].value, -.09);
  assert.deepEqual(returns, copy);
});

test('60-month tail uses interpolated fifth percentile and the worst three actual observations', () => {
  const returns = Array.from({ length: 60 }, (_, i) =>
    item(2020 + Math.floor(i / 12), i % 12 + 1, (i - 30) / 1000));
  const stats = monthlyDownsideStats(returns);
  assert.equal(stats.monthlyCount, 60);
  assert.equal(stats.lossMonths, 30);
  assert.equal(stats.longestLossStreak, 30);
  close(stats.percentile5, (-30 + 59 * 0.05) / 1000);
  close(stats.tailMean, (-30 - 29 - 28) / 3000);
  assert.equal(stats.tailCount, 3);
  assert.deepEqual(stats.worstMonths.map(x => x.value), [-.03, -.029, -.028, -.027, -.026]);
});

test('zero and all-positive histories are valid and missing months are excluded', () => {
  const stats = monthlyDownsideStats(Array.from({ length: 12 }, (_, i) =>
    item(2024, i + 1, i % 2 ? .01 : 0)));
  close(stats.lossShare, 0);
  assert.equal(stats.longestLossStreak, 0);
  assert.equal(stats.tailCount, 0);
});

test('duplicate months, non-finite returns and invalid calendar month input fail closed', () => {
  for (const bad of [
    [item(2023, 1, -.02), item(2023, 1, -.03)],
    [item(2023, 1, NaN)],
    [item(2023, 13, -.02)],
    [item(2023, 1, -1)],
  ]) {
    const stats = monthlyDownsideStats([...bad, ...Array.from({ length: 12 }, (_, i) => item(2024, i + 1, .01))]);
    assert.equal(stats.lossShare, null);
    assert.equal(stats.tailMean, null);
  }
});

test('source month-end selection never invents missing returns for downside counts', () => {
  const source = [
    { date: '2023-12-31', nav: 100 },
    { date: '2024-01-31', nav: 90 },
    { date: '2024-03-31', nav: 80 },
    { date: '2024-04-30', nav: 88 },
  ];
  const returns = monthlyReturns(source, '2024-04-30');
  assert.deepEqual(returns.map(x => x.month), [1, 4]);
  assert.equal(monthlyDownsideStats(returns).monthlyCount, 2);
});

test('risk panel renders the lower-tail labels and explicit eligibility gates', () => {
  const source = readFileSync(new URL('../src/components/FundDetail.tsx', import.meta.url), 'utf8');
  assert.match(source, /Historical monthly downside/);
  assert.match(source, /5th-percentile month/);
  assert.match(source, /Worst 5% mean/);
  assert.match(source, /Worst historical months/);
  assert.match(source, /safe&&downside\.monthlyCount>=12/);
  assert.match(source, /Historical frequencies and tail outcomes do not predict future losses/);
});
