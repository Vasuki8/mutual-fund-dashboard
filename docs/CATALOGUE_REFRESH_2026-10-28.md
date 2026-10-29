# Catalogue refresh incident — 28 October 2026

## Initial confirmed production state — checkpoint 211

[Archive run 40758061683](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40758061683) completed successfully, saved **checkpoint 211**, published it and verified the live checkpoint. Its collector still rejected a refreshed catalogue with **source_catalogue_invalid**. The automatic continuation stopped with **catalogue_error**. A successful workflow therefore does not mean catalogue freshness recovered.

The existing validated catalogue was retained. Its retrieval timestamp is **2026-10-27T16:59:52.790Z**. That snapshot has 37,998 listed identities, 25,888 bulk-NAV identities and 12,110 listed identities absent from the bulk cache. It is incorrect to classify the missing bulk rows as inactive merely because the bulk cache omitted them.

That run selected **82** schemes within the strict **8,524-scheme** 30-day repair cohort. Checkpoint 211 reports 37,380 saved histories, 33,851 histories without stored quality flags, 3,529 with flags, 654 source errors including retained-history refresh failures, and 8,306 refresh/reconciliation tasks pending. These are overlapping full-archive accounting measures, not distinct counts of active funds with no data.

The [latest scoped audit, run 40722225054](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40722225054), inspected **checkpoint 210**. Among 8,524 eligible identities it found **zero missing saved histories**, 34 failed refreshes with data retained, and **610 quality-flagged histories**. Calculation-only corporate-action recognition does not erase those source flags. These scoped counts were not independently recomputed for checkpoint 211.

## What is known about the rejection

Recent logs alternate among **source_payload_invalid**, **source_catalogue_membership_conflict** and **source_catalogue_invalid**. Existing log entries do not identify the failing endpoint or guard. Static tracing shows:

- Invalid response shape/size, invalid identities, duplicate codes or a rejected constructed catalogue can produce source_catalogue_invalid.
- Bulk identities absent from the independently checked list produce source_catalogue_membership_conflict.
- Bounded response reads and JSON parsing share source_payload_invalid.
- Invalid NAV values or dates alone are retained as null/older observations with warnings; they do not establish the cause of source_catalogue_invalid.

