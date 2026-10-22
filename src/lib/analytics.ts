import type { AnalysisRange, DateRange, NavPoint, Period } from './types.ts';

export const CALCULATION_VERSION = '1.3.0';

const MILLISECONDS_PER_DAY = 86_400_000;
const MAX_PRECEDING_DAYS = 7;
const MONTHS_PER_PERIOD: Record<Exclude<Period, 'MAX'>, number> = {
  '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '3Y': 36, '5Y': 60,
};

function dateParts(value: string): [number, number, number] {
  return [Number(value.slice(0, 4)), Number(value.slice(5, 7)), Number(value.slice(8, 10))];
}

function formatDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function shiftMonths(value: string, offset: number): string {
  const [year, month, day] = dateParts(value);
  const shifted = year * 12 + month - 1 + offset;
  const targetYear = Math.floor(shifted / 12);
  const targetMonth = shifted - targetYear * 12 + 1;
  return formatDate(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

function finiteOrNull(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

/** Last observation at or before the target; never substitutes a future NAV. */
function predecessorIndex(points: NavPoint[], target: string): number {
  let left = 0;
  let right = points.length;
  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    if (points[middle].date <= target) left = middle + 1;
    else right = middle;
  }
  return left - 1;
}

function eligiblePredecessor(points: NavPoint[], target: string): NavPoint | null {
  const index = predecessorIndex(points, target);
  if (index < 0 || daysBetween(points[index].date, target) > MAX_PRECEDING_DAYS) return null;
  return points[index];
}

/** MFAPI's DD-MM-YYYY format, validated without local-time conversion. */
export function parseNavDate(value: string): string | null {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return formatDate(year, month, day);
}

/** Inputs throughout this module are validated, ascending ISO calendar dates. */
export function daysBetween(start: string, end: string): number {
  return (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / MILLISECONDS_PER_DAY;
}

export function periodStart(end: string, period: Period): string | null {
  return period === 'MAX' ? null : shiftMonths(end, -MONTHS_PER_PERIOD[period]);
}

/** The actual returned start makes any shorter available range explicit. */
export function selectPeriod(points: NavPoint[], period: Period): NavPoint[] {
  if (!points.length) return [];
  const target = periodStart(points[points.length - 1].date, period);
  if (target === null) return points.slice();
  const index = predecessorIndex(points, target);
  const eligible = index >= 0 && daysBetween(points[index].date, target) <= MAX_PRECEDING_DAYS;
  return points.slice(eligible ? index : index + 1);
}

export function validateDateRange(range: DateRange): string | null {
  if (!range.start || !range.end) return 'Choose both a start date and an end date.';
  for (const [label, value] of [['Start', range.start], ['End', range.end]]) {
    const error = `${label} date must be a valid calendar date in YYYY-MM-DD format (years 0001–9999).`;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return error;
    const [year, month, day] = dateParts(value);
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return error;
  }
  return range.start > range.end ? 'Start date must be on or before the end date.' : null;
}

/** Custom ranges need a NAV inside the requested interval before adding an eligible preceding baseline. */
export function selectRange(points: NavPoint[], range: AnalysisRange): NavPoint[] {
  if (typeof range === 'string') return selectPeriod(points, range);
  if (validateDateRange(range) !== null || !points.length) return [];
  const endIndex = predecessorIndex(points, range.end);
  if (endIndex < 0 || points[endIndex].date < range.start) return [];
  const startIndex = predecessorIndex(points, range.start);
  const eligible = startIndex >= 0 && daysBetween(points[startIndex].date, range.start) <= MAX_PRECEDING_DAYS;
  return points.slice(eligible ? startIndex : startIndex + 1, endIndex + 1);
}

export function absoluteReturn(points: NavPoint[]): number | null {
  if (points.length < 2) return null;
  return finiteOrNull(points[points.length - 1].nav / points[0].nav - 1);
}

export function cagr(points: NavPoint[]): number | null {
  if (points.length < 2) return null;
  const end = points[points.length - 1];
  const elapsedDays = daysBetween(points[0].date, end.date);
  if (elapsedDays < 365) return null;
  return finiteOrNull(Math.pow(end.nav / points[0].nav, 365 / elapsedDays) - 1);
}

export function trailingReturn(points: NavPoint[], years: number): number | null {
  if (points.length < 2 || !Number.isInteger(years) || years < 1) return null;
  const end = points[points.length - 1];
  const target = shiftMonths(end.date, -years * 12);
  const start = eligiblePredecessor(points, target);
  if (!start) return null;
  return years === 1 ? absoluteReturn([start, end]) : cagr([start, end]);
}

export function drawdownSeries(points: NavPoint[]): { date: string; value: number }[] {
  let peak = 0;
  return points.map(point => {
    peak = Math.max(peak, point.nav);
    return { date: point.date, value: point.nav / peak - 1 };
  });
}

export function drawdownStats(points: NavPoint[]): {
  maxDrawdown: number | null; currentDrawdown: number | null;
  peakDate: string | null; troughDate: string | null; recoveryDate: string | null;
} {
  if (!points.length) {
    return { maxDrawdown: null, currentDrawdown: null, peakDate: null, troughDate: null, recoveryDate: null };
  }
  let runningPeak = points[0];
  let episodePeak = points[0].nav;
  let maxDrawdown = 0;
  let currentDrawdown = 0;
  let peakDate: string | null = null;
  let troughDate: string | null = null;
  let recoveryDate: string | null = null;
  for (const point of points) {
    if (point.nav >= runningPeak.nav) runningPeak = point;
    currentDrawdown = point.nav / runningPeak.nav - 1;
    if (currentDrawdown < maxDrawdown) {
      maxDrawdown = currentDrawdown;
      peakDate = runningPeak.date;
      troughDate = point.date;
      episodePeak = runningPeak.nav;
      recoveryDate = null;
    } else if (troughDate !== null && recoveryDate === null && point.nav >= episodePeak) {
      recoveryDate = point.date;
    }
  }
  return { maxDrawdown, currentDrawdown, peakDate, troughDate, recoveryDate };
}

export interface DrawdownEpisode {
  peakDate: string;
  troughDate: string;
  recoveryDate: string | null;
  endDate: string;
  drawdown: number;
  declineDays: number;
  recoveryDays: number | null;
  underwaterDays: number;
}

function summarizeDrawdownEpisode(peak: NavPoint, trough: NavPoint, end: NavPoint, recovered: boolean): DrawdownEpisode {
  return {
    peakDate: peak.date,
    troughDate: trough.date,
    recoveryDate: recovered ? end.date : null,
    endDate: end.date,
    drawdown: trough.nav / peak.nav - 1,
    declineDays: daysBetween(peak.date, trough.date),
    recoveryDays: recovered ? daysBetween(trough.date, end.date) : null,
    underwaterDays: daysBetween(peak.date, end.date),
  };
}

/** Non-overlapping observed declines, measured from the supplied window's running high. */
export function drawdownEpisodes(points: NavPoint[]): DrawdownEpisode[] {
  if (points.length < 2) return [];
  const episodes: DrawdownEpisode[] = [];
  let peak = points[0];
  let trough: NavPoint | null = null;
  for (const point of points) {
    if (point.nav >= peak.nav) {
      if (trough !== null) episodes.push(summarizeDrawdownEpisode(peak, trough, point, true));
      // The latest equal high anchors a subsequent decline, matching drawdownStats.
      peak = point;
      trough = null;
    } else if (trough === null || point.nav < trough.nav) {
      trough = point;
    }
  }
  if (trough !== null) {
    episodes.push(summarizeDrawdownEpisode(peak, trough, points[points.length - 1], false));
  }
  return episodes;
}

/** Deepest first, retaining the ongoing decline even when it falls outside the limit. */
export function selectDrawdownEpisodes(episodes: DrawdownEpisode[], limit = 5): DrawdownEpisode[] {
  const ranked = [...episodes].sort((a, b) => a.drawdown - b.drawdown || a.peakDate.localeCompare(b.peakDate));
  const selected = ranked.slice(0, limit);
  const ongoing = ranked.find(episode => episode.recoveryDate === null);
  if (ongoing && !selected.includes(ongoing)) selected.push(ongoing);
  return selected;
}

/** An explicit cutoff excludes partial historical months from custom analysis. */
export function monthlyReturns(points: NavPoint[], throughDate?: string): { year: number; month: number; date: string; value: number }[] {
  if (points.length < 2) return [];
  const lastInMonth = new Map<number, NavPoint>();
  for (const point of points) {
    const [year, month] = dateParts(point.date);
    lastInMonth.set(year * 12 + month - 1, point);
  }
  const [latestYear, latestMonth] = dateParts(points[points.length - 1].date);
  const latestMonthIndex = latestYear * 12 + latestMonth - 1;
  const now = new Date(Date.now());
  const currentMonthIndex = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const eligible = new Map<number, NavPoint>();
  for (const [index, point] of lastInMonth) {
    const year = Math.floor(index / 12);
    const month = index - year * 12 + 1;
    const end = formatDate(year, month, daysInMonth(year, month));
    const complete = index < latestMonthIndex || point.date === end || index < currentMonthIndex;
    const withinCutoff = throughDate === undefined || end <= throughDate;
    if (complete && withinCutoff && daysBetween(point.date, end) <= MAX_PRECEDING_DAYS) eligible.set(index, point);
  }
  const returns: { year: number; month: number; date: string; value: number }[] = [];
  for (const [index, point] of eligible) {
    const previous = eligible.get(index - 1);
    if (!previous) continue;
    const year = Math.floor(index / 12);
    returns.push({ year, month: index - year * 12 + 1, date: point.date, value: point.nav / previous.nav - 1 });
  }
  return returns;
}

/** Descriptive downside outcomes from completed, non-bridged monthly NAV returns. */
export type MonthlyReturn = ReturnType<typeof monthlyReturns>[number];

export interface MonthlyDownsideStats {
  monthlyCount: number;
  lossMonths: number;
  lossShare: number | null;
  longestLossStreak: number | null;
  percentile5: number | null;
  tailMean: number | null;
  tailCount: number;
  worstMonths: MonthlyReturn[];
}

/**
 * At least 12 eligible months are required for loss share/streak and 60 for
 * 5th-percentile/tail summaries. These are observed frequencies, not forecasts.
 */
export function monthlyDownsideStats(returns: MonthlyReturn[]): MonthlyDownsideStats {
  const empty: MonthlyDownsideStats = { monthlyCount: returns.length, lossMonths: 0,
    lossShare: null, longestLossStreak: null, percentile5: null, tailMean: null,
    tailCount: 0, worstMonths: [] };
  // The normal caller uses monthlyReturns(). Reject corrupt inputs instead of
  // silently omitting extreme, duplicated, or non-finite monthly observations.
  const monthKeys = returns.map(item => item.year * 12 + item.month - 1);
  if (returns.some(item => !Number.isFinite(item.value) || item.value <= -1
    || !Number.isSafeInteger(item.year) || !Number.isInteger(item.month)
    || item.month < 1 || item.month > 12)
    || new Set(monthKeys).size !== returns.length) return empty;

  const chronological = [...returns].sort((a, b) => a.year * 12 + a.month - b.year * 12 - b.month);
  let losses = 0, currentStreak = 0, longestStreak = 0, priorMonth: number | null = null;
  for (const item of chronological) {
    const key = item.year * 12 + item.month - 1;
    if (item.value < 0) {
      losses++;
      currentStreak = priorMonth !== null && key === priorMonth + 1 ? currentStreak + 1 : 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else currentStreak = 0;
    priorMonth = key;
  }
  if (returns.length < 12) return { ...empty, lossMonths: losses };

  const ranked = [...returns].sort((a, b) => a.value - b.value || a.date.localeCompare(b.date));
  let percentile5: number | null = null, tailMean: number | null = null, tailCount = 0;
  if (returns.length >= 60) {
    // R-7 linear interpolation: fractional rank (n-1) * 0.05.
    const position = (ranked.length - 1) * 0.05;
    const lower = Math.floor(position), upper = Math.ceil(position);
    percentile5 = finiteOrNull(ranked[lower].value +
      (ranked[upper].value - ranked[lower].value) * (position - lower));
    // Include a whole number of actual observations, never invented returns.
    tailCount = Math.ceil(ranked.length * 0.05);
    tailMean = finiteOrNull(ranked.slice(0, tailCount)
      .reduce((sum, item) => sum + item.value, 0) / tailCount);
  }
  return { monthlyCount: returns.length, lossMonths: losses, lossShare: losses / returns.length,
    longestLossStreak: longestStreak, percentile5, tailMean, tailCount,
    worstMonths: ranked.slice(0, 5) };
}

export function riskStats(points: NavPoint[], annualRiskFreeRate = 0, throughDate?: string, annualTargetRate = annualRiskFreeRate): {
  volatility: number | null; sharpe: number | null; sortino: number | null;
  monthlyCount: number; positiveMonths: number; bestMonth: number | null; worstMonth: number | null;
} {
  const returns = monthlyReturns(points, throughDate).map(point => point.value);
  const monthlyCount = returns.length;
  const summaries = {
    monthlyCount,
    positiveMonths: returns.filter(value => value > 0).length,
    bestMonth: monthlyCount ? Math.max(...returns) : null,
    worstMonth: monthlyCount ? Math.min(...returns) : null,
  };
  if (monthlyCount < 12) return { volatility: null, sharpe: null, sortino: null, ...summaries };
  const mean = returns.reduce((sum, value) => sum + value, 0) / monthlyCount;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (monthlyCount - 1);
  const volatility = Math.sqrt(variance * 12);
  const validRiskFree = Number.isFinite(annualRiskFreeRate) && annualRiskFreeRate >= -1;
  const validTarget = Number.isFinite(annualTargetRate) && annualTargetRate >= -1;
  const riskFreeMonthly = validRiskFree ? Math.pow(1 + annualRiskFreeRate, 1 / 12) - 1 : null;
  const targetMonthly = validTarget ? Math.pow(1 + annualTargetRate, 1 / 12) - 1 : null;
  // Sharpe uses the risk-free assumption. Sortino uses its independently stated target.
  // Monthly arithmetic excess returns are annualized by multiplying the mean by 12.
  const sharpe = riskFreeMonthly !== null && volatility > 0
    ? finiteOrNull((mean - riskFreeMonthly) * 12 / volatility) : null;
  // All eligible months enter the downside denominator, including zero shortfalls.
  const downsideVariance = targetMonthly === null ? null
    : returns.reduce((sum, value) => sum + Math.min(0, value - targetMonthly) ** 2, 0) / monthlyCount;
  const annualDownside = downsideVariance === null ? null : Math.sqrt(downsideVariance * 12);
  return {
    volatility,
    sharpe,
    sortino: targetMonthly !== null && annualDownside !== null && annualDownside > 0
      ? finiteOrNull((mean - targetMonthly) * 12 / annualDownside) : null,
    ...summaries,
  };
}

export function rollingReturns(points: NavPoint[], years: number): { start: string; end: string; value: number }[] {
  if (points.length < 2 || !Number.isInteger(years) || years < 1) return [];
  const latest = points[points.length - 1].date;
  const returns: { start: string; end: string; value: number }[] = [];
  for (const start of points) {
    const anniversary = shiftMonths(start.date, years * 12);
    if (anniversary > latest) break;
    const end = eligiblePredecessor(points, anniversary);
    if (!end) continue;
    const value = years === 1 ? absoluteReturn([start, end]) : cagr([start, end]);
    if (value !== null) returns.push({ start: start.date, end: end.date, value });
  }
  return returns;
}


export interface RollingReturnSummary {
  count: number;
  min: number | null;
  p10: number | null;
  median: number | null;
  max: number | null;
  positiveShare: number | null;
  firstStart: string | null;
  lastStart: string | null;
}

/** Empirical window summary: the windows overlap and must not be treated as independent trials. */
export function rollingReturnSummary(returns: ReturnType<typeof rollingReturns>): RollingReturnSummary {
  const ordered = returns.map(item => item.value).filter(Number.isFinite).sort((a, b) => a - b);
  const count = ordered.length;
  const percentile = (p: number): number | null => {
    if (!count) return null;
    const index = (count - 1) * p;
    const lower = Math.floor(index), upper = Math.ceil(index);
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (index - lower);
  };
  return {
    count,
    min: count ? ordered[0] : null,
    p10: percentile(0.10),
    median: percentile(0.50),
    max: count ? ordered[count - 1] : null,
    positiveShare: count ? ordered.filter(value => value > 0).length / count : null,
    firstStart: returns.length ? returns[0].start : null,
    lastStart: returns.length ? returns[returns.length - 1].start : null,
  };
}

export function alignFunds(series: NavPoint[][], period: AnalysisRange): {
  dates: string[]; series: NavPoint[][]; start: string | null; end: string | null;
} {
  const empty = { dates: [], series: series.map(() => []), start: null, end: null };
  if (!series.length || series.some(points => !points.length)) return empty;
  const lookups = series.map(points => new Map(points.map(point => [point.date, point])));
  const commonPoints = series[0].filter(point => lookups.every(lookup => lookup.has(point.date)));
  const selected = selectRange(commonPoints, period);
  if (!selected.length) return empty;
  const dates = selected.map(point => point.date);
  return {
    dates,
    series: lookups.map(lookup => dates.map(date => lookup.get(date)!)),
    start: dates[0],
    end: dates[dates.length - 1],
  };
}

export function isGrowthScheme(name: string): boolean {
  if (/\b(?:idcw|dividend)\b|income\s+distribution|capital\s+withdrawal/i.test(name)) return false;
  return /\bgrowth\b/i.test(name);
}
