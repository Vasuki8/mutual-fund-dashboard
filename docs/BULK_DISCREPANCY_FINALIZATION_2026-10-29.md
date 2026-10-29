# Bulk discrepancy finalization: four exact source reviews

This pass starts from PR73 / main `cac0463a0d9f71b22aa365ce1d1c6a9524de9e2b`. It resolves four additional active Growth histories for detail and comparison calculations. The remaining blocked Growth queue falls from **108 to 104**. The raw archive and its warnings remain unchanged at checkpoint 213; this is a calculation-basis release, not a source archive refresh or a claim that the full cleanup is finished.

## Exact corrections

| Code | Exact option / ISIN | Date | Saved source NAV | Issuer-verified calculation NAV |
| --- | --- | --- | ---: | ---: |
| 106873 | ABSL International Equity Regular Growth / `INF209K01520` | 10 April 2019 | 68.28470 | **20.9025** |
| 119517 | ABSL International Equity Direct Growth / `INF209K01WS3` | 10 April 2019 | 70.53340 | **21.5909** |
| 133867 | Bank of India Credit Risk Regular Growth / `INF761K01DH6` | 31 March 2022 | 9.62960 | **10.2756** |
| 133868 | Bank of India Credit Risk Direct Growth / `INF761K01DG8` | 31 March 2022 | 9.76670 | **10.4219** |

Only the indicated date changes in each calculation copy. Original NAV values, dates, source warnings, retrieval times and archive provenance remain available. There is no interpolated value, unit multiplier, blanket warning exemption or source archive overwrite.

### ABSL: a wrong historical observation

The issuer's historical-NAV download provides all three exact dates, 9–11 April 2019. The neighboring values match the saved series. Replacing the single 10 April spike eliminates both large threshold moves in each full history while retaining the ordinary daily market returns: approximately −0.5666% then −0.2172% for Regular and −0.5651% then −0.2168% for Direct.

The newly located public **GET** download route is documented in the issuer's own page JavaScript; it differs from the previously failed POST request. The [official category mapping](https://mutualfund.adityabirlacapital.com/postlogin/CustomApi/Shared/GetSchemeCategory?type=N) binds internal codes `297G` / `297GZ` to the exact Regular / Direct Growth options. This identity does not depend on the caller-supplied scheme name echoed in a CSV. The [issuer scheme-summary document](https://nsearchives.nseindia.com/trading_security/mf/pdf/Aditya_06042026165307_SchemeSummaryDocument.pdf#page=37), PDF page 37, independently binds the numeric scheme codes and Growth ISINs.

