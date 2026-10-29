import type { FundData, NavPoint } from './types.ts';

/**
 * A documented 10:1 ICICI Prudential Overnight Fund unit consolidation.
 * AMC notice 011/07/2022 dated 28 July 2022, effective 16 August 2022:
 * Financial Express, 29 July 2022, newspaper page 10 / PDF page 2:
 * https://nsearchives.nseindia.com/corporate/CHALET_29072022144748_NewspaperAdvertisement29072022.pdf
 *
 * Only the fund's financial-analysis copy is adjusted. Archived/source NAVs
 * and the raw observed NAV chart and CSV must stay unchanged.
 */
export const OVERNIGHT_SCHEME_CODE = 145536;
export const OVERNIGHT_REGULAR_SCHEME_CODE = 145535;
export const OVERNIGHT_CONSOLIDATION_DATE = '2022-08-16'; // AMC effective date
// The source NAV still uses the old unit denomination on 16 August.
// The first verified new-denomination NAV is dated 17 August 2022.
export const OVERNIGHT_LAST_OLD_BASIS_NAV_DATE = '2022-08-16';
export const OVERNIGHT_FIRST_NEW_BASIS_NAV_DATE = '2022-08-17';
export const OVERNIGHT_CONSOLIDATION_FACTOR = 10;
export const OVERNIGHT_AMC_NOTICE =
  'https://nsearchives.nseindia.com/corporate/CHALET_29072022144748_NewspaperAdvertisement29072022.pdf#page=2';

/**
 * Scheme 100047 is the continuing Growth identity of the fund formerly
 * named Birla Sun Life Cash Plus. Its issuer changed face value ₹10 -> ₹100
 * effective 7 Oct 2011; checkpoint 182 confirms one 6-to-7 Oct 2011 jump.
 * Do not generalize this to IDCW plans or other scheme codes.
 */
export const BIRLA_LIQUID_GROWTH_CODE = 100047;
export const BIRLA_LAST_OLD_NAV_DATE = '2011-10-06';
export const BIRLA_FIRST_NEW_NAV_DATE = '2011-10-07';
export const BIRLA_2011_NOTICE =
  'https://www.valueresearchonline.com/stories/18192/birla-sun-life-mf-changes-the-face-value-of-6-debt-schemes/';

export const KNOWN_OVERNIGHT_WARNING =
  'Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked.';

export interface VerifiedUnitAdjustment {
  schemeCode: number;
  /** Plain explanation of the precise documented scheme action. */
  label: string;
  oldNavThrough: string;
  firstNewNavDate: string;
  factor: number;
  evidenceUrl: string;
}

export interface FinancialNavBasis {
  /** A calculation-only copy. Never persist this as a raw source history. */
  fund: FundData;
  /** False unless the specific action and the actual NAV step both match. */
  adjusted: boolean;
  adjustment?: VerifiedUnitAdjustment;
  /** Multiple events are exposed separately; never collapse their date boundaries. */
  adjustments?: VerifiedUnitAdjustment[];
}

type ActionSpec = VerifiedUnitAdjustment & { maxFactorDeviation: number };

