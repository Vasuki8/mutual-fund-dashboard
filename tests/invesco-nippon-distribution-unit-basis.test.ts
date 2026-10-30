import assert from 'node:assert/strict';
import test from 'node:test';
import { financialNavBasis } from '../src/lib/corporate-actions.ts';
import { isGrowthScheme } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import { archivedFundReturns, localFundReturns } from '../src/lib/fund-sort.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';
import type { HistoryDocument } from '../server/types.ts';
import {
  DISTRIBUTION_UNIT_FIXTURES,
  EXCLUDED_DISTRIBUTION_IDENTITIES,
} from './fixtures/invesco-nippon-distribution-units.ts';
import type { DistributionUnitFixture } from './fixtures/invesco-nippon-distribution-units.ts';

const ONE_MOVE = 'Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked.';
const TWO_MOVES = 'Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.';
const COVERAGE_WARNING = 'Saved history coverage remains incomplete.';
const RETURN_FIELDS = ['oneYear', 'threeYear', 'fiveYear', 'threeYearMaxDrawdown'] as const;

function fixture(spec: DistributionUnitFixture): FundData {
  return {
    meta: { ...spec.meta }, points: spec.dates.map((date, i) => ({ date, nav: spec.navs[i] })),
    warnings: [ONE_MOVE], fetchedAt: spec.fetchedAt, sourceObservedAt: spec.sourceObservedAt,
    source: 'mfapi.in', fromCache: true, stale: false,
  };
}

function freezeFund(fund: FundData): FundData {
  Object.freeze(fund.meta);
  for (const point of fund.points) Object.freeze(point);
  Object.freeze(fund.points);
  Object.freeze(fund.warnings);
  return Object.freeze(fund);
}

function unchanged(fund: FundData, reason: string): void {
  const original = structuredClone(fund);
  const result = financialNavBasis(freezeFund(fund));
  assert.equal(result.adjusted, false, reason);
  assert.equal(result.fund, fund, reason);
  assert.deepEqual(fund, original, `${reason}: raw observations and warnings must remain unchanged`);
}

function countLargeMoves(points: NavPoint[]): number {
  return points.slice(1).filter((point, i) => Math.abs(point.nav / points[i].nav - 1) > 0.4).length;
}

function offsetDate(date: string, days: number): string {
  return new Date(Date.parse(date + 'T00:00:00Z') + days * 86_400_000).toISOString().slice(0, 10);
}

// Test-only archive-shaped control. An unresolved=false control isolates the
// consumer's Growth rule; it does not persist a calculation copy into the archive.
function archiveControl(fund: FundData): HistoryDocument {
  const meta = fund.meta;
  return {
    version: 1, schemeCode: meta.schemeCode, fetchedAt: fund.fetchedAt,
    archivedAt: fund.sourceObservedAt ?? fund.fetchedAt,
    coverageStart: fund.points[0].date, coverageEnd: fund.points.at(-1)!.date,
    unresolved: false, warnings: [],
    payload: {
      status: 'SUCCESS',
      meta: {
        scheme_code: meta.schemeCode, scheme_name: meta.schemeName, fund_house: meta.fundHouse,
        scheme_type: meta.schemeType, scheme_category: meta.schemeCategory,
        isin_growth: meta.isinGrowth, isin_div_reinvestment: meta.isinDivReinvestment,
      },
      data: fund.points.map(point => ({
        date: point.date.slice(8, 10) + '-' + point.date.slice(5, 7) + '-' + point.date.slice(0, 4),
        nav: String(point.nav),
      })).reverse(),
    },
  };
}

