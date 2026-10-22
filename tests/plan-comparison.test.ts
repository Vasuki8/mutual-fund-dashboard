import assert from 'node:assert/strict';
import { test } from 'node:test';
import { alignFunds } from '../src/lib/analytics.ts';
import { planStrategyKey, summarizePlanNavDifference } from '../src/lib/plan-comparison.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';

const nav = (date: string, value: number): NavPoint => ({ date, nav: value });
type Options = { name?: string; house?: string; category?: string; type?: string;
  points?: NavPoint[]; warnings?: string[]; stale?: boolean; code?: number };

function fund(plan: 'Direct' | 'Regular', ending: number, options: Options = {}): FundData {
  const code = options.code ?? (plan === 'Direct' ? 100001 : 100002);
  return {
    meta: {
      schemeCode: code,
      schemeName: options.name ?? ('Example Flexi Cap Fund - ' + plan + ' Plan - Growth' + (plan === 'Direct' ? ' Option' : '')),
      fundHouse: options.house ?? 'Example Asset Management',
      schemeCategory: options.category ?? 'Equity Scheme - Flexi Cap Fund',
      schemeType: options.type ?? 'Open Ended Schemes',
    },
    points: options.points ?? [
      nav('2023-01-02', plan === 'Direct' ? 100 : 40),
      nav('2023-06-02', plan === 'Direct' ? 110 : 42),
      nav('2024-01-02', ending),
    ],
    fetchedAt: '2024-01-03T00:00:00Z',
    source: 'mfapi.in', fromCache: false, stale: options.stale ?? false,
    warnings: options.warnings ?? [],
  };
}
const direct = fund('Direct', 120);
const regular = fund('Regular', 44);
const common = (funds: FundData[]) => alignFunds(funds.map(f => f.points), 'MAX');
const close = (value: number, expected: number) => assert.ok(Math.abs(value - expected) <= 1e-10,
  String(value) + ' differs from ' + expected);

test('conservative strategy name normalization preserves material name distinctions', () => {
  assert.equal(planStrategyKey('Example Flexi Cap Fund - Direct Plan - Growth Option'),
    planStrategyKey('Example Flexi Cap Fund - Regular Plan - Growth'));
  assert.notEqual(planStrategyKey('Example Flexi Cap Fund - Direct Plan - Growth'),
    planStrategyKey('Example Small Cap Fund - Regular Plan - Growth'));
  assert.notEqual(planStrategyKey('Example Value Fund - Direct Plan - Growth'),
    planStrategyKey('Example Growth Fund - Regular Plan - Growth'));
});

test('paired annualized results use normalized wealth, not incomparable raw NAV levels', () => {
  const pair = [regular, direct]; // Reverse order deliberately.
  const result = summarizePlanNavDifference(pair, common(pair));
  assert.equal(result.applicable, true);
  assert.equal(result.reason, null);
  const m = result.metrics!;
  assert.equal(m.directIndex, 1);
  assert.equal(m.regularIndex, 0);
  assert.equal(m.measure, 'CAGR');
  assert.equal(m.start, '2023-01-02');
  assert.equal(m.end, '2024-01-02');
  assert.equal(m.elapsedDays, 365);
  assert.equal(m.observationCount, 3);
  close(m.directReturn, .2);
  close(m.regularReturn, .1);
  close(m.returnDifference, .1);
  close(m.directEndingValue, 12_000);
  close(m.regularEndingValue, 11_000);
  close(m.endingValueDifference, 1_000);
});

test('short intervals use absolute returns and do not invent an annualized spread', () => {
  const pair = [
    fund('Direct', 110, { points: [nav('2024-01-01',100), nav('2024-06-01',110)] }),
    fund('Regular', 105, { points: [nav('2024-01-01',100), nav('2024-06-01',105)] }),
  ];
  const result = summarizePlanNavDifference(pair, common(pair));
  assert.equal(result.metrics?.measure, 'Absolute return');
  close(result.metrics!.returnDifference, .05);
  close(result.metrics!.endingValueDifference, 500);
});

