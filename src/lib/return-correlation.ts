import type { AnalysisRange, FundData } from './types.ts';
import { isGrowthScheme, monthlyReturns, selectRange } from './analytics.ts';
import { qualityBlocked } from './format.ts';

export interface ReturnCorrelationCell {
  correlation: number | null;
  pairedMonths: number;
  firstMonth: string | null;
  lastMonth: string | null;
  reason: string | null;
}
export interface ReturnCorrelationMatrix {
  schemeCodes: number[];
  schemeNames: string[];
  cells: ReturnCorrelationCell[][];
  staleCount: number;
}
const MIN_PAIRED_MONTHS = 12;
function monthIndex(year: number, month: number): number { return year * 12 + month - 1; }
function monthLabel(index: number): string {
  const year = Math.floor(index / 12);
  return String(year).padStart(4, '0') + '-' + String(index - year * 12 + 1).padStart(2, '0');
}

/** Pearson correlation of independently validated and paired complete calendar-month NAV returns. */
function pairedCorrelation(left: Map<number, number>, right: Map<number, number>): ReturnCorrelationCell {
  const matchedKeys = [...left.keys()].filter(month => right.has(month)).sort((a, b) => a - b);
  const matched = matchedKeys.map(month => [left.get(month)!, right.get(month)!] as const);
  const count = matched.length;
  const firstMonth = count ? monthLabel(matchedKeys[0]) : null;
  const lastMonth = count ? monthLabel(matchedKeys[count - 1]) : null;
  if (count < MIN_PAIRED_MONTHS) {
    return { correlation: null, pairedMonths: count, firstMonth, lastMonth,
      reason: 'Requires at least 12 calendar months with complete returns for both funds.' };
  }
  const meanLeft = matched.reduce((sum, point) => sum + point[0], 0) / count;
  const meanRight = matched.reduce((sum, point) => sum + point[1], 0) / count;
  let xx = 0, yy = 0, xy = 0;
  for (const [a, b] of matched) {
    const dx = a - meanLeft, dy = b - meanRight;
    xx += dx * dx; yy += dy * dy; xy += dx * dy;
  }
  const denominator = Math.sqrt(xx * yy);
  if (!Number.isFinite(denominator) || denominator === 0) {
    return { correlation: null, pairedMonths: count, firstMonth, lastMonth,
      reason: 'Return variation is zero or unusable for a correlation coefficient.' };
  }
  const result = xy / denominator;
  if (!Number.isFinite(result)) {
    return { correlation: null, pairedMonths: count, firstMonth, lastMonth, reason: 'Correlation is not finite.' };
  }
  return { correlation: Math.max(-1, Math.min(1, result)), pairedMonths: count, firstMonth, lastMonth, reason: null };
}

/**
 * Return correlation is NOT holdings overlap. Each pair uses month keys observed for both
 * funds. Missing months are excluded, never filled with a zero-return assumption.
 */
export function returnCorrelationMatrix(funds: FundData[], period: AnalysisRange): ReturnCorrelationMatrix {
  const throughDate = typeof period === 'string' ? undefined : period.end;
  const codeCounts = new Map<number, number>();
  funds.forEach(fund => codeCounts.set(fund.meta.schemeCode, (codeCounts.get(fund.meta.schemeCode) ?? 0) + 1));
  const eligible = funds.map(fund => isGrowthScheme(fund.meta.schemeName) && !qualityBlocked(fund)
    && codeCounts.get(fund.meta.schemeCode) === 1);
  const months = funds.map((fund, i) => {
    if (!eligible[i]) return new Map<number, number>();
    return new Map(monthlyReturns(selectRange(fund.points, period), throughDate)
      .map(entry => [monthIndex(entry.year, entry.month), entry.value]));
  });
  const cells = funds.map((fund, i) => funds.map((_, j): ReturnCorrelationCell => {
    if (!eligible[i] || !eligible[j]) {
      return { correlation: null, pairedMonths: 0, firstMonth: null, lastMonth: null,
        reason: 'Growth options with independently validated NAV histories and distinct scheme codes are required.' };
    }
    return pairedCorrelation(months[i], months[j]);
  }));
  return {
    schemeCodes: funds.map(fund => fund.meta.schemeCode),
    schemeNames: funds.map(fund => fund.meta.schemeName),
    cells,
    staleCount: funds.filter(fund => fund.stale).length,
  };
}