function actionForScheme(fund: FundData): ActionSpec | null {
  if (isExactScheme(fund)) return {
    schemeCode: fund.meta.schemeCode,
    label:'verified 10-to-1 ICICI Prudential Overnight Fund unit consolidation effective 16 August 2022',
    oldNavThrough:OVERNIGHT_LAST_OLD_BASIS_NAV_DATE,
    firstNewNavDate:OVERNIGHT_FIRST_NEW_BASIS_NAV_DATE,
    factor:OVERNIGHT_CONSOLIDATION_FACTOR, evidenceUrl:OVERNIGHT_AMC_NOTICE,
    maxFactorDeviation:0.5,
  };
  // Exact alternate source label verified in checkpoint 198, not fuzzy matching.
  if (fund.meta.schemeCode===BIRLA_LIQUID_GROWTH_CODE &&
    ['aditya birla sun life liquid fund - growth',
      'aditya birla sun life liquid fund - regular plan - growth']
      .includes(fund.meta.schemeName.trim().toLocaleLowerCase('en'))) return {
    schemeCode:BIRLA_LIQUID_GROWTH_CODE,
    label:'verified 10-to-1 Birla Sun Life Cash Plus unit consolidation effective 7 October 2011 (now Aditya Birla Sun Life Liquid Fund)',
    oldNavThrough:BIRLA_LAST_OLD_NAV_DATE,firstNewNavDate:BIRLA_FIRST_NEW_NAV_DATE,
    factor:10,evidenceUrl:BIRLA_2011_NOTICE,maxFactorDeviation:0.05,
  };
  // SBI's March-2012 half-year report documents face value Rs10 -> Rs1000
  // effective 13-Jan-2012. Exact Sep-2011/Mar-2012 source NAVs connect only
  // these current Growth identities to the report's historical scheme names.
  const sbiJanuaryIdentity = ([
    [100641, 'sbi ultra short term fund - regular plan - growth', 'INF200K01LJ4',
      'SBI Magnum InstaCash Fund Cash Option', 13],
    [105274, 'sbi liquid fund - regular plan - growth', 'INF200K01LU1',
      'SBI Premier Liquid Fund Institutional Growth', 18],
  ] as const).find(([code]) => code===fund.meta.schemeCode);
  if (sbiJanuaryIdentity && fund.meta.schemeName.toLowerCase()===sbiJanuaryIdentity[1]
    && fund.meta.isinGrowth===sbiJanuaryIdentity[2] && fund.meta.fundHouse==='SBI Mutual Fund') return {
    schemeCode:fund.meta.schemeCode,
    label:`verified 100-to-1 ${sbiJanuaryIdentity[3]} unit consolidation effective 13 January 2012`,
    oldNavThrough:'2012-01-12',firstNewNavDate:'2012-01-13',
    // Retain ordinary interest return by applying the documented factor.
    factor:100,maxFactorDeviation:0.1,
    evidenceUrl:`https://www.sbimf.com/docs/default-source/scheme-portfolios/default-library/unaudited-half-yearly-results-(as-on-march-31-2012).pdf?sfvrsn=24795812_0#page=${sbiJanuaryIdentity[4]}`,
  };
  // Reliance's Sep-2012 half-year report, page 34 note 9, documents Treasury
  // Plan face value Rs10 -> Rs1000 effective 5-Aug-2012. Exact Mar/Sep NAVs
  // connect only these current Growth identities to its Retail/Institutional columns.
  const nipponAugustIdentity = ([
    [100837, 'nippon india liquid fund - regular plan - retail plan - growth option', 'INF204K01UL3', 'Retail'],
    [100851, 'nippon india liquid fund - regular plan - growth option', 'INF204K01UN9', 'Institutional'],
  ] as const).find(([code]) => code===fund.meta.schemeCode);
  if (nipponAugustIdentity && fund.meta.schemeName.toLowerCase()===nipponAugustIdentity[1]
    && fund.meta.isinGrowth===nipponAugustIdentity[2] && fund.meta.fundHouse==='Nippon India Mutual Fund') return {
    schemeCode:fund.meta.schemeCode,
    label:`verified 100-to-1 Reliance Liquid Fund Treasury ${nipponAugustIdentity[3]} Growth unit consolidation effective 5 August 2012`,
    oldNavThrough:'2012-08-03',firstNewNavDate:'2012-08-05',
    // Apply the documented factor and preserve the ordinary interest return.
    factor:100,maxFactorDeviation:0.1,
    evidenceUrl:'https://mf.nipponindiaim.com/InvestorServices/AnnualHalfYearlyReportsFY20122013/Half_Yearly_Portfolio_-_Financials_-_Oct-_2012_-_for_Website_upload.pdf#page=34',
  };
  // HDFC's 14-Aug-2015 notice covers both Regular and Direct plans.
  // Checkpoints 207/208 independently verify these two Growth identities
  // and their exact 28-to-30 August source boundaries. No other plan is implied.
  const hdfcPlan = fund.meta.schemeCode===100868 ? 'regular'
    : fund.meta.schemeCode===119091 ? 'direct' : null;
  if (hdfcPlan!==null && fund.meta.schemeName.toLowerCase()
    ===`hdfc liquid fund - ${hdfcPlan} plan - growth option`
    && fund.meta.fundHouse==='HDFC Mutual Fund') return {
    schemeCode:fund.meta.schemeCode,
    label:'verified 100-to-1 HDFC Liquid Fund unit consolidation effective 30 August 2015',
    oldNavThrough:'2015-08-28',firstNewNavDate:'2015-08-30',
    factor:100,maxFactorDeviation:0.1,
    evidenceUrl:'https://files.hdfcfund.com/s3fs-public/addenda-reports/636%20-%20Addendum%20-%20Change%20in%20Face%20Value%20of%20Liquid%20Schemes%20-%20August%2014,%202015.pdf',
  };
  // The same official notice covers Savings and Call Plans. The issuer's
  // 2018 categorization maps these to Money Market and Overnight respectively.
  // Checkpoint 208 independently verifies EACH exact Growth code and boundary.
  const hdfcCashIdentity = ([
    [101993, 'hdfc money market fund - regular plan - growth option', 'Savings Plan'],
    [101996, 'hdfc overnight fund - regular plan - growth option', 'Call Plan'],
    [119092, 'hdfc money market fund - direct plan - growth option', 'Savings Plan'],
    [119110, 'hdfc overnight fund - direct plan - growth option', 'Call Plan'],
  ] as const).find(([code]) => code===fund.meta.schemeCode);
  if (hdfcCashIdentity && fund.meta.schemeName.toLowerCase()===hdfcCashIdentity[1]
    && fund.meta.fundHouse==='HDFC Mutual Fund') return {
    schemeCode:fund.meta.schemeCode,
    label:`verified 100-to-1 HDFC Cash Management Fund ${hdfcCashIdentity[2]} unit consolidation effective 30 August 2015`,
    oldNavThrough:'2015-08-28',firstNewNavDate:'2015-08-30',
    factor:100,maxFactorDeviation:0.1,
    evidenceUrl:'https://files.hdfcfund.com/s3fs-public/addenda-reports/636%20-%20Addendum%20-%20Change%20in%20Face%20Value%20of%20Liquid%20Schemes%20-%20August%2014,%202015.pdf',
  };
  // MSE/LIST/10126/2021 and the issuer's February 2021 factsheet confirm
  // these splits and new ISINs. Checkpoint 208 verifies both full histories.
  // The source NAV denomination changes after the 19-Feb record-date NAV.
  const hdfcEtfIdentity = ([
    [113049, 'hdfc gold etf - growth option', 'INF179KC1981', 0.01, 100, 'HDFC Gold ETF'],
    [135853, 'hdfc nifty 50 etf - growth option', 'INF179KC1965', 0.1, 10, 'HDFC NIFTY 50 ETF'],
  ] as const).find(([code]) => code===fund.meta.schemeCode);
  if (hdfcEtfIdentity && fund.meta.schemeName.toLowerCase()===hdfcEtfIdentity[1]
    && fund.meta.isinGrowth===hdfcEtfIdentity[2] && fund.meta.fundHouse==='HDFC Mutual Fund') return {
    schemeCode:fund.meta.schemeCode,
    label:`verified ${hdfcEtfIdentity[4]}-for-1 ${hdfcEtfIdentity[5]} unit split (record date 19 February 2021)`,
    oldNavThrough:'2021-02-19',firstNewNavDate:'2021-02-22',
    // Retain the actual market return, not the apparent 90%/99% denomination
    // loss. A separate 5% residual-move bound applies only to these two events.
    factor:hdfcEtfIdentity[3],maxFactorDeviation:hdfcEtfIdentity[3]*0.05,
    evidenceUrl:'https://www.msei.in/SX-Content/Circulars/2021/February/Circular-10126.pdf',
  };
  // Issuer notice dated 20-Jun-2017 covers all Liquid Fund plans/options.
  // Checkpoint 208 independently verifies these two exact Growth plans and
  // their source NAV boundary, distinct from the 1-Jul legal effective date.
  const edelweissPlan = fund.meta.schemeCode===140182 ? 'regular'
    : fund.meta.schemeCode===140196 ? 'direct' : null;
  if (edelweissPlan!==null && fund.meta.schemeName.toLowerCase()
    ===`edelweiss liquid fund - ${edelweissPlan} plan - growth`
    && fund.meta.fundHouse==='Edelweiss Mutual Fund') return {
    schemeCode:fund.meta.schemeCode,
    label:'verified 100-to-1 Edelweiss Liquid Fund unit consolidation effective 1 July 2017',
    oldNavThrough:'2017-06-30',firstNewNavDate:'2017-07-02',
    factor:100,maxFactorDeviation:0.1,
    evidenceUrl:'https://www.edelweissmf.com/Files/downloads/Notice-Cum-Addendum/2017/Edelweiss-NoticecumAddendum-21-jun17.pdf',
  };
  // NSE/CML/58972 and HDFC's 12-Oct-2023 notice confirm these five 10:1 splits.
  // Verified saved NAVs retain the old unit basis on the 20-Oct record date;
  // each exact history first reports the new basis on 23-Oct. No other ETF is implied.
  const hdfcOctoberEtfIdentity = ([
    [150476, 'hdfc nifty 100 etf - growth option', 'INF179KC1HR4', 'HDFC NIFTY 100 ETF'],
    [150477, 'hdfc nifty next 50 etf - growth option', 'INF179KC1HS2', 'HDFC NIFTY NEXT 50 ETF'],
    [150657, 'hdfc nifty200 momentum 30 etf - growth option', 'INF179KC1HV6', 'HDFC NIFTY200 MOMENTUM 30 ETF'],
    [150658, 'hdfc nifty100 low volatility 30 etf - growth option', 'INF179KC1HU8', 'HDFC NIFTY100 Low Volatility 30 ETF'],
    [151374, 'hdfc nifty midcap 150 etf - growth option', 'INF179KC1HT0', 'HDFC NIFTY Midcap 150 ETF'],
  ] as const).find(([code]) => code===fund.meta.schemeCode);
  if (hdfcOctoberEtfIdentity && fund.meta.schemeName.toLowerCase()===hdfcOctoberEtfIdentity[1]
    && fund.meta.isinGrowth===hdfcOctoberEtfIdentity[2] && fund.meta.fundHouse==='HDFC Mutual Fund') return {
    schemeCode:fund.meta.schemeCode,
    label:`verified 10-for-1 ${hdfcOctoberEtfIdentity[3]} unit split (record date 20 October 2023)`,
    oldNavThrough:'2023-10-20',firstNewNavDate:'2023-10-23',
    // Keep the actual market return. This conservative residual-move bound
    // is specific to these independently verified events, not a general repair rule.
    factor:0.1,maxFactorDeviation:0.005,
    evidenceUrl:'https://nsearchives.nseindia.com/content/circulars/CML58972.pdf',
  };
  // NSE/CML/60421 confirms these 10:1 splits effective on the exchange
  // from 2-Feb-2024. Verified source NAVs change basis on 5-Feb instead.
  // Sensex has two events and is deliberately not authorized here.
  const hdfcFebruaryEtfIdentity = ([
    [148461, 'hdfc nifty bank etf - growth option', 'INF179KC1HY0', 'HDFC NIFTY BANK ETF'],
    [150801, 'hdfc nifty it etf - growth option', 'INF179KC1IA8', 'HDFC NIFTY IT ETF'],
    [150802, 'hdfc nifty private bank etf - growth option', 'INF179KC1HZ7', 'HDFC NIFTY Private Bank ETF'],
  ] as const).find(([code]) => code===fund.meta.schemeCode);
  if (hdfcFebruaryEtfIdentity && fund.meta.schemeName.toLowerCase()===hdfcFebruaryEtfIdentity[1]
    && fund.meta.isinGrowth===hdfcFebruaryEtfIdentity[2] && fund.meta.fundHouse==='HDFC Mutual Fund') return {
    schemeCode:fund.meta.schemeCode,
    label:`verified 10-for-1 ${hdfcFebruaryEtfIdentity[3]} unit split (exchange effective date 2 February 2024)`,
    oldNavThrough:'2024-02-02',firstNewNavDate:'2024-02-05',
    // A documented split factor removes only denomination loss; ordinary
    // market movement and all independent quality evidence remain intact.
    factor:0.1,maxFactorDeviation:0.005,
    evidenceUrl:'https://nsearchives.nseindia.com/content/circulars/CML60421.pdf',
  };
  // NSE/CML/47721 confirms the two distinct UTI splits and current ISINs.
  // Saved NAVs retain old units on 26-Mar; new-unit observations start 30-Mar.
  const utiMarchEtfIdentity = ([
    [105463, 'uti - gold exchange traded fund - direct plan - growth', 'INF789F1AUX7', 0.01, 100, 'UTI Gold ETF'],
    [141665, 'uti - nifty next 50 exchange traded fund - direct plan - growth', 'INF789F1AUW9', 0.1, 10, 'UTI Nifty Next 50 ETF'],
  ] as const).find(([code]) => code===fund.meta.schemeCode);
  if (utiMarchEtfIdentity && fund.meta.schemeName.toLowerCase()===utiMarchEtfIdentity[1]
    && fund.meta.isinGrowth===utiMarchEtfIdentity[2] && fund.meta.fundHouse==='UTI Mutual Fund') return {
    schemeCode:fund.meta.schemeCode,
    label:`verified ${utiMarchEtfIdentity[4]}-for-1 ${utiMarchEtfIdentity[5]} unit split (effective date 26 March 2021)`,
    oldNavThrough:'2021-03-26',firstNewNavDate:'2021-03-30',
    // Apply the documented factor, not a fitted ratio; retain market movement.
    factor:utiMarchEtfIdentity[3],maxFactorDeviation:utiMarchEtfIdentity[3]*0.05,
    evidenceUrl:'https://nsearchives.nseindia.com/content/circulars/CML47721.pdf',
  };
  // UTI's 4-Feb-2021 notice covers these two 10-for-1 splits.
  // Each complete saved history changes units after the 19-Feb record NAV.
  const utiFebruaryEtfIdentity = ([
    [148173, 'uti nifty bank etf - direct plan - growth', 'INF789F1AUV1', 'UTI Nifty Bank ETF'],
    [146388, 'uti - bse sensex next 50 exchange traded fund - direct plan - growth', 'INF789F1AUU3', 'UTI BSE Sensex Next 50 ETF'],
  ] as const).find(([code]) => code===fund.meta.schemeCode);
  if (utiFebruaryEtfIdentity && fund.meta.schemeName.toLowerCase()===utiFebruaryEtfIdentity[1]
    && fund.meta.isinGrowth===utiFebruaryEtfIdentity[2] && fund.meta.fundHouse==='UTI Mutual Fund') return {
    schemeCode:fund.meta.schemeCode,
    label:`verified 10-for-1 ${utiFebruaryEtfIdentity[3]} unit split (record date 19 February 2021)`,
    oldNavThrough:'2021-02-19',firstNewNavDate:'2021-02-22',
    factor:0.1,maxFactorDeviation:0.005,
    evidenceUrl:'https://bsmedia.business-standard.com/_media/bs/data/announcements/bse/05022021/aca4ac2d-ea8f-4dda-b674-03275fb1dec6.pdf',
  };
  return null;
}

