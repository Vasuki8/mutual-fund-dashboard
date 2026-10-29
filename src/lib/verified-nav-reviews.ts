import type { FundData, NavPoint } from './types.ts';
import { SBI_INFRASTRUCTURE_HISTORY } from './verified-sbi-infrastructure-history.ts';

type VerifiedNavCorrection = { date: string; sourceNav: number; verifiedNav: number; applied: boolean; evidenceUrl: string };

export type VerifiedNavReview = {
  schemeCode: number;
  events: { previousDate: string; date: string; description: string; evidenceUrl: string }[];
} & ({
  correction: VerifiedNavCorrection;
  restoration?: never;
} | {
  correction?: never;
  restoration: { fromDate: string; throughDate: string; addedObservations: number; evidenceUrl: string;
    corrections?: VerifiedNavCorrection[] };
});

const BOI_2022_REPORT = 'https://www.boimf.in/docs/default-source/reports/financials/annual-report-2021-224ace7e8cb8f74e8f8d11443c4b271be0.pdf?sfvrsn=32295bd6_6';
const BOI_2020_REPORT = 'https://www.boimf.in/docs/default-source/reports/financials/annual-report-2019-20.pdf';
const TWO_MOVES = 'Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.';
const ONE_MOVE = 'Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked.';
const THREE_ZERO_ROWS = 'Invalid NAV observations were excluded (3); derived analytics are blocked until the data is resolved.';

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

function reviewableSeries(fund: FundData, expectedWarning = TWO_MOVES): boolean {
  const warnings=fund.warnings.filter(warning=>/^Unresolved discontinuity\b/i.test(warning));
  return warnings.length===1 && warnings[0]===expectedWarning
    && !fund.warnings.some(warning=>/^(?:Invalid NAV observations|Conflicting NAV values)\b/i.test(warning))
    && validSeries(fund.points);
}

export function navReviewEvidenceUrl(review: VerifiedNavReview): string {
  return review.restoration ? review.restoration.evidenceUrl : review.correction.evidenceUrl;
}

function correctionSummary(correction: VerifiedNavCorrection): string {
  return correction.applied
    ? `Calculation NAV on ${correction.date}: source ${correction.sourceNav} replaced by issuer-verified ${correction.verifiedNav}.`
    : `Source NAV on ${correction.date} already matches issuer-verified ${correction.verifiedNav}; no NAV substitution was needed.`;
}

export function navReviewSummary(review: VerifiedNavReview, includeEvidence = true): string {
  if(review.restoration){
    const restored=review.restoration;
    const existing=restored.corrections?.length
      ? `${restored.corrections.map(correctionSummary).join(' ')} All other existing calculation NAVs are retained.`
      : 'Existing source NAV values are retained.';
    return `Added ${restored.addedObservations} issuer-verified NAV observations for calculations from ${restored.fromDate} through ${restored.throughDate}. ${existing} Raw source observations and warnings remain unchanged.${includeEvidence?` Evidence: ${restored.evidenceUrl}`:''}`;
  }
  const correction=review.correction;
  const basis=correctionSummary(correction);
  const events=review.events.length
    ? `Economic investment returns are retained: ${review.events.map(event=>`${event.date} ${event.description}`).join('; ')}.`
    : 'All other calculation NAVs are unchanged.';
  return `${basis} ${events} Raw source observations and warnings remain unchanged.${includeEvidence?` Evidence: ${correction.evidenceUrl}`:''}`;
}

