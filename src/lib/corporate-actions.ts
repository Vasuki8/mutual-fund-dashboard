import type { FundData, NavPoint } from './types.ts';
import { reviewedNavBasis } from './verified-nav-reviews.ts';
import type { VerifiedNavReview } from './verified-nav-reviews.ts';

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
  /** A separately verified source correction/economic event, never a unit factor. */
  review?: VerifiedNavReview;
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
  // NSE/CML/42888 binds these six ETF ISINs to the December-2019 splits.
  // Each saved NAV series changes basis after its 20-Dec observation,
  // independently of the 19-Dec exchange ex-date and 20-Dec ISIN date.
  const nipponDecemberEtfIdentity = ([
    [134782, 'nippon india etf nifty 50 value 20 - direct plan', 'INF204KB18I3', 0.1, 10, 'Nippon India ETF Nifty 50 Value 20'],
    [140084, 'nippon india etf nifty 50 bees - direct plan', 'INF204KB14I2', 0.1, 10, 'Nippon India ETF Nifty 50 BeES'],
    [140087, 'nippon india etf nifty bank bees - direct plan', 'INF204KB15I9', 0.1, 10, 'Nippon India ETF Nifty Bank BeES'],
    [140088, 'nippon india etf gold bees - direct plan', 'INF204KB17I5', 0.01, 100, 'Nippon India ETF Gold BeES'],
    [140089, 'nippon india etf nifty psu bank bees - direct plan', 'INF204KB16I7', 0.1, 10, 'Nippon India ETF Nifty PSU Bank BeES'],
    [140095, 'nippon india etf hang seng bees - direct plan', 'INF204KB19I1', 0.1, 10, 'Nippon India ETF Hang Seng BeES'],
  ] as const).find(([code]) => code===fund.meta.schemeCode);
  if (nipponDecemberEtfIdentity && fund.meta.schemeName.toLowerCase()===nipponDecemberEtfIdentity[1]
    && fund.meta.isinGrowth===nipponDecemberEtfIdentity[2] && fund.meta.fundHouse==='Nippon India Mutual Fund') return {
    schemeCode:fund.meta.schemeCode,
    label:`verified ${nipponDecemberEtfIdentity[4]}-for-1 ${nipponDecemberEtfIdentity[5]} unit split (exchange effective date 19 December 2019)`,
    oldNavThrough:'2019-12-20',firstNewNavDate:'2019-12-23',
    factor:nipponDecemberEtfIdentity[3],maxFactorDeviation:nipponDecemberEtfIdentity[3]*0.05,
    evidenceUrl:'https://archives.nseindia.com/content/circulars/CML42888.pdf',
  };
  // The issuer's October-2014 factsheet documents Rs10 -> Rs100 on
  // 7-Oct-2011. Exact 2014 NAV anchors and issuer rename notices bind
  // these four Growth identities; their last old-basis dates differ.
  const birlaOctoberDebtIdentity = ([
    [101317, 'aditya birla sun life ultra short term fund - regular plan - growth', 'INF209K01LZ1', '2011-10-05', 'Birla Sun Life Savings Fund Regular Growth', 54],
    [101976, 'aditya birla sun life money market fund - regular plan - growth', 'INF209K01RV7', '2011-10-06', 'Birla Sun Life Floating Rate Short Term Regular Growth', 61],
    [103192, 'aditya birla sun life ultra short to short term fund - regular plan - growth', 'INF209K01LQ0', '2011-10-05', 'Birla Sun Life Cash Manager Regular Growth', 53],
    [108273, 'aditya birla sun life banking & psu debt fund - regular plan - growth', 'INF209K01LV0', '2011-10-05', 'Birla Sun Life Ultra Short Term Regular Growth', 55],
  ] as const).find(([code]) => code===fund.meta.schemeCode);
  if (birlaOctoberDebtIdentity && fund.meta.schemeName.toLowerCase()===birlaOctoberDebtIdentity[1]
    && fund.meta.isinGrowth===birlaOctoberDebtIdentity[2] && fund.meta.fundHouse==='Aditya Birla Sun Life Mutual Fund') return {
    schemeCode:fund.meta.schemeCode,
    label:`verified 10-to-1 ${birlaOctoberDebtIdentity[4]} unit consolidation effective 7 October 2011`,
    oldNavThrough:birlaOctoberDebtIdentity[3],firstNewNavDate:'2011-10-07',
    factor:10,maxFactorDeviation:0.01,
    evidenceUrl:`https://mutualfund.adityabirlacapital.com/-/media/bsl/files/resources/factsheets/2014/empower-october-2014.pdf#page=${birlaOctoberDebtIdentity[5]}`,
  };
  // NSE/CML/50382 confirms the exact new ISINs and split factors. The
  // issuer's Addendum 41/2021 gives the 26-Nov record date; saved NAVs
  // first use new units on 29-Nov. Gold uses 0.01, the other four 0.1.
  const birlaNovemberEtfIdentity = ([
    [115127, 'aditya birla sun life gold etf', 'INF209KB18D3', 0.01, 100, 'Aditya Birla Sun Life Gold ETF'],
    [115512, 'aditya birla sun life nifty 50 etf', 'INF209KB19D1', 0.1, 10, 'Aditya Birla Sun Life Nifty 50 ETF'],
    [139581, 'aditya birla sun life bse sensex etf', 'INF209KB10E8', 0.1, 10, 'Aditya Birla Sun Life BSE Sensex ETF'],
    [145881, 'aditya birla sun life nifty next 50 etf', 'INF209KB16D7', 0.1, 10, 'Aditya Birla Sun Life Nifty Next 50 ETF'],
    [147735, 'aditya birla sun life nifty bank etf', 'INF209KB17D5', 0.1, 10, 'Aditya Birla Sun Life Nifty Bank ETF'],
  ] as const).find(([code]) => code===fund.meta.schemeCode);
  if (birlaNovemberEtfIdentity && fund.meta.schemeName.toLowerCase()===birlaNovemberEtfIdentity[1]
    && fund.meta.isinGrowth===birlaNovemberEtfIdentity[2] && fund.meta.fundHouse==='Aditya Birla Sun Life Mutual Fund') return {
    schemeCode:fund.meta.schemeCode,
    label:`verified ${birlaNovemberEtfIdentity[4]}-for-1 ${birlaNovemberEtfIdentity[5]} unit split (record date 26 November 2021)`,
    oldNavThrough:'2021-11-26',firstNewNavDate:'2021-11-29',
    factor:birlaNovemberEtfIdentity[3],maxFactorDeviation:birlaNovemberEtfIdentity[3]*0.05,
    evidenceUrl:'https://nsearchives.nseindia.com/content/circulars/CML50382.pdf#page=1',
  };
  // UTI Addendum 14/2026-27 and NSE/NMFTM/74721 document Rs1000 ->
  // Rs100 effective 19-Jun-2026. CDSL notice 2026/416 binds the new
  // Growth ISINs; saved NAVs first change basis on 20-Jun.
  const utiJuneLiquidIdentity = ([
    [102012, 'uti - liquid fund - regular plan - growth', 'INF789F1AF85', 'Regular'],
    [120304, 'uti - liquid fund - direct plan - growth', 'INF789F1AD46', 'Direct'],
  ] as const).find(([code]) => code===fund.meta.schemeCode);
  if (utiJuneLiquidIdentity && fund.meta.schemeName.toLowerCase()===utiJuneLiquidIdentity[1]
    && fund.meta.isinGrowth===utiJuneLiquidIdentity[2] && fund.meta.fundHouse==='UTI Mutual Fund') return {
    schemeCode:fund.meta.schemeCode,
    label:`verified 10-for-1 UTI Liquid Fund ${utiJuneLiquidIdentity[3]} Growth unit split effective 19 June 2026`,
    oldNavThrough:'2026-06-19',firstNewNavDate:'2026-06-20',
    factor:0.1,maxFactorDeviation:0.0001,
    evidenceUrl:'https://nsearchives.nseindia.com/content/circulars/NMF74721.zip',
  };
  // The issuer's May-2013 factsheet documents Rs10 -> Rs1000 at close
  // on 18-Apr. Exact plan NAV anchors, code/ISIN bindings and rename
  // notices support these ten identities. Legacy 105189/112120 are separately
  // registered below with primary CDSL identities and issuer NAV anchors.
  const invescoAprilDebtIdentity = ([
    [105185, 'invesco india short term fund - regular plan - growth', 'INF205K01UN6', 'Short Term Growth'],
    [106177, 'invesco india corporate bond fund - regular plan - growth', 'INF205K01RM4', 'Active Income Growth'],
    [107477, 'invesco india gilt fund - regular plan - growth', 'INF205K01SR1', 'Gilt Long Duration Growth'],
    [112123, 'invesco india money market fund - regular plan - growth', 'INF205K01SD1', 'Credit Opportunities Growth'],
    [114359, 'invesco india ultra short term fund - regular plan - growth', 'INF205K01TM0', 'Medium Term Bond Growth'],
    [120497, 'invesco india corporate bond fund - direct plan - growth', 'INF205K01RF8', 'Active Income Direct Growth'],
    [120507, 'invesco india money market fund - direct plan - growth', 'INF205K01RY9', 'Credit Opportunities Direct Growth'],
    [120520, 'invesco india gilt fund - direct plan - growth', 'INF205K01SN0', 'Gilt Long Duration Direct Growth'],
    [120541, 'invesco india ultra short term fund - direct plan - growth', 'INF205K01TH0', 'Medium Term Bond Direct Growth'],
    [120560, 'invesco india short term fund - direct plan - growth', 'INF205K01UH8', 'Short Term Direct Growth'],
  ] as const).find(([code]) => code===fund.meta.schemeCode);
  if (invescoAprilDebtIdentity && fund.meta.schemeName.toLowerCase()===invescoAprilDebtIdentity[1]
    && fund.meta.isinGrowth===invescoAprilDebtIdentity[2] && fund.meta.fundHouse==='Invesco Mutual Fund') return {
    schemeCode:fund.meta.schemeCode,
    label:`verified 100-to-1 Religare Invesco ${invescoAprilDebtIdentity[3]} unit consolidation effective 18 April 2013`,
    oldNavThrough:'2013-04-18',firstNewNavDate:'2013-04-22',
    // A 0.5% bound permits ordinary return over the four-day observed gap;
    // retain the documented factor rather than fitting the observed ratio.
    factor:100,maxFactorDeviation:0.5,
    evidenceUrl:'https://www.invescomutualfund.com/docs/default-source/Fact-Sheet/factsheet_may_2013.pdf?sfvrsn=0#page=5',
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

/** Exact primary-evidence registrations from the completed checkpoint-213 pass.
 * See docs/BULK_DISCREPANCY_COMPLETION_2026-10-29.md and
 * docs/BULK_DISCREPANCY_CONTINUATION_2026-10-29.md with their per-code ledgers.
 * These are calculation-copy actions, never a licence to rewrite source NAVs.
 * Unit terms, identity chains and observed dates are independently verified.
 */
const completedBulkIdentities: {
  schemeCode: number; schemeName: string; fundHouse: string; isinGrowth: string;
  actions: Omit<ActionSpec, 'schemeCode'>[];
}[] = [
  { schemeCode: 145481, schemeName: "aditya birla sun life overnight fund - regular plan - growth",
    fundHouse: "Aditya Birla Sun Life Mutual Fund", isinGrowth: "INF209KB1ZC3", actions: [
      { label: "verified 100-to-1 ADITYA BIRLA SUN LIFE OVERNIGHT FUND - Regular Plan - GROWTH unit consolidation (effective date 4 November 2018)",
        oldNavThrough: "2018-11-02", firstNewNavDate: "2018-11-04",
        factor: 100, maxFactorDeviation: 0.1,
        evidenceUrl: "https://bsmedia.business-standard.com/_media/bs/data/announcements/bse/02112018/6f0ab561-caf1-483a-9772-ec88472f67ba.pdf#page=3" },
    ] },
  { schemeCode: 145486, schemeName: "aditya birla sun life overnight fund - direct plan - growth",
    fundHouse: "Aditya Birla Sun Life Mutual Fund", isinGrowth: "INF209KB1ZH2", actions: [
      { label: "verified 100-to-1 ADITYA BIRLA SUN LIFE OVERNIGHT FUND - Direct Plan - GROWTH unit consolidation (effective date 4 November 2018)",
        oldNavThrough: "2018-11-02", firstNewNavDate: "2018-11-04",
        factor: 100, maxFactorDeviation: 0.1,
        evidenceUrl: "https://bsmedia.business-standard.com/_media/bs/data/announcements/bse/02112018/6f0ab561-caf1-483a-9772-ec88472f67ba.pdf#page=3" },
    ] },
  { schemeCode: 141545, schemeName: "axis nifty 50 etf",
    fundHouse: "Axis Mutual Fund", isinGrowth: "INF846K01W98", actions: [
      { label: "verified 10-for-1 Axis Nifty 50 ETF unit split (record date 24 July 2020)",
        oldNavThrough: "2020-07-24", firstNewNavDate: "2020-07-27",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://www.nseindia.com/api/corporates-corporateActions?index=mf&from_date=01-07-2020&to_date=31-07-2020" },
    ] },
  { schemeCode: 109353, schemeName: "canara robeco liquid fund - regular plan - growth option",
    fundHouse: "Canara Robeco Mutual Fund", isinGrowth: "INF760K01CW9", actions: [
      { label: "verified 100-to-1 Canara Robeco Liquid Fund - Regular Plan - GROWTH OPTION unit consolidation (effective date 20 August 2011)",
        oldNavThrough: "2011-08-20", firstNewNavDate: "2011-08-21",
        factor: 100, maxFactorDeviation: 0.1,
        evidenceUrl: "https://www.canararobeco.com/wp-content/uploads/2025/02/canara-robeco-liquid-fund-f-y-2012-13.pdf#page=21" },
    ] },
  { schemeCode: 109371, schemeName: "canara robeco ultra short term fund - regular plan - growth option",
    fundHouse: "Canara Robeco Mutual Fund", isinGrowth: "INF760K01DC9", actions: [
      { label: "verified 100-to-1 Canara Robeco Ultra Short Term Fund - Regular Plan - GROWTH OPTION unit consolidation (effective date 20 August 2011)",
        oldNavThrough: "2011-08-19", firstNewNavDate: "2011-08-22",
        factor: 100, maxFactorDeviation: 0.1,
        evidenceUrl: "https://www.canararobeco.com/wp-content/uploads/2025/02/canara-robeco-treasury-advantage-f-y-2012-13.pdf#page=22" },
    ] },
  { schemeCode: 149403, schemeName: "dsp nifty midcap 150 quality 50 etf",
    fundHouse: "DSP Mutual Fund", isinGrowth: "INF740KA1ZF3", actions: [
      { label: "verified 10-for-1 DSP Nifty Midcap 150 Quality 50 ETF unit split (record date 3 July 2026)",
        oldNavThrough: "2026-07-02", firstNewNavDate: "2026-07-03",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML74912.pdf#page=1" },
    ] },
  { schemeCode: 150523, schemeName: "dsp silver etf",
    fundHouse: "DSP Mutual Fund", isinGrowth: "INF740KA1ZQ0", actions: [
      { label: "verified 10-for-1 DSP Silver ETF unit split (record date 28 August 2026)",
        oldNavThrough: "2026-08-27", firstNewNavDate: "2026-08-28",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML75868.pdf#page=1" },
    ] },
  { schemeCode: 151737, schemeName: "dsp gold etf",
    fundHouse: "DSP Mutual Fund", isinGrowth: "INF740KA1ZP2", actions: [
      { label: "verified 10-for-1 DSP Gold ETF unit split (record date 28 August 2026)",
        oldNavThrough: "2026-08-27", firstNewNavDate: "2026-08-28",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML75868.pdf#page=1" },
    ] },
  { schemeCode: 152306, schemeName: "dsp nifty healthcare etf",
    fundHouse: "DSP Mutual Fund", isinGrowth: "INF740KA1ZG1", actions: [
      { label: "verified 10-for-1 DSP Nifty Healthcare ETF unit split (record date 3 July 2026)",
        oldNavThrough: "2026-07-02", firstNewNavDate: "2026-07-03",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML74912.pdf#page=1" },
    ] },
  { schemeCode: 152957, schemeName: "groww gold etf",
    fundHouse: "Groww Mutual Fund", isinGrowth: "INF666M01OE7", actions: [
      { label: "verified 10-for-1 Groww Gold ETF unit split (record date 6 February 2026)",
        oldNavThrough: "2026-02-05", firstNewNavDate: "2026-02-06",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML72617.pdf#page=1" },
    ] },
  { schemeCode: 153524, schemeName: "groww silver etf",
    fundHouse: "Groww Mutual Fund", isinGrowth: "INF666M01OF4", actions: [
      { label: "verified 10-for-1 Groww Silver ETF unit split (record date 6 February 2026)",
        oldNavThrough: "2026-02-05", firstNewNavDate: "2026-02-06",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML72617.pdf#page=1" },
    ] },
  { schemeCode: 139455, schemeName: "icici prudential nifty50 value 20 etf",
    fundHouse: "ICICI Prudential Mutual Fund", isinGrowth: "INF109KC11V0", actions: [
      { label: "verified 10-for-1 ICICI Prudential Nifty50 Value 20 ETF unit split (record date 1 March 2024)",
        oldNavThrough: "2024-03-01", firstNewNavDate: "2024-03-04",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML60740.pdf#page=1" },
    ] },
  { schemeCode: 139519, schemeName: "icici prudential bse midcap select etf",
    fundHouse: "ICICI Prudential Mutual Fund", isinGrowth: "INF109KC10W0", actions: [
      { label: "verified 10-for-1 ICICI Prudential BSE Midcap Select ETF unit split (record date 10 May 2024)",
        oldNavThrough: "2024-05-10", firstNewNavDate: "2024-05-13",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML61766.pdf#page=1" },
    ] },
  { schemeCode: 141596, schemeName: "icici prudential nifty 100 low volatility 30 etf",
    fundHouse: "ICICI Prudential Mutual Fund", isinGrowth: "INF109KC19U5", actions: [
      { label: "verified 10-for-1 ICICI Prudential Nifty 100 Low Volatility 30 ETF unit split (record date 1 March 2024)",
        oldNavThrough: "2024-03-01", firstNewNavDate: "2024-03-04",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML60740.pdf#page=1" },
    ] },
  { schemeCode: 143247, schemeName: "icici prudential bse 500 etf",
    fundHouse: "ICICI Prudential Mutual Fund", isinGrowth: "INF109KC1V59", actions: [
      { label: "verified 10-for-1 ICICI Prudential BSE 500 ETF unit split (record date 29 October 2021)",
        oldNavThrough: "2021-10-29", firstNewNavDate: "2021-11-01",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://www.nseindia.com/api/corporates-corporateActions?index=mf&symbol=BSE500IETF&from_date=01-10-2021&to_date=30-11-2021" },
    ] },
  { schemeCode: 144587, schemeName: "icici prudential nifty next 50 etf",
    fundHouse: "ICICI Prudential Mutual Fund", isinGrowth: "INF109KC1NS5", actions: [
      { label: "verified 10-for-1 ICICI Prudential Nifty Next 50 ETF unit split effective at close on 16 November 2018",
        oldNavThrough: "2018-11-16", firstNewNavDate: "2018-11-19",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://www.icicipruamc.com/blob/emailmedia/mutualfund/Passive%20Factsheet%20PDF%202.pdf#page=10" },
    ] },
  { schemeCode: 147483, schemeName: "icici prudential nifty bank etf",
    fundHouse: "ICICI Prudential Mutual Fund", isinGrowth: "INF109KC15I8", actions: [
      { label: "verified 10-for-1 ICICI Prudential Nifty Bank ETF unit split (exchange ex-date 1 September 2022)",
        oldNavThrough: "2022-09-02", firstNewNavDate: "2022-09-05",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML53404.pdf#page=1" },
    ] },
  { schemeCode: 147530, schemeName: "icici prudential nifty private bank etf",
    fundHouse: "ICICI Prudential Mutual Fund", isinGrowth: "INF109KC18U7", actions: [
      { label: "verified 10-for-1 ICICI Prudential Nifty Private Bank ETF unit split (record date 1 March 2024)",
        oldNavThrough: "2024-03-01", firstNewNavDate: "2024-03-04",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML60740.pdf#page=1" },
    ] },
  { schemeCode: 147921, schemeName: "icici prudential nifty midcap 150 etf",
    fundHouse: "ICICI Prudential Mutual Fund", isinGrowth: "INF109KC11W8", actions: [
      { label: "verified 10-for-1 ICICI Prudential Nifty Midcap 150 ETF unit split (record date 10 May 2024)",
        oldNavThrough: "2024-05-10", firstNewNavDate: "2024-05-13",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML61766.pdf#page=1" },
    ] },
  { schemeCode: 148456, schemeName: "icici prudential nifty alpha low- volatility 30 etf",
    fundHouse: "ICICI Prudential Mutual Fund", isinGrowth: "INF109KC17V7", actions: [
      { label: "verified 10-for-1 ICICI Prudential Nifty Alpha Low- Volatility 30 ETF unit split (record date 10 May 2024)",
        oldNavThrough: "2024-05-10", firstNewNavDate: "2024-05-13",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML61766.pdf#page=1" },
    ] },
  { schemeCode: 148466, schemeName: "icici prudential nifty it etf",
    fundHouse: "ICICI Prudential Mutual Fund", isinGrowth: "INF109KC16I6", actions: [
      { label: "verified 10-for-1 ICICI Prudential Nifty IT ETF unit split (record date 2 September 2022)",
        oldNavThrough: "2022-09-02", firstNewNavDate: "2022-09-05",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML53404.pdf#page=1" },
    ] },
  { schemeCode: 149072, schemeName: "icici prudential nifty fmcg etf",
    fundHouse: "ICICI Prudential Mutual Fund", isinGrowth: "INF109KC19V3", actions: [
      { label: "verified 10-for-1 ICICI Prudential Nifty FMCG ETF unit split (record date 10 May 2024)",
        oldNavThrough: "2024-05-10", firstNewNavDate: "2024-05-13",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML61766.pdf#page=1" },
    ] },
  { schemeCode: 149463, schemeName: "icici prudential nifty auto etf",
    fundHouse: "ICICI Prudential Mutual Fund", isinGrowth: "INF109KC10V2", actions: [
      { label: "verified 10-for-1 ICICI Prudential Nifty Auto ETF unit split (record date 1 March 2024)",
        oldNavThrough: "2024-03-01", firstNewNavDate: "2024-03-04",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML60740.pdf#page=1" },
    ] },
  { schemeCode: 151907, schemeName: "icici prudential nifty 200 quality 30 etf",
    fundHouse: "ICICI Prudential Mutual Fund", isinGrowth: "INF109KC18V5", actions: [
      { label: "verified 10-for-1 ICICI Prudential Nifty 200 Quality 30 ETF unit split (record date 10 May 2024)",
        oldNavThrough: "2024-05-10", firstNewNavDate: "2024-05-13",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML61766.pdf#page=1" },
    ] },
  { schemeCode: 104486, schemeName: "invesco india liquid fund - regular plan - growth",
    fundHouse: "Invesco Mutual Fund", isinGrowth: "INF205K01HM5", actions: [
      { label: "verified 100-to-1 Religare Invesco Liquid Super Institutional Growth unit consolidation effective at close on 25 February 2011",
        oldNavThrough: "2011-02-25", firstNewNavDate: "2011-02-27",
        factor: 100, maxFactorDeviation: 0.1,
        evidenceUrl: "https://invescomutualfund.com/docs/default-source/default-document-library/annual-report-fy-2016-2017.pdf?sfvrsn=0#page=92" },
    ] },
  { schemeCode: 104488, schemeName: "invesco india liquid fund - regular plan - growth",
    fundHouse: "Invesco Mutual Fund", isinGrowth: "INF205K01HG7", actions: [
      { label: "verified 100-to-1 Religare Invesco Liquid Regular Growth unit consolidation effective at close on 25 February 2011",
        oldNavThrough: "2011-02-25", firstNewNavDate: "2011-02-27",
        factor: 100, maxFactorDeviation: 0.1,
        evidenceUrl: "https://invescomutualfund.com/docs/default-source/default-document-library/annual-report-fy-2016-2017.pdf?sfvrsn=0#page=92" },
    ] },
  { schemeCode: 104726, schemeName: "invesco india ultra short to short term fund - regular plan - growth",
    fundHouse: "Invesco Mutual Fund", isinGrowth: "INF205K01HY0", actions: [
      { label: "verified 100-to-1 Religare Invesco Ultra Short Term Institutional Growth unit consolidation effective at close on 25 February 2011",
        oldNavThrough: "2011-02-25", firstNewNavDate: "2011-02-28",
        factor: 100, maxFactorDeviation: 0.1,
        evidenceUrl: "https://invescomutualfund.com/docs/default-source/default-document-library/annual-report-fy-2016-2017.pdf?sfvrsn=0#page=92" },
    ] },
  { schemeCode: 112368, schemeName: "invesco india gold exchange traded fund - regular plan - growth",
    fundHouse: "Invesco Mutual Fund", isinGrowth: "INF205KA1BP1", actions: [
      { label: "verified 100-for-1 Invesco India Gold Exchange Traded Fund - Regular Plan - Growth unit split (record date 30 April 2026)",
        oldNavThrough: "2026-04-29", firstNewNavDate: "2026-04-30",
        factor: 0.01, maxFactorDeviation: 0.0005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML73909.pdf#page=1" },
    ] },
  { schemeCode: 115284, schemeName: "invesco india nifty 50 exchange traded fund - regular plan - growth",
    fundHouse: "Invesco Mutual Fund", isinGrowth: "INF205KA1CC7", actions: [
      { label: "verified 10-for-1 Invesco India Nifty 50 Exchange Traded Fund - Regular Plan - Growth unit split (record date 31 July 2026)",
        oldNavThrough: "2026-07-30", firstNewNavDate: "2026-07-31",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML75432.pdf#page=1" },
    ] },
  { schemeCode: 100835, schemeName: "kotak liquid fund - regular plan - growth",
    fundHouse: "Kotak Mahindra Mutual Fund", isinGrowth: "INF174K01NI9", actions: [
      { label: "verified 100-to-1 Kotak Liquid Fund - Regular Plan - Growth unit consolidation (effective date 18 January 2013)",
        oldNavThrough: "2013-01-18", firstNewNavDate: "2013-01-20",
        factor: 100, maxFactorDeviation: 0.1,
        evidenceUrl: "https://vatseelabs-s3.kotakmf.com/FormsDownloads_BKP_05_April_2024/Addendums/KLiquid,-KFST---14-January-2013/14-01-13.pdf#page=1" },
    ] },
  { schemeCode: 101893, schemeName: "kotak money market fund - regular plan - (growth)",
    fundHouse: "Kotak Mahindra Mutual Fund", isinGrowth: "INF174K01NA6", actions: [
      { label: "verified 100-to-1 Kotak Money Market Fund - Regular Plan - (Growth) unit consolidation (effective date 18 January 2013)",
        oldNavThrough: "2013-01-18", firstNewNavDate: "2013-01-20",
        factor: 100, maxFactorDeviation: 0.1,
        evidenceUrl: "https://vatseelabs-s3.kotakmf.com/FormsDownloads_BKP_05_April_2024/Addendums/KLiquid,-KFST---14-January-2013/14-01-13.pdf#page=1" },
    ] },
  { schemeCode: 106193, schemeName: "kotak gold etf",
    fundHouse: "Kotak Mahindra Mutual Fund", isinGrowth: "INF174KA1HJ8", actions: [
      { label: "verified 10-for-1 KOTAK GOLD ETF unit split (record date 15 April 2015)",
        oldNavThrough: "2015-04-13", firstNewNavDate: "2015-04-15",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://www.msei.in/SX-Content/Circulars/2015/April/Circular-2894.pdf#page=1" },
      { label: "verified 10-for-1 KOTAK GOLD ETF unit split (record date 23 July 2021)",
        oldNavThrough: "2021-07-22", firstNewNavDate: "2021-07-23",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://archives.nseindia.com/content/circulars/CMPT48962.pdf#page=1" },
    ] },
  { schemeCode: 106929, schemeName: "kotak nifty psu bank etf",
    fundHouse: "Kotak Mahindra Mutual Fund", isinGrowth: "INF174KA1A86", actions: [
      { label: "verified 10-for-1 Kotak Nifty PSU Bank ETF unit split (effective date 10 July 2026)",
        oldNavThrough: "2026-07-09", firstNewNavDate: "2026-07-10",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://vatseelabs-s3.kotakmf.com/FormsDownloads/Addendums/Notice-cum-addendum---Change-in-Face-Value-&-Creation-Unit-size-of-Kotak-Nifty-PSU-Bank-ETF-June-23,-2026/NoticecumaddendumChangeinFaceValueCreationUnitsize.pdf#page=1" },
    ] },
  { schemeCode: 109010, schemeName: "kotak bse sensex etf",
    fundHouse: "Kotak Mahindra Mutual Fund", isinGrowth: "INF174KA1JD7", actions: [
      { label: "verified 10-for-1 Kotak BSE Sensex ETF unit split (effective date 22 July 2022)",
        oldNavThrough: "2022-07-21", firstNewNavDate: "2022-07-22",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://vatseelabs-s3.kotakmf.com/FormsDownloads/Addendums/Addendum-Sensex-ETF-July-7,-2022/NoticecumaddendumChangeinFaceValueandCreationUnitsizeofKotakSandPBSESensexETF.pdf#page=1" },
    ] },
  { schemeCode: 112351, schemeName: "kotak nifty 50 etf",
    fundHouse: "Kotak Mahindra Mutual Fund", isinGrowth: "INF174K014P6", actions: [
      { label: "verified 10-for-1 Kotak Nifty 50 ETF unit split (effective date 28 July 2017)",
        oldNavThrough: "2017-07-27", firstNewNavDate: "2017-07-28",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://vatseelabs-s3.kotakmf.com/FormsDownloads/Addendums/Kotak-Nifty-ETF---13-July-2017/13July2017.pdf#page=1" },
    ] },
  { schemeCode: 119746, schemeName: "kotak money market fund - direct plan - (growth)",
    fundHouse: "Kotak Mahindra Mutual Fund", isinGrowth: "INF174K01MW2", actions: [
      { label: "verified 100-to-1 Kotak Money Market Fund - Direct Plan - (Growth) unit consolidation (effective date 18 January 2013)",
        oldNavThrough: "2013-01-18", firstNewNavDate: "2013-01-20",
        factor: 100, maxFactorDeviation: 0.1,
        evidenceUrl: "https://vatseelabs-s3.kotakmf.com/FormsDownloads_BKP_05_April_2024/Addendums/KLiquid,-KFST---14-January-2013/14-01-13.pdf#page=1" },
    ] },
  { schemeCode: 119766, schemeName: "kotak liquid fund - direct plan - growth",
    fundHouse: "Kotak Mahindra Mutual Fund", isinGrowth: "INF174K01NE8", actions: [
      { label: "verified 100-to-1 Kotak Liquid Fund - Direct Plan - Growth unit consolidation (effective date 18 January 2013)",
        oldNavThrough: "2013-01-18", firstNewNavDate: "2013-01-20",
        factor: 100, maxFactorDeviation: 0.1,
        evidenceUrl: "https://vatseelabs-s3.kotakmf.com/FormsDownloads_BKP_05_April_2024/Addendums/KLiquid,-KFST---14-January-2013/14-01-13.pdf#page=1" },
    ] },
  { schemeCode: 133122, schemeName: "kotak nifty bank etf",
    fundHouse: "Kotak Mahindra Mutual Fund", isinGrowth: "INF174KA1ZB7", actions: [
      { label: "verified 10-for-1 Kotak Nifty Bank ETF unit split (effective date 27 February 2026)",
        oldNavThrough: "2026-02-26", firstNewNavDate: "2026-02-27",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://vatseelabs-s3.kotakmf.com/FormsDownloads/Addendums/Notice-Cum-Addendum---Change-in-Face-value-of-Units-and-Creation-unit-size-in-certain-scheme(s)-of-Kotak-Mahindra-Mutual-Fund-Feb-17,-2026/February172026ChangeinFacevalueofUnitsandCreationunitsizeincertainschemesofKotakMahindraMutualFund.pdf#page=1" },
    ] },
  { schemeCode: 135744, schemeName: "kotak nifty 50 value 20 etf",
    fundHouse: "Kotak Mahindra Mutual Fund", isinGrowth: "INF174KA1ZE1", actions: [
      { label: "verified 10-for-1 Kotak Nifty 50 Value 20 ETF unit split (effective date 27 February 2026)",
        oldNavThrough: "2026-02-26", firstNewNavDate: "2026-02-27",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://vatseelabs-s3.kotakmf.com/FormsDownloads/Addendums/Notice-Cum-Addendum---Change-in-Face-value-of-Units-and-Creation-unit-size-in-certain-scheme(s)-of-Kotak-Mahindra-Mutual-Fund-Feb-17,-2026/February172026ChangeinFacevalueofUnitsandCreationunitsizeincertainschemesofKotakMahindraMutualFund.pdf#page=1" },
    ] },
  { schemeCode: 149757, schemeName: "kotak nifty midcap 50 etf",
    fundHouse: "Kotak Mahindra Mutual Fund", isinGrowth: "INF174KA1ZC5", actions: [
      { label: "verified 10-for-1 Kotak Nifty Midcap 50 ETF unit split (effective date 27 February 2026)",
        oldNavThrough: "2026-02-26", firstNewNavDate: "2026-02-27",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://vatseelabs-s3.kotakmf.com/FormsDownloads/Addendums/Notice-Cum-Addendum---Change-in-Face-value-of-Units-and-Creation-unit-size-in-certain-scheme(s)-of-Kotak-Mahindra-Mutual-Fund-Feb-17,-2026/February172026ChangeinFacevalueofUnitsandCreationunitsizeincertainschemesofKotakMahindraMutualFund.pdf#page=1" },
    ] },
  { schemeCode: 150492, schemeName: "kotak nifty india consumption etf",
    fundHouse: "Kotak Mahindra Mutual Fund", isinGrowth: "INF174KA1ZF8", actions: [
      { label: "verified 10-for-1 Kotak Nifty India Consumption ETF unit split (effective date 27 February 2026)",
        oldNavThrough: "2026-02-26", firstNewNavDate: "2026-02-27",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://vatseelabs-s3.kotakmf.com/FormsDownloads/Addendums/Notice-Cum-Addendum---Change-in-Face-value-of-Units-and-Creation-unit-size-in-certain-scheme(s)-of-Kotak-Mahindra-Mutual-Fund-Feb-17,-2026/February172026ChangeinFacevalueofUnitsandCreationunitsizeincertainschemesofKotakMahindraMutualFund.pdf#page=1" },
    ] },
  { schemeCode: 150948, schemeName: "kotak silver etf",
    fundHouse: "Kotak Mahindra Mutual Fund", isinGrowth: "INF174KA1ZD3", actions: [
      { label: "verified 10-for-1 Kotak Silver ETF unit split (effective date 27 February 2026)",
        oldNavThrough: "2026-02-26", firstNewNavDate: "2026-02-27",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://vatseelabs-s3.kotakmf.com/FormsDownloads/Addendums/Notice-Cum-Addendum---Change-in-Face-value-of-Units-and-Creation-unit-size-in-certain-scheme(s)-of-Kotak-Mahindra-Mutual-Fund-Feb-17,-2026/February172026ChangeinFacevalueofUnitsandCreationunitsizeincertainschemesofKotakMahindraMutualFund.pdf#page=1" },
    ] },
  { schemeCode: 120249, schemeName: "lic mf liquid fund - direct plan - growth",
    fundHouse: "LIC Mutual Fund", isinGrowth: "INF767K01DN1", actions: [
      { label: "verified 100-to-1 LIC MF Liquid Fund - Direct Plan - Growth unit consolidation (effective date 21 January 2013)",
        oldNavThrough: "2013-01-20", firstNewNavDate: "2013-01-21",
        factor: 100, maxFactorDeviation: 0.1,
        evidenceUrl: "https://www.licmf.com/assets/pdf/statuary_disclosure/LIC%20-%20Balance%20Sheet%20-%2010%20May%202013.pdf#page=4" },
    ] },
  { schemeCode: 151961, schemeName: "lic mf gold exchange traded fund",
    fundHouse: "LIC Mutual Fund", isinGrowth: "INF767K01SM1", actions: [
      { label: "verified 100-for-1 LIC MF Gold Exchange Traded Fund unit split (record date 6 March 2026)",
        oldNavThrough: "2026-03-05", firstNewNavDate: "2026-03-06",
        factor: 0.01, maxFactorDeviation: 0.0005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML73115.pdf#page=1" },
    ] },
  { schemeCode: 114984, schemeName: "motilal oswal nasdaq 100 etf",
    fundHouse: "Motilal Oswal Mutual Fund", isinGrowth: "INF247L01AP3", actions: [
      { label: "verified 10-for-1 Motilal Oswal Nasdaq 100 ETF unit split (record date 18 June 2021)",
        oldNavThrough: "2021-06-18", firstNewNavDate: "2021-06-21",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://www.msei.in/SX-Content/Circulars/2021/June/Circular-10553.pdf#page=1" },
    ] },
  { schemeCode: 149801, schemeName: "motilal oswal nifty 200 momentum 30 etf",
    fundHouse: "Motilal Oswal Mutual Fund", isinGrowth: "INF247L01BK2", actions: [
      { label: "verified 5-for-1 Motilal Oswal Nifty 200 Momentum 30 ETF unit split (record date 12 August 2022)",
        oldNavThrough: "2022-08-12", firstNewNavDate: "2022-08-16",
        factor: 0.2, maxFactorDeviation: 0.01,
        evidenceUrl: "https://archives.nseindia.com/content/circulars/CML53260.pdf#page=1" },
    ] },
  { schemeCode: 149921, schemeName: "motilal oswal bse low volatility etf",
    fundHouse: "Motilal Oswal Mutual Fund", isinGrowth: "INF247L01BL0", actions: [
      { label: "verified 5-for-1 Motilal Oswal BSE Low Volatility ETF unit split (record date 12 August 2022)",
        oldNavThrough: "2022-08-12", firstNewNavDate: "2022-08-16",
        factor: 0.2, maxFactorDeviation: 0.01,
        evidenceUrl: "https://archives.nseindia.com/content/circulars/CML53260.pdf#page=1" },
    ] },
  { schemeCode: 112636, schemeName: "navi liquid fund - regular plan - growth option",
    fundHouse: "Navi Mutual Fund", isinGrowth: "INF959L01GL9", actions: [
      { label: "verified 100-to-1 Navi Liquid Fund unit consolidation effective 21 September 2014",
        oldNavThrough: "2014-09-19", firstNewNavDate: "2014-09-21",
        factor: 100, maxFactorDeviation: 0.1,
        evidenceUrl: "https://navi-amc-docs.s3.ap-south-1.amazonaws.com/Factsheet/Factsheets/2021-22/Factsheet_November%202021.pdf#page=13" },
      { label: "verified 100-for-1 Navi Liquid Fund unit split with NAV implementation postponed to 27 November 2022",
        oldNavThrough: "2022-11-25", firstNewNavDate: "2022-11-27",
        factor: 0.01, maxFactorDeviation: 1e-05,
        evidenceUrl: "https://nsearchives.nseindia.com/corporate/TRITURBINE_20112022113809_TTL_NEWS_20_11_2022.pdf#page=2" },
    ] },
  { schemeCode: 103048, schemeName: "nippon india money market fund - regular plan - growth option",
    fundHouse: "Nippon India Mutual Fund", isinGrowth: "INF204K01VA4", actions: [
      { label: "verified 100-to-1 Reliance Liquidity Fund Growth unit consolidation effective 5 August 2012",
        oldNavThrough: "2012-08-03", firstNewNavDate: "2012-08-05",
        factor: 100, maxFactorDeviation: 0.1,
        evidenceUrl: "https://mf.nipponindiaim.com/InvestorServices/AnnualHalfYearlyReportsFY20122013/Half_Yearly_Portfolio_-_Financials_-_Oct-_2012_-_for_Website_upload.pdf#page=34" },
    ] },
  { schemeCode: 107693, schemeName: "quantum gold etf",
    fundHouse: "Quantum Mutual Fund", isinGrowth: "INF082J01408", actions: [
      { label: "verified 50-for-1 Quantum Gold ETF unit split (record date 17 December 2021)",
        oldNavThrough: "2021-12-17", firstNewNavDate: "2021-12-20",
        factor: 0.02, maxFactorDeviation: 0.001,
        evidenceUrl: "https://www.nseindia.com/api/corporates-corporateActions?index=mf&from_date=01-12-2021&to_date=31-12-2021" },
    ] },
  { schemeCode: 108479, schemeName: "quantum nifty 50 etf",
    fundHouse: "Quantum Mutual Fund", isinGrowth: "INF082J01499", actions: [
      { label: "verified 10-for-1 Quantum Nifty 50 ETF unit split (record date 13 February 2026)",
        oldNavThrough: "2026-02-13", firstNewNavDate: "2026-02-16",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML72718.pdf#page=1" },
    ] },
  { schemeCode: 106217, schemeName: "sbi ultra short to short term fund - regular plan - growth",
    fundHouse: "SBI Mutual Fund", isinGrowth: "INF200K01MG8", actions: [
      { label: "verified 100-to-1 SBI Short Horizon Debt Fund Ultra Short Term Institutional Growth unit consolidation effective 13 January 2012",
        oldNavThrough: "2012-01-12", firstNewNavDate: "2012-01-13",
        factor: 100, maxFactorDeviation: 0.1,
        evidenceUrl: "https://www.sbimf.com/docs/default-source/scheme-portfolios/default-library/unaudited-half-yearly-results-%28as-on-march-31-2012%29.pdf?sfvrsn=24795812_0#page=23" },
    ] },
  { schemeCode: 111954, schemeName: "sbi gold etf - regular plan - growth",
    fundHouse: "SBI Mutual Fund", isinGrowth: "INF200KA16D8", actions: [
      { label: "verified 100-for-1 SBI Gold ETF - Regular Plan - Growth unit split (record date 7 January 2022)",
        oldNavThrough: "2022-01-07", firstNewNavDate: "2022-01-10",
        factor: 0.01, maxFactorDeviation: 0.0005,
        evidenceUrl: "https://www.msei.in/SX-Content/Circulars/2022/January/Circular-11335.pdf#page=1" },
    ] },
  { schemeCode: 102672, schemeName: "tata liquid fund - regular plan - growth option",
    fundHouse: "Tata Mutual Fund", isinGrowth: "INF277K01YD8", actions: [
      { label: "verified 100-to-1 Tata Liquid Fund - Regular Plan - Growth Option unit consolidation (effective date 1 February 2014)",
        oldNavThrough: "2014-01-31", firstNewNavDate: "2014-02-02",
        factor: 100, maxFactorDeviation: 0.1,
        evidenceUrl: "https://www.tatamutualfund.com/system/files/2023-08/half_yearly_portfolios_march_2014.pdf#page=4" },
    ] },
  { schemeCode: 119861, schemeName: "tata liquid fund - direct plan - growth option",
    fundHouse: "Tata Mutual Fund", isinGrowth: "INF277K01YE6", actions: [
      { label: "verified 100-to-1 Tata Liquid Fund - Direct Plan - Growth Option unit consolidation (effective date 1 February 2014)",
        oldNavThrough: "2014-01-31", firstNewNavDate: "2014-02-02",
        factor: 100, maxFactorDeviation: 0.1,
        evidenceUrl: "https://www.tatamutualfund.com/system/files/2023-08/half_yearly_portfolios_march_2014.pdf#page=4" },
    ] },
  { schemeCode: 100664, schemeName: "uti large & mid cap fund - regular plan - growth",
    fundHouse: "UTI Mutual Fund", isinGrowth: "INF789F01869", actions: [
      { label: "verified 1-for-1 UTI Top 100 Fund Growth bonus unit allotment (record date 4 June 2009)",
        oldNavThrough: "2009-06-04", firstNewNavDate: "2009-06-05",
        factor: 0.5, maxFactorDeviation: 0.025,
        evidenceUrl: "https://www.business-standard.com/article/press-releases/uti-top-100-fund-declares-1-1-bonus-109060100093_1.html" },
    ] },
  { schemeCode: 135320, schemeName: "uti nifty 50 etf - direct plan",
    fundHouse: "UTI Mutual Fund", isinGrowth: "INF789F1AZC0", actions: [
      { label: "verified 10-for-1 UTI Nifty 50 ETF - Direct Plan unit split (effective date 25 September 2023)",
        oldNavThrough: "2023-09-25", firstNewNavDate: "2023-09-26",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://nsearchives.nseindia.com/content/circulars/CML58523.pdf#page=1" },
    ] },
  { schemeCode: 115398, schemeName: "union liquid fund - regular plan - growth option",
    fundHouse: "Union Mutual Fund", isinGrowth: "INF582M01013", actions: [
      { label: "verified 100-to-1 Union Liquid Fund - Regular Plan - Growth Option unit consolidation (effective date 2 October 2011)",
        oldNavThrough: "2011-09-29", firstNewNavDate: "2011-10-02",
        factor: 100, maxFactorDeviation: 0.1,
        evidenceUrl: "https://www.unionmf.com/docs/default-source/downloads/scheme-disclosures/factsheets/october-2012.pdf?sfvrsn=f69eb488_3#page=5" },
    ] },
  // Continuation evidence: docs/BULK_DISCREPANCY_CONTINUATION_2026-10-29.md.
  // CDSL distinguishes the legacy Invesco plans; dated issuer NAVs bind each series.
  // MOM30IETF is an allotment-price correction with additional units, not a face-value split.
  { schemeCode: 100814, schemeName: "uti - overnight fund - regular plan - growth",
    fundHouse: "UTI Mutual Fund", isinGrowth: "INF789F01604", actions: [
      { label: "verified 100-to-1 UTI Overnight Fund unit consolidation effective 3 May 2018",
        oldNavThrough: "2018-05-02", firstNewNavDate: "2018-05-03",
        factor: 100, maxFactorDeviation: 0.5,
        evidenceUrl: "https://doc.utimf.com/v1/AUTH_5b9dd00b-8132-4a21-a800-711111810cee/UTIContainer/09-18-19%20-%20%20Change%20in%20face%20value%20of%20units20180502-115257.pdf#page=1" },
    ] },
  { schemeCode: 104728, schemeName: "invesco india ultra short to short term fund - regular plan - growth",
    fundHouse: "Invesco Mutual Fund", isinGrowth: "INF205K01HT0", actions: [
      { label: "verified 100-to-1 Invesco legacy Regular Plan - Growth unit consolidation effective 25 February 2011",
        oldNavThrough: "2011-02-25", firstNewNavDate: "2011-02-28",
        factor: 100, maxFactorDeviation: 0.5,
        evidenceUrl: "https://invescomutualfund.com/docs/default-source/default-document-library/annual-report-fy-2016-2017.pdf?sfvrsn=0#page=92" },
    ] },
  { schemeCode: 105189, schemeName: "invesco india short term fund - regular plan - growth",
    fundHouse: "Invesco Mutual Fund", isinGrowth: "INF205K01UR7", actions: [
      { label: "verified 100-to-1 Invesco legacy Plan B - Growth unit consolidation effective 18 April 2013",
        oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22",
        factor: 100, maxFactorDeviation: 0.5,
        evidenceUrl: "https://invescomutualfund.com/docs/default-source/default-document-library/annual-report-fy-2016-2017.pdf?sfvrsn=0#page=92" },
    ] },
  { schemeCode: 106212, schemeName: "sbi ultra short to short term fund - regular plan - growth",
    fundHouse: "SBI Mutual Fund", isinGrowth: "INF200K01MO2", actions: [
      { label: "verified 100-to-1 SBI Short Horizon Debt Fund Ultra Short Term scheme-wide unit consolidation effective 13 January 2012",
        oldNavThrough: "2012-01-12", firstNewNavDate: "2012-01-13",
        factor: 100, maxFactorDeviation: 0.1,
        evidenceUrl: "https://www.sbimf.com/docs/default-source/scheme-portfolios/default-library/unaudited-half-yearly-results-%28as-on-march-31-2012%29.pdf?sfvrsn=24795812_0#page=9" },
    ] },
  { schemeCode: 112120, schemeName: "invesco india money market fund - regular plan - growth",
    fundHouse: "Invesco Mutual Fund", isinGrowth: "INF205K01SG4", actions: [
      { label: "verified 100-to-1 Invesco legacy Regular Plan - Growth unit consolidation effective 18 April 2013",
        oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22",
        factor: 100, maxFactorDeviation: 0.5,
        evidenceUrl: "https://invescomutualfund.com/docs/default-source/default-document-library/annual-report-fy-2016-2017.pdf?sfvrsn=0#page=100" },
    ] },
  { schemeCode: 120785, schemeName: "uti - overnight fund - direct plan - growth",
    fundHouse: "UTI Mutual Fund", isinGrowth: "INF789FB1S71", actions: [
      { label: "verified 100-to-1 UTI Overnight Fund unit consolidation effective 3 May 2018",
        oldNavThrough: "2018-05-02", firstNewNavDate: "2018-05-03",
        factor: 100, maxFactorDeviation: 0.5,
        evidenceUrl: "https://doc.utimf.com/v1/AUTH_5b9dd00b-8132-4a21-a800-711111810cee/UTIContainer/09-18-19%20-%20%20Change%20in%20face%20value%20of%20units20180502-115257.pdf#page=1" },
    ] },
  { schemeCode: 150455, schemeName: "icici prudential nifty 200 momentum 30 etf",
    fundHouse: "ICICI Prudential Mutual Fund", isinGrowth: "INF109KC17C7", actions: [
      { label: "verified 9-for-1 additional ICICI Prudential Nifty 200 Momentum 30 ETF unit allotment correcting the original allotment price (ex-date 12 August 2022)",
        oldNavThrough: "2022-08-10", firstNewNavDate: "2022-08-12",
        factor: 0.1, maxFactorDeviation: 0.005,
        evidenceUrl: "https://archives.nseindia.com/content/circulars/CML53266.pdf#page=1" },
    ] },
];

/** Multiple events require an exact identity and a complete independently verified chain. */
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
  const bulk = completedBulkIdentities.find(identity => identity.schemeCode === fund.meta.schemeCode);
  if (bulk && fund.meta.schemeName.toLowerCase() === bulk.schemeName
    && fund.meta.fundHouse === bulk.fundHouse && fund.meta.isinGrowth === bulk.isinGrowth) {
    return bulk.actions.map(action => ({ schemeCode: bulk.schemeCode, ...action }));
  }
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
  // Every later unit action applies to all earlier observations. Keep each
  // event boundary even when a consolidation and a later split have product 1.
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
  const reviewed=reviewedNavBasis(fund);
  if(reviewed)return {...reviewed,adjusted:false};
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