[MFAPI's official API specification](https://www.mfapi.in/docs/openapi.json) describes `/mf` as paginated, with optional `limit` at most 1,000. It does not guarantee an unlimited default response. A default-page change is one possible integration issue, but it was **not observed or proved** in this incident. No validation threshold was relaxed.

## Bounded read-only probe

[Probe run 40782618431](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40782618431), [job 123147824755](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40782618431/job/123147824755), loaded checkpoint 211 using read-only GitHub permissions. It enforced the saved-source cooldown guard, permitted at most three metadata requests with no retry loop, retained the 32 MiB response and 12-second request bounds, and excluded full-history requests.

The first request to `/mf/latest` did not yield a usable response before the 12-second request boundary. The job logged **probe_transport_or_validation_error**, **one physical source request**, **zero archive writes** and **zero history requests**. No response status or payload summary was obtained, so the failing production field or endpoint guard remains undiagnosed. The probe does not prove that the earlier JSON/identity failures share the same cause.

The temporary script and workflow were removed from their isolated branch after completion in commit `2589e00d0733a7d1317e828ec3f64b830414b6af`. They were not merged into production. The completed probe's logs remain the evidence; no new schedule or collector was created.

## Later production evidence — checkpoint 212

[Archive run 40790236702](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40790236702) repeated **source_catalogue_invalid** at **2026-10-28T23:52:02.713Z** with no saved source-wide cooldown. It attempted 78 eligible histories, added no first-time histories, reported no verified reconciliation progress, and saved checkpoint **212** with timestamp **2026-10-28T23:52:49.162Z**. Publication and live-checkpoint verification succeeded. Continuation stopped with **no_reconciliation_progress**, not the preceding run's catalogue_error.

The logged repair cohort was still 8,524. Full-archive refresh/reconciliation pending increased to 8,705; the other reported counts above were unchanged. The retained catalogue timestamp is inferred unchanged from the failed refresh and the collector's preservation path; the compressed checkpoint was not independently decoded for this follow-up. The checkpoint-210 scoped audit was not rerun for checkpoint 212.

## Diagnostic logging

Catalogue failures now attach optional **diagnostic** metadata to the existing failure event: a static stage and reason, plus counts already available at the failed check. Stages distinguish bulk NAV, independent membership list, membership cross-check and terminal probe. Exact known identity/duplicate validator messages map to static reasons; unknown validator exceptions become validation_failed. No response rows, names, ISINs, raw exceptions, headers or credentials are logged.

Transport failures similarly distinguish request timeout/failure, HTTP status, bounded-body failure and JSON parsing. The existing public error codes remain unchanged. Body and JSON errors still receive no payload retry; request deadlines, physical HTTP attempt limits, source cooldowns and request order are unchanged. The final constructed-catalogue validation retains its existing error semantics.

These diagnostics are **logs only**. No checkpoint schema, stored source data, quality warning, eligibility rule, UI or schedule changes. The existing main-branch collector trigger covers the modified collector file, so a merge offers one normally bounded collection opportunity; it does not create a separate probe or retry loop. A diagnostic field is evidence of where a rejection occurred, not proof that catalogue freshness has recovered.

## Remaining work

### Observed rejection and bounded follow-up — 29 October UTC

The normal collector on diagnostic commit `27ed3d19e9639afc4a6ffb836d5e3d2db6b710ad`, [run 40791957086](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40791957086), identified the rejection at **00:07:54.793Z**: **membership_list / duplicate_scheme_code / 75,998 rows**. Bulk NAV validation had already passed. It saved and published checkpoint **213**; 96 eligible histories were attempted, with no new histories or verified reconciliation progress. Seven transport failures increased full-archive source errors to 661; refresh/reconciliation pending became 8,807. The cohort remained 8,524 under the actual 29 October UTC date. Continuation stopped for no_reconciliation_progress.

The [read-only inspection, run 40792794792, job 123181855408](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40792794792/job/123181855408), then loaded verified checkpoint 213 and confirmed its retained catalogue timestamp **2026-10-27T16:59:52.790Z**, with no saved source cooldown. Three bounded metadata requests produced:

| Request | HTTP / bytes | Observed result |
| --- | --- | --- |
| `/mf` | 200 / 11,519,401 | 75,998 rows: exactly two identical ordered passes over 37,999 identities; every code occurred twice. No invalid rows, conflicting validated identity fields or differing repeated raw records. |
| `/mf?limit=1&offset=75998` | 200 / 173 | One row instead of an empty terminal result. |
| `/mf?limit=1&offset=37999` | 200 / 177 | One row that did not match the previously observed row at that offset. |

The respective response SHA-256 digests are `ad4bf1fce540dcc0121988c9d753094d1042e3ffc892ac75e2735fba395ca13e`, `9338c749a4604fd802baf85db218bb385a38503d0f7fc56095ba8f560a77dade` and `40d1c6e4ede5e72daac000185ba46aa7eecb960c3c509af3f06ff8539f002718`. The probe used the production identity validator, at most three GETs, no retries, 12-second/32 MiB request bounds, and the saved cooldown guard. It made **zero history requests and zero archive writes**.

The 37,999 count describes distinct identities observed in one response; it is **not newly verified current membership**. Removing identical duplicates alone cannot establish a complete catalogue because the pagination checks also failed. No acceptance rule was relaxed. The evidence does not establish the provider's internal cause or prove that every earlier error shares it.

The temporary probe was never merged into main. Its files were removed from its isolated branch in cleanup commit `30bb608445054dd33819f5453ae49c099bdb068a`, leaving the completed logs as evidence. No schedule or new collector remains. An independent review agreed that the prior validated catalogue must remain authoritative until a coherent list and terminal check succeed.

Keep the prior verified catalogue and existing cooldown/retry rules. A future successful bounded source response is needed to distinguish an integration incompatibility from invalid or unavailable upstream metadata. Confirm a new catalogue timestamp in a saved checkpoint and its successful publication before reporting recovery. This incident does not authorize deleting histories, marking omitted schemes inactive or restarting the former hosted importer.
