# SBI unit consolidations — 13 January 2012

## Exact scope

This calculation-only correction covers two saved source identities. Their codes occur in the owner's manually supplied official open-ended roster. The independently verified saved catalogue marks both current, with positive NAV dated **26 October 2026**. Both satisfy the strict 30-day repair rule on **28 October 2026**; their full histories are investigated.

| Code | Exact saved source name | Growth ISIN | Saved observations | Last saved NAV date |
| --- | --- | --- | ---: | --- |
| 100641 | SBI ULTRA SHORT TERM FUND - Regular Plan - Growth | INF200K01LJ4 | 6,482 | 26 October 2026 |
| 105274 | SBI LIQUID FUND - Regular Plan - Growth | INF200K01LU1 | 6,792 | 25 October 2026 |

Both records identify **SBI Mutual Fund**. The roster establishes exact code membership; the issuer documents below separately corroborate identities. The current source names are preserved.

## Primary event evidence

[SBI's unaudited half-year financial results and portfolio statement for 31 March 2012](https://www.sbimf.com/docs/default-source/scheme-portfolios/default-library/unaudited-half-yearly-results-%28as-on-march-31-2012%29.pdf?sfvrsn=24795812_0) records a face-value change from **Rs10 to Rs1,000**, effective **13 January 2012**. PDF page **13** covers Magnum InstaCash Fund; page **18** covers SBI Premier Liquid Fund. This is the issuer's contemporaneous report, not the original advance notice.

Two exact numerical NAV matches per history establish the historical option as well as the unit-change evidence:

| Code | Historical issuer row | 30 September 2011 | 31 March 2012 |
| --- | --- | ---: | ---: |
| 100641 | Magnum InstaCash Fund Cash | 22.7129 | 2375.5954 |
| 105274 | SBI Premier Liquid Fund IG | 16.2676 | 1703.6946 |

Extra trailing zeros in saved decimal strings do not change these values. Premier Liquid's separate SG row has different NAVs and is not substituted.

## Identity corroboration

- [SBI's scheme information document hosted by SEBI](https://www.sebi.gov.in/sebi_data/attachdocs/mar-2019/1553244488146.pdf#page=28), printed page 27, identifies Magnum Ultra Short Duration as formerly Magnum Insta Cash. It separately identifies Magnum Low Duration as formerly Ultra Short Term Debt. Those lineages must not be confused.
- [SBI's BSE scheme-summary filing](https://www.bseindia.com/xml-data/corpfiling/AttachHis/4dec0406-bbfd-4bbc-b35a-053e7cddb74f.pdf) pairs Regular Growth **100641 / INF200K01LJ4** with the Magnum Ultra Short Duration scheme. This part was checked through primary-source search-indexed text; direct PDF retrieval returned HTTP 403.
- [SBI's February 2026 factsheet](https://www.sbimf.com/docs/default-source/scheme-factsheets/all-sbimf-schemes-factsheet-february-2026.pdf?sfvrsn=94669a9a_4) identifies Liquid Fund as formerly Premier Liquid Fund.
- [The issuer's 1 October 2024 scheme-summary filing, carried in the Business Standard BSE archive](https://bsmedia.business-standard.com/_media/bs/data/announcements/bse/01102024/c91ad558-2088-43cc-b223-88551250e61c.pdf#page=49), PDF pages 49–53, includes Liquid Fund, face value Rs1,000, and the exact Regular Growth **105274 / INF200K01LU1** pairing. Other listed plans remain distinct.

The 2012 report, SEBI document and 2024 filing were checked as extracted PDF text. Screenshot calls did not expose inspectable image pixels, so no independent visual PDF check is claimed.

## Observed source boundary and correction

| Code | Source NAV, 12 January 2012 | Source NAV, 13 January 2012 | New/old ratio | Actual one-day gain retained |
| --- | ---: | ---: | ---: | ---: |
| 100641 | 23.28570 | 2329.14000 | 100.024478542625 | 0.024478543% |
| 105274 | 16.68840 | 1669.27000 | 100.025766400614 | 0.025766401% |

Each complete saved history contains exactly one greater-than-40% move and exactly one matching generated warning. Neither has an invalid-NAV or conflicting-value warning. The ratio follows the documented factor of **100**, with ordinary interest movement retained.

The registry requires exact code, source name, ISIN and fund house, the **12–13 January 2012** boundary, and ratio **99.9–100.1**. Shared finite/positive/ordered/unique-series validation and independent warning gates are unchanged. Earlier prices are multiplied by 100 only in the temporary calculation copy: **2,113** observations for 100641 and **1,757** for 105274. All later prices are unchanged. An already adjusted series is not adjusted again.

Original NAVs, dates, metadata, retrieval times, archived warnings and raw exports remain intact. The correction does not remove source flags or change the global return index, collector schedule, retry limits, 30-day repair eligibility or seven-day website discovery filter.

## Reproducible saved input

Validation reuses the successful [Pages run 40735957107](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40735957107), artifact **12837043335**, containing **checkpoint 210**. The ZIP is **176,157,579 bytes**, SHA-256 `fc30433d688f3057b20cd57a9462c3bef985f6a056eb3aabbae84189e2498169`. ZIP integrity and every accessed catalogue/history shard's compressed length, SHA-256 and expanded length were checked.

The saved catalogue was fetched **2026-10-27T16:59:52.790Z**, SHA-256 `81cb2cf8d22d07caa0ed081c8cbe74600c1e9e975d7813b8cd924e71bb8988e9`. Checkpoint 210 is a dated validation input, not a claim that production is still at that checkpoint.

## Verification and limits

The **26** regression tests were written and run before the registry extension: **14 passed and 12 failed** on the expected missing-adjustment assertion. After the 18-line registry addition, all **26 passed**. Tests cover exact identity/date/warning gates, retained interest, malformed observations, extra/missing events, unchanged raw inputs, post-event returns and repeated application.

Full saved-history verification completed at **2026-10-28T22:51:40.688Z**. It executed the actual baseline and candidate modules over **13,274** observations, checked frozen source objects and unchanged input file hashes, and compared the full-history calculation with an independent endpoint/day-count reference. One-, three- and five-year returns remained exactly identical. Both histories were unrecognized by the baseline and recognized by the candidate. No second adjustment was applied.

- Baseline Git blob: `5221cfef0944ed83d9bb5fb3c8d8837a8a7eddd1` from main `ff1d07c74538d9fd0f0eeb87468e7446c3585ab9`.
- Candidate Git blob: `574ee28207abde5d4341c87efd7c2b2baaafb655`.

| Code | Source document SHA-256 (`JSON.stringify`) | Compressed source shard SHA-256 |
| --- | --- | --- |
| 100641 | 483cbd39d9940b68d36f9ef6f95fc59394557663403528ef06c701afe66f5fba | 92e332b08af98ddb09304b509fa006f15896ecd9c0d1ffd7a7da8ba5259de39a |
| 105274 | 85b1650b1e6dcf1f55d9d8422aa1305126a894ee0f92628b4e623f1f5b9b3073 | d857f0174db3f783e26ceb1aff19065a19743193d11bf6c7a5c53e7334e16e36 |

The final GitHub head must pass the full project suite, type checking and both production builds before merge. Live deployment is a separate gate; local verification is not a publication claim.

The original advance notice was not located. Source coverage before the first saved observation is not certified. Liquid's saved history ends one day before the catalogue date; no observation is invented to close that gap. The separate catalogue-refresh incident is documented in [CATALOGUE_REFRESH_2026-10-28.md](CATALOGUE_REFRESH_2026-10-28.md).
