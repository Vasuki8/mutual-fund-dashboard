import assert from 'node:assert/strict';
import { PassThrough, Readable, Writable } from 'node:stream';
import { test } from 'node:test';
import type { SyncProgress, SyncStatus } from '../src/lib/sync-types.ts';

// Dynamic import makes the initial missing implementation an assertion failure.
async function runner() {
  const module = await import('../scripts/sync-cloud.mjs').catch(() => null);
  assert.ok(module, 'The standalone sync runner must be importable without CLI side effects.');
  return module;
}

const SITE = 'https://fundscope-research.patelvasuki.chatgpt.site';
const SECRET = 'test-only-service-token-do-not-echo';
const APP_SECRET = 'test-only-app-token-do-not-echo';
const NOW = Date.parse('2026-10-21T05:37:00.000Z');
const RUN = 'run-2026-10-21-00';

function progress(overrides: Partial<SyncProgress> = {}): SyncProgress {
  return { runId: RUN, status: 'running', processed: 0, failed: 0, pending: 3,
    catalogueCount: 3, archivedCount: 0, ...overrides };
}

function status(overrides: Partial<SyncStatus> = {}): SyncStatus {
  return { source: 'mfapi.in', catalogueCount: 3, archivedCount: 2,
    observationCount: 400, historyBacklog: 1, lastCatalogueSyncAt: new Date(NOW).toISOString(),
    latestNavDate: '2026-10-20', lastHistorySyncAt: new Date(NOW + 500).toISOString(),
    lastRun: { id: RUN, status: 'partial', startedAt: new Date(NOW).toISOString(),
      finishedAt: new Date(NOW + 1000).toISOString(), processed: 2, failed: 0, error: null },
    schedule: { timezone: 'UTC', times: ['05:37', '17:37'] }, warnings: [], ...overrides };
}

type Reply = Response | Record<string, unknown> | SyncProgress | SyncStatus | (() => Response | Promise<Response>);

function hosted(replies: Reply[], start = NOW) {
  let time = start;
  const requests: { url: string; method: string; headers: Headers; body: any; redirect: RequestRedirect | undefined }[] = [];
  const sleeps: number[] = [];
  const fetch = async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(input), method: init?.method ?? 'GET', headers: new Headers(init?.headers),
      body: init?.body ? JSON.parse(String(init.body)) : null, redirect: init?.redirect });
    assert.ok(init?.signal instanceof AbortSignal, 'Every request must have a timeout signal.');
    assert.ok(replies.length > 0, 'Runner made an unexpected extra request.');
    const reply = replies.shift()!;
    if (typeof reply === 'function') return reply();
    return reply instanceof Response ? reply : Response.json(reply);
  };
  return { requests, sleeps, fetch, now: () => time,
    advance: (milliseconds: number) => { time += milliseconds; },
    sleep: async (milliseconds: number) => { sleeps.push(milliseconds); time += milliseconds; } };
}

function options(extra: Record<string, unknown> = {}) {
  return { siteUrl: SITE, credentials: { serviceToken: SECRET }, maxSeconds: 900, maxBatches: 1, ...extra };
}

function capture() {
  let text = '';
  return { stream: new Writable({ write(chunk, _encoding, callback) { text += String(chunk); callback(); } }),
    text: () => text };
}

test('missing credentials stop before any hosted request and produce a safe failure', async () => {
  const { runCloudSync } = await runner();
  const api = hosted([]);
  const result = await runCloudSync(options({ credentials: undefined }), api);
  assert.equal(result.status, 'failed');
  assert.equal(result.stopReason, 'credentials_missing');
  assert.equal(api.requests.length, 0);
});