for (const [index, spec] of DISTRIBUTION_UNIT_FIXTURES.entries()) {
  const code = spec.meta.schemeCode;
  test(`${code} changes only its documented pre-event denomination and refuses a second adjustment`, () => {
    const raw = fixture(spec), original = structuredClone(raw);
    assert.equal(countLargeMoves(raw.points), 1, 'the literal source window contains exactly the verified event');
    const result = financialNavBasis(freezeFund(raw));
    assert.equal(result.adjusted, true, `${code}: the exact primary-supported identity must be registered`);
    assert.equal(result.adjustment?.schemeCode, code);
    assert.equal(result.adjustment?.factor, 100);
    assert.equal(result.adjustment?.oldNavThrough, spec.oldNavThrough);
    assert.equal(result.adjustment?.firstNewNavDate, spec.firstNewNavDate);
    assert.equal(result.fund.points.length, spec.dates.length);
    assert.deepEqual(result.fund.points.map(point => point.date), spec.dates);
    for (const [i, point] of result.fund.points.entries()) {
      assert.ok(Math.abs(point.nav - spec.expectedNavs[i]) < 1e-9,
        `${code} ${point.date}: NAV must match the independently calculated Decimal value`);
    }
    assert.deepEqual(result.fund.points.slice(2), original.points.slice(2), 'new-basis observations are unchanged');
    const boundaryReturn = result.fund.points[2].nav / result.fund.points[1].nav - 1;
    assert.ok(Math.abs(boundaryReturn - spec.expectedBoundaryReturnFraction) < 1e-12,
      'documented factor must preserve the independent observed economic return');
    assert.equal(countLargeMoves(result.fund.points), 0);
    assert.equal(qualityBlocked(result.fund), false);
    assert.deepEqual(result.fund.warnings, []);
    assert.deepEqual(result.fund.meta, original.meta);
    assert.notEqual(result.fund.points, raw.points);
    assert.deepEqual(raw, original, 'raw NAVs, dates, metadata and warnings are immutable');
    assert.equal(isGrowthScheme(result.fund.meta.schemeName), false);
    unchanged(result.fund, `${code}: a calculation copy must not be normalized twice`);
  });

  test(`${code} requires its code, full option name, house and both exact ISIN fields`, () => {
    const otherCode = DISTRIBUTION_UNIT_FIXTURES[(index + 1) % DISTRIBUTION_UNIT_FIXTURES.length].meta.schemeCode;
    const mutations: [string, (fund: FundData) => void][] = [
      ['another valid scheme code', fund => { fund.meta.schemeCode = otherCode; }],
      ['another full option name', fund => { fund.meta.schemeName += ' - unverified sibling'; }],
      ['another fund house', fund => { fund.meta.fundHouse = 'Another Mutual Fund'; }],
    ];
    for (const field of ['isinGrowth', 'isinDivReinvestment'] as const) {
      mutations.push([`${field}: replacement value`, fund => { fund.meta[field] = 'INF000000001'; }]);
      mutations.push([`${field}: omitted field`, fund => { delete fund.meta[field]; }]);
      if (spec.meta[field] !== null) {
        mutations.push([`${field}: missing documented ISIN`, fund => { fund.meta[field] = null; }]);
      }
    }
    for (const [reason, mutate] of mutations) {
      const raw = fixture(spec); mutate(raw);
      unchanged(raw, `${code}: ${reason}`);
    }
  });

  test(`${code} remains excluded from local and archived consumer rankings despite usable long-span data`, () => {
    // These synthetic post-event observations deliberately provide exact 1Y/3Y/5Y
    // baselines and a decline. Missing coverage cannot explain null ranking values.
    const tail: NavPoint[] = [
      { date: '2021-10-29', nav: 1200 }, { date: '2023-10-29', nav: 1250 },
      { date: '2024-10-29', nav: 1225 }, { date: '2025-10-29', nav: 1300 },
      { date: '2026-10-29', nav: 1400 },
    ];
    const raw = fixture(spec); raw.points.push(...tail);
    assert.equal(countLargeMoves(raw.points), 1, 'the long-span fixture must not introduce a second event');
    const control: FundData = {
      ...raw, meta: { ...raw.meta, schemeName: 'Synthetic Growth' }, warnings: [],
      points: [...spec.dates.map((date, i) => ({ date, nav: spec.expectedNavs[i] })), ...tail],
    };
    const localGrowth = localFundReturns(control), archivedGrowth = archivedFundReturns(archiveControl(control));
    assert.ok(archivedGrowth, 'archive Growth control must be eligible');
    for (const field of RETURN_FIELDS) {
      assert.ok(typeof localGrowth[field] === 'number' && Number.isFinite(localGrowth[field]), `${field}: usable local Growth control`);
      assert.ok(typeof archivedGrowth[field] === 'number' && Number.isFinite(archivedGrowth[field]), `${field}: usable archive Growth control`);
    }
    assert.ok(localGrowth.oneYear! > 0 && localGrowth.threeYear! > 0 && localGrowth.fiveYear! > 0);
    assert.ok(localGrowth.threeYearMaxDrawdown! < 0, 'drawdown control must contain a measurable decline');
    const result = financialNavBasis(freezeFund(raw));
    assert.equal(result.adjusted, true, 'ranking exclusion is checked after successful unit normalization');
    assert.equal(qualityBlocked(result.fund), false, 'the Growth rule must be the remaining consumer gate');
    const ranking = localFundReturns(result.fund);
    for (const field of RETURN_FIELDS) assert.equal(ranking[field], null, `${field}: IDCW is not total return`);
    assert.equal(archivedFundReturns(archiveControl(result.fund)), null, 'archive consumer also retains its Growth rule');
  });
}

