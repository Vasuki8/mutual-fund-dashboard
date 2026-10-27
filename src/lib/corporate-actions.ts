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

export const KNOWN_OVERNIGHT_WARNING =
  'Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked.';

export interface FinancialNavBasis {
  /** A calculation-only copy. Never persist this as a raw source history. */
  fund: FundData;
  /** False unless the specific AMC event and actual NAV jump were verified. */
  adjusted: boolean;
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
function adjustedForKnownAction(raw: NavPoint[]): NavPoint[] | null {
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
  // Verified source-archive checkpoint 180 shows the only discontinuity
  // between the 16-Aug-2022 old-basis NAV and the 17-Aug new-basis NAV.
  // Do not infer a basis change on neighbouring dates for this scheme.
  if (before.date!==OVERNIGHT_LAST_OLD_BASIS_NAV_DATE ||
    after.date!==OVERNIGHT_FIRST_NEW_BASIS_NAV_DATE) return null;
  // Fund NAV fluctuations around this overnight event are very small.
  // Do not silently "explain" an unrelated large price move.
  const observedFactor=after.nav/before.nav;
  if (observedFactor<9.5||observedFactor>10.5) return null;
  const adjusted=raw.map(p=>p.date<OVERNIGHT_FIRST_NEW_BASIS_NAV_DATE
    ? {...p,nav:p.nav*OVERNIGHT_CONSOLIDATION_FACTOR} : {...p});
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
  if (!isExactScheme(fund)) return unchanged;
  const largeMoves=fund.warnings.filter(w=>/^Unresolved discontinuity\b/i.test(w));
  if (largeMoves.length!==1||largeMoves[0]!==KNOWN_OVERNIGHT_WARNING
    || fund.warnings.some(w=>/^(?:Invalid NAV observations|Conflicting NAV values)\b/i.test(w)))
    return unchanged;
  const points=adjustedForKnownAction(fund.points);
  if (!points) return unchanged;
  return {adjusted:true,fund:{...fund,points,
    warnings:fund.warnings.filter(w=>w!==KNOWN_OVERNIGHT_WARNING)}};
}