test('uses both auth headers, fixed same-slot identity, bounded batches and durable partial readback', async () => {
  const { runCloudSync } = await runner();
  const api = hosted([progress(), progress({ processed: 2, pending: 1, archivedCount: 2 }),
    progress({ status: 'partial', processed: 2, pending: 1, archivedCount: 2 }), status()]);
  const result = await runCloudSync(options({ credentials: { serviceToken: SECRET, syncToken: APP_SECRET } }), api);
  assert.deepEqual(api.requests.map(request => new URL(request.url).pathname),
    ['/api/sync/start', '/api/sync/step', '/api/sync/finish', '/api/data/status']);
  for (const request of api.requests) {
    assert.equal(request.headers.get('OAI-Sites-Authorization'), `Bearer ${SECRET}`);
    assert.equal(request.headers.get('x-fundscope-sync-token'), APP_SECRET);
    assert.equal(request.redirect, 'error');
    assert.equal(new URL(request.url).origin, SITE);
  }
  assert.deepEqual(api.requests[0].body, { idempotencyKey: 'fundscope:2026-10-21:00' });
  assert.deepEqual(api.requests[1].body, { runId: RUN, limit: 20 });
  assert.equal(result.status, 'partial');
  assert.equal(result.stopReason, 'batch_limit');
  assert.equal(result.batches, 1);
  assert.equal(result.checkpointed, true);
  assert.equal(result.readbackVerified, true);
  assert.equal(result.catalogueCount, 3);
  assert.equal(result.observationCount, 400);
  assert.equal(result.historyBacklog, 1);
  assert.equal(result.latestNavDate, '2026-10-20');
  assert.equal(JSON.stringify(result).includes(SECRET), false);
  assert.equal(JSON.stringify(result).includes(APP_SECRET), false);
});

test('omitted app credential defaults to the service credential and noon changes the UTC slot', async () => {
  const { runCloudSync } = await runner();
  const api = hosted([progress(), progress({ status: 'partial' }), status()], NOW + 12 * 3600_000);
  const result = await runCloudSync(options({ maxBatches: 0 }), api);
  assert.equal(result.status, 'partial');
  assert.equal(api.requests[0].body.idempotencyKey, 'fundscope:2026-10-21:12');
  assert.equal(api.requests[0].headers.get('x-fundscope-sync-token'), SECRET);
  assert.equal(api.requests.filter(request => request.url.endsWith('/step')).length, 0);
});

for (const code of [401, 403, 404]) {
  test(`HTTP ${code} is fatal, is never retried and never prints the response body`, async () => {
    const { runCloudSync } = await runner();
    const api = hosted([progress(), new Response(`leaked ${SECRET}`, { status: code })]);
    const result = await runCloudSync(options(), api);
    assert.equal(result.status, 'failed');
    assert.equal(result.httpStatus, code);
    assert.equal(result.readbackVerified, false);
    assert.equal(api.requests.length, 2);
    assert.deepEqual(api.sleeps, []);
    assert.equal(JSON.stringify(result).includes(SECRET), false);
  });
}

test('retries transient status with bounded backoff and honours Retry-After before retrying', async () => {
  const { runCloudSync } = await runner();
  const api = hosted([new Response(SECRET, { status: 503, headers: { 'Retry-After': '3' } }), progress(),
    progress({ status: 'partial' }), status()]);
  const result = await runCloudSync(options({ maxBatches: 0 }), api);
  assert.deepEqual(api.sleeps, [3000]);
  assert.equal(api.requests[0].body.idempotencyKey, api.requests[1].body.idempotencyKey);
  assert.equal(result.retries, 1);
  assert.equal(result.status, 'partial');
  assert.equal(JSON.stringify(result).includes(SECRET), false);
});

test('a Retry-After longer than thirty seconds stops without retrying too early', async () => {
  const { runCloudSync } = await runner();
  const api = hosted([new Response(SECRET, { status: 429, headers: { 'Retry-After': '3600' } })]);
  const result = await runCloudSync(options(), api);
  assert.equal(result.status, 'failed');
  assert.equal(result.stopReason, 'retry_after_limit');
  assert.equal(result.httpStatus, 429);
  assert.equal(api.requests.length, 1);
  assert.equal(api.sleeps.length, 0);
});

