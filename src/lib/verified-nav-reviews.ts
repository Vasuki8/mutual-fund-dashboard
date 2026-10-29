import type { FundData, NavPoint } from './types.ts';

export interface VerifiedNavReview {
  schemeCode: number;
  correction: { date: string; sourceNav: number; verifiedNav: number; applied: boolean; evidenceUrl: string };
  events: { previousDate: string; date: string; description: string; evidenceUrl: string }[];
}

const BOI_2022_REPORT = 'https://www.boimf.in/docs/default-source/reports/financials/annual-report-2021-224ace7e8cb8f74e8f8d11443c4b271be0.pdf?sfvrsn=32295bd6_6';
const BOI_2020_REPORT = 'https://www.boimf.in/docs/default-source/reports/financials/annual-report-2019-20.pdf';
const TWO_MOVES = 'Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.';

function validSeries(points: NavPoint[]): boolean {
  return points.length >= 5 && points.every((point,index)=>
    /^\d{4}-\d{2}-\d{2}$/.test(point.date) && Number.isFinite(Date.parse(point.date))
    && new Date(point.date+'T00:00:00Z').toISOString().slice(0,10)===point.date
    && Number.isFinite(point.nav) && point.nav>0
    && (index===0 || points[index-1].date<point.date));
}

function largeMoveIndexes(points: NavPoint[]): number[] {
  const indexes:number[]=[];
  for(let index=1;index<points.length;index++){
    const ratio=points[index].nav/points[index-1].nav;
    if(ratio>1.4+1e-12 || ratio<0.6-1e-12)indexes.push(index);
  }
  return indexes;
}

function reviewableSeries(fund: FundData): boolean {
  const warnings=fund.warnings.filter(warning=>/^Unresolved discontinuity\b/i.test(warning));
  return warnings.length===1 && warnings[0]===TWO_MOVES
    && !fund.warnings.some(warning=>/^(?:Invalid NAV observations|Conflicting NAV values)\b/i.test(warning))
    && validSeries(fund.points);
}

export function navReviewSummary(review: VerifiedNavReview, includeEvidence = true): string {
  const correction=review.correction;
  const basis=correction.applied
    ? `Calculation NAV on ${correction.date}: source ${correction.sourceNav} replaced by issuer-verified ${correction.verifiedNav}.`
    : `Source NAV on ${correction.date} already matches issuer-verified ${correction.verifiedNav}; no NAV substitution was needed.`;
  const events=review.events.length
    ? `Economic investment returns are retained: ${review.events.map(event=>`${event.date} ${event.description}`).join('; ')}.`
    : 'All other calculation NAVs are unchanged.';
  return `${basis} ${events} Raw source observations and warnings remain unchanged.${includeEvidence?` Evidence: ${correction.evidenceUrl}`:''}`;
}

/** The issuer's exact historical NAV corrects one spike; no event exemption. */
function reviewedAbslBasis(fund: FundData): {fund: FundData; review: VerifiedNavReview} | null {
  const identity=([
    {code:106873,plan:'Regular',isin:'INF209K01520',before:21.0216,source:68.2847,verified:20.9025,after:20.8571,
      query:'SchemeName=ABSL+International+EquityFund+-Regular-Growth&Type=N&SchemeCode=297G'},
    {code:119517,plan:'Direct',isin:'INF209K01WS3',before:21.7136,source:70.5334,verified:21.5909,after:21.5441,
      query:'SchemeName=ABSL+International+Equity-Fund-Direct-Growth&Type=N&SchemeCode=297GZ'},
  ] as const).find(item=>item.code===fund.meta.schemeCode);
  if(!identity || fund.source!=='mfapi.in'
    || fund.meta.schemeName!==`Aditya Birla Sun Life International Equity Fund - ${identity.plan} Plan - GROWTH`
    || fund.meta.fundHouse!=='Aditya Birla Sun Life Mutual Fund' || fund.meta.isinGrowth!==identity.isin
    || fund.meta.isinDivReinvestment!=null || fund.meta.schemeType!=='Open Ended Schemes'
    || fund.meta.schemeCategory!=='Equity Scheme - Sectoral/ Thematic' || !reviewableSeries(fund))return null;
  const index=fund.points.findIndex(point=>point.date==='2019-04-10');
  if(index<1 || index+1>=fund.points.length)return null;
  const before=fund.points[index-1],source=fund.points[index],after=fund.points[index+1];
  if(before.date!=='2019-04-09' || before.nav!==identity.before || source.nav!==identity.source
    || after.date!=='2019-04-11' || after.nav!==identity.after)return null;
  const rawMoves=largeMoveIndexes(fund.points);
  if(rawMoves.length!==2 || rawMoves[0]!==index || rawMoves[1]!==index+1)return null;
  const points=fund.points.map((point,at)=>({...point,nav:at===index?identity.verified:point.nav}));
  if(!validSeries(points) || largeMoveIndexes(points).length!==0)return null;
  const review:VerifiedNavReview={schemeCode:identity.code,events:[],
    correction:{date:'2019-04-10',sourceNav:identity.source,verifiedNav:identity.verified,applied:true,
      evidenceUrl:'https://mutualfund.adityabirlacapital.com/api/sitecore/Shared/PostHistoricalNavandDividendFile?'
        +identity.query+'&FromDate=09-Apr-2019&ToDate=11-Apr-2019'}};
  return {review,fund:{...fund,points,warnings:[...fund.warnings.filter(warning=>warning!==TWO_MOVES),navReviewSummary(review)]}};
}

