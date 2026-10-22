import type { AnalysisRange, FundData } from './types.ts';
import { absoluteReturn, alignFunds, cagr, daysBetween, isGrowthScheme } from './analytics.ts';
import { qualityBlocked } from './format.ts';

export interface SelectedPeerRow {
  schemeCode: number;
  schemeName: string;
  returnValue: number;
  percentile: number;
}

export interface SelectedPeerSummary {
  available: boolean;
  reason: string | null;
  category: string | null;
  plan: 'Direct' | 'Regular' | null;
  eligibleCount: number;
  start: string | null;
  end: string | null;
  observationCount: number;
  metric: 'CAGR' | 'Absolute return' | null;
  median: number | null;
  rows: SelectedPeerRow[];
  staleCount: number;
}

const normalized = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase();
function planOf(name: string): 'Direct' | 'Regular' | null {
  const direct = /\bdirect\b/i.test(name);
  const regular = /\bregular\b/i.test(name);
  return direct === regular ? null : direct ? 'Direct' : 'Regular';
}

/** Conservative duplicate screening: do not double-count plan or option variants. */
function strategyKey(fund: FundData): string {
  const stem = fund.meta.schemeName
    .replace(/\(erstwhile[^)]*\)/gi, ' ')
    .replace(/\b(?:direct|regular)\s+plan\b/gi, ' ')
    .replace(/\b(?:direct|regular|growth|option|idcw|dividend|payout|reinvestment)\b/gi, ' ')
    .replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();
  return normalized(fund.meta.fundHouse) + ':' + stem;
}

function empty(reason: string, staleCount = 0): SelectedPeerSummary {
  return { available: false, reason, category: null, plan: null, eligibleCount: 0,
    start: null, end: null, observationCount: 0, metric: null, median: null, rows: [], staleCount };
}

/**
 * Descriptive statistics for a deliberately user-selected cohort, not a category-wide
 * universe or investable fund ranking. Every included fund uses identical NAV dates.
 */
export function selectedPeerSummary(funds: FundData[], range: AnalysisRange): SelectedPeerSummary {
  const staleCount = funds.filter(fund => fund.stale).length;
  if (funds.length < 2 || funds.length > 4) return empty('Select between two and four funds.', staleCount);
  if (new Set(funds.map(fund => fund.meta.schemeCode)).size !== funds.length) {
    return empty('A scheme was selected more than once. Each scheme can appear only once.', staleCount);
  }
  if (funds.some(fund => !isGrowthScheme(fund.meta.schemeName))) {
    return empty('NAV-only peer returns require confirmed Growth options; IDCW and dividend NAVs omit distributions.', staleCount);
  }
  if (funds.some(qualityBlocked)) {
    return empty('At least one selected history has unresolved NAV-quality warnings.', staleCount);
  }
  const categories = new Set(funds.map(fund => normalized(fund.meta.schemeCategory)));
  if (categories.size !== 1 || categories.has('')) {
    return empty('Selected funds must have the same verified MFAPI scheme category.', staleCount);
  }
  const types = new Set(funds.map(fund => normalized(fund.meta.schemeType)));
  if (types.size !== 1 || types.has('')) {
    return empty('Selected funds must have the same MFAPI scheme type.', staleCount);
  }
  const plans = funds.map(fund => planOf(fund.meta.schemeName));
  if (plans.some(plan => plan === null)) {
    return empty('Each selected scheme must have an identifiable Direct or Regular plan.', staleCount);
  }
  if (new Set(plans).size !== 1) {
    return empty('Selected peer returns require matching Direct or Regular plan types.', staleCount);
  }
  if (new Set(funds.map(strategyKey)).size !== funds.length) {
    return empty('The selection includes apparent variants of the same underlying fund; these cannot count as independent peers.', staleCount);
  }
  const common = alignFunds(funds.map(fund => fund.points), range);
  if (common.dates.length < 2 || !common.start || !common.end) {
    return empty('Fewer than two exact NAV observation dates are shared within the selected period.', staleCount);
  }
  const annualized = daysBetween(common.start, common.end) >= 365;
  const values = common.series.map(points => annualized ? cagr(points) : absoluteReturn(points));
  if (values.some(value => value === null || !Number.isFinite(value))) {
    return empty('Comparable returns could not be calculated from the common NAV dates.', staleCount);
  }
  const sorted = (values as number[]).slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  const rows = funds.map((fund, index) => {
    const value = values[index] as number;
    const below = sorted.filter(item => item < value).length;
    const ties = sorted.filter(item => item === value).length;
    return { schemeCode: fund.meta.schemeCode, schemeName: fund.meta.schemeName,
      returnValue: value, percentile: 100 * (below + ties / 2) / sorted.length };
  });
  return {
    available: true,
    reason: null,
    category: funds[0].meta.schemeCategory,
    plan: plans[0],
    eligibleCount: funds.length,
    start: common.start,
    end: common.end,
    observationCount: common.dates.length,
    metric: annualized ? 'CAGR' : 'Absolute return',
    median,
    rows,
    staleCount,
  };
}
