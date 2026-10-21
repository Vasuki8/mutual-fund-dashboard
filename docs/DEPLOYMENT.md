# GitHub development and deployment

## Active direction

The owner stopped development of the ChatGPT-hosted website on 21 October 2026. All further development belongs in [Vasuki8/mutual-fund-dashboard](https://github.com/Vasuki8/mutual-fund-dashboard).

The former hosted import task is paused. Do not deploy to that host, run its updater, retrieve its service credentials, or restore its schedules without a later explicit request from the owner. Keep existing data and resources intact.

## Verified status at this change

| Area | Status |
| --- | --- |
| Source code | GitHub `main` is the canonical source. |
| Approved interface | The React interface and financial calculations are present in `src/`. |
| Automated checks | `.github/workflows/ci.yml` checks types, runs tests, and builds the retained Worker application. It does not publish a website. |
| GitHub Pages | Not enabled when this direction change was recorded. No GitHub-hosted website URL has been verified. |
| ChatGPT-hosted import | Paused by the owner's instruction. Saved histories have not been deleted or transferred to GitHub. |
| GitHub-only archive | A separate opt-in Actions/Release importer exists. Its activation conditions remain in [GITHUB_ARCHIVE.md](GITHUB_ARCHIVE.md). It does not deploy the interface. |

## Next deployment target

Prepare a standalone GitHub Pages build while keeping the approved interface and calculation contracts. This is remaining work, not a completed migration.

1. Add a static React entry point and a separate Vite build that serves assets under the repository path.
2. Reuse `src/App.tsx`, its hash-based navigation, charts, financial calculations, watchlists, and backup functions.
3. Replace the browser's same-origin `/api/mf` calls with a data path that works without the former host. Direct MFAPI access must be verified from the deployed browser origin before it is relied upon.
4. Replace `/api/data/status` and its shared-archive claims with status from the actual data store used by the GitHub version.
5. Add a GitHub Pages build and deployment workflow. Verify repository configuration, a successful deployment, its returned URL, and fund-page navigation before reporting the website as live.
6. Implement and verify GitHub-based historical storage and scheduled updates separately. Browser caching alone does not provide a shared full-universe archive or unattended refreshes.

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
