# FundScope — Mutual Fund Dashboard

An Indian mutual fund research dashboard with the approved light FundScope interface and analytics based on available MFAPI NAV histories.

- **Canonical development repository:** [Vasuki8/mutual-fund-dashboard](https://github.com/Vasuki8/mutual-fund-dashboard)
- **Development direction:** GitHub only, as requested by the owner on 21 October 2026.
- **GitHub website deployment:** not yet configured or verified. This repository currently contains the prior Worker application and a separate optional GitHub archive importer.
- **Source:** [MFAPI](https://www.mfapi.in/) · [API documentation](https://www.mfapi.in/docs/)

Development and scheduled imports for the former ChatGPT-hosted website have stopped. Its existing data has not been deleted or migrated. The linked import task is paused. Do not publish further releases to that host or restart its task without a later explicit request from the owner.

The next deployment work is a standalone GitHub Pages build that reuses the approved interface. The current browser data and status calls still depend on the old server, so this requires an adapter and a verified deployment workflow. See [deployment status and next steps](docs/DEPLOYMENT.md). GitHub pushes currently run checks; they do not publish a website.

## What the application does

Search by scheme name or code, distinguish Direct/Regular and Growth/IDCW options, save a local watchlist, and compare up to four funds on common reported dates. Research includes NAV/wealth/drawdown charts, absolute and annualized returns, complete-month risk statistics, rolling holding periods, monthly heatmaps, and CSV/PNG exports.

`All` uses the entire history available for the selected scheme. There is no 1-, 3-, or 5-year storage cutoff. Provider data gaps are not filled with invented values. Distribution-paying options show raw NAV; total-return analytics require suitable data. [Calculation rules](docs/METHODOLOGY.md) document the financial assumptions and data-quality gates.

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
pnpm run build
pnpm run dev
```

A clean clone currently uses the portable Vinext development environment. These commands validate the retained application locally; they do not deploy it. Install scripts approve only named build dependencies, use a pinned package manager, and enforce the committed release-age policy.

The retained browser client calls same-origin `/api/mf` endpoints. A standalone GitHub Pages version still needs to replace this server dependency and its `/api/data/status` call. The former private sync procedure is archived in [SYNC_OPERATIONS.md](docs/SYNC_OPERATIONS.md) and must not be used for current development.

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
- [Independent GitHub-only archive](docs/GITHUB_ARCHIVE.md): a separate opt-in GitHub Actions and Releases full-history collector, without Site authentication. Public redistribution permission must be checked before activation.
- [Archived hosted update runbook](docs/SYNC_OPERATIONS.md): historical import and recovery details; the linked task is paused.
- [Archived Site deployment notes](docs/LEGACY_SITE_DEPLOYMENT.md): retained for reference, not an active release procedure.
- [Capability roadmap](docs/ROADMAP.md): implemented features and future data-dependent work.
- [Design and implementation plan](docs/superpowers/specs/2026-10-21-persistent-sync-design.md): persistent archive contract.

## Verification record

Historical release verification is recorded in `docs/RELEASE_VERIFICATION.md`. CI runs typechecking, behavioral tests and the current production build on main, feature branches and pull requests. A future GitHub website release must verify its own deployment and data path. A future GitHub updater must verify its own persisted results before its schedule is described as active.
