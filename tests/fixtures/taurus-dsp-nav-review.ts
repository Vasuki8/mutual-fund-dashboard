import { validateFundResponse } from '../../src/lib/api.ts';
import type { FundData, NavPoint } from '../../src/lib/types.ts';

// Independent literal observations transcribed from the issuer reconciliation,
// not imported from the implementation's guard tables. The retained source and
// issuer evidence are documented in the corresponding verified NAV repair note.
export type ReviewCode = 100476 | 100477 | 100480 | 105989;
type RawMeta = {
  scheme_code: ReviewCode; scheme_name: string; fund_house: string;
  scheme_type: string; scheme_category: string; isin_growth: string;
  isin_div_reinvestment: null;
};
export interface ReviewCase {
  code: ReviewCode;
  meta: RawMeta;
  additions: NavPoint[];
  zeroWindow: NavPoint[];
  bridge: NavPoint[];
  correction: { date: string; sourceNav: number; verifiedNav: number; window: NavPoint[] } | null;
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const REVIEW_CASES: readonly ReviewCase[] = deepFreeze([
  {
    code: 100476,
    meta: { scheme_code: 100476, scheme_name: 'Taurus Flexi Cap Fund - Regular Plan - Growth',
      fund_house: 'Taurus Mutual Fund', scheme_type: 'Open Ended Schemes',
      scheme_category: 'Equity Scheme - Flexi Cap Fund', isin_growth: 'INF044D01989', isin_div_reinvestment: null },
    additions: [{ date: '2006-11-11', nav: 38.95 }, { date: '2006-11-12', nav: 38.95 }, { date: '2006-11-18', nav: 38.71 }],
    zeroWindow: [
      { date: '2006-11-10', nav: 38.95 }, { date: '2006-11-13', nav: 40.11 },
      { date: '2006-11-14', nav: 39.76 }, { date: '2006-11-15', nav: 39.46 },
      { date: '2006-11-16', nav: 39.42 }, { date: '2006-11-17', nav: 38.71 },
      { date: '2006-11-19', nav: 38.71 }, { date: '2006-11-20', nav: 38.14 },
    ], bridge: [],
    correction: { date: '2007-02-12', sourceNav: 41.05, verifiedNav: 40.93, window: [
      { date: '2007-02-09', nav: 42.12 }, { date: '2007-02-12', nav: 41.05 },
      { date: '2007-02-13', nav: 40.81 }, { date: '2007-02-14', nav: 40.33 },
    ] },
  },
  {
    code: 100477,
    meta: { scheme_code: 100477, scheme_name: 'Taurus Mid Cap Fund - Regular Plan - Growth',
      fund_house: 'Taurus Mutual Fund', scheme_type: 'Open Ended Schemes',
      scheme_category: 'Equity Scheme - Mid Cap Fund', isin_growth: 'INF044D01815', isin_div_reinvestment: null },
    additions: [{ date: '2006-11-11', nav: 15.05 }, { date: '2006-11-12', nav: 15.05 }, { date: '2006-11-18', nav: 14.75 }],
    zeroWindow: [
      { date: '2006-11-10', nav: 15.05 }, { date: '2006-11-13', nav: 15.36 },
      { date: '2006-11-14', nav: 15.22 }, { date: '2006-11-15', nav: 15.10 },
      { date: '2006-11-16', nav: 15.08 }, { date: '2006-11-17', nav: 14.75 },
      { date: '2006-11-19', nav: 14.75 }, { date: '2006-11-20', nav: 14.48 },
    ], bridge: [],
    correction: { date: '2008-09-30', sourceNav: 13.99, verifiedNav: 13.92, window: [
      { date: '2008-09-26', nav: 14.85 }, { date: '2008-09-29', nav: 13.92 },
      { date: '2008-09-30', nav: 13.99 }, { date: '2008-10-01', nav: 14.05 },
      { date: '2008-10-03', nav: 13.58 },
    ] },
  },
  {
    code: 100480,
    meta: { scheme_code: 100480, scheme_name: 'Taurus ELSS Tax Saver Fund - Regular Plan - Growth',
      fund_house: 'Taurus Mutual Fund', scheme_type: 'Open Ended Schemes',
      scheme_category: 'Equity Scheme - ELSS', isin_growth: 'INF044D01AC9', isin_div_reinvestment: null },
    additions: [{ date: '2006-11-11', nav: 17.34 }, { date: '2006-11-12', nav: 17.34 }, { date: '2006-11-18', nav: 17.06 }],
    zeroWindow: [
      { date: '2006-11-10', nav: 17.34 }, { date: '2006-11-13', nav: 17.44 },
      { date: '2006-11-14', nav: 17.38 }, { date: '2006-11-15', nav: 17.28 },
      { date: '2006-11-16', nav: 17.41 }, { date: '2006-11-17', nav: 17.06 },
      { date: '2006-11-19', nav: 17.06 }, { date: '2006-11-20', nav: 16.81 },
    ],
    // Real retained observations bridge the year between the two guarded
    // windows; a reduced fixture must not manufacture a >40% adjacent move.
    bridge: [{ date: '2007-02-01', nav: 18.31 }, { date: '2007-03-01', nav: 16.52 },
      { date: '2007-04-02', nav: 15.22 }, { date: '2007-07-02', nav: 20.18 },
      { date: '2007-10-01', nav: 25.13 }, { date: '2007-11-01', nav: 26.74 }],
    correction: { date: '2007-12-17', sourceNav: 33.67, verifiedNav: 35.20, window: [
      { date: '2007-12-14', nav: 35.20 }, { date: '2007-12-17', nav: 33.67 },
      { date: '2007-12-18', nav: 33.71 }, { date: '2007-12-19', nav: 33.69 },
      { date: '2007-12-20', nav: 33.23 },
    ] },
  },
  {
    code: 105989,
    meta: { scheme_code: 105989, scheme_name: 'DSP Small Cap Fund - Regular Plan - Growth',
      fund_house: 'DSP Mutual Fund', scheme_type: 'Open Ended Schemes',
      scheme_category: 'Equity Scheme - Small Cap Fund', isin_growth: 'INF740K01797', isin_div_reinvestment: null },
    additions: [{ date: '2007-06-28', nav: 10.135 }],
    zeroWindow: [{ date: '2007-06-20', nav: 10.032 }, { date: '2007-06-21', nav: 10.063 },
      { date: '2007-06-25', nav: 10.074 }, { date: '2007-06-27', nav: 10.122 },
      { date: '2007-07-04', nav: 10.272 }], bridge: [], correction: null,
  },
]);

export function rawPayload(spec: ReviewCase) {
  return { status: 'SUCCESS', meta: structuredClone(spec.meta), data: [
    ...spec.additions.map(point => ({ date: point.date, nav: 0 })),
    ...spec.zeroWindow, ...spec.bridge, ...(spec.correction?.window ?? []),
  ].sort((a, b) => b.date.localeCompare(a.date)).map(point => ({
    date: point.date.split('-').reverse().join('-'), nav: point.nav.toFixed(5),
  })) };
}

export function reviewFixture(spec: ReviewCase): FundData {
  return deepFreeze(validateFundResponse(deepFreeze(rawPayload(spec)), spec.code));
}

export function invalidWarning(count: number): string {
  return `Invalid NAV observations were excluded (${count}); derived analytics are blocked until the data is resolved.`;
}
