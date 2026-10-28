# HDFC Bank and IT ETF unit splits — February 2024

## Scope and primary evidence

This calculation-only correction covers exactly three Growth ETF identities. All three occur in the owner's manually supplied open-ended roster, retain current verified catalogue membership, and have a finite positive catalogue NAV dated **26 October 2026**. On **28 October 2026**, their age is two UTC calendar days and they qualify under the existing strict 30-day repair rule. The complete saved histories, not just the last 30 days, were examined.

[NSE circular NSE/CML/60421, 25 January 2024](https://nsearchives.nseindia.com/content/circulars/CML60421.pdf) confirms the tenfold face-value reductions for HDFC Nifty Bank, Private Bank and IT ETFs, effective on the exchange from **2 February 2024**. The original single-page circular and its table were checked as both extracted text and a successful PDF screenshot. The circular also lists Sensex, but its saved history has two separate unit events and is deliberately excluded from this single-event correction.

[HDFC's official ETF Common Transaction Slip dated 18 November 2024](https://files.hdfcfund.com/s3fs-public/2024-11/ETF%20Common%20Transaction%20Slip%20181124.pdf), pages 1–2, independently corroborates the exact current ISINs below. Original issuer text was checked; its screenshot requests failed with cache errors, so visual inspection of that document is not claimed. Original source documents are linked, not copied into this repository.

## Verified saved identities and observations

| Code | Exact source scheme name | ISIN | Saved observations | First saved NAV | Old-unit observations |
| --- | --- | --- | ---: | --- | ---: |
| 148461 | HDFC NIFTY BANK ETF - Growth Option | INF179KC1HY0 | 1,526 | 2020-08-21 | 854 |
| 150801 | HDFC NIFTY IT ETF - Growth Option | INF179KC1IA8 | 974 | 2022-11-16 | 302 |
| 150802 | HDFC NIFTY Private Bank ETF - Growth Option | INF179KC1HZ7 | 974 | 2022-11-16 | 302 |

Each document belongs to **HDFC Mutual Fund**, contains exactly one greater-than-40% price step and the exact single generated discontinuity warning, and has no invalid-NAV or conflicting-value warning. Each complete series ends **23 October 2026**, three days behind its catalogue date. This correction does not fill that lag. The first saved date is a coverage bound, not a certification of inception-to-date completeness.

The observed source-unit boundary is **2 February → 5 February 2024**. Although NSE's exchange effective date is 2 February, the saved NAV on that date still uses old units. No observation is invented for 3 or 4 February, and no source date is moved.

## Minimal implementation

Add only the three exact code/name/ISIN/fund-house identities to `actionForScheme` in `src/lib/corporate-actions.ts`. Retain the complete positive/unique/ascending series check, exactly one large move, the exact observed boundary, the existing independent-warning gate and all other generic safeguards. Require the source ratio to be **0.095–0.105**. This event-specific residual-move bound is not permission to adjust arbitrary market losses.

Only the temporary calculation copy multiplies source NAV dated before **5 February 2024** by **0.1**. Applying the documented factor rather than fitting the observed ratio preserves ordinary NAV movement:

| Code | Raw new/old NAV ratio | Adjusted ratio | Remaining event-period return |
| --- | ---: | ---: | ---: |
| 148461 | 0.09968238881083905 | 0.9968238881083904 | -0.317611189% |
| 150801 | 0.09958144126357354 | 0.9958144126357353 | -0.418558736% |
| 150802 | 0.09985529262763834 | 0.9985529262763834 | -0.144707372% |

Source prices, dates, raw warnings, retrieval timestamps, immutable documents, quotes, raw chart and raw CSV remain unchanged. Stale status and any failed-refresh warning remain visible. A second call does not adjust the already-normalized copy again.

**The three-year window crosses this split.** It must therefore use an adjusted pre-event starting NAV, not retain a split-contaminated raw return. The separate full-history verification independently evaluated the actual-day/365 annualization formula. One-year returns, wholly after the event, remain identical. Five-year history is available for the saved Bank series; it remains unavailable for the younger IT and Private Bank histories. No longer history is fabricated.

## Test-first verification

Nine tests were committed before the production change. [Baseline run 40710946504](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40710946504), job **122895735012**, passed type checking and **641/646 tests**: all 637 existing tests and four new negative tests passed; exactly five new positive expectations failed as intended.

[Corrected implementation run 40711406076](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40711406076), job **122897371047**, passed **646/646 tests**, type checking, the production Worker build and the standalone Pages build. The log summary was read through to zero failures. Existing nonblocking bundle-size and route-classification advisories remain visible. Final documentation/PR-head checks are required separately before merge.

Tests cover exact identity and event dates, market-loss preservation, split-crossing three-year calculations, unchanged one-year results, insufficient longer history, malformed/duplicate/reordered dates, wrong factors, second jumps, unrelated plans, independent warnings, stale history and no double adjustment. The separate two-event Sensex history remains blocked.

## Actual-data before/after verification

Local Node validation at **2026-10-28T15:00:26.243Z** executed the exact repository baseline and candidate TypeScript modules against **all 3,474 actual saved observations**. Their Git blob hashes were verified before execution:

- Baseline: `2451d2c43040e383933bfef0d97bc5865241b62f`, main commit `af87e712d4184cd55e039d5d0e89341c2435d60a`.
- Candidate: `a95791ea837cd45f61bc5599c4d345a797ffa76f`, commit `69e4d0e08f8a73f35bfc5a88e68cd84a21da71d7`.

All three were unrecognized before the change and recognized after it. Every old-unit NAV receives only the documented 0.1 factor; every later value remains identical. Frozen input objects, deep comparisons, and file digests confirm no source record or metadata was modified. Independent endpoint and actual-day/365 calculations verify the split-crossing returns, while post-event one-year results remain unchanged. The second application returns the same adjusted object unchanged.

A differential check across **182 active Growth-labelled flagged histories** changed only these three target outputs. Outputs for the other **179** histories, including previously recognized corporate actions, were identical. This is a regression population, not the total number of active funds or source-quality flags.

Inputs came from the already-downloaded successful [Pages run 40635145485](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40635145485), artifact **12792823500**. The existing ZIP is **176,150,312 bytes** and its SHA-256 was reverified against GitHub metadata:

`2022a52d8ea31eda5ac373cd559a35ec6f836f01efbe7cd402c25563cf1dbc07`

The contained manifest is checkpoint **208**, timestamp **2026-10-28T01:44:51.690Z**; catalogue retrieval was **2026-10-27T16:59:52.790Z**. Catalogue and selected shards passed compressed-size, SHA-256 and expanded-size checks before parsing. These are dated saved observations, not a new provider download.

Catalogue SHA-256: `81cb2cf8d22d07caa0ed081c8cbe74600c1e9e975d7813b8cd924e71bb8988e9`.

| Code | Saved document SHA-256 (`JSON.stringify`) | History shard SHA-256 |
| --- | --- | --- |
| 148461 | `02fb51398773f49288a09b68522b76f4edcf2684bb639405280b50d0d6ddebff` | `d0e410679ae9543e141922ffaacd08950c4b9911c70d8826b5942ee5e2f2999d` |
| 150801 | `a130715ac2022919f827c67d92aad049b0bb030f163ef973b323000f17003435` | `15feff780190e77cdeb670b89a94fbd61cda165245a8679d9cd336c4ed107b26` |
| 150802 | `762fcd31aeb660c82795ddda4aabb3aa225f174f78b75f1e47777dc89ca58bc8` | `15feff780190e77cdeb670b89a94fbd61cda165245a8679d9cd336c4ed107b26` |

## Release limits

No MFAPI or AMFI requests, new GitHub workflows, remote archive writes, source-price edits, collector/schedule/retry changes, 30-day scope changes, seven-day discovery changes or global precomputed return-index changes were introduced. No browser visual inspection was performed.

Original source-quality flags remain in the archive even when the unit event is explained for calculations. This change does not prove that the source-warning backlog decreased or that all discrepancies were repaired. Successful CI, merge and website deployment are separate states and must be verified separately.
