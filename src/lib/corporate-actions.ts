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
  return null;
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

/** Returns null if any other >40% move or unexplained date/ratio is present. */
function adjustedForKnownAction(raw: NavPoint[], action: ActionSpec): NavPoint[] | null {
  if (!validSeries(raw)) return null;
  let split=-1;
  for (let i=1;i<raw.length;i++) {
    if (!largeMove(raw[i-1].nav,raw[i].nav)) continue;
    if (split!==-1) return null;
    split=i;
  }
  if (split<1) return null;
  const before=raw[split-1];
  const after=raw[split];
  // Exact archived NAV boundary, independently verified for EACH listed
  // scheme. A legal effective date is not enough to infer the source basis.
  if (before.date!==action.oldNavThrough ||
    after.date!==action.firstNewNavDate) return null;
  const observedFactor=after.nav/before.nav;
  if (Math.abs(observedFactor-action.factor)>action.maxFactorDeviation) return null;
  const adjusted=raw.map(p=>p.date<action.firstNewNavDate
    ? {...p,nav:p.nav*action.factor} : {...p});
  for (let i=1;i<adjusted.length;i++) {
    if (largeMove(adjusted[i-1].nav,adjusted[i].nav)) return null;
  }
  return adjusted;
}

/**
 * Never clears generic data-quality warnings. Only the one exact known jump
 * may be explained, after independent validation of the actual raw values.
 */
export function financialNavBasis(fund: FundData): FinancialNavBasis {
  const unchanged: FinancialNavBasis={fund,adjusted:false};
  const action=actionForScheme(fund);
  if (!action) return unchanged;
  const largeMoves=fund.warnings.filter(w=>/^Unresolved discontinuity\b/i.test(w));
  if (largeMoves.length!==1||largeMoves[0]!==KNOWN_OVERNIGHT_WARNING
    || fund.warnings.some(w=>/^(?:Invalid NAV observations|Conflicting NAV values)\b/i.test(w)))
    return unchanged;
  const points=adjustedForKnownAction(fund.points,action);
  if (!points) return unchanged;
  const {maxFactorDeviation: _validatedRatioTolerance,...adjustment}=action;
  return {adjusted:true,adjustment,fund:{...fund,points,
    warnings:fund.warnings.filter(w=>w!==KNOWN_OVERNIGHT_WARNING)}};
}