/**
 * Exact primary-backed BOI review, separate from unit adjustments. The annual
 * accounts, March2022 factsheet and dated issuer NAV response agree on the one
 * corrected value. The large loss/gain remain investment returns; no factor is
 * fitted to the curve. Full evidence: docs/BULK_DISCREPANCY_FINALIZATION_2026-10-29.md.
 */
export function reviewedNavBasis(fund: FundData): { fund: FundData; review: VerifiedNavReview } | null {
  const absl=reviewedAbslBasis(fund);
  if(absl)return absl;
  const identity=([
    {code:133867,plan:'Regular',isin:'INF761K01DH6',beforeLoss:7.3408,afterLoss:3.6542,
      beforeGain:4.6321,source:9.6296,verified:10.2756,afterGain:10.2777},
    {code:133868,plan:'Direct',isin:'INF761K01DG8',beforeLoss:7.4051,afterLoss:3.6863,
      beforeGain:4.698,source:9.7667,verified:10.4219,afterGain:10.4243},
  ] as const).find(item=>item.code===fund.meta.schemeCode);
  if(!identity || fund.source!=='mfapi.in'
    || fund.meta.schemeName!==`BANK OF INDIA CREDIT RISK FUND - ${identity.plan} Plan - Growth`
    || fund.meta.fundHouse!=='Bank of India Mutual Fund' || fund.meta.isinGrowth!==identity.isin
    || fund.meta.isinDivReinvestment!=null || fund.meta.schemeType!=='Open Ended Schemes'
    || fund.meta.schemeCategory!=='Debt Scheme - Credit Risk Fund')return null;
  if(!reviewableSeries(fund))return null;

  const loss=fund.points.findIndex(point=>point.date==='2020-04-24');
  const gain=fund.points.findIndex(point=>point.date==='2022-03-31');
  if(loss<1 || gain<1 || gain+1>=fund.points.length)return null;
  const beforeLoss=fund.points[loss-1],afterLoss=fund.points[loss];
  const beforeGain=fund.points[gain-1],atGain=fund.points[gain],afterGain=fund.points[gain+1];
  if(beforeLoss.date!=='2020-04-23' || beforeLoss.nav!==identity.beforeLoss || afterLoss.nav!==identity.afterLoss
    || beforeGain.date!=='2022-03-30' || beforeGain.nav!==identity.beforeGain
    || (atGain.nav!==identity.source && atGain.nav!==identity.verified)
    || afterGain.date!=='2022-04-04' || afterGain.nav!==identity.afterGain)return null;
  const rawMoves=largeMoveIndexes(fund.points);
  if(rawMoves.length!==2 || rawMoves[0]!==loss || rawMoves[1]!==gain)return null;

  const points=fund.points.map((point,index)=>({...point,nav:index===gain?identity.verified:point.nav}));
  const reviewedMoves=largeMoveIndexes(points);
  if(!validSeries(points) || reviewedMoves.length!==2 || reviewedMoves[0]!==loss || reviewedMoves[1]!==gain)return null;
  const review:VerifiedNavReview={schemeCode:identity.code,
    correction:{date:'2022-03-31',sourceNav:atGain.nav,verifiedNav:identity.verified,
      applied:atGain.nav!==identity.verified,evidenceUrl:BOI_2022_REPORT+'#page=87'},
    events:[
      {previousDate:'2020-04-23',date:'2020-04-24',description:'issuer-documented credit markdown',evidenceUrl:BOI_2020_REPORT+'#page=155'},
      {previousDate:'2022-03-30',date:'2022-03-31',description:'issuer-confirmed NAV gain in a recovery period',evidenceUrl:BOI_2022_REPORT+'#page=24'},
    ]};
  return {review,fund:{...fund,points,warnings:[...fund.warnings.filter(warning=>warning!==TWO_MOVES),navReviewSummary(review)]}};
}
