import type { FundData } from '../../src/lib/types.ts';

export const BOI_DISCONTINUITY = 'Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.';

// Literal checkpoint213 windows; expected correction and returns come from the
// issuer documents/daily response and independent Decimal arithmetic.
export const BOI_CASES = [
  { code:133867, plan:'Regular', isin:'INF761K01DH6',
    navs:[7.3408,3.6542,3.6497,4.6321,9.6296,10.2777], verified:10.2756,
    loss:-0.50220684394071490846, recovery:1.21834589063275836014,
    afterRecovery:0.00020436762816769824, total:0.40007901046207497820 },
  { code:133868, plan:'Direct', isin:'INF761K01DG8',
    navs:[7.4051,3.6863,3.6817,4.698,9.7667,10.4243], verified:10.4219,
    loss:-0.50219443356605582639, recovery:1.21836951894423158791,
    afterRecovery:0.00023028430516508506, total:0.40771900446989237147 },
] as const;

export function boiFixture(spec: typeof BOI_CASES[number] = BOI_CASES[0]): FundData {
  const dates=['2020-04-23','2020-04-24','2020-04-27','2022-03-30','2022-03-31','2022-04-04'];
  return {
    meta:{schemeCode:spec.code,schemeName:`BANK OF INDIA CREDIT RISK FUND - ${spec.plan} Plan - Growth`,
      fundHouse:'Bank of India Mutual Fund',isinGrowth:spec.isin,isinDivReinvestment:null,
      schemeType:'Open Ended Schemes',schemeCategory:'Debt Scheme - Credit Risk Fund'},
    points:dates.map((date,i)=>({date,nav:spec.navs[i]})),
    fetchedAt:'2026-10-28T07:36:29.670Z',source:'mfapi.in',fromCache:true,stale:false,
    warnings:[BOI_DISCONTINUITY],
  };
}
