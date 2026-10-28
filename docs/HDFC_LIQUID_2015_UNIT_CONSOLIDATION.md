# HDFC Liquid Fund Regular Growth — 2015 unit consolidation

## Primary source

HDFC Mutual Fund's [official addendum dated 14 August 2015](https://files.hdfcfund.com/s3fs-public/addenda-reports/636%20-%20Addendum%20-%20Change%20in%20Face%20Value%20of%20Liquid%20Schemes%20-%20August%2014,%202015.pdf) changes the face value of HDFC Liquid Fund units from **Rs. 10 to Rs. 1,000**, effective **30 August 2015**. It states that NAV and investor unit balances are adjusted, leaving total holdings value unchanged subject to rounding. The notice was read as text and visually checked on its single PDF page.

A higher per-unit NAV from this **100-to-1 consolidation is not a 100-fold investment gain**. Although the notice covers additional plans and schemes, this implementation does not authorize them without their own identity and archived-price verification.

## Exact eligible identity and observed history

[Read-only active-fund review #40613701515](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40613701515), job 122571116321, inspected verified immutable checkpoint **207** at 2026-10-28T01:13:24Z (27 October, 21:13 Toronto). It made no MFAPI or AMFI requests and wrote no source archive data.

- Scheme code: **100868**.
- Exact source name: **HDFC Liquid Fund - Regular Plan - Growth Option**.
- Source fund house: **HDFC Mutual Fund**.
- Latest catalogue NAV date: **26 October 2026**, inside the owner's 30-day repair scope.
- Saved history: **6,338** observations, through **25 October 2026**.
- Exactly one single-observation move above the existing 40% threshold: **28 August to 30 August 2015**, ratio **100.0420809**.
- Verified history shard SHA-256: `22fd883cc307692f8fa8529e51b2b297556e15558db5de569c58da1cd7812f9f`.

The observed date and ratio match the primary notice. No source-price replacement or interpolation is required.

## Calculation-only treatment

The existing `financialNavBasis` layer accepts only the exact code, source name (case-insensitive) and fund house above. It additionally requires the exact observed boundary dates, one and only one large move, a ratio within **99.9 to 100.1**, ascending unique dates, finite positive values, and no independent invalid-NAV, conflicting-value or unknown-discontinuity warning.

Only then does a temporary calculation copy multiply NAV observations **through 28 August 2015 by 100**. Source NAVs from **30 August 2015** remain unchanged. No observation is invented for 29 August. The existing full-series validation runs again after adjustment. Applying the calculation layer to an already-adjusted copy does not apply a second factor.

The generic fund-detail, SIP and comparison paths already consume the action label, exact dates, factor and evidence URL. The adjustment does not change the latest source quote, raw NAV chart, raw-history CSV, saved history, retrieval timestamp, immutable archive warnings or checkpoint accounting. Unrelated source errors remain visible. The global precomputed return index still follows its separate archive-quality gate.

## Regression verification

The five new tests use clearly labelled synthetic daily observations. They check the adjustment, independently calculated CAGR, unchanged post-event returns, no mutation, no double adjustment, exact plan/fund-house identity, incorrect dates/factors, additional jumps, invalid/duplicate observations and retention of independent warning evidence.

They were committed before the implementation. [Baseline run #40614003566](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40614003566) passed type checking and **597 of 600 tests**; the three failing cases were the new positive expectations for the unimplemented HDFC action. All 595 existing tests passed. The corrected full suite and a real-history before/after check are required before merge. Publication must be verified separately.

## Broader recovery status

The same read-only review verified that saved checkpoint **207** and the live Pages catalogue match by digest and size. The live browser directory reader returns **8,499** seven-day candidates; the separate 30-day repair population is **8,524**. Recovered examples 138875, 145536 and 154804 are present. Issue #54's saved-and-published membership recovery is complete; the upstream bulk NAV cache itself is not claimed repaired.

The eligible group still contains **610 source-quality flags** and **31 failed refreshes with saved histories**, with no missing saved histories after source failure. These groups overlap. This HDFC calculation change does not clear archive flags, so it must not be subtracted from those source-quality totals. Other sampled NAV anomalies remain unresolved until independently supported.
