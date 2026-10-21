import type { ArchiveProvenance } from './sync-types.ts';

/** Optional server provenance is validated on both network and backup boundaries. */
export function validateArchiveProvenance(value: unknown): ArchiveProvenance | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid archive provenance.');
  const item = value as Record<string, unknown>;
  const timestamp = (entry: unknown): entry is string => typeof entry === 'string'
    && /^\d{4}-\d{2}-\d{2}T/.test(entry) && Number.isFinite(Date.parse(entry));
  const date = (entry: unknown): entry is string => typeof entry === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(entry) && Number.isFinite(Date.parse(entry))
    && new Date(entry).toISOString().slice(0, 10) === entry;
  if (!timestamp(item.fetchedAt) || !timestamp(item.archivedAt)
    || !date(item.coverageStart) || !date(item.coverageEnd) || item.coverageStart > item.coverageEnd
    || typeof item.fromArchive !== 'boolean' || typeof item.stale !== 'boolean'
    || !Number.isSafeInteger(item.observationCount) || Number(item.observationCount) < 1
    || !Array.isArray(item.warnings) || item.warnings.length > 100
    || item.warnings.some(warning => typeof warning !== 'string' || warning.length > 1000)) {
    throw new Error('Invalid archive provenance.');
  }
  return { fetchedAt: item.fetchedAt, archivedAt: item.archivedAt, fromArchive: item.fromArchive,
    stale: item.stale, coverageStart: item.coverageStart, coverageEnd: item.coverageEnd,
    observationCount: Number(item.observationCount), warnings: [...new Set(item.warnings as string[])] };
}
