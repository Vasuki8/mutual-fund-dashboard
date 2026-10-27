import type { Catalogue, HistoryDocument } from '../server/types.ts';
import { dateISO, scheme, validCode, validateHistory } from '../server/validation.ts';
import type { ArchiveCounts, ArchiveIssue } from '../src/lib/archive-types.ts';

export const RECONCILE_MS = 7 * 24 * 3600_000;
export const MAX_COMPRESSED_BYTES = 32 * 1024 * 1024;
export const MAX_SHARD_EXPANDED_BYTES = 64 * 1024 * 1024;
export const MAX_METADATA_EXPANDED_BYTES = 100 * 1024 * 1024;

export interface ArchiveAssetRef {
  id: number;
  releaseTag: string;
  name: string;
  url: string;
  sha256: string;
  bytes: number;
  expandedBytes: number;
}
export interface ArchiveSchemeState {
  code: number;
  status: 'pending' | 'clean' | 'quality' | 'source-error';
  attempts: number;
  failures: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  historyFetchedAt: string | null;
  coverageStart: string | null;
  coverageEnd: string | null;
  latestNav: string | null;
  observationCount: number;
  quality: boolean;
  warnings: string[];
  lastError: string | null;
}
export interface HistoryShard { version: 2; bucket: string; records: HistoryDocument[] }
export interface ArchiveCheckpoint {
  version: 2;
  source: 'mfapi.in';
  sequence: number;
  updatedAt: string;
  catalogueFetchedAt: string;
  catalogueSlot: string;
  catalogue: ArchiveAssetRef;
  shards: Record<string, ArchiveAssetRef>;
  states: Record<string, ArchiveSchemeState>;
  counts: ArchiveCounts;
  lastCatalogueError: string | null;
  sourceRetryAt: string | null;
}
export interface ArchiveSnapshot { checkpoint: ArchiveCheckpoint; catalogue: Catalogue }

