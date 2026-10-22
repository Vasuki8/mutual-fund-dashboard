# FundScope methodology

Calculation version: **1.0.0**, defined in `src/lib/analytics.ts`. This document describes the current implementation. It is a reproducibility reference for NAV-based research, not a suitability assessment or a forecast.

## Data and source matrix

MFAPI is the sole financial-data provider. The client uses the production base URL `https://api.mfapi.in`; it does not request AMFI directly. The [official documentation](https://www.mfapi.in/docs/) and [OpenAPI schema](https://www.mfapi.in/docs/openapi.json) describe the provider endpoints and response fields.

| Information | Exact origin | Current treatment |
| --- | --- | --- |
| Name-search scheme identity | `GET /mf/search?q={encodedQuery}` → `schemeCode`, `schemeName`, optional ISIN fields | Preserve scheme code and full provider name; name search does not return fund history. |
| Exact numeric-code lookup | `GET /mf/{schemeCode}` | Validate response identity against the requested code and reuse the history response. |
| Fund name, AMC, classification | `meta.scheme_code`, `scheme_name`, `fund_house`, `scheme_type`, `scheme_category` in the history response | Display provider metadata; abbreviations are presentation only. |
| ISINs | `meta.isin_growth`, `meta.isin_div_reinvestment` | Optional metadata; absence is shown as not supplied. |
| Dated NAV history | `data[].date` and `data[].nav` in `GET /mf/{schemeCode}` | Parse `DD-MM-YYYY`; retain validated positive finite NAVs as ISO dates in ascending order. |
| Latest shown NAV and first available date | Last and first validated observations in that history | Latest means latest returned observation. First available NAV is not a verified inception date. |
| Retrieval/cache state | Client retrieval timestamp, stored history, and request outcome | Distinct from the provider observation date; no live-price claim. |
| Returns, wealth, drawdown, monthly risk, rolling outcomes | Local calculations over the validated observations | No provider ranking, benchmark series, or risk rating is inferred. |
| Risk-free/target rate and starting investment | Explicit local user assumptions | Default annual target 6%; default illustrated starting amount ₹10,000. Neither is fetched market data. |
| Watchlist, comparison, last opened fund | Local research settings | User selections, not portfolio holdings or transaction records. |
| AUM, TER, managers, holdings, verified inception, benchmarks | No integrated source | Unavailable in this release; do not infer them from NAV, category, or name. |

The application does not use the provider's full-directory or latest-NAV endpoints to fabricate a market ranking. Six explicit scheme examples are maintained in `src/lib/catalog.ts`. Documentation examples are not an identity authority; always validate actual response metadata for the requested code.

## Input quality and scheme eligibility

Dates must be real calendar dates and NAVs must be positive finite numbers. Identical duplicate dates are consolidated. Conflicting values for a date retain the lowest value deterministically for raw inspection and block derived analytics. Invalid observations and unexplained single-step NAV changes exceeding 40% produce history-quality warnings. Those warnings survive cache and backup operations; restore validates its submitted observations before replacing state.

Only confirmed Growth names are eligible for the displayed return, wealth, and risk analytics. IDCW/dividend wording takes precedence even when a scheme name also contains “Growth”. Raw IDCW NAV omits distributions and is not treated as a total-return series. Unresolved history-quality warnings also block derived analytics. A refresh failure describes retrieval state separately from the quality of retained, previously validated observations.

## Dates, ranges, and unavailable results

All calculation dates are `YYYY-MM-DD`; elapsed days use UTC-midnight differences. Calendar month/year arithmetic clamps invalid anniversaries to the last day of the destination month, so 29 February becomes 28 February in a non-leap year.

For `1M`, `3M`, `6M`, `1Y`, `3Y`, and `5Y`, the requested start is measured backward from the latest observation. Use the last reported NAV on or before that boundary, at most seven calendar days earlier. If none qualifies, a selected chart range begins with the first later available observation and discloses the shorter actual range. Historical valuation never substitutes a future NAV. `MAX` uses all available observations.

Unavailable metrics are represented as `null` and displayed as an em dash. Missing months are not zeros. A single observation cannot establish a return, and CAGR requires at least 365 elapsed days. Displayed risk/return values must always be interpreted with their actual date range and sample count.

## Returns and illustrated wealth

Let starting NAV be \(P_0\), ending NAV \(P_1\), and the actual elapsed days \(D\).

\[
R = P_1/P_0 - 1
\]

\[
\operatorname{CAGR} = (P_1/P_0)^{365/D} - 1,\qquad D\ge365
\]

For example, 100 to 121 over 730 days produces 21% absolute return and 10% CAGR. This is ACT/365, not a rounded count of years. Trailing one-year return is absolute; trailing three- and five-year returns are CAGR. A trailing horizon is unavailable if its required historical start cannot be valued within the seven-day rule.

Illustrated wealth for starting amount \(I\) is \(W_t=I(P_t/P_0)\). It is one investment at the first selected observation. The calculation adds no tax, exit load, transaction charge, cash flow, or separate TER adjustment; it uses the supplied NAV series. The Overview chart and linked statistics follow the selected range. Its trailing-return table and the Holding periods view use full available history.

## Drawdown

Within the selected window, define \(H_t=\max_{s\le t}P_s\). Drawdown is \(P_t/H_t-1\), and maximum drawdown is its minimum. The first selected point begins at zero drawdown; an earlier full-history peak is not imported into that window.

Peak and trough dates identify the deepest observed episode. Recovery is the first subsequent observation at or above that episode's peak; it remains unavailable if recovery is not observed within the selected window. A later deeper episode replaces the earlier maximum-drawdown episode. Drawdown values are zero or negative.

### Drawdown episodes

The Risk & drawdown view also lists the five deepest observed, non-overlapping decline episodes in the selected range. The current unrecovered episode is always included; when it falls outside the five deepest, the table has six rows. Episodes are ordered by percentage decline, deepest first, then by peak date for ties. A partial rebound below the original peak does not start a new episode.

An episode starts from the most recent occurrence of the running peak before NAV falls below it. Equal highs before a decline therefore use the latest peak date. The trough is the first observation at the episode's lowest NAV. Recovery is the first reported NAV at or above the episode's peak; that observation can also establish the next episode's peak. Flat or rising histories have no decline episodes. Histories with fewer than two observations cannot establish an episode.

All durations use actual calendar-day differences at UTC midnight, including weekends and leap days:

- **Days to trough:** peak date to trough date.
- **Days to recover:** trough date to recovery date. This is unavailable while the episode remains unrecovered.
- **Days below peak:** peak date to recovery date, or peak date to the last available NAV date for an unrecovered episode. The latter is marked **so far** and never extends to the current wall-clock date.

The episode table resets its peak at the beginning of the selected range, as the drawdown chart does. It does not import an earlier all-history peak or use observations after the range. Dates are observed source dates; gaps can hide a deeper decline or an earlier recovery. No missing NAVs or recovery dates are estimated. The existing confirmed-Growth and data-quality requirements apply. A failed refresh alone does not block validated retained history.

## Complete monthly returns

For a calendar month, take its final reported NAV only if it is no more than seven calendar days before month end. Pair it with the immediately preceding eligible month-end observation. The return is the NAV ratio minus one; a missing or stale monthly bucket is never bridged.

Months before the latest observation's month are complete. The final month qualifies only if its last observation is the actual calendar month end, or its month precedes the current real UTC month. The seven-day month-end rule still applies. This last-month decision reads `Date.now()`; tests fix that clock. Selected histories need an eligible preceding month-end before their first monthly return can be calculated.

The heatmap shows each eligible month separately. A calendar-year total is the product of its twelve monthly growth factors minus one and is displayed only when all twelve months are present. Monthly results carry the actual NAV observation date, not an invented calendar-boundary observation.

## Monthly risk measures

Volatility, Sharpe, and Sortino require **at least 12 complete monthly returns**. They use the available eligible returns; the count does not imply gap-free history. Best/worst month and positive-month counts can still be displayed with a smaller sample.

For \(n\) monthly returns \(r_i\), arithmetic mean \(\bar r\), and annual target \(r_f\):

\[
\sigma_{annual}=\sqrt{12}\sqrt{\frac{\sum_{i=1}^{n}(r_i-\bar r)^2}{n-1}},
\qquad r_{f,m}=(1+r_f)^{1/12}-1
\]

\[
\operatorname{Sharpe}=\frac{12(\bar r-r_{f,m})}{\sigma_{annual}}
\]

\[
\delta_{annual}=\sqrt{12}\sqrt{\frac{\sum_{i=1}^{n}\min(0,r_i-r_{f,m})^2}{n}},
\qquad\operatorname{Sortino}=\frac{12(\bar r-r_{f,m})}{\delta_{annual}}
\]

Sortino's denominator includes **all monthly periods**, including those with no shortfall. A zero denominator yields `null`. Constant NAV with a zero target has zero volatility and null Sharpe/Sortino; with a positive target, Sortino is defined as \(-\sqrt{12}\) while Sharpe remains null.

The UI defaults to an editable **6% annual risk-free/target assumption**, saved in research settings. It is not a historical Treasury-bill or other risk-free time series. The standalone `riskStats` function defaults to zero when no rate is supplied; UI callers supply the stored assumption explicitly. Rates are decimal fractions internally.

These measures describe observed NAV behavior. They do not capture every liquidity, credit, concentration, or valuation risk. Benchmark-dependent measures require a separate, suitable return series and are absent from this release.

## Rolling holding periods and comparison

Rolling analysis starts at every available observation whose full one-, three-, or five-calendar-year anniversary lies within the history. Its ending NAV is the last eligible observation on or before that anniversary, within seven days. One-year outcomes are absolute returns; longer outcomes use actual observation days for CAGR. Windows overlap and their frequency is descriptive, not a forecast probability.

The chart's horizontal identity is the **starting NAV date**. This retains distinct windows that resolve to the same ending NAV date. Hover details include both start and end dates; summary counts and best/worst/median outcomes use the same full set of completed windows.

Comparison intersects exact reported dates across every selected fund first, then computes the requested period from their common endpoint. It retains only those common observations, without interpolation or forward filling. Each fund starts with ₹10,000 at the common first observation. Its table metrics use that same aligned history, which can have fewer monthly observations than an individual fund's history. At least two common dates are needed to display comparison results.

## Reproducibility

Retain the exact scheme code, provider history, retrieval timestamp, calculation version, selected dates, target-rate assumption, and backup version when reproducing a result. Provider corrections and new observations can change later calculations. See [README.md](../README.md) for run/test commands, cache and backup limits, and the final release verification record.
