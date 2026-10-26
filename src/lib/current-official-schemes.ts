import type { CatalogueEntry } from '../../server/types.ts';
import { AMFI_OPEN_ENDED_CODES, AMFI_ROSTER_DATE } from './amfi-open-ended-roster.ts';

/**
 * Directory discovery only. The manual roster identifies open-ended schemes,
 * NOT which schemes currently accept investments.
 * Historical data, bookmarks and direct research URLs remain accessible.
 */
export const OFFICIAL_SCHEME_ROSTER_DATE = AMFI_ROSTER_DATE;
export const RECENT_NAV_WINDOW_DAYS = 7;
const DAY_MS = 86_400_000;
const eligibleCodes = new Set<number>(AMFI_OPEN_ENDED_CODES);

type DiscoveryEntry = Pick<CatalogueEntry, 'schemeCode' | 'current' | 'latestDate' | 'nav'>;

function sourceDate(value: string | null): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0,10) === value
    ? timestamp : null;
}

/** Exact official scheme code + MFAPI latest membership + recent positive NAV. */
export function isCurrentlyReportingOpenEnded(entry: DiscoveryEntry, asOfMs = Date.now()): boolean {
  if (!Number.isFinite(asOfMs) || !eligibleCodes.has(entry.schemeCode) || entry.current !== true ||
    typeof entry.nav !== 'string' || !(Number(entry.nav) > 0)) return false;
  const navDate = sourceDate(entry.latestDate);
  if (navDate === null) return false;
  const today = Math.floor(asOfMs / DAY_MS) * DAY_MS;
  return navDate <= today && navDate >= today - RECENT_NAV_WINDOW_DAYS * DAY_MS;
}

export function filterCurrentlyReportingOpenEnded<T extends DiscoveryEntry>(entries: readonly T[], asOfMs = Date.now()): T[] {
  return entries.filter(entry => isCurrentlyReportingOpenEnded(entry, asOfMs));
}
