import assert from 'node:assert/strict';
import test from 'node:test';
import { financialNavBasis } from '../src/lib/corporate-actions.ts';
import { isGrowthScheme } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import { archivedFundReturns, localFundReturns } from '../src/lib/fund-sort.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';
import type { HistoryDocument } from '../server/types.ts';
import {
  REMAINING_DISTRIBUTION_UNIT_FIXTURES,
  EXCLUDED_REMAINING_DISTRIBUTION_FIXTURES,
} from './fixtures/remaining-distribution-units.ts';
import type {
  RemainingDistributionUnitFixture,
  ExcludedRemainingDistributionFixture,
} from './fixtures/remaining-distribution-units.ts';

const ONE_MOVE = 'Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked.';
const TWO_MOVES = 'Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.';
const COVERAGE_WARNING = 'Saved history coverage remains incomplete.';
const RETURN_FIELDS = ['oneYear', 'threeYear', 'fiveYear', 'threeYearMaxDrawdown'] as const;

function fixture(spec: RemainingDistributionUnitFixture | ExcludedRemainingDistributionFixture,
  warnings = [ONE_MOVE]): FundData {
  return {
    meta: { ...spec.meta },
    points: spec.dates.map((date, i) => ({ date, nav: spec.navs[i] })),
    warnings: [...warnings], fetchedAt: spec.fetchedAt, sourceObservedAt: spec.sourceObservedAt,
    source: 'mfapi.in', fromCache: true, stale: false,
  };
}

function freezeFund(fund: FundData): FundData {
  Object.freeze(fund.meta);
  fund.points.forEach(Object.freeze);
  Object.freeze(fund.points);
  Object.freeze(fund.warnings);
  return Object.freeze(fund);
}

function unchanged(fund: FundData, reason: string): void {
  const original = structuredClone(fund);
  const basis = financialNavBasis(freezeFund(fund));
  assert.equal(basis.adjusted, false, reason);
  assert.equal(basis.adjustment, undefined, reason);
  assert.equal(basis.adjustments, undefined, reason);
  assert.equal(basis.review, undefined, reason);
  assert.equal(basis.fund, fund, reason);
  assert.deepEqual(fund, original, `${reason}: preserve every raw value and warning`);
}

function countLargeMoves(points: NavPoint[]): number {
  return points.slice(1).filter((point, i) => Math.abs(point.nav / points[i].nav - 1) > 0.4).length;
}

function offsetDate(date: string, days: number): string {
  return new Date(Date.parse(date + 'T00:00:00Z') + days * 86_400_000).toISOString().slice(0, 10);
}

// Test-only clean archive control isolates the real archive consumer's Growth
// gate. It never stores a normalized calculation copy in the source archive.
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

