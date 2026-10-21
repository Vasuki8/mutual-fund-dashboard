# FundScope Graphite UI Implementation Plan

> **For agentic workers:** Use the executing-plans or subagent-driven-development workflow for the tasks below. The owner's selected template and implementation request authorize this work.

**Goal:** Implement the supplied Graphite design in FundScope's GitHub application with working research workflows and a standalone static build.

**Architecture:** Reuse React, hash routing, ECharts, the analytics library, and local persistence. Apply a shared token stylesheet, a searchable application shell, and a fund preview. Isolate static deployment configuration from the retained Worker runtime.

**Tech Stack:** React 19, TypeScript, ECharts 6, Vite 8, native Node tests, GitHub Actions.

**Spec:** [UI_DESIGN.md](../../UI_DESIGN.md), adapted from the owner-supplied template package.

## Global constraints

- Develop in GitHub; do not publish to or resume updates for the former ChatGPT Site.
- Keep financial calculation rules and source gaps unchanged; no copied template data.
- Use the exact Graphite palette and 4/8/12/16px spacing from the design specification.
- Preserve existing request-generation guards, backups, watchlists, and exports.
- A successful build is not evidence of deployment or full historical coverage.

## Review focus

- Slow/out-of-order search replies must not select or display obsolete results.
- Fund-table selection must remain distinct from saving and comparison.
- Narrow viewports and long fund names must not create page overflow.
- Chart resizing, route changes, and unmounting must not create observer loops.
- Static pages must use the direct provider, show truthful storage scope, and retain clear errors when the provider fails.

### Task 1: Application shell and explorer

**Files:** `src/App.tsx`, `src/components/GlobalSearch.tsx`, `src/components/Home.tsx`, `src/components/FundTable.tsx`, `src/components/FundPreview.tsx`.

**Interfaces:** Reuse `Scheme`, `FundData`, and existing `FundTableProps`. Add optional `selectedCode?: number` and `previewFund?: (scheme: Scheme) => void` table props. Global search receives `openFund: (scheme: Scheme) => void`. Keep App's data loading callback intact.

- [x] Implement global search with debouncing, stale-response cancellation, keyboard selection, and meaningful result/error/empty states.
- [x] Implement the semantic sidebar, compact context, selection tray, and route headings.
- [x] Add fund preview using real loaded data and existing analytics without additional source assumptions.
- [x] Run search component behavior tests and existing request regressions; review route, preview, sorting, and save/compare wiring.
- [ ] Verify the complete interaction flow in a rendered browser.

### Task 2: Shared theme and charts

**Files:** `src/styles.css`, `src/components/Chart.tsx`, `src/components/FundDetail.tsx`, `src/components/Comparison.tsx`.

**Interfaces:** Preserve existing component props, chart-series data contracts, and four-fund comparison. Style all existing classes plus shell/search/preview classes introduced in Task 1.

- [x] Replace the light stylesheet with the supplied tokens and coherent layouts for every route.
- [x] Apply palette to chart axes, lines, tooltip, fills, PNG export, heatmaps, and semantic states.
- [x] Batch resize work, cancel pending frames, and skip hidden/unchanged chart bounds.
- [x] Run meaningful chart lifecycle, comparison visibility, and visual-data regressions.
- [ ] Verify rendered charts and labels at 1024, 736, 390, and 320px.

### Task 3: Standalone GitHub runtime

**Files:** Static entry and Vite configuration, package scripts, runtime configuration, API source selection, data-status/methodology copy, `.github/workflows/ci.yml`, and deployment documentation.

**Interfaces:** A build-defined static-mode flag selects direct MFAPI and local-cache status; default legacy runtime continues to use same-origin APIs. No source/storage migration is implied.

- [x] Add a static React build with repository-relative asset paths and hash-route support.
- [x] Use direct MFAPI without credentials in static mode; describe local coverage truthfully.
- [x] Add regression coverage for provider selection, inspect the build artifact, and add the static build to CI.
- [x] Prepare a GitHub Pages workflow with a read-only publishing-source preflight.
- [ ] Verify the deployment and browser-origin source reachability before reporting the new UI as live.

### Task 4: Integration and release

- [x] Run typecheck, all 13 test files, and both production builds.
- [x] Attempt browser verification and record the access limitation below; rendered checks remain outstanding.
- [x] Obtain independent review, address material findings, and verify the final diff.
- [ ] Publish the reviewed branch/PR through GitHub, inspect CI, and merge when required checks pass.
- [ ] Report implemented changes, verified behavior, deployment state, and any remaining data limitations separately.

## Known release constraints

The existing Pages deployment uses the repository's Jekyll publishing path. The new workflow requires **Settings → Pages → Build and deployment → Source → GitHub Actions** and deliberately fails with that remediation until the setting is confirmed. The available GitHub connection can publish source changes but cannot change this administration setting. Static source HTML is isolated from the root landing page.

The available browser could not reach the local development server. Component tests, source review, and successful builds do not establish rendered layout quality or deployed-origin MFAPI CORS behavior. Those checks remain explicit release follow-ups. No former-host archive, coverage total, or refresh schedule is transferred by this UI change.

Local verification completed on 21 October 2026: TypeScript checking, all 13 native test files, the retained Worker build, and the standalone Pages build passed. HTTP checks resolved the standalone development entry, shared source, stylesheet, and favicon. Compiled HTML uses existing repository-prefixed assets without raw source imports. Focused independent review found no critical or important issues. GitHub CI and live deployment results belong in the pull request and release record after publication.
