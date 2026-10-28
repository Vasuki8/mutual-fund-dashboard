# HDFC Liquid Fund Direct Growth — verified 2015 unit basis

## Scope and source evidence

This extends the existing HDFC Regular Growth calculation correction to **one independently verified Direct Growth scheme**, not to every HDFC plan.

[HDFC Mutual Fund's official addendum dated 14 August 2015](https://files.hdfcfund.com/s3fs-public/addenda-reports/636%20-%20Addendum%20-%20Change%20in%20Face%20Value%20of%20Liquid%20Schemes%20-%20August%2014,%202015.pdf) explicitly covers both Regular and Direct plans of HDFC Liquid Fund. It changes unit face value from Rs10 to Rs1000 effective **30 August 2015**, with proportional investor-unit adjustments. Its single original PDF page was visually inspected. This denomination change is not investment gain.

[Read-only investigation #40623372283](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40623372283), job 122602434628, checked immutable **checkpoint 208** at **2026-10-28T02:51:43.211Z** (27 October, 22:51 Toronto). It used existing verified archive assets only: no MFAPI requests, no AMFI access and no archive writes.

| Identity | Direct Growth | Existing Regular Growth |
| --- | --- | --- |
| Scheme code | **119091** | 100868 |
| Exact name | HDFC Liquid Fund - Direct Plan - Growth Option | HDFC Liquid Fund - Regular Plan - Growth Option |
| Fund house | HDFC Mutual Fund | HDFC Mutual Fund |
| Latest catalogue NAV date | 2026-10-26 | 2026-10-26 |
| Saved history end | 2026-10-26 | 2026-10-25 |
| Saved observations | 4,268 | 6,338 |
| Number of moves above 40% | 1 | 1 |
| Last old-basis NAV date | 2015-08-28 | 2015-08-28 |
| First new-basis NAV date | 2015-08-30 | 2015-08-30 |
| Actual NAV ratio | 100.04236650175243 | 100.04208090053126 |
| Old implementation recognizes adjustment | No | Yes |

Both identities pass the existing strict 30-day repair rule. The Direct plan has no invalid-NAV or conflicting-value warning. Its observed boundary independently matches the official notice; it is not inferred only from its Regular sibling.

Direct history shard SHA-256: `37413e28a5972ea2b2474968cd99886a69bf043e7eb41b5f35aee351c02edca3`.
Direct history document SHA-256: `f6a850fd815a09a7b6c8302ab612868cd414e86ae8439f7c950188874dc446b5`.

## Minimal implementation and checks

The HDFC registry entry maps **100868 to Regular** and **119091 to Direct**, then requires the exact matching Growth Option name and HDFC fund-house identity. Code/name pairs cannot be interchanged. Other scheme codes, distribution options, different fund houses and extra name suffixes are not eligible.

The existing exact-date, single-jump, 99.9-to-100.1 ratio, ascending-date, finite-positive-NAV and independent-warning checks remain unchanged. Only a temporary calculation copy multiplies old-basis NAVs by 100. There is no invented 29 August NAV, archive mutation, source-warning deletion, source freshness change or second adjustment of an already-normalized copy.

The existing fund-detail, SIP and comparison paths consume the action-specific metadata. The collector, 30-day repair scope, seven-day discovery scope, raw NAV chart, raw-history exports and precomputed global-return-index policy are unchanged.

Five regression tests were written first. [Baseline run #40623473847](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40623473847) passed type checking and 602/605 tests. All 600 original tests and the two new negative cases passed; only the three new expectations requiring Direct-plan support failed. Corrected final-head checks and full real-history before/after assertions are required before merge. Deployment must be verified separately.

## What the repair does not mean

Checkpoint208's 30-day group contains **8,524** scheme/plan codes, **610** source-quality flags, **31** failed refreshes retaining saved histories, and **zero** completely missing saved histories after source failure. The flags comprise 176 invalid-only, 404 discontinuity-only, 22 combined and eight other warnings. Date lag affects 5,110 histories and overlaps other categories; it is not proof of permanent missing observations.

These source-level flags remain in immutable data after a calculation-only correction. Do not report 610 minus one as the new source-quality count. Eligibility is based on recent reporting, not verified purchase availability. This change does not establish source-data redistribution permission or resolve unrelated NAV discrepancies.
