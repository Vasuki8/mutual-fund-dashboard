import type { FundData } from '../../src/lib/types.ts';
import { BOI_DISCONTINUITY } from './boi-nav-review.ts';

export const ABSL_CASES=[
  {code:106873,plan:'Regular',isin:'INF209K01520',internalCode:'297G',
    navs:[21.1186,21.0216,68.2847,20.8571,20.9458],verified:20.9025,
    firstReturn:-0.00566560109601552689,secondReturn:-0.00217198899653151537},
  {code:119517,plan:'Direct',isin:'INF209K01WS3',internalCode:'297GZ',
    navs:[21.8136,21.7136,70.5334,21.5441,21.6359],verified:21.5909,
    firstReturn:-0.00565083634220028001,secondReturn:-0.00216757986003362528},
] as const;

export function abslFixture(spec:typeof ABSL_CASES[number]=ABSL_CASES[0]):FundData {
  return {meta:{schemeCode:spec.code,
    schemeName:`Aditya Birla Sun Life International Equity Fund - ${spec.plan} Plan - GROWTH`,
    fundHouse:'Aditya Birla Sun Life Mutual Fund',schemeType:'Open Ended Schemes',
    schemeCategory:'Equity Scheme - Sectoral/ Thematic',isinGrowth:spec.isin,isinDivReinvestment:null},
    points:['2019-04-08','2019-04-09','2019-04-10','2019-04-11','2019-04-12'].map((date,i)=>({date,nav:spec.navs[i]})),
    source:'mfapi.in',fetchedAt:'2026-10-28T07:36:29.670Z',fromCache:true,stale:false,
    warnings:[BOI_DISCONTINUITY]};
}
