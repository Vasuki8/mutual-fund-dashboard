# FundScope — Mutual Fund Dashboard

An Indian mutual fund research dashboard with the approved light FundScope interface, complete available MFAPI NAV histories, persistent shared market-data storage, and a scheduled cloud updater.

- **Application:** [fundscope-research.patelvasuki.chatgpt.site](https://fundscope-research.patelvasuki.chatgpt.site)
- **Canonical development repository:** [Vasuki8/mutual-fund-dashboard](https://github.com/Vasuki8/mutual-fund-dashboard)
- **Source:** [MFAPI](https://www.mfapi.in/) · [API documentation](https://www.mfapi.in/docs/)

The live application retains its existing owner access. GitHub is the source of truth for development; publishing a release uses the supported Sites source and deployment workflow. GitHub pushes run CI. They do not automatically publish the Site.

## What the application does

Search by scheme name or code, distinguish Direct/Regular and Growth/IDCW options, save a local watchlist, and compare up to four funds on common reported dates. Research includes NAV/wealth/drawdown charts, absolute and annualized returns, complete-month risk statistics, rolling holding periods, monthly heatmaps, and CSV/PNG exports.

`All` uses the entire history available for the selected scheme. There is no 1-, 3-, or 5-year storage cutoff. Provider data gaps are not filled with invented values. Distribution-paying options show raw NAV; total-return analytics require suitable data. [Calculation rules](docs/METHODOLOGY.md) document the financial assumptions and data-quality gates.

## Persistent data and twice-daily updates

The cloud updater is enabled at **05:37 and 17:37 UTC every day** — **11:07 AM and 11:07 PM IST** — without a visitor keeping the website open. It refreshes the all-scheme latest snapshot and processes bounded batches of complete histories. Data writes do not redeploy the application. The initial hosted import and the linked schedule were verified on 21 October 2026; see the [release verification record](docs/RELEASE_VERIFICATION.md).

| Data | Storage and behavior |
| --- | --- |
| Catalogue and latest source snapshot | Validated server-side, saved persistently, with source NAV dates separate from refresh time. Schemes with invalid latest NAV retain their identity and a warning. |
| Complete available scheme history | R2 objects retain raw NAV strings and every valid source date. Existing older observations survive a shorter later response. |
| Archive index and synchronization | D1 stores coverage, checkpoints, run state, durable failures and leases. |
| Browsing cache | IndexedDB speeds repeat visits and supports a visible stale-data fallback. |
| Personal research | Watchlist, comparison selections and assumptions stay in the browser. JSON export/restore provides a user-controlled backup. |

**Archive coverage is explicit.** A successful catalogue refresh is not a claim that every historical NAV has been imported. The **Data status & backups** page shows schemes catalogued, histories archived, stored observation count, backlog, source dates, and run results. Opening a scheme fetches and archives its full available history on demand; the scheduled importer resumes the remaining universe in batches. A scheme that has never supplied usable NAVs cannot be represented as a complete history.

The coverage bar measures schemes with saved histories. It does not indicate that an import is currently running. Each import stops after its work budget and retains its progress. Between runs the page shows a waiting state and the next planned update. Checking the status refreshes the displayed counts; opening a fund or running a scheduled import can add saved history.

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

A clean clone uses the portable Vinext development environment. Managed Sites workspaces use the bundled setup/build helpers and execution profile. Install scripts approve only named build dependencies, use a pinned package manager, and enforce the committed release-age policy.

The browser calls same-origin `/api/mf` endpoints; no MFAPI key is required. Browser requests use the current Site session. Private cloud writes need the separate, supported service access described in [SYNC_OPERATIONS.md](docs/SYNC_OPERATIONS.md).

### Database setup

The schema lives in `db/schema.ts`; generated, immutable migrations live in `drizzle/` with their Drizzle metadata. Use `pnpm run db:generate` after schema changes. The Site applies committed migrations during deployment. Never create tables in request handlers or edit an already-applied migration.

For a local production preview, build first, then apply each unapplied migration to the local D1 binding:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js \
  d1 execute DB --local --config dist/server/wrangler.json \
  --persist-to .wrangler/state --file drizzle/0000_organic_swordsman.sql
```

This command targets local preview state only; apply each migration once.

### API surface

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/mf/search?q=...` | Scheme search, with persistent catalogue fallback. |
| GET | `/api/mf/{schemeCode}` | Complete available history with `_fundscope` archive provenance. |
| GET | `/api/data/status` | Catalogue/history coverage, last refresh and run status. |
| POST | `/api/sync/start` | Authorized, idempotent catalogue refresh and history run. |
| POST | `/api/sync/step` | Authorized, checkpointed batch of up to 20 histories. |
| POST | `/api/sync/finish` | Authorized final checkpoint with honest remaining-work status. |

All sync writes require `FUNDSCOPE_SYNC_TOKEN`. Credentials belong in the runtime secret store, never in this repository, browser code, schedule text, command-line arguments or logs. The updater accepts one hidden JSON line on stdin and rejects redirects to prevent forwarding credentials to other origins.

## Operations and releases

- [Scheduled update runbook](docs/SYNC_OPERATIONS.md): fresh cloud access, idempotency, budgets, retry/recovery and verification.
- [Deployment notes](docs/DEPLOYMENT.md): GitHub development and the supported Site publication flow.
- [Capability roadmap](docs/ROADMAP.md): implemented features and future data-dependent work.
- [Design and implementation plan](docs/superpowers/specs/2026-10-21-persistent-sync-design.md): persistent archive contract.

## Verification record

Release verification is recorded in `docs/RELEASE_VERIFICATION.md` after integration. CI runs typechecking, behavioral tests and the production build on main, feature branches and pull requests. The hosted writer must also be exercised and its persisted result read back before a new schedule is enabled.
