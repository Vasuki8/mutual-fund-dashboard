# Persistent Market Data Implementation Plan

> For agentic workers: implement the assigned task and exact shared contracts; root owns integration, repository synchronization and publication.

**Goal:** Move FundScope development to GitHub and make all available NAV history accessible with durable, twice-daily market-data updates.

**Architecture:** Supported Vinext hosting wrapper around the existing UI; D1 indexes and R2 histories; authenticated bounded sync endpoints; a credential-free Node runner used by a linked cloud schedule.

**Tech Stack:** React 19, TypeScript, Vinext, Cloudflare D1/R2, Drizzle, Node tests.

**Spec:** ../specs/2026-10-21-persistent-sync-design.md

## Global Constraints

- Preserve Site ID, approved light UI and existing owner-private audience.
- GitHub repository is Vasuki8/mutual-fund-dashboard; no secrets in Git or task prompts.
- MFAPI only. Full source history; no arbitrary horizon cutoff or deletion of older/absent schemes.
- Last refresh, last NAV date and physical archive coverage are separate values.
- Bounded upstream concurrency two; checkpoint each history batch; preserve the last good data on failure.

## Review Focus

- A small/truncated/failed provider response must not silently erase a valid catalogue or history.
- Concurrent on-demand and scheduled reads must not downgrade a newer history.
- An interrupted sync must resume without resetting coverage or falsely claiming completion.
- Unauthorized sync calls must not mutate any data or trigger provider work.
- Scheduled task credentials must be retrievable without writing them to files or exposing them in output.

## Task 1 — Persistent server data and API

Files: server/*, db/schema.ts, app/api/**, tests/server-*.test.ts.
Consumes src/lib/sync-types.ts and existing scheme/date contracts. See docs/implementation/server-brief.md for endpoint shapes.
- [ ] Add meaningful failing tests for normalization, history preservation, auth, persistence ordering and checkpoint recovery.
- [ ] Implement full-history archive, latest catalogue snapshots, status/search/read routes and bounded sync writes.
- [ ] Generate schema migrations with db:generate after schema is stable.
- [ ] Run scoped tests and provide an implementation report.

## Task 2 — Unattended runner and operations

Files: scripts/sync-cloud.mjs, tests/sync-runner.test.ts, docs/SYNC_OPERATIONS.md.
Consumes authenticated /api/sync endpoints and SyncStatus. See docs/implementation/runner-brief.md.
- [ ] Verify the runner stops on unauthorized/fatal responses and resumes bounded work without leaking credentials.
- [ ] Implement stdin-only credential ingestion, bounded requests, retries and readback.
- [ ] Document retrieval/access, timing, honest coverage and recovery for a fresh cloud task.

## Task 3 — UI, source and deployment integration

Files: app wrapper/config, src/lib/api.ts/types.ts, src/components/DataStatus.tsx, Home/Methodology/FundDetail, .github/workflows/ci.yml, README.
- [ ] Route browser data reads through the hosted adapter with explicit provenance.
- [ ] Display source timestamps and archive counts; keep local watchlist/backups distinct from shared market data.
- [ ] Add GitHub CI, verify old/new tests, typecheck/build and focused browser flows.
- [ ] Review integrated changes, synchronize source to GitHub and Sites, publish, run authenticated sync and verify persistence.
- [ ] Create exactly one matching enabled twice-daily linked schedule after fresh duplicate checking.
