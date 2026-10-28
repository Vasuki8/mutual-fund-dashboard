# UTI Gold and Nifty Next 50 ETF unit splits — March 2021

## Scope and official evidence

This calculation-only correction covers exactly two Growth source identities. Both occur in the owner's manually supplied official open-ended roster, have verified current catalogue membership, and have a positive catalogue NAV dated **26 October 2026**. They meet the strict **30-day repair rule** on **28 October 2026**. The full saved histories, not only their last 30 days, were checked.

[NSE/CML/47721, dated 23 March 2021](https://nsearchives.nseindia.com/content/circulars/CML47721.pdf) confirms the following unit subdivisions and new ISINs, effective 26 March 2021. It separately gives the exchange ex-date as 25 March. Original extracted PDF text was checked; screenshot retrieval failed with a cache error, so visual verification is not claimed.

| Scheme code | Exact saved source name | ISIN | Documented split | Calculation factor |
| --- | --- | --- | --- | ---: |
| 105463 | UTI - Gold Exchange Traded Fund - Direct Plan - Growth | INF789F1AUX7 | Face value 100 to 1; 100 new units per old unit | 0.01 |
| 141665 | UTI - Nifty Next 50 Exchange Traded Fund - Direct Plan - Growth | INF789F1AUW9 | Face value 10 to 1; 10 new units per old unit | 0.1 |

Both saved documents identify **UTI Mutual Fund** as the fund house. Scheme codes, full source names, ISINs and the fund house must all match. The apparent Direct Plan labels are the provider's exact identities; this change does not infer another share class or extend to similarly named index funds.

## Observed NAV boundary

The source NAV remains on the old denomination on **26 March 2021** and first reports the new denomination on **30 March 2021**. The exchange ex-date is not substituted for that observed boundary. No observations are invented for 27–29 March.

| Code | Raw new/old ratio | Ordinary return preserved after adjustment | Saved observations | Old-unit observations |
| --- | ---: | ---: | ---: | ---: |
| 105463 | 0.009914029701884979 | -0.859702981% | 4,807 | 3,431 |
| 141665 | 0.10037485422020442 | +0.374854220% | 2,273 | 897 |

Each complete history contains exactly one greater-than-40% step, the exact one-step generated warning, and no invalid-NAV or conflicting-value warning. A documented split factor, not a fitted price ratio, preserves genuine market movement.

## Minimal implementation and safeguards

The only production change is 15 lines in `src/lib/corporate-actions.ts`: two exact identity definitions and their event metadata. Existing single-event and two-event logic remains unchanged.

The entire positive, finite, unique, ascending series must pass validation. The only large step must match exactly **26–30 March 2021**. Each ratio must be within five percent of its own documented factor: 0.0095–0.0105 for Gold and 0.095–0.105 for Next 50. Independent invalid/conflicting/unrecognized warnings remain blocking. Wrong dates, exchanged factors, different plans or another unexplained jump fail closed.

Only source values before 30 March 2021 are multiplied in a temporary calculation copy. Original prices, dates, metadata, retrieval times, source-warning evidence and archived documents remain unchanged. Raw NAV chart/export values are not replaced. Existing fund-detail, comparison and SIP adjustment disclosures are reused without a UI change. A second application does not adjust values again. Operational refresh warnings and stale status remain visible.

## Test-first verification

Eight regression tests were committed first in `c53e14c89cbf318d67b599a52bf608a3594983cf`. [Test-only run 40730149620](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40730149620), job **122963999497**, passed type checking and **659/663 tests**. Exactly four new positive expectations failed; all **655 existing tests** and four new negative cases passed.

The corrected production commit is `90bb4c4b3f9f8e065696b8d010e3ca86784db19f`. [Implementation run 40731188962](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40731188962), job **122967636339**, passed **663/663 tests**, type checking, the production Worker build and standalone Pages build. The full summary was read through to zero failures. Existing nonblocking bundle-size and route-classification advisories remain visible. Final documentation/PR-head checks are required separately before merge.

Tests cover both factors, exact identity and dates, market-return preservation, unchanged post-event returns, correct full-period returns, invalid/duplicate/reordered observations, extra events, independent warnings, stale history, unrelated UTI funds and no double adjustment.

## Actual-code verification of all saved observations

Local Node verification at **2026-10-28T17:00:33.675Z** executed the actual baseline and candidate TypeScript correction modules after verifying their Git blob hashes:

- Baseline: `0a78f8a5f14d6184128fff25fbb7a9c1f7112387`, main commit `9be9515c1c746fc038ac3c70710522b4cfd917b5`.
- Candidate: `966c74ea58145195eff628b8a916936ab51c8269`, implementation commit `90bb4c4b3f9f8e065696b8d010e3ca86784db19f`.

All **7,080** actual target observations were checked individually. Neither target was recognized by the baseline; both were recognized by the candidate. Exact per-date multiplication, an independent direct-division reference, frozen input objects, complete deep comparisons and file hashes verify that only the temporary calculation copy changes. Full-history endpoint ratios and actual-day/365 annualized references agree. One-, three- and five-year endpoint results are unchanged because all those periods begin after the split. Production analytics functions were separately exercised in CI; the local return reference is independent, not a substitute production implementation.

The differential population contains **182 active Growth-labelled histories with blocking source warnings**. Only these two targets changed; **180 other complete outputs remained identical**, including the prior multi-event Sensex correction. This is a regression population, not the entire active scheme universe or proof that source-quality counts decreased.

Inputs came from the existing successful [Pages run 40635145485](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40635145485), artifact **12792823500**. No new provider history request, workflow, or remote archive write was needed. The existing ZIP's size and SHA-256 were reverified, its extracted tar matched the ZIP member, and the catalogue and every accessed history shard passed compressed-size, SHA-256 and expanded-size checks. All 182 regression records were compared back to those verified shards.

- ZIP: 176,150,312 bytes; SHA-256 `2022a52d8ea31eda5ac373cd559a35ec6f836f01efbe7cd402c25563cf1dbc07`.
- Checkpoint: **208**, timestamp **2026-10-28T01:44:51.690Z**.
- Catalogue retrieval: **2026-10-27T16:59:52.790Z**; SHA-256 `81cb2cf8d22d07caa0ed081c8cbe74600c1e9e975d7813b8cd924e71bb8988e9`.

| Code | Original document SHA-256 (`JSON.stringify`) | Verified history shard SHA-256 |
| --- | --- | --- |
| 105463 | e311a80c8731dbc3931e08237fe1f1b7e2590f567ff88fe1d282f32785d7846b | beb6120538a1f69489962f62837a6a7b992b4be3fd585bec8081c57e957e68f0 |
| 141665 | 7ac9fedc437f0bdf07977f2ad59cfe6c157e0c58ef7e28fcb8b7561aea00b13a | 64237b65e69eb27e2aa45ba91c73277557731850a6a6564b3f8fc5dd2c28b3d0 |

## Remaining limits and release gates

Gold's saved history spans **13 April 2007–26 October 2026**, with source retrieval **27 October 2026 at 03:36:05.406Z**. Next 50 spans **7 August 2017–23 October 2026**, retrieved **26 October at 17:38:19.144Z**; its three-day catalogue/history lag remains unresolved. Coverage bounds are not proof of inception-to-date completeness or independent verification of every source price.

No raw archive warning is erased. No collector/schedule/retry/cooldown change, 30-day repair-scope change, seven-day discovery change or global precomputed return-index change is included. The source is a dated checkpoint, not a newly fetched production census. The previous audited 610 quality flags must not be described as reduced by this calculation-only change.

No browser visual check was performed. Official PDF text was readable, but screenshot retrieval failed. Require full final-head CI and diff review before merge; verify merge and deployment as separate states. Other unexplained discrepancies remain blocked.
