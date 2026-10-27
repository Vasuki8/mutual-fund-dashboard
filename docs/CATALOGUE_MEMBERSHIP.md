# Scheme membership and bulk NAV coverage

## Confirmed source mismatch — 27 October 2026

The official [MFAPI OpenAPI contract](https://www.mfapi.in/docs/openapi.json) documents `/mf` as the scheme list, with optional `limit` and `offset` pagination. `/mf/latest` is described as a complete cached NAV dataset, with no pagination parameters. A successful HTTP response alone does not prove that cache is complete.

[Read-only investigation #40542284395](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40542284395) compared three metadata responses. The bulk cache returned **25,888** codes, ending at **138725**. The separate list returned **37,998** codes, ending at **154851**. Its last 998-row page agreed with the corresponding portion of the unpaginated list. All bulk codes were in the list; **12,110** listed codes were omitted by the bulk cache. No source histories or archive data were written.

## Production ingestion

`scripts/verified-catalogue.ts` separates observed membership from NAV availability. The GitHub collector enables this verification unconditionally, along with the owner's existing 30-day repair scope.

At each catalogue refresh it requests `/mf/latest`, `/mf`, and `/mf?limit=1&offset=<list length>`. The final probe must return an empty array. Existing transport deadlines, two-attempt transient retry cap, source-wide cooldowns, no-redirect and no-credentials policy apply. This is three logical metadata requests, not three guaranteed HTTP attempts if a permitted transport retry occurs. No extra per-scheme history requests are introduced by catalogue verification itself.

Validation rejects malformed or duplicate list identities, any bulk code missing from the list, a nonempty or malformed terminal response, and a list smaller than 90% of an existing catalogue containing at least 100 known codes. The size guard is deliberately conservative: an unusually large legitimate change needs review rather than silently removing thousands of records. These consistency checks cannot prove that the provider has no upstream errors shared by all endpoints.

For each code actually returned by the checked list:
- Membership is current, even when the bulk NAV cache omitted it.
- Existing observed NAV values and dates remain unchanged when absent from the bulk response.
- A newly listed code with no observed NAV gets `nav:null` and `latestDate:null`; no price or date is fabricated.

Codes absent from the checked list remain non-current. Historical records are retained. Membership does not establish that purchases are accepted.

Optional catalogue `membership` metadata records the verification source/time, list count, bulk NAV count and number missing from the bulk cache. The validator checks its timestamp and arithmetic against actual current entries. Legacy catalogues remain readable; the first production run without this metadata requests a new verified catalogue even within the same regular refresh slot. A failed check preserves the earlier catalogue and reports a source error instead of publishing partial membership.

## Recency is based on actual NAV dates

The owner's repair rule is unchanged: exact manual official open-ended roster code, independently observed current source-list membership, finite positive NAV, and a real observation date no more than **30 UTC calendar days old**, not in the future. Exactly 30 days qualifies; 31 does not. Full history is inspected for an eligible fund.

The public website retains its separate **seven-day** discovery rule. A new listing verification timestamp is not a new NAV date and must never reset either recency clock. Listing-only new codes remain outside both groups until a valid NAV is observed. Retained recent NAV data can establish reporting within the window, but does not prove a complete history or a fresh NAV on the verification date.

## Real-data before/after verification

[Read-only verification #40544862921, attempt 2](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40544862921) used the patched code at `680fc4a7598a30ec0a82851779eaa3fb9107a17a`, the immutable **checkpoint 198**, and three fresh metadata responses. It completed at **2026-10-27T16:52:25.402Z**. The first attempt stopped on a source-response read error without archive writes; the bounded manual retry succeeded without changing production thresholds or timeouts.

| Measure | Candidate catalogue result |
| --- | ---: |
| Independently listed codes | 37,998 |
| Codes in bulk NAV cache | 25,888 |
| Listed codes missing from bulk NAV cache | 12,110 |
| Eligible 30-day repair codes before | 3,133 |
| Eligible 30-day repair codes after | 8,524 |
| Recovered recent repair candidates | 5,391 |
| Eligible seven-day website candidates | 8,499 |
| Quality-flagged histories in recovered repair population | 610 |
| Failed refreshes retaining saved history | 25 |
| Missing saved history after a source failure | 0 |

Assertions checked every membership against the independently returned list, every retained price/date for omitted bulk codes, and unchanged original snapshot bytes. The verification performed **zero archive writes**. These counts are a verified candidate calculation, not evidence that production has saved or published a new checkpoint.

Original snapshot SHA-256: `23c925c9e85faf3ed6bb3d8ad72b090e5c977d991e58f22d9daf959b45cd406d`.
Candidate catalogue SHA-256: `729ef32cc5c72eda3a1f084291e6b417c5b58fee47171db2034ff1d79dc8a53c`.

The quality classes remain 176 invalid-only, 404 discontinuity-only, 22 both, and eight other flags. Recovering membership is **not a NAV correction** and does not clear those warnings. Verify a new saved checkpoint and deployed manifest separately before claiming public restoration. Track rollout in issue #54.
