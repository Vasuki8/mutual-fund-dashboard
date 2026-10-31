import assert from 'node:assert/strict';
import test from 'node:test';
import { financialNavBasis } from '../src/lib/corporate-actions.ts';
import { absoluteReturn, isGrowthScheme } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import { archivedFundReturns, localFundReturns } from '../src/lib/fund-sort.ts';
import type { FundData, FundMeta, NavPoint } from '../src/lib/types.ts';
import type { HistoryDocument } from '../server/types.ts';
import { ABSL_CASES, abslFixture } from './fixtures/absl-nav-review.ts';
import {
  ABSL_DISTRIBUTION_CORRECTION_FIXTURES,
  ABSL_DISTRIBUTION_WARNING,
  abslDistributionFixture,
} from './fixtures/absl-distribution-nav-review.ts';

const SOURCE_DATE = '2019-04-10';
const RETURN_FIELDS = ['oneYear', 'threeYear', 'fiveYear', 'threeYearMaxDrawdown'] as const;

function freezeFund(fund: FundData): FundData {
  Object.freeze(fund.meta);
  fund.points.forEach(Object.freeze);
  Object.freeze(fund.points);
  Object.freeze(fund.warnings);
  return Object.freeze(fund);
}

for (const spec of ABSL_CASES) {
  test(`${spec.code}: existing Growth correction keeps its established omitted-reinvestment compatibility`, () => {
    const raw = abslFixture(spec);
    delete raw.meta.isinDivReinvestment;
    const original = structuredClone(raw);
    const basis = financialNavBasis(freezeFund(raw));
    assert.ok(basis.review?.correction, 'new strict IDCW matching must not tighten the existing Growth path');
    assert.equal(basis.review.correction.date, SOURCE_DATE);
    assert.equal(basis.review.correction.verifiedNav, spec.verified);
    assert.equal(basis.review.correction.applied, true);
    assert.equal(basis.adjusted, false);
    assert.deepEqual(raw, original);
  });
}

function unchanged(fund: FundData, reason: string): void {
  const original = structuredClone(fund);
  const basis = financialNavBasis(freezeFund(fund));
  assert.equal(basis.fund, fund, reason);
  assert.equal(basis.review, undefined, reason);
  assert.equal(basis.adjusted, false, reason);
  assert.equal(basis.adjustment, undefined, reason);
  assert.equal(basis.adjustments, undefined, reason);
  assert.deepEqual(fund, original, `${reason}: raw observations remain unchanged`);
}

function countLargeMoves(points: NavPoint[]): number {
  return points.slice(1).filter((point, i) => Math.abs(point.nav / points[i].nav - 1) > 0.4).length;
}

function offsetDate(date: string, days: number): string {
  return new Date(Date.parse(date + 'T00:00:00Z') + days * 86_400_000).toISOString().slice(0, 10);
}

// Test-only unresolved=false controls isolate archive Growth eligibility. These
// records are never written to the raw archive or substituted for source data.
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

