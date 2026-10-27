# Prioritize NAV discrepancies for currently reporting schemes

This is a **read-only, investor-first triage report**, not a system for altering NAV data or certifying funds as open for new investments.

## Baseline, verified 26 October 2026

A controlled diagnostic on [GitHub Actions #40420487789](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40420487789) inspected the immutable archive **checkpoint 180**, using the owner-supplied AMFI scheme-code snapshot dated 26 October 2026 and the latest MFAPI NAV catalogue.

| Category | Schemes |
| --- | ---: |
| Open-ended, exact official code match and recent positive NAV | 8,499 |
| No saved history after source failure | 1 (scheme `154804`) |
| Failed refresh with saved history | 0 |
| Invalid NAV only | 176 |
| Unexplained large NAV jump only | 404 |
| Both warnings | 22 |
| Other saved quality warnings | 10 |
| History NAV date behind newest catalogue NAV date | 7,630 |

**Only one recently NAV-reporting scheme had no saved history.** MFAPI returned an empty history for scheme `154804` at checkpoint 180. It is not safe to create a historical series from its latest NAV.

Quality-warning classes are exclusive within this report, but a scheme can also appear in the date-lag or retry groups. Date lag reflects two independently reported source dates, and may arise from publication timing; it is not proof of a lost daily NAV row.

## What the daily audit now checks

The existing daily/on-demand `FundScope archive data health` GitHub Action:
- Verifies the saved control checkpoint and catalogue; makes **zero requests** to MFAPI or AMFI.
- Uses the same *manual 26 October open-ended scheme-code roster* and *seven-UTC-calendar-day positive NAV rule* as the public website.
- Reports current-identity counts for missing histories, failed refreshes that retain older history, invalid prices, large jumps, overlapping warnings, and date lag.
- Includes at most five **numeric scheme codes** per group for follow-up, never full NAV rows or provider error text.
- Leaves `checkpoint.counts`, immutable Release assets, original observations, source flags, and saved retry backoffs untouched.

## Remediation order

1. Investigate missing positive history for recently reporting scheme `154804`; retry only according to the existing source backoff. If MFAPI still returns an empty series, report the gap. Do not fabricate a NAV.
2. Review large-move cases against dated AMC corporate-action notices. A tenfold NAV jump is not sufficient evidence for a correction.
3. For histories with invalid zero observations, retain the source warnings. Before unblocking a selected period, we need source-verified locations of rejected dates and validation of the entire requested period, including any predecessor baseline. A simple warning count cannot establish that a period is clean.
4. Recheck catalogue-versus-history date differences after provider refreshes. Do not treat routine one-to-three-day publication lag as permanent missing history.

The [ICICI Prudential Overnight Fund correction (#45)](https://github.com/Vasuki8/mutual-fund-dashboard/pull/45) is the first verified corporate-action remediation: the observed raw unit-basis jump is from **16 to 17 August 2022, 10.00138×**, consistent with the AMC notice. Derived analytics are adjusted narrowly for scheme `145536`; raw NAV and stored quality status remain unchanged.

## Confirmed code repairs, 26 October 2026

- **Recent empty/zero histories:** checkpoint 180 deferred scheme `154804` from its first failed attempt on 26 October until 2 November. Recent catalogue entries (the collector's existing 90-day priority window) now use the ordinary 15-minute exponential retry, capped at 24 hours, instead of the weekly historical-gap policy. For these two exact safe error codes, work selection also limits an already saved weekly delay to the normal delay since the last attempt. Obsolete gaps, other errors, source-wide cooldowns, per-run limits and immutable stored checkpoints retain their existing behavior. The next successful or failed attempt records a new retry outcome; old displayed retry timestamps can remain until then.
- **Older response warnings:** when an earlier source request contributes dates absent from a newer saved history, its invalid/conflicting NAV warnings now remain attached to the union. The most recent values and fetch time still take precedence. An earlier response whose dates are fully superseded cannot restore a resolved warning.
- **Merge-created discontinuities:** the server now marks a merged record unresolved if the union itself introduces a large move. The flag and warning agree even when each input passed its own checks. The GitHub collector already applied this additional check; the shared merge now protects every server caller.
- **Optional blank ISINs:** browser source refresh and search now interpret blank optional ISIN strings as unavailable (`null`), matching the server. Valid prices and exact plan codes survive; malformed types and oversized identifiers still fail validation.
- **Verified Regular Growth unit adjustment:** the exact ICICI Overnight Regular Growth code `145535` now shares the documented calculation-only adjustment with Direct Growth `145536`. Its checkpoint-180 history independently has one 16–17 August 2022 jump of 10.00135726 times and no other quality warnings. The same date, ratio and full-series checks apply. Comparison CSVs identify the actual adjusted plan code(s). See [the verified source evidence](UNIT_CONSOLIDATION.md); raw prices and archive quality flags remain intact.

A small read-only follow-up to MFAPI for `154804` returned HTTP 200, `SUCCESS`, and one positive observation. This is evidence that a bounded retry can now recover the available source history, **not proof that a new archive checkpoint has saved it or that longer history exists**. Keep collection, code checks, and live publication results separate.

## PPFAS reference cross-check remains unresolved

The owner's manually supplied `PPFAS-flexi-cap-NAV-2013-05-28-to-2026-10-25.csv` was compared offline with the exact checkpoint-180 shard. Plan codes and Growth ISINs were matched separately. Decimal strings were compared numerically without floating-point rounding or inferred corrections.

| Measure | Direct Growth (`122639`) | Regular Growth (`122640`) |
| --- | ---: | ---: |
| Manual reference observations | 3,299 | 3,299 |
| Archived observations | 3,298 | 3,298 |
| Shared dates | 3,297 | 3,297 |
| Exactly matching numeric NAVs | 3,295 | 3,295 |
| Different NAVs on shared dates | 2 | 2 |
| Duplicate or invalid observations in either input | 0 | 0 |

Both plans have different NAVs on **26 December 2024** and **31 March 2025**. The reference contains **20 December 2023** and **29 September 2025**, which are absent from the archive. The archive contains **22 October 2019**, which is absent from the reference. The common range is 28 May 2013–23 October 2026. Extra trailing zeros account for the lexical differences among the 3,295 numeric matches; none of the two numeric mismatches disappears at four decimal places.

The archive's `clean` flag means its structural/source checks passed; it does **not** establish agreement with an independent reference. These differences remain open for source confirmation. No manual rows were imported, no source prices were overwritten, and no new provenance claim was attached to the MFAPI archive.

Evidence identities for reproduction:

- Manual CSV SHA-256: `846702d0a7858328050f5bde4715138ef32b730db2c2682d4d517367b7ef5c98`.
- Checkpoint-180 compressed asset SHA-256: `cbcb1195d091f548d042073976826d17aad75a1ad8dcbb34b5cd88447a327a16`.
- Referenced `history-3832` compressed asset SHA-256: `e53be0a9003ebaf14f5c26c4e2bf73d015b4ffa825a8c2954f88183708a7b14e`.
- The checkpoint, catalogue and history assets passed their exact SHA-256 and compressed/expanded byte-length checks before comparison.

## Access and permissions

AMFI disallows automated website downloads. This audit uses an already manually supplied derived numeric roster and GitHub's own saved archive. Public commercial redistribution permissions remain a separate unresolved question. The audit neither implies a license nor automatically imports from AMFI.
