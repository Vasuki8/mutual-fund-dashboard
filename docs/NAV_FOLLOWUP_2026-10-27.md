# NAV discrepancy follow-up — 27 October 2026

## Verified snapshot, not a claim of complete historical coverage

[Read-only archive investigation #40450268615](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40450268615) loaded immutable checkpoint **190**, timestamp **2026-10-27T04:14:27.267Z**, and verified its referenced history shards through the existing archive store. The diagnostic made no MFAPI or AMFI requests and wrote no archive data.

| Metric | Checkpoint 190 |
| --- | ---: |
| Known scheme codes | 37,998 |
| Saved histories | 37,380 |
| Histories without saved quality flags | 33,851 |
| Saved histories with quality flags | 3,529 |
| Source failures, including failed refreshes with saved data | 631 |
| Refresh/reconciliation backlog | 10,097 |

Among **8,499** recently NAV-reporting open-ended codes matched to the existing manual AMFI roster, **none lacked a saved history after source failure**. Eleven had failed refreshes but retained saved data. The subset had 176 invalid-only, 404 discontinuity-only, 22 combined and eight other quality flags (610 flagged histories in total). The 6,828 catalogue/history date lags overlap these categories and do not establish permanent missing observations. Recent NAV reporting is not proof of purchase eligibility.

## Missing source history recovered: 154804

The verified checkpoint now contains **ICICI Prudential Nifty Pharma ETF**, scheme **154804**, with one positive observation dated **26 October 2026**. Both its checkpoint state and history document record one observation and no unresolved quality warning.

This is confirmation that the available source history was saved, not evidence of a longer history. Return and risk metrics that require additional observations must remain unavailable.

History shard SHA-256: `13bf34ee76cd2e9f802837a1e44f17437d2e4a5160d075122231bce2da5aa146`.

## Quant source anomalies remain unresolved

The same diagnostic reparsed both complete stored payloads. Each has 5,064 positive observations through 26 October 2026. The discontinuities are present in the actual stored prices; the stored jump count agrees with reparsing. Neither is explained by the separate merge-warning defect below.

| Scheme | Option | Observed boundary | Ratio |
| --- | --- | --- | ---: |
| 100176 — Quant Small Cap Fund, Regular Plan | IDCW | 26–27 May 2015 | 0.33099173 |
| 100176 | IDCW | 27–28 May 2015 | 3.02233483 |
| 100177 — Quant Small Cap Fund, Regular Plan | Growth | 10–11 January 2008 | 2.92420982 |
| 100177 | Growth | 11–14 January 2008 | 0.34185712 |

These short reversals are suspicious, but the pattern alone does not identify the correct NAV or authorize a split adjustment. No verified replacement price or matching corporate-action notice was established in this review. Both histories therefore remain flagged. IDCW additionally requires distribution-adjusted data for investor total returns. Do not remove the outlier, interpolate a replacement or copy a neighbouring NAV.

Shared history shard SHA-256: `241241db1f9bc153f2afa38073b98fbcea1ac5c3c07256e3f19d06f7d3e1d731`.

## Separate confirmed defect: inherited jump counters after a merge

`server/validation.ts` retained a generated jump-count warning from the incoming response and then appended a second count for the merged history. A shorter response can omit valid intermediate dates and create an apparent large step that does not exist after those saved observations are restored. The old counter could still block the fund. When real jumps remain, the old and recomputed counters could disagree.

The repair removes **only the exact generated count message** before calculating the final union's discontinuities. It preserves unrecognized warning messages, invalid-NAV evidence, conflicting duplicate warnings, independent unresolved states, original observations, source correction precedence, and retrieval timestamps. The 40% detection threshold is unchanged. No source-price correction is introduced.

Example: retained NAVs `10, 13, 16, 20` have no step greater than 40%. A shortened response containing only `10, 20` has an apparent 100% step. Once the intervening saved source observations are restored, the warning must describe `10, 13, 16, 20`, not the incomplete response.

Tests were committed before implementation. [Run #40450218302](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40450218302) reproduced four failures, all in the new regression tests; the other 562 tests passed. The implementation changes only warning construction in `mergeHistory`. [Run #40450378265](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40450378265) passed on the corrected code. Final pull-request checks must also pass before merge.

Existing immutable checkpoints are not rewritten. Future successful merges recompute their own counters. This code repair alone does not prove that any production warning count has decreased, and it does not resolve the Quant anomalies or the previously documented PPFAS reference differences.
