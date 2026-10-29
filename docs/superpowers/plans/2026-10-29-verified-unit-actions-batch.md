# Verified Unit Actions Batch Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` for implementation, then obtain an independent whole-branch review. Preserve the evidence and completion record.

**Goal:** Deliver a larger reviewed batch of 27 independently supported calculation-only unit adjustments. Sixteen Growth identities become eligible for detail/comparison analytics; eleven ETF identities retain the documented consumer block.

**Architecture:** Add exact identities to the existing corporate-action registry. Keep common matching, validation, warning and calculation logic intact. Use documented factors and each saved series' actual adjacent NAV dates.

**Tech stack:** TypeScript, Node's test runner, existing GitHub checks and Pages deployment.

**Spec:** `AGENTS.md` and `docs/VERIFIED_UNIT_ACTIONS_BATCH_2026-10-29.md`.

## Global constraints

- Base: current main `7a07a8d7f415088923c86ebc3f60d8a06e3752c7`.
- Apply the production active-repair predicate using the actual UTC date; inspect complete saved histories.
- Preserve raw observations, dates, archive flags, source warnings, catalogue acceptance and the seven-day website filter.
- Require exact code, source name, fund house, current `isinGrowth`, adjacent dates and one matching discontinuity.
- Preserve the documented Growth/distribution eligibility gate. A unit-action registration does not independently authorize displayed ETF returns.
- No automated AMFI requests, source retries, importer changes, dependencies or layout changes.
- Use one focused branch and PR. Merge only after tests, builds and independent review; verify the actual deployment.

## Review focus

- A similar name, another plan, a swapped identity or UTI's old ISIN must not acquire an adjustment.
- Legal dates do not replace observed NAV boundaries. Three ABSL debt series end their old basis on 5 October; Money Market ends on 6 October. Invesco's observed interval is 18–22 April 2013.
- Gold ETF factors are 0.01; other ETF factors are 0.1; Birla debt consolidations are 10 and Invesco consolidations are 100. Apply the documented factor, never a fitted NAV ratio.
- Extra discontinuities, invalid/conflicting observations, malformed dates and mismatched warnings remain blocked.
- Raw inputs and post-event values remain intact. Crossing periods change correctly; wholly post-event periods do not.
- Invesco legacy codes 105189 and 112120 remain deferred despite matching historical NAV anchors, because their exact primary code/ISIN mappings are missing.

## Task 1: Register and test the initial seventeen identities

**Files:** modify `src/lib/corporate-actions.ts`; create `tests/verified-unit-actions-batch.test.ts`.

**Interface:** keep `financialNavBasis(fund: FundData): FinancialNavBasis` unchanged.

- [x] Write literal source-backed fixtures and assertions for 17 identities, covering immutability, event return, identity/date/factor/warning guards, additional quality failures and repeat-application refusal.
- [x] Run tests against the immutable base: 190 cases, 102 passing and 88 expected missing-adjustment failures.
- [x] Add four narrow registry groups: Nippon December 2019 ETFs (six), Birla October 2011 debt Growth options (four), ABSL November 2021 ETFs (five), UTI June 2026 Liquid Growth plans (two).
- [x] Use ETF factor-relative tolerance 5%; use Birla/UTI factor-relative tolerance 0.1%. Keep common machinery unchanged.
- [x] Verify 190/190 new tests, 52/52 existing targeted action tests and all 17 saved histories / 60,757 observations.

## Task 1b: Expand with ten fully identified Invesco Growth plans

- [x] Confirm the issuer's May 2013 event, exact 31 May NAV anchors, ten primary code/ISIN bindings and documented renamings. Defer 105189 and 112120.
- [x] Add ten literal fixtures with independently computed decimal expectations, plus same-name legacy refusal and consumer eligibility tests. Before implementation, the expanded 303-case run passes 252 and fails 51 expected missing-adjustment assertions.
- [x] Register the ten exact identities at the observed 18–22 April 2013 boundary, using factor 100 and absolute tolerance 0.5 (0.5% relative). Preserve ordinary movement over the four-day interval.
- [x] Verify 303/303 tests and 27 full saved histories / 99,249 observations / 22 authenticated assets. The production Growth predicate admits 16 selected identities and continues to block 11 ETFs. Both deferred legacy plans remain unadjusted.
- [x] Confirm that removing the 94 new registry lines reproduces the original production file byte-for-byte, and that the initial 17 calculation results are unchanged.

## Task 2: Record evidence and batch workflow

**Files:** create `docs/VERIFIED_UNIT_ACTIONS_BATCH_2026-10-29.md`; update `AGENTS.md`.

- [x] Record primary sources, exact identity chains, historical NAV anchors, actual series boundaries, asset hashes and full-history checks.
- [x] Distinguish the checkpoint-210 universe scan from the selected histories verified against published checkpoint 213.
- [x] Record the owner's preference for larger reviewed batches without relaxing per-fund evidence or setting a repair quota.
- [x] Correct the initial review finding: registration alone does not enable the eleven ETFs. Preserve the Growth-only rule and state the sixteen eligible Growth outcomes precisely.

## Task 3: Review, integrate and deploy

- [ ] Complete independent review of the final immutable branch, including the Invesco expansion and corrected outcome wording.
- [ ] Run the complete GitHub suite, typecheck and both builds on the expanded exact head. Initial-head checks passed 938 tests and both builds; that is not a substitute for final-head CI.
- [ ] Merge the reviewed head and verify the Pages deployment URL, SHA and published archive checkpoint.
- [ ] Record final immutable-head, review, CI and deployment evidence in PR #71 and the completion report.