/** Only the exact independently verified Sensex identity can use two events. */
function actionsForScheme(fund: FundData): ActionSpec[] {
  if (fund.meta.schemeCode===135854
    && fund.meta.schemeName.toLowerCase()==='hdfc bse sensex etf - growth option'
    && fund.meta.isinGrowth==='INF179KC1HX2' && fund.meta.fundHouse==='HDFC Mutual Fund') return [
    {schemeCode:135854,
      label:'verified 10-for-1 HDFC BSE Sensex ETF unit split (record date 19 February 2021)',
      oldNavThrough:'2021-02-19',firstNewNavDate:'2021-02-22',factor:0.1,maxFactorDeviation:0.005,
      evidenceUrl:'https://www.msei.in/SX-Content/Circulars/2021/February/Circular-10126.pdf'},
    {schemeCode:135854,
      label:'verified 10-for-1 HDFC BSE Sensex ETF unit split (exchange effective date 2 February 2024)',
      oldNavThrough:'2024-02-02',firstNewNavDate:'2024-02-05',factor:0.1,maxFactorDeviation:0.005,
      evidenceUrl:'https://nsearchives.nseindia.com/content/circulars/CML60421.pdf'},
  ];
  const single=actionForScheme(fund);
  return single?[single]:[];
}

function isExactScheme(fund: FundData): boolean {
  const plan = fund.meta.schemeCode === OVERNIGHT_SCHEME_CODE ? 'Direct'
    : fund.meta.schemeCode === OVERNIGHT_REGULAR_SCHEME_CODE ? 'Regular' : null;
  return plan !== null && fund.meta.schemeName.toLowerCase()
    === `ICICI Prudential Overnight Fund - ${plan} Plan - Growth`.toLowerCase();
}

