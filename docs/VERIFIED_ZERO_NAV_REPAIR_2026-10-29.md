# Verified Sundaram NAV calculations and complete rejection evidence

## Problem and scope

The 29 October continuation investigated 57 Growth schemes across Axis, LIC and
Sundaram. It recovered issuer values for 15 of their 209 zero-NAV observations.
Two Sundaram Direct Growth plans have enough primary evidence for a complete
calculation review of their three rejected dates. The remaining schemes retain
their unresolved source flags.

The original manually supplied official scheme-list CSV confirms all 103 audited
code/Growth-ISIN pairs. Its SHA-256 is
`d9be116b194d403070bf0900f66bdb4b1ec4c83500e04ac345d01e7281d6f6fc`
(4,113,971 bytes). No automated AMFI request was used. Both repaired plans meet
the existing exact-roster, current catalogue and 30-UTC-day repair scope on
29 October 2026; their retained current positive NAVs are dated 28 October.
The website's separate seven-day discovery filter is unchanged.

## Exact calculation changes

| Code | Direct Growth ISIN | Date | Raw source NAV | Issuer calculation NAV |
| --- | --- | --- | --- | --- |
| 119566 | INF903J01PR9 | 2013-01-03 | 0.00000 | 15.3408 |
| 119566 | INF903J01PR9 | 2013-01-04 | 0.00000 | 15.2991 |
| 119566 | INF903J01PR9 | 2013-01-07 | 0.00000 | 15.3408 |
| 119635 | INF903J01OP6 | 2013-01-03 | 0.00000 | 11.9501 |
| 119635 | INF903J01OP6 | 2013-01-04 | 0.00000 | 12.0196 |
| 119635 | INF903J01OP6 | 2013-01-07 | 0.00000 | 12.0196 |
| 119635 | INF903J01OP6 | 2018-09-26 | 19.42930 | 19.4292 |

Code 119566 is Sundaram Large and Midcap Fund Direct Growth. Code 119635 is
Sundaram Conservative Hybrid Fund Direct Growth, formerly Debt Oriented Hybrid.
The changes are confined to the calculation view. Raw source bodies, stored
positive observations, NAV chart/export values, quality warnings and archive
`unresolved` flags remain intact. No unit factor, interpolation, sibling-plan
borrowing or omission-based deletion is used.

The September 2018 correction has its own exact seven-observation guard. It
continues to apply to a clean current series if the provider fixes the January
zeros first. An unknown September value or any independent current quality
warning prevents that branch from applying.

## Primary evidence and identity

The issuer's [NAV history page](https://www.sundarammutual.com/nav-dividend-history)
advertises `Views_NAV_IDCW.LoadNAVHisDownload`. Ordinary public queries used its
returned fund selectors `LM` and `DH` and dates from 1 January 2013 through
29 October 2026. Exact Direct Growth labels were selected from the fund-level
responses. Narrow January queries reproduce all six values. A separate
21 September-1 October 2018 `DH` query reproduces 19.4292 and six unchanged
surrounding positive values.

The historical and current identity chain is explicit:

