# HDFC BSE Sensex ETF — two verified unit splits

## Scope and primary evidence

This correction is restricted to **scheme 135854**, exact source name **HDFC BSE Sensex ETF - Growth Option**, current ISIN **INF179KC1HX2**, and **HDFC Mutual Fund**. The manually supplied official scheme sheet identifies this exact open-ended ETF. The integrity-verified checkpoint-208 catalogue reports current membership and a positive NAV dated **26 October 2026**. On validation day **28 October 2026**, it qualifies under the owner's 30-day repair scope. The entire saved history is examined; the date condition does not truncate that history.

Primary exchange evidence:

1. [MSE/LIST/10126/2021, 16 February 2021](https://www.msei.in/SX-Content/Circulars/2021/February/Circular-10126.pdf): HDFC Sensex ETF face value changes from 2503.61 to 250.361, a ten-for-one split; old ISIN INF179KB1KQ1 becomes INF179KC1973. The circular specifies the ISIN change effective 19 February and an exchange ex-date of 17 February. It was checked as original extracted text; screenshot rendering failed, so no visual inspection is claimed.
2. [NSE/CML/60421, 25 January 2024](https://nsearchives.nseindia.com/content/circulars/CML60421.pdf): Sensex ETF face value changes from 250.361 to 25.0361, another ten-for-one split, effective on the exchange from 2 February 2024. Both original text and the table screenshot were checked.
3. [NSE/CML/72944, 23 February 2026](https://nsearchives.nseindia.com/content/circulars/CML72944.pdf): confirms the current ISIN INF179KC1HX2 and rename from HDFC S&P BSE SENSEX ETF to HDFC BSE SENSEX ETF effective 27 February 2026. Both original text and screenshot were checked.

The ETF must not be confused with HDFC's separate Sensex index-fund scheme codes 101281/119065. Those identities are not authorized by this correction.

## Observed NAV boundaries and cumulative calculation basis

The saved source history contains **2,683 positive observations**, from **9 December 2015 through 23 October 2026**, and exactly two greater-than-40% moves. Its only quality warning is the generated two-discontinuity message; there is no invalid-NAV or conflicting-value warning. First saved date is not proof of inception-to-date completeness.

| Source boundary | Raw new/old NAV ratio | Remaining return after documented factor |
| --- | ---: | ---: |
| 19 to 22 February 2021 | 0.0978292789689583 | -2.170721031% |
| 2 to 5 February 2024 | 0.09950840729102209 | -0.491592709% |

The source still reports old-unit NAV on 19 February 2021 and 2 February 2024. Calculation boundaries follow those actual observations, not an assumed exchange trading date. No weekend dates or replacement NAVs are invented.

Both documented factors are **0.1**. They compound where their date ranges overlap:

| Original source dates | Temporary calculation factor | Observations |
| --- | ---: | ---: |
| Before 22 February 2021 | 0.01, from two factors of 0.1 | 1,283 |
| 22 February 2021 through 2 February 2024 | 0.1 | 728 |
| From 5 February 2024 | 1, unchanged | 672 |

The factor is not fitted to erase the residual market movement. Both ordinary negative event-period returns remain visible.

## All-or-nothing implementation

`src/lib/sensex-unit-splits.ts` isolates the exact two-event case. The existing single-event registry and calculations remain unchanged. `financialNavBasis` delegates only code 135854 to this validator, which independently checks name, current ISIN and fund house.

Both exact NAV boundaries, exactly two large moves, source ratios within 0.095–0.105, positive finite unique ascending observations, and exactly one generated two-move warning must match. A missing event, missing boundary, third move, inconsistent count, wrong identity, invalid/conflicting warning or unrecognized discontinuity message returns the original fund unchanged. No partial repair is permitted. The normalized copy is checked again for invalid values or unexplained moves.

Optional `earlierEvents` metadata describes the earlier event separately from the latest one. Fund detail displays both explanations and source links. Comparison and SIP exports describe both stages and explicitly state that factors compound. Adjusted SIP NAV columns are labelled unit-adjusted rather than reported NAV. Original NAV charts and raw exports remain unchanged.

## Test-first and real-data verification

Nine behavioral tests were committed before implementation. [Run 40716794359](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40716794359), job 122916550709, passed type checking and **651 of 655 tests**: all 646 existing tests plus five new rejection cases passed; four new positive expectations reproduced the unsupported two-event case.

Three view/export regression tests were added before modifying the corresponding consumers. The first sparse view fixture was corrected to include an intermediate synthetic observation, preventing an unrelated third jump. [Run 40718642679](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40718642679) stopped during an npm package-download timeout before typecheck/tests; it is infrastructure failure, not a passing or failing behavioral result. Narrow local rendering checks using the actual component modules and actual correction first reproduced the omitted first-event disclosure, then verified both dates, links, compounding, raw CSV preservation and the adjusted SIP column label. Unrelated financial metrics/canvas were stubbed in that narrow local check; the committed regression tests use the real financial modules. Final full CI is still required before merge.

At **2026-10-28T15:57:04.582Z**, local Node validation executed the actual baseline and candidate TypeScript modules against every saved target observation. Git blob identities were checked before execution:

- Baseline corporate-actions: `a95791ea837cd45f61bc5599c4d345a797ffa76f`.
- Candidate corporate-actions: `2b5acbcca37c00ea4c3b7abe237c9ff83c3feab9`.
- Two-event module: `45331c6545694841efe38fae85e22d4a34276dca`.

Every source price, date, warning, metadata field and retrieval timestamp remained unchanged. Each calculation value matched its era's documented cumulative factor. One-year returns wholly after the splits remained identical. Three-, five- and ten-year windows crossing one or both events matched independently evaluated actual-day/365 annualization formulas. Repeated application returned the normalized fund unchanged.

A differential check across **182 active Growth-labelled flagged histories** changed only 135854. All **181 non-target outputs** remained identical, including existing corporate-action fixes. Frozen inputs and before/after file digests confirmed no source mutation.

## Reused archive and integrity references

Input is the existing successful [Pages run 40635145485](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40635145485), artifact **12792823500**, not a new provider download. ZIP size **176,150,312 bytes** and SHA-256 were reverified:

`2022a52d8ea31eda5ac373cd559a35ec6f836f01efbe7cd402c25563cf1dbc07`

Checkpoint **208**, timestamp **2026-10-28T01:44:51.690Z**; catalogue retrieval **2026-10-27T16:59:52.790Z**. Catalogue and all 1,615 stored history shards passed compressed-size, SHA-256 and expanded-size checks during the regression-data extraction.

- Catalogue SHA-256: `81cb2cf8d22d07caa0ed081c8cbe74600c1e9e975d7813b8cd924e71bb8988e9`.
- Target shard SHA-256: `4f46f79410747aab55b646a13e22131df7657930ed428707d42eb1a46a0e2294`.
- Source document SHA-256, JSON.stringify bytes: `4a3950c709b26b21f4d269065a4aa2123112ab685be0f0a2dac83ea88d20f72e`.

The official roster contains 10,273 approved candidate codes; 8,524 qualify under the 30-day rule in this dated catalogue on 28 October. The 182-history regression population is a separate subset, not the complete issue backlog.

## Release limits

No raw archive data, collector settings, source retry/cooldown, 30-day repair scope, seven-day discovery policy or global precomputed return-index policy changes. No new workflow, provider history request or remote archive write was used. Original source-quality flags remain preserved; this correction does not lower the raw warning count. The saved history remains three days behind the catalogue date. No browser visual check was completed. Require final-head full CI, complete diff review and separate deployment verification before claiming release.