function requireValue(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}
function record(value: unknown, code: string): Record<string, unknown> {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), code);
  return value as Record<string, unknown>;
}
export function timestamp(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
function isoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function integer(value: unknown, minimum = 0): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum;
}
function warningArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 100 && value.every(item => typeof item === 'string' && item.length <= 1000);
}
function safeError(value: unknown): value is string | null {
  return value === null || typeof value === 'string' && /^[a-z][a-z0-9_]{0,99}$/.test(value);
}
export function isQualityWarning(warning: string): boolean {
  return /^(Invalid NAV|Conflicting NAV|Unresolved discontinuity)/.test(warning);
}
export function sameNav(left: string, right: string): boolean {
  const normalize = (value: string) => {
    const [whole, fraction = ''] = value.split('.');
    return `${whole.replace(/^0+(?=\d)/, '')}.${fraction.replace(/0+$/, '')}`;
  };
  return normalize(left) === normalize(right);
}
export function validateAssetRef(value: unknown): ArchiveAssetRef {
  const item = record(value, 'asset_ref_invalid');
  requireValue(integer(item.id, 1) && typeof item.releaseTag === 'string'
    && /^fundscope-mfapi-v2-data-\d{6}$/.test(item.releaseTag)
    && typeof item.name === 'string' && /^(?:catalogue|checkpoint|history-\d+)-[a-f0-9]{64}\.json\.gz$/.test(item.name)
    && typeof item.sha256 === 'string' && /^[a-f0-9]{64}$/.test(item.sha256)
    && item.name.endsWith(`-${item.sha256}.json.gz`)
    && integer(item.bytes, 1) && item.bytes <= MAX_COMPRESSED_BYTES
    && integer(item.expandedBytes, 1) && item.expandedBytes <= MAX_METADATA_EXPANDED_BYTES
    && typeof item.url === 'string', 'asset_ref_invalid');
  const url = new URL(item.url);
  requireValue(url.origin === 'https://github.com' && !url.username && !url.password && !url.hash && !url.search
    && url.pathname.endsWith(`/releases/download/${item.releaseTag}/${item.name}`), 'asset_url_invalid');
  return item as unknown as ArchiveAssetRef;
}
export function validateCatalogue(value: unknown): Catalogue {
  const item = record(value, 'catalogue_invalid');
  requireValue(item.version === 1 && timestamp(item.fetchedAt) && Array.isArray(item.entries)
    && item.entries.length > 0 && item.entries.length <= 100_000 && warningArray(item.warnings), 'catalogue_invalid');
  const seen = new Set<number>();
  let previous = 0;
  let currentCount = 0;
  for (const raw of item.entries) {
    const entry = record(raw, 'catalogue_entry_invalid');
    const identity = scheme(entry);
    requireValue(!seen.has(identity.schemeCode) && identity.schemeCode > previous
      && (entry.latestDate === null || isoDate(entry.latestDate))
      && (entry.nav === null || typeof entry.nav === 'string' && entry.nav.length <= 128
        && /^\d+(?:\.\d+)?$/.test(entry.nav) && Number.isFinite(Number(entry.nav)) && Number(entry.nav) > 0)
      && typeof entry.current === 'boolean', 'catalogue_entry_invalid');
    seen.add(identity.schemeCode); previous = identity.schemeCode;
    if (entry.current) currentCount += 1;
  }
  if (item.membership !== undefined) {
    const membership = record(item.membership, 'catalogue_membership_invalid');
    requireValue(membership.source === 'mf-list' && timestamp(membership.verifiedAt)
      && membership.verifiedAt === item.fetchedAt
      && integer(membership.listedSchemes, 1) && membership.listedSchemes === currentCount
      && integer(membership.bulkNavSchemes, 1) && membership.bulkNavSchemes <= membership.listedSchemes
      && integer(membership.missingBulkNav)
      && membership.missingBulkNav === membership.listedSchemes - membership.bulkNavSchemes,
    'catalogue_membership_invalid');
  }
  return item as unknown as Catalogue;
}
export function validateHistoryShard(value: unknown, bucket: string): HistoryShard {
  const item = record(value, 'history_shard_invalid');
  requireValue(/^\d+$/.test(bucket) && String(Number(bucket)) === bucket && item.version === 2
    && item.bucket === bucket && Array.isArray(item.records) && item.records.length > 0 && item.records.length <= 32,
  'history_shard_invalid');
  const seen = new Set<number>();
  for (const raw of item.records) {
    const doc = record(raw, 'history_document_invalid');
    requireValue(doc.version === 1 && validCode(doc.schemeCode) && String(Math.floor(doc.schemeCode / 32)) === bucket
      && !seen.has(doc.schemeCode) && timestamp(doc.fetchedAt) && timestamp(doc.archivedAt)
      && doc.fetchedAt <= doc.archivedAt && typeof doc.unresolved === 'boolean' && warningArray(doc.warnings),
    'history_document_invalid');
    seen.add(doc.schemeCode);
    const parsed = validateHistory(doc.payload, doc.schemeCode);
    const payload = record(doc.payload, 'history_payload_invalid');
    requireValue(JSON.stringify(parsed.payload.data) === JSON.stringify(payload.data), 'history_observations_invalid');
    requireValue(doc.coverageStart === dateISO(parsed.payload.data.at(-1)!.date)
      && doc.coverageEnd === dateISO(parsed.payload.data[0].date), 'history_coverage_invalid');
    requireValue(![...parsed.warnings, ...doc.warnings].some(isQualityWarning) || doc.unresolved, 'history_quality_invalid');
  }
  return item as unknown as HistoryShard;
}
export function pendingState(code: number): ArchiveSchemeState {
  return { code, status: 'pending', attempts: 0, failures: 0, lastAttemptAt: null, nextAttemptAt: null,
    historyFetchedAt: null, coverageStart: null, coverageEnd: null, latestNav: null, observationCount: 0,
    quality: false, warnings: [], lastError: null };
}
function validateState(value: unknown, code: number): ArchiveSchemeState {
  const state = record(value, 'scheme_state_invalid');
  const hasHistory = integer(state.observationCount, 1);
  requireValue(state.code === code && ['pending', 'clean', 'quality', 'source-error'].includes(String(state.status))
    && integer(state.attempts) && integer(state.failures) && state.failures <= state.attempts
    && integer(state.observationCount) && state.observationCount <= 100_000
    && typeof state.quality === 'boolean' && warningArray(state.warnings) && safeError(state.lastError)
    && (state.nextAttemptAt === null || timestamp(state.nextAttemptAt)), 'scheme_state_invalid');
  requireValue(state.attempts === 0 ? state.status === 'pending' && state.lastAttemptAt === null
    && !hasHistory && state.failures === 0 && state.nextAttemptAt === null && state.lastError === null
    : state.status !== 'pending' && timestamp(state.lastAttemptAt), 'scheme_attempts_invalid');
  requireValue(hasHistory ? timestamp(state.historyFetchedAt) && isoDate(state.coverageStart)
    && isoDate(state.coverageEnd) && state.coverageStart <= state.coverageEnd
    && typeof state.latestNav === 'string' && state.latestNav.length <= 128 && /^\d+(?:\.\d+)?$/.test(state.latestNav)
    && Number.isFinite(Number(state.latestNav)) && Number(state.latestNav) > 0
    && timestamp(state.lastAttemptAt) && state.historyFetchedAt <= state.lastAttemptAt
    : state.historyFetchedAt === null && state.coverageStart === null && state.coverageEnd === null && state.latestNav === null
      && state.quality === false && state.warnings.length === 0, 'scheme_history_invalid');
  requireValue(state.status === 'clean' ? hasHistory && !state.quality && state.lastError === null
    && state.failures === 0 && state.nextAttemptAt === null
    : state.status === 'quality' ? hasHistory && state.quality && state.lastError === null && state.failures > 0
      && timestamp(state.nextAttemptAt)
      : state.status === 'source-error' ? state.lastError !== null && state.failures > 0 && timestamp(state.nextAttemptAt)
        : true, 'scheme_outcome_invalid');
  requireValue(!state.warnings.some(isQualityWarning) || state.quality, 'scheme_quality_invalid');
  return state as unknown as ArchiveSchemeState;
}
export function needsRefresh(entry: Catalogue['entries'][number], state: ArchiveSchemeState, asOf: number): boolean {
  return state.observationCount > 0 && (state.quality || state.status === 'source-error'
    || !!entry.latestDate && state.coverageEnd! < entry.latestDate
    || entry.latestDate === state.coverageEnd && !!entry.nav && !!state.latestNav && !sameNav(entry.nav, state.latestNav)
    || asOf - Date.parse(state.historyFetchedAt!) >= RECONCILE_MS);
}
export function calculateCounts(catalogue: Catalogue, states: Record<string, ArchiveSchemeState>, asOf: number): ArchiveCounts {
  let attempted = 0, saved = 0, qualityIssues = 0, sourceGaps = 0, pending = 0, refreshPending = 0;
  for (const entry of catalogue.entries) {
    const state = states[entry.schemeCode];
    requireValue(!!state, 'scheme_state_missing');
    if (state.attempts > 0) attempted += 1; else pending += 1;
    if (state.observationCount > 0) saved += 1;
    if (state.quality) qualityIssues += 1;
    if (state.status === 'source-error') sourceGaps += 1;
    if (needsRefresh(entry, state, asOf)) refreshPending += 1;
  }
  const total = catalogue.entries.length;
  return { total, attempted, saved, clean: saved - qualityIssues, qualityIssues, sourceGaps, pending, refreshPending,
    bulkPassComplete: total > 0 && attempted === total,
    coverageComplete: total > 0 && saved === total && !pending && !qualityIssues && !sourceGaps && !refreshPending };
}
export function archiveIssues(states: Record<string, ArchiveSchemeState>, limit = 100): ArchiveIssue[] {
  return Object.values(states).filter(state => state.status === 'source-error' || state.quality)
    .sort((a, b) => a.code - b.code).slice(0, limit).map(state => ({ code: state.code, attempts: state.attempts,
      lastAttemptAt: state.lastAttemptAt,
      message: state.lastError ? `MFAPI history could not be refreshed (${state.lastError}).`
        : state.warnings.join(' ').slice(0, 1000) || 'Saved history requires source-quality follow-up.' }));
}
export function validateCheckpoint(value: unknown, catalogueValue: unknown): ArchiveCheckpoint {
  const item = record(value, 'checkpoint_invalid');
  const catalogue = validateCatalogue(catalogueValue);
  requireValue(item.version === 2 && item.source === 'mfapi.in' && integer(item.sequence, 1)
    && timestamp(item.updatedAt) && item.catalogueFetchedAt === catalogue.fetchedAt
    && timestamp(item.catalogueSlot) && item.catalogueSlot <= item.catalogueFetchedAt
    && item.catalogueFetchedAt <= item.updatedAt && safeError(item.lastCatalogueError)
    && (item.sourceRetryAt === null || timestamp(item.sourceRetryAt)), 'checkpoint_invalid');
  validateAssetRef(item.catalogue);
  const states = record(item.states, 'checkpoint_states_invalid');
  const shards = record(item.shards, 'checkpoint_shards_invalid');
  requireValue(Object.keys(states).length === catalogue.entries.length, 'checkpoint_state_count_invalid');
  const expectedBuckets = new Set<string>();
  for (const entry of catalogue.entries) {
    const state = validateState(states[entry.schemeCode], entry.schemeCode);
    requireValue(!state.lastAttemptAt || state.lastAttemptAt <= item.updatedAt, 'checkpoint_attempt_time_invalid');
    if (state.observationCount) expectedBuckets.add(String(Math.floor(entry.schemeCode / 32)));
  }
  requireValue(Object.keys(shards).length === expectedBuckets.size, 'checkpoint_shard_count_invalid');
  for (const [bucket, ref] of Object.entries(shards)) {
    requireValue(expectedBuckets.has(bucket), 'checkpoint_shard_invalid');
    const parsed = validateAssetRef(ref);
    requireValue(parsed.name.startsWith(`history-${bucket}-`) && parsed.expandedBytes <= MAX_SHARD_EXPANDED_BYTES,
      'checkpoint_shard_invalid');
  }
  const expected = calculateCounts(catalogue, states as Record<string, ArchiveSchemeState>, Date.parse(item.updatedAt));
  const counts = record(item.counts, 'checkpoint_counts_invalid');
  requireValue(Object.keys(counts).length === Object.keys(expected).length
    && Object.entries(expected).every(([key, value]) => counts[key] === value), 'checkpoint_counts_invalid');
  return item as unknown as ArchiveCheckpoint;
}
export function validateShardStates(shard: HistoryShard, states: Record<string, ArchiveSchemeState>): void {
  const expected = Object.values(states).filter(state => state.observationCount > 0
    && String(Math.floor(state.code / 32)) === shard.bucket);
  requireValue(expected.length === shard.records.length, 'shard_state_count_invalid');
  for (const doc of shard.records) {
    const state = states[doc.schemeCode];
    requireValue(!!state && state.observationCount === doc.payload.data.length
      && state.coverageStart === doc.coverageStart && state.coverageEnd === doc.coverageEnd
      && state.latestNav === doc.payload.data[0].nav
      && state.historyFetchedAt === doc.fetchedAt && state.quality === doc.unresolved
      && JSON.stringify(state.warnings) === JSON.stringify(doc.warnings), 'shard_state_mismatch');
  }
}
