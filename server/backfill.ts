import type { BackfillStatus } from '../src/lib/sync-types.ts';
import type { ArchiveIndex, BackfillState, Catalogue, FailureRow, QueueItem } from './types.ts';

export const BACKFILL_MAX_ATTEMPTS = 3;

export function measureBackfill(catalogue: Catalogue | null, indexes: ArchiveIndex[], failures: FailureRow[],
  state: BackfillState | null = null): { catalogueCount: number; historyBacklog: number; backfill: BackfillStatus } {
  const archived = new Map(indexes.map(index => [index.scheme_code, index]));
  const failed = new Map(failures.map(failure => [failure.scheme_code, failure]));
  const known = new Map((catalogue?.entries ?? []).map(entry => [entry.schemeCode, entry.latestDate]));
  for (const index of indexes) if (!known.has(index.scheme_code)) known.set(index.scheme_code, index.coverage_end);
  let unattemptedCount = 0;
  let retryPendingCount = 0;
  let exhaustedCount = 0;
  let unresolvedSavedCount = 0;
  for (const [code, latest] of known) {
    const index = archived.get(code);
    const failure = failed.get(code);
    if (index) {
      if (index.unresolved || failure || (latest !== null && latest > index.coverage_end)) unresolvedSavedCount += 1;
    } else if (!failure) unattemptedCount += 1;
    else if (failure.attempts < BACKFILL_MAX_ATTEMPTS) retryPendingCount += 1;
    else exhaustedCount += 1;
  }
  const remainingCount = unattemptedCount + retryPendingCount;
  return { catalogueCount: known.size,
    historyBacklog: remainingCount + exhaustedCount + unresolvedSavedCount,
    backfill: { active: state?.active ?? false, attemptedCount: known.size - unattemptedCount,
      unattemptedCount, retryPendingCount, exhaustedCount, unresolvedSavedCount, remainingCount,
      maxAttempts: BACKFILL_MAX_ATTEMPTS, startedAt: state?.startedAt ?? null, completedAt: state?.completedAt ?? null } };
}

export function buildBackfillQueue(catalogue: Catalogue, indexes: ArchiveIndex[], failures: FailureRow[], now: number): QueueItem[] {
  const archived = new Set(indexes.map(index => index.scheme_code));
  const failed = new Map(failures.map(failure => [failure.scheme_code, failure]));
  const unseen: QueueItem[] = [];
  const retries: QueueItem[] = [];
  for (const entry of catalogue.entries) {
    if (archived.has(entry.schemeCode)) continue;
    const item = { code: entry.schemeCode, latestDate: entry.latestDate };
    const failure = failed.get(entry.schemeCode);
    if (!failure) unseen.push(item);
    else if (failure.attempts < BACKFILL_MAX_ATTEMPTS && failure.next_retry_at <= now) retries.push(item);
  }
  unseen.sort((a, b) => a.code - b.code);
  retries.sort((a, b) => failed.get(a.code)!.attempts - failed.get(b.code)!.attempts
    || failed.get(a.code)!.last_attempt_at.localeCompare(failed.get(b.code)!.last_attempt_at) || a.code - b.code);
  return [...unseen, ...retries];
}
