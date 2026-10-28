# Catalogue refresh incident — 28 October 2026

## Confirmed production state

[Archive run 40758061683](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40758061683) completed successfully, saved **checkpoint 211**, published it and verified the live checkpoint. Its collector still rejected a refreshed catalogue with **source_catalogue_invalid**. The automatic continuation stopped with **catalogue_error**. A successful workflow therefore does not mean catalogue freshness recovered.

The existing validated catalogue was retained. Its retrieval timestamp is **2026-10-27T16:59:52.790Z**. That snapshot has 37,998 listed identities, 25,888 bulk-NAV identities and 12,110 listed identities absent from the bulk cache. It is incorrect to classify the missing bulk rows as inactive merely because the bulk cache omitted them.

The latest run selected **82** schemes within the strict **8,524-scheme** 30-day repair cohort. Checkpoint 211 reports 37,380 saved histories, 33,851 histories without stored quality flags, 3,529 with flags, 654 source errors including retained-history refresh failures, and 8,306 refresh/reconciliation tasks pending. These are overlapping full-archive accounting measures, not distinct counts of active funds with no data.

The [latest scoped audit, run 40722225054](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40722225054), inspected **checkpoint 210**. Among 8,524 eligible identities it found **zero missing saved histories**, 34 failed refreshes with data retained, and **610 quality-flagged histories**. Calculation-only corporate-action recognition does not erase those source flags. These scoped counts were not independently recomputed for checkpoint 211.

## What is known about the rejection

Recent logs alternate among **source_payload_invalid**, **source_catalogue_membership_conflict** and **source_catalogue_invalid**. Existing log entries do not identify the failing endpoint or guard. Static tracing shows:

- Invalid response shape/size, invalid identities, duplicate codes or a rejected constructed catalogue can produce source_catalogue_invalid.
- Bulk identities absent from the independently checked list produce source_catalogue_membership_conflict.
- Bounded response reads and JSON parsing share source_payload_invalid.
- Invalid NAV values or dates alone are retained as null/older observations with warnings; they do not establish the cause of source_catalogue_invalid.

[MFAPI's official API specification](https://www.mfapi.in/docs/openapi.json) describes `/mf` as paginated, with optional `limit` at most 1,000. It does not guarantee an unlimited default response. A default-page change is one possible integration issue, but it was **not observed or proved** in this incident. No validation threshold was relaxed.

## Bounded read-only probe

[Probe run 40782618431](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40782618431), [job 123147824755](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40782618431/job/123147824755), loaded checkpoint 211 using read-only GitHub permissions. It respected a future saved source cooldown, permitted at most three metadata requests with no retry loop, retained the 32 MiB response and 12-second request bounds, and excluded full-history requests.

The first request to `/mf/latest` did not yield a usable response before the 12-second request boundary. The job logged **probe_transport_or_validation_error**, **one physical source request**, **zero archive writes** and **zero history requests**. No response status or payload summary was obtained, so the failing production field or endpoint guard remains undiagnosed. The probe does not prove that the earlier JSON/identity failures share the same cause.

The temporary script and workflow were removed from their isolated branch after completion in commit `2589e00d0733a7d1317e828ec3f64b830414b6af`. They were not merged into production. The completed probe's logs remain the evidence; no new schedule or collector was created.

## Remaining work

Keep the prior verified catalogue and existing cooldown/retry rules. A future successful bounded source response is needed to distinguish an integration incompatibility from invalid or unavailable upstream metadata. Confirm a new catalogue timestamp in a saved checkpoint and its successful publication before reporting recovery. This incident does not authorize deleting histories, marking omitted schemes inactive or restarting the former hosted importer.
