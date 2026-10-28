# Professional UI Refinement Implementation Plan

**Goal:** Improve the professional finish of the existing FundScope interface in `Vasuki8/mutual-fund-dashboard`.

**Architecture:** Keep the existing React components, routes, data sources, and analytics. Refine presentation in the shared stylesheet, and make small markup improvements in the shell, explorer, and fund table.

**Tech stack:** React, TypeScript, CSS, existing Lucide icons, Vite Pages build.

**Spec:** `docs/UI_DESIGN.md`, `AGENTS.md`, and the user's 28 October request to modify the UI in the existing project.

## Constraints

- Preserve the sidebar/table layout, Atlas light/dark palette, Segoe UI/Consolas fonts, compact dimensions, and separate Open/Save/Compare actions.
- Preserve source-quality notices, exact source dates, verified global ranking gates, and all financial calculations.
- Keep history collection, stored data, and the former ChatGPT Site outside this change.
- GitHub main and the existing GitHub Pages workflow remain the delivery path.

## Tasks

1. Refine visual hierarchy in `src/styles.css`: header, sidebar, panels, fund rows, filters, action states, notes, and responsive pagination. Keep coarse-pointer targets and reduced-motion behavior.
2. Add visible appearance labels in `src/App.tsx`, discoverable sort indicators and a narrow-screen scrolling hint in `src/components/FundTable.tsx`, and a clear filter-reset control and honest loading title in `src/components/Home.tsx`.
3. Run the existing behavioral suite, typecheck, and production builds. Inspect real data in both appearances and narrow viewports. Review the diff before merging.
4. Deliver through a focused GitHub pull request, confirm checks and merge, and verify the matching Pages deployment and public interface.

## Review focus

- Long names and narrow screens must not make the page itself scroll horizontally; tables retain their own scrolling region.
- Inactive sortable columns remain discoverable without implying that unavailable global rankings can be sorted.
- Theme controls, date inputs, charts, and exports continue to use the selected appearance.
- Resetting filters restores the existing Explore/Watchlist defaults and page position.
- Loading, unavailable data, and source-quality states retain their distinct meanings.

Existing behavioral coverage is used for the small UI changes; no new calculation suite or UI snapshot suite is needed.
