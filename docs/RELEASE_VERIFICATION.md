# FundScope 0.2 release verification

## Published release and enabled schedule

Verified on **21 October 2026 at 04:07 UTC**. The live application is [fundscope-research.patelvasuki.chatgpt.site](https://fundscope-research.patelvasuki.chatgpt.site), retaining its existing owner access.

- Published Site version: **4**; deployment succeeded with runtime environment revision 1.
- Deployed GitHub code: [`b8b58c38e9a4d6b6cd0b1c7246e7ee54f51e3030`](https://github.com/Vasuki8/mutual-fund-dashboard/commit/b8b58c38e9a4d6b6cd0b1c7246e7ee54f51e3030).
- Site source commit: `1b72db42cd376580c02d9654eb3d93359c8f6217`. Its complete source tree matches the deployed GitHub code tree, `d77f0962493aeb6c88793e86874507a0714d6323`.
- [GitHub checks passed on the merged code](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/39541850320).
- Exactly one linked schedule, **Refresh FundScope market data**, was created after hosted write/readback verification and independently confirmed enabled. It runs daily at **05:37 and 17:37 UTC**, equivalent to **11:07 AM and 11:07 PM IST**. Future timer executions have not yet occurred at this verification time.

The authenticated initial import completed its bounded invocation at **04:06:52.918 UTC** with `checkpointed: true` and `readbackVerified: true`. The following counts are a timestamped verification snapshot, not a permanent claim about current coverage:

| Check | Verified value |
| --- | --- |
| Catalogue schemes | 37,982 |
| Schemes with persisted history | 286 |
| Persisted NAV observations | 997,734 |
| Schemes requiring backfill, refresh or quality follow-up | 37,742 |
| Catalogue refresh timestamp | 2026-10-21T04:02:23.302Z |
| Latest available source NAV date | 2026-10-20 |
| Latest successful history fetch | 2026-10-21T04:06:49.905Z |
| Invocation result | Partial; stopped at its work budget with progress retained |
| Scheme outcomes in this invocation | 235 processed successfully; 47 flagged for retry or validation |

Some flagged schemes already have retained observations, so pending work is not simply catalogue size minus saved histories. The initial physical archive is explicitly incomplete. Every selected scheme can retrieve its complete available source history on demand; the enabled scheduled updater continues the persistent universe archive in bounded batches. Current coverage is visible on the live **Data status & backups** page.

## Local integration

Verified 21 October 2026: **143 behavioral tests passed**, TypeScript passed, and the production Worker build passed. Test counts: analytics 27; browser API 28; storage 21; chart data 3; app request races 1; server archive 31; sync runner 32.

The production Worker build and TypeScript checks cover the browser application, all six API routes, the D1/R2 archive, and the standalone updater. Behavioral tests run in separate Node processes to keep the browser-cache test hooks isolated.

The checks cover financial calculations, calendar alignment, quality gates, browser restore/cache races, original archive timestamps, full-history preservation and source corrections, immutable R2 objects and D1 pointer updates, authenticated writes, leases/checkpoints, fair backfill progress, durable failures, new-slot catalogue refresh after interruption, slow-step budgets, runner deadline reservation, origin restrictions, hidden credential input, retry limits and persistent status readback.

The independent review found and resolved three material issues: a step could exceed the runner request budget; a previous interrupted run could suppress a new-slot catalogue refresh; and a truncated clean response could incorrectly clear quality warnings on retained observations. Regression tests cover all three. The runner also reserves a complete request allowance before each history step and retry.

## Runtime checks

The local preview applied the generated six-table migration successfully. The new Data status page renders zero coverage, initial-sync status, schedule times and error recovery honestly before the first import. The local Worker cannot resolve the upstream provider in this managed preview network, so this environment is not evidence of hosted MFAPI access. Node with the configured environment proxy successfully fetched real MFAPI history.

Production acceptance requires the published updater to perform an authenticated catalogue/history write and a separate status readback. The linked schedule is enabled only after that gate. Runtime coverage is available from `/api/data/status` and the dashboard's Data status page; it changes after each scheduled run and on-demand history request. A nonzero backlog remains explicitly incomplete.

The first hosted import exposed a Cloudflare Worker compatibility issue: `redirect: 'error'` is rejected before network I/O. The provider now uses `redirect: 'manual'` and explicitly rejects every 3xx response without following its destination. Two added regressions verify successful history persistence with Worker-compatible options and rejection of external redirects without additional requests or archive writes. The isolated server suite passes all 27 tests. See the [Cloudflare Request documentation](https://developers.cloudflare.com/workers/runtime-apis/request/#parameters).

Hosted full-history persistence was verified for scheme 122639: 3,295 observations from 2013-05-28 through 2026-10-19, followed by a second response served from the shared archive. The real bulk catalogue exposed four empty optional dividend-reinvestment ISIN fields (schemes 135681–135684). Empty or whitespace-only optional identifiers now normalize to null within the existing length limit; required identity checks remain strict. The unchanged 37,982-row source snapshot passes catalogue validation. Four added regressions cover catalogue, search, history and invalid-input controls, bringing the server suite to 31 tests.
