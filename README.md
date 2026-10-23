# FundScope — Mutual Fund Dashboard

An Indian mutual fund research dashboard with the compact layout and Atlas colour theme and analytics based on available MFAPI NAV histories.

- **Canonical development repository:** [Vasuki8/mutual-fund-dashboard](https://github.com/Vasuki8/mutual-fund-dashboard)
- **Development direction:** GitHub only, as requested by the owner on 21 October 2026.
- **Live website:** [FundScope on GitHub Pages](https://vasuki8.github.io/mutual-fund-dashboard/) · [verified deployment on 21 October 2026](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/39652812557).
- **Source:** [MFAPI](https://www.mfapi.in/) · [API documentation](https://www.mfapi.in/docs/)

Development and scheduled imports for the former ChatGPT-hosted website have stopped. Its existing data has not been deleted or migrated. The linked import task is paused. Do not publish further releases to that host or restart its task without a later explicit request from the owner.

The standalone GitHub Pages build reuses the compact layout and Atlas light/dark colours. It can read a verified shared history snapshot and refresh individual funds directly from MFAPI, with credentials omitted and older cached observations retained. The GitHub-only archive is opt-in: its [activation and public-data conditions](docs/GITHUB_ARCHIVE.md) remain in force. A deployed interface or passing workflow does not establish saved bulk history; Data status shows the actual published checkpoint, gaps and browser-local cache separately.

## Shared GitHub history

The v2 collector imports full available per-scheme histories in bounded tranches, saves verified immutable Release assets, and resumes from a durable checkpoint. It discovers new schemes from the all-latest catalogue twice daily, retains disappeared schemes and older NAV observations, and continues source/quality retries and historical reconciliation. Each changed checkpoint requests publication to the same live website.

Pages builds verify the complete snapshot and its size before publishing it. Turning off collection preserves previously saved histories. With no shared checkpoint, the dashboard reports that state explicitly and continues direct MFAPI access and browser caching. See the [archive runbook](docs/GITHUB_ARCHIVE.md) for counter definitions, limits, activation, and first-tranche verification. The old hosted archive remains separate and paused.

## What the application does

Search by scheme name or code, distinguish Direct/Regular and Growth/IDCW options, save a local watchlist, and compare up to four funds on common reported dates. In the explorer and watchlist, name sorting applies to the full filtered result before pagination. Once a compatible verified GitHub Pages archive is published, 1Y/3Y/5Y return and 3Y maximum drawdown sorting also rank the complete matching set using the compact, checkpoint-tied NAV analysis index; funds without eligible archived histories appear after available values. It does not fetch every fund on demand to sort. If a full index is unavailable and not all matching histories have loaded, performance sorting is disabled rather than sorting only the current page. Compare two explicitly labeled Direct and Regular Growth plans when the fund house, category, type and normalized scheme names match; the panel displays only observed NAV differences, not expense ratios or verified share-class mappings. Research includes NAV/wealth/drawdown charts, absolute and annualized returns, complete-month risk statistics, rolling holding periods, monthly heatmaps, and CSV/PNG exports. The Risk & drawdown tab lists the five deepest observed decline episodes plus any current unrecovered episode, with peak/trough/recovery dates and calendar-day durations over the selected range.

`All` uses the entire history available for the selected scheme. There is no 1-, 3-, or 5-year storage cutoff. Provider data gaps are not filled with invented values. Distribution-paying options show raw NAV; total-return analytics require suitable data. [Calculation rules](docs/METHODOLOGY.md) document the financial assumptions and data-quality gates.

Choose **Custom** beside the analysis presets, enter **Start date** and **End date**, then **Apply dates** to study a specific period on a fund or comparison page. Requested dates and actual NAV dates are shown separately. Charts, selected-period statistics, drawdown episodes, and CSV exports follow the applied range. Shorter source history is disclosed, empty ranges remain empty, and partial months are excluded from monthly risk calculations. The trailing-return table and Holding periods view continue to use their explicitly labeled full available history.

## Previous hosted archive — scheduled imports paused

The former hosted updater used bounded import tranches and was paused on 21 October 2026 at the owner's request. Its old hourly and twice-daily schedules must not be restored automatically. The behavior described in this section belongs to that retained implementation; it is not an active GitHub import or proof of a GitHub deployment. Historical release snapshots remain in the [release verification record](docs/RELEASE_VERIFICATION.md).

Bulk import prioritizes schemes that have never been attempted, then retries schemes with no saved history up to three recorded attempts. It does not spend the initial sweep repeatedly refreshing already saved histories. Each tranche refreshes the catalogue, saves full available per-scheme histories, and keeps progress across interruptions. The completion report separates saved histories, unresolved saved data, and schemes with no usable history after three attempts. Those exceptions remain eligible for normal follow-up; completion of the bulk pass is not a claim that the source supplies every historical observation.

| Data | Storage and behavior |
| --- | --- |
| Catalogue and latest source snapshot | Validated server-side, saved persistently, with source NAV dates separate from refresh time. Schemes with invalid latest NAV retain their identity and a warning. |
| Complete available scheme history | R2 objects retain raw NAV strings and every valid source date. Existing older observations survive a shorter later response. |
| Archive index and synchronization | D1 stores coverage, checkpoints, run state, durable failures and leases. |
| Browsing cache | IndexedDB speeds repeat visits and supports a visible stale-data fallback. |
| Personal research | Watchlist, comparison selections and assumptions stay in the browser. JSON export/restore provides a user-controlled backup. |

**Archive coverage is explicit.** A successful catalogue refresh is not a claim that every historical NAV has been imported. In the retained hosted implementation, the **Data status & backups** page shows schemes catalogued, histories archived, stored observation count, backlog, source dates, and run results. Opening a scheme can fetch and archive its history on demand. Scheduled continuation is paused. A scheme that has never supplied usable NAVs cannot be represented as a complete history.

The old coverage bar measures schemes saved in the former hosted archive. The old page's planned update times do not reflect the external task's paused state. Do not transfer those counts or schedule claims into a GitHub Pages version without an independently verified data source.

The source determines the earliest available observation. FundScope does not claim that MFAPI covers every observation since the legal inception of every Indian scheme.

## Development

Use Node **24** and pnpm **11.25.0**:

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
pnpm run build:pages
pnpm run dev:pages
```

The standalone Vite app starts at `static-pages/index.html`, uses `/mutual-fund-dashboard/` as its base, and retains the existing hash routes. The source entry stays outside the repository root so existing branch-based Pages publishing keeps its landing page. Its directory name also avoids activating the retained framework's `pages/` router convention. `pnpm run preview:pages` serves the compiled `dist/pages` locally. Local builds without a materialized shared snapshot use direct MFAPI and the browser cache; no former-host credentials or Worker bindings are needed.

To validate the retained Worker implementation locally:

```sh
pnpm run build
pnpm run dev
```

A clean clone retains the portable Vinext environment for those original commands. Local build and preview commands do not deploy either runtime. Install scripts approve only named build dependencies, use a pinned package manager, and enforce the committed release-age policy.

The retained Worker browser client still calls same-origin `/api/mf` and `/api/data/status` endpoints. The standalone build selects its data path through a build-only flag and does not use those services. Histories, watchlists, and settings stored at another website do not transfer automatically; use the existing JSON backup and restore controls for a user-controlled transfer. The former private sync procedure is archived in [SYNC_OPERATIONS.md](docs/SYNC_OPERATIONS.md) and must not be used for current development.

### Legacy database setup for local development

The retained schema lives in `db/schema.ts`; generated, immutable migrations live in `drizzle/` with their Drizzle metadata. Use `pnpm run db:generate` after schema changes that still need the legacy server. Never create tables in request handlers or edit an already-applied migration. Do not deploy a migration to the former host as part of GitHub development.

For a local production preview, build first, then apply each unapplied migration to the local D1 binding:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js \
  d1 execute DB --local --config dist/server/wrangler.json \
  --persist-to .wrangler/state --file drizzle/0000_organic_swordsman.sql
```

This command targets local preview state only; apply each migration once.

### Retained server API surface

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/mf/search?q=...` | Scheme search, with persistent catalogue fallback. |
| GET | `/api/mf/{schemeCode}` | Complete available history with `_fundscope` archive provenance. |
| GET | `/api/data/status` | Catalogue/history coverage, initial-import counters, planned cadence, last refresh and run status. |
| POST | `/api/sync/start` | Authorized, idempotent catalogue refresh and history run; optional `mode: 'backfill'` prioritizes the initial import. |
| POST | `/api/sync/step` | Authorized, checkpointed batch of up to 20 histories. |
| POST | `/api/sync/finish` | Authorized final checkpoint with honest remaining-work status. |

All sync writes require `FUNDSCOPE_SYNC_TOKEN`. Credentials belong in the runtime secret store, never in this repository, browser code, schedule text, command-line arguments or logs. The updater accepts one hidden JSON line on stdin and rejects redirects to prevent forwarding credentials to other origins.

## Operations and releases

- [Deployment status and next steps](docs/DEPLOYMENT.md): active GitHub development direction and standalone deployment requirements.
- [GitHub archive operations](docs/GITHUB_ARCHIVE.md): opt-in Actions/Release history collection, verified Pages delivery, twice-daily catalogue discovery and visible source gaps. Public redistribution permission must be checked before activation.
- [Archived hosted update runbook](docs/SYNC_OPERATIONS.md): historical import and recovery details; the linked task is paused.
- [Archived Site deployment notes](docs/LEGACY_SITE_DEPLOYMENT.md): retained for reference, not an active release procedure.
- [Capability roadmap](docs/ROADMAP.md): implemented features and future data-dependent work.
- [Design and implementation plan](docs/superpowers/specs/2026-10-21-persistent-sync-design.md): persistent archive contract.

## Verification record

Historical release verification is recorded in `docs/RELEASE_VERIFICATION.md`. CI runs typechecking, behavioral tests and both production builds on main, feature branches and pull requests. The separate Pages workflow uses a read-only preflight to require **Settings → Pages → Source = GitHub Actions** before it builds, tests, and deploys `main`; it can also be dispatched manually. It never changes the publishing-source setting. A GitHub website release must verify its returned deployment URL and data path before being reported as live. A GitHub updater must independently satisfy its activation conditions and verify persisted results before its schedule is described as active.