test('transient attempts are capped and arbitrary HTTP 500 is not retried', async () => {
  const { runCloudSync } = await runner();
  const api = hosted(Array.from({ length: 3 }, () => new Response('', { status: 502 })));
  const result = await runCloudSync(options(), api);
  assert.equal(result.status, 'failed');
  assert.equal(result.httpStatus, 502);
  assert.equal(api.requests.length, 3);
  assert.deepEqual(api.sleeps, [1000, 2000]);
  const secondApi = hosted([new Response('', { status: 500 })]);
  const second = await runCloudSync(options(), secondApi);
  assert.equal(second.status, 'failed');
  assert.equal(secondApi.requests.length, 1);
});

test('a time budget expiring during a batch still checkpoints and reads durable status', async () => {
  const { runCloudSync } = await runner();
  const api = hosted([progress(), () => {
    api.advance(41_000);
    return Response.json(progress({ processed: 2, archivedCount: 2, pending: 1 }));
  }, progress({ status: 'partial', processed: 2, archivedCount: 2, pending: 1 }), status()]);
  const result = await runCloudSync(options({ maxSeconds: 40, maxBatches: 100 }), api);
  assert.equal(result.status, 'partial');
  assert.equal(result.stopReason, 'time_limit');
  assert.equal(result.batches, 1);
  assert.equal(result.checkpointed, true);
  assert.equal(result.readbackVerified, true);
  assert.equal(api.requests.length, 4);
});

test('unchanged progress cannot create a tight one-hundred-batch loop', async () => {
  const { runCloudSync } = await runner();
  const api = hosted([progress(), progress(), progress(), progress({ status: 'partial' }), status()]);
  const result = await runCloudSync(options({ maxBatches: 100 }), api);
  assert.equal(result.status, 'partial');
  assert.equal(result.stopReason, 'no_progress');
  assert.equal(result.batches, 2);
  assert.equal(result.readbackVerified, true);
});

test('a full verified archive may be complete, and a resumed closed run is not stepped', async () => {
  const { runCloudSync } = await runner();
  const completed = progress({ status: 'completed', processed: 3, archivedCount: 3, pending: 0 });
  const completeStatus = status({ archivedCount: 3, historyBacklog: 0,
    lastRun: { ...status().lastRun!, status: 'completed', processed: 3 } });
  const api = hosted([completed, completed, completeStatus]);
  const result = await runCloudSync(options(), api);
  assert.equal(result.status, 'completed');
  assert.equal(result.stopReason, 'completed');
  assert.equal(result.batches, 0);
  assert.equal(result.readbackVerified, true);
  assert.equal(api.requests.length, 3);
});

test('a completed response with durable history backlog is reported as partial', async () => {
  const { runCloudSync } = await runner();
  const completed = progress({ status: 'completed', processed: 2, archivedCount: 2, pending: 0 });
  const api = hosted([completed, completed, status({ lastRun: { ...status().lastRun!, status: 'completed' } })]);
  const result = await runCloudSync(options(), api);
  assert.equal(result.status, 'partial');
  assert.equal(result.stopReason, 'backlog_remaining');
});

test('malformed JSON, schemas and changed run identities are not retried or exposed', async () => {
  const { runCloudSync } = await runner();
  for (const reply of [new Response(`{${SECRET}`), { ...progress(), processed: SECRET }, { ...progress(), runId: '' }]) {
    const api = hosted([reply]);
    const result = await runCloudSync(options(), api);
    assert.equal(result.status, 'failed');
    assert.equal(result.stopReason, 'invalid_response');
    assert.equal(api.requests.length, 1);
    assert.equal(JSON.stringify(result).includes(SECRET), false);
  }
  const api = hosted([progress(), progress({ runId: 'other-run' })]);
  const result = await runCloudSync(options(), api);
  assert.equal(result.stopReason, 'invalid_response');
  assert.equal(api.requests.length, 2);
});

