# UTI Bank and BSE Sensex Next 50 ETF splits — February 2021

## Exact scope

This calculation-only correction covers two exact source identities, both in the owner's manual official open-ended roster. The checkpoint-208 catalogue has independently verified current membership and positive NAVs dated **26 October 2026**. Both satisfy the owner's strict **30-day** rule on **28 October 2026**. The condition selects funds, not a truncated history window.

| Code | Exact saved source name | Current ISIN | Saved observations |
| --- | --- | --- | ---: |
| 148173 | UTI Nifty Bank ETF - Direct Plan - Growth | INF789F1AUV1 | 1,517 |
| 146388 | UTI - BSE Sensex Next 50 Exchange Traded Fund - Direct Plan - Growth | INF789F1AUU3 | 1,880 |

Both records identify **UTI Mutual Fund**. The manual roster's exact code/ISIN pairs were checked again. The source's Direct Plan labels are preserved; no additional share-class identity is inferred.

## Evidence and access limits

UTI's notice-cum-addendum dated **4 February 2021**, reproduced in a newspaper filing, describes subdivision of the two funds' face values from **Rs10 to Re1**, record date **19 February 2021**, with proportionately increased unit balances and unchanged holdings value from the subdivision itself:

[Original issuer advertisement in the filed newspaper PDF](https://bsmedia.business-standard.com/_media/bs/data/announcements/bse/05022021/aca4ac2d-ea8f-4dda-b674-03275fb1dec6.pdf).

The issuer advertisement was accessible as **search-indexed PDF text**. Direct PDF retrieval failed, so the PDF binary, page layout and a visual screenshot were **not independently checked**. This is not a claim of successful visual verification. [NSE's official UTI Nifty Bank record](https://www.nseindia.com/get-quote/equity/BANKBETA/UTI-Nifty-Bank-ETF) independently lists the 10-to-1 face-value change, ex-date 17 February and record date 19 February, with ISIN INF789F1AUV1. Its indexed official corporate-action text was checked. UTI's October 2021 Sensex Next 50 scheme document also records the post-event Re1 face value. These February actions are distinct from the March 2021 Gold and Nifty Next 50 splits.

## Observed NAV boundary

Each complete saved history has exactly one greater-than-40% change: **19–22 February 2021**. No invalid-NAV or conflicting-value warning is present. Source NAVs still use old units on 19 February; the correction does not substitute the exchange ex-date for the observed boundary or invent weekend NAVs.

| Code | Actual new/old ratio | Ordinary event return retained | Old-unit observations |
| --- | ---: | ---: | ---: |
| 148173 | 0.09837008334531425 | -1.629916655% | 117 |
| 146388 | 0.09848206909927078 | -1.517930901% | 480 |

## Implementation

Only **14 registry lines** are added to `src/lib/corporate-actions.ts`. Require the exact code, source name, ISIN and fund house, exact 19–22 February boundary, a single matching generated jump warning, and a source ratio within 0.095–0.105. Existing finite/positive/unique/ascending series checks and independent warning gates remain unchanged.

Source NAVs before **22 February 2021** are multiplied by **0.1 in a temporary calculation copy**. This is the documented split factor, not a fitted ratio; ordinary market losses remain. Original NAV prices, dates, warnings, retrieval timestamps, metadata, raw chart/exports and archived documents remain unchanged. A second application does not adjust again. Other schemes and partial or unexplained histories remain blocked.

## Test-first verification

Eight tests were committed first in `4ffb8cf604815b83a8e4dd27ac84ff1364b856e1`. [Run 40733809918](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40733809918), job **122976881529**, passed type checking and **667/671 tests**. Exactly four new positive assertions failed; all **663 existing tests** and four new negative cases passed.

Implementation commit `9853253e37b1c220ca8e7aba7f4ddbf4b6a314ca` passed [run 40734652795](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40734652795), job **122979829945**: **671 tests, 671 passed, zero failed**, type checking, Worker build and standalone Pages build. The complete summary was read. Existing nonblocking bundle-size and route-classification advisories remain visible. Final documentation/PR-head checks are separate requirements.

Tests cover both identities, factors, exact dates, market-loss preservation, post-event returns, full-history arithmetic, invalid/duplicate/reordered observations, extra events, independent warnings, stale status and the separate March registry.

## Actual-code and archive verification

Local verification at **2026-10-28T17:22:27.422Z** executed the actual baseline and candidate TypeScript modules after checking their Git blob hashes:

- Baseline `966c74ea58145195eff628b8a916936ab51c8269`, main `96f046151b7b813b72ed66fd6c70a829db04260a`.
- Candidate `5221cfef0944ed83d9bb5fb3c8d8837a8a7eddd1`, implementation `9853253e37b1c220ca8e7aba7f4ddbf4b6a314ca`.

All **3,397 target observations** passed exact date/value invariants. Both targets were unrecognized before the change and correctly recognized afterward. Frozen input objects, complete document comparisons and file hashes verify preservation of all source evidence. Independent division by ten, endpoint and actual-day/365 references confirm the temporary series. One-, three- and five-year endpoints remain identical because they are after the split; full-history results account for the unit change. Production analytics functions are separately exercised by CI. No double adjustment occurs.

The same integrity-verified archive supplied **182 eligible Growth-labelled histories with blocking warnings**. Only the two targets changed; **180 other complete outputs remained identical**, including previous single-event and two-event corrections. The local scan checked 727 source shards; it made no network/provider requests. The manifest's bounded issue examples were not mistaken for a complete list.

Inputs were reused from successful [Pages run 40635145485](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40635145485), artifact **12792823500**. ZIP size **176,150,312 bytes**, SHA-256 `2022a52d8ea31eda5ac373cd559a35ec6f836f01efbe7cd402c25563cf1dbc07`; the extracted tar matched its ZIP member. Every accessed catalogue/shard passed compressed-size, SHA-256 and expanded-size verification.

Checkpoint **208** is dated **2026-10-28T01:44:51.690Z**; catalogue retrieval **2026-10-27T16:59:52.790Z**, SHA-256 `81cb2cf8d22d07caa0ed081c8cbe74600c1e9e975d7813b8cd924e71bb8988e9`.

| Code | Original document SHA-256 (`JSON.stringify`) | Source shard SHA-256 |
| --- | --- | --- |
| 148173 | 675867432db9af71608425dc99e15f36fee9f8fdf1444a925f8fb06f4795981c | 2c27330709d1f7b2f9e5ace7a1cc76ccf503ebf8733ef9fac33c9a31922f589f |
| 146388 | 6c1cc05d3ad8027712cc19a3cc336f82fc06d0cb6f853b475cef708125c5eca4 | 86f070929a7539a813872bc4569a7e8ee88daa67d3adf2b2c0a314bc866e29a9 |

## Remaining limits

Both saved histories end **23 October**, three calendar days before catalogue **26 October**. Their original retrieval times are 26 October at 17:38:20.197Z (Bank) and 17:38:19.786Z (Sensex Next 50). This correction does not fill that gap or establish inception-to-date completeness.

No remote archive write, provider history request, new workflow, collector/retry/schedule change, 30-day scope change, seven-day discovery change or precomputed global return-index change is included. Original source flags remain; do not report a lower production discrepancy total from this calculation-only change. No browser visual check was performed. Merge and live deployment require separate verification.
