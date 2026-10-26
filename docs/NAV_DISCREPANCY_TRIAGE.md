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

## Access and permissions

AMFI disallows automated website downloads. This audit uses an already manually supplied derived numeric roster and GitHub's own saved archive. Public commercial redistribution permissions remain a separate unresolved question. The audit neither implies a license nor automatically imports from AMFI.
