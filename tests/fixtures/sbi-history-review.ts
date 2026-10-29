import type { FundData } from '../../src/lib/types.ts';

export const SBI_GAP_WARNING = 'Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked.';

/** Seven source observations independently matched against the issuer PDF. */
export function sbiHistoryFixture(): FundData {
  return {
    meta: { schemeCode:106096,schemeName:'SBI INFRASTRUCTURE FUND - Regular Plan - Growth',
      fundHouse:'SBI Mutual Fund',schemeType:'Open Ended Schemes',
      schemeCategory:'Equity Scheme - Sectoral/ Thematic',isinGrowth:'INF200K01CT2',isinDivReinvestment:null },
    points:[
      {date:'2009-04-01',nav:5.72},{date:'2009-04-02',nav:6},
      {date:'2010-07-09',nav:10.28},{date:'2010-07-12',nav:10.33},
      {date:'2010-07-13',nav:10.4},{date:'2010-07-14',nav:10.4},{date:'2010-07-15',nav:10.37},
    ],
    source:'mfapi.in',fetchedAt:'2026-10-28T00:00:00Z',fromCache:true,stale:false,
    warnings:[SBI_GAP_WARNING],
  };
}
