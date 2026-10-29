import { validateFundResponse } from '../../src/lib/api.ts';
import type { FundData } from '../../src/lib/types.ts';

// Exact raw observations and issuer replacements are documented in
// docs/VERIFIED_ZERO_NAV_REPAIR_2026-10-29.md. No sibling-plan values are used.
export const SUNDARAM_CODES = [119566, 119635] as const;
export type SundaramCode = typeof SUNDARAM_CODES[number];
export const ZERO_WARNING = 'Invalid NAV observations were excluded (3); derived analytics are blocked until the data is resolved.';
export const ZERO_DATES = ['2013-01-03', '2013-01-04', '2013-01-07'];

const earlyDates = ['2013-01-08','2013-01-09','2013-01-10','2013-01-11','2013-01-14',
  '2013-01-15','2013-01-16','2013-01-17','2013-01-18'];

export function sundaramPayload(code: SundaramCode = 119566) {
  const large = code === 119566;
  const navs = large ? [15.368,15.342,15.2675,15.1184,15.3124,15.3284,15.1999,15.2371,15.1646]
    : [11.9874,11.9973,12.0009,11.9399,12.0104,12.017,11.9493,11.9682,12.0074];
  const points = earlyDates.map((date,index) => ({date, nav:navs[index]}));
  if (!large) points.push({date:'2015-01-02',nav:14.5799},
    {date:'2018-09-21',nav:19.4882},{date:'2018-09-24',nav:19.4019},
    {date:'2018-09-25',nav:19.3986},{date:'2018-09-26',nav:19.4293},
    {date:'2018-09-27',nav:19.4015},{date:'2018-09-28',nav:19.3779},
    {date:'2018-10-01',nav:19.3895});
  return {
    status:'SUCCESS',
    meta:{scheme_code:code,
      scheme_name:large ? 'Sundaram Large and Midcap Fund - Direct Plan - GROWTH'
        : 'Sundaram Conservative Hybrid Fund (Formerly Known as Sundaram Debt Oriented Hybrid Fund) - Direct Plan - GROWTH',
      fund_house:'Sundaram Mutual Fund', scheme_type:'Open Ended Schemes',
      scheme_category:large ? 'Equity Scheme - Large & Mid Cap Fund' : 'Hybrid Scheme - Conservative Hybrid Fund',
      isin_growth:large ? 'INF903J01PR9' : 'INF903J01OP6', isin_div_reinvestment:null},
    data:[...ZERO_DATES.map(date=>({date,nav:0})),...points]
      .sort((a,b)=>b.date.localeCompare(a.date))
      .map(point=>({date:point.date.split('-').reverse().join('-'), nav:point.nav.toFixed(5)})),
  };
}

export function sundaramFixture(code: SundaramCode = 119566): FundData {
  return validateFundResponse(sundaramPayload(code), code);
}