for (const spec of ABSL_DISTRIBUTION_CORRECTION_FIXTURES) {
  const code = spec.meta.schemeCode;
  const sourceIndex = spec.dates.indexOf(SOURCE_DATE);

  test(`${code}: replaces only the exact 10 April 2019 source spike using its own issuer option`, () => {
    const raw = abslDistributionFixture(spec), original = structuredClone(raw);
    assert.equal(countLargeMoves(raw.points), 2);
    const basis = financialNavBasis(freezeFund(raw));
    const correction = basis.review?.correction;
    assert.ok(correction, `${code}: missing exact primary-supported source correction`);
    assert.equal(basis.review?.schemeCode, code);
    assert.equal(basis.adjusted, false, 'a one-date correction is never a unit action');
    assert.equal(basis.adjustment, undefined);
    assert.equal(basis.adjustments, undefined);
    assert.equal(correction.date, SOURCE_DATE);
    assert.equal(correction.sourceNav, spec.navs[sourceIndex]);
    assert.equal(correction.verifiedNav, spec.verified);
    assert.equal(correction.applied, true);
    assert.deepEqual(basis.review?.events, [], 'do not invent an economic-event exemption');
    const evidence = new URL(correction.evidenceUrl);
    assert.equal(evidence.origin, 'https://mutualfund.adityabirlacapital.com');
    assert.equal(evidence.pathname, '/api/sitecore/Shared/PostHistoricalNavandDividendFile');
    assert.equal(evidence.searchParams.get('SchemeCode'), spec.internalCode, 'never substitute a Growth or sibling identifier');
    assert.equal(evidence.searchParams.get('Type'), 'N');
    assert.equal(evidence.searchParams.get('FromDate'), '09-Apr-2019');
    assert.equal(evidence.searchParams.get('ToDate'), '11-Apr-2019');
    assert.deepEqual(basis.fund.points, spec.dates.map((date, i) => ({ date, nav: spec.expectedNavs[i] })));
    const changedDates = basis.fund.points.filter((point, i) => point.nav !== original.points[i].nav).map(point => point.date);
    assert.deepEqual(changedDates, [SOURCE_DATE]);
    assert.deepEqual({ ...basis.fund, points: original.points, warnings: original.warnings }, original);
    assert.notEqual(basis.fund.points, raw.points);
    assert.equal(countLargeMoves(basis.fund.points), 0);
    assert.equal(qualityBlocked(basis.fund), false);
    assert.equal(qualityBlocked(raw), true);
    assert.ok(basis.fund.warnings.some(warning => warning.includes(SOURCE_DATE) && warning.includes(String(spec.verified))));
    assert.deepEqual(raw, original, 'raw NAVs, warnings, metadata and timestamps remain immutable');
    unchanged(basis.fund, 'the same correction must not be applied twice');
  });

  test(`${code}: preserves both issuer-verified daily returns independently of any unit factor`, () => {
    const basis = financialNavBasis(abslDistributionFixture(spec));
    assert.ok(basis.review?.correction, 'the exact source correction must be available');
    assert.ok(Math.abs(absoluteReturn(basis.fund.points.slice(sourceIndex - 1, sourceIndex + 1))! - spec.firstReturn) < 1e-12);
    assert.ok(Math.abs(absoluteReturn(basis.fund.points.slice(sourceIndex, sourceIndex + 2))! - spec.secondReturn) < 1e-12);
  });

  test(`${code}: requires the exact source, complete plan identity, category and both ISINs`, () => {
    const other = ABSL_DISTRIBUTION_CORRECTION_FIXTURES.find(candidate => candidate.meta.schemeCode !== code)!;
    const mutations: [string, (fund: FundData) => void][] = [
      ['unrecognized code', fund => { fund.meta.schemeCode = 999999; }],
      ['other plan code', fund => { fund.meta.schemeCode = other.meta.schemeCode; }],
      ['other plan name', fund => { fund.meta.schemeName = other.meta.schemeName; }],
      ['Growth sibling name', fund => { fund.meta.schemeName = fund.meta.schemeName.replace('IDCW', 'Growth'); }],
      ['name whitespace', fund => { fund.meta.schemeName = ' ' + fund.meta.schemeName; }],
      ['wrong house', fund => { fund.meta.fundHouse = 'Another Mutual Fund'; }],
      ['wrong scheme type', fund => { fund.meta.schemeType = 'Closed Ended Schemes'; }],
      ['wrong category', fund => { fund.meta.schemeCategory = 'Other Scheme - FoF Overseas'; }],
      ['missing category', fund => { delete (fund.meta as Partial<FundMeta>).schemeCategory; }],
      ['wrong source', fund => { (fund as unknown as { source: string }).source = 'unverified-provider'; }],
      ['missing source', fund => { delete (fund as Partial<FundData>).source; }],
    ];
    for (const field of ['isinGrowth', 'isinDivReinvestment'] as const) {
      mutations.push([`${field}: sibling`, fund => { fund.meta[field] = other.meta[field]; }]);
      mutations.push([`${field}: arbitrary value`, fund => { fund.meta[field] = 'INF000000001'; }]);
      mutations.push([`${field}: null`, fund => { fund.meta[field] = null; }]);
      mutations.push([`${field}: omitted`, fund => { delete fund.meta[field]; }]);
    }
    for (const [reason, mutate] of mutations) {
      const raw = abslDistributionFixture(spec); mutate(raw); unchanged(raw, reason);
    }
  });

  test(`${code}: exact source value and both dated adjacent anchors are mandatory`, () => {
    for (const anchorDate of ['2019-04-09', SOURCE_DATE, '2019-04-11']) {
      const wrong = abslDistributionFixture(spec);
      wrong.points.find(point => point.date === anchorDate)!.nav += 0.00001;
      assert.equal(countLargeMoves(wrong.points), 2);
      unchanged(wrong, `wrong value on ${anchorDate}`);

      const missing = abslDistributionFixture(spec);
      missing.points = missing.points.filter(point => point.date !== anchorDate);
      assert.ok(missing.points.length >= 5, 'missing-anchor case must not rely on the generic length guard');
      unchanged(missing, `missing ${anchorDate}`);

      const shifted = abslDistributionFixture(spec);
      // Preserve valid ordered dates and the two raw moves while changing the
      // relevant anchor date. This isolates the date guard from malformed input.
      for (const point of shifted.points) {
        if (anchorDate === '2019-04-09' && point.date <= anchorDate) point.date = offsetDate(point.date, -7);
        if (anchorDate !== '2019-04-09' && point.date >= anchorDate) point.date = offsetDate(point.date, 7);
      }
      assert.equal(countLargeMoves(shifted.points), 2);
      unchanged(shifted, `wrong date for ${anchorDate}`);
    }
  });

  test(`${code}: extra events block the entire review even when the saved count is stale`, () => {
    for (const warning of [ABSL_DISTRIBUTION_WARNING, ABSL_DISTRIBUTION_WARNING.replace(': 2 ', ': 3 ')]) {
      const raw = abslDistributionFixture(spec), last = raw.points.at(-1)!;
      raw.points.push({ date: offsetDate(last.date, 1), nav: last.nav * 2 });
      raw.warnings = [warning];
      assert.equal(countLargeMoves(raw.points), 3);
      unchanged(raw, 'one source correction cannot hide an independent third move');
    }
  });

  test(`${code}: missing, duplicate, wrong-count and independent quality warnings are not waived`, () => {
    for (const warnings of [[], [ABSL_DISTRIBUTION_WARNING.replace(': 2 ', ': 1 ')],
      [ABSL_DISTRIBUTION_WARNING.replace(': 2 ', ': 3 ')],
      [ABSL_DISTRIBUTION_WARNING, ABSL_DISTRIBUTION_WARNING],
      [ABSL_DISTRIBUTION_WARNING, 'Invalid NAV observations were excluded (1).'],
      [ABSL_DISTRIBUTION_WARNING, 'Conflicting NAV values occur on 1 duplicate date(s).']]) {
      const raw = abslDistributionFixture(spec); raw.warnings = warnings;
      unchanged(raw, 'exact quality-evidence guard');
    }
  });

  test(`${code}: invalid values, invalid dates, duplicates and wrong chronology remain blocked`, () => {
    for (const nav of [0, -1, NaN, Infinity]) {
      const raw = abslDistributionFixture(spec); raw.points[0].nav = nav; unchanged(raw, 'invalid NAV');
    }
    const date = abslDistributionFixture(spec); date.points[0].date = '2019-02-30'; unchanged(date, 'invalid date');
    const order = abslDistributionFixture(spec); order.points.reverse(); unchanged(order, 'reversed chronology');
    const duplicate = abslDistributionFixture(spec); duplicate.points.push({ ...duplicate.points.at(-1)! });
    unchanged(duplicate, 'duplicate observation');
  });

  test(`${code}: a provider-corrected source needs no override and stale warnings remain visible`, () => {
    const clean = abslDistributionFixture(spec);
    clean.points[sourceIndex].nav = spec.verified;
    clean.warnings = [];
    unchanged(clean, 'provider has already corrected this value');
    assert.equal(qualityBlocked(clean), false);
    const stale = abslDistributionFixture(spec); stale.points[sourceIndex].nav = spec.verified;
    unchanged(stale, 'correct values do not authorize clearing an unexplained stale warning');
    assert.equal(qualityBlocked(stale), true);
  });

  test(`${code}: preserves ordinary later observations and independent operational warnings`, () => {
    const raw = abslDistributionFixture(spec), last = raw.points.at(-1)!;
    raw.points.push({ date: offsetDate(last.date, 1), nav: last.nav * 1.01 });
    raw.warnings.push('Using retained history after a source timeout.');
    const original = structuredClone(raw);
    const basis = financialNavBasis(freezeFund(raw));
    assert.ok(basis.review?.correction);
    assert.deepEqual(basis.fund.points.at(-1), original.points.at(-1));
    assert.ok(basis.fund.warnings.includes('Using retained history after a source timeout.'));
    assert.deepEqual(raw, original);
  });

  test(`${code}: corrected IDCW histories remain excluded by usable local and archived Growth controls`, () => {
    const raw = abslDistributionFixture(spec), lastNav = raw.points.at(-1)!.nav;
    const tail: NavPoint[] = [
      { date: '2021-10-29', nav: lastNav * 1.2 },
      { date: '2023-10-29', nav: lastNav * 1.25 },
      { date: '2024-10-29', nav: lastNav * 1.225 },
      { date: '2025-10-29', nav: lastNav * 1.3 },
      { date: '2026-10-29', nav: lastNav * 1.4 },
    ];
    raw.points.push(...tail);
    assert.equal(countLargeMoves(raw.points), 2, 'the scaled tail adds no artificial anomaly');
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
    assert.ok(basis.review?.correction, 'test the consumer after successful exact correction');
    assert.equal(qualityBlocked(basis.fund), false);
    assert.equal(isGrowthScheme(basis.fund.meta.schemeName), false);
    for (const field of RETURN_FIELDS) assert.equal(localFundReturns(basis.fund)[field], null, field);
    assert.equal(archivedFundReturns(archiveControl(basis.fund)), null);
  });
}
