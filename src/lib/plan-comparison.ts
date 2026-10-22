import type { FundData, NavPoint } from './types.ts';
import { absoluteReturn, cagr, daysBetween, isGrowthScheme, validateDateRange } from './analytics.ts';
import { qualityBlocked } from './format.ts';

export interface AlignedPlanHistory {
  dates: string[];
  series: NavPoint[][];
  start: string | null;
  end: string | null;
}

export interface PlanNavMetrics {
  directIndex: number;
  regularIndex: number;
  start: string;
  end: string;
  observationCount: number;
  elapsedDays: number;
  measure: 'CAGR' | 'Absolute return';
  directReturn: number;
  regularReturn: number;
  returnDifference: number;
  directEndingValue: number;
  regularEndingValue: number;
  endingValueDifference: number;
}

export interface PlanNavComparison {
  applicable: boolean;
  reason: string | null;
  metrics: PlanNavMetrics | null;
  staleCount: number;
}

type Plan = 'Direct' | 'Regular';
const STARTING_AMOUNT_INR = 10_000;

function planOf(name: string): Plan | null {
  const direct = /\bdirect\b/i.test(name);
  const regular = /\bregular\b/i.test(name);
  return direct === regular ? null : direct ? 'Direct' : 'Regular';
}

function explicitPlanOf(name: string): Plan | null {
  const matches = name.match(/\b(?:direct|regular)\s+plan\b/gi) ?? [];
  if (matches.length !== 1) return null;
  return /^direct\b/i.test(matches[0]) ? 'Direct' : 'Regular';
}

function normalized(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Names are a screening heuristic, not proof that the AMC has linked the
 * selected share classes. Only remove explicit plan labels and interchangeable
 * "Growth"/"Growth Option" wording; retain the underlying strategy words.
 */
export function planStrategyKey(name: string): string {
  return name
    .replace(/\(erstwhile[^)]*\)/gi, ' ')
    .replace(/\b(?:direct|regular)\s+plan\b/gi, ' ')
    .replace(/\bgrowth\s+(?:option|plan)\b/gi, 'growth')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim().replace(/\s+/g, ' ').toLowerCase();
}

function unavailable(reason: string, staleCount: number): PlanNavComparison {
  return { applicable: true, reason, metrics: null, staleCount };
}

/**
 * Compare user-selected, explicitly named Growth plan variants only when
 * underlying scheme names and all three supplied MFAPI identifiers match.
 * All money/return results use the exact aligned dates used by Compare.
 */
export function summarizePlanNavDifference(funds: FundData[], aligned: AlignedPlanHistory): PlanNavComparison {
  const staleCount = funds.filter(fund => fund.stale).length;
  if (funds.length !== 2) return { applicable: false, reason: null, metrics: null, staleCount };
  const selectedPlans = funds.map(fund => planOf(fund.meta.schemeName));
  if (!selectedPlans.includes('Direct') || !selectedPlans.includes('Regular')) {
    return { applicable: false, reason: null, metrics: null, staleCount };
  }

  const directIndex = selectedPlans.indexOf('Direct');
  const regularIndex = selectedPlans.indexOf('Regular');
  if (new Set(funds.map(fund => fund.meta.schemeCode)).size !== 2) {
    return unavailable('Choose two distinct MFAPI scheme codes.', staleCount);
  }
  if (funds.some(fund => !isGrowthScheme(fund.meta.schemeName))) {
    return unavailable('Only confirmed Growth options are eligible. IDCW or dividend NAV omits distributions.', staleCount);
  }
  if (funds.some(qualityBlocked)) {
    return unavailable('One selected history has unresolved NAV-quality warnings.', staleCount);
  }
  if (funds.some((fund, index) => explicitPlanOf(fund.meta.schemeName) !== selectedPlans[index])) {
    return unavailable('Both scheme names must explicitly identify Direct Plan and Regular Plan.', staleCount);
  }
  if (funds.some(fund => !planStrategyKey(fund.meta.schemeName))
    || planStrategyKey(funds[0].meta.schemeName) !== planStrategyKey(funds[1].meta.schemeName)) {
    return unavailable('The normalized scheme names differ. Do not infer that unrelated funds share a strategy.', staleCount);
  }
  for (const key of ['fundHouse', 'schemeCategory', 'schemeType'] as const) {
    if (!normalized(funds[0].meta[key]) || normalized(funds[0].meta[key]) !== normalized(funds[1].meta[key])) {
      return unavailable('The MFAPI fund house, scheme category and scheme type must match.', staleCount);
    }
  }
  const { dates, series, start, end } = aligned;
  if (dates.length < 2 || !start || !end) {
    return unavailable('Fewer than two identical reported NAV dates fall in the selected period.', staleCount);
  }
  if (series.length !== 2 || series.some(points => points.length !== dates.length)
    || start !== dates[0] || end !== dates[dates.length - 1]) {
    return unavailable('The NAV histories do not share a valid aligned observation range.', staleCount);
  }
  for (let index = 0; index < dates.length; index++) {
    const date = dates[index];
    if (validateDateRange({ start: date, end: date })
      || (index > 0 && dates[index - 1] >= date)
      || series.some(points => points[index].date !== date
        || !(points[index].nav > 0) || !Number.isFinite(points[index].nav))) {
      return unavailable('The aligned history contains invalid, nonunique or mismatched NAV observations.', staleCount);
    }
  }

  const direct = series[directIndex], regular = series[regularIndex];
  const elapsedDays = daysBetween(start, end);
  const annualized = elapsedDays >= 365;
  const directReturn = annualized ? cagr(direct) : absoluteReturn(direct);
  const regularReturn = annualized ? cagr(regular) : absoluteReturn(regular);
  const directEndingValue = STARTING_AMOUNT_INR * direct[direct.length - 1].nav / direct[0].nav;
  const regularEndingValue = STARTING_AMOUNT_INR * regular[regular.length - 1].nav / regular[0].nav;
  if (directReturn === null || regularReturn === null
    || ![directReturn, regularReturn, directEndingValue, regularEndingValue].every(Number.isFinite)) {
    return unavailable('The observed NAV values do not support a finite plan return comparison.', staleCount);
  }
  return {
    applicable: true, reason: null, staleCount,
    metrics: {
      directIndex, regularIndex, start, end, elapsedDays,
      observationCount: dates.length, measure: annualized ? 'CAGR' : 'Absolute return',
      directReturn, regularReturn, returnDifference: directReturn - regularReturn,
      directEndingValue, regularEndingValue,
      endingValueDifference: directEndingValue - regularEndingValue,
    },
  };
}
