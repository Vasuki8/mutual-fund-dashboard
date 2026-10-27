#!/usr/bin/env node
import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { buildCatalogue, mergeHistory, validateHistory } from '../server/validation.ts';
import type { Catalogue, HistoryDocument } from '../server/types.ts';
import { createGitHubStore, readLimited, type ArchiveStore } from './archive-store.ts';
import { isActiveRepairCandidate, REPAIR_NAV_WINDOW_DAYS, REPAIR_ROSTER_DATE } from './active-repair-scope.ts';
import { fetchVerifiedCatalogue, CatalogueIntegrityError } from './verified-catalogue.ts';
import { calculateCounts, isQualityWarning, needsRefresh, pendingState, sameNav, validateCatalogue,
  validateCheckpoint, validateHistoryShard, validateShardStates,
  type ArchiveCheckpoint, type ArchiveSchemeState, type HistoryShard } from './archive-model.ts';

const WORK_MS = 9 * 60_000;
const COMMIT_RESERVE_MS = 2 * 60_000;
const MAX_SOURCE_BYTES = 32 * 1024 * 1024;
const BACKOFF_MIN_MS = 15 * 60_000;
const BACKOFF_MAX_MS = 24 * 3600_000;
const HISTORICAL_ZERO_RECHECK_MS = 7 * 86400_000;
const RECENT_NAV_WINDOW_MS = 90 * 86400_000;

export function catalogueSlot(now: number): string {
  const date = new Date(now); const hour = date.getUTCHours();
  if (hour < 7) { date.setUTCDate(date.getUTCDate() - 1); date.setUTCHours(19, 0, 0, 0); }
  else date.setUTCHours(hour < 19 ? 7 : 19, 0, 0, 0);
  return date.toISOString();
}
function due(entry: Catalogue['entries'][number], state: ArchiveSchemeState, now: number): boolean {
  if (state.nextAttemptAt) {
    let retryAt = Date.parse(state.nextAttemptAt);
    if (state.status === 'source-error' && state.lastAttemptAt && hasRecentNav(entry, now)
      && ['source_history_empty', 'source_history_zero_nav_only'].includes(state.lastError ?? '')) {
      // Re-evaluate legacy weekly gaps without changing saved retry state.
      retryAt = Math.min(retryAt, Date.parse(state.lastAttemptAt) + failureBackoff(state.failures));
    }
    if (retryAt > now) return false;
  }
  return state.attempts === 0 || state.status === 'source-error' || state.quality || needsRefresh(entry, state, now);
}
function failureBackoff(failures: number): number {
  return Math.min(BACKOFF_MAX_MS, BACKOFF_MIN_MS * 2 ** Math.min(failures - 1, 10));
}
function hasRecentNav(entry: Catalogue['entries'][number], now: number): boolean {
  return entry.latestDate !== null
    && Date.parse(entry.latestDate + 'T00:00:00Z') >= now - RECENT_NAV_WINDOW_MS;
}
export function selectWork(catalogue: Catalogue, states: Record<string, ArchiveSchemeState>, now: number,
  maxSchemes = 512, maxShards = 16): Catalogue['entries'] {
  if (!Number.isInteger(maxSchemes) || maxSchemes < 1 || maxSchemes > 512
    || !Number.isInteger(maxShards) || maxShards < 1 || maxShards > 16) throw new Error('work_limits_invalid');
  const priority = (entry: Catalogue['entries'][number]) => {
    const state = states[entry.schemeCode];
    if (state.attempts === 0) return 0;
    const recent = hasRecentNav(entry, now);
    const behind = !!entry.latestDate && (!state.coverageEnd || entry.latestDate > state.coverageEnd
      || entry.latestDate === state.coverageEnd && !!entry.nav && !!state.latestNav && !sameNav(entry.nav, state.latestNav));
    const noHistory = state.observationCount === 0;
    // Due recent missing histories precede routine date lag; backoff still binds.
    if (recent && state.status === 'source-error' && noHistory) return 1;
    if (recent && behind) return 2;
    if (recent && (state.status === 'source-error' || state.quality)) return 3;
    if (recent) return 4;
    if (state.status === 'source-error' && noHistory) return 5;
    if (state.quality) return 6;
    if (state.status === 'source-error') return 7;
    if (behind) return 7;
    return 8;
  };
  const candidates = catalogue.entries.filter(entry => due(entry, states[entry.schemeCode], now)).sort((left, right) =>
    priority(left) - priority(right)
    || (states[left.schemeCode].lastAttemptAt ?? '').localeCompare(states[right.schemeCode].lastAttemptAt ?? '')
    || left.schemeCode - right.schemeCode);
  const buckets = new Set<string>(); const selected: Catalogue['entries'] = [];
  for (const entry of candidates) {
    const bucket = String(Math.floor(entry.schemeCode / 32));
    if (!buckets.has(bucket) && buckets.size === maxShards) continue;
    buckets.add(bucket); selected.push(entry);
    if (selected.length === maxSchemes) break;
  }
  return selected;
}
class SourceError extends Error {
  readonly retryAfterMs: number;
  readonly sourceWide: boolean;
  constructor(code: string, retryAfterMs = 0, sourceWide = false) {
    super(code); this.retryAfterMs = retryAfterMs; this.sourceWide = sourceWide;
  }
}
export function safeFailure(error: unknown): string {
  return error instanceof SourceError || error instanceof CatalogueIntegrityError ? error.message : 'source_unavailable';
}

