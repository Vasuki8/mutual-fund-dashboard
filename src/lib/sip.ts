import type { AnalysisRange, NavPoint } from './types.ts';
import { daysBetween, periodStart, selectRange, validateDateRange } from './analytics.ts';

export const SIP_MIN_AMOUNT = 100;
export const SIP_MAX_AMOUNT = 10_000_000;
const MAX_SCHEDULED_MONTHS = 1200;
const MAX_DELAY_DAYS = 7;

export interface SipContribution {
  scheduledDate: string;
  navDate: string;
  nav: number;
  amount: number;
  units: number;
}
export interface SipSnapshot {
  date: string;
  invested: number;
  value: number;
}
export interface SipSimulation {
  reason: string | null;
  requestedStart: string | null;
  requestedEnd: string | null;
  actualStart: string | null;
  valuationDate: string | null;
  navObservations: number;
  scheduledCount: number;
  skippedCount: number;
  contributions: SipContribution[];
  timeline: SipSnapshot[];
  invested: number;
  units: number;
  endingValue: number | null;
  gain: number | null;
  gainShare: number | null;
  annualizedXirr: number | null;
}
function empty(reason: string, start: string | null = null, end: string | null = null): SipSimulation {
  return { reason, requestedStart: start, requestedEnd: end, actualStart: null,
    valuationDate: null, navObservations: 0, scheduledCount: 0, skippedCount: 0,
    contributions: [], timeline: [], invested: 0, units: 0,
    endingValue: null, gain: null, gainShare: null, annualizedXirr: null };
}
function leap(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
function monthDays(year: number, month: number): number {
  return month === 2 ? (leap(year) ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31;
}
/** Each monthly anniversary is anchored to the ORIGINAL requested day; no February drift. */
function monthAt(anchor: string, offset: number): string {
  const [year, month, day] = anchor.split('-').map(Number);
  const absolute = year * 12 + month - 1 + offset;
  const y = Math.floor(absolute / 12), m = absolute - y * 12 + 1;
  const d = Math.min(day, monthDays(y, m));
  return [String(y).padStart(4, '0'), String(m).padStart(2, '0'), String(d).padStart(2, '0')].join('-');
}
/** Binary search for the first actual NAV ON OR AFTER a scheduled contribution. */
function firstOnOrAfter(points: NavPoint[], date: string): NavPoint | null {
  let lo = 0, hi = points.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (points[mid].date < date) lo = mid + 1;
    else hi = mid;
  }
  return points[lo] ?? null;
}
function moneyWeightedXirr(contributions: SipContribution[], value: number, end: string): number | null {
  if (contributions.length === 0 || !(value > 0)
    || daysBetween(contributions[0].navDate, end) < 365) return null;
  // Future-value version of the dated cash-flow equation:
  // FV = sum(contribution * (1 + r) ^ (days invested / 365)).
  const years = contributions.map(item => daysBetween(item.navDate, end) / 365);
  const futureValue = (r: number) => contributions.reduce(
    (sum, item, i) => sum + item.amount * Math.pow(1 + r, years[i]), 0);
  let lo = -0.999999999, hi = 1;
  if (futureValue(lo) > value) return null;
  while (futureValue(hi) < value && hi < 1_000_000) hi = hi * 2 + 1;
  if (futureValue(hi) < value) return null;
  for (let i = 0; i < 120; i++) {
    const mid = (lo + hi) / 2;
    if (futureValue(mid) < value) lo = mid;
    else hi = mid;
  }
  const result = (lo + hi) / 2;
  return Number.isFinite(result) ? result : null;
}
/**
 * Hypothetical fixed monthly cash flows from observed NAV only. Schedule at
 * requested monthly anniversaries, execute on the first reported NAV ON/AFTER
 * each date within seven calendar days; skip unavailable months. No cash,
 * observation or price is interpolated and no trades are executed.
 */
export function simulateSip(points: NavPoint[], range: AnalysisRange, monthlyAmount: number): SipSimulation {
  if (!Number.isFinite(monthlyAmount) || monthlyAmount < SIP_MIN_AMOUNT || monthlyAmount > SIP_MAX_AMOUNT) {
    return empty('Choose a monthly contribution between ₹100 and ₹1 crore.');
  }
  if (!points.length) return empty('No NAV history is available for this scheme.');
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!Number.isFinite(p.nav) || p.nav <= 0
      || validateDateRange({ start: p.date, end: p.date })
      || (i > 0 && points[i - 1].date >= p.date)) {
      return empty('NAV history must contain unique, ascending dates and positive values.');
    }
  }
  if (typeof range !== 'string' && validateDateRange(range)) {
    return empty('Choose valid custom start and end dates.', range.start, range.end);
  }
  const last = points[points.length - 1].date;
  const requestedStart = typeof range === 'string' ? (periodStart(last, range) ?? points[0].date) : range.start;
  const requestedEnd = typeof range === 'string' ? last : range.end;
  // Exclude any predecessor before the requested SIP start: an earlier chart
  // baseline must never become a simulated cash flow.
  const selected = selectRange(points, range).filter(point => point.date >= requestedStart);
  if (!selected.length) {
    return empty('No reported NAV is available within the requested period.', requestedStart, requestedEnd);
  }
  const actualEnd = selected[selected.length - 1].date;
  const contributions: SipContribution[] = [];
  let scheduledCount = 0;
  for (let i = 0; i < MAX_SCHEDULED_MONTHS; i++) {
    const scheduledDate = monthAt(requestedStart, i);
    if (scheduledDate > actualEnd) break;
    scheduledCount++;
    const executed = firstOnOrAfter(selected, scheduledDate);
    if (!executed || daysBetween(scheduledDate, executed.date) > MAX_DELAY_DAYS) continue;
    contributions.push({ scheduledDate, navDate: executed.date, nav: executed.nav,
      amount: monthlyAmount, units: monthlyAmount / executed.nav });
  }
  if (monthAt(requestedStart, MAX_SCHEDULED_MONTHS) <= actualEnd) {
    return empty('The selected period exceeds the 1,200-month simulation limit.', requestedStart, requestedEnd);
  }
  const invested = contributions.reduce((sum, item) => sum + item.amount, 0);
  const units = contributions.reduce((sum, item) => sum + item.units, 0);
  const endingValue = units * selected[selected.length - 1].nav;
  const timeline: SipSnapshot[] = [];
  let currentUnits = 0, currentInvested = 0, index = 0;
  for (const point of selected) {
    while (index < contributions.length && contributions[index].navDate <= point.date) {
      const cash = contributions[index++];
      currentUnits += cash.units;
      currentInvested += cash.amount;
    }
    timeline.push({ date: point.date, invested: currentInvested, value: currentUnits * point.nav });
  }
  if (!contributions.length) {
    return { ...empty('None of the scheduled dates could be valued within seven days.', requestedStart, requestedEnd),
      actualStart: selected[0].date, valuationDate: actualEnd, navObservations: selected.length,
      scheduledCount, skippedCount: scheduledCount, timeline };
  }
  const gain = endingValue - invested;
  return { reason: null, requestedStart, requestedEnd,
    actualStart: selected[0].date, valuationDate: actualEnd, navObservations: selected.length,
    scheduledCount, skippedCount: scheduledCount - contributions.length,
    contributions, timeline, invested, units, endingValue, gain,
    gainShare: invested > 0 ? gain / invested : null,
    annualizedXirr: moneyWeightedXirr(contributions, endingValue, actualEnd) };
}
