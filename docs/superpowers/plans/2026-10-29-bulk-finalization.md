# Bulk discrepancy finalization implementation plan

> **For agentic workers:** Use `superpowers:executing-plans` for implementation, with independent research and a fresh whole-branch reviewer. Complete the existing authorized workflow without another approval stop.

**Goal:** Resolve every remaining supported active-scope discrepancy, preserve unsupported cases explicitly, and deploy only verified calculation fixes.

**Architecture:** Add an exact BOI calculation-review path alongside existing unit adjustments. Keep raw data immutable and carry correction/economic-event provenance into views and exports. Independently investigate remaining unit cases and original source warnings.

**Tech stack:** Existing TypeScript, React, Node 24 and pinned pnpm 11.25.0; no new dependency.

**Spec:** `docs/superpowers/specs/2026-10-29-bulk-finalization-design.md` and `AGENTS.md`.

## Global constraints

- Strict existing official roster, independently verified catalogue membership and positive NAV within 30 actual UTC calendar days; investigate full histories.
- Raw source/warnings/errors/excluded histories preserved; no interpolation or unsupported adjustment.
- No AMFI downloads, collector overlap/reset/restart, source-pause bypass, gate/schedule change, old hosted importer or declined browser-auth retry.
- Preserve Atlas palette, sidebar/table, seven-day discovery and literal Growth policy.
- Commit through immutable GitHub tree/commit operations from exact main; the local mirror is not a git checkout.

## Review focus

1. Unknown revised event values and inserted observations must fail closed, even when the total jump count remains two.
2. Already-corrected input and repeated downstream analysis must not repeat a correction or erase unrelated provenance.
3. Economic loss/recovery returns must remain numerically present in NAV, drawdown and SIP calculations.
4. Raw CSV/plots and derived CSVs must use their respective original/reviewed bases and accurately label them.
5. Unselected histories and future unrelated events must retain exactly their previous behavior; source-warning cleanup is not implied by a release.

## Task 1 — exact BOI basis and primary proof

Files: create `src/lib/verified-nav-reviews.ts`, `tests/verified-nav-reviews.test.ts`; modify `src/lib/corporate-actions.ts`.

Interface: `reviewedNavBasis(fund: FundData): {fund: FundData; review: VerifiedNavReview} | null`, and `navReviewSummary(review: VerifiedNavReview): string`; optional `review` in `FinancialNavBasis`. `VerifiedNavReview` identifies scheme, exact-date source/verified NAV and whether substituted, and separately identified economic events with primary links.

- [x] Independently inspect primary documents and exact identity/NAV evidence; record hashes/pages and qualifications.
- [x] Add literal tests through existing `financialNavBasis`, expecting Regular 9.6296→10.2756 and Direct 9.7667→10.4219 only on 31 March 2022, retained loss/gain returns, immutable raw evidence, and all rejection conditions in the spec.
- [x] Run the focused test before implementation; expected missing-review/correction failures, with current rejection behavior passing.
- [x] Implement the smallest separate review module and delegation; keep all existing unit behavior unchanged.
- [x] Run focused and existing registry tests; expect all pass.

### Task 1 evidence extension — ABSL exact source correction

- [x] Add literal tests for 106873/119517 and exact 9/10/11 April 2019 primary values, unknown revisions, missing/consecutive anchors, warning guards and zero remaining jumps. Capture RED before implementation.
- [x] Add the case-specific pure correction path to verified-nav-reviews, `events:[]`, without changing BOI or unit behavior.
- [x] Recheck official internal codes and numeric-code/ISIN mapping independently; record primary hashes.

## Task 2 — honest display and derived exports

Files: modify `src/components/FundDetail.tsx`, `src/components/Comparison.tsx`, `src/components/SipSimulator.tsx`, and expose the summary through `src/lib/format.ts` if needed. Add `tests/verified-nav-review-views.test.ts`. The accepted independent-review finding extends provenance to the actual nested CSV handlers in `PlanComparison.tsx`, `SelectedPeers.tsx` and both `ReturnCorrelation.tsx` render branches.

Interface: views consume `FinancialNavBasis.review`; SIP accepts optional `navReview?: VerifiedNavReview`. Use `navReviewSummary` for a consistent correction/date/value/economic-event explanation in derived exports.

- [x] Add behavioral component/export tests using actual page transforms, existing hook harness style and captured download rows; expected failures before display integration.
- [x] Render correction and economic-event notice using existing notice styling; show primary links. Add review provenance to monthly/comparison/SIP CSVs without changing raw exports.
- [x] Verify corrected calculations, raw source export, already-corrected wording and blocked fallback; all relevant UI tests pass.
- [x] Reproduce the independent review's missing nested CSV provenance with five failing behavioral tests. Pass exact review metadata from Comparison and verify all three real export handlers, including source-only ABSL reviews, already-corrected BOI input and unavailable correlation results. Fifteen reviewed-view tests and 40 affected view regressions pass; typecheck passes.

## Task 3 — bulk proof, independent review and release

Files: create `docs/BULK_DISCREPANCY_FINALIZATION_2026-10-29.md` and evidence JSON for reviewed cases, remaining queue and source diagnostics. Update the plan with executed local gates.

- [x] Finish parallel source/event investigations; include only newly supported corrections. Persist per-case reasons for everything else.
- [x] Re-evaluate actual UTC strict scope, hashes, selected full histories and all 610 previous unresolved results;606 unselected results must be identical after the four-history extension.
- [x] Run full tests, typecheck, Worker and Pages builds; record exact outputs.
- [x] Obtain a fresh independent whole-branch review; resolve material findings with behavioral tests.
- [ ] Create a focused PR from current immutable main, verify exact-head CI and the complete changed-file list, merge with expected head.
- [ ] Verify Pages deployment checkout, successful artifact and matching live HTML/JS/manifest; report resolved and remaining counts separately.

## Executed local gates and review disposition

The finalized source passed all 1,691 isolated behavioral tests (zero failures, skips or cancellations), `pnpm run typecheck`, `pnpm run build` and `pnpm run build:pages`. The independent full-cohort audit verified all 610 saved histories and 13,683 selected observations, with all 606 unselected complete results unchanged.

Independent review accepted the calculation core and primary evidence and raised one Important nested CSV provenance defect. Five expected failing tests reproduced that defect; the bounded fix passed all 15 reviewed-view tests and 40 affected view regressions before the final full suite. Root inspected the actual component diff and test results and closes I1. The pre-existing canvas-only PNG provenance limitation remains a documented Minor follow-up. The original review snapshot and root disposition are preserved separately.

The last two release gates are deliberately left pending in this pre-release commit. The PR record will capture their exact-head CI, expected-head merge, Pages checkout and live artifact proof after execution.
