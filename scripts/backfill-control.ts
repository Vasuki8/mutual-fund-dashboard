#!/usr/bin/env node
import { appendFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
import { createGitHubStore, readLimited, type ArchiveStore } from './archive-store.ts';
import { calculateCounts, type ArchiveCheckpoint, type ArchiveAssetRef, type ArchiveSnapshot } from './archive-model.ts';
import { hasVerifiedReconciliationProgress, type TrancheResult } from './github-history-v2.ts';
import { isActiveRepairCandidate } from './active-repair-scope.ts';

const REPOSITORY = 'Vasuki8/mutual-fund-dashboard';
const WORKFLOW = '.github/workflows/github-history.yml';
const MANIFEST = 'https://vasuki8.github.io/mutual-fund-dashboard/archive/manifest.json';
const MAX_RUNS = 12, WINDOW_MS = 4 * 3600_000, PACE_MS = 15 * 60_000, WORK_MS = 9 * 60_000;
// A successor can start before the parent's dispatching job has closed its workflow.
const LINEAGE_WAIT_MS = 3 * 60_000, LINEAGE_POLL_MS = 15_000;
const MAX_JSON_BYTES = 4 * 1024 * 1024;
type Environment = Record<string, string | undefined>;
interface Options {
  env: Environment; store: Pick<ArchiveStore, 'loadSnapshot'>; fetch?: typeof fetch;
  now?: () => number; sleep?: (ms: number) => Promise<unknown>; log?: (event: Record<string, unknown>) => void;
}
export interface BackfillContext {
  rootRunId: string; parentRunId: string | null; position: number; deadline: string;
  runId: string; runAttempt: number; startingSequence: number | null;
}
interface Prepared { collect: boolean; context: BackfillContext | null; expectedSequence: number | null; reason: string }
interface Continued { dispatched: boolean; reason: string; childRunId?: number }
type Metadata = Record<string, unknown>;
function requireValue(condition: unknown, code: string): asserts condition { if (!condition) throw new Error(code); }
function object(value: unknown): Record<string, unknown> {
  requireValue(!!value && typeof value === 'object' && !Array.isArray(value), 'backfill_object_invalid');
  return value as Record<string, unknown>;
}
function positive(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) > 0; }
function inputNumber(value: unknown): number {
  requireValue(typeof value === 'string' && /^[1-9]\d*$/.test(value) && positive(Number(value)), 'backfill_input_invalid');
  return Number(value);
}
function instant(value: unknown): number {
  requireValue(typeof value === 'string' && Number.isFinite(Date.parse(value)), 'backfill_time_invalid');
  return Date.parse(value);
}
function enabled(env: Environment): boolean {
  if (env.FUNDSCOPE_GITHUB_ARCHIVE_ENABLED !== 'true') return false;
  requireValue(env.GITHUB_REPOSITORY === REPOSITORY && env.GITHUB_REF === 'refs/heads/main', 'backfill_repository_or_ref_invalid');
  requireValue(!!env.GITHUB_TOKEN, 'github_token_missing'); return true;
}
function title(root: string, position: number): string { return `FundScope archive · ${root} · ${position}/${MAX_RUNS}`; }
function transport(options: Options) {
  const request = options.fetch ?? globalThis.fetch;
  const headers = { Authorization: `Bearer ${options.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28' };
  const json = async (response: Response) => JSON.parse(Buffer.from(await readLimited(response, MAX_JSON_BYTES)).toString('utf8')) as unknown;
  return { request, json, github: (path: string, init: RequestInit = {}) => request(`https://api.github.com/repos/${REPOSITORY}${path}`,
    { ...init, redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(30_000),
      headers: { ...headers, ...(init.headers ?? {}) } }) };
}
function metadata(value: unknown, id: string, workflowId?: unknown): Metadata {
  const run = object(value);
  requireValue(String(run.id) === id && positive(run.workflow_id) && (!workflowId || run.workflow_id === workflowId)
    && run.path === WORKFLOW && run.head_branch === 'main' && object(run.repository).full_name === REPOSITORY
    && positive(run.run_attempt), 'backfill_run_identity_invalid');
  instant(run.created_at); return run;
}
function inputs(raw: string | undefined, event: unknown): Record<string, string> | null {
  const parsed: unknown = raw?.trim() ? JSON.parse(raw) : null;
  if (parsed === null) { requireValue(event !== 'workflow_dispatch', 'backfill_inputs_missing'); return null; }
  const values = object(parsed); const names = ['root_run_id', 'parent_run_id', 'chain_position', 'expected_sequence'];
  requireValue(Object.keys(values).every(key => names.includes(key))
    && Object.values(values).every(value => typeof value === 'string'), 'backfill_inputs_invalid');
  if (names.every(key => values[key] === undefined || values[key] === '')) return null;
  for (const key of names) inputNumber(values[key]);
  return values as Record<string, string>;
}
function pause(checkpoint: ArchiveCheckpoint | undefined, now: number): boolean {
  return !!checkpoint?.sourceRetryAt && instant(checkpoint.sourceRetryAt) > now;
}
function wakeAt(checkpoint: ArchiveCheckpoint | undefined, now: number): number {
  return Math.max(now, checkpoint ? instant(checkpoint.updatedAt) + PACE_MS : now);
}

