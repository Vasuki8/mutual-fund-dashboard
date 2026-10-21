# GitHub development and deployment

## Active direction

The owner stopped development of the ChatGPT-hosted website on 21 October 2026. All further development belongs in [Vasuki8/mutual-fund-dashboard](https://github.com/Vasuki8/mutual-fund-dashboard).

The former hosted import task is paused. Do not deploy to that host, run its updater, retrieve its service credentials, or restore its schedules without a later explicit request from the owner. Keep existing data and resources intact.

## Verified status at this change

| Area | Status |
| --- | --- |
| Source code | GitHub `main` is the canonical source. |
| Approved interface | The Graphite React interface and retained financial calculations are present in `src/`. |
| Automated checks | `.github/workflows/ci.yml` checks types, runs tests, and builds both the retained Worker and standalone Pages applications. It does not publish a website. |
| GitHub Pages build | `pnpm run build:pages` builds the shared UI as static assets in `dist/pages` using the repository base path. |
| GitHub Pages deployment | `.github/workflows/pages.yml` builds, tests, and deploys `main`. Repository Pages configuration and a successful live deployment still require verification; a workflow file is not proof of publication. |
| ChatGPT-hosted import | Paused by the owner's instruction. Saved histories have not been deleted or transferred to GitHub. |
| GitHub-only archive | A separate opt-in Actions/Release importer exists. Its activation conditions remain in [GITHUB_ARCHIVE.md](GITHUB_ARCHIVE.md). It does not deploy the interface. |

## Standalone GitHub Pages runtime

The standalone entry is `static-pages/index.html` → `src/main.tsx` → `src/App.tsx`. Its inline module imports `../src/main.tsx`, allowing Vite to resolve the shared source correctly in development and production. The source HTML is isolated under `static-pages/` so a repository still using branch-based Pages publishing does not replace its existing root landing page with an unbuilt Vite entry. This directory name also avoids activating Vinext's reserved `pages/` router convention. `vite.pages.config.ts` uses `static-pages/` as its root, reuses `public/`, and emits the compiled `dist/pages/index.html` and assets. It defines the build-only `__FUNDSCOPE_STATIC__` constant and sets the asset base to `/mutual-fund-dashboard/`.

The entry reuses hash navigation, charts, financial calculations, watchlists, request deduplication, cache generation guards, and backup functions. The static configuration does not load the former hosting configuration or Worker bindings. The original `pnpm run build` and `pnpm run dev` retain their existing local Worker behavior.

The static browser calls `https://api.mfapi.in` directly with credentials omitted. It never calls the former host's `/api/mf` or `/api/data/status` service. When the static flag is absent, legacy browser requests still use the same-origin service, and Node source checks retain direct MFAPI access.

Static Data status reports histories cached in this browser and a direct MFAPI availability check. It reads the cache at startup, when the data view is opened, after restore, or on an explicit check rather than repeatedly scanning it in the background. A successful source check establishes access at that time; it does not establish current NAV coverage for all schemes. Count snapshots, source failures, browser-storage limitations, and source gaps stay visible. The static build has no shared historical archive and performs no unattended history refreshes.

### Local development and preview

```sh
pnpm run dev:pages
pnpm run typecheck
pnpm test
pnpm run build:pages
pnpm run preview:pages
```

Open the URL printed by Vite with `/mutual-fund-dashboard/` as the base. Hash routes such as `#fund/122639`, `#compare`, `#data`, and `#methodology` stay under that path and work on refresh without server rewrites. `preview:pages` is a local production preview, not a deployment service.

### Enable and verify publication

1. A repository administrator or maintainer selects **Settings → Pages → Build and deployment → Source → GitHub Actions**. This is a repository setting, not a file in this checkout. The workflow does not attempt to enable Pages using a separate token.
2. Merge the reviewed change to `main`, or run **Deploy FundScope to GitHub Pages** manually on `main`. A manual run on another branch builds and checks the application but cannot deploy it.
3. The workflow first reads the repository's Pages metadata with the built-in GitHub CLI and the standard Actions token. It requires `build_type: workflow`; branch publishing, an unknown mode, or an unreadable setting fails with the exact **Source = GitHub Actions** remediation. The check never changes repository settings. This gate prevents the new workflow from uploading or deploying while the existing branch-publishing setup is active.
4. After that check passes, the workflow typechecks, runs behavioral tests, builds only the static application, uploads `dist/pages`, and deploys through the `github-pages` environment. The build has read permissions; the deployment job receives only `pages: write` and `id-token: write`. It uses the standard GitHub Actions token and needs no former-host credentials.
5. Verify the successful deployment job and its returned `page_url`. If the `github-pages` environment requires approval, satisfy that repository protection rule. Do not infer a live URL merely from the repository name.
6. At the returned URL, verify assets, keyboard search, a direct fund hash route followed by reload, comparison, source/cache status, watchlist persistence, backup/restore, and responsive layouts. Verify MFAPI search and history requests from that actual browser origin, including their CORS response, before reporting the data path as live. A local or command-line source response does not establish deployed-browser access.
7. Record the deployed source commit, workflow run, verified URL, and checks separately from any data-import result. If repository settings or environment approval are inaccessible, report the exact setting or approval that remains pending.

Changing an existing Pages site's `build_type` through the REST API requires both **Pages write** and **Administration write** permissions. The standard `GITHUB_TOKEN` cannot request Administration permissions. `configure-pages`'s `enablement` option requires a different appropriately privileged token and creates a missing site; it does not switch an existing site's publishing source. This workflow therefore keeps the source change as a maintainer setting and uses only the read operation for preflight. References: [Pages REST permissions](https://docs.github.com/en/rest/pages/pages#update-information-about-a-github-pages-site), [available workflow token permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions), [configure-pages v6 action inputs](https://github.com/actions/configure-pages/blob/v6.0.0/action.yml), [configure-pages v6 site handling](https://github.com/actions/configure-pages/blob/v6.0.0/src/api-client.js), and [GitHub CLI in workflows](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-github-cli).

The workflow uses the official current Pages action family (`configure-pages@v6`, `upload-pages-artifact@v5`, `deploy-pages@v5`) and Node 24. References: [Vite static deployment guide](https://vite.dev/guide/static-deploy.html#github-pages), [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), and [GitHub publishing-source configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

Implement and verify any GitHub-based historical storage and scheduled updates separately, under the existing [archive activation conditions](GITHUB_ARCHIVE.md). Publishing the interface does not activate that importer or migrate saved histories.

## Data boundaries

The previous hosted archive, a browser cache, and the optional GitHub Release archive are independent stores. Never add their counts together or copy old coverage totals into a new deployment.

A fund page can show the full history returned by MFAPI while a bulk archive remains incomplete. Keep those claims separate. Preserve source gaps, failed attempts, and uncertain latest-date coverage in status reports.

Browser storage belongs to its origin. Watchlists and local histories from the former URL do not move automatically to a new website. Retain the existing JSON backup and restore feature for a user-controlled transfer.

## GitHub change process

1. Start from current `main` on a focused branch.
2. Preserve the approved interface and documented calculation rules.
3. Run checks that cover the changed behavior. For documentation-only changes, check the diff, links, and consistency of the status claims.
4. Review and merge through GitHub.
5. Report source commits, builds, data-import results, and website deployments as separate outcomes.

The former Site publication process is preserved in [LEGACY_SITE_DEPLOYMENT.md](LEGACY_SITE_DEPLOYMENT.md). The former updater is documented in [SYNC_OPERATIONS.md](SYNC_OPERATIONS.md). Both are inactive references.
