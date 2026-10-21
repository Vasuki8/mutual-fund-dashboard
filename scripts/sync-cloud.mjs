#!/usr/bin/env node
// Standalone Node 24 runner. No dependencies, credential files or provider downloads.
import { setTimeout as sleep } from 'node:timers/promises';

const SITE_ORIGIN = 'https://fundscope-research.patelvasuki.chatgpt.site';
const REQUEST_TIMEOUT_MS = 40_000;
const CREDENTIAL_TIMEOUT_MS = 120_000;
const MAX_CREDENTIAL_BYTES = 32 * 1024;
const MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_RETRIES = 2;
const RETRYABLE = new Set([429, 502, 503, 504]);
const RUN_STATES = new Set(['running', 'completed', 'partial', 'failed']);
const defaults = { siteUrl: SITE_ORIGIN, maxSeconds: 900, maxBatches: 100 };

class RunnerError extends Error {
  constructor(code, httpStatus = null) {
    // Only fixed internal codes reach this class. Never forward a thrown message,
    // response body, URL, credential, untrusted run ID or header into output.
    super(code);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

function fail(code, httpStatus) { throw new RunnerError(code, httpStatus); }
function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function count(value) { return Number.isSafeInteger(value) && value >= 0; }
function identifier(value) { return typeof value === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(value); }

function date(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))
    && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

function timestamp(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === (value.includes('.') ? value : value.replace('Z', '.000Z'));
}

function nullable(value, validate) { return value === null || validate(value); }

function validateCredentials(value) {
  if (value === undefined || value === null) fail('credentials_missing');
  if (!record(value) || Object.keys(value).some(key => !['serviceToken', 'syncToken'].includes(key))) {
    fail('credentials_invalid');
  }
  const valid = token => typeof token === 'string' && /^[\x21-\x7e]{1,8192}$/.test(token);
  if (!valid(value.serviceToken) || (value.syncToken !== undefined && !valid(value.syncToken))) {
    fail('credentials_invalid');
  }
  return { serviceToken: value.serviceToken, syncToken: value.syncToken ?? value.serviceToken };
}

function selectedOrigin(value, allowLocalhost = false) {
  let url;
  try { url = new URL(value); } catch { fail('invalid_site'); }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) fail('invalid_site');
  if (url.origin === SITE_ORIGIN && url.protocol === 'https:') return url.origin;
  // This opt-in is only exposed to imported tests, never to the CLI or schedules.
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (allowLocalhost === true && loopback && ['http:', 'https:'].includes(url.protocol)) return url.origin;
  fail('invalid_site');
}

function validateOptions(options) {
  const settings = { ...defaults, ...options };
  if (!Number.isInteger(settings.maxSeconds) || settings.maxSeconds < 1 || settings.maxSeconds > 900
    || !Number.isInteger(settings.maxBatches) || settings.maxBatches < 0 || settings.maxBatches > 100) {
    fail('invalid_options');
  }
  return { ...settings, siteUrl: selectedOrigin(settings.siteUrl, settings.allowLocalhost) };
}

/** CLI credentials are intentionally impossible to provide in flags or env. */
export function parseArgs(args) {
  const options = { ...defaults };
  const seen = new Set();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!['--site-url', '--max-seconds', '--max-batches'].includes(key)
      || seen.has(key) || value === undefined) fail('invalid_options');
    seen.add(key);
    if (key === '--site-url') options.siteUrl = value;
    else {
      if (!/^\d+$/.test(value)) fail('invalid_options');
      options[key === '--max-seconds' ? 'maxSeconds' : 'maxBatches'] = Number(value);
    }
  }
  return validateOptions(options);
}

/**
 * Read a single newline-terminated JSON credential record. In a TTY, Node raw
 * mode disables terminal echo BEFORE the readiness message is written:
 * https://nodejs.org/api/tty.html#readstreamsetrawmodemode
 * The original raw-mode state is restored after success, failure or interruption.
 */