test('final readback failure never claims durable success', async () => {
  const { runCloudSync } = await runner();
  const api = hosted([progress(), progress({ status: 'partial' }), new Response(SECRET, { status: 500 })]);
  const result = await runCloudSync(options({ maxBatches: 0 }), api);
  assert.equal(result.status, 'failed');
  assert.equal(result.checkpointed, true);
  assert.equal(result.readbackVerified, false);
  assert.equal(result.catalogueCount, null);
  assert.equal(result.httpStatus, 500);
});

test('a different last run or invalid date in status fails integrity verification', async () => {
  const { runCloudSync } = await runner();
  for (const invalid of [status({ lastRun: { ...status().lastRun!, id: 'other-run' } }),
    status({ latestNavDate: '2026-02-31' })]) {
    const api = hosted([progress(), progress({ status: 'partial' }), invalid]);
    const result = await runCloudSync(options({ maxBatches: 0 }), api);
    assert.equal(result.status, 'failed');
    assert.equal(result.readbackVerified, false);
    assert.equal(result.stopReason, 'invalid_response');
  }
});

test('warning and last-run error strings are never copied into the JSON summary', async () => {
  const { runCloudSync } = await runner();
  const api = hosted([progress(), progress({ status: 'partial' }), status({ warnings: [SECRET],
    lastRun: { ...status().lastRun!, error: APP_SECRET } })]);
  const result = await runCloudSync(options({ maxBatches: 0 }), api);
  assert.equal(result.status, 'partial');
  assert.equal(JSON.stringify(result).includes(SECRET), false);
  assert.equal(JSON.stringify(result).includes(APP_SECRET), false);
  assert.equal(result.warningCount, 1);
});

test('rejects all unapproved origins and credentials before a request', async () => {
  const { runCloudSync } = await runner();
  for (const siteUrl of ['http://fundscope-research.patelvasuki.chatgpt.site', `${SITE}.attacker.example`,
    `${SITE}/unexpected`, `${SITE}?next=evil`, `${SITE}#fragment`, `${SITE}:444`,
    'https://user:password@fundscope-research.patelvasuki.chatgpt.site', 'http://localhost:3210']) {
    const api = hosted([]);
    const result = await runCloudSync(options({ siteUrl }), api);
    assert.equal(result.stopReason, 'invalid_site');
    assert.equal(api.requests.length, 0);
  }
  for (const credentials of [{ serviceToken: 'bad\r\nheader' }, { serviceToken: SECRET, syncToken: '' },
    { serviceToken: ' ' }, { serviceToken: SECRET, unexpected: APP_SECRET }]) {
    const api = hosted([]);
    const result = await runCloudSync(options({ credentials }), api);
    assert.equal(result.stopReason, 'credentials_invalid');
    assert.equal(api.requests.length, 0);
    assert.equal(JSON.stringify(result).includes(SECRET), false);
  }
});

test('localhost is available only as an explicit programmatic test opt-in', async () => {
  const { runCloudSync } = await runner();
  const api = hosted([progress(), progress({ status: 'partial' }), status()]);
  const result = await runCloudSync(options({ siteUrl: 'http://127.0.0.1:3210', allowLocalhost: true, maxBatches: 0 }), api);
  assert.equal(result.status, 'partial');
  assert.equal(new URL(api.requests[0].url).origin, 'http://127.0.0.1:3210');
});

test('bounded CLI flags reject token options, duplicate values and out-of-range budgets', async () => {
  const { parseArgs } = await runner();
  assert.deepEqual(parseArgs(['--site-url', SITE, '--max-seconds', '2', '--max-batches', '0']),
    { siteUrl: SITE, maxSeconds: 2, maxBatches: 0 });
  for (const args of [['--token', SECRET], ['--max-seconds', '0'], ['--max-seconds', '901'],
    ['--max-batches', '101'], ['--max-seconds', 'NaN'], ['--max-seconds', '1.5'],
    ['--max-batches', '1', '--max-batches', '2'], ['--site-url']]) {
    assert.throws(() => parseArgs(args), error => error instanceof Error && !error.message.includes(SECRET));
  }
});

