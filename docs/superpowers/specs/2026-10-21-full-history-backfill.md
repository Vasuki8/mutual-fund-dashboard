# Full-history import in tranches

## Outcome

The user requested an import of all available MFAPI mutual-fund history, in multiple tranches when one operation is impractical. Extend the existing persistent importer. Keep GitHub as the development source and preserve the approved dashboard design and Site access.

MFAPI documents history per scheme. Retrieve each scheme's entire available response without a date cutoff. Preserve existing observations, source corrections, quality warnings, and missing-data distinctions.

## Execution

Use the existing linked automation, temporarily hourly at minute 37. Run one tranche immediately after release. Each tranche uses the existing maximum 900-second work budget, 100 history steps, two concurrent provider requests, bounded retries, and durable checkpoints. These are application limits, not a platform runtime guarantee.

Add `--mode backfill` to the committed runner and a validated optional `mode` on `/api/sync/start`. The default remains `refresh`. Backfill invocation keys use `fundscope:backfill:<UTC date>:<HH37>` for the most recent hourly occurrence; retries retain that key. Existing twice-daily identifiers retain their behavior.

Backfill queues prioritize schemes with neither an archive nor a failure record. They then include due failures without saved history with fewer than three recorded attempts. Already saved histories do not consume accelerated queue slots. Normal refresh retains its existing queue and retry behavior.

## Durable status

Use existing D1 state and R2 queue objects; no schema migration or new service. Store run mode in the queue, treating legacy queues as refresh. Persist backfill activation and completion with the existing sync lease and a latest-run fence. A replay or old finish must not overwrite a newer controller state.

The additive `backfill` status block contains `active`, `attemptedCount`, `unattemptedCount`, `retryPendingCount`, `exhaustedCount`, `unresolvedSavedCount`, `remainingCount`, `maxAttempts: 3`, `startedAt`, and `completedAt`.

- `attemptedCount = catalogueCount - unattemptedCount`.
- `catalogueCount = archivedCount + unattemptedCount + retryPendingCount + exhaustedCount`.
- `remainingCount = unattemptedCount + retryPendingCount`.
- Retry-pending includes retries whose wait time has not elapsed.
- Exhausted means no saved history after at least three recorded attempts. It does not mean permanent source unavailability.
- Unresolved saved histories retain the existing quality/coverage flags.

Acceleration finishes only with a nonempty catalogue, zero remaining work, and a verified closed run. Completion of this pass is distinct from complete, valid source coverage. Missing and questionable histories remain reported and available for normal follow-up.

While active, the API publishes all 24 UTC `HH:37` planned times. Once complete, it publishes the original `05:37` and `17:37` times. The existing task restores its original twice-daily timing after validated completion. If restoration fails, later invocations retry restoration and do not claim that it succeeded.

## UI and operations

Keep the saved-history coverage bar. Add checked-scheme counts, outstanding first attempts, pending retries, exhausted missing histories, and explicit completion-with-gaps copy. Preserve the qualified last-reported running state. A scheduled time remains planned, not evidence of execution.

Use one linked task to avoid competing importers. Future tasks read the committed runbook and runner, obtain fresh supported service access, run one bounded tranche, verify readback, and restore the original schedule when eligible. Never store credentials in source, task instructions, logs, or files.

## Acceptance

Tests cover queue priority, continuation, retry waits/exhaustion, source gaps, old-run races, exact hourly keys, invalid inputs, backwards compatibility, and UI accounting. TypeScript, the full suite, production build, independent review, GitHub checks, deployment, a real tranche, durable readback, and enabled schedule readback are required before reporting operational completion.
