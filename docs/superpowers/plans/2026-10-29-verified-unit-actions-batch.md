# Verified Unit Actions Batch Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` for implementation, then obtain an independent whole-branch review. Preserve the evidence and completion record.

**Goal:** Deliver a larger reviewed batch of 17 independently supported calculation-only unit adjustments.

**Architecture:** Add exact identities to the existing corporate-action registry. Keep the common matching, validation, warning and calculation logic intact. Use the documented factors and each saved series' actual adjacent NAV dates.

**Tech stack:** TypeScript, Node's test runner, existing GitHub checks and Pages deployment.

**Spec:** `AGENTS.md` and `docs/VERIFIED_UNIT_ACTIONS_BATCH_2026-10-29.md`.

## Global constraints

- Base: current main `7a07a8d7f415088923c86ebc3f60d8a06e3752c7`.
- Strict production active-repair predicate evaluated on the actual UTC date; inspect complete saved histories.
- Preserve raw observations, dates, archive flags, source warnings, catalogue acceptance and the seven-day website filter.
- Require exact code, current name, fund house, Growth ISIN, adjacent dates and one matching discontinuity.
- No automated AMFI requests, source retries, importer changes, dependencies or layout changes.
- Use one focused branch and PR. Merge only after tests, builds and independent review; verify the actual deployment.

## Review focus

- A similar name, another plan, a swapped identity or UTI's old ISIN must not acquire an adjustment.
- Legal dates do not replace the observed NAV boundaries; three ABSL debt series end their old basis on 5 October, while Money Market ends on 6 October.
- Gold ETF factors are 0.01; other ETF factors are 0.1; debt consolidations are 10. Apply the documented factor, never a fitted NAV ratio.
- Extra discontinuities, invalid/conflicting observations, malformed dates and mismatched warnings must remain blocked.
- Raw inputs and post-event values remain intact; periods crossing a split change correctly and wholly post-event periods do not.

## Task 1: Register and test the supported identities

**Files:** modify `src/lib/corporate-actions.ts`; create `tests/verified-unit-actions-batch.test.ts`.

**Interface:** keep `financialNavBasis(fund: FundData): FinancialNavBasis` unchanged.

- [x] Write literal, source-backed fixtures and assertions for all 17 exact identities. Verify immutability, event return, identity/date/factor/warning guards, additional quality failures and repeat-application refusal.
- [x] Run the new tests against the immutable base; confirm positive adjustment assertions fail because these identities are not registered.
- [x] Add four narrow registry groups: Nippon December 2019 ETFs (six), Birla October 2011 debt Growth options (four), ABSL November 2021 ETFs (five), UTI June 2026 Liquid Growth plans (two).
- [x] Use ETF factor-relative tolerance 5%; use debt factor-relative tolerance 0.1%. Keep all common machinery unchanged.
- [x] Run the regression tests and existing action tests. Verify all 17 full saved histories against independently calculated values, including cross-event trailing returns.

## Task 2: Record evidence and batch workflow

**Files:** create `docs/VERIFIED_UNIT_ACTIONS_BATCH_2026-10-29.md`; update `AGENTS.md`.

- [x] Record issuer/exchange/depository sources, exact identity chains, event versus observed dates, historical NAV anchors, full-history checks and asset hashes.
- [x] Distinguish the checkpoint-210 universe scan from the selected histories verified against published checkpoint 213.
- [x] Preserve the user's preference for larger reviewed batches without weakening per-fund evidence requirements or setting a repair quota.

## Task 3: Review, integrate and deploy

- [ ] Review the complete branch independently and resolve material findings.
- [ ] Run the complete GitHub test suite, typecheck and both builds on the exact branch head.
- [ ] Merge the reviewed head and verify the Pages deployment URL, SHA and published archive checkpoint.
- [ ] Record the final evidence and any remaining source limitations in the PR and completion report.
