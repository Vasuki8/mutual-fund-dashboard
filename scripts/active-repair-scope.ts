import type { CatalogueEntry } from '../server/types.ts';
import { AMFI_OPEN_ENDED_CODES, AMFI_ROSTER_DATE } from '../src/lib/amfi-open-ended-roster.ts';

/** Repair scope only. The public discovery filter retains its seven-day rule. */
export const REPAIR_NAV_WINDOW_DAYS = 30;
export const REPAIR_ROSTER_DATE = AMFI_ROSTER_DATE;
const DAY_MS = 86_400_000;
const officialCodes = new Set<number>(AMFI_OPEN_ENDED_CODES);
type RepairIdentity = Pick<CatalogueEntry, 'schemeCode' | 'current' | 'latestDate' | 'nav'>;

/**
 * Operational activity, not purchase eligibility. Re-evaluate against the
 * actual UTC day; a stale catalogue cannot reset the reference clock.
 * The complete history of an eligible scheme remains in scope for repair.
 */
export function isActiveRepairCandidate(entry: RepairIdentity, asOfMs = Date.now()): boolean {
  if (!Number.isFinite(asOfMs) || !officialCodes.has(entry.schemeCode) || entry.current !== true
    || typeof entry.nav !== 'string' || !/^\d+(?:\.\d+)?$/.test(entry.nav.trim())
    || !Number.isFinite(Number(entry.nav)) || Number(entry.nav) <= 0
    || typeof entry.latestDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.latestDate)) return false;
  const date = Date.parse(entry.latestDate + 'T00:00:00Z');
  if (!Number.isFinite(date) || new Date(date).toISOString().slice(0, 10) !== entry.latestDate) return false;
  const today = Math.floor(asOfMs / DAY_MS) * DAY_MS;
  return date <= today && date >= today - REPAIR_NAV_WINDOW_DAYS * DAY_MS;
}
