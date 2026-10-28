# Five HDFC ETF unit splits — October 2023

## Approved scope and primary sources

Only the five exact ETF Growth identities below are eligible for this calculation-only correction. All five occur in the owner's manually supplied open-ended roster, are current in the verified catalogue, and report a finite positive catalogue NAV dated **26 October 2026**. At validation on **28 October 2026**, their NAV age is two UTC calendar days, within the existing strict 30-day repair scope. No collection, retry, cooldown, discovery or publication policy is changed.

Primary evidence:

1. [NSE circular NSE/CML/58972, 17 October 2023](https://nsearchives.nseindia.com/content/circulars/CML58972.pdf) lists all five ETFs and the exact tenfold reduction in unit face values, effective 20 October 2023. The complete single-page circular and its table were visually inspected using a PDF screenshot as well as parsed text.
2. [HDFC notice dated 12 October 2023](https://files.hdfcfund.com/s3fs-public/2023-10/1197-Addendum%20-%20Change%20in%20Face%20Value%20-%20HDFC%20ETF%20Schemes-%20RD%20October%2020,%202023.pdf) describes the change from approximately 1/100 to 1/1000 of the respective index denomination. Units held at the 20 October record date increase proportionately; the split alone does not change investment value.
3. [HDFC December 2023 ETF transaction form](https://files.hdfcfund.com/s3fs-public/2023-12/Application%20Cum%20Transaction%20Slip%20for%20ALL%20ETF%20Schemes%20December%202023.pdf), pages 1–2, independently identifies the new ISINs used below.

The original text of both HDFC PDFs was checked, but their screenshot requests failed with cache errors. No visual inspection of those two PDFs is claimed. The NSE table was visually verified. Original source documents are linked, not reproduced here.

## Complete source histories and active identity

The existing deployment artifact **12792823500**, from successful [Pages run 40635145485](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40635145485), supplies checkpoint **208**. ZIP size **176,150,312 bytes** and SHA-256 were verified again on 28 October 2026:

`2022a52d8ea31eda5ac373cd559a35ec6f836f01efbe7cd402c25563cf1dbc07`

The local extracted tar matched its ZIP member. The contained manifest, catalogue and selected history shards passed compressed-size, SHA-256 and expanded-size checks. Checkpoint timestamp: **2026-10-28T01:44:51.690Z**. Catalogue retrieval timestamp: **2026-10-27T16:59:52.790Z**. These are dated saved data, not a new source download.

| Code | Exact saved scheme name | ISIN | Saved observations | First saved NAV | Old-unit rows |
| --- | --- | --- | ---: | --- | ---: |
| 150476 | HDFC NIFTY 100 ETF - Growth Option | INF179KC1HR4 | 1,040 | 2022-08-05 | 298 |
| 150477 | HDFC NIFTY NEXT 50 ETF - Growth Option | INF179KC1HS2 | 1,040 | 2022-08-05 | 298 |
| 150657 | HDFC NIFTY200 MOMENTUM 30 ETF - Growth Option | INF179KC1HV6 | 997 | 2022-10-11 | 255 |
| 150658 | HDFC NIFTY100 Low Volatility 30 ETF - Growth Option | INF179KC1HU8 | 997 | 2022-10-11 | 255 |
| 151374 | HDFC NIFTY Midcap 150 ETF - Growth Option | INF179KC1HT0 | 910 | 2023-02-15 | 168 |

Each entire history has exactly one greater-than-40% movement, between **20 and 23 October 2023**, and exactly one generated discontinuity warning. There are no invalid-NAV or conflicting-value warnings in these five saved documents. All five histories end **23 October 2026**, three calendar days behind their catalogue date; that lag is not fixed by this change. The first stored date is not a certification of inception-to-date completeness.

## Why the precise observed boundary matters

The exchange effective date and issuer record date are **20 October 2023**. The saved MFAPI NAV on that date remains in old units; the first saved new-unit NAV is **23 October 2023**. Do not invent an observation on an intervening day, shift a source date or use the record date to scale the wrong observation.

For calculations only, source NAV dated before **23 October 2023** is multiplied by **0.1**. This is the documented split factor, not a factor fitted to remove the observed loss. Genuine event-period NAV movement remains:

| Code | Raw new/old NAV ratio | Adjusted ratio | Remaining event-period return |
| --- | ---: | ---: | ---: |
| 150476 | 0.09856332933693686 | 0.9856332933693686 | -1.436670663% |
| 150477 | 0.09806190732738154 | 0.9806190732738153 | -1.938092673% |
| 150657 | 0.09828310635233986 | 0.9828310635233986 | -1.716893648% |
| 150658 | 0.09864492503973793 | 0.9864492503973793 | -1.355074960% |
| 151374 | 0.09728530925016604 | 0.9728530925016603 | -2.714690750% |

## Narrow implementation and validation

The sole production change adds exact scheme-code/name/ISIN/HDFC-house identities to `actionForScheme` in `src/lib/corporate-actions.ts`. It retains the existing single-jump, complete-positive-unique-ascending-series and independent-warning checks. The original boundary must match exactly, and the raw factor must lie within **0.095–0.105**. This conservative residual-move limit is specific to these verified events, not a rule that explains arbitrary market losses. No other ETFs, distribution options or multiple-event histories are authorized.

Eleven new tests were committed first. [Baseline run 40641483706](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40641483706), job **122660459211**, passed type checking and **630/637 tests**: all 626 prior tests plus four new negative cases passed; exactly seven new positive expectations failed. [Corrected implementation run 40641901250](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40641901250), job **122661724795**, passed **637/637 tests**, type checking, production Worker build and standalone Pages build. The final documentation/PR head must also pass before merge. Existing nonblocking bundle-size, plugin-timing and route-classification advisories remain visible.

At **06:08:17 UTC on 28 October 2026**, local Node validation executed the actual baseline and candidate TypeScript modules against all **4,984 real saved observations**, not synthetic replacements. Their Git blob SHA values were verified:

- Baseline: `d9a8556f6e87d7befca6a3ad8039dcadd4b8f641`.
- Candidate: `2451d2c43040e383933bfef0d97bc5865241b62f`, commit `0370d024cdd54d82cfa3deca62b9a77d5028485e`.

All five were unrecognized before the change and recognized after it. Every old-unit row receives only the 0.1 factor; every later NAV is unchanged. Frozen inputs and before/after file hashes confirm original NAV values, dates, raw warnings, metadata, retrieval timestamps and documents are unchanged. Stale status remains explicit. A second application makes no further adjustment. Independently evaluated post-event 1Y/3Y returns are identical; **5Y returns remain unavailable**, because these histories are too short.

A comparison across **182 existing active Growth-labelled flagged histories** confirmed that only the five targeted outputs change. Outputs for the other **177** records, including all previously recognized actions in that group, remain identical. This is a calculation-regression population, not a count of all active funds or all source-quality issues.

No new GitHub workflow was created. No MFAPI or AMFI history request was made, and no remote archive was written. The original three-file change contains only the registry addition, synthetic regression tests and this evidence note. No visual browser check was performed.

## Integrity references

Catalogue SHA-256: `81cb2cf8d22d07caa0ed081c8cbe74600c1e9e975d7813b8cd924e71bb8988e9`.

History shard SHA-256 values:
- 150476 / 150477, bucket 4702: `11bf7437504a387e39e4a7f3cf7e96f11b270123d0e550b24c0e76ae1b581913`.
- 150657 / 150658, bucket 4708: `e78958a03b49476d1a6633661948e8bf6a3546db322bb8201f4eac189533eb98`.
- 151374, bucket 4730: `7d242b0b3b8a95df5a3181548472a7182476b9f95fb450a27a2b15c2db92bab3`.

Saved document SHA-256 values (`JSON.stringify` bytes):
- 150476: `1ecfc0224e349956ebb3b6744968b39431c212972c4192ba05530d207f9db184`.
- 150477: `076c920fe6eac4057b64ef50dc49625a2f42d67335f7e9d0f028415b2482242b`.
- 150657: `e6eb74afe658273f169ec4ef8d45fcd6cf5a881729f0b8a1ebc84fc579949219`.
- 150658: `f8afe0f104210e0abebbe957087b308d651dae88eee9974221bede15451080da`.
- 151374: `17e65c19a383a088bb7f31786de3f6ffac087d370cc3c024bf29dcbfee24a96e`.

## Remaining limits

Original source-quality flags remain preserved even when their documented unit event is explained for calculations. This change does not reduce archive warning totals, fill missing or delayed NAVs, change the homepage's precomputed return-index policy, or establish distribution-adjusted returns for IDCW options. The separate HDFC Sensex multi-split history, Bank/IT events and unrelated unexplained NAV anomalies are outside this change. A successful merge must still be distinguished from a successful website deployment.