test('reads exactly one bounded credential JSON line from a non-TTY stream without logging it', async () => {
  const { readCredentials } = await runner();
  const output = capture();
  assert.deepEqual(await readCredentials(Readable.from([`{"serviceToken":"${SECRET}"}\n`]), output.stream),
    { serviceToken: SECRET, syncToken: SECRET });
  assert.equal(output.text().includes(SECRET), false);
  for (const value of ['', `{"serviceToken":"${SECRET}"}`, `{"serviceToken":"${SECRET}"}\n{}\n`,
    `{${SECRET}\n`, `${'x'.repeat(33 * 1024)}\n`]) {
    const errorOutput = capture();
    await assert.rejects(readCredentials(Readable.from([value]), errorOutput.stream),
      error => error instanceof Error && !error.message.includes(SECRET));
    assert.equal(errorOutput.text().includes(SECRET), false);
  }
});

test('TTY readiness is emitted only after echo is disabled and terminal state is restored', async () => {
  const { readCredentials } = await runner();
  const input = new PassThrough() as PassThrough & { isTTY: boolean; isRaw: boolean; setRawMode: (value: boolean) => void };
  input.isTTY = true;
  input.isRaw = false;
  const rawTransitions: boolean[] = [];
  input.setRawMode = value => { input.isRaw = value; rawTransitions.push(value); };
  let output = '';
  const readiness = new Writable({ write(chunk, _encoding, callback) {
    assert.equal(input.isRaw, true);
    output += String(chunk);
    callback();
  } });
  const pending = readCredentials(input, readiness);
  assert.match(output, /Ready for sync credentials on stdin \(input is hidden\)/);
  input.write(`{"serviceToken":"${SECRET}"}\r`);
  assert.equal((await pending).serviceToken, SECRET);
  assert.deepEqual(rawTransitions, [true, false]);
  assert.equal(output.includes(SECRET), false);
});

test('the CLI emits only a safe JSON failure for absent or invalid stdin', async () => {
  const { main } = await runner();
  const output = capture();
  const errorOutput = capture();
  const exitCode = await main([], Readable.from([`{${SECRET}\n`]), output.stream, errorOutput.stream);
  assert.equal(exitCode, 1);
  assert.equal(JSON.parse(output.text()).status, 'failed');
  assert.equal(`${output.text()}${errorOutput.text()}`.includes(SECRET), false);
  assert.equal(`${output.text()}${errorOutput.text()}`.includes('SyntaxError'), false);
});

test('budget uses a monotonic clock even when wall time is unchanged', async () => {
  const { runCloudSync } = await runner();
  let elapsed = 0;
  const api = hosted([progress(), () => {
    elapsed = 41_000;
    return Response.json(progress({ processed: 2, archivedCount: 2, pending: 1 }));
  }, progress({ status: 'partial', processed: 2, archivedCount: 2, pending: 1 }), status()]);
  const result = await runCloudSync(options({ maxSeconds: 40, maxBatches: 100 }),
    { ...api, monotonicNow: () => elapsed });
  assert.equal(result.stopReason, 'time_limit');
  assert.equal(result.status, 'partial');
  assert.equal(result.batches, 1);
  assert.equal(result.readbackVerified, true);
});

test('network exceptions cannot leak tokens and a known run can still checkpoint its partial success', async () => {
  const { runCloudSync } = await runner();
  const api = hosted([progress(), () => { throw new Error(`${SECRET} ${APP_SECRET}`); },
    progress({ status: 'partial' }), status()]);
  const result = await runCloudSync(options(), api);
  assert.equal(result.status, 'partial');
  assert.equal(result.stopReason, 'network_error');
  assert.equal(result.checkpointed, true);
  assert.equal(result.readbackVerified, true);
  assert.equal(result.retries, 0);
  assert.equal(JSON.stringify(result).includes(SECRET), false);
  assert.equal(JSON.stringify(result).includes(APP_SECRET), false);
});

