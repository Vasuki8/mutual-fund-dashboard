# SBI Infrastructure history restoration and bulk review — 29 October 2026

## Result

The bulk investigation covered all **104 remaining Growth histories**. One evidence-supported repair adds **303 issuer-published NAV observations** to calculations for **SBI Infrastructure Fund — Regular Plan — Growth**, scheme **106096**, Growth ISIN **INF200K01CT2**. The other **103 histories remain blocked** pending adequate evidence.

This release starts from commit `056ac7d2bee9edd733d45182385152c218ece6c8`. Local validation and independent code review are complete. The pull request records subsequent CI, merge and live-deployment verification; this pre-merge release note alone does not certify deployment.

## Public issuer evidence

The [SBI historical NAV page](https://www.sbimf.com/mutual-fund-nav) supplies the exact Regular Growth plan as issuer code **144G**. The [issuer scheme-summary archive hosted by NSE](https://nsearchives.nseindia.com/web/sites/default/files/inline-files/SBI_13042022.zip), physical page 3 of its SBI Infrastructure Fund document, identifies AMFI **106096**, Growth ISIN **INF200K01CT2** and legacy RTA code **L144G**.

The issuer returned **310 dated NAV records for 1 April 2009–15 July 2010**. All seven dates already present in the saved history match exactly. The remaining **303 records, dated 6 April 2009–8 July 2010**, fill the historical gap. The original issuer PDF and JSON agree on every date and NAV.

- [Issuer NAV PDF](evidence/2026-10-29-sbi-infrastructure-history.pdf).
- [Exact identity, public query parameters, source hashes and restoration proof](evidence/2026-10-29-sbi-infrastructure-proof.json).

| Full-history check | Result |
|---|---:|
| Original source observations | 4,435 |
| Matching issuer overlap observations | 7 |
| Additional issuer observations for calculations | 303 |
| Calculation observations after restoration | 4,738 |
| Existing source dates or NAV values changed | 0 |
| Conflicting issuer observations | 0 |
| Unexplained adjacent moves above 40% after restoration | 0 |

The original apparent 71.33% step compared NAV **6.00 on 2 April 2009** with **10.28 on 9 July 2010**, across 463 calendar days. Actual intervening issuer records remove that single-step comparison. Both original endpoints remain unchanged, so the full-range absolute return and CAGR remain unchanged.

The seven exact overlap anchors are: 1 April 2009 **5.72**; 2 April **6.00**; 9 July 2010 **10.28**; 12 July **10.33**; 13 July **10.40**; 14 July **10.40**; and 15 July **10.37**.

## Application behavior

The restoration applies only when the complete fund identity, original warning, seven anchors and known gap all match. It validates the entire original and merged history and refuses a partial or conflicting backfill, another unexplained jump, invalid observations or an independent source-quality warning. The literal checked-in observations come from the issuer; no price is interpolated and no unit factor is inferred.

Performance, risk, comparison and SIP calculations identify the issuer-reviewed basis. Raw NAV observations and their source warning remain available. Raw charts and exports retain their original values and report their own actual dates. A custom range containing only restored observations shows that raw NAV coverage is absent, while the calculation chart remains available.

## Verification

- **1,714 tests passed**, zero failed or skipped; typecheck and both Worker and Pages production builds passed.
- An independent complete-history audit passed **23,069 assertions** across **610 histories and 2,414,742 raw observations**.
- All **609 unselected complete calculation results** match the previous release. All raw source fixtures and warnings are preserved.
- The selected calculation history adds exactly 303 observations. Existing unit adjustments remain **122**; source-reviewed histories increase **4 to 5**; calculation-eligible Growth histories in the audited quality cohort increase **85 to 86**.
- Independent review found a raw-coverage labeling issue for custom date ranges. Three regression cases reproduced it, the fix passes, and **no review findings remain open**.

[Validation summary](evidence/2026-10-29-bulk-closure-validation.json), [independent code review](evidence/2026-10-29-bulk-closure-review.md), [design](superpowers/specs/2026-10-29-bulk-history-restoration-design.md) and [implementation plan](superpowers/plans/2026-10-29-bulk-history-restoration.md) are retained with the change. Detailed research and audit records are delivered separately to the owner.

## Remaining unresolved histories

| Classification | Remaining |
|---|---:|
| Independent source-quality warning | 77 |
| One unexplained adjacent move above 40% | 19 |
| Multiple unexplained adjacent moves above 40% | 7 |
| **Total** | **103** |

These categories describe the remaining queue; a large move alone does not establish a unit event. The 26 historical cases outside the independent source-quality category comprise 15 unit-event evidence gaps and 11 other historical evidence gaps. They require exact dated primary evidence or a separately verified source correction. Investigation completion does not clear their warnings.
