import assert from 'node:assert/strict';
import { test } from 'node:test';
import { absoluteReturn, cagr, selectPeriod, trailingReturn } from '../src/lib/analytics.ts';
import { financialNavBasis } from '../src/lib/corporate-actions.ts';
import type { FundData, FundMeta, NavPoint } from '../src/lib/types.ts';

const WARNING = 'Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked.';
const TWO_MOVES = 'Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.';
const REPORT = 'https://mf.nipponindiaim.com/InvestorServices/AnnualHalfYearlyReportsFY20122013/Half_Yearly_Portfolio_-_Financials_-_Oct-_2012_-_for_Website_upload.pdf#page=34';

// Exact current identities and saved source NAVs. The March/September anchors
// match the issuer report's Treasury Retail/Institutional Growth columns.
const IDENTITIES = [
  { code: 100837, name: 'Nippon India Liquid Fund - Regular Plan - Retail Plan - Growth Option',
    isin: 'INF204K01UL3', historicalName: /Treasury Retail Growth/,
    navs: [25.51420, 26.32680, 2633.88000, 2666.94130],
    adjustedNavs: [2551.42, 2632.68, 2633.88, 2666.9413],
    eventReturn: 0.00045580928939337184,
    fullReturn: 0.5650108566994065, fullCagr: 0.03118864966443935 },
  { code: 100851, name: 'Nippon India Liquid Fund - Regular Plan - Growth Option',
    isin: 'INF204K01UN9', historicalName: /Treasury Institutional Growth/,
    navs: [26.11330, 27.00940, 2702.27060, 2739.08840],
    adjustedNavs: [2611.33, 2700.94, 2702.2706, 2739.0884],
    eventReturn: 0.0004926433019614151,
    fullReturn: 0.5291058579344625, fullCagr: 0.02954882771472267 },
] as const;

function fixture(identity: typeof IDENTITIES[number]): FundData {
  return {
    meta: { schemeCode: identity.code, schemeName: identity.name, isinGrowth: identity.isin,
      isinDivReinvestment: null, fundHouse: 'Nippon India Mutual Fund',
      schemeType: 'Open Ended Schemes', schemeCategory: 'Debt Scheme - Liquid Fund' },
    points: ['2012-03-30', '2012-08-03', '2012-08-05', '2012-09-30']
      .map((date, index) => ({ date, nav: identity.navs[index] })),
    fetchedAt: '2026-10-29T00:14:55.000Z', source: 'mfapi.in', fromCache: true,
    stale: false, warnings: [WARNING],
  };
}

function close(actual: number | null, expected: number, tolerance = 1e-12): void {
  assert.notEqual(actual, null);
  assert.ok(Math.abs(actual! - expected) < tolerance, `${actual} should be close to ${expected}`);
}

function unchanged(fund: FundData, reason: string): void {
  const original = structuredClone(fund);
  const result = financialNavBasis(fund);
  assert.equal(result.adjusted, false, reason);
  assert.equal(result.fund, fund, reason);
  assert.equal(result.adjustment, undefined, reason);
  assert.equal(result.adjustments, undefined, reason);
  assert.deepEqual(fund, original, reason);
}