/** Every rejected row must be identified before an issuer value can replace it. */
function reviewedSundaramZeros(fund: FundData): {fund: FundData; review: VerifiedNavReview} | null {
  const identity=([
    {code:119566,name:'Sundaram Large and Midcap Fund - Direct Plan - GROWTH',isin:'INF903J01PR9',
      category:'Equity Scheme - Large & Mid Cap Fund',restored:[15.3408,15.2991,15.3408],
      anchors:[15.368,15.342,15.2675,15.1184,15.3124,15.3284,15.1999,15.2371,15.1646]},
    {code:119635,name:'Sundaram Conservative Hybrid Fund (Formerly Known as Sundaram Debt Oriented Hybrid Fund) - Direct Plan - GROWTH',
      isin:'INF903J01OP6',category:'Hybrid Scheme - Conservative Hybrid Fund',restored:[11.9501,12.0196,12.0196],
      anchors:[11.9874,11.9973,12.0009,11.9399,12.0104,12.017,11.9493,11.9682,12.0074]},
  ] as const).find(item=>item.code===fund.meta.schemeCode);
  if(!identity || fund.source!=='mfapi.in' || fund.meta.schemeName!==identity.name
    || fund.meta.fundHouse!=='Sundaram Mutual Fund' || fund.meta.isinGrowth!==identity.isin
    || fund.meta.isinDivReinvestment!=null || fund.meta.schemeType!=='Open Ended Schemes'
    || fund.meta.schemeCategory!==identity.category || !validSeries(fund.points))return null;
  const quality=fund.warnings.filter(warning=>/^(?:Invalid NAV|Conflicting NAV|Unresolved discontinuity)\b/i.test(warning));
  if((quality.length>0 && (quality.length!==1 || quality[0]!==THREE_ZERO_ROWS))
    || largeMoveIndexes(fund.points).length!==0)return null;

  const evidenceUrl='https://www.sundarammutual.com/nav-dividend-history';
  const corrections:VerifiedNavCorrection[]=[];
  if(identity.code===119635){
    const dates=['2018-09-21','2018-09-24','2018-09-25','2018-09-26','2018-09-27','2018-09-28','2018-10-01'];
    const navs=[19.4882,19.4019,19.3986,19.4293,19.4015,19.3779,19.3895];
    const window=fund.points.filter(point=>point.date>=dates[0] && point.date<=dates.at(-1)!);
    if(window.length!==dates.length || !window.every((point,index)=>point.date===dates[index]
      && (point.nav===navs[index] || index===3 && point.nav===19.4292)))return null;
    corrections.push({date:'2018-09-26',sourceNav:window[3].nav,verifiedNav:19.4292,
      applied:window[3].nav!==19.4292,evidenceUrl});
  }
  // The September value has its own primary proof. A provider repair of the
  // January zeros must not make this independent correction disappear.
  if(quality.length===0){
    if(fund.rejectedZeroNavDates!==undefined)return null;
    const correction=corrections[0];
    if(!correction?.applied)return null;
    const points=fund.points.map(point=>({...point,nav:point.date===correction.date?correction.verifiedNav:point.nav}));
    if(!validSeries(points) || largeMoveIndexes(points).length!==0)return null;
    const review:VerifiedNavReview={schemeCode:identity.code,events:[],correction};
    return {review,fund:{...fund,points,warnings:[...fund.warnings,navReviewSummary(review)]}};
  }
  const rejectedDates=['2013-01-03','2013-01-04','2013-01-07'];
  if(!Array.isArray(fund.rejectedZeroNavDates) || fund.rejectedZeroNavDates.length!==3
    || !rejectedDates.every((date,index)=>fund.rejectedZeroNavDates![index]===date))return null;
  const anchorDates=['2013-01-08','2013-01-09','2013-01-10','2013-01-11','2013-01-14',
    '2013-01-15','2013-01-16','2013-01-17','2013-01-18'];
  if(!anchorDates.every((date,index)=>fund.points[index]?.date===date && fund.points[index]?.nav===identity.anchors[index]))return null;
  const points=[...rejectedDates.map((date,index)=>({date,nav:identity.restored[index]})),
    ...fund.points.map(point=>({...point,nav:corrections.find(correction=>correction.date===point.date)?.verifiedNav ?? point.nav}))];
  if(!validSeries(points) || largeMoveIndexes(points).length!==0)return null;
  const review:VerifiedNavReview={schemeCode:identity.code,events:[],restoration:{
    fromDate:'2013-01-03',throughDate:'2013-01-07',addedObservations:3,evidenceUrl,
    ...(corrections.length?{corrections}:{}),
  }};
  return {review,fund:{...fund,points,warnings:[...fund.warnings.filter(warning=>warning!==THREE_ZERO_ROWS),navReviewSummary(review)]}};
}

/** Restore one exact documented gap; never infer values or waive a large move. */
function reviewedSbiHistory(fund: FundData): {fund: FundData; review: VerifiedNavReview} | null {
  if(fund.meta.schemeCode!==106096 || fund.source!=='mfapi.in'
    || fund.meta.schemeName!=='SBI INFRASTRUCTURE FUND - Regular Plan - Growth'
    || fund.meta.fundHouse!=='SBI Mutual Fund' || fund.meta.isinGrowth!=='INF200K01CT2'
    || fund.meta.isinDivReinvestment!=null || fund.meta.schemeType!=='Open Ended Schemes'
    || fund.meta.schemeCategory!=='Equity Scheme - Sectoral/ Thematic'
    || !reviewableSeries(fund,ONE_MOVE))return null;

  const gapEnd=fund.points.findIndex(point=>point.date==='2010-07-09');
  if(gapEnd<1 || fund.points[gapEnd-1].date!=='2009-04-02')return null;
  const expectedAnchors=SBI_INFRASTRUCTURE_HISTORY.filter(point=>point.date<='2009-04-02' || point.date>='2010-07-09');
  const sourceWindow=fund.points.filter(point=>point.date>='2009-04-01' && point.date<='2010-07-15');
  if(sourceWindow.length!==7 || expectedAnchors.length!==7
    || !expectedAnchors.every((point,index)=>point.date===sourceWindow[index].date && point.nav===sourceWindow[index].nav))return null;
  const rawMoves=largeMoveIndexes(fund.points);
  if(rawMoves.length!==1 || rawMoves[0]!==gapEnd)return null;

  const added=SBI_INFRASTRUCTURE_HISTORY.filter(point=>point.date>'2009-04-02' && point.date<'2010-07-09');
  if(added.length!==303)return null;
  const points=[...fund.points,...added].map(point=>({...point})).sort((a,b)=>a.date.localeCompare(b.date));
  if(!validSeries(points) || largeMoveIndexes(points).length!==0)return null;
  const review:VerifiedNavReview={schemeCode:106096,events:[],restoration:{
    fromDate:'2009-04-06',throughDate:'2010-07-08',addedObservations:added.length,
    evidenceUrl:'https://www.sbimf.com/mutual-fund-nav',
  }};
  return {review,fund:{...fund,points,warnings:[...fund.warnings.filter(warning=>warning!==ONE_MOVE),navReviewSummary(review)]}};
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
  const sundaram=reviewedSundaramZeros(fund);
  if(sundaram)return sundaram;
  const sbiHistory=reviewedSbiHistory(fund);
  if(sbiHistory)return sbiHistory;
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
