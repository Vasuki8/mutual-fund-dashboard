# FundScope Atlas interface

The owner supplied `artifact-template-atlas-ui.zip` and requested its implementation on 23 October 2026. Atlas replaces the earlier Graphite visual direction. Its `assets/source/DESIGN.md` and source application are the design reference; the template README explicitly supports adapting an existing application while keeping its data layer. FundScope retains its own branding, routes, calculations, storage and GitHub deployment.

## Visual contract

Use contiguous horizontal bands, underlined selections, quiet ruled sections and open plotting space. Avoid repeated boxed KPI cards, shadows, gradients and oversized rounded controls. Use Segoe UI/Arial at 13px with a 1.45 line height, 27px medium-weight page headings, 11–12px metadata and tabular numbers. Category indices use Consolas. Controls have at most 3px corners; desktop main padding is 24px and phone padding is 13px.

| Token | Light | Dark |
| --- | --- | --- |
| Background | `#f1ece1` | `#1b2522` |
| Evidence surface | `#faf7f0` | `#24332d` |
| Text | `#26352e` | `#edf1e9` |
| Muted | `#5e6e63` | `#aebdb2` |
| Rule | `#c9d0c4` | `#455a4c` |
| Grid | `#e1e4db` | `#35483d` |
| Accent | `#25795d` | `#9ad7b1` |
| Second series | `#b85832` | `#e7ae7a` |
| Selection | `#dfe9dd` | `#304c3c` |

## Composition and behavior

- The narrow header contains FundScope identity, an end-of-day data disclosure, global fund search, browser connection context and a labelled light/dark switch. Appearance is saved separately from research settings, with a safe light fallback when storage is unavailable. Both runtime entries restore it before the UI mounts.
- Always-visible horizontal navigation links Explore, Compare, Saved, Data & backups and Methodology. Keep real counts, active-route indicators and hash routes. The five destinations remain visible on phones.
- Explore uses an underlined search and plan filter. The starter collection uses indexed bands with actual 3Y return readings, their observation dates, and unlabelled decorative 1Y NAV sparklines. A single expandable evidence panel shows dated NAV, return, metadata, chart and explicit analysis/save/compare actions; all evidence can be closed. This collection is a starting point, not a ranking.
- Search and Saved retain the sortable, paginated fund table and a selected-fund preview below it. Sort the complete result set before slicing pages. Global return sorting continues to require the verified archive index or all matching histories; no page-local rank is presented as global.
- Fund detail, risk, rolling returns, comparison, notes, methodology and data status share the same ruled layout and typography. Charts resolve current theme tokens to canvas colours and repaint on appearance changes. PNG exports use the current plot background. Dates, gaps, range controls and financial transformations are unchanged.
- Keep watchlists, request deduplication, cache generation guards, backup/restore, CSV/PNG exports, source validation, Growth/distribution gates and missing-data behavior. Never copy sample data from the template or invent holdings, benchmarks, coverage or dates.

## Responsive and accessible behavior

At 650px and below, use five equal navigation columns, hide decorative sparklines, stack evidence metadata and chart, and use two-column metric strips. The preview chart is 195px tall on phones. Fit a 320px viewport, including browsers with visible scrollbars; wide tables scroll within their own containers. Keep touch controls at least 44px where applicable, visible keyboard focus, labelled icon buttons, expanded/selected/sorted states, and usable loading, empty, retry, cached and offline states. Chart ResizeObserver writes are deferred with requestAnimationFrame and cancelled on cleanup.

## Runtime and scope

GitHub Pages and the retained Worker entry use the same React UI and theme restoration. Keep GitHub as the delivery target. Do not publish the former ChatGPT Site or resume its updater. No data provider, financial formula, archive collector, activation gate or stored history is changed by this design adaptation. A successful UI build is not evidence of archive coverage or deployment; verify publication separately.
