# GitHub archive and live-data integration

## Goal and existing authorization

Continue the approved Graphite dashboard in `Vasuki8/mutual-fund-dashboard`: durable full available MFAPI history, visible saved progress, and scheduled refreshes at least twice daily. Keep the existing GitHub Pages UI and its financial methods. The user has redirected development to GitHub; no old Site credentials, storage, imports, or automations are used.

The existing `docs/GITHUB_ARCHIVE.md` public-data review remains an activation prerequisite. Implementation, fixtures, tests, code review, and the UI deployment can proceed while raw-data publication remains disabled. Free API access and permission to cache do not establish an explicit public bulk-data licence.

## Architecture

Use immutable compressed GitHub Release assets and a permanent control release pointing at one verified checkpoint. Each checkpoint contains the latest catalogue reference, stable history-shard references, and per-scheme import outcomes. A write uploads and verifies all new data and its checkpoint before updating the control pointer. Failed or timed-out publication never advances coverage. Rotate storage generations below 1,000 assets; prior references continue to work without copying or deleting history.

History shards group schemes by `floor(schemeCode / 32)`. Catalogue additions do not move existing records. Reuse the established `validateHistory`, `mergeHistory`, and `buildCatalogue` semantics. Retain older observations, previously known schemes, corrections and quality warnings. Count an attempt only when a source request starts. Work deferred by the deadline stays pending. Failures use bounded backoff and remain visible rather than exhausting into a false complete state.

Bound each execution by elapsed time, source concurrency, number of schemes and shards, response bytes, and asset bytes. Refresh the all-latest catalogue in two UTC daily slots (07:00 and 19:00), and select history work for first attempts, changed NAV dates, failed/quality responses, and periodic full-history reconciliation. A catalogue refresh is distinct from a history refresh; never label a latest-only row as full history.

Publish the current snapshot with the app under its existing GitHub Pages base. The build downloads and verifies immutable assets, validates history identities/counts/ranges against the checkpoint, materializes compressed files, and writes the public manifest last. Enforce a conservative Pages size budget before deployment; a missing/corrupt/oversize snapshot fails the publication rather than silently omitting data. Every UI deployment hydrates the current archive, preventing UI-only releases from erasing data. Browser code fetches same-origin files and explicitly verifies/decompresses them; it never carries a token or enumerates Releases.

The client uses the shared snapshot when available, keeps per-fund direct MFAPI refresh and offline cache fallback, and merges browser histories so a short response cannot discard older dates. Search can use the shared catalogue when direct search is unavailable. Status distinguishes the published checkpoint, catalogue freshness, full-history coverage, source gaps, and browser-local cache. A complete attempted pass is not complete coverage.

## Workflow and rollout

Preserve the repository enable variable. The archive job continues bounded work on the existing off-peak 15-minute cadence and can be manually run. Only a changed verified checkpoint requests the reusable Pages publishing workflow. Pages builds are serialized and always use current main plus a verified current checkpoint. Add two daily Pages refresh opportunities and retain push/manual deploys. GitHub scheduling is best effort; the UI exposes actual timestamps instead of guaranteeing successful runs.

No existing v1 release assets exist as of the implementation start. The new v2 collector uses a separate control tag and does not claim v1 or old-hosted coverage. Leave historical source untouched.

## Acceptance criteria

- A deadline does not consume an attempt; failed upload/readback cannot move the pointer.
- Restarting after an interrupted write does not duplicate progress or delete history.
- Identity, digest, count and range mismatches fail closed.
- New schemes join the queue and missing catalogue schemes remain retained.
- Full available older history survives short, regressed and failed refreshes.
- Clean/saved/pending/source-gap/quality/refresh counts are computed from validated state.
- Browser reads work under `/mutual-fund-dashboard/`, bounded decompression, with direct/offline fallbacks.
- Disabled publication is shown honestly; no invented coverage, schedules or successful imports.
- All existing analytics tests, typecheck, static build and retained production build pass.