- [2016 Equity Multiplier SID](https://www.sundarammutual.com/pdf2/2016/SID/Equity/Sundaram_Equity_Multiplier_2016_8.pdf),
  physical page 5, and [current Large and Mid Cap KIM](https://www.sundarammutual.com/Report/KLAMCF),
  physical page 13, both identify Direct Growth as INF903J01PR9.
- [2016 Monthly Income Plan Aggressive SID](https://www.sundarammutual.com/pdf2/2016/SID/Fixed_Income/Sundaram_Monthly_Income_Plan_%28Aggressive%29-2016-2.pdf),
  physical page 6, and [current Conservative Hybrid KIM](https://www.sundarammutual.com/uploaddir/KIM/Sundaram_Conservative_Hybrid_Fund/Sundaram_Conservative_Hybrid_Fund_9_2025_271125_190521.pdf),
  physical page 13, both identify Direct Growth as INF903J01OP6.
- The issuer's [recategorization table](https://www.sundarammutual.com/sebicategorization)
  connects Equity Multiplier to Large and Mid Cap, and MIP Aggressive to Debt
  Oriented Hybrid. The current Conservative Hybrid material preserves the latter
  former name. The supplied official roster connects these ISINs to the exact
  numeric codes.

All four ISIN tables were visually checked. Neither scheme-level NFO dates nor
financial statements' performance/allotment dates justify removing older rows:
the daily issuer series publishes positive Direct NAVs before some reported
performance start dates.

### Complete-history reconciliation

| Check | 119566 | 119635 |
| --- | ---: | ---: |
| Retained raw source rows | 3,399 | 3,334 |
| Retained positive source rows | 3,396 | 3,331 |
| Rejected zero rows | 3 | 3 |
| Saved checkpoint-215 positive rows | 3,394 | 3,329 |
| Saved date/NAV strings matching current capture | 3,394 | 3,329 |
| Distinct issuer dates | 3,406 | 3,350 |
| Exact shared positive values | 3,395 | 3,329 |
| Positive-value corrections | 0 | 1 |
| Other issuer-only dates, documented but not added | 8 | 17 |
| Source-only positive dates, preserved | 1 | 1 |

Both issuer responses repeat one identical 10 March 2026 value. Neither contains
a conflicting duplicate. The issuer omits 18 May 2017 from both plans; the saved
values 29.52660 and 18.33220 remain in the calculation series. The targeted change
does not silently add the other 25 issuer-only dates or claim complete historical
coverage. Full corrected candidates pass the existing 40% discontinuity test.

| Evidence bytes | SHA-256 |
| --- | --- |
| 119566 original source, 132,971 bytes | `9d52b3c72de173b79d4b5e3463b194c0ac9d287b34503683794f15637862c7c2` |
| 119635 original source, 130,400 bytes | `a9e07f807e44fbc0e99e4b0b707120088438d11060ffa6ff4ec8ed5b98f4abd2` |
| LM full issuer response, 1,477,800 bytes | `d2469bd8c5c02aeced2027981756ba09fea5e8357f4821f720b61699893e19af` |
| DH full issuer response, 2,834,398 bytes | `8aac79cdfa2c397462ad0b41f2bf7c71802febdf9c3795c030f65bac76e42e04` |
| DH September confirmation, 6,652 bytes | `38972476b9ff73323f3ccfed39e7e5f9c0c03df518a617dc20406838da3d8591` |
| Saved 119566 document, `JSON.stringify(doc) + LF` | `6fa238d77fd5a837417c12a766ba566135614b051f6ff48af18df52a2f26bbbc` |
| Saved 119635 document, `JSON.stringify(doc) + LF` | `10bf78b31e564533344670a75afaf1e04cfdf1fcb1a5178f2c4303e4068284b8` |

## Why rejected-date provenance is necessary

The former normalizers discarded rejected rows and retained only a warning count.
Different sets of three rejected dates could therefore produce identical positive
histories, warnings and retained successful-fetch timestamps. A count or an
immutable hash of that already-filtered history cannot identify the discarded
dates.

The optional `rejectedZeroNavDates` field now certifies the entire rejected set
only when every rejected observation has a valid date and an explicit zero NAV.
Repeated rejected dates, positive-date collisions, malformed/negative values and
conflicting positive duplicates make the evidence unavailable. Supplied evidence
must match the one exact generated invalid-count warning. An absent field means
unknown, and never means zero rejected rows.

API, cache, Worker and shared-archive boundaries validate the field. Merges use
only complete incoming evidence with the same full identity, every previous
positive observation unchanged, and merged points equal to that incoming series.
Partial, changed, older, late and ambiguous unions lose the evidence. A fresh
complete response can establish its own current proof over a legacy projection;
it does not claim to reconstruct the legacy rejected dates.

The internal `sourceObservedAt` clock tracks the most recent inspected response
separately from the older successful `fetchedAt`. New unknown rejections advance
that clock too. Contradictory cache proofs and regressive supplied clocks are
rejected. An unresolved legacy cache without the new observation clock receives a
conservative hydration-time bound, even when older archive metadata is present.
This is not a claimed historical source retrieval time; it prevents replaying an
older archive from silently authorizing a calculation review. Concurrent direct
history callers for the same scheme and storage generation share one pending raw
fetch and validation. A forced refresh remains independent of archive-only work.

Archive documents retain version 1 with optional evidence. Existing documents
without evidence remain valid and blocked. No existing archive is retrospectively
annotated. The next ordinary collector can save evidence obtained from actual raw
responses. The original collector scope, request limits, backoff, cooldown,
single-writer control, schedule, warning text and unresolved accounting are
unchanged. Static return rankings still reject unresolved archive records.

## Validation and operational limits

Regression tests cover the same-count/different-dates collision, unknown or
malformed rejections, stale and contradictory proofs, legacy cache migration,
full/partial/changed history merges, exact plan identities, all date/value guards,
additional discontinuities and provider partial fixes. Component tests exercise
the derived chart and SIP values while raw NAV charts and exports retain their
original observations. Full retained source and saved histories were independently
reconciled before implementation.

Code deployment and archive collection are separate operations. Deploying this
change does not clear the 103 legacy audited flags, erase any of the archive's
source issues, or imply that the two old normalized snapshots already contain
rejection evidence. Two audited cases now have supported calculation repairs;
101 still lack sufficient primary evidence for a complete repair. Exact workflow,
deployment and checkpoint results belong in the accompanying continuation report.
