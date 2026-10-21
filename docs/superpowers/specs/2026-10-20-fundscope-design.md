# FundScope first development release

## Intent and approved direction

Implement the approved minimal Indian mutual fund dashboard using mfapi.in. The last approved UI supersedes the older terminal theme: quiet light background, generous spacing, clear typography, subtle green accents, one search field, a clean fund list and three research shortcuts. Figma inspection is blocked by the account's MCP call limit. The recovered approved layout notes are the visual reference; do not claim pixel-exact reproduction.

The existing long development prompt remains the product roadmap. This release completes a working NAV-research path through foundation, explorer, analytics and comparison. Portfolio accounting, holdings/benchmark imports, cash-flow simulations and advanced research remain explicitly tracked as later milestones.

## Architecture

React + TypeScript + Vite static application. ECharts handles line charts, shared tooltips and image export. MFAPI is contacted directly using verified browser CORS. IndexedDB caches validated histories and search results. Local settings contain only scheme identifiers, watchlists, comparisons and a user-entered risk-free assumption. No paid data, analytics telemetry or server database.

Keep API, persistence, analytics and UI separate. Preserve exact scheme codes and full provider names. Fetch only selected or visible starter schemes. No direct AMFI requests. No invented NAVs or unsupported metadata.

## Working release

- Responsive minimal home page, fund search and visible plan/option distinctions.
- Sample research list of verified schemes, explicitly not a market-wide ranking.
- Local watchlist and comparison up to four funds.
- Fund detail with dated NAV, time-range chart (wealth/NAV/drawdown), linked statistics and export.
- Absolute return, ACT/365 CAGR, monthly volatility, drawdowns, monthly Sharpe and Sortino with explicit editable assumptions.
- Monthly return heatmap and rolling 1/3/5-year outcomes.
- Common-date fund comparison with equal starting investment and shared tooltip.
- Honest loading/error/offline states, cached-data date, last successful fetch, source links.
- Versioned backup/restore for local research settings and cached histories.
- Methodology and capability documentation.

## Calculation contract v1

Calendar dates are ISO YYYY-MM-DD, parsed without local-time shifts. Histories are sorted ascending and positive finite NAVs only. Date-range start is on or before the requested start, with a seven-calendar-day tolerance; shorter available ranges are disclosed. No future NAV enters historical valuation. CAGR is (end/start)^(365/elapsedDays)-1 and displayed only for at least 365 elapsed days.

Monthly returns use the last reported NAV on or before consecutive month ends, with no forward filling of missing months. Exclude the current incomplete calendar month and any month without an eligible prior month-end; monthly risk requires at least 12 complete returns. Month-end data more than seven days from the calendar boundary is unavailable. Annualized volatility is sample standard deviation × sqrt(12). Sharpe uses arithmetic mean monthly excess return ×12 / annualized volatility; risk-free monthly equivalent is (1+annualRate)^(1/12)-1. Sortino uses monthly shortfalls versus that same target, divided by all monthly periods, and annualizes consistently. Zero denominators yield null.

Drawdowns use the running peak within the selected window. Full-history drawdown is separate. Rolling windows use complete calendar anniversaries, clamped leap days, previous eligible NAV within seven days and actual elapsed days; overlapping outcomes are descriptive historical observations. Comparison uses the intersection of actual reported dates and a common requested period; no future fills.

Raw IDCW NAV is not total return. Restrict total-return risk/wealth analytics to Growth schemes; keep other schemes visible with an explanation. Large unexplained single-step changes (over 40%) block affected analytics and preserve raw data with a warning for review.

## Verification

Meaningful tests cover compound returns, drawdown recovery, zero denominators, missing months, future-date avoidance, leap years, common-date comparison, invalid responses, duplicate dates, cache fallback and backup validation. Browser checks cover search, details, period updates, watchlist, comparison, responsive layout and export. Production build must pass.