test('selected custom date boundaries are respected and future NAVs are excluded', () => {
  const pair = [
    fund('Direct', 130, { points: [nav('2023-12-29',100), nav('2024-01-03',105),
      nav('2024-06-28',111), nav('2024-07-03',130)] }),
    fund('Regular', 70, { points: [nav('2023-12-29',50), nav('2024-01-03',52),
      nav('2024-06-28',54), nav('2024-07-03',70)] }),
  ];
  const aligned = alignFunds(pair.map(f => f.points), { start: '2024-01-01', end: '2024-06-30' });
  assert.deepEqual(aligned.dates, ['2023-12-29','2024-01-03','2024-06-28']);
  const result = summarizePlanNavDifference(pair, aligned);
  assert.equal(result.metrics?.end, '2024-06-28');
  close(result.metrics!.directReturn, .11);
  close(result.metrics!.regularReturn, .08);
});

test('unrelated strategies, AMC or categories are not assumed to be plan pairs', () => {
  const cases: [FundData, RegExp][] = [
    [fund('Regular', 44, { name: 'Example Large Cap Fund - Regular Plan - Growth' }), /names differ/],
    [fund('Regular', 44, { house: 'Other AMC' }), /fund house/],
    [fund('Regular', 44, { category: 'Equity Scheme - Large Cap Fund' }), /category/],
    [fund('Regular', 44, { type: 'Close Ended Schemes' }), /scheme type/],
    [fund('Regular', 44, { name: 'Example Flexi Cap Fund - Regular - Growth' }), /explicitly identify/],
    [fund('Regular', 44, { name: 'Example Flexi Cap Fund - Regular Plan - Growth IDCW' }), /Growth options/],
    [fund('Regular', 44, { warnings: ['Conflicting NAV values occur on a duplicate date.'] }), /NAV-quality/],
    [fund('Regular', 44, { code: 100001 }), /distinct/],
  ];
  for (const [other, reason] of cases) {
    const pair = [direct,other];
    const result = summarizePlanNavDifference(pair, common(pair));
    assert.equal(result.applicable, true, other.meta.schemeName);
    assert.equal(result.metrics, null);
    assert.match(result.reason ?? '', reason);
  }
});

test('unrelated peer comparisons are not overloaded with a false plan comparison', () => {
  const samePlan = [direct, fund('Direct', 130, {code:100003,name:'Example Other Fund - Direct Plan - Growth'})];
  assert.equal(summarizePlanNavDifference(samePlan, common(samePlan)).applicable, false);
  assert.equal(summarizePlanNavDifference([direct], common([direct])).applicable, false);
  assert.equal(summarizePlanNavDifference([direct,regular,direct], common([direct,regular,direct])).applicable, false);
});

test('absent exact common dates and malformed alignment fail closed without interpolation', () => {
  const pair = [
    fund('Direct',120, {points:[nav('2023-01-01',100),nav('2024-01-01',120)]}),
    fund('Regular',44, {points:[nav('2023-01-02',40),nav('2024-01-02',44)]}),
  ];
  const noDates = summarizePlanNavDifference(pair, common(pair));
  assert.equal(noDates.metrics, null);
  assert.match(noDates.reason ?? '', /identical reported NAV dates/);
  const valid = common([direct,regular]);
  const invalid = { ...valid, series: valid.series.map(p=>p.slice()) };
  invalid.series[0][1] = nav('2023-06-03',110);
  const result = summarizePlanNavDifference([direct,regular], invalid);
  assert.equal(result.metrics, null);
  assert.match(result.reason ?? '', /invalid, nonunique or mismatched/);
});

test('stale but validated NAVs stay eligible with a clear stale count', () => {
  const pair = [direct, fund('Regular',44,{stale:true})];
  const result = summarizePlanNavDifference(pair, common(pair));
  assert.equal(result.staleCount, 1);
  assert.ok(result.metrics);
});
