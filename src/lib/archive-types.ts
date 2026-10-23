/** Public, same-origin GitHub Pages archive contract. No credentials or Release API URLs. */
export interface PublicArchiveAsset {
  path: string;
  sha256: string;
  bytes: number;
  expandedBytes: number;
}

export interface ArchiveCounts {
  total: number;
  attempted: number;
  saved: number;
  clean: number;
  qualityIssues: number;
  sourceGaps: number;
  pending: number;
  refreshPending: number;
  bulkPassComplete: boolean;
  coverageComplete: boolean;
}

export interface ArchiveIssue {
  code: number;
  attempts: number;
  lastAttemptAt: string | null;
  message: string;
}

export interface ReadyArchiveManifest {
  version: 2;
  source: 'mfapi.in';
  status: 'ready';
  /** Collection permission/state at publication time, independent of saved history. */
  collectionEnabled: boolean;
  sequence: number;
  generatedAt: string;
  checkpointAt: string;
  catalogueFetchedAt: string;
  latestNavDate: string | null;
  counts: ArchiveCounts;
  catalogue: PublicArchiveAsset;
  /** Optional for backwards compatibility with older published checkpoints. */
  returns?: PublicArchiveAsset;
  /** floor(schemeCode / 32), independent of catalogue ordering. */
  shards: Record<string, PublicArchiveAsset>;
  issues: ArchiveIssue[];
  warnings: string[];
}

export interface UnavailableArchiveManifest {
  version: 2;
  source: 'mfapi.in';
  status: 'disabled' | 'not-started';
  generatedAt: string;
  message: string;
}

export type PublicArchiveManifest = ReadyArchiveManifest | UnavailableArchiveManifest;
