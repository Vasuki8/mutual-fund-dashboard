# Standalone sync runner implementation report

## Files owned and changed

- `scripts/sync-cloud.mjs`: standalone Node 24 CLI plus exported `runCloudSync`, `readCredentials`, `parseArgs`, and `main` functions.
- `tests/sync-runner.test.ts`: 32 scoped behavioral tests with fake hosted responses, injected time, real Node streams, and dummy tokens.
- `docs/SYNC_OPERATIONS.md`: complete fresh-task runbook, exact Site/repository identity, credential handoff, timing, recovery, coverage, and release boundaries.
- This report.

No dependency installation, Git changes, deployment, credential configuration, or schedule mutations were performed by this task. Other repository files are owned by the parent/server tasks.

## Implemented behavior

Credentials enter only as one bounded JSON line on stdin. For TTY input, Node raw mode disables echo before readiness is emitted, then the previous state is restored. The CLI offers no token flags or environment fallback. It supports the exact production origin only, refuses redirects, and sends both platform and app authentication headers. Explicit loopback allowance exists only on the imported testable API.

The runner fixes its idempotency key to the UTC date and twelve-hour slot, performs bounded start/step work, checkpoints through finish, and validates a separate durable status read. Terminal replay skips history work. Two nonadvancing batches stop exhausted or stalled queues. Start/step work is limited to 1–900 seconds and 0–100 batches; each request is at most 40 seconds. Every history-step attempt, including a retry after backoff, requires the full 40 seconds still available before starting, preventing a shortened client timeout from leaving an active server lease during immediate finalization. Finish and readback each have a separate 40-second allowance after the work budget. The default real budget uses a monotonic clock, independently of UTC dates.

HTTP 401/403/404 and integrity failures stop immediately. HTTP 429/502/503/504 alone receive at most two retries, using bounded exponential backoff and Retry-After without retrying early when the provider asks for more than 30 seconds. Network errors are not blindly replayed. Known interrupted runs can still checkpoint and report verified partial success. All results are sanitized counts, dates, fixed codes, and verification flags; response bodies, arbitrary warnings/errors, raw identifiers, and token values are omitted.

## Verification evidence

Initial red run: all 23 initial tests failed on the absent runner, with the explicit assertion that the standalone module must be importable without CLI side effects. The first implementation passed 22 of those 23. The remaining test attempted a Node child process; investigation showed this environment returns `EPERM` from `spawnSync` with empty stdout/stderr. The test now invokes the exported CLI entry point with real streams, and a separate tool-launched CLI smoke check validates the actual command path.

Additional red/green checks exposed and then fixed two concrete issues: using wall time alone could miss an elapsed work budget, and a regressed durable readback could be accepted behind the acknowledged finish counts. Tests now cover both boundaries.

Release review identified a further deadline edge: starting a new history step at 895 seconds of a 900-second budget would abort it after five seconds, potentially before its server lease expired. Two additional regression tests first failed and then passed after requiring a full 40-second allowance for both new steps and retry attempts. The retry test also verifies that the backoff wait is included in the reservation and is skipped when the subsequent attempt would not fit.

Final scoped command:

```bash
node --experimental-strip-types --test --test-isolation=none tests/sync-runner.test.ts
```

Result: **32 tests passed, 0 failed**, including a real one-second deadline cancellation. The suite covers missing/malformed credentials, both auth layers, exact origin selection, no secret leakage, fatal HTTP responses, bounded retries/Retry-After, capped batches, UTC-slot idempotency, monotonic time, full step-time reservation and retry reservation, stalled queues, terminal replay, truthful partial status, final readback and count regression, schema/date/identity failures, redirects, response-size bounds, network-error sanitization, TTY readiness ordering, and echo-setup failure.

Actual CLI smoke check: `node scripts/sync-cloud.mjs` received deliberately invalid dummy JSON through a shell stdin stream. It printed the non-TTY readiness line and a single safe JSON failure with `stopReason: "credentials_invalid"`, no input content or stack trace, and exit status 1.

Actual TTY smoke check: the tool launched `node scripts/sync-cloud.mjs --max-seconds 1 --max-batches 0` with a real TTY. After hidden-input readiness appeared, a deliberately invalid dummy JSON record was sent through stdin. The response contained only the safe JSON failure, did not echo the dummy input, and exited 1. No network request or real credential was used. `node --check scripts/sync-cloud.mjs` also passed.

Proxy launch update: the installed Node 24.19 binary advertises and accepts `--use-env-proxy`; the Node CLI documentation identifies support from 24.5. Normal runbook commands, the cloud handoff example, and CLI help now use `node --use-env-proxy scripts/sync-cloud.mjs`. This respects existing proxy environment settings without printing or replacing them. A credential-free network probe from this subagent sandbox returned a sanitized `EPERM` cause; actual authenticated network verification remains with the parent task. No network, proxy, TLS, or authentication settings were changed.

## Integration notes and limits

- The verified local suite does not replace the parent's authenticated hosted write/readback verification after publication.
- A finished UTC-slot key is replayed, not reopened. A new scheduled slot continues backlog and durable retries.
- `checkpointed` reflects finish acknowledgement; `readbackVerified` additionally confirms the matching terminal run and nonregressing durable counts.
- Catalogue success with remaining history backlog reports `partial` and exit 0. A failed readback reports `failed`; it does not claim persistence from an earlier acknowledgement alone.
- The runbook identifies Site `appgprj_6ad81952c5308191bb02200f3010c8c1`, canonical repository `Vasuki8/mutual-fund-dashboard`, and daily 05:37/17:37 UTC execution. Deployment and schedule activation remain the parent's responsibility.
- Parent owns the full financial/client regressions and production build. This task ran only the scoped runner tests as requested.
