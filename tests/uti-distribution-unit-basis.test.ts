import assert from 'node:assert/strict';
import test from 'node:test';
import { financialNavBasis } from '../src/lib/corporate-actions.ts';
import { isGrowthScheme } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import { localFundReturns } from '../src/lib/fund-sort.ts';
import type { FundData } from '../src/lib/types.ts';
import { UTI_DISTRIBUTION_FIXTURES } from './fixtures/uti-distribution-units.ts';

const WARNING = 'Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked.';
function fixture(index = 0): FundData {
  const spec = UTI_DISTRIBUTION_FIXTURES[index];
  return { meta: { ...spec.meta }, points: spec.dates.map((date, i) => ({ date, nav: spec.navs[i] })),
    warnings: [WARNING], fetchedAt: '2026-10-30T20:01:41.985Z', source: 'mfapi.in', fromCache: true, stale: false };
}
function unchanged(fund: FundData, reason: string): void {
  const before = structuredClone(fund);
  const result = financialNavBasis(fund);
  assert.equal(result.adjusted, false, reason);
  assert.equal(result.fund, fund, reason);
  assert.deepEqual(fund, before, reason);
}

for (const [index, spec] of UTI_DISTRIBUTION_FIXTURES.entries()) {
  test(`UTI ${spec.meta.schemeCode} normalizes only the verified old unit basis`, () => {
    const raw = fixture(index), original = structuredClone(raw);
    const result = financialNavBasis(raw);
    assert.equal(result.adjusted, true);
    assert.equal(result.adjustment?.factor, 0.1);
    assert.equal(result.adjustment?.oldNavThrough, '2026-06-19');
    assert.equal(result.adjustment?.firstNewNavDate, '2026-06-20');
    assert.deepEqual(result.fund.points.map(p => p.date), spec.dates);
    for (const [i, point] of result.fund.points.entries()) {
      assert.ok(Math.abs(point.nav - spec.expectedNavs[i]) < 1e-9);
    }
    assert.equal(qualityBlocked(result.fund), false);
    assert.deepEqual(raw, original, 'source observations and warnings must stay intact');
    assert.notEqual(result.fund.points, raw.points);
    assert.equal(isGrowthScheme(result.fund.meta.schemeName), false);
    unchanged(result.fund, 'a calculation copy must not be adjusted twice');
  });
}

test('UTI distribution identity checks include both ISIN fields and the exact option', () => {
  for (const mutate of [
    (f: FundData) => { f.meta.schemeCode = 102007; },
    (f: FundData) => { f.meta.schemeName += ' - another option'; },
    (f: FundData) => { f.meta.fundHouse = 'Another Mutual Fund'; },
    (f: FundData) => { f.meta.isinGrowth = 'INF789F1AF85'; },
    (f: FundData) => { f.meta.isinDivReinvestment = 'INF789F1AD38'; },
  ]) {
    const raw = fixture(); mutate(raw); unchanged(raw, 'changed identity');
  }
  for (const index of [1, 3]) {
    const raw = fixture(index); raw.meta.isinGrowth = null;
    unchanged(raw, 'a documented payout ISIN cannot be omitted');
  }
  for (const code of [102007, 102008, 102013, 120777]) {
    const raw = fixture(); raw.meta.schemeCode = code;
    unchanged(raw, 'unverified legacy/weekly identity');
  }
});

test('UTI distribution adjustments retain independent evidence and reject incomplete event matches', () => {
  for (const warning of ['Invalid NAV observations excluded: 1.', 'Conflicting NAV values for 1 date(s).']) {
    const raw = fixture(); raw.warnings.push(warning); unchanged(raw, warning);
  }
  const shifted = fixture(); shifted.points[2].date = '2026-06-19'; unchanged(shifted, 'wrong new date');
  const missing = fixture(); missing.points.splice(1, 1); unchanged(missing, 'missing old boundary');
  const differentFactor = fixture(); differentFactor.points[2].nav *= 2; unchanged(differentFactor, 'wrong factor');
  const extra = fixture(); extra.points.push({ date: '2026-06-22', nav: 500 }); unchanged(extra, 'extra unexplained move');
  const alreadyAdjusted = fixture(); alreadyAdjusted.points[0].nav /= 10; alreadyAdjusted.points[1].nav /= 10;
  unchanged(alreadyAdjusted, 'already adjusted values with stale warning');
  const otherWarning = fixture(); otherWarning.warnings.push('Saved history coverage remains incomplete.');
  assert.deepEqual(financialNavBasis(otherWarning).fund.warnings, ['Saved history coverage remains incomplete.']);
});

test('unit-normalized IDCW series remain excluded from consumer return rankings', () => {
  // Synthetic long-span points make ranking returns measurable, so a lost Growth gate would fail this test.
  const raw = fixture();
  raw.points = [{ date: '2020-01-01', nav: 1000 }, { date: '2021-10-29', nav: 1000 },
    { date: '2023-10-29', nav: 1020 }, { date: '2025-10-29', nav: 1080 }, { date: '2026-06-19', nav: 1100 },
    { date: '2026-06-20', nav: 110.01 }, { date: '2026-10-29', nav: 112 }];
  const result = financialNavBasis(raw);
  assert.equal(result.adjusted, true);
  const returns = localFundReturns(result.fund);
  for (const key of ['oneYear', 'threeYear', 'fiveYear', 'threeYearMaxDrawdown'] as const) assert.equal(returns[key], null);
  const growthControl = localFundReturns({ ...result.fund, meta: { ...result.fund.meta, schemeName: 'Synthetic Growth' } });
  assert.notEqual(growthControl.oneYear, null, 'control must prove that the return calculation has usable points');
});