/** Classify with safe codes; never persist arbitrary source errors or NAV rows. */
export function classifyInvalidHistory(raw: unknown): { code: string; recheckMs: number } {
  const generic = { code: 'source_history_invalid', recheckMs: 0 };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return generic;
  const body = raw as Record<string, unknown>;
  if (body.status !== 'SUCCESS') return { code: 'source_history_unsuccessful', recheckMs: 0 };
  if (!Array.isArray(body.data)) return generic;
  if (body.data.length === 0) return { code: 'source_history_empty', recheckMs: HISTORICAL_ZERO_RECHECK_MS };
  if (body.data.length > 100_000) return { code: 'source_history_oversize', recheckMs: 0 };
  const zero = (value: unknown): boolean => typeof value === 'string'
    && /^0+(?:\.0+)?$/.test(value.trim());
  if (body.data.every(row => row && typeof row === 'object' && !Array.isArray(row)
    && zero((row as Record<string, unknown>).nav))) {
    return { code: 'source_history_zero_nav_only', recheckMs: HISTORICAL_ZERO_RECHECK_MS };
  }
  return generic;
}
function retryAfter(value: string | null, now: number): number | null {
  if (value === null || !value.trim()) return null;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : Date.parse(value) - now;
  return Number.isFinite(delay) ? Math.min(7 * 86400_000, Math.max(0, delay)) : null;
}
export function createSource(options: { fetch?: typeof fetch; now?: () => number; deadline: number }) {
  const request = options.fetch ?? globalThis.fetch; const now = options.now ?? Date.now;
  return async (path: string, onStart?: () => void): Promise<unknown> => {
    const terminal = /^\/mf\?limit=1&offset=([1-9]\d{0,5})$/.exec(path);
    const allowed = path === '/mf' || /^\/mf\/(?:latest|[1-9]\d*)$/.test(path)
      || terminal !== null && Number(terminal[1]) <= 100_000;
    if (!allowed) throw new SourceError('source_path_invalid');
    for (let attempt = 0; attempt < 2; attempt++) {
      const remaining = options.deadline - now();
      if (remaining <= 0) throw new SourceError('source_deadline');
      const init: RequestInit = { redirect: 'error', credentials: 'omit',
        headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(Math.max(1, Math.min(12_000, remaining))) };
      // Count only an actual first request, not a deadline deferral.
      if (attempt === 0) onStart?.();
      let response: Response;
      try { response = await request(`https://api.mfapi.in${path}`, init); }
      catch {
        if (attempt === 0 && options.deadline - now() > 1000) { await sleep(500); continue; }
        throw new SourceError('source_transport');
      }
      if (!response.ok) {
        const retryHeader = response.headers.get('retry-after');
        const requestedDelay = retryAfter(retryHeader, now());
        const delay = requestedDelay ?? 500;
        const transient = [408, 425, 429, 500, 502, 503, 504].includes(response.status);
        await response.body?.cancel();
        if (response.status === 429) {
          throw new SourceError('source_http_429', requestedDelay && requestedDelay > 0 ? requestedDelay : BACKOFF_MIN_MS, true);
        }
        if (response.status === 503 && requestedDelay !== null && requestedDelay > 0) {
          throw new SourceError('source_http_503', requestedDelay, true);
        }
        if (attempt === 0 && transient && delay <= 5000 && now() + delay + 1000 < options.deadline) { await sleep(delay); continue; }
        throw new SourceError(`source_http_${response.status}`, transient ? delay : 0);
      }
      try { return JSON.parse(Buffer.from(await readLimited(response, MAX_SOURCE_BYTES)).toString('utf8')); }
      catch { throw new SourceError('source_payload_invalid'); }
    }
    throw new SourceError('source_unavailable');
  };
}
interface TrancheOptions {
  store: ArchiveStore;
  /** Production CLI always enables the 30-day official-roster repair policy. */
  activeRepairOnly?: boolean;
  /** Independently verify list membership; production CLI always enables this. */
  verifyCatalogueMembership?: boolean;
  /** Fence the prepared run before any source request. */
  expectedSequence?: number | null;
  /** Notify once immediately before the first actual request, never on deferral. */
  source?: (path: string, onStart?: () => void) => Promise<unknown>;
  now?: () => number;
  deadline?: number;
  reserveMs?: number;
  maxSchemes?: number;
  maxShards?: number;
  minCatalogueSize?: number;
  log?: (event: Record<string, unknown>) => void;
}
export interface TrancheResult {
  changed: boolean;
  sequence: number | null;
  attempted: number;
  firstAttempted: number;
  historiesAdded: number;
  /** Requires verified lower issue counts or more clean histories. */
  reconciliationAdvanced: boolean;
  deferred: number;
  counts: ArchiveCheckpoint['counts'] | null;
  lastCatalogueError: string | null;
  sourceRetryAt: string | null;
}
/** Compare unchanged catalogue sizes without adding overlapping backlogs. */
export function hasVerifiedReconciliationProgress(
  previous: ArchiveCheckpoint['counts'] | null | undefined,
  next: ArchiveCheckpoint['counts']): boolean {
  if (!previous || previous.total !== next.total) return false;
  return next.clean > previous.clean
    || next.qualityIssues < previous.qualityIssues
    || next.sourceGaps < previous.sourceGaps
    || next.refreshPending < previous.refreshPending;
}

