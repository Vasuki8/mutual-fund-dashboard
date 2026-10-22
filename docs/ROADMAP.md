# FundScope capability roadmap

This document keeps the broader product scope visible while separating it from the first NAV-research release. Future stages below are proposed work, not implemented features or delivery commitments.

## Implemented NAV research and persistent data

| Area | Current scope |
| --- | --- |
| Explorer | MFAPI name/code search, plan/option labels, Direct Growth filter, six explicit starter examples, pagination, loading/error states. |
| Local workspace | Watchlist, up to four comparison selections, dated browser-local fund research notes, last opened fund, editable risk-free-rate assumption, cached histories, JSON backup/restore. |
| Fund research | Dated NAV, presets and custom start/end dates with actual coverage shown, selected-range wealth/NAV/drawdown, absolute and ACT/365 returns, monthly volatility/Sharpe/Sortino, maximum drawdown, five deepest decline episodes plus any unrecovered episode with calendar-day recovery durations, monthly heatmap, monthly downside frequency, losing streaks and historical lower-tail outcomes, rolling 1/3/5-year outcomes, and NAV-grounded hypothetical monthly SIP cash-flow illustration with missed dates and 365-day XIRR gate. |
| Comparison | Two to four eligible funds on exact common dates, preset/custom ranges with shorter coverage disclosed, equal ₹10,000 start, shared hover, visible-series controls, aligned metrics, CSV and PNG export. |
| Provenance | Source links, original observation/retrieval dates, archive coverage, latest sync outcome, cache/error status, raw NAV inspection, methodology and explicit unavailable states. |
| Shared market data | D1 indexes and R2 full histories, twice-daily scheduled catalogue refresh, resumable history archive, checkpointed failures and on-demand retrieval. |

The approved light, minimal design remains the visual baseline and supersedes the old terminal concept. Figma access was limited during this release; the implementation does not claim a verified pixel-exact match.

Final integrated tests, build results, browser checks, and publication identity belong in the [README verification record](../README.md#verification-record). Per-module reports and the review document are implementation history rather than an automatically current release status.

## Data-dependent behavior within this release

Returns require sufficient eligible observations; CAGR needs at least 365 elapsed days; monthly risk needs twelve complete monthly returns. Rolling windows need completed anniversaries. Comparison needs at least two common reported dates. Raw IDCW/dividend NAV and unresolved quality warnings do not supply eligible total-return analytics.

An unavailable metric is a documented data condition, not a synthetic estimate. Offline use depends on histories already cached in that browser, and a refresh depends on MFAPI connectivity and available source observations. None of these conditions imply verified scheme closure, inception, investor suitability, or a market ranking.

## Future stages

| Stage | Proposed work | Prerequisites / acceptance boundary |
| --- | --- | --- |
| Additional reference data | Dated AUM, TER, managers, holdings, verified inception, and official classifications beyond current metadata. | Select suitable sources or explicit import formats; retain dates, provenance, and missing-data states. MFAPI NAV alone is insufficient. |
| Benchmark research | Benchmark mapping/import, relative returns, alpha, beta, tracking error, and information ratio. | Appropriate total-return benchmark histories, alignment/frequency rules, risk-free assumptions, and calculation tests. |
| Portfolio accounting | Transactions, units, valuations, realized/unrealized results, cash-flow-aware personal returns, and import validation. | A separate transaction ledger and accounting model; watchlist membership must not become inferred ownership. |
| Additional cash-flow simulations | SWP, STP, goal contributions/withdrawals, and dated scenario comparisons beyond the implemented historical SIP illustration. | Explicit date conventions, holiday valuation, fees/taxes where modeled, and verified cash-flow math. No execution or brokerage integration is implied. |
| Plan analysis | Reliable automatic Direct/Regular pairing and cost/return comparisons. | Verified scheme mapping, compatible options/date ranges, and suitable cost data. Current manual comparison remains available. |
| Advanced research | Scenario/sensitivity tools, deeper holding-period analysis, and research reports. | Agreed questions, documented assumptions, meaningful exports, and validation against edge cases. |
| Alerts and durability | Opt-in alerts, stronger offline support, and optional cross-device watchlist persistence. | Explicit scheduling/privacy design, delivery semantics, storage strategy, and user control. The market-data archive and scheduled updater are implemented; personal watchlists still stay in the browser. |

Before extending a stage, confirm its data source and calculation contract, add meaningful behavioral tests, then connect the UI with honest loading, unavailable, and error states. Keep chart data and summary populations consistent; preserve scheme identity and source dates throughout imports and exports. See [METHODOLOGY.md](METHODOLOGY.md) for current rules.
