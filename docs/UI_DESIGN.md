# FundScope Graphite interface

The owner supplied `koyfin-graphite-template.zip` and requested its design be implemented in the GitHub project on 21 October 2026. Its original dashboard composition is a visual reference, not an official Koyfin integration. FundScope retains its own branding, mutual-fund data, calculations, routes, and storage.

## Visual contract

Use the supplied Graphite palette: background `#17191f`, panel `#1d2028`, raised surface `#252a34`, border `#353d4b`, text `#e9edf4`, muted text `#adb7c8`, lavender accent `#a4b4ff`, teal second series `#75cfc0`, grid `#303744`, and selection `#2c3549`. Use Segoe UI/Arial at 13px, 22px page headings, 13px panel titles, secondary text at least 11px, and Consolas/Courier New for tabular numbers. Panels have 5px corners and controls 4px. Use 4/8/12/16px spacing, 16px main padding, 12px panel gaps, and compact data rows.

## Composition and behavior

- A roughly 51px header contains FundScope identity, a real global fund search, and connection context. Search supports Ctrl/Cmd+K, arrows, Enter, and Escape, with accessible results and retry states.
- A 164px sidebar links to Explore, Compare, Watchlist, Data status, and Methodology. Use hash routes, a visible active route, real counts, and an accessible mobile navigation layout.
- Explore and Watchlist use compact headings, existing search/plan filters and sorting, plus a selected-fund preview. Preview selection, saving, and comparison remain distinct actions. Four funds remain the comparison limit.
- Fund details, comparison, methodology, and data status share the same panels and typography. Charts use stable contrasting series colors, dark tooltips/exports, real period labels, and unchanged financial calculations.
- Retain existing watchlist, request deduplication, generation guards, backups, CSV/PNG exports, source validation, and missing-data behavior. Never substitute template sample values or imply that imported historical coverage is complete.

## Responsive and accessible behavior

At 950px, reduce the sidebar to 145px and stack asymmetric content where needed. At 650px, use compact wrapped navigation, two-column metric grids, and touch-sized controls. Fit the page at 320px, allowing wide tables to scroll within their own containers. Keep keyboard focus visible, label icon buttons, expose selected/sorted states, and retain usable loading, empty, retry, and offline states. Schedule chart resize work outside ResizeObserver delivery.

## GitHub runtime

Add a separate static Vite entry using the same React UI and hash router. The static build fetches directly from MFAPI with credentials omitted; it must not call the former host. Its data status describes browser-local cached histories and source availability rather than the former server archive. Keep legacy Worker code and data intact. A static build does not establish a shared full-history archive or unattended data refreshes. Report live deployment only when verified.