function validSeries(points: NavPoint[]): boolean {
  if (points.length < 3) return false;
  for (let i=0;i<points.length;i++) {
    const p=points[i];
    if (!/^\d{4}-\d\d-\d\d$/.test(p.date) || !Number.isFinite(Date.parse(p.date))
      || new Date(p.date+'T00:00:00Z').toISOString().slice(0,10)!==p.date
      || !Number.isFinite(p.nav) || p.nav<=0
      || i>0 && points[i-1].date >= p.date) return false;
  }
  return true;
}

function largeMove(previous: number, next: number): boolean {
  const ratio=next/previous;
  return ratio>1.4+1e-12 || ratio<0.6-1e-12;
}

/** All declared events must match before ANY calculation value is changed. */
function adjustedForKnownActions(raw: NavPoint[], actions: ActionSpec[]): NavPoint[] | null {
  if (!actions.length || !validSeries(raw)) return null;
  const splits: number[]=[];
  for (let i=1;i<raw.length;i++) {
    if (largeMove(raw[i-1].nav,raw[i].nav)) splits.push(i);
  }
  // Missing, additional or already-partly-adjusted events fail as a whole.
  if (splits.length!==actions.length) return null;
  for (let i=0;i<actions.length;i++) {
    const action=actions[i],before=raw[splits[i]-1],after=raw[splits[i]];
    if (before.date!==action.oldNavThrough || after.date!==action.firstNewNavDate
      || i>0 && actions[i-1].firstNewNavDate>=action.firstNewNavDate) return null;
    const observedFactor=after.nav/before.nav;
    if (Math.abs(observedFactor-action.factor)>action.maxFactorDeviation) return null;
  }
  // Each subsequent split applies to every earlier observation. For Sensex
  // this yields 0.01 before the first event, 0.1 between events, then 1.
  const adjusted=raw.map(p=>({...p,nav:actions.reduce((nav,action)=>
    p.date<action.firstNewNavDate?nav*action.factor:nav,p.nav)}));
  if (!validSeries(adjusted)) return null;
  for (let i=1;i<adjusted.length;i++) {
    if (largeMove(adjusted[i-1].nav,adjusted[i].nav)) return null;
  }
  return adjusted;
}

/** Never clears independent quality evidence or partially explains a history. */
export function financialNavBasis(fund: FundData): FinancialNavBasis {
  const unchanged: FinancialNavBasis={fund,adjusted:false};
  const actions=actionsForScheme(fund);
  if (!actions.length) return unchanged;
  const expectedWarning=`Unresolved discontinuity: ${actions.length} single-observation move(s) exceed 40%; derived analytics are blocked.`;
  const largeMoves=fund.warnings.filter(w=>/^Unresolved discontinuity\b/i.test(w));
  if (largeMoves.length!==1||largeMoves[0]!==expectedWarning
    || fund.warnings.some(w=>/^(?:Invalid NAV observations|Conflicting NAV values)\b/i.test(w)))
    return unchanged;
  const points=adjustedForKnownActions(fund.points,actions);
  if (!points) return unchanged;
  const adjustments=actions.map(({maxFactorDeviation: _validatedRatioTolerance,...action})=>action);
  // Preserve the established shape and values for all single-event callers.
  return {adjusted:true,...(adjustments.length===1?{adjustment:adjustments[0]}:{adjustments}),
    fund:{...fund,points,warnings:fund.warnings.filter(w=>w!==expectedWarning)}};
}