export async function prepareBackfill(options: Options): Promise<Prepared> {
  const now = options.now ?? Date.now; const wait = options.sleep ?? sleep; const log = options.log ?? (() => {});
  let context: BackfillContext | null = null;
  const finish = (collect: boolean, reason: string): Prepared => {
    log({ phase: 'backfill_prepare', ...context, collect, reason });
    return { collect, context, expectedSequence: context?.startingSequence ?? null, reason };
  };
  if (!enabled(options.env)) return finish(false, 'disabled');
  const runId = String(inputNumber(options.env.GITHUB_RUN_ID)); const runAttempt = inputNumber(options.env.GITHUB_RUN_ATTEMPT);
  const api = transport(options); const cache = new Map<string, Metadata>();
  const loadRun = async (id: string, workflowId?: unknown, refresh = false) => {
    if (refresh || !cache.has(id)) { const response = await api.github(`/actions/runs/${id}`);
      requireValue(response.ok, `github_run_http_${response.status}`); cache.set(id, metadata(await api.json(response), id, workflowId)); }
    return metadata(cache.get(id), id, workflowId);
  };
  const current = await loadRun(runId);
  // GitHub's workflow-level REST status can remain "queued" while this archive
  // job is already executing (other dependent jobs have not started yet).
  // Validate identity, attempt and absence of a conclusion; do not require
  // the workflow-level status to have caught up with the running job.
  log({ phase: 'backfill_current_run_status', runId, runAttempt, apiStatus: current.status,
    apiConclusion: current.conclusion });
  requireValue(['queued', 'in_progress'].includes(String(current.status))
    && current.conclusion === null && current.run_attempt === runAttempt,
    'backfill_current_run_invalid');
  const provided = inputs(options.env.BACKFILL_INPUTS, current.event);
  const rootRunId = provided?.root_run_id ?? runId; const parentRunId = provided?.parent_run_id ?? null;
  const position = provided ? inputNumber(provided.chain_position) : 1;
  requireValue(current.display_title === title(rootRunId, position), 'backfill_current_title_invalid');
  let root = current;
  if (provided) {
    requireValue(current.event === 'workflow_dispatch' && position >= 2 && position <= MAX_RUNS
      && rootRunId !== runId && parentRunId !== runId && (position !== 2 || parentRunId === rootRunId), 'backfill_lineage_invalid');
    // The continuing parent dispatches a successor *before* its own final job
    // exits. GitHub may start the child and still report the parent as running.
    // Wait only for the specific, correctly identified first-attempt ancestor;
    // never collect on an unfinished, failed or cancelled parent.
    const lineageDeadline = now() + LINEAGE_WAIT_MS;
    const successfulAncestor = async (id: string, expectedTitle: string, events: string[], failure: string) => {
      let ancestor = await loadRun(id, current.workflow_id);
      while (true) {
        log({ phase: 'backfill_ancestor_observed', runId, ancestorId: id,
          role: id === rootRunId ? 'root' : 'parent', expectedTitle, observedTitle: ancestor.display_title,
          runAttempt: ancestor.run_attempt, event: ancestor.event, status: ancestor.status, conclusion: ancestor.conclusion });
        requireValue(ancestor.run_attempt === 1 && ancestor.display_title === expectedTitle
          && events.includes(String(ancestor.event)), failure);
        if (ancestor.status === 'completed' && ancestor.conclusion !== null) {
          requireValue(ancestor.conclusion === 'success', failure);
          return ancestor;
        }
        requireValue(['queued', 'in_progress', 'completed'].includes(String(ancestor.status))
          && ancestor.conclusion === null, failure);
        const remaining = lineageDeadline - now();
        requireValue(remaining > 0, failure + '_timeout');
        log({ phase: 'backfill_lineage_wait', runId, ancestorId: id,
          ancestorStatus: ancestor.status, position, remainingMs: remaining });
        await wait(Math.min(LINEAGE_POLL_MS, remaining));
        ancestor = await loadRun(id, current.workflow_id, true);
      }
    };
    root = await successfulAncestor(rootRunId, title(rootRunId, 1),
      ['schedule', 'push', 'workflow_dispatch'], 'backfill_root_invalid');
    const parent = parentRunId === rootRunId ? root : await successfulAncestor(parentRunId!,
      title(rootRunId, position - 1), ['workflow_dispatch'], 'backfill_parent_invalid');
    requireValue(instant(root.created_at) <= instant(parent.created_at)
      && instant(parent.created_at) <= instant(current.created_at), 'backfill_lineage_time_invalid');
  } else requireValue(['schedule', 'push', 'workflow_dispatch'].includes(String(current.event)), 'backfill_root_event_invalid');
  requireValue(instant(root.created_at) <= now(), 'backfill_root_time_invalid');
  const deadline = instant(root.created_at) + WINDOW_MS;
  const snapshot = await options.store.loadSnapshot(); const checkpoint = snapshot?.checkpoint;
  context = { rootRunId, parentRunId, position, deadline: new Date(deadline).toISOString(), runId, runAttempt,
    startingSequence: checkpoint?.sequence ?? null };
  if (provided && checkpoint?.sequence !== inputNumber(provided.expected_sequence)) return finish(false, 'checkpoint_sequence_changed');
  if (pause(checkpoint, now())) return finish(false, 'source_paused');
  const wake = wakeAt(checkpoint, now());
  if (wake - now() > PACE_MS) return finish(false, 'checkpoint_time_in_future');
  if (wake + WORK_MS > deadline) return finish(false, 'chain_window_exhausted');
  if (wake > now()) log({ phase: 'backfill_wait', ...context, wakeAt: new Date(wake).toISOString() });
  while (now() < wake) await wait(Math.min(60_000, wake - now()));
  // A fresh read prevents a stale input or an intervening writer from entering the collector.
  const latest = await options.store.loadSnapshot();
  if ((latest?.checkpoint.sequence ?? null) !== context.startingSequence) return finish(false, 'checkpoint_changed_during_wait');
  if (pause(latest?.checkpoint, now())) return finish(false, 'source_paused');
  if (wakeAt(latest?.checkpoint, now()) > now()) return finish(false, 'checkpoint_changed_during_wait');
  if (now() + WORK_MS > deadline) return finish(false, 'chain_window_exhausted');
  return finish(true, 'ready');
}

