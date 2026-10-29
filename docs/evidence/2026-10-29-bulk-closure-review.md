# Independent whole-patch review — FundScope bulk history restoration

**Final ready to merge: Yes.** The original review identified one Important finding (R1); the focused fix has been reviewed and verified. No Critical, Important or Minor findings remain. The original finding is preserved below for traceability; see the resolution addendum at the end.

Baseline: `056ac7d2bee9edd733d45182385152c218ece6c8`. This review covers the nine-file snapshot recorded in `product-manifest.json`, plus the final research report and ledger at the hashes recorded in `final-review.json`. The review was read-only apart from these two review artifacts. No product files, tests, branch state, or audit artifacts were changed.

## Strengths

- `src/lib/verified-nav-reviews.ts:64` restricts restoration to the exact numeric code, source, name, house, scheme type/category, Growth ISIN and non-dividend identity. It requires the exact unique discontinuity warning, all seven unchanged issuer/source anchors, an empty original interval, and the sole raw jump at the documented boundary. Full raw and merged validity/jump checks keep a second defect blocked.
- The complete 310-row table independently matches the retained original issuer response. The response carries the exact Regular Growth name, plan `144G` and type `R` on every row. The retained PDF is byte-identical to the response's embedded PDF, and the canonical row digest matches the independent proof.
- Restoration builds a fresh calculation series and retains all source values. The review union distinguishes added observations from one-point corrections and unit adjustments. The evidence helper prevents the correction-only field assumption from crashing the three direct consumers.
- Calculation chart/export provenance is present in Detail, Comparison, SIP and the nested comparison exports. The new tests execute real component handlers and verify raw row preservation, literal data integrity and adverse identity/source states.
- I independently verified all 277 frozen baseline Git blob hashes and the before/after hashes of all nine product/test files. The existing full-cohort audit compares complete result objects and serialized values for 609 unselected histories, with an exact expected result for the selected history and raw-input stability checks.
- The 104-case report/ledger agrees with the audit's exact membership, source hashes, warning text, observation counts and classifications. The 453,395 observation total and 103 remaining blockers reconcile. Relative report links resolve. The report makes no live-deployment claim and distinguishes usable captures from quarantined/incomplete ones.

## Critical findings

None.

## Important findings

### R1 — P2: Raw NAV coverage metadata still uses restored calculation dates

**Location:** `src/components/FundDetail.tsx:41`, `:45`, `:65`, `:70`. The new restoration view test at `tests/verified-nav-review-views.test.ts:421` uses `MAX`, where source and calculation endpoints coincide, so it misses this case.

The restoration is the first review that inserts dates. `rangeMetadata`, the raw NAV chart's title/subtitle and its availability check still use the calculation `points`, while the chart and raw CSV data use `sourcePoints`/`rawPoints`. A custom range whose boundary lies inside the restored interval therefore reports calculation-only dates as actual MFAPI raw coverage.

I reproduced this through the existing real component/state/export-handler harness, extracted and executed in memory without changing files:

1. Select `2009-04-06` through `2010-07-15`, then select **NAV**. The raw CSV says `Actual NAV dates = 2009-04-06 to 2010-07-15`. The chart caption says `6 Apr 2009 – 15 Jul 2010 · MFAPI NAV · INR per unit`. Its actual raw rows begin with the permitted predecessor `2009-04-02`, followed by `2010-07-09`, `2010-07-12`, `2010-07-13`, `2010-07-14`, `2010-07-15`. There is no MFAPI observation dated 6 April 2009.
2. Select `2009-04-06` through `2009-04-09` in NAV mode. The view renders a Chart with zero raw points and a caption claiming those MFAPI dates. Raw export is disabled, but there is no no-source-observations notice because `hasRange` is true for the restored calculation series.

The raw NAV values are preserved, but the downloadable CSV's coverage record is false and the raw chart misrepresents source availability. That breaks the provenance requirement at the exact historical range this feature restores.

**Requested fix:** Derive raw CSV actual dates from `rawPoints` and NAV-chart title, subtitle and availability from `sourcePoints`. Make the calculation-period controls explicit when raw coverage differs. Add real-component regressions for a start or end inside the restored interval and a custom interval containing only restored dates; retain calculation chart/monthly/SIP behavior.

## Minor findings

None. No speculative style or refactoring requests.

## Additional edge checks

Repeated calls on the same original source object produce the same complete result without mutation or duplicate dates. Passing an already restored calculation fund through `financialNavBasis` returns the same fund without adding anything; it creates no new review, matching the existing source-correction contract. Current nested consumers receive the review explicitly, so I found no current provenance loss from repeated application.

