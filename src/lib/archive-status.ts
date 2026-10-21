import type { SyncStatus } from './sync-types.ts';

type ArchiveSnapshot = Pick<SyncStatus, 'lastRun' | 'catalogueCount' | 'archivedCount' | 'historyBacklog' | 'backfill'>;
type ArchiveActivity = { kind: 'running' | 'waiting' | 'failed' | 'complete'; label: string };

export function archiveActivity(status: ArchiveSnapshot): ArchiveActivity {
  if (status.lastRun?.status === 'running') return { kind: 'running', label: 'Import last reported as running' };
  if (status.lastRun?.status === 'failed') return { kind: 'failed', label: 'Import failed — needs attention' };
  if (status.backfill?.active) return { kind: 'waiting', label: 'Waiting for next hourly import batch' };
  if (status.lastRun?.status !== 'partial' && status.catalogueCount > 0
    && status.archivedCount >= status.catalogueCount && status.historyBacklog === 0) {
    return { kind: 'complete', label: 'All catalogued histories saved' };
  }
  return { kind: 'waiting', label: 'Waiting for next scheduled update' };
}

function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function timestamp(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
    || !Number.isFinite(Date.parse(value))) return false;
  return new Date(value).toISOString() === (value.includes('.') ? value : value.replace('Z', '.000Z'));
}

export function validBackfillStatus(status: Pick<SyncStatus, 'catalogueCount' | 'archivedCount'> & { backfill?: unknown }): boolean {
  const value = status.backfill;
  // Older deployed responses have no backfill block and retain their existing display.
  if (value === undefined) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !count(status.catalogueCount) || !count(status.archivedCount)) return false;
  const item = value as Record<string, unknown>;
  if (typeof item.active !== 'boolean' || item.maxAttempts !== 3
    || !['attemptedCount', 'unattemptedCount', 'retryPendingCount', 'exhaustedCount', 'unresolvedSavedCount', 'remainingCount']
      .every(key => count(item[key]) && item[key] <= status.catalogueCount)
    || !timestamp(item.startedAt) || !timestamp(item.completedAt)) return false;
  const backfill = value as NonNullable<SyncStatus['backfill']>;
  if (backfill.attemptedCount + backfill.unattemptedCount !== status.catalogueCount
    || status.archivedCount + backfill.retryPendingCount + backfill.exhaustedCount !== backfill.attemptedCount
    || backfill.remainingCount !== backfill.unattemptedCount + backfill.retryPendingCount
    || backfill.unresolvedSavedCount > status.archivedCount) return false;
  if (backfill.active && (!backfill.startedAt || backfill.completedAt !== null)) return false;
  if (backfill.completedAt && (!backfill.startedAt || Date.parse(backfill.completedAt) < Date.parse(backfill.startedAt))) return false;
  return true;
}

export function initialImportSummary(status: Pick<SyncStatus, 'catalogueCount' | 'archivedCount' | 'backfill'>) {
  const backfill = status.backfill;
  if (!backfill || !validBackfillStatus(status)) return null;
  let label: string;
  if (!backfill.startedAt) label = 'Initial import not started';
  else if (backfill.remainingCount > 0 && backfill.completedAt) label = 'Additional schemes awaiting import';
  else if (backfill.unattemptedCount > 0) label = 'First pass incomplete';
  else if (backfill.retryPendingCount > 0) label = 'First pass finished — retries pending';
  else if (!backfill.active && backfill.completedAt && status.catalogueCount > 0) {
    label = backfill.exhaustedCount || backfill.unresolvedSavedCount ? 'Initial import finished with gaps' : 'Initial import finished';
  } else label = 'Initial import awaiting completion check';
  return { label, checked: backfill.attemptedCount, total: status.catalogueCount,
    awaiting: backfill.unattemptedCount, retrying: backfill.retryPendingCount,
    unavailable: backfill.exhaustedCount, needsReview: backfill.unresolvedSavedCount };
}

export function nextPlannedUpdate(schedule: SyncStatus['schedule'] | undefined, now = Date.now()): string | null {
  // The server publishes UTC wall-clock times, not confirmation that a task has started.
  if (!schedule || schedule.timezone !== 'UTC' || !Array.isArray(schedule.times) || !schedule.times.length) return null;
  const midnight = new Date(now);
  if (!Number.isFinite(midnight.getTime())) return null;
  midnight.setUTCHours(0, 0, 0, 0);
  let next = Infinity;
  for (const time of schedule.times) {
    if (typeof time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
    const [hours, minutes] = time.split(':').map(Number);
    const today = midnight.getTime() + (hours * 60 + minutes) * 60_000;
    next = Math.min(next, today > now ? today : today + 86_400_000);
  }
  const planned = new Date(next);
  return Number.isFinite(planned.getTime()) ? planned.toISOString() : null;
}
