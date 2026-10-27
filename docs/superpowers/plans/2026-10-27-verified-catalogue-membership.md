# Verified Catalogue Membership Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Implement each testable task with failing tests before production changes.

**Goal:** Stop an incomplete bulk NAV cache from falsely removing currently listed schemes with verified NAV observations within the owner's 30-day repair window.

**Architecture:** The production GitHub collector will verify membership using the documented `/mf` scheme listing, independently of `/mf/latest`. Validate an unpaginated list and an empty terminal `limit=1&offset=<list length>` probe. Cross-check all bulk codes against the list; reject duplicate identities, unexpected shape, nonempty terminal probes or a list contraction greater than 10% of a substantial known catalogue. Preserve the previous catalogue on failures. Use existing bulk-NAV validation and retain existing observed NAV values/dates for listed codes omitted by the bulk cache; never synthesize a new price or date. Add explicit optional catalogue-level membership provenance and a warning about missing bulk observations. Existing snapshots remain readable. A production migration check refreshes membership once when provenance is absent.

**Tech Stack:** Existing TypeScript, Node test runner, GitHub Actions/Release archive. No new dependencies.

**Spec and evidence:** Issue #54; read-only run #40542284395 on 27 October 2026. `/mf/latest` returned 25,888 codes; `/mf` returned 37,998; the documented final 998-row page agreed with the unpaginated list. Exactly 5,391 omitted codes meet the existing official-roster/positive-retained-NAV/30-day conditions when their independently observed source-list membership is used. The OpenAPI contract at https://www.mfapi.in/docs/openapi.json documents listing pagination and describes the bulk NAV endpoint as a complete cached dataset with no pagination parameters.

## Global constraints

- Keep the exact manual official roster, actual UTC clock, finite positive NAV and inclusive 30-day repair cutoff. No history request outside scope.
- Preserve the website's separate seven-day recency rule and all raw source histories, warnings, retry times and checkpoint accounting.
- Source-list membership is not purchase eligibility. Retained NAV observations are not a new provider NAV fetch.
- Keep source request deadlines, bounded retries, global cooldowns, scheme/shard limits and the single-writer workflow unchanged.
- Do not automatically replace source prices, clear quality flags or call AMFI.

## Review focus

- Current listing with no NAV and a newly listed identity must never fabricate NAV or qualify for repair.
- Stale or future retained dates remain ineligible even after membership is verified.
- Failed/incomplete identity validation must not overwrite the earlier catalogue or advance its provenance timestamp.
- HTTP 429/503 and exhausted work time must stop additional requests through the existing transport guards.
- A previously damaged `current:false` catalogue must recover only for codes actually returned by the independently checked list, without touching excluded history records.

## Task 1 — Reproduce and repair membership ingestion

- [ ] Add `tests/catalogue-membership.test.ts`: seed real-shaped immutable snapshots; reproduce omitted recent codes, metadata-only recovery, failure preservation, missing/stale/future NAV exclusion, identity conflicts, duplicate and incomplete listings, source transport restrictions and cooldowns.
- [ ] Run baseline regression tests and record the actual failing behavior.
- [ ] Add `scripts/verified-catalogue.ts` to validate and combine listing and bulk evidence. Add optional membership provenance to `server/types.ts` and validate it in `scripts/archive-model.ts`.
- [ ] Integrate into `scripts/github-history-v2.ts` behind an explicit option enabled unconditionally by its production CLI; preserve unconfigured test/legacy callers. Whitelist only the exact required source paths.
- [ ] Run typecheck, full tests and both builds; review the complete diff.

## Task 2 — Verify real scope and delivery

- [ ] Run a bounded read-only before/after check against the saved checkpoint and fresh metadata; verify original records/states are unchanged and eligibility remains strict.
- [ ] Update operational instructions and issue #54 with the precise provenance and limitations.
- [ ] Merge only with passing checks and real metadata evidence. Verify a new saved checkpoint and publication separately; do not claim restoration from CI alone.