A fully backfilled source receives no restoration. If its old unresolved warning remains, it remains blocking; if the source is clean and carries no blocker, it follows the ordinary source path. Partial/conflicting in-gap observations cannot be overwritten by this restoration. Independent invalid/conflicting warnings, extra jumps, changed/missing anchors and invalid/duplicate/unordered dates remain rejected.

The direct evidence-link helper covers all current `.correction.evidenceUrl` consumers. Neither the collector, scope predicate, discovery filter, source archive, scheduler nor unit-action registry changes in this patch.

## Verification reviewed

Independent checks performed in this review: all 277 baseline blob hashes; all nine initial product before/after hashes; all 310 literal rows against original issuer JSON; embedded PDF byte equality; canonical row digest; the two custom-range component reproductions; repeated-application and full-backfill probes; report/ledger consistency and local links.

Existing evidence inspected, without rerunning optional broad tests: `core-green.log` (54/54), `full-tests.log` (1,711/1,711), typecheck log and the implementation agent's successful-exit report, Worker/Pages build-complete logs, and the 23,069-assertion full-cohort audit source/output. The audit demonstrates 610 histories and 2,414,742 raw observations, 609 unselected complete results unchanged, selected 4,435→4,738 calculation points, 122 unit adjustments unchanged, source reviews 4→5, and eligible Growth histories 85→86.

## Declined to judge

- Live deployment, current merge/CI status and deployed-artifact agreement. This is a pre-merge code review; it does not certify deployment.
- Fresh public-source availability or a fresh active-fund census. No network calls were made; retained original records and offline scope proof were reviewed.
- A second exhaustive visual inspection of every primary PDF or independent research of each rejected historical hypothesis. Separate source reviewers supplied those documentary conclusions. I independently checked the selected literal rows, response identity fields and PDF bytes, plus report consistency.
- Browser pixel rendering, performance, collector operation and accessibility beyond the concrete incorrect chart labels. No browser or collector execution was needed for this finding.
- Later product changes and final validation/release-status edits. This verdict is bound to the manifest and documentation hashes recorded in `final-review.json`.

Initial verdict: With fixes, pending R1. No other Critical, Important or Minor findings were identified in the initial snapshot.


## Resolution addendum — R1 resolved

**Final ready to merge: Yes**, for the final nine-file product/test snapshot recorded in `finalReviewedProductManifest` in `final-review.json`. No remaining findings.

The implementing agent fixed `src/components/FundDetail.tsx:36`, `:48`, `:68` and `:73`: raw CSV actual dates now come from the exported raw points; raw chart titles, captions and availability come from source points. The range toolbar and RangeNotice use the displayed basis, labeled RAW NAV DATES or CALCULATION NAV DATES. A restored-only interval displays the explicit no-raw-observations message without rendering an empty raw chart, while switching back to Growth retains the calculation chart.

I reconstructed the initially reviewed after-files in memory from the frozen baseline and original patch, verified their original SHA-256 values, and reviewed the complete fix delta. It contains only the focused FundDetail correction and three new component tests. The other seven product/test files, including every core restoration guard and literal NAV row, remain byte-identical.

The three regressions cover a start inside the restored gap, an end inside the gap and an interval containing only restored dates. The retained RED log shows exactly those three failures (18 pass, 3 fail); the GREEN log shows all 21 view tests passing. I independently reran `node --experimental-strip-types --test tests/verified-nav-review-views.test.ts` successfully (exit 0; this runner summarized the file as one passing test unit). The tests verify raw rows, CSV coverage, chart dates, RangeNotice, empty raw coverage, and switching back to the restored calculation basis.

Final validation logs were inspected: **1,714/1,714** full-suite tests pass, the implementing agent reported typecheck exit 0 with no diagnostic output, and both Worker and Pages logs report complete builds. The final Pages bundle is `index-CXyapgt4.js`; no deployment certification is implied by this review.

Final changed-file SHA-256 values:

| File | SHA-256 |
|---|---|
| `src/components/FundDetail.tsx` | `61cec153d4343dcc4849657a150225199e356fa69287bc3c41c6f145a3022f0f` |
| `tests/verified-nav-review-views.test.ts` | `1fbfe4fb4640706b5e407c6d605dbd4ef0cc73dd07c1951239eb448f70534e8b` |

The declined-to-judge limits above still apply, including deployment verification and any later unreviewed product changes. The scope of this resolution review was limited to R1 and the final validation evidence.