export function readCredentials(input = process.stdin, output = process.stderr) {
  return new Promise((resolve, reject) => {
    const tty = input.isTTY === true;
    const wasRaw = input.isRaw === true;
    let hidden = false;
    let settled = false;
    let buffer = '';
    let timer;

    const done = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      input.pause();
      input.off('data', onData);
      input.off('end', onEnd);
      input.off('error', onError);
      process.off('SIGINT', onSignal);
      process.off('SIGTERM', onSignal);
      buffer = '';
      if (hidden) {
        try { input.setRawMode(wasRaw); } catch { error = new RunnerError('terminal_restore_failed'); }
      }
      if (error) reject(error);
      else resolve(value);
    };
    const onSignal = () => done(new RunnerError('interrupted'));
    const onError = () => done(new RunnerError('credentials_unreadable'));
    const onEnd = () => done(new RunnerError(buffer.length ? 'credentials_invalid' : 'credentials_missing'));
    const onData = chunk => {
      try {
        const text = String(chunk);
        if (tty && /[\x03\x04]/.test(text)) return onSignal();
        buffer += text;
        if (Buffer.byteLength(buffer, 'utf8') > MAX_CREDENTIAL_BYTES) fail('credentials_invalid');
        const newline = buffer.search(/[\r\n]/);
        if (newline === -1) return;
        if (!/^[\r\n]*$/.test(buffer.slice(newline))) fail('credentials_invalid');
        let parsed;
        try { parsed = JSON.parse(buffer.slice(0, newline)); } catch { fail('credentials_invalid'); }
        done(null, validateCredentials(parsed));
      } catch (error) {
        done(error instanceof RunnerError ? error : new RunnerError('credentials_invalid'));
      }
    };

    try {
      if (tty) {
        if (typeof input.setRawMode !== 'function') fail('terminal_hidden_input_unavailable');
        input.setRawMode(true);
        hidden = true;
      }
      input.on('data', onData);
      input.once('end', onEnd);
      input.once('error', onError);
      process.once('SIGINT', onSignal);
      process.once('SIGTERM', onSignal);
      timer = setTimeout(() => done(new RunnerError('credentials_timeout')), CREDENTIAL_TIMEOUT_MS);
      output.write(tty ? 'Ready for sync credentials on stdin (input is hidden).\n'
        : 'Ready for sync credentials on stdin.\n');
      input.resume();
    } catch {
      done(new RunnerError('terminal_hidden_input_unavailable'));
    }
  });
}

function validateProgress(value, previous = null, finishing = false) {
  if (!record(value) || !identifier(value.runId) || !RUN_STATES.has(value.status)
    || !['processed', 'failed', 'pending', 'catalogueCount', 'archivedCount'].every(key => count(value[key]))
    || (previous && (value.runId !== previous.runId || value.processed < previous.processed || value.failed < previous.failed))
    || (finishing && value.status === 'running')) fail('invalid_response');
  // Copy only the small protocol fields needed for control flow.
  return { runId: value.runId, status: value.status, processed: value.processed, failed: value.failed,
    pending: value.pending, catalogueCount: value.catalogueCount, archivedCount: value.archivedCount };
}

function validateStatus(value, checkpoint) {
  if (!record(value) || value.source !== 'mfapi.in'
    || !['catalogueCount', 'archivedCount', 'observationCount', 'historyBacklog'].every(key => count(value[key]))
    || !nullable(value.lastCatalogueSyncAt, timestamp) || !nullable(value.lastHistorySyncAt, timestamp)
    || !nullable(value.latestNavDate, date)
    || !Array.isArray(value.warnings) || !value.warnings.every(warning => typeof warning === 'string')
    || !record(value.schedule) || value.schedule.timezone !== 'UTC'
    || !Array.isArray(value.schedule.times) || value.schedule.times.length !== 2
    || value.schedule.times[0] !== '05:37' || value.schedule.times[1] !== '17:37') fail('invalid_response');
  const run = value.lastRun;
  if (!record(run) || run.id !== checkpoint.runId || !RUN_STATES.has(run.status) || run.status === 'running'
    || !timestamp(run.startedAt) || !timestamp(run.finishedAt)
    || !count(run.processed) || !count(run.failed)
    || run.processed < checkpoint.processed || run.failed < checkpoint.failed
    || value.catalogueCount < checkpoint.catalogueCount || value.archivedCount < checkpoint.archivedCount
    || !(run.error === null || typeof run.error === 'string')) fail('invalid_response');
  return { catalogueCount: value.catalogueCount, archivedCount: value.archivedCount,
    observationCount: value.observationCount, historyBacklog: value.historyBacklog,
    lastCatalogueSyncAt: value.lastCatalogueSyncAt, latestNavDate: value.latestNavDate,
    lastHistorySyncAt: value.lastHistorySyncAt, runStatus: run.status,
    processed: run.processed, failed: run.failed, warningCount: value.warnings.length };
}

function emptySummary(now) {
  return { status: 'failed', stopReason: 'internal_error', source: 'mfapi.in',
    startedAt: new Date(now).toISOString(), finishedAt: null, batches: 0, requests: 0, retries: 0,
    checkpointed: false, readbackVerified: false, catalogueCount: null, archivedCount: null,
    observationCount: null, historyBacklog: null, lastCatalogueSyncAt: null, latestNavDate: null,
    lastHistorySyncAt: null, runStatus: null, processed: null, failed: null, warningCount: null, httpStatus: null };
}

