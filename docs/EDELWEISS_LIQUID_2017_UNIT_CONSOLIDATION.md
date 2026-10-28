# Edelweiss Liquid Fund — July 2017 unit consolidation

**Release status: prepared, not approved for merge or deployment.** The registry correction and automated regression suite pass, but the additional before/after calculation run on the complete real histories was not completed. Do not describe that missing check as successful.

## Primary issuer evidence

[Edelweiss notice dated 20 June 2017](https://www.edelweissmf.com/Files/downloads/Notice-Cum-Addendum/2017/Edelweiss-NoticecumAddendum-21-jun17.pdf), section 1, changes the face value of **all Edelweiss Liquid Fund plans/options from Rs10 to Rs1,000 effective 1 July 2017**. It specifies proportional adjustment of held units, with unchanged investment value subject to rounding. Its separate Treasury Fund change has a different effective date, **3 July 2017**, and is not authorized by this implementation.

The issuer's original PDF text was retrieved and checked. PDF screenshot requests failed with a cache error, and a direct download was unavailable. **Visual page-layout inspection was not completed.** The original notice is linked, not reproduced in the repository.

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

For calculations only, multiply source NAVs before **2 July 2017** by **100**. Use the documented factor rather than fitting the observed ratio, so ordinary earned NAV movement remains. All later NAV values, original observations, warning arrays, quotes, raw chart/CSV, dates, retrieval times and archived documents remain unchanged by design. No source-history correction is written. Distribution options, Treasury Fund and other codes are excluded.

The collector, 30-day repair rule, seven-day discovery rule, retry/cooldown/resource limits, source-validation thresholds and global precomputed return-index policy are unchanged.

## Regression evidence and remaining release gate

Seven tests were committed before the production change. [Baseline #40636262654](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40636262654), job **122643868106**, passed type checking and **622/626 tests**: all 619 previous tests and three new negative cases passed; four new positive expectations failed as intended.

After the small registry addition at commit `4ba81217d1b9fc7c6f0c2367ec9a6286845d5dd3`, [Dashboard checks #40636422249](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40636422249), job **122644318289**, passed **626/626 tests**, type checking, production Worker build and standalone Pages build. Existing nonblocking bundle-size and framework route-classification advisories remain.

The tests use explicitly synthetic NAV series. They verify exact identities and boundaries, rejected mismatches, malformed series, preservation of independent warnings and stale status, every synthetic old/new-unit value, unchanged post-event 1Y/3Y/5Y returns, an independent ACT/365 CAGR formula, and no double adjustment.

**The complete 6,250 real observations were inspected to establish the source anomaly, but the modified implementation has not yet been run across those real histories with before/after invariants.** The attempt to create that additional validation workflow was blocked by the execution tool and was not retried or bypassed. Keep the pull request as draft until that independent real-history calculation check and final-head review are complete. Do not substitute synthetic results for real-data verification.

The read-only audit still reports **8,524** eligible scheme codes, **610** saved source-quality flags, **31** failed refreshes retaining history, and zero source-failure cases without saved history. The categories overlap. This proposed calculation-only explanation does not reduce any original flag or resolve unrelated NAV discrepancies.