export async function runTranche(options: TrancheOptions): Promise<TrancheResult> {
  const now = options.now ?? Date.now;
  const deadline = options.deadline ?? now() + WORK_MS;
  const reserve = options.reserveMs ?? COMMIT_RESERVE_MS;
  if (!Number.isFinite(deadline) || !Number.isFinite(reserve) || reserve < 0 || reserve >= WORK_MS) throw new Error('work_limits_invalid');
  if (options.activeRepairOnly !== undefined && typeof options.activeRepairOnly !== 'boolean') throw new Error('work_scope_invalid');
  if (options.verifyCatalogueMembership !== undefined && typeof options.verifyCatalogueMembership !== 'boolean') throw new Error('work_scope_invalid');
  const workDeadline = deadline - reserve;
  const source = options.source ?? createSource({ now, deadline: workDeadline });
  const log = options.log ?? (() => {});
  const previous = await options.store.loadSnapshot();
  if (options.expectedSequence !== undefined && (previous?.checkpoint.sequence ?? null) !== options.expectedSequence) {
    throw new Error('checkpoint_conflict');
  }
  let catalogue: Catalogue | null = previous?.catalogue ?? null;
  let catalogueRef = previous?.checkpoint.catalogue ?? null;
  let slot = previous?.checkpoint.catalogueSlot ?? catalogueSlot(now());
  let catalogueError = previous?.checkpoint.lastCatalogueError ?? null;
  let sourceRetryAt = previous?.checkpoint.sourceRetryAt ?? null;
  let changed = false;
  if (sourceRetryAt && Date.parse(sourceRetryAt) <= now()) { sourceRetryAt = null; changed = true; }
  const coolingDown = () => sourceRetryAt !== null && Date.parse(sourceRetryAt) > now();
  const applySourceCooldown = (error: unknown) => {
    if (error instanceof SourceError && error.sourceWide && error.retryAfterMs > 0) {
      const next = new Date(now() + error.retryAfterMs).toISOString();
      if (!sourceRetryAt || next > sourceRetryAt) { sourceRetryAt = next; changed = true; }
    }
  };
  const targetSlot = catalogueSlot(now());
  if ((!catalogue || slot < targetSlot || options.verifyCatalogueMembership && !catalogue.membership)
    && now() < workDeadline && !coolingDown()) {
    let catalogueWriteStarted = false;
    try {
      let next: Catalogue;
      if (options.verifyCatalogueMembership) {
        next = await fetchVerifiedCatalogue(source, catalogue, now, options.minCatalogueSize);
      } else {
        const raw = await source('/mf/latest');
        if (!Array.isArray(raw) || raw.length < (options.minCatalogueSize ?? 10_000) || raw.length > 100_000) throw new SourceError('source_catalogue_invalid');
        try { next = validateCatalogue(buildCatalogue(raw, catalogue, [], new Date(now()).toISOString())); }
        catch { throw new SourceError('source_catalogue_invalid'); }
      }
      catalogue = next; slot = targetSlot; catalogueError = null; changed = true;
      catalogueWriteStarted = true;
      catalogueRef = await options.store.writeJSON('catalogue', catalogue);
      if (catalogue.membership) log({ phase: 'catalogue_membership', ...catalogue.membership });
    } catch (error) {
      // Storage errors cannot publish a pointer to an unsaved catalogue.
      if (catalogueWriteStarted) throw error;
      catalogueError = safeFailure(error);
      applySourceCooldown(error);
      log({ phase: 'catalogue', outcome: 'failed', error: catalogueError, sourceRetryAt });
      if (!catalogue) throw error instanceof SourceError ? error : new SourceError(catalogueError);
      changed ||= catalogueError !== previous?.checkpoint.lastCatalogueError;
    }
  }
  if (!catalogue || !catalogueRef) return { changed: false, sequence: null, attempted: 0, firstAttempted: 0, historiesAdded: 0, reconciliationAdvanced: false, deferred: 0, counts: null,
    lastCatalogueError: catalogueError, sourceRetryAt };
  const states = structuredClone(previous?.checkpoint.states ?? {}) as Record<string, ArchiveSchemeState>;
  for (const entry of catalogue.entries) states[entry.schemeCode] ??= pendingState(entry.schemeCode);
  const shards = { ...previous?.checkpoint.shards };
  const selectionTime = now();
  // Filter requests, not the saved catalogue, histories or checkpoint state.
  const workCatalogue = options.activeRepairOnly
    ? { ...catalogue, entries: catalogue.entries.filter(entry => isActiveRepairCandidate(entry, selectionTime)) }
    : catalogue;
  const selected = selectWork(workCatalogue, states, selectionTime, options.maxSchemes, options.maxShards);
  if (options.activeRepairOnly) log({ phase: 'repair_scope', navRecencyDays: REPAIR_NAV_WINDOW_DAYS,
    asOfDate: new Date(selectionTime).toISOString().slice(0, 10), manualRosterDate: REPAIR_ROSTER_DATE,
    eligibleSchemes: workCatalogue.entries.length, excludedSchemes: catalogue.entries.length - workCatalogue.entries.length,
    selectedSchemes: selected.length });
  const loaded = new Map<string, HistoryShard>();
  const selectedBuckets = [...new Set(selected.map(entry => String(Math.floor(entry.schemeCode / 32))))];
  for (const bucket of selectedBuckets) {
    if (now() >= workDeadline || coolingDown()) break;
    if (shards[bucket]) {
      const shard = await options.store.readShard(shards[bucket], bucket);
      validateShardStates(shard, states); loaded.set(bucket, structuredClone(shard));
    } else loaded.set(bucket, { version: 2, bucket, records: [] });
  }
  let cursor = 0, attempted = 0, firstAttempted = 0;
  const changedBuckets = new Set<string>();
  await Promise.all(Array.from({ length: 2 }, async () => {
    for (;;) {
      if (now() >= workDeadline || coolingDown()) return;
      const entry = selected[cursor++]; if (!entry) return;
      // Recheck the actual clock after selection and shard reads.
      if (options.activeRepairOnly && !isActiveRepairCandidate(entry, now())) continue;
      const bucket = String(Math.floor(entry.schemeCode / 32));
      const shard = loaded.get(bucket); if (!shard) continue;
      const state = states[entry.schemeCode]; let started = false; let at = '';
      const onStart = () => {
        if (started) return;
        at = new Date(now()).toISOString(); started = true;
        if (state.attempts === 0) firstAttempted += 1;
        state.attempts += 1; state.lastAttemptAt = at; attempted += 1; changed = true;
      };
      try {
        const raw = await source(`/mf/${entry.schemeCode}`, onStart);
        if (!started) throw new Error('source_start_unreported');
        let parsed: ReturnType<typeof validateHistory>;
        try { parsed = validateHistory(raw, entry.schemeCode); }
        catch {
          const reason = classifyInvalidHistory(raw);
          throw new SourceError(reason.code, hasRecentNav(entry, now()) ? 0 : reason.recheckMs);
        }
        const previousDoc = shard.records.find(doc => doc.schemeCode === entry.schemeCode) ?? null;
        const document: HistoryDocument = mergeHistory(parsed, previousDoc, at, new Date(now()).toISOString(), entry.latestDate);
        document.unresolved ||= document.warnings.some(isQualityWarning);
        shard.records = [...shard.records.filter(doc => doc.schemeCode !== entry.schemeCode), document].sort((a, b) => a.schemeCode - b.schemeCode);
        changedBuckets.add(bucket);
        const failures = document.unresolved ? state.failures + 1 : 0;
        const backoff = failureBackoff(failures);
        states[entry.schemeCode] = { ...state, status: document.unresolved ? 'quality' : 'clean', failures,
          nextAttemptAt: document.unresolved ? new Date(now() + backoff).toISOString() : null,
          historyFetchedAt: document.fetchedAt, coverageStart: document.coverageStart, coverageEnd: document.coverageEnd,
          latestNav: document.payload.data[0].nav, observationCount: document.payload.data.length,
          quality: document.unresolved, warnings: document.warnings, lastError: null };
        log({ phase: 'scheme', code: entry.schemeCode, outcome: document.unresolved ? 'quality' : 'saved', observations: document.payload.data.length });
      } catch (error) {
        if (!started) {
          // Only a deadline before the first actual request is deferral.
          if (error instanceof SourceError && error.message === 'source_deadline') return;
          throw error;
        }
        applySourceCooldown(error);
        const failures = state.failures + 1;
        const backoff = Math.max(failureBackoff(failures),
          error instanceof SourceError ? error.retryAfterMs : 0);
        states[entry.schemeCode] = { ...state, status: 'source-error', failures,
          nextAttemptAt: new Date(now() + backoff).toISOString(), lastError: safeFailure(error) };
        log({ phase: 'scheme', code: entry.schemeCode, outcome: 'failed', error: states[entry.schemeCode].lastError });
      }
      if (!options.source && now() + 150 < workDeadline) await sleep(150);
    }
  }));
  if (!changed) return { changed: false, sequence: previous?.checkpoint.sequence ?? null, attempted: 0, firstAttempted: 0, historiesAdded: 0, reconciliationAdvanced: false,
    deferred: selected.length, counts: previous?.checkpoint.counts ?? null, lastCatalogueError: catalogueError, sourceRetryAt };
  for (const bucket of [...changedBuckets].sort((a, b) => Number(a) - Number(b))) {
    const shard = validateHistoryShard(loaded.get(bucket), bucket);
    validateShardStates(shard, states);
    shards[bucket] = await options.store.writeJSON(`history-${bucket}`, shard);
  }
  const updatedAt = new Date(now()).toISOString();
  const checkpoint: ArchiveCheckpoint = { version: 2, source: 'mfapi.in', sequence: (previous?.checkpoint.sequence ?? 0) + 1,
    updatedAt, catalogueFetchedAt: catalogue.fetchedAt, catalogueSlot: slot, catalogue: catalogueRef,
    shards, states, counts: calculateCounts(catalogue, states, Date.parse(updatedAt)), lastCatalogueError: catalogueError, sourceRetryAt };
  validateCheckpoint(checkpoint, catalogue);
  await options.store.commitCheckpoint(checkpoint, previous?.checkpoint.sequence ?? null);
  const saved = await options.store.loadSnapshot();
  if (!saved || JSON.stringify(saved.checkpoint) !== JSON.stringify(checkpoint)) throw new Error('checkpoint_readback_invalid');
  return { changed: true, sequence: checkpoint.sequence, attempted, firstAttempted,
    historiesAdded: checkpoint.counts.saved - (previous?.checkpoint.counts.saved ?? 0),
    reconciliationAdvanced: attempted > 0 && hasVerifiedReconciliationProgress(previous?.checkpoint.counts, checkpoint.counts),
    deferred: selected.length - attempted,
    counts: checkpoint.counts, lastCatalogueError: catalogueError, sourceRetryAt };
}

