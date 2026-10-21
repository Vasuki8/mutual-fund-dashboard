# GitHub development and persistent MFAPI updates

## User outcome

Use Vasuki8/mutual-fund-dashboard as the canonical development repository, retain the approved light FundScope UI and live address, update market data at least twice daily while the website is closed, and expose complete available historical NAV data.

## Decisions

- Preserve the existing owner-private Site audience; “live” authorizes deployment, not a new sharing audience.
- Keep source and tests in GitHub. The supported Sites source workflow publishes an identical release copy; no claim of an automatic GitHub-to-Sites deployment integration.
- Migrate the current React UI to the supported Vinext Worker starter. D1 stores archive indexes, sync progress and failures; R2 stores market-data snapshots and full histories.
- Retain all history supplied by MFAPI for a scheme. Never impose a fixed 1/3/5-year storage cutoff, delete disappeared schemes, or invent missing observations.
- The full history endpoint remains available on demand for every provider scheme. A resumable archive backfill runs alongside scheduled updates; coverage is explicit until the physical universe is archived.
- Fetch the provider's all-scheme latest snapshot on each scheduled run. Historical reconciliation uses full history, preserves existing older observations, and applies newly reported values to overlapping dates. A latest snapshot alone is not labelled complete history.
- Run scheduled updates daily at 05:37 and 17:37 UTC (11:07 and 23:07 IST), with retries/checkpoints and honest partial-run status.
- Authentication: sync endpoints require a secret FUNDSCOPE_SYNC_TOKEN. The owner-only service token returned by the selected Site is stored as that secret and supplied in both the platform service header and x-fundscope-sync-token; never save credentials in source, task prompts, logs or files. Routine clients cannot write arbitrary history payloads.

## Data contracts

GET /api/data/status returns the SyncStatus contract in src/lib/sync-types.ts.
GET /api/mf/search?q=... returns MFAPI-style Scheme[] with validated search or persistent catalogue fallback.
GET /api/mf/[code] returns the MFAPI history payload plus _fundscope provenance. Full-history responses preserve raw NAV strings.
POST /api/sync/start {idempotencyKey} publishes a validated latest/catalogue snapshot and starts or resumes a checkpointed history run.
POST /api/sync/step {runId,limit} processes at most 20 schemes; max two concurrent upstream requests. No arbitrary external URLs or client-supplied NAVs.
POST /api/sync/finish {runId} closes the active invocation accurately; remaining work stays durable for future runs.

## Success criteria

GitHub contains the actual app source, CI and updater instructions. Hosted D1/R2 writes/readback work. The UI displays last successful catalogue sync, source NAV dates, archive coverage and earliest per-fund date. Two daily enabled scheduled runs are saved and linked to the Site. Existing financial, cache and restore behavior still passes regression tests. Provider failures preserve the last valid snapshot/history.
