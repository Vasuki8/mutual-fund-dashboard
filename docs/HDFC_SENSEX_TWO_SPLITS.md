# HDFC BSE Sensex ETF — two verified unit splits

## Scope and exact identity

This correction covers only scheme **135854**, exact source name **HDFC BSE Sensex ETF - Growth Option**, current ISIN **INF179KC1HX2**, fund house **HDFC Mutual Fund**. The user-supplied official open-ended roster contains this exact code and ISIN. The verified checkpoint-208 catalogue has current membership and a positive NAV dated **26 October 2026**. On **28 October 2026** it satisfies the owner's strict 30-day repair rule. Full history is examined; the 30-day rule does not truncate observations.

## Official evidence

1. [MSE/LIST/10126/2021, 16 February 2021](https://www.msei.in/SX-Content/Circulars/2021/February/Circular-10126.pdf) identifies the HDFC Sensex ETF ten-for-one split, old ISIN INF179KB1KQ1 to INF179KC1973, face value 2503.61 to 250.361, record date **19 February 2021** and exchange ex-date 17 February. Original extracted text was checked. PDF screenshot retrieval failed, so no visual verification of this document is claimed.
2. [NSE/CML/60421, 25 January 2024](https://nsearchives.nseindia.com/content/circulars/CML60421.pdf) confirms a second ten-for-one split, face value 250.361 to 25.0361, exchange effective date **2 February 2024**. Its original table was checked in both extracted text and a successful PDF screenshot.
3. [HDFC ETF Common Transaction Slip, 18 November 2024](https://files.hdfcfund.com/s3fs-public/2024-11/ETF%20Common%20Transaction%20Slip%20181124.pdf) corroborates the current Sensex ISIN INF179KC1HX2. Original issuer text was checked; screenshot retrieval failed.

Exchange/record dates do not automatically establish the source NAV denomination boundary. The complete saved history independently shows exactly these two steps:

| Old-unit NAV date | First new-unit NAV date | Raw new/old ratio | Market return after the documented 0.1 factor |
| --- | --- | ---: | ---: |
| 19 February 2021 | 22 February 2021 | 0.0978292789689583 | -2.170721031% |
| 2 February 2024 | 5 February 2024 | 0.09950840729102209 | -0.491592709% |

The ordinary losses are preserved, not flattened to zero or explained away with a fitted ratio.

## Calculation design

The original implementation could recognize only one large event in a history. Sensex needs both verified events, so accepting either event alone would leave misleading returns.

The exact Sensex identity is now associated with two separate, chronologically ordered actions. All other existing action definitions remain unchanged. Before creating a calculation copy, the algorithm requires:

- A complete positive, finite, uniquely dated, ascending input series.
- Exactly two large moves for this registered two-event identity, matching the exact source dates above.
- Each observed ratio within 0.095–0.105, consistent with its independently documented 0.1 split factor.
- Exactly the matching two-move generated warning and no independent invalid-NAV, conflicting-value or unrecognized discontinuity evidence.
- No residual unexplained large movement in the adjusted series.

All events must pass before any values are adjusted. Missing dates, a missing event, already-partly-adjusted histories, extra jumps, wrong identity or an invalid series fail closed with the original fund unchanged. This is not generic permission to explain arbitrary repeated price jumps.

Applicable factors multiply cumulatively in the temporary calculation copy:

| Source period | Calculation factor | Verified observations |
| --- | ---: | ---: |
| Before 22 February 2021 | 0.01 (0.1 applied twice) | 1,283 |
| 22 February 2021 through 2 February 2024 | 0.1 | 728 |
| From 5 February 2024 | 1; unchanged | 672 |

Original NAV prices, dates, retrieval timestamps, raw warning evidence, saved documents, raw chart and raw CSV are not modified. The latest quote is unchanged. An already-adjusted calculation object is not adjusted again.

Single-event results keep their existing `adjustment` shape. Multiple events are returned separately as `adjustments`; they are not collapsed into a misleading single factor/date. Fund research shows a notice and evidence link for each event, with a cumulative-factor explanation. Comparison and SIP disclosures carry both boundaries. Adjusted SIP NAV columns are labelled **Calculation NAV**, not **Reported NAV**. The existing single-event SIP prop remains supported.

## Test-first and integration verification

Nine regression tests were committed before production changes. [Test-only run 40725900156](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40725900156), job **122949394199**, passed type checking and **649/655 tests**: all 646 existing tests and three new negative tests passed; six new positive calculation/disclosure expectations failed. A separate local reproduction against the actual 2,683-observation saved history also failed under the original module.

The view fixture was subsequently corrected to exercise the existing **Returns** tab, where SIP is actually rendered, rather than the obsolete Holding tab. No production tab placement was changed.

[Implementation run 40727735839](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40727735839), job **122955439807**, passed **655/655 tests**, type checking, the production Worker build and standalone Pages build. Full log summaries were read. Existing nonblocking bundle-size, plugin-timing and route-classification advisories remain visible. Final documentation/PR-head checks are required separately before merge.

Tests exercise per-period factors, exact identities and event dates, two-event atomicity, unchanged raw exports, both fund-page evidence links, both comparison/SIP CSV disclosures, operational warnings, stale status, partial repairs, extra jumps, duplicates, invalid observations, and prevention of double adjustment. One-year return is unchanged; three-year and five-year windows cross the later split and must change. Full-history returns cross both splits.

## Complete actual-history verification

Local verification at **2026-10-28T16:38:50.397Z** executed the actual baseline and candidate TypeScript modules, after verifying their Git blob hashes:

- Baseline `a95791ea837cd45f61bc5599c4d345a797ffa76f` (main commit `08bc67fee863c68df3f4c6649d5ff661f3ad49ad`).
- Candidate `0a78f8a5f14d6184128fff25fbb7a9c1f7112387` (core commit `b134b06ad39543cc3e760b33fda787e89796f8a7`).

All **2,683** actual observations from **9 December 2015 to 23 October 2026** were checked individually. Frozen inputs, deep comparisons and saved-file hashes confirm preservation of original prices, dates, metadata, provenance, timestamps and warnings. Only the calculation copy has the factors above. An independent direct-division reference and actual-day/365 return formula verify the transformed series and its split-crossing returns. The one-year result is identical. Repeated application leaves the same adjusted object unchanged.

A differential check across **182 active Growth-labelled histories with blocking source warnings** found exactly one changed output: **135854**. The other **181 outputs remained identical**, including the previous single-event corrections. This is a calculation-regression population, not the entire active-fund universe or a claim that source-quality totals decreased.

Inputs came from the already-downloaded successful [Pages run 40635145485](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40635145485), artifact **12792823500**. The ZIP is **176,150,312 bytes**; SHA-256 was reverified:

`2022a52d8ea31eda5ac373cd559a35ec6f836f01efbe7cd402c25563cf1dbc07`

The extracted tar matches the ZIP member. The contained manifest is checkpoint **208**, timestamp **2026-10-28T01:44:51.690Z**; catalogue retrieval was **2026-10-27T16:59:52.790Z**. Catalogue and history shards passed compressed size, SHA-256 and expanded-size checks before parsing. The source is a dated saved archive, not a new provider fetch.

Integrity references:
- Catalogue SHA-256: `81cb2cf8d22d07caa0ed081c8cbe74600c1e9e975d7813b8cd924e71bb8988e9`.
- Sensex bucket 4245 SHA-256: `4f46f79410747aab55b646a13e22131df7657930ed428707d42eb1a46a0e2294`.
- Saved document SHA-256 (`JSON.stringify` bytes): `4a3950c709b26b21f4d269065a4aa2123112ab685be0f0a2dac83ea88d20f72e`.
- Source history fetched at **2026-10-26T11:31:26.749Z**; its stale status remains explicit.

## Release limits

The saved history ends **23 October**, three calendar days behind its catalogue date. This change does not fill that gap or certify inception-to-date completeness. The original two-jump archive warning remains preserved. No remote archive write, provider history request, new GitHub workflow, collector/schedule/retry change, 30-day repair-scope change, seven-day discovery change or global return-index change was introduced.

No browser visual inspection was performed. Automated component and CSV behavior was tested, but that is not a visual browser check. Successful tests, merge and website deployment are separate states and must be verified separately. Other unexplained discrepancies remain blocked.