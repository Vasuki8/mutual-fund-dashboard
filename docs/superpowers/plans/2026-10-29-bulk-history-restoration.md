# Bulk History Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Restore the 303 issuer-verified SBI Infrastructure observations to calculations and finish the full remaining-case investigation pass.

**Architecture:** Add a history-restoration variant to the existing verified NAV review. Preserve raw observations and use exact identity, warning, anchor and whole-series guards. Reuse existing provenance consumers.

**Tech Stack:** TypeScript, React, Node's test runner, existing GitHub connector delivery.

**Spec:** `docs/superpowers/specs/2026-10-29-bulk-history-restoration-design.md`

## Global Constraints

- Scope and financial rules in `AGENTS.md` remain binding.
- Base commit is `056ac7d2bee9edd733d45182385152c218ece6c8`; checkpoint is 214.
- Only scheme `106096`, exact ISIN `INF200K01CT2`, is selected for code changes.
- No source row is deleted or modified; exactly 303 original issuer rows are added to the reviewed calculation series.
- No source-warning waiver, AMFI download, collector dispatch, schedule change or archive mutation.

## Review Focus

- Wrong fund identity must not gain a restoration; cover every metadata field in core rejection tests.
- A partial or conflicting source window must fail closed; cover added/interfering observations and changed anchors.
- A second defect elsewhere in the full series must remain blocked; cover independent warnings and extra jumps.
- Review must preserve raw chart/export data and show provenance in calculation exports; cover real component handlers.
- Previously repaired and unselected histories must retain their complete results; compare all 610 full fixtures.

### Task 1: Exact issuer history restoration

**Files:** create `src/lib/verified-sbi-infrastructure-history.ts`, `tests/fixtures/sbi-history-review.ts`, `tests/verified-history-restoration.test.ts`; modify `src/lib/verified-nav-reviews.ts`.

**Interfaces:** `VerifiedNavReview` gains a mutually exclusive `restoration` record; `navReviewEvidenceUrl(review)` returns the review's primary source link. `reviewedNavBasis(fund)` retains its existing signature. `navReviewSummary` describes either exact correction or history restoration.

- [x] Write tests for adding all 303 literal issuer records, retaining all seven anchors, immutability, exact identity/warnings, conflicting/partial windows and extra full-series defects.
- [x] Run the focused file and verify failure because no restoration exists.
- [x] Implement the small data module and exact guarded restoration. Retain existing correction behavior.
- [x] Run the focused core and prior correction tests; require all to pass.

### Task 2: Consumer provenance

**Files:** modify `src/lib/format.ts`, `src/components/FundDetail.tsx`, `src/components/Comparison.tsx`, `src/components/SipSimulator.tsx`, `tests/verified-nav-review-views.test.ts`.

**Interfaces:** consume `navReviewEvidenceUrl` through `format.ts`; existing `navReviewSummary` and `events` interfaces remain available to every CSV consumer.

- [x] Add real-component tests for detail/raw versus calculation data, comparison and SIP provenance; verify RED before consumer changes.
- [x] Use the shared evidence-link helper in the three direct link consumers.
- [x] Run view and core regressions, typecheck, full isolated suite and production builds.

### Task 3: Complete batch accounting and release

**Files:** new closure report and evidence summaries under `docs/`; no collector code changes.

- [x] Reconcile every source capture's byte count/hash and run production validation; classify all 77 source cases and all 27 historical cases.
- [ ] Compare the full 610-history cohort against the frozen exact main tree; only `106096` may change calculation output, and every raw fixture must remain identical.
- [x] Obtain fresh independent whole-patch review and address substantive findings with regression proof.
- [ ] Publish the exact reviewed tree to a focused PR; verify CI, merge under existing authorization, and verify Pages deployment and artifact/live agreement.
- [ ] Report actual delivered observations and the exact unresolved count without claiming unsupported completion.

Pre-merge state: Tasks 1–2 and investigation/audit/review are complete. The final 1,714-test suite, typecheck and both builds pass. Remaining release and user-report checkboxes are closed by the PR release evidence after merge, without a circular source-only post-deployment commit. Existing user authorization covers PR, merge and deployment.
