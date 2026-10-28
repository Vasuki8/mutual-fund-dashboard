import assert from 'node:assert/strict';
import { test } from 'node:test';
import { absoluteReturn, cagr, selectPeriod, trailingReturn } from '../src/lib/analytics.ts';
import { financialNavBasis } from '../src/lib/corporate-actions.ts';
import type { FundData, FundMeta, NavPoint } from '../src/lib/types.ts';

const WARNING = 'Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked.';
const TWO_MOVES = 'Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.';
const REPORT = 'https://www.sbimf.com/docs/default-source/scheme-portfolios/default-library/unaudited-half-yearly-results-(as-on-march-31-2012).pdf?sfvrsn=24795812_0';

// Exact independently verified identities and source observations. The two
// historical names explain the report; they are not alternate identity matches.
const IDENTITIES = [
  { code: 100641, name: 'SBI ULTRA SHORT TERM FUND - Regular Plan - Growth',
    isin: 'INF200K01LJ4', category: 'Income/Debt Oriented Schemes - Ultra Short Term Fund',
    historicalName: /Magnum InstaCash.*Cash Option/i, page: 13,
    navs: [22.71290, 23.28570, 2329.14000, 2375.59540],
    adjustedNavs: [2271.29, 2328.57, 2329.14, 2375.5954],
    eventReturn: 0.00024478542624872776,
    recentNavs: [3000, 3300, 3630, 3993],
    fullReturn: 0.7580317792972275, fullCagr: 0.03811650289873647 },
  { code: 105274, name: 'SBI LIQUID FUND - Regular Plan - Growth',
    isin: 'INF200K01LU1', category: 'Debt Scheme - Liquid Fund',
    historicalName: /Premier Liquid.*Institutional.*Growth/i, page: 18,
    navs: [16.26760, 16.68840, 1669.27000, 1703.69460],
    adjustedNavs: [1626.76, 1668.84, 1669.27, 1703.6946],
    eventReturn: 0.00025766400613599866,
    recentNavs: [2000, 2200, 2420, 2662],
    fullReturn: 0.6363815190931668, fullCagr: 0.03319254890984924 },
] as const;

function fixture(identity: typeof IDENTITIES[number]): FundData {
  return {
    meta: { schemeCode: identity.code, schemeName: identity.name, isinGrowth: identity.isin,
      isinDivReinvestment: null, fundHouse: 'SBI Mutual Fund', schemeType: 'Open Ended Schemes',
      schemeCategory: identity.category },
    points: ['2011-09-30', '2012-01-12', '2012-01-13', '2012-03-31']
      .map((date, index) => ({ date, nav: identity.navs[index] })),
    fetchedAt: '2026-10-26T18:00:00.000Z', source: 'mfapi.in', fromCache: true,
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
  assert.deepEqual(fund, original, reason);
}

for (const identity of IDENTITIES) {
  test(`${identity.code}: adjusts only pre-13-January NAVs without mutating the source history`, () => {
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
    assert.equal(result.adjustment?.oldNavThrough, '2012-01-12');
    assert.equal(result.adjustment?.firstNewNavDate, '2012-01-13');
    assert.match(result.adjustment!.label, identity.historicalName);
    assert.equal(result.adjustment?.evidenceUrl, `${REPORT}#page=${identity.page}`);
    assert.equal(result.adjustments, undefined);
  });

  test(`${identity.code}: retains the observed interest return across the unit consolidation`, () => {
    const result = financialNavBasis(fixture(identity));
    assert.equal(result.adjusted, true);
    close(absoluteReturn(result.fund.points.slice(1, 3)), identity.eventReturn);
  });

  test(`${identity.code}: requires the verified code, current plan name, fund house and Growth ISIN`, () => {
    const changes: Partial<FundMeta>[] = [
      { schemeCode: 999999 },
      { schemeCode: identity.code === 100641 ? 105274 : 100641 },
      { schemeName: identity.name.replace('Regular', 'Direct') },
      { schemeName: identity.name.replace('Growth', 'IDCW') },
      { schemeName: 'SBI LOW DURATION FUND - Regular Plan - Growth' },
      { schemeName: identity.code === 100641 ? 'SBI Magnum InstaCash Fund Cash Option - Growth'
        : 'SBI Premier Liquid Fund Institutional Growth' },
      { fundHouse: 'Another Mutual Fund' },
      { isinGrowth: identity.code === 100641 ? 'INF200K01LU1' : 'INF200K01LJ4' },
      { isinGrowth: null }, { isinGrowth: undefined },
    ];
    for (const change of changes) {
      const raw = fixture(identity);
      Object.assign(raw.meta, change);
      unchanged(raw, `identity mismatch: ${JSON.stringify(change)}`);
    }
  });

  test(`${identity.code}: requires the exact adjacent old-unit and new-unit source dates`, () => {
    for (const [index, date] of [[1, '2012-01-11'], [2, '2012-01-14']] as const) {
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

  test(`${identity.code}: requires exactly one matching discontinuity warning`, () => {
    for (const warnings of [[], [TWO_MOVES], [WARNING, WARNING], [WARNING, TWO_MOVES]]) {
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

  test(`${identity.code}: refuses an extra event even if a warning reports both jumps`, () => {
    for (const warning of [WARNING, TWO_MOVES]) {
      const raw = fixture(identity);
      raw.points.push({ date: '2012-04-01', nav: identity.navs[3] * 2 });
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
      ['impossible calendar date', points => { points[0].date = '2011-09-31'; }],
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
    // These recent NAVs are synthetic, with independently calculated expected
    // returns; the four historical source observations above remain exact.
    raw.points.push(...['2021-10-26', '2023-10-26', '2025-10-26', '2026-10-26']
      .map((date, index) => ({ date, nav: identity.recentNavs[index] })));
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
