# Bulk discrepancy finalization design

The owner requested autonomous completion of the existing bulk discrepancy task, with larger batches and exact per-fund evidence. This continuation starts at main `cac0463a0d9f71b22aa365ce1d1c6a9524de9e2b`, after PR 73. The saved checkpoint 213 queue contains 108 blocked Growth histories: 77 independent source-quality cases, 20 clean single-jump cases and 11 clean multiple-jump cases. Investigation is complete only when each case has an explicit disposition; resolution requires evidence and successful verification, not removal of a warning to meet a count.

## Scope and approach

Continue independent primary-source investigation of every remaining group. Source warnings require original response evidence; a sanitized saved series cannot prove why rows were rejected. A bounded read-only diagnostic can inspect due source responses without writing the shared archive, while preserving source pauses, current scope and request limits. A successful diagnostic is not a shared refresh.

The immediately supported code change is for Bank of India Credit Risk Regular Growth 133867 (`INF761K01DH6`) and Direct Growth 133868 (`INF761K01DG8`). The issuer's daily NAV service, March 2022 factsheet and audited 2021–22 accounts agree on 31 March 2022 NAV 10.2756/10.4219. Saved source values 9.6296/9.7667 conflict. The 2020 markdown and 2022 recovery are genuine investment losses/gains; preserve their returns, rather than multiplying all earlier NAVs to smooth the chart.

Three approaches were considered. A unit factor is economically incorrect. Changing archived source values would lose the original observation and does not fit the existing calculation-copy contract. The selected approach is an exact, calculation-only reviewed basis with separately typed correction/event provenance. The implementation choice is the agent's decision within the existing authorized repair task; it adds no new user feature beyond usable and accurately described analytics.

## Exact calculation contract

Add a small independent module, `src/lib/verified-nav-reviews.ts`, called by the existing `financialNavBasis` entry point. A successful review adds optional `review` metadata to its result. Existing `adjusted`, `adjustment` and `adjustments` fields retain their unit-action meanings, so BOI has `adjusted:false` and a separate review.

The two hard-coded identities must match exact numeric code, archive name, issuer, ISIN, open-ended type and Credit Risk category. Require a valid strictly increasing unique positive finite full series, the exact generated two-jump warning, and no independent invalid/conflicting NAV warning. Require the two event windows to have exactly the independently verified adjacent date/value anchors: 23/24 April 2020 and 30/31 March 2022, plus the next actual 4 April 2022 observation. Permit only the known incorrect or independently verified 31 March value; unknown revisions fail closed. Re-scan the entire candidate calculation series: the same two exact economic jumps must be the only moves exceeding the existing 40% threshold. Extra, missing, shifted or revised event evidence rejects the whole review.

Copy only the 31 March point when it contains the known source conflict. If the source already reports the verified number, keep its values and say no substitution was needed. Remove only the matching generated discontinuity warning from the calculation copy after all checks succeed; preserve the raw fund, its raw warnings, source values, archive provenance, retrieval time and every unrelated warning. Never clear an independent source blocker. The return series must retain the approximately 50.22% loss and 121.83% gain. Missing dates are never inserted or interpolated.

The review links primary issuer documents, identifies the exact correction date and values, and describes the 2022 movement as a source-confirmed gain in a recovery period. The annual report establishes the recovery mechanism, not the exact allocation or receipt date of a named security; do not claim more.

## Display and export contract

Fund detail, comparison and SIP use the existing calculation entry point. Display a plain correction/economic-event explanation using the current notice styling and links to the primary records. Derived CSVs identify the correction and retained economic returns. Raw NAV charts, raw CSVs and current NAV observations continue to use the original fund data. BOI is never labeled a unit consolidation or split. Existing theme/layout, Growth/distribution restrictions, unit-action outputs and global precomputed returns behavior stay unchanged.

## Verification and completion

Write failing behavioral tests before production edits. Test exact independent numbers; raw immutability; both plans; already-corrected input; wrong identity/category/type/ISIN; invalid dates/NAVs/duplicates/order; missing or moved anchors; unknown values; extra jumps; warning conflicts; unchanged unrelated histories; rendered notices and derived/raw export values. Re-run all 610 frozen unresolved histories and verify all 606 unselected results remain identical after the four-history extension. Verify strict actual-UTC scope, fixture/shard hashes and current checkpoint before reporting counts.

Independent final review, full CI, typecheck and Worker/Pages builds precede expected-head merge. A successful Pages deployment and live artifact match are required before reporting the fixes live. Source-driven cases remain openly blocked when primary evidence is unavailable; no count target relaxes a guard. No automated AMFI download, manual warning clearing, collector restart, schedule/gate change, old hosted importer access, browser-auth retry or shared archive mutation is included.

## Evidence-supported batch extension: ABSL International Equity

During this pass, the issuer historical-NAV download supplied exact 9/10/11 April 2019 values for both International Equity Growth plans. The exact code/ISIN identities are 106873/INF209K01520 Regular and 119517/INF209K01WS3 Direct. On 10 April only, replace saved 68.2847 with 20.9025 (Regular) and 70.5334 with 21.5909 (Direct), in the calculation copy. Require exact adjacent 9 April 21.0216/21.7136 and 11April20.8571/21.5441. Exact issuer internal-code mapping and downloadable source provenance must be independently checked before release.

These are source-error corrections with no recognized economic events; `review.events` is empty. Require exact original bad source value, a full valid ordered series, exactly the two adjacent raw jumps, the exact generated two-jump warning, no invalid/conflicting warning, and zero large moves after replacing that one point. Already-corrected clean source needs no override; stale warnings without the known bad point remain unresolved. Unknown source revisions, additional/shifted points or jumps fail closed. Use the same review metadata/display/export contract, with wording that does not imply a split or economic recovery event. This extends the selected count to 4 only after tests and independent evidence review.