- [Regular dated issuer NAV download](https://mutualfund.adityabirlacapital.com/api/sitecore/Shared/PostHistoricalNavandDividendFile?SchemeName=ABSL+International+EquityFund+-Regular-Growth&Type=N&SchemeCode=297G&FromDate=09-Apr-2019&ToDate=11-Apr-2019)
- [Direct dated issuer NAV download](https://mutualfund.adityabirlacapital.com/api/sitecore/Shared/PostHistoricalNavandDividendFile?SchemeName=ABSL+International+Equity-Fund-Direct-Growth&Type=N&SchemeCode=297GZ&FromDate=09-Apr-2019&ToDate=11-Apr-2019)

The source files are 231 and 228 bytes, with SHA256 `db36edf1bcfa344ec722493932d441861a69ed90dbe3a11cd5459ab942b002fa` and `37636daafeb78dfb464451507314cb9c9716fc25eabc3ca128cb208832b32956`. Their complete small CSV contents, retrieval details, mapping hashes and identity-document hash are in the evidence inventory. Two researchers independently checked the bytes and identity evidence. There is one dated issuer NAV publication per option, not two independent numerical publications.

### BOI: a corrected NAV with genuine economic movements

The issuer's [March 2022 factsheet](https://www.boimf.in/docs/default-source/investorcorner/factsheets/factsheet-march-2022.pdf?sfvrsn=16b76643_6#page=14), page 14, [audited 2021–22 report](https://www.boimf.in/docs/default-source/reports/financials/annual-report-2021-224ace7e8cb8f74e8f8d11443c4b271be0.pdf?sfvrsn=32295bd6_6#page=87), page 87, and dated issuer NAV service agree on the two corrected 31 March values. The [issuer summary](https://nsearchives.nseindia.com/trading_security/mf/pdf/Bank_06052026135108_BOI_Mutual_Fund.pdf#page=31), page 31, binds both numeric codes and ISINs and states that no segregated portfolio has been created.

The [2019–20 audited report](https://www.boimf.in/docs/default-source/reports/financials/annual-report-2019-20.pdf#page=155), note 11.24 on PDF page 155, explicitly dates credit markdowns to 24 April 2020. The 2021–22 report, page 24, attributes the large annual outperformance to recoveries from defaulted securities. Daily issuer responses supply the exact preceding, event and subsequent NAVs. The annual discussion does not identify each security's contribution on 31 March; this release makes no such claim.

The calculation series retains the real loss and gain:

| Option | 24 April 2020 | 31 March 2022 |
| --- | ---: | ---: |
| Regular Growth | **−50.220684%** | **+121.834589%** |
| Direct Growth | **−50.219443%** | **+121.836952%** |

Those movements remain in return, risk, drawdown and SIP calculations. They are not denomination changes and must not be flattened by a factor. The two smaller June 2019 losses also remain unchanged. This review verifies the problematic boundaries and full threshold scan, not every historical NAV against an independent publication.

## Fail-closed behavior

The new small `verified-nav-reviews` module sits alongside the existing unit registry. Its optional `review` metadata is separate from `adjusted` and unit-action metadata. Existing unit-action behavior remains unchanged.

Each review requires exact code, full archive name, fund house, Growth ISIN, type and category; a strictly ordered unique series of real dates and finite positive NAVs; the exact generated two-discontinuity warning; and no independent invalid/conflicting NAV warning. Every required adjacent date/value must match. Unknown revisions, missing or inserted observations, extra jumps, shifted boundaries, ambiguous identities and independent source-quality blockers reject the complete review.

BOI explicitly permits the original conflicting NAV or the exact verified replacement, so a source that has already corrected that point can retain its values while its two economic events are recognized. ABSL requires the exact known source spike and zero remaining large moves after correction. An already-clean ABSL source needs no override; a stale warning without the original conflict is not automatically removed.

The detail, comparison and SIP views explain the exact correction and link the primary evidence. Derived CSVs carry review provenance, including nested plan, selected-peer and correlation exports. Raw NAV charts and source CSVs retain original values. The sidebar, Atlas palette, literal Growth/distribution policy, seven-day discovery filter, importer controls and global precomputed returns index remain unchanged. These four histories become eligible when their full histories load in detail/comparison; this release does not rebuild the global sort index from reviewed NAVs.

## Complete-cohort verification

The independent audit re-evaluated all 37,998 saved catalogue rows using the actual UTC date and the production strict scope predicate. The same 8,524 identities qualify; no missing eligible saved history was found. It verified all 610 unresolved fixture hashes, 237 referenced history shards and the unchanged returns asset.

All **13,683 observations** across the four selected histories were checked. Exactly one point changes per history. Every unrelated daily return and each full-range absolute return/CAGR is unchanged. All **606 unselected histories** produce identical complete results by both deep and serialized comparison. Inputs, raw flags and warnings are unchanged.

| Measure | Before | After |
| --- | ---: | ---: |
| Raw unresolved source histories | 610 | 610 |
| Histories with verified unit adjustments | 122 | 122 |
| Separate source-reviewed histories | 0 | 4 |
| Consumer-eligible histories in this unresolved-source cohort | 81 | 85 |
| Blocked Growth histories | 108 | **104** |
| Clean single-jump Growth cases still blocked | 20 | 20 |
| Clean multiple-jump Growth cases still blocked | 11 | **7** |
| Growth histories with independent invalid-source warnings | 77 | 77 |

The remaining exclusive Growth groups are **77 + 20 + 7 = 104**. Six invalid-source cases also have unexplained jumps and are not counted twice. The four unresolved ETF jump cases retain their separate policy/evidence status.

## What remains blocked

All 77 source-warning histories were replayed through the production parser and merge logic: 333,034 sanitized saved observations, zero invalid saved rows and 732 historical rejected-row counts. The original rejected rows were not persisted. There is no demonstrated stuck flag or parser false positive. A hypothetical clean complete response can remove the old warning through the existing guarded merge; that simulation is not a source repair.

A coordinated read-only three-code sample checked current checkpoint, scope, retry eligibility, source cooldown and absence of active collectors. Axis 112277 returned an explicit zero NAV on **7 April 2013**. Its 4,150-row response contains 4,149 usable rows, all 4,146 previous valid dates with unchanged values, and three newer dates. The parser correctly keeps its invalid-source warning. LIC 100313 and Sundaram 100603 did not yield complete usable captures within their two-request budgets. The first LIC capture also encountered a local EOF instrumentation error; it consumed an attempt and was not treated as a source failure. No archive write followed.

The diagnostic transport used a 12-second socket timeout, but two trickling responses exceeded that wall time, reaching 21.29 seconds. This limitation is recorded; a future diagnostic fallback needs a hard process deadline. No rate-limit response or source-pause 503 was observed, and the full sample remained bounded. None of the 77 warnings is waived.

Another primary-evidence pass checked 71,636 observations across 15 remaining unit-event candidates. It recovered exact JM issuer identity proof, but the 13/14 December 2019 event-date conflict remains. UTI, ICICI, PGIM and Baroda cases still lack original dated terms or exact legacy identity links. A Baroda-side 2011 archive lead returned 503; BNP's different predecessor archive is not interchangeable. Invesco's required original NAV pages returned 403, and an underlying ETF chart cannot establish FoF NAVs. ICICI 102135 still lacks the exact 2 January 2008 primary observation. Every remaining case has an explicit disposition in the linked queue and diagnostic inventory.

No automated AMFI download, collector dispatch, schedule/gate change, former hosted importer restart or browser sign-in retry was performed. The earlier GitHub browser sign-in was declined. A normal guarded shared-source refresh remains unexecuted; the authenticated connector still has no workflow-dispatch operation. This does not block the independently supported calculation release.

## Validation and release record

Core tests were written first: BOI had eight expected missing-review failures before implementation, ABSL six. All 37 core checks then passed. Behavioral view/export tests cover actual transforms and handlers, raw-versus-reviewed values, primary links, already-corrected input, independent blockers and loading transitions. Independent review identified missing provenance in nested comparison exports; the fix and its behavioral tests are part of this release.

The finalized local tree passes all **1,691 tests**, typecheck, the Worker build and the Pages build. The exact-head CI, merge SHA and successful live deployment/artifact verification are recorded in the pull request. A commit or build alone is not live proof. The pre-existing chart-PNG export embeds only the chart canvas, without the page's provenance notice; improving standalone image provenance remains a separate minor limitation.

## Durable evidence

- [Four exact reviews and original primary proof](evidence/2026-10-29-bulk-finalization-reviews.json)
- [Complete 610-history before/after queue and remaining dispositions](evidence/2026-10-29-bulk-finalization-queue.json)
- [Source-warning diagnostics and unsupported-event research](evidence/2026-10-29-bulk-finalization-source-diagnostics.json)
- [Independent review and root remediation ruling](evidence/2026-10-29-bulk-finalization-review.md) and [validation commands, results and hashes](evidence/2026-10-29-bulk-finalization-validation.json)
- [Design](superpowers/specs/2026-10-29-bulk-finalization-design.md) and [implementation plan](superpowers/plans/2026-10-29-bulk-finalization.md)
