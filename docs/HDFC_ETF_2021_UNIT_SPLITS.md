# HDFC Gold and NIFTY 50 ETFs — verified February 2021 unit splits

## Primary evidence and precise dates

[Metropolitan Stock Exchange circular MSE/LIST/10126/2021, 16 February 2021](https://www.msei.in/SX-Content/Circulars/2021/February/Circular-10126.pdf) records the exact old/new unit face values and security identifiers:

| Exchange symbol | Old ISIN | New ISIN | Face value before / after | New units per old unit |
| --- | --- | --- | --- | ---: |
| HDFCMFGETF | INF179K01CN1 | INF179KC1981 | Rs100 / Re1 | 100 |
| HDFCNIFETF | INF179KB1KP3 | INF179KC1965 | Rs761.25 / Rs76.125 | 10 |

The exchange distinguishes the **17 February 2021 ex-date** from the **19 February 2021 identifier/record-date change**. [HDFC's own February 2021 factsheet](https://files.hdfcfund.com/s3fs-public/2021-03/HDFC%20MF%20Factsheet%20-%20February%202021.pdf), printed page **61** (PDF index 60), explicitly states the Gold ETF face value changed from Rs100 to Re1 with effect from 19 February and that its published returns were adjusted accordingly. Printed page **22** (PDF index 21) gives the NIFTY 50 ETF's new face value Rs76.125 and revised unit denomination from that same date.

The original documents' extracted text was retrieved. Browser screenshot requests for the exchange page and both issuer pages returned cache errors, and a direct exchange-PDF download also failed; **visual page-layout verification was not completed**. The exact values/identifiers were cross-checked between the primary exchange circular, issuer text and the saved scheme metadata. No claim of a successful visual inspection is made.

## Independently verified source histories

[Read-only run #40629099450](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40629099450), job **122621005723**, loaded immutable checkpoint **208** at **2026-10-28T03:52:12.157Z**. Both exact codes pass the existing official-roster/current-membership/positive-NAV/30-day rule; their latest catalogue NAV is dated **26 October 2026**. Their catalogue and history ISINs exactly match the exchange's new ISINs.

| Exact source name | Code | Observations | Saved history end | Actual 19-to-22 February 2021 NAV ratio |
| --- | ---: | ---: | --- | ---: |
| HDFC Gold ETF - Growth Option | 113049 | 3,991 | 2026-10-26 | 0.010078541567011979 |
| HDFC NIFTY 50 ETF - Growth Option | 135853 | 2,683 | 2026-10-23 | 0.09802536117595105 |

Each full source series contains exactly one >40% move and no invalid/conflicting NAV warning. Its final old-denomination NAV is dated **19 February 2021** and its first new-denomination NAV is **22 February 2021**. Those observed source dates determine which calculation-copy observations to normalize; they must not be replaced with the exchange ex-date. In particular, no source date is rewritten and no missing weekend observation is invented.

The NIFTY history ends three days before the catalogue date. The unit-split correction does not fix that refresh lag or fabricate the missing latest observation. ETF NAV-based analysis is distinct from exchange transaction-price returns and does not include brokerage or bid/ask execution costs.

Source document SHA-256 values:
- 113049: `9248a155148f3a34b12c7b0e847ef05ed141a995d911b44fb4a9af7074b05df6`; shard `f7f9314eee791edcd922ad128777475d69fbd75b80a3e0875125e69b68be81fe`.
- 135853: `8acd79ab6df9b25016f477ad12a3ad5ddd1f9a4840088dc7413b495941f7cc37`; shard `4f46f79410747aab55b646a13e22131df7657930ed428707d42eb1a46a0e2294`.

## Narrow calculation-only repair

Add only the exact code/name/current-ISIN/HDFC-fund-house pairs above to the existing registry. Require the existing single-generated-warning, one-jump, valid-positive-unique-ascending-series and independent-warning checks. Require the exact **2021-02-19 -> 2021-02-22** NAV boundary. Only for these independently documented events, permit an observed ratio within 5% of the split factor: 0.0095–0.0105 for Gold, and 0.095–0.105 for NIFTY. This is a conservative validation bound, not an assumption that future daily returns cannot exceed 5%; a future revision outside the bound fails closed for further review. No generic 40% detector is changed.

The temporary calculation copy multiplies NAVs through **19 February** by **0.01** (Gold) or **0.1** (NIFTY). This removes the change in unit denomination, **not the ordinary market movement**. The event's economic NAV ratio remains the observed source ratio divided by the documented factor, rather than being forced to 1. All later NAV values, original observation dates, source documents, raw charts/exports, warnings, retrieval times, saved archives and checkpoint counts remain unchanged.

The broader grouping audit [#40628507358](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40628507358) found 189 flagged Growth-labelled histories in the 8,524-code repair population, including 105 jump-only histories. It inspected **87 of 105**, stopping at the explicit **64-shard** resource cap; this was not a full 105-history audit. No Kotak, Nippon or other candidate was corrected merely because a date/factor pattern looked similar. HDFC Sensex ETF 135854 contains two separate split boundaries and is explicitly excluded from this single-event repair.

## Regression and release gates

Seven tests were committed before implementation. [Baseline #40629237085](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40629237085) passed type checking and **615/619 tests**: all 612 existing tests plus three new negative tests passed, while the four new positive expectations failed. Tests cover exact security identity, both split factors, original price/date preservation, residual market returns, independent CAGR, unchanged post-event 1Y/3Y/5Y returns, no double adjustment, malformed histories and independent warning protection.

Require final-head full tests/typecheck/both builds, a full real-history before/after check and direct diff review before merge. Verify deployment separately. The existing strict 30-day repair scope, seven-day discovery rule, provider request limits, archive schemas, retry policy, collector and global precomputed return-index policy remain unchanged. The raw 610 source flags at checkpoint 208 are not reduced by a calculation-only explanation, and unrelated price anomalies remain unresolved.