for (const [caseIndex, spec] of REMAINING_DISTRIBUTION_UNIT_FIXTURES.entries()) {
  const code = spec.meta.schemeCode;
  const boundaryIndex = spec.dates.indexOf(spec.firstNewNavDate);

  test(`${code}: applies only the documented unit factor to its real old-basis observations`, () => {
    const raw = fixture(spec), original = structuredClone(raw);
    assert.ok(boundaryIndex > 0, 'the literal retained window contains the actual boundary');
    assert.equal(countLargeMoves(raw.points), 1);
    const basis = financialNavBasis(freezeFund(raw));
    assert.equal(basis.adjusted, true, `${code}: missing exact primary-supported unit registration`);
    assert.equal(basis.review, undefined, 'a unit event is not a source correction');
    assert.equal(basis.adjustment?.schemeCode, code);
    assert.equal(basis.adjustment?.factor, spec.factor);
    assert.equal(basis.adjustment?.oldNavThrough, spec.oldNavThrough);
    assert.equal(basis.adjustment?.firstNewNavDate, spec.firstNewNavDate);
    assert.equal(basis.fund.points.length, original.points.length);
    assert.deepEqual(basis.fund.points.map(point => point.date), spec.dates);
    for (const [i, point] of basis.fund.points.entries()) {
      assert.ok(Math.abs(point.nav - spec.expectedNavs[i]) < 1e-9,
        `${code} ${point.date}: match the independent Decimal NAV`);
    }
    assert.deepEqual(basis.fund.points.slice(boundaryIndex), original.points.slice(boundaryIndex),
      'all new-basis observations remain byte-for-value identical');
    const observedReturn = basis.fund.points[boundaryIndex].nav / basis.fund.points[boundaryIndex - 1].nav - 1;
    assert.ok(Math.abs(observedReturn - spec.expectedBoundaryReturnFraction) < 1e-12,
      'the documented factor preserves the independently calculated ordinary return');
    assert.equal(countLargeMoves(basis.fund.points), 0);
    assert.equal(qualityBlocked(basis.fund), false);
    assert.deepEqual(basis.fund.warnings, []);
    assert.deepEqual({ ...basis.fund, points: original.points, warnings: original.warnings }, original);
    assert.notEqual(basis.fund.points, raw.points);
    assert.deepEqual(raw, original, 'raw NAVs, metadata, timestamps and warnings remain unchanged');
    assert.equal(isGrowthScheme(basis.fund.meta.schemeName), false);
    unchanged(basis.fund, 'a normalized calculation copy cannot receive the same factor twice');
  });

  test(`${code}: exact name, house, code and both stored ISIN fields are mandatory`, () => {
    const other = REMAINING_DISTRIBUTION_UNIT_FIXTURES[(caseIndex + 1) % REMAINING_DISTRIBUTION_UNIT_FIXTURES.length];
    const otherName = REMAINING_DISTRIBUTION_UNIT_FIXTURES.find(candidate => candidate.meta.schemeName !== spec.meta.schemeName)!.meta.schemeName;
    const mutations: [string, (fund: FundData) => void][] = [
      ['unrecognized code', fund => { fund.meta.schemeCode = 999999; }],
      ['another registered code', fund => { fund.meta.schemeCode = other.meta.schemeCode; }],
      ['another option name', fund => { fund.meta.schemeName = otherName; }],
      ['unverified name suffix', fund => { fund.meta.schemeName += ' - unverified sibling'; }],
      ['leading name whitespace', fund => { fund.meta.schemeName = ' ' + fund.meta.schemeName; }],
      ['another house', fund => { fund.meta.fundHouse = 'Another Mutual Fund'; }],
    ];
    for (const field of ['isinGrowth', 'isinDivReinvestment'] as const) {
      mutations.push([`${field}: replacement`, fund => { fund.meta[field] = 'INF000000001'; }]);
      mutations.push([`${field}: omitted`, fund => { delete fund.meta[field]; }]);
      if (spec.meta[field] !== null) {
        mutations.push([`${field}: null instead of documented value`, fund => { fund.meta[field] = null; }]);
      }
    }
    for (const [reason, mutate] of mutations) {
      const raw = fixture(spec); mutate(raw); unchanged(raw, reason);
    }
  });

  test(`${code}: actual old/new dates are required without assuming a two-point old window`, () => {
    for (const date of [spec.oldNavThrough, spec.firstNewNavDate]) {
      const raw = fixture(spec);
      raw.points = raw.points.filter(point => point.date !== date);
      unchanged(raw, `missing actual boundary observation ${date}`);
    }
    for (const side of ['old', 'new'] as const) {
      const raw = fixture(spec);
      // Move a whole side so chronology remains valid and the only failure is
      // the documented date boundary, not a duplicate date or a new NAV jump.
      for (const point of raw.points) {
        if (side === 'old' && point.date <= spec.oldNavThrough) point.date = offsetDate(point.date, -7);
        if (side === 'new' && point.date >= spec.firstNewNavDate) point.date = offsetDate(point.date, 7);
      }
      assert.equal(countLargeMoves(raw.points), 1);
      unchanged(raw, `wrong ${side}-basis boundary date`);
    }
  });

  test(`${code}: a factor outside the established tolerance cannot be fitted to the curve`, () => {
    for (const direction of [-1, 1]) {
      const raw = fixture(spec);
      const wrongRatio = spec.factor + direction * spec.maxFactorDeviation * 2;
      const multiplier = wrongRatio / (raw.points[boundaryIndex].nav / raw.points[boundaryIndex - 1].nav);
      // All post-event values move together. An isolated mutation would create
      // an extra event and fail for the wrong reason.
      for (const point of raw.points.slice(boundaryIndex)) point.nav *= multiplier;
      assert.equal(countLargeMoves(raw.points), 1);
      assert.ok(Math.abs(raw.points[boundaryIndex].nav / raw.points[boundaryIndex - 1].nav - spec.factor)
        > spec.maxFactorDeviation);
      unchanged(raw, `factor ${wrongRatio} exceeds the established absolute tolerance`);
    }
  });

  test(`${code}: any unmatched extra event blocks the whole history with accurate or stale warnings`, () => {
    for (const warnings of [[TWO_MOVES], [ONE_MOVE]]) {
      const raw = fixture(spec, warnings), last = raw.points.at(-1)!;
      raw.points.push({ date: offsetDate(last.date, 1), nav: last.nav * 2 });
      assert.equal(countLargeMoves(raw.points), 2);
      unchanged(raw, 'one documented event cannot authorize a partial explanation of two moves');
    }
  });

  test(`${code}: independent invalid/conflicting evidence and wrong warning counts remain blockers`, () => {
    for (const warnings of [[], [TWO_MOVES], [ONE_MOVE, ONE_MOVE],
      [ONE_MOVE, 'Invalid NAV observations were excluded (1).'],
      [ONE_MOVE, 'Conflicting NAV values occur on 1 duplicate date(s).']]) {
      unchanged(fixture(spec, warnings), 'independent warning guard');
    }
    for (const nav of [0, -1, NaN, Infinity]) {
      const raw = fixture(spec); raw.points[0].nav = nav; unchanged(raw, 'invalid NAV');
    }
    const date = fixture(spec); date.points[0].date = '2011-02-30'; unchanged(date, 'invalid calendar date');
    const reversed = fixture(spec); reversed.points.reverse(); unchanged(reversed, 'reversed chronology');
    const duplicate = fixture(spec); duplicate.points.push({ ...duplicate.points.at(-1)! });
    unchanged(duplicate, 'duplicate observation');
  });

  test(`${code}: preserves independent operational warnings on the calculation copy`, () => {
    const raw = fixture(spec, [ONE_MOVE, COVERAGE_WARNING]), original = structuredClone(raw);
    const basis = financialNavBasis(freezeFund(raw));
    assert.equal(basis.adjusted, true);
    assert.deepEqual(basis.fund.warnings, [COVERAGE_WARNING]);
    assert.deepEqual(raw, original);
  });

  test(`${code}: already-normalized values cannot waive a stale discontinuity warning`, () => {
    const raw = fixture(spec);
    raw.points = spec.dates.map((date, i) => ({ date, nav: spec.expectedNavs[i] }));
    assert.equal(countLargeMoves(raw.points), 0);
    unchanged(raw, 'no actual unit event remains');
    assert.equal(qualityBlocked(raw), true);
  });

  test(`${code}: clean IDCW calculations remain excluded by real local and archive Growth rules`, () => {
    const lastNav = spec.navs.at(-1)!;
    // Relative scaling works for both INR 100 and INR 1000 denominations. The
    // synthetic tail supplies exact 1Y/3Y/5Y baselines and a measurable decline.
    const tail: NavPoint[] = [
      { date: '2021-10-29', nav: lastNav * 1.2 },
      { date: '2023-10-29', nav: lastNav * 1.25 },
      { date: '2024-10-29', nav: lastNav * 1.225 },
      { date: '2025-10-29', nav: lastNav * 1.3 },
      { date: '2026-10-29', nav: lastNav * 1.4 },
    ];
    const raw = fixture(spec); raw.points.push(...tail);
    assert.equal(countLargeMoves(raw.points), 1, 'the tail must not introduce an artificial event');
    const growthControl: FundData = {
      ...raw, meta: { ...raw.meta, schemeName: 'Synthetic Growth' }, warnings: [],
      points: [...spec.dates.map((date, i) => ({ date, nav: spec.expectedNavs[i] })), ...tail],
    };
    assert.equal(countLargeMoves(growthControl.points), 0);
    const localGrowth = localFundReturns(growthControl);
    const archiveGrowth = archivedFundReturns(archiveControl(growthControl));
    assert.ok(archiveGrowth);
    for (const field of RETURN_FIELDS) {
      assert.ok(typeof localGrowth[field] === 'number' && Number.isFinite(localGrowth[field]), `${field}: usable local Growth control`);
      assert.ok(typeof archiveGrowth[field] === 'number' && Number.isFinite(archiveGrowth[field]), `${field}: usable archive Growth control`);
    }
    assert.ok(localGrowth.oneYear! > 0 && localGrowth.threeYear! > 0 && localGrowth.fiveYear! > 0);
    assert.ok(localGrowth.threeYearMaxDrawdown! < 0);
    const basis = financialNavBasis(freezeFund(raw));
    assert.equal(basis.adjusted, true, 'the consumer is tested after successful normalization');
    assert.equal(qualityBlocked(basis.fund), false, 'Growth eligibility is the remaining gate');
    for (const field of RETURN_FIELDS) assert.equal(localFundReturns(basis.fund)[field], null, field);
    assert.equal(archivedFundReturns(archiveControl(basis.fund)), null);
  });

  if (spec.gapProbe) {
    test(`${code}: normalization preserves the actual retained coverage gaps`, () => {
      const probe = spec.gapProbe!;
      const raw = fixture(spec, [ONE_MOVE, COVERAGE_WARNING]);
      raw.points = probe.dates.map((date, i) => ({ date, nav: probe.navs[i] }));
      const original = structuredClone(raw);
      assert.equal(countLargeMoves(raw.points), 1);
      const basis = financialNavBasis(freezeFund(raw));
      assert.equal(basis.adjusted, true);
      assert.deepEqual(basis.fund.points.map(point => point.date), probe.dates);
      for (const [i, point] of basis.fund.points.entries()) {
        assert.ok(Math.abs(point.nav - probe.expectedNavs[i]) < 1e-9);
      }
      for (const gap of probe.gaps) {
        const index = basis.fund.points.findIndex(point => point.date === gap.beforeDate);
        assert.equal(basis.fund.points[index + 1].date, gap.afterDate);
        assert.equal((Date.parse(gap.afterDate) - Date.parse(gap.beforeDate)) / 86_400_000, gap.calendarDays);
      }
      assert.deepEqual(basis.fund.warnings, [COVERAGE_WARNING]);
      assert.deepEqual(raw, original);
    });
  }
}

for (const spec of EXCLUDED_REMAINING_DISTRIBUTION_FIXTURES) {
  const code = spec.meta.schemeCode;
  test(`${code}: excluded exact identity and its real anomalous observations remain blocked`, () => {
    const raw = fixture(spec, spec.warnings);
    assert.equal(countLargeMoves(raw.points), spec.rawLargeMoves, 'preserve the entire retained anomaly window');
    assert.equal(qualityBlocked(raw), true);
    unchanged(raw, spec.reason);
    assert.equal(qualityBlocked(raw), true);
  });

  // A valid event for a supported sibling must not authorize an excluded
  // identity with unrelated anomalies or an incomplete primary evidence chain.
  const controls = REMAINING_DISTRIBUTION_UNIT_FIXTURES.filter(candidate => candidate.meta.fundHouse === spec.meta.fundHouse);
  if (controls.length) {
    test(`${code}: an excluded identity cannot borrow a supported same-house unit event`, () => {
      for (const control of controls) {
        const raw = fixture(control); raw.meta = { ...spec.meta };
        assert.equal(countLargeMoves(raw.points), 1);
        unchanged(raw, `${code}: unsupported exact identity with the ${control.firstNewNavDate} control window`);
      }
    });
  }
}
