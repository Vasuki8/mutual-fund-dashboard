# Edelweiss Liquid Fund — July 2017 unit consolidation

**Real-history release check completed on 28 October 2026 at 05:49:30 UTC.** Both complete saved histories passed the actual candidate implementation's before/after checks. Final-head CI and review are still required before merge. A merge is not proof of deployment.

## Primary issuer evidence

[Edelweiss notice dated 20 June 2017](https://www.edelweissmf.com/Files/downloads/Notice-Cum-Addendum/2017/Edelweiss-NoticecumAddendum-21-jun17.pdf), section 1, changes the face value of **all Edelweiss Liquid Fund plans/options from Rs10 to Rs1,000 effective 1 July 2017**. It specifies proportional adjustment of held units, with unchanged investment value subject to rounding. Its separate Treasury Fund change has a different effective date, **3 July 2017**, and is not authorized by this implementation.

The issuer's original PDF text was retrieved and rechecked. PDF screenshot requests failed with a cache error. **Visual page-layout inspection was not completed.** The original notice is linked, not reproduced in the repository.

## Complete source-history investigation

[Read-only investigation #40636091734](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40636091734), job **122643283378**, loaded and verified archive checkpoint **208** at **2026-10-28T05:07:02.560Z**. Each exact scheme passed `isActiveRepairCandidate` using the runner's actual date and the strict official-roster/current-membership/positive-NAV/30-day rule. The diagnostic made zero MFAPI or AMFI requests and zero archive writes.

| Code | Exact source name | Recorded ISIN | Saved observations | Latest catalogue NAV | Saved history end | Sole large-step ratio |
| --- | --- | --- | ---: | --- | --- | ---: |
| 140182 | Edelweiss Liquid Fund - Regular Plan - Growth | INF754K01GZ6 | 3,125 | 2026-10-26 | 2026-10-25 | 100.03536428476833 |
| 140196 | Edelweiss Liquid Fund - Direct Plan - Growth | INF754K01GM4 | 3,125 | 2026-10-26 | 2026-10-25 | 100.03585299143688 |

Both histories start on **27 November 2016**. Those are the saved coverage bounds, not a certification of complete inception-to-date coverage. Each entire saved series has exactly one greater-than-40% step, between **30 June and 2 July 2017**, and one matching generated discontinuity warning. There is no invalid-NAV or conflicting-value warning. The pre-change calculation registry does not recognize either plan.

The legal effective date and observed source boundary are distinct. Do not invent a 1 July observation or relabel either source date. Both histories remain **one day behind their catalogue NAV date**; this unit correction does not fill that lag.

Source document and shard SHA-256 values:
- 140182 document: `2c2a2827533521552e4d7bce44ed5dbb3664ddc1be5972d1f167128e12c6120a`; shard: `d3500751095c9e66bca06fd5a1e55196f5a0743cfec8c5e5c790223798c5297e`.
- 140196 document: `203a18e5abd771f2f8cbd33d5634522387272b4b97d9ad8baf9c0e1ac598882a`; shard: `a3871ad9106a01585d60daf9d7488e734041363975ea8e5d927f33c514892116`.

## Narrow implementation

Add only the two exact code/plan-name pairs, guarded by `Edelweiss Mutual Fund`, to `actionForScheme`. Require the existing exact single generated warning, complete valid-positive-unique-ascending series, single jump and independent-warning checks. Require the precise **2017-06-30 -> 2017-07-02** boundary and observed ratio within **99.9 to 100.1**. The tolerance is a conservative release guard for this documented event, not an assumed universal limit on market returns.

For calculations only, multiply source NAVs before **2 July 2017** by **100**. Use the documented factor rather than fitting the observed ratio, so ordinary earned NAV movement remains. All later NAV values, original observations, warning arrays, quotes, raw chart/CSV, dates, retrieval times and archived documents remain unchanged. No source-history correction is written. Distribution options, Treasury Fund and other codes are excluded.

The collector, 30-day repair rule, seven-day discovery rule, retry/cooldown/resource limits, source-validation thresholds and global precomputed return-index policy are unchanged.

## Automated regression evidence

Seven tests were committed before the production change. [Baseline #40636262654](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40636262654), job **122643868106**, passed type checking and **622/626 tests**: all 619 previous tests and three new negative cases passed; four new positive expectations failed as intended.

After the small registry addition at commit `4ba81217d1b9fc7c6f0c2367ec9a6286845d5dd3`, [Dashboard checks #40636422249](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40636422249), job **122644318289**, passed **626/626 tests**, type checking, production Worker build and standalone Pages build. Existing nonblocking bundle-size and framework route-classification advisories remain.

These tests use explicitly synthetic NAV series. They verify exact identities and boundaries, rejected mismatches, malformed series, preservation of independent warnings and stale status, every synthetic old/new-unit value, unchanged post-event 1Y/3Y/5Y returns, an independent ACT/365 CAGR formula, and no double adjustment. The separate real-data check below is not a synthetic test.

## Completed real-history before/after verification

The additional validation workflow was previously blocked and was not recreated. Instead, the already-existing successful [Pages deployment #40635145485](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40635145485) supplied its existing downloadable artifact through the GitHub artifact-download connector. This read-only retrieval required no new workflow, credential retrieval, provider request or archive write.

Artifact **12792823500**, `github-pages-40635145485-1`, is **176,150,312 bytes**. Its downloaded SHA-256 exactly matches GitHub's reported digest:
`2022a52d8ea31eda5ac373cd559a35ec6f836f01efbe7cd402c25563cf1dbc07`.

The contained manifest is checkpoint **208**. The catalogue and both selected gzip shards passed compressed-byte count, SHA-256 and expanded-byte count checks. Each extracted history document's `JSON.stringify` SHA-256 matches the original investigation above. The original manually supplied open-ended sheet and the published catalogue independently confirm both exact scheme codes, current membership and positive NAV dated **26 October 2026**, two UTC calendar days before this validation. This does not claim a newer catalogue snapshot.

The local Node validation executed the actual candidate TypeScript module from commit `9972f5b54b89b2798d65ad6f85dc896cf4454a62`, with Git blob SHA **d9a8556f6e87d7befca6a3ad8039dcadd4b8f641**. The before-change module was also verified against its Git blob SHA **a4f88f085f16219aa7bcb1975d94e3fc3448f16c**. Thus the run compared exact repository code, not a rewritten adjustment implementation.

| Real-history check | Regular 140182 | Direct 140196 |
| --- | ---: | ---: |
| Every saved observation checked | 3,125 | 3,125 |
| Old-basis observations multiplied by 100 in calculation copy | 180 | 180 |
| Before-change implementation recognizes action | No | No |
| Candidate implementation recognizes action | Yes | Yes |
| Adjusted event ratio | 1.0003536428476834 | 1.000358529914369 |
| Original dates, NAVs, warnings and metadata unchanged | Yes | Yes |
| Independently evaluated post-event 1Y/3Y/5Y returns identical | Yes | Yes |
| Second application leaves the result unchanged | Yes | Yes |

All **6,250** observations passed. The ordinary event-period NAV changes of approximately **+0.0353643%** and **+0.0358530%** remain; they were not flattened to zero. Frozen input objects detected any attempted mutation. The raw history documents, catalogue and manifest bytes stayed unchanged. Existing stale status and successful-fetch timestamps were preserved, and no 1 July NAV was fabricated.

Only local working copies and a verification receipt were written. There were **zero remote archive writes**, **zero MFAPI/AMFI requests**, and **no new GitHub workflow**. No visual browser check was performed. The issuer PDF visual-rendering limitation remains as stated above.

## Remaining data limitations

The checkpoint-208 audit reports **8,524** eligible scheme codes, **610** original source-quality flags, **31** failed refreshes retaining history, and zero source-failure cases without saved history. These are dated snapshot counts and overlapping categories, not fresh production totals. This calculation-only explanation does not reduce any original flag, fill the one-day history lag, or resolve unrelated NAV discrepancies. A successful final CI run and merge must still be distinguished from a successful website deployment.