function continuationContext(raw: unknown, env: Environment, now: number): BackfillContext {
  const value = object(raw); const runId = String(inputNumber(env.GITHUB_RUN_ID)); const actualAttempt = inputNumber(env.GITHUB_RUN_ATTEMPT);
  inputNumber(value.rootRunId); inputNumber(value.runId);
  requireValue(value.runId === runId && positive(value.runAttempt) && value.runAttempt <= actualAttempt
    && positive(value.position) && value.position <= MAX_RUNS
    && (value.startingSequence === null || positive(value.startingSequence))
    && instant(value.deadline) <= now + WINDOW_MS, 'backfill_context_invalid');
  if (value.position === 1) requireValue(value.rootRunId === runId && value.parentRunId === null, 'backfill_context_invalid');
  else { inputNumber(value.parentRunId); requireValue(value.rootRunId !== runId && value.parentRunId !== runId, 'backfill_context_invalid'); }
  return value as unknown as BackfillContext;
}
function trancheResult(raw: unknown): TrancheResult {
  const value = object(raw);
  for (const key of ['attempted', 'firstAttempted', 'historiesAdded', 'deferred']) {
    requireValue(Number.isSafeInteger(value[key]) && Number(value[key]) >= 0 && Number(value[key]) <= 512, 'backfill_result_invalid');
  }
  requireValue(typeof value.changed === 'boolean' && typeof value.reconciliationAdvanced === 'boolean'
    && Number(value.firstAttempted) <= Number(value.attempted)
    && Number(value.historiesAdded) <= Number(value.attempted)
    && (value.changed || value.attempted === 0 && value.firstAttempted === 0 && value.historiesAdded === 0)
    && (value.changed && Number(value.attempted) > 0 || value.reconciliationAdvanced === false), 'backfill_result_invalid');
  return value as unknown as TrancheResult;
}
function activeRepairCounts(result: TrancheResult, snapshot: ArchiveSnapshot, now: number): ArchiveCheckpoint['counts'] | null {
  if (result.activeRepairProgress === undefined) return null;
  const progress = object(result.activeRepairProgress);
  requireValue(progress.asOf === snapshot.checkpoint.updatedAt && instant(progress.asOf) <= now,
    'backfill_repair_progress_time_invalid');
  const asOf = instant(progress.asOf);
  const eligible = { ...snapshot.catalogue,
    entries: snapshot.catalogue.entries.filter(entry => isActiveRepairCandidate(entry, asOf)) };
  const after = calculateCounts(eligible, snapshot.checkpoint.states, asOf);
  requireValue(isDeepStrictEqual(progress.after, after), 'backfill_repair_progress_counts_mismatch');
  const rawBefore = object(progress.before);
  const keys = Object.keys(after) as (keyof typeof after)[];
  requireValue(Object.keys(rawBefore).length === keys.length && keys.every(key => typeof after[key] === 'number'
    ? Number.isSafeInteger(rawBefore[key]) && Number(rawBefore[key]) >= 0 && Number(rawBefore[key]) <= after.total
    : typeof rawBefore[key] === 'boolean'), 'backfill_repair_progress_invalid');
  const before = rawBefore as unknown as typeof after;
  requireValue(before.total === after.total && before.attempted + before.pending === before.total
    && before.saved <= before.attempted && before.clean + before.qualityIssues === before.saved
    && before.sourceGaps <= before.attempted && before.refreshPending <= before.saved
    && before.bulkPassComplete === (before.total > 0 && before.attempted === before.total)
    && before.coverageComplete === (before.total > 0 && before.saved === before.total
      && !before.pending && !before.qualityIssues && !before.sourceGaps && !before.refreshPending)
    && after.attempted >= before.attempted && after.attempted - before.attempted <= result.firstAttempted
    && after.saved >= before.saved && after.saved - before.saved <= result.historiesAdded
    && keys.every(key => typeof after[key] !== 'number'
      || Math.abs(Number(after[key]) - Number(before[key])) <= result.attempted)
    && result.reconciliationAdvanced === (result.attempted > 0 && hasVerifiedReconciliationProgress(before, after)),
  'backfill_repair_progress_invalid');
  return after;
}
function published(raw: unknown, checkpoint: ArchiveCheckpoint): boolean {
  try {
    const value = object(raw); const shards = object(value.shards);
    const matches = (candidate: unknown, ref: ArchiveAssetRef) => isDeepStrictEqual(candidate,
      { path: `archive/${ref.name}`, sha256: ref.sha256, bytes: ref.bytes, expandedBytes: ref.expandedBytes });
    return value.version === 2 && value.source === 'mfapi.in' && value.status === 'ready' && value.collectionEnabled === true
      && value.sequence === checkpoint.sequence && value.checkpointAt === checkpoint.updatedAt
      && isDeepStrictEqual(value.counts, checkpoint.counts) && matches(value.catalogue, checkpoint.catalogue)
      && Object.keys(shards).length === Object.keys(checkpoint.shards).length
      && Object.entries(checkpoint.shards).every(([bucket, ref]) => matches(shards[bucket], ref));
  } catch { return false; }
}