test('redirects are refused without any request to the redirect destination', async () => {
  const { runCloudSync } = await runner();
  const api = hosted([new Response(SECRET, { status: 307, headers: { location: 'https://attacker.example/' } })]);
  const result = await runCloudSync(options(), api);
  assert.equal(result.status, 'failed');
  assert.equal(result.stopReason, 'redirect_blocked');
  assert.equal(api.requests.length, 1);
});

test('a stalled transport is cancelled at the shorter work deadline', async () => {
  const { runCloudSync } = await runner();
  let signal: AbortSignal | undefined;
  const result = await runCloudSync(options({ maxSeconds: 1 }), {
    fetch: async (_input: unknown, init: RequestInit) => {
      signal = init.signal ?? undefined;
      return new Promise<Response>(() => {});
    },
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.stopReason, 'request_timeout');
  assert.equal(result.requests, 1);
  assert.equal(signal?.aborted, true);
});

test('declared and streamed oversized responses fail safely without retries', async () => {
  const { runCloudSync } = await runner();
  for (const response of [new Response(SECRET, { headers: { 'content-length': '99999999' } }),
    new Response(`{"payload":"${'x'.repeat(65 * 1024)}"}`)]) {
    const api = hosted([response]);
    const result = await runCloudSync(options(), api);
    assert.equal(result.stopReason, 'invalid_response');
    assert.equal(api.requests.length, 1);
    assert.equal(JSON.stringify(result).includes(SECRET), false);
  }
});

test('cannot announce TTY readiness if terminal echo could not be disabled', async () => {
  const { readCredentials } = await runner();
  const input = new PassThrough() as PassThrough & { isTTY: boolean; setRawMode: () => void };
  input.isTTY = true;
  input.setRawMode = () => { throw new Error(SECRET); };
  const output = capture();
  await assert.rejects(readCredentials(input, output.stream), error =>
    error instanceof Error && error.message === 'terminal_hidden_input_unavailable');
  assert.equal(output.text(), '');
});

test('readback cannot claim durability when the saved counts regress behind the acknowledged checkpoint', async () => {
  const { runCloudSync } = await runner();
  const api = hosted([progress(), progress({ status: 'partial', processed: 3, archivedCount: 3 }), status()]);
  const result = await runCloudSync(options({ maxBatches: 0 }), api);
  assert.equal(result.status, 'failed');
  assert.equal(result.stopReason, 'invalid_response');
  assert.equal(result.readbackVerified, false);
  assert.equal(result.catalogueCount, null);
});

test('does not start another history step when only five seconds of work budget remain', async () => {
  const { runCloudSync } = await runner();
  const advanced = progress({ processed: 2, archivedCount: 2, pending: 1 });
  const api = hosted([progress(), () => {
    api.advance(895_000);
    return Response.json(advanced);
  }, { ...advanced, status: 'partial' }, status()]);
  const result = await runCloudSync(options({ maxSeconds: 900, maxBatches: 100 }), api);
  assert.equal(result.status, 'partial');
  assert.equal(result.stopReason, 'time_limit');
  assert.equal(result.batches, 1);
  assert.equal(result.checkpointed, true);
  assert.equal(result.readbackVerified, true);
  assert.deepEqual(api.requests.map(request => new URL(request.url).pathname),
    ['/api/sync/start', '/api/sync/step', '/api/sync/finish', '/api/data/status']);
});

test('a history-step retry also needs a full forty-second request allowance after backoff', async () => {
  const { runCloudSync } = await runner();
  const api = hosted([progress(), () => {
    api.advance(21_000);
    return new Response('', { status: 503, headers: { 'Retry-After': '3' } });
  }, progress({ status: 'partial' }), status()]);
  const result = await runCloudSync(options({ maxSeconds: 60 }), api);
  assert.equal(result.status, 'partial');
  assert.equal(result.stopReason, 'time_limit');
  assert.equal(result.httpStatus, 503);
  assert.equal(result.retries, 0);
  assert.equal(result.readbackVerified, true);
  assert.equal(api.requests.filter(request => request.url.endsWith('/step')).length, 1);
  assert.deepEqual(api.sleeps, []);
});