// Both observed February first-new dates are represented, in addition to the
// April and August groups. Positive cases above cover every individual identity.
const representativeCodes = [104484, 104725, 105190, 100838];
const representatives = representativeCodes.map(code => DISTRIBUTION_UNIT_FIXTURES.find(spec => spec.meta.schemeCode === code)!);

for (const spec of representatives) {
  const code = spec.meta.schemeCode;
  test(`${code} rejects missing or wrong old/new boundary observations`, () => {
    const mutations: [string, (fund: FundData) => void][] = [
      ['missing old boundary', fund => { fund.points.splice(1, 1); }],
      ['missing new boundary', fund => { fund.points.splice(2, 1); }],
      ['wrong old boundary date', fund => { fund.points[1].date = offsetDate(spec.oldNavThrough, 1); }],
      ['wrong new boundary date', fund => { fund.points[2].date = offsetDate(spec.firstNewNavDate, -1); }],
    ];
    for (const [reason, mutate] of mutations) {
      const raw = fixture(spec); mutate(raw);
      assert.equal(countLargeMoves(raw.points), 1, `${reason}: retain one event to isolate the date guard`);
      unchanged(raw, `${code}: ${reason}`);
    }
  });

  test(`${code} rejects factors outside its bound without introducing an extra event`, () => {
    for (const direction of [-1, 1]) {
      const raw = fixture(spec), wrongRatio = 100 + direction * spec.maxFactorDeviation * 2;
      const multiplier = wrongRatio / (raw.points[2].nav / raw.points[1].nav);
      // Move every new-basis value together. A lone changed point could create
      // a second jump and accidentally test event count instead of factor bounds.
      for (const point of raw.points.slice(2)) point.nav *= multiplier;
      assert.equal(countLargeMoves(raw.points), 1, 'wrong factor still has exactly one large move');
      assert.ok(Math.abs(raw.points[2].nav / raw.points[1].nav - 100) > spec.maxFactorDeviation);
      unchanged(raw, `${code}: factor ${wrongRatio} is outside the documented bound`);
    }
  });

  test(`${code} refuses an unmatched extra event with an accurate two-move warning`, () => {
    const raw = fixture(spec), last = raw.points.at(-1)!;
    raw.points.push({ date: offsetDate(last.date, 1), nav: last.nav * 2 });
    raw.warnings = [TWO_MOVES];
    assert.equal(countLargeMoves(raw.points), 2);
    unchanged(raw, `${code}: a single unit action cannot explain two real moves`);
  });

  test(`${code} detects an extra event even when the saved move warning is stale`, () => {
    const raw = fixture(spec), last = raw.points.at(-1)!;
    raw.points.push({ date: offsetDate(last.date, 1), nav: last.nav * 2 });
    assert.equal(countLargeMoves(raw.points), 2);
    unchanged(raw, `${code}: actual points must be checked independently of the warning count`);
  });

  test(`${code} retains independent invalid and conflicting-value warnings`, () => {
    for (const warning of ['Invalid NAV observations excluded: 1.', 'Conflicting NAV values for 1 date(s).']) {
      const raw = fixture(spec); raw.warnings.push(warning);
      unchanged(raw, `${code}: ${warning}`);
    }
  });

  test(`${code} preserves nonquality evidence on the successful calculation copy`, () => {
    const raw = fixture(spec); raw.warnings.push(COVERAGE_WARNING);
    const original = structuredClone(raw), result = financialNavBasis(freezeFund(raw));
    assert.equal(result.adjusted, true);
    assert.deepEqual(result.fund.warnings, [COVERAGE_WARNING]);
    assert.deepEqual(raw, original);
  });

  test(`${code} refuses already-normalized values carrying a stale discontinuity warning`, () => {
    const raw = fixture(spec);
    raw.points = spec.dates.map((date, i) => ({ date, nav: spec.expectedNavs[i] }));
    assert.equal(countLargeMoves(raw.points), 0);
    unchanged(raw, `${code}: normalized values must not be rescaled`);
  });
}

for (const meta of EXCLUDED_DISTRIBUTION_IDENTITIES) {
  test(`${meta.schemeCode} unsupported exact identity cannot borrow a sibling's valid event`, () => {
    for (const spec of representatives.filter(candidate => candidate.meta.fundHouse === meta.fundHouse)) {
      const raw = fixture(spec); raw.meta = { ...meta };
      assert.equal(countLargeMoves(raw.points), 1);
      unchanged(raw, `${meta.schemeCode}: exact excluded identity with the ${spec.firstNewNavDate} control window`);
    }
  });
}
