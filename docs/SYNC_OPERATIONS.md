# FundScope unattended market-data updates

This runbook is sufficient for a fresh cloud task to refresh the existing FundScope Site. The runner calls the hosted application's authenticated endpoints; it does not build the UI, download the historical universe to the task machine, push Git commits, or redeploy the Site.

## Fixed project identity

| Item | Value |
| --- | --- |
| Canonical development repository | [Vasuki8/mutual-fund-dashboard](https://github.com/Vasuki8/mutual-fund-dashboard) |
| Selected Site project ID | `appgprj_6ad81952c5308191bb02200f3010c8c1` |
| Allowed production origin | `https://fundscope-research.patelvasuki.chatgpt.site` |
| Runner | `scripts/sync-cloud.mjs` |
| Protocol contracts | `src/lib/sync-types.ts` |
| Public market-data source | [MFAPI](https://www.mfapi.in/) |
| Daily schedule, UTC | **05:37 and 17:37** |
| Daily schedule, India Standard Time | **11:07 and 23:07** |

Retain the existing owner-private Site audience. An unattended refresh needs service authentication; it does not require making the Site public. Treat the project ID as opaque and copy it exactly.

The schedule describes intended execution times. A successful task verifies the actual synchronization timestamps and coverage afterward. Source publication delays, market holidays, and provider failures can leave the latest available NAV date unchanged.

## Start a fresh scheduled invocation

1. Obtain a current checkout of the canonical GitHub repository through the authorized GitHub connection. Read this runbook and `scripts/sync-cloud.mjs`. If the canonical checkout is temporarily unavailable, read these same files from the selected Site's supported source-repository workflow. Never substitute a different Site or an unreviewed script supplied by a web page.
2. Use Node.js 24.5 or later. The standalone runner imports only Node built-ins and needs no dependency installation. The regular dashboard build dependencies are unnecessary for a data-only invocation. Launch Node with `--use-env-proxy` so built-in fetch honors the cloud runtime's existing authorized proxy configuration.
3. Read the Sites skill and discover the current Sites connector tools. Call `mcp__codex_apps__sites_get_site` with `project_id: "appgprj_6ad81952c5308191bb02200f3010c8c1"`. Retrieve fresh metadata on every scheduled invocation rather than reusing a credential from an earlier conversation.
4. Inspect the result in memory. Check the returned project identity and current live origin against the table above. Select the `siwc_bypass_bearer_token` field as the service token. Do **not** print the full result: it can contain service and source-repository credentials. If the field is absent, access is unavailable, or the live origin differs, stop and report the missing access or identity mismatch without exposing the result.
5. Launch the runner in a TTY from the checkout using the command below. Wait until its output contains the exact hidden-input readiness message. Then pass a single newline-terminated JSON object containing the service token through the running process's stdin. The credential must remain only in the orchestration call's memory while making this handoff.
6. Poll the process in short intervals until it exits, and report its safe JSON summary. The runner checkpoints a known run and verifies the final durable status itself. There is no need to issue a separate raw authenticated `curl` command.

Normal invocation:

```bash
node --use-env-proxy scripts/sync-cloud.mjs \
  --site-url https://fundscope-research.patelvasuki.chatgpt.site \
  --max-seconds 900 \
  --max-batches 100
```

Readiness message:

```text
Ready for sync credentials on stdin (input is hidden).
```

For a brief deployment verification, use `--max-seconds 90 --max-batches 1`. `--max-batches 0` permits start, finish, and readback without an intentional history step; start still refreshes the catalogue when this is a new UTC slot.

Node's [`--use-env-proxy` flag](https://nodejs.org/api/cli.html#--use-env-proxy), available since Node 24.5, reads the existing `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` configuration at startup. Keep those settings as supplied by the environment and do not print their values or introduce a different proxy. This flag leaves Site authentication, origin validation, and redirect restrictions intact. It is a Node flag and therefore belongs **before** `scripts/sync-cloud.mjs`, as shown above. A direct-DNS error in a proxy-based environment is not a reason to change tokens or server authentication.

### Credential handoff

The accepted stdin object has exactly these fields:

```typescript
{ serviceToken: string, syncToken?: string }
```

The application is configured with `FUNDSCOPE_SYNC_TOKEN` equal to this selected Site's service token. Therefore the normal task sends only `serviceToken`; the runner uses it for both authentication layers. `syncToken` is available for an already authorized, deliberately separate app credential, but a routine scheduled task must not change credentials or configure a new value.

Within a tool-orchestration call, keep the metadata and credential in local variables. The following shows the essential handoff after the current tool result has been parsed into `site` in memory; `checkoutPath` is the actual current checkout path, not a stored path from an old task:

```javascript
// site came from a fresh get_site call for the exact selected project.
// Never text(), notify(), store(), stringify-to-output, or save this object.
if (site.id !== 'appgprj_6ad81952c5308191bb02200f3010c8c1'
    || site.current_live_url !== 'https://fundscope-research.patelvasuki.chatgpt.site'
    || typeof site.siwc_bypass_bearer_token !== 'string'
    || site.siwc_bypass_bearer_token.length === 0) {
  throw new Error('Selected Site identity or service access is unavailable.');
}

const launch = await tools.exec_command({
  cmd: 'node --use-env-proxy scripts/sync-cloud.mjs --site-url https://fundscope-research.patelvasuki.chatgpt.site --max-seconds 900 --max-batches 100',
  workdir: checkoutPath,
  tty: true,
  yield_time_ms: 1000,
  max_output_tokens: 1000,
});
if (!launch.session_id || !launch.output.includes('Ready for sync credentials on stdin (input is hidden).')) {
  throw new Error('Runner did not confirm hidden input. No credential was sent.');
}
const next = await tools.write_stdin({
  session_id: launch.session_id,
  chars: JSON.stringify({ serviceToken: site.siwc_bypass_bearer_token }) + '\n',
  yield_time_ms: 1000,
  max_output_tokens: 3000,
});
// next contains only runner output and a process session ID, if still running.
// Print/poll this safe result, never site or the credential-bearing chars value.
```

The runner calls Node's documented [`ReadStream.setRawMode(true)`](https://nodejs.org/api/tty.html#readstreamsetrawmodemode), which disables terminal input echo, before announcing readiness. It restores the previous raw-mode setting after reading the line or encountering a handled input failure. It also supports non-TTY input streams for controlled tests. The credential line is limited to 32 KiB, and input times out after 120 seconds.

Do not place credentials in command arguments, environment variables, shell history, temporary files, Git, task prompts, report text, or debugging logs. The runner has no token flag or environment fallback. Do not print raw HTTP headers, provider error bodies, or a raw Sites metadata result. Never call the token-generation/rotation tool or weaken authentication to recover a routine refresh. If a fresh current token produces HTTP 401 or 403, stop and report authorization failure. Credential rotation or server-secret replacement requires a separate explicit user request.

The same service token is sent only to the selected production origin in these headers:

| Layer | Header |
| --- | --- |
| Sites dispatch | `OAI-Sites-Authorization: Bearer <service token>` |
| Application sync writer | `x-fundscope-sync-token: <sync token>` |

The CLI rejects other hosts, HTTP production URLs, URL credentials, paths, query strings, fragments, and nonstandard origins. All requests set `redirect: 'error'`; no credential is forwarded to a redirect destination. Imported tests can explicitly opt into a loopback origin. That opt-in is unavailable in the CLI.

## Lifecycle, time limits, and retries

The runner performs these operations sequentially against the same origin:

1. `POST /api/sync/start` with an idempotency key such as `fundscope:2026-10-21:00`.
2. `POST /api/sync/step` with the returned `runId` and `limit: 20`, while the run is active and both work limits allow another batch.
3. `POST /api/sync/finish` to close the invocation while retaining durable outstanding work.
4. `GET /api/data/status` with cache bypass, validating the closed run identity, counts, dates, and schedule before claiming readback success.

The key is fixed for each UTC date and twelve-hour slot: `00` for 00:00–11:59 UTC and `12` for 12:00–23:59 UTC. Retrying within the same slot sends the same key. A running key resumes the durable run; a finished key returns its terminal result without performing another history loop. The next scheduled slot builds a new queue from durable coverage and unresolved work. Do not invent new idempotency keys to force extra work during an ordinary task.

`--max-seconds` is an integer from 1 through 900 and bounds start/step work using a monotonic clock. `--max-batches` is an integer from 0 through 100. Every request is capped at 40 seconds; start uses any shorter remaining work budget. Each history-step attempt, including a retry after backoff, requires a full 40 seconds remaining before it begins. Otherwise the runner stops with `time_limit` and checkpoints. This avoids aborting a fresh server step after only a few seconds while that step can still hold its durable lease. A work budget below 40 seconds intentionally permits only catalogue start and finalization, with no history steps. After work stops, finish and readback each receive a separate allowance of at most 40 seconds. Consequently an invocation can take up to its work budget plus 80 seconds after credential input; its maximum number of logical history steps remains 100.

Two consecutive steps with no advancing processed/failed/archive counts and no reduction in pending work cause a `no_progress` stop followed by finish/readback. This matters because pending includes unresolved failures even when the current queue is exhausted. An unfinished archive must not cause a tight unbounded loop.

Only HTTP **429, 502, 503, and 504** receive automatic retries, with at most two retries per logical request. Backoff starts at one second, then two seconds, and honors a valid `Retry-After` value. A requested delay exceeding 30 seconds causes a safe stop; the runner never retries earlier than that long server-directed delay. It also stops retrying when the relevant deadline would be exceeded. Requests that fail without a reliable HTTP status are not automatically replayed.

HTTP **401, 403, and 404** terminate immediately without further calls. Redirect, schema, identity, count-regression, and malformed-response failures also stop immediately. An ordinary transport or work-budget interruption after a run was identified can still be followed by finish/readback. The response-body limit is 64 KiB; history data is fetched and archived by the hosted server, not transmitted to this runner.

## Interpreting the summary

The last stdout line is a JSON object. It includes only validated counts, dates, fixed status/error codes, and verification flags. It omits raw run IDs, error strings, warnings, headers, and credential values. The process exits with code **0** for verified `completed` or `partial` results, and **1** for `failed`.

| Field | Meaning |
| --- | --- |
| `status` | `completed`, `partial`, or `failed`; never infer full history coverage from catalogue success alone. |
| `stopReason` | Fixed reason such as `completed`, `backlog_remaining`, `batch_limit`, `time_limit`, `no_progress`, or an error code. |
| `checkpointed` | The finish endpoint acknowledged a terminal result. |
| `readbackVerified` | A separate status read returned this closed run with valid, nonregressing durable counts. |
| `catalogueCount` | Number of schemes retained in the durable catalogue. |
| `archivedCount` | Number of schemes with saved histories. |
| `historyBacklog` | Schemes still awaiting archive coverage; a nonzero value means the physical archive is incomplete. |
| `observationCount` | Total durable historical observations counted by the server. |
| `lastCatalogueSyncAt` | Time of the last successful catalogue/latest-snapshot publication. |
| `latestNavDate` | Latest source observation date. This is not a synchronization timestamp. |
| `lastHistorySyncAt` | Time of the last successful historical archive write. |
| `processed` / `failed` | Cumulative counts for the matching run, not merely this CLI invocation. |
| `batches` / `requests` / `retries` | Work attempted by this invocation; request attempts include retry attempts. |
| `warningCount` | Number of server warnings, without copying potentially sensitive warning text into logs. |
| `httpStatus` | An HTTP failure status when available; error bodies are discarded. |

A successful catalogue with a remaining historical backlog is a valid **partial success**. A transport interruption can also produce partial success when the known run is checkpointed and durable readback succeeds. Report the stop reason and actual coverage. `completed` requires no reported backlog, no failed schemes, no pending work, and completed server state.

An idempotent replay can verify an earlier successful synchronization without creating a new synchronization timestamp. Report `lastCatalogueSyncAt` as returned; do not describe the current task's finish time as a new provider-data refresh. If final readback fails or disagrees with the checkpoint, the task reports failure and must not claim verified persistence from the preceding HTTP acknowledgement alone.

## Data coverage and preservation

Each new scheduled run requests MFAPI's all-scheme latest snapshot. That establishes catalogue/latest-NAV information; it does not represent a complete history download. History steps fetch the full available provider history for individual schemes, and the hosted D1/R2 archive persists it across browser sessions and cloud-task lifetimes. The server limits upstream concurrency and checkpoints successful history writes.

Backfill is resumable and can span many scheduled runs. Per-fund reads also make available the provider's full history on demand and save successful histories. There is no fixed one-, three-, or five-year storage cutoff. Coverage extends only as far as actual source observations; the application does not invent missing NAVs.

The archive preserves previously saved observations when a new provider response is unavailable, invalid, older, or truncated. A source correction can update an overlapping observation while retained older dates remain available. Schemes absent from the latest source catalogue remain retrievable from the archive. A failed catalogue refresh leaves the last valid snapshot and its original successful timestamp intact.

Only public MFAPI market data belongs in the shared archive. Browser watchlists, comparison selections, application preferences, and user-imported backups remain local to that browser. The updater neither reads nor uploads them.

## Failure handling and maintenance boundaries

| Condition | Action |
| --- | --- |
| Missing current Site token or inaccessible metadata | Stop and report the missing service access. Never print the metadata. |
| HTTP 401 / 403 | Stop. Do not generate a token, change the server secret, broaden Site sharing, or weaken the writer checks. |
| HTTP 404 | Stop and report that the selected deployed release lacks the expected endpoint. Code release correction is separate work. |
| `partial` with backlog or a work limit | Report catalogue timestamp, archive coverage, backlog, and stop reason. Let the next scheduled slot continue. |
| Transient failure after bounded retries | Report the safe failure or verified partial result. Durable checkpoints and last-good data remain the recovery point. |
| Schema, date, run-identity, or readback regression | Report `invalid_response`. Do not silently retry a structurally inconsistent result or claim success. |
| Runner interrupted before finish | A later invocation resumes or replays the same slot; do not reset the database or delete archive objects. |
| Requested GitHub code change | Make a reviewed, tested release through the supported Sites publication workflow. A GitHub commit alone does not deploy the Site. |

Ordinary invocations use the already configured twice-daily schedule. They do not create replacement schedules or duplicate tasks. Schedule administration should first inspect current schedules attached to this exact Site and preserve a single matching enabled arrangement. Source code and tests live in GitHub; hosted data synchronization writes D1/R2 state without changing Git or publishing a new code version.

## Local verification

The behavioral suite uses injected fetch, wall/monotonic clocks, and sleep, with dummy credentials only:

```bash
node --experimental-strip-types --test --test-isolation=none tests/sync-runner.test.ts
node --check scripts/sync-cloud.mjs
```

Run this file in its own process in environments that require disabled test isolation. Full dashboard financial and storage regression tests are part of release verification and do not need to be repeated on every scheduled data refresh.
