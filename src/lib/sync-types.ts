export interface BackfillStatus {
  active: boolean;
  attemptedCount: number;
  unattemptedCount: number;
  retryPendingCount: number;
  exhaustedCount: number;
  unresolvedSavedCount: number;
  remainingCount: number;
  maxAttempts: 3;
  startedAt: string | null;
  completedAt: string | null;
}
export interface SyncStatus {
  source: 'mfapi.in';
  catalogueCount: number;
  archivedCount: number;
  observationCount: number;
  historyBacklog: number;
  lastCatalogueSyncAt: string | null;
  latestNavDate: string | null;
  lastHistorySyncAt: string | null;
  lastRun: { id: string; status: 'running' | 'completed' | 'partial' | 'failed'; startedAt: string; finishedAt: string | null; processed: number; failed: number; error: string | null } | null;
  schedule: { timezone: string; times: string[] };
  backfill?: BackfillStatus;
  warnings: string[];
}
export interface ArchiveProvenance {
  fetchedAt: string;
  archivedAt: string;
  fromArchive: boolean;
  stale: boolean;
  coverageStart: string;
  coverageEnd: string;
  observationCount: number;
  warnings: string[];
  /** Complete original rejected zero-NAV dates, when the archive can establish them. */
  rejectedZeroNavDates?: string[];
}
export interface SyncProgress {
  runId: string;
  status: 'running' | 'completed' | 'partial' | 'failed';
  processed: number;
  failed: number;
  pending: number;
  catalogueCount: number;
  archivedCount: number;
}
