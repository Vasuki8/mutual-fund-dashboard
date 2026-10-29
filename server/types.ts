import type { Scheme } from '../src/lib/types.ts';

export interface ArchiveBindings {
  DB: D1Database;
  BUCKET: R2Bucket;
  FUNDSCOPE_SYNC_TOKEN?: string;
}

export interface RuntimeOptions {
  fetch?: typeof fetch;
  now?: () => Date;
  sleep?: (milliseconds: number) => Promise<void>;
}

export interface Runtime {
  fetch: typeof fetch;
  now: () => Date;
  sleep: (milliseconds: number) => Promise<void>;
}

export interface RawNav { date: string; nav: string }
export interface ProviderHistory {
  status: 'SUCCESS';
  meta: { scheme_code: number; scheme_name: string; fund_house: string; scheme_type: string; scheme_category: string;
    isin_growth?: string | null; isin_div_reinvestment?: string | null };
  data: RawNav[];
}

export interface HistoryDocument {
  version: 1;
  schemeCode: number;
  payload: ProviderHistory;
  fetchedAt: string;
  archivedAt: string;
  coverageStart: string;
  coverageEnd: string;
  unresolved: boolean;
  warnings: string[];
  /** Complete rejected zero-NAV dates from a qualifying raw response; absent means unknown. */
  rejectedZeroNavDates?: string[];
}

export interface ArchiveIndex {
  scheme_code: number;
  scheme_name: string;
  object_key: string;
  version: number;
  fetched_at: string;
  archived_at: string;
  coverage_start: string;
  coverage_end: string;
  observation_count: number;
  unresolved: number;
}

export interface CatalogueEntry extends Scheme {
  latestDate: string | null;
  nav: string | null;
  current: boolean;
}

export interface Catalogue {
  version: 1;
  fetchedAt: string;
  entries: CatalogueEntry[];
  warnings: string[];
  /** Listing verification time is not a new NAV observation date. */
  membership?: {
    source: 'mf-list';
    verifiedAt: string;
    listedSchemes: number;
    bulkNavSchemes: number;
    missingBulkNav: number;
  };
}

export interface CatalogueState {
  key: string;
  latestKey: string;
  catalogueCount: number;
  latestNavDate: string | null;
  fetchedAt: string;
  runId: string;
}

export interface QueueItem { code: number; latestDate: string | null }
export type SyncMode = 'refresh' | 'backfill';
export interface WorkQueue { version: 1; runId: string; mode?: SyncMode; items: QueueItem[] }
export interface BackfillState {
  version: 1;
  active: boolean;
  startedAt: string;
  completedAt: string | null;
  latestRunId: string;
}

export interface RunRow {
  id: string;
  status: 'running' | 'completed' | 'partial' | 'failed';
  started_at: string;
  finished_at: string | null;
  processed: number;
  failed: number;
  cursor: number;
  total: number;
  catalogue_count: number;
  queue_key: string;
  error: string | null;
}

export interface FailureRow {
  scheme_code: number;
  run_id: string | null;
  attempts: number;
  error: string;
  last_attempt_at: string;
  next_retry_at: number;
}

export class ApiError extends Error {
  status: number;
  retryAfter: number | null;
  constructor(message: string, status = 502, retryAfter: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
}
