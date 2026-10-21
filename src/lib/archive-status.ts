import type { SyncStatus } from './sync-types.ts';

type ArchiveSnapshot = Pick<SyncStatus, 'lastRun' | 'catalogueCount' | 'archivedCount' | 'historyBacklog'>;
type ArchiveActivity = { kind: 'running' | 'waiting' | 'failed' | 'complete'; label: string };

export function archiveActivity(status: ArchiveSnapshot): ArchiveActivity {
  if (status.lastRun?.status === 'running') return { kind: 'running', label: 'Import last reported as running' };
  if (status.lastRun?.status === 'failed') return { kind: 'failed', label: 'Import failed — needs attention' };
  if (status.lastRun?.status !== 'partial' && status.catalogueCount > 0
    && status.archivedCount >= status.catalogueCount && status.historyBacklog === 0) {
    return { kind: 'complete', label: 'All catalogued histories saved' };
  }
  return { kind: 'waiting', label: 'Waiting for next scheduled update' };
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