export async function continueBackfill(options: Options & { context: unknown; result: unknown }): Promise<Continued> {
  const now = options.now ?? Date.now; const wait = options.sleep ?? sleep; const log = options.log ?? (() => {});
  if (!enabled(options.env)) return { dispatched: false, reason: 'disabled' };
  const context = continuationContext(options.context, options.env, now()); const result = trancheResult(options.result);
  let repairCounts: ArchiveCheckpoint['counts'] | null = null;
  const finish = (reason: string, childRunId?: number): Continued => {
    const dispatched = reason === 'dispatched'; log({ phase: 'backfill_continue', ...context, reason, dispatched,
      sequence: result.sequence, counts: result.counts, firstAttempted: result.firstAttempted, historiesAdded: result.historiesAdded,
      reconciliationAdvanced: result.reconciliationAdvanced,
      ...(repairCounts ? { activeRepairCounts: repairCounts } : {}),
      ...(childRunId ? { childRunId } : {}) });
    return { dispatched, reason, ...(childRunId ? { childRunId } : {}) };
  };
  const snapshot = await options.store.loadSnapshot(); const checkpoint = snapshot?.checkpoint;
  if (!checkpoint) {
    requireValue(!result.changed && context.startingSequence === null && result.sequence === null && result.counts === null,
      'backfill_checkpoint_missing'); return finish('no_checkpoint');
  }
  requireValue(result.sequence === checkpoint.sequence && isDeepStrictEqual(result.counts, checkpoint.counts)
    && result.sourceRetryAt === checkpoint.sourceRetryAt && result.lastCatalogueError === checkpoint.lastCatalogueError
    && checkpoint.sequence === (context.startingSequence ?? 0) + (result.changed ? 1 : 0), 'backfill_checkpoint_mismatch');
  repairCounts = activeRepairCounts(result, snapshot, now());
  const api = transport(options); let verified = false;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const response = await api.request(`${MANIFEST}?backfill_run=${context.runId}&attempt=${attempt + 1}&at=${now()}`,
        { redirect: 'error', credentials: 'omit', headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
          signal: AbortSignal.timeout(15_000) });
      if (response.ok && published(await api.json(response), checkpoint)) { verified = true; break; }
      if (!response.ok) await response.body?.cancel();
    } catch { /* A bounded read retry may observe the newly published deployment. */ }
    if (attempt < 5) await wait(10_000);
  }
  requireValue(verified, 'published_checkpoint_not_verified');
  log({ phase: 'backfill_publication_verified', ...context, sequence: checkpoint.sequence,
    checkpointAt: checkpoint.updatedAt, counts: checkpoint.counts });
  if (inputNumber(options.env.GITHUB_RUN_ATTEMPT) > 1) return finish('recovery_attempt');
  if (context.position >= MAX_RUNS) return finish('chain_limit');
  if (!result.changed || result.attempted === 0) return finish('no_source_progress');
  if ((repairCounts ?? checkpoint.counts).pending > 0) {
    // Excluded identities remain in full totals, not the verified active queue.
    const firstAttempted = repairCounts ? repairCounts.attempted - result.activeRepairProgress!.before.attempted : result.firstAttempted;
    const historiesAdded = repairCounts ? repairCounts.saved - result.activeRepairProgress!.before.saved : result.historiesAdded;
    if (firstAttempted === 0 || historiesAdded === 0) return finish('no_first_pass_progress');
  } else {
    // With the first pass finished, continue ONLY after a verified decrease
    // in unresolved quality/source/refresh counts or an increase in clean
    // histories. This still has the same twelve-run and four-hour ceiling.
    if (!result.reconciliationAdvanced) return finish('no_reconciliation_progress');
  }
  if (pause(checkpoint, now())) return finish('source_paused');
  if (checkpoint.lastCatalogueError) return finish('catalogue_error');
  if (wakeAt(checkpoint, now()) + WORK_MS > instant(context.deadline)) return finish('chain_window_exhausted');
  const body = { ref: 'main', return_run_details: true, inputs: { root_run_id: context.rootRunId,
    parent_run_id: context.runId, chain_position: String(context.position + 1), expected_sequence: String(checkpoint.sequence) } };
  let response: Response;
  try { response = await api.github('/actions/workflows/github-history.yml/dispatches',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
  catch { throw new Error('dispatch_response_uncertain'); } // Never retry a possibly accepted dispatch.
  requireValue(response.status === 200 || response.status === 204, `dispatch_http_${response.status}`);
  if (response.status === 204) return finish('dispatched');
  const details = object(await api.json(response)); requireValue(positive(details.workflow_run_id), 'dispatch_response_invalid');
  return finish('dispatched', details.workflow_run_id);
}

async function main(): Promise<void> {
  const env = process.env; const mode = process.argv[2];
  requireValue(mode === 'prepare' || mode === 'continue', 'backfill_mode_invalid');
  const events: Record<string, unknown>[] = [];
  const options: Options = { env,
    // Recreate read deadlines after pacing; no token or snapshot is written to logs.
    store: { loadSnapshot: () => createGitHubStore({ repository: env.GITHUB_REPOSITORY ?? '', token: env.GITHUB_TOKEN ?? '',
      deadline: Date.now() + WORK_MS }).loadSnapshot() },
    log: event => { events.push(event); process.stdout.write(JSON.stringify(event) + '\n'); } };
  if (mode === 'prepare') {
    const result = await prepareBackfill(options);
    if (env.GITHUB_OUTPUT) await appendFile(env.GITHUB_OUTPUT,
      `collect=${result.collect}\ncontext=${JSON.stringify(result.context)}\nexpected_sequence=${result.expectedSequence ?? 'none'}\n`);
  } else await continueBackfill({ ...options, context: JSON.parse(env.BACKFILL_CONTEXT ?? 'null'), result: JSON.parse(env.BACKFILL_RESULT ?? 'null') });
  if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY,
    `## FundScope bounded backfill ${mode}\n\n${events.map(event => `\`${JSON.stringify(event)}\``).join('\n\n')}\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { const code = error instanceof Error && /^[a-z][a-z0-9_]+$/.test(error.message) ? error.message : 'backfill_control_failed';
    process.stderr.write(JSON.stringify({ phase: 'backfill_failed', error: code }) + '\n'); process.exitCode = 1; });
}