export function collectionEnabled(env: Record<string, string | undefined>): boolean {
  if (env.FUNDSCOPE_GITHUB_ARCHIVE_ENABLED !== 'true') return false;
  if (env.GITHUB_REPOSITORY !== 'Vasuki8/mutual-fund-dashboard') throw new Error('repository_not_authorized');
  if (env.GITHUB_REF !== 'refs/heads/main') throw new Error('branch_not_authorized');
  return true;
}
async function main(): Promise<void> {
  if (!collectionEnabled(process.env)) {
    process.stdout.write(JSON.stringify({ phase: 'disabled', changed: false }) + '\n');
    if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, 'changed=false\n');
    return;
  }
  const deadline = Date.now() + WORK_MS;
  const expected = process.env.EXPECTED_SEQUENCE;
  if (expected !== undefined && expected !== 'none' && (!/^[1-9]\d*$/.test(expected) || !Number.isSafeInteger(Number(expected)))) {
    throw new Error('expected_sequence_invalid');
  }
  const expectedSequence = expected === undefined ? undefined : expected === 'none' ? null : Number(expected);
  const store = createGitHubStore({ repository: process.env.GITHUB_REPOSITORY!, token: process.env.GITHUB_TOKEN ?? '', deadline,
    onRetry: event => process.stdout.write(JSON.stringify(event) + '\n') });
  // Production cannot disable the owner's active-only repair scope.
  const result = await runTranche({ store, deadline, expectedSequence, activeRepairOnly: true, verifyCatalogueMembership: true,
    log: event => process.stdout.write(JSON.stringify(event) + '\n') });
  process.stdout.write(JSON.stringify({ phase: 'verified', ...result }) + '\n');
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT,
    `changed=${result.changed}\nsequence=${result.sequence ?? ''}\nresult=${JSON.stringify(result)}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const counts = result.counts;
    const summary = ['## FundScope verified archive tranche', '',
      `Repair scope: official-roster, currently listed schemes with a positive NAV no more than ${REPAIR_NAV_WINDOW_DAYS} UTC calendar days old. Older histories remain stored, with their warnings unchanged.`, '',
      `Checkpoint: ${result.sequence ?? 'none'} · Source histories attempted in this tranche: ${result.attempted} · Deferred: ${result.deferred}.`, '',
      `First attempts: ${result.firstAttempted} · Newly saved histories: ${result.historiesAdded}.`, '',
      counts ? `Full retained archive (not the active repair queue): saved **${counts.saved} / ${counts.total}** histories; ${counts.pending} await a first attempt, ${counts.sourceGaps} have source failures, ${counts.qualityIssues} have saved quality issues, and ${counts.refreshPending} saved histories need refresh or follow-up.` : 'No catalogue or history checkpoint has been saved.', '',
      result.sourceRetryAt ? `Source requests are paused until ${result.sourceRetryAt}.` : '',
      counts?.coverageComplete ? 'All currently catalogued histories passed the saved checkpoint checks. This does not independently establish the completeness of MFAPI’s upstream history.' : 'Full data coverage is not verified. Source gaps remain visible.', ''].filter(Boolean).join('\n\n');
    await appendFile(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(async error => {
    const code = error instanceof Error && /^[a-z][a-z0-9_]{0,100}$/.test(error.message) ? error.message : 'unexpected_error';
    const sourceRetryAt = error instanceof SourceError && error.sourceWide ? new Date(Date.now() + error.retryAfterMs).toISOString() : null;
    process.stderr.write(JSON.stringify({ phase: 'failed', error: code, sourceRetryAt }) + '\n'); process.exitCode = 1;
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,
      `## FundScope archive run failed\n\nFailure: ${code}. Saved progress was not claimed by this run.\n\n${sourceRetryAt ? `MFAPI requested a pause until ${sourceRetryAt}. Before the first catalogue is saved, this cooldown can only be reported; no durable universe checkpoint exists yet.\n` : ''}`).catch(() => {});
  });
}
