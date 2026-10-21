# Full-history Backfill Implementation Plan

> **For agentic workers:** Use the development execution workflow with isolated file ownership and an independent final review. Steps use checkbox syntax for tracking.

**Goal:** Import every known scheme's full available history in resumable hourly tranches, then return to twice-daily refresh.

**Architecture:** Extend the existing authenticated HTTP importer, D1 attempt ledger, and R2 history archive. One linked automation controls cadence. An explicit backfill mode prioritizes unseen schemes and performs bounded retries without rewriting stored history rules.

**Tech Stack:** Node 24, TypeScript, React, Vinext, Cloudflare D1/R2, GitHub, linked Site automation.

**Spec:** `docs/superpowers/specs/2026-10-21-full-history-backfill.md`

## Global constraints

- Keep the existing Site identity, audience, credentials, and storage bindings.
- Use `900` seconds and at most `100` steps per scheduled tranche.
- Preserve two-request provider concurrency, provider backoff, and full-history retention.
- Require three recorded attempts before classifying an unsaved scheme as exhausted for this accelerated pass.
- Hourly keys identify the most recent `:37` occurrence and remain fixed through retries.
- Preserve the existing daily `05:37` and `17:37` UTC refresh contract after acceleration.
- No new dependency, schema migration, or external service.

## Review focus

1. A future retry time must not make remaining work appear complete.
2. A failed scheme must not monopolize later tranches or block unseen schemes.
3. An old run's finish/replay must not stop a newer backfill run.
4. A completed pass with source gaps must not imply validated full coverage.
5. A late/manual invocation must not consume the next scheduled tranche.

## Task 1: Backend queue and durable controller

**Files:** `server/archive.ts`, `server/types.ts`, optional `server/backfill.ts`, `src/lib/sync-types.ts`, server tests.

**Produces:** Optional start mode; additive `SyncStatus.backfill` with the exact fields in the spec; hourly/daily planned schedule metadata; legacy-compatible queue objects.

- [x] Write failing cases for unseen-first priority, failure continuation, future retry waits, three-attempt exhaustion, replay/old-finish races, mode validation, and completion with gaps.
- [x] Run the focused server cases and confirm the new assertions fail before implementation.
- [x] Implement mode selection, counters, and lease-fenced controller state using existing storage.
- [x] Run the server suite in one process and verify existing refresh/preservation behavior.

## Task 2: Runner mode and verification

**Files:** `scripts/sync-cloud.mjs`, `tests/sync-runner.test.ts`.

**Consumes:** Task 1's start mode and backfill block.
**Produces:** `--mode refresh|backfill`, validated backfill summary, and `backfillComplete` separate from full-coverage status.

- [x] Write failing cases for hourly boundaries, UTC rollover, retry-fixed keys, CLI validation, malformed/missing counters, and completion with gaps.
- [x] Run the focused cases and confirm the expected missing-feature failures.
- [x] Add the mode while preserving the exact legacy refresh payload and identifiers.
- [x] Validate counter identities, timestamps, lifecycle, and the exact two supported schedule patterns before reporting completion.
- [x] Run the complete runner suite and syntax check.

## Task 3: Dashboard status

**Files:** `src/components/DataStatus.tsx`, `src/lib/archive-status.ts`, `tests/archive-status.test.ts`.

**Consumes:** The optional validated backfill block and planned schedule.

- [x] Write failing cases for hourly waiting, first-pass completion with gaps, accounting validation, legacy fallback, and next hourly times.
- [x] Add concise checked/remaining/retry counts without changing the approved layout or treating attempts as saved coverage.
- [x] Run focused tests and TypeScript.

## Task 4: Publish and run the import

**Files:** `docs/SYNC_OPERATIONS.md`, `README.md`, release verification notes.

- [x] Document activation, credential-safe execution, tranche keys, counter meanings, restoration, and failure behavior.
- [x] Run the full suite, TypeScript, and production Worker build.
- [x] Complete independent review and fix material findings with regression cases.
- [ ] Publish the tested tree through a GitHub PR; merge after checks pass.
- [ ] Deploy the exact matching source tree to the existing Site.
- [ ] Run an immediate bounded tranche with fresh supported access and verify stored results.
- [ ] Reuse the existing linked task for hourly continuation; verify the saved enabled state and timing.
- [ ] Report exact achieved coverage, unresolved gaps, and the enabled continuation schedule. Do not claim the entire archive is already imported.

## Execution record

- User explicitly authorized import in multiple tranches. Routine implementation, GitHub publication, deployment, and the necessary recurring continuation proceed under that authorization.
- Baseline: GitHub main `60f38b7faad15495ef230af6e86989d5880d8fa5`; Site version 5; 297 saved histories and 1,039,170 observations at the prior verified snapshot.
- Backend, runner, and UI have separate file owners. Root owns integration, documentation, publication, and live operations.
- Verification: all eight test files, TypeScript, and the production Worker build passed. Independent review found no material issues and independently passed 122 focused backend, runner, and dashboard tests. Live persistence and saved automation timing remain the release acceptance checks.
