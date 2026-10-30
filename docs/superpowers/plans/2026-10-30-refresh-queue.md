# Refresh Queue Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for implementation. Steps use checkbox syntax for tracking.

**Goal:** Let due clean histories catch up without a shard budget consumed entirely by saved quality/error retries.

**Architecture:** Narrow one existing selector priority. Keep the collector, progress proof and controller interfaces unchanged.

**Tech Stack:** TypeScript, Node 24, existing Node test runner and GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-30-refresh-queue-design.md`.

## Global constraints

Preserve active-only eligibility, raw histories and flags, retries, source cooldowns, 512 schemes, 16 shards, two workers, persistence reserve, sequence fences and bounded continuation. Make no workflow or controller change.

## Review focus

Verify first attempts, recent missing histories, saved source-error backoff, quality-only stopping and shared-shard behavior. The existing suites already cover scope boundaries, cooldowns and progress-proof validation; retain those tests.

## Task: Correct selector priority

**Files:** `scripts/github-history-v2.ts`, `tests/github-history-v2.test.ts`, `docs/GITHUB_ARCHIVE.md`, and this design/plan pair.

**Interface:** Keep `selectWork(catalogue, states, now, maxSchemes, maxShards)` and `runTranche(options)` unchanged.

- [x] Add a failing 16-shard selection regression and a collector-to-controller regression using the existing in-memory store. Expect a clean catch-up request, reduced refresh backlog and a verified successor, with quality histories retained.
- [x] Run the new tests against the unchanged selector and record the expected failure.
- [x] Restrict recent lag priority to clean, unflagged states. Update the documented follow-up order.
- [x] Run the affected tests, full `node --experimental-strip-types --test tests/*.test.ts` suite and `pnpm exec tsc --noEmit --incremental false`. Replay checkpoint 238 without source requests.
- [ ] Obtain independent review, publish a focused PR, and verify CI on its exact head before merging. Verify the ordinary push-triggered collector and live publication after merge.