function safeFailure(summary, error) {
  summary.status = 'failed';
  summary.stopReason = error instanceof RunnerError ? error.code : 'internal_error';
  summary.httpStatus = error instanceof RunnerError ? error.httpStatus : null;
  return summary;
}

async function responseJson(response) {
  if (!response.body || Number(response.headers.get('content-length')) > MAX_RESPONSE_BYTES) fail('invalid_response');
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      bytes += result.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) fail('invalid_response');
      chunks.push(result.value);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail('invalid_response'); }
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function retryAfterMilliseconds(value, now) {
  if (value === null) return 0;
  if (/^\d+$/.test(value.trim())) return Number(value.trim()) * 1000;
  const at = Date.parse(value);
  return Number.isFinite(at) ? Math.max(0, at - now) : 0;
}

/**
 * Execute a hosted sync with injectable transport/time and no logging. The work
 * budget covers start/step; finish and GET readback each receive at most 40s.
 * Only validated counts, dates, enums and flags are returned to the caller.
 */
export async function runCloudSync(options = {}, runtime = {}) {
  const fetchRequest = runtime.fetch ?? globalThis.fetch;
  const now = runtime.now ?? Date.now;
  const monotonicNow = runtime.monotonicNow ?? (runtime.now ? runtime.now : () => performance.now());
  const wait = runtime.sleep ?? sleep;
  const began = now();
  const beganTick = monotonicNow();
  const summary = emptySummary(began);
  let settings;
  let credentials;
  try {
    settings = validateOptions(options);
    credentials = validateCredentials(settings.credentials);
  } catch (error) {
    summary.finishedAt = new Date(now()).toISOString();
    return safeFailure(summary, error);
  }

  const headers = {
    'OAI-Sites-Authorization': `Bearer ${credentials.serviceToken}`,
    'x-fundscope-sync-token': credentials.syncToken,
    'content-type': 'application/json', accept: 'application/json', 'cache-control': 'no-cache',
  };

  const request = async (path, payload, deadline) => {
    const minimumAttemptBudget = path === '/api/sync/step' ? REQUEST_TIMEOUT_MS : 0;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      const remaining = deadline - monotonicNow();
      if (remaining <= 0 || remaining < minimumAttemptBudget) fail('time_limit');
      const controller = new AbortController();
      let timer;
      let result;
      try {
        summary.requests += 1;
        const timeout = new Promise((_, reject) => {
          timer = setTimeout(() => { controller.abort(); reject(new RunnerError('request_timeout')); },
            Math.min(REQUEST_TIMEOUT_MS, remaining));
        });
        const operation = (async () => {
          let response;
          try {
            response = await fetchRequest(`${settings.siteUrl}${path}`, { method: payload ? 'POST' : 'GET',
              headers, body: payload ? JSON.stringify(payload) : undefined,
              signal: controller.signal, redirect: 'error', cache: 'no-store' });
          } catch { fail(controller.signal.aborted ? 'request_timeout' : 'network_error'); }
          if (!response || !Number.isInteger(response.status)) fail('invalid_response');
          // redirect:error is enforced by real fetch. Also reject redirected
          // responses supplied by any alternate transport before reading them.
          if (response.redirected || response.status >= 300 && response.status < 400) fail('redirect_blocked');
          if (response.status < 200 || response.status >= 300) {
            void response.body?.cancel().catch(() => {});
            return { httpStatus: response.status, retryAfter: response.headers.get('retry-after') };
          }
          return { data: await responseJson(response) };
        })();
        result = await Promise.race([operation, timeout]);
      } finally {
        clearTimeout(timer);
      }
      if (result.data !== undefined) return result.data;
      const httpStatus = result.httpStatus;
      if ([401, 403].includes(httpStatus)) fail('unauthorized', httpStatus);
      if (httpStatus === 404) fail('endpoint_not_found', httpStatus);
      if (!RETRYABLE.has(httpStatus) || attempt === MAX_RETRIES) fail('http_error', httpStatus);
      const pause = Math.max(1000 * 2 ** attempt, retryAfterMilliseconds(result.retryAfter, now()));
      if (pause > 30_000) fail('retry_after_limit', httpStatus);
      const remainingAfterPause = deadline - monotonicNow() - pause;
      if (remainingAfterPause <= 0 || remainingAfterPause < minimumAttemptBudget) fail('time_limit', httpStatus);
      summary.retries += 1;
      await wait(pause);
    }
    fail('internal_error');
  };

  // Anchor to the most recent 05:37/17:37 UTC occurrence, so an earlier manual
  // run cannot consume the next scheduled run. Keep this key fixed for retries.
  const periodMs = 12 * 3600_000;
  const morningOffsetMs = (5 * 60 + 37) * 60_000;
  const occurrenceMs = Math.floor((began - morningOffsetMs) / periodMs) * periodMs + morningOffsetMs;
  const occurrence = new Date(occurrenceMs).toISOString();
  const idempotencyKey = `fundscope:${occurrence.slice(0, 10)}:${occurrence.slice(11, 16).replace(':', '')}`;
  const workDeadline = beganTick + settings.maxSeconds * 1000;
  let current = null;
  let workError = null;
  let stopReason = 'completed';
  try {
    current = validateProgress(await request('/api/sync/start', { idempotencyKey }, workDeadline));
    let unchanged = 0;
    while (current.status === 'running' && current.pending > 0) {
      // Do not give a new server step a shortened timeout near the deadline:
      // it may retain a durable lease after the client disconnects. Retries
      // enforce the same full-request allowance inside request().
      if (workDeadline - monotonicNow() < REQUEST_TIMEOUT_MS) { stopReason = 'time_limit'; break; }
      if (summary.batches >= settings.maxBatches) { stopReason = 'batch_limit'; break; }
      const next = validateProgress(await request('/api/sync/step', { runId: current.runId, limit: 20 }, workDeadline), current);
      summary.batches += 1;
      const advanced = next.processed > current.processed || next.failed > current.failed
        || next.pending < current.pending || next.archivedCount > current.archivedCount;
      unchanged = advanced ? 0 : unchanged + 1;
      current = next;
      if (unchanged >= 2) { stopReason = 'no_progress'; break; }
    }
  } catch (error) {
    workError = error instanceof RunnerError ? error : new RunnerError('internal_error');
    stopReason = workError.code;
  }

  try {
    // Auth/not-found/integrity/redirect failures terminate immediately. A known
    // run with a transport/budget interruption may still be safely checkpointed.
    const stopImmediately = !current || workError && ['unauthorized', 'endpoint_not_found',
      'invalid_response', 'redirect_blocked', 'internal_error'].includes(workError.code);
    if (stopImmediately) throw workError ?? new RunnerError('internal_error');
    current = validateProgress(await request('/api/sync/finish', { runId: current.runId }, monotonicNow() + REQUEST_TIMEOUT_MS), current, true);
    summary.checkpointed = true;
    const verified = validateStatus(await request('/api/data/status', null, monotonicNow() + REQUEST_TIMEOUT_MS), current);
    Object.assign(summary, verified, { readbackVerified: true });
    if (verified.runStatus === 'failed' || current.status === 'failed') fail('server_run_failed');
    if (verified.catalogueCount === 0 || verified.lastCatalogueSyncAt === null) fail('catalogue_unavailable');
    const partial = verified.historyBacklog > 0 || current.pending > 0 || verified.failed > 0
      || current.failed > 0 || verified.runStatus === 'partial' || current.status === 'partial' || workError !== null;
    summary.status = partial ? 'partial' : 'completed';
    summary.stopReason = !partial ? 'completed' : stopReason === 'completed' ? 'backlog_remaining' : stopReason;
    summary.httpStatus = workError?.httpStatus ?? null;
  } catch (error) {
    safeFailure(summary, error);
  }
  summary.finishedAt = new Date(now()).toISOString();
  return summary;
}

export async function main(args = process.argv.slice(2), input = process.stdin, output = process.stdout, errorOutput = process.stderr) {
  if (args.length === 1 && args[0] === '--help') {
    output.write(`Usage: node --use-env-proxy scripts/sync-cloud.mjs [--site-url ${SITE_ORIGIN}] [--max-seconds 1..900] [--max-batches 0..100]\n`
      + 'Supply one credential JSON line on hidden stdin after readiness. Never use token flags or environment variables.\n');
    return 0;
  }
  let summary;
  try {
    const options = parseArgs(args);
    const credentials = await readCredentials(input, errorOutput);
    summary = await runCloudSync({ ...options, credentials });
  } catch (error) {
    summary = safeFailure(emptySummary(Date.now()), error);
    summary.finishedAt = new Date().toISOString();
  }
  output.write(`${JSON.stringify(summary)}\n`);
  return summary.status === 'failed' ? 1 : 0;
}

if (import.meta.main) process.exitCode = await main();