for (const identity of IDENTITIES) {
  test(`${identity.code}: adjusts only pre-5-August NAVs without mutating the source history`, () => {
    const raw = fixture(identity), original = structuredClone(raw);
    raw.points.forEach(Object.freeze);
    Object.freeze(raw.points); Object.freeze(raw.meta); Object.freeze(raw.warnings); Object.freeze(raw);

    const result = financialNavBasis(raw);
    assert.equal(result.adjusted, true);
    assert.notEqual(result.fund, raw);
    assert.notEqual(result.fund.points, raw.points);
    result.fund.points.forEach((point, index) => {
      assert.equal(point.date, original.points[index].date);
      close(point.nav, identity.adjustedNavs[index]);
    });
    assert.deepEqual(result.fund.points.slice(2), original.points.slice(2));
    assert.deepEqual(result.fund.warnings, []);
    assert.deepEqual({ ...result.fund, points: raw.points, warnings: raw.warnings }, raw);
    assert.deepEqual(raw, original);

    assert.equal(result.adjustment?.schemeCode, identity.code);
    assert.equal(result.adjustment?.factor, 100);
    assert.equal(result.adjustment?.oldNavThrough, '2012-08-03');
    assert.equal(result.adjustment?.firstNewNavDate, '2012-08-05');
    assert.match(result.adjustment!.label, identity.historicalName);
    assert.match(result.adjustment!.label, /effective 5 August 2012/);
    assert.equal(result.adjustment?.evidenceUrl, REPORT);
    assert.equal(result.adjustments, undefined);
  });

  test(`${identity.code}: retains the observed interest return across the unit consolidation`, () => {
    const result = financialNavBasis(fixture(identity));
    assert.equal(result.adjusted, true);
    close(absoluteReturn(result.fund.points.slice(1, 3)), identity.eventReturn);
  });

  test(`${identity.code}: requires the verified code, current plan name, fund house and Growth ISIN`, () => {
    const other = IDENTITIES.find(candidate => candidate.code !== identity.code)!;
    const changes: Partial<FundMeta>[] = [
      { schemeCode: 999999 }, { schemeCode: other.code }, { schemeName: other.name },
      { schemeName: identity.name.replace('Regular', 'Direct') },
      { schemeName: identity.name.replace('Growth', 'IDCW') },
      { schemeName: `${identity.name} Extra` },
      { schemeName: ` ${identity.name}` },
      { schemeName: identity.code === 100837 ? 'Reliance Liquid Fund - Treasury Plan - Retail Growth'
        : 'Reliance Liquid Fund - Treasury Plan - Institutional Growth' },
      { fundHouse: 'Reliance Mutual Fund' }, { fundHouse: 'Another Mutual Fund' },
      { isinGrowth: other.isin }, { isinGrowth: null }, { isinGrowth: undefined },
    ];
    for (const change of changes) {
      const raw = fixture(identity);
      Object.assign(raw.meta, change);
      unchanged(raw, `identity mismatch: ${JSON.stringify(change)}`);
    }
  });

  test(`${identity.code}: requires the exact adjacent old-unit and new-unit source dates`, () => {
    for (const [index, date] of [[1, '2012-08-02'], [1, '2012-08-04'],
      [2, '2012-08-04'], [2, '2012-08-06']] as const) {
      const raw = fixture(identity);
      raw.points[index].date = date;
      unchanged(raw, `wrong boundary date: ${date}`);
    }
    for (const index of [1, 2]) {
      const raw = fixture(identity);
      raw.points.splice(index, 1);
      unchanged(raw, `missing boundary observation: ${index}`);
    }
  });

  test(`${identity.code}: requires exactly one matching generated discontinuity warning`, () => {
    for (const warnings of [[], [TWO_MOVES], [WARNING, WARNING], [WARNING, TWO_MOVES],
      [WARNING.replace('1 single-observation', 'one single-observation')]]) {
      const raw = fixture(identity);
      raw.warnings = warnings;
      unchanged(raw, `warning mismatch: ${JSON.stringify(warnings)}`);
    }
  });

  test(`${identity.code}: keeps independent invalid or conflicting NAV evidence blocking`, () => {
    for (const warning of ['Invalid NAV observations were excluded (1).',
      'Conflicting NAV values were reported for 1 date(s).']) {
      const raw = fixture(identity);
      raw.warnings.push(warning);
      unchanged(raw, warning);
    }
  });

  test(`${identity.code}: preserves unrelated source warnings when the documented event matches`, () => {
    const raw = fixture(identity);
    const coverageWarning = 'History coverage has not been independently verified.';
    raw.warnings.push(coverageWarning);
    const result = financialNavBasis(raw);
    assert.equal(result.adjusted, true);
    assert.deepEqual(result.fund.warnings, [coverageWarning]);
    assert.deepEqual(raw.warnings, [WARNING, coverageWarning]);
  });

  test(`${identity.code}: rejects an absent denomination jump despite a stale warning`, () => {
    const raw = fixture(identity);
    for (const point of raw.points.slice(2)) point.nav /= 100;
    unchanged(raw, 'the history contains no unit change');
  });

  test(`${identity.code}: refuses an extra unknown event even if a warning reports both jumps`, () => {
    for (const warning of [WARNING, TWO_MOVES]) {
      const raw = fixture(identity);
      raw.points.push({ date: '2012-10-01', nav: identity.navs[3] * 2 });
      raw.warnings = [warning];
      unchanged(raw, 'an additional event has no verified adjustment');
    }
  });

  test(`${identity.code}: uses the documented factor within the specific 0.1 ratio tolerance`, () => {
    for (const ratio of [99.901, 100.099]) {
      const raw = fixture(identity);
      raw.points[2].nav = identity.navs[1] * ratio;
      raw.points[3].nav = raw.points[2].nav * 1.02;
      const result = financialNavBasis(raw);
      assert.equal(result.adjusted, true, `ratio ${ratio} is within tolerance`);
      close(result.fund.points[1].nav, identity.adjustedNavs[1]);
      assert.equal(result.fund.points[2].nav, raw.points[2].nav);
    }
    for (const ratio of [99.899, 100.101, 10, 1000]) {
      const raw = fixture(identity);
      raw.points[2].nav = identity.navs[1] * ratio;
      raw.points[3].nav = raw.points[2].nav * 1.02;
      unchanged(raw, `unverified factor ${ratio}`);
    }
  });

  test(`${identity.code}: rejects duplicate, unordered, impossible-date or invalid-NAV rows`, () => {
    const corruptions: [string, (points: NavPoint[]) => void][] = [
      ['duplicate date', points => points.splice(1, 0, { ...points[0] })],
      ['unordered observations', points => points.reverse()],
      ['impossible calendar date', points => { points[0].date = '2012-03-32'; }],
      ['non-positive NAV', points => { points[0].nav = 0; }],
      ['non-finite NAV', points => { points[0].nav = NaN; }],
      ['insufficient observations', points => points.splice(0, 2)],
    ];
    for (const [reason, corrupt] of corruptions) {
      const raw = fixture(identity);
      corrupt(raw.points);
      unchanged(raw, reason);
    }
  });

  test(`${identity.code}: cannot apply the consolidation twice even with a restored raw warning`, () => {
    const first = financialNavBasis(fixture(identity));
    assert.equal(first.adjusted, true);
    unchanged(first.fund, 'the calculation copy is already adjusted');
    const staleWarning = { ...first.fund, warnings: [WARNING] };
    unchanged(staleWarning, 'a stale warning cannot cause duplicate adjustment');
  });

  test(`${identity.code}: full-history returns exclude denomination gain and post-event 1Y/3Y/5Y stay unchanged`, () => {
    const raw = fixture(identity);
    // Synthetic recent NAVs have independently calculated expected returns;
    // the four historical source observations above remain exact.
    raw.points.push(...['2021-10-26', '2023-10-26', '2025-10-26', '2026-10-26']
      .map((date, index) => ({ date, nav: [3000, 3300, 3630, 3993][index] })));
    const result = financialNavBasis(raw);
    assert.equal(result.adjusted, true);
    close(absoluteReturn(result.fund.points), identity.fullReturn);
    close(cagr(result.fund.points), identity.fullCagr);
    for (const [years, expected] of [[1, 0.1], [3, 0.06554046073448472],
      [5, 0.05881969261219]] as const) {
      close(trailingReturn(result.fund.points, years), expected);
      assert.equal(trailingReturn(result.fund.points, years), trailingReturn(raw.points, years));
      const period = `${years}Y` as '1Y' | '3Y' | '5Y';
      assert.deepEqual(selectPeriod(result.fund.points, period), selectPeriod(raw.points, period));
    }
    assert.deepEqual(raw.warnings, [WARNING]);
  });
}
