# FundScope methodology

Calculation version: **1.4.0**, defined in `src/lib/analytics.ts`. This document describes the current implementation. It is a reproducibility reference for NAV-based research, not a suitability assessment or a forecast.

## Data and source matrix

MFAPI is the sole financial-data provider. The client uses the production base URL `https://api.mfapi.in`; it does not request AMFI directly. The [official documentation](https://www.mfapi.in/docs/) and [OpenAPI schema](https://www.mfapi.in/docs/openapi.json) describe the provider endpoints and response fields.

| Information | Exact origin | Current treatment |
| --- | --- | --- |
| Name-search scheme identity | Verified published catalogue of MFAPI identities, with `GET /mf/search?q={encodedQuery}` fallback | Search all available published scheme names, including those whose histories are pending; provider search responses can be limited. |
| Exact numeric-code lookup | Verified published catalogue first, then `GET /mf/{schemeCode}` when needed | Match the exact scheme code, verify the response identity, and distinguish name discovery from historical NAV coverage. |
| Fund name, AMC, classification | `meta.scheme_code`, `scheme_name`, `fund_house`, `scheme_type`, `scheme_category` in the history response | Display provider metadata; abbreviations are presentation only. |
| ISINs | `meta.isin_growth`, `meta.isin_div_reinvestment` | Optional metadata; absence is shown as not supplied. |
| Dated NAV history | `data[].date` and `data[].nav` in `GET /mf/{schemeCode}` | Parse `DD-MM-YYYY`; retain validated positive finite NAVs as ISO dates in ascending order. |
| Latest shown NAV and first available date | Last and first validated observations in that history | Latest means latest returned observation. First available NAV is not a verified inception date. |
| Retrieval/cache state | Client retrieval timestamp, stored history, and request outcome | Distinct from the provider observation date; no live-price claim. |
| Returns, wealth, drawdown, monthly risk, rolling outcomes | Local calculations over the validated observations | No provider ranking, benchmark series, or risk rating is inferred. |
| Risk-free/target rate and starting investment | Explicit local user assumptions | Sharpe assumed risk-free rate defaults to 6% annually; independent Sortino target defaults to 0%; illustrated starting amount defaults to ₹10,000. Neither risk assumption is a fetched historical series. |
| Watchlist, comparison, last opened fund | Local research settings | User selections, not portfolio holdings or transaction records. |
| AUM, TER, managers, holdings, verified inception, benchmarks | No integrated source | Unavailable in this release; do not infer them from NAV, category, or name. |

The published scheme catalogue supports full-name discovery, including funds whose histories are not yet saved. This catalogue does not establish complete historical coverage or a verified market ranking. Six explicit starter schemes are maintained in `src/lib/catalog.ts`. Documentation examples are not an identity authority; always validate actual response metadata for the requested code.

## Input quality and scheme eligibility

Dates must be real calendar dates and NAVs must be positive finite numbers. Identical duplicate dates are consolidated. Conflicting values for a date retain the lowest value deterministically for raw inspection and block derived analytics. Invalid observations and unexplained single-step NAV changes exceeding 40% produce history-quality warnings. Those warnings survive cache and backup operations; restore validates its submitted observations before replacing state.

Only confirmed Growth names are eligible for the displayed return, wealth, and risk analytics. IDCW/dividend wording takes precedence even when a scheme name also contains “Growth”. Raw IDCW NAV omits distributions and is not treated as a total-return series. Unresolved history-quality warnings also block derived analytics. A refresh failure describes retrieval state separately from the quality of retained, previously validated observations.

## Dates, ranges, and unavailable results

All calculation dates are `YYYY-MM-DD`; elapsed days use UTC-midnight differences. Calendar month/year arithmetic clamps invalid anniversaries to the last day of the destination month, so 29 February becomes 28 February in a non-leap year.

For `1M`, `3M`, `6M`, `1Y`, `3Y`, and `5Y`, the requested start is measured backward from the latest observation. Use the last reported NAV on or before that boundary, at most seven calendar days earlier. If none qualifies, a selected chart range begins with the first later available observation and discloses the shorter actual range. Historical valuation never substitutes a future NAV. `MAX` uses all available observations.

**Custom dates** are available on the Overview, Risk & drawdown, Monthly returns, and comparison views. Enter real calendar start/end dates and choose **Apply dates**; drafts and invalid inputs do not change the applied analysis. The start must be on or before the end. The same seven-day preceding-NAV rule applies to the start. The final observation is the last reported NAV on or before the requested end; no later observations are used. At least one observation must fall inside the requested interval before an earlier starting baseline can be included. An interval with no observations stays empty, including a weekend-only interval with no reported NAV. It never falls back to all history.

The interface shows requested dates separately from actual NAV dates and identifies preceding starts or shorter available ranges. Charts, selected-period metrics, drawdown episodes, and NAV/return exports use the same selected observations. CSV metadata records the requested range and actual observation endpoints. Comparison first intersects exact dates across all selected funds, then applies the custom range. Controls stay available when the selected range has too few observations. The full-history trailing-return table and Holding periods view remain explicitly separate; NAV inspection/export from Holding periods uses its full available history.

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

For a custom range, a month must additionally have reached its calendar month end by the requested end date. Cutting a historical range partway through a month does not make that partial month complete simply because the current clock is later. A requested end on a calendar month end can still use an eligible preceding NAV, including a Friday observation when month end falls on a weekend. The monthly table, its CSV, and risk statistics use this same complete-month population.

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

## Explorer and watchlist sorting

FundScope filters the full matched scheme population before sorting it and applies **20-row pagination by default, optionally 50 or 100 rows**, **after global ordering**. The user can jump to a numbered page or navigate to the first/last page. Fund-name sorting covers all matched scheme names, not just currently visible rows. Name ties use the exact scheme code for deterministic ordering. Changing the sort resets the view to its first page. A user can switch ascending or descending without changing their watchlist or any saved observations.

For 1Y, 3Y and 5Y return sorting, the GitHub Pages archive publisher builds a compact, versioned, **checkpoint-linked return index** from every validated Growth-scheme history already inspected during publication. It uses the exact same trailing-return calculations as individual fund pages: 1Y is an absolute return from eligible reported NAVs, 3Y and 5Y are ACT/365 CAGRs, with the same seven-calendar-day predecessor rule. Dividend/IDCW and unresolved source-quality histories never produce sortable returns. Missing history or an insufficient horizon is `null`, not zero. In either sort direction, unavailable values sort **after** valid ones, with name/code tie-breakers. This is a historical, descriptive order of the currently published archive, **not a market ranking or verified fund-performance leaderboard**.

### Scheme category filters

The homepage first loads the **full verified MFAPI scheme catalogue** from the published same-origin snapshot; six known schemes are used only when the full directory is unavailable. A separate small, versioned and SHA-256-verified category index is produced while the Pages builder is already validating all archived history shards. It retains each fund's source `scheme_category`, including **IDCW funds and histories with unresolved quality warnings**; it is not restricted to Growth funds. Category options are generated from all distinct source labels, with case/whitespace normalization only for matching. An **All categories** option keeps every matching scheme, while **Category not yet available** explicitly identifies funds with no saved source metadata (e.g., histories pending import). A category is never deduced from a fund name, and the menu is disabled when its snapshot index is unavailable.

The category index contains exactly one entry for each saved fund and is bound to the published catalogue and checkpoint sequence. The static client verifies its path, size, digest, source identities, category values, sorted unique scheme IDs and saved-history count. Category filtering operates **before sorting and pagination**, never over only the current visible page. Changing a category or page size resets to page one. None of this alters existing NAV histories or triggers thousands of extra source requests.

### Three-year maximum drawdown in the fund table

The new **3Y max drawdown** column is the largest *observed* loss from a running NAV peak to a later NAV trough during a trailing three-calendar-year window, ending on each fund's latest archived NAV date. It reuses the same `selectPeriod(points, '3Y')` and `drawdownStats` functions as the individual fund's Risk view. A start-of-window NAV must be reported on or within **seven calendar days before** the three-year anniversary, using the same eligibility rule as the 3Y CAGR; a shorter fund history is shown as **unavailable (—)** instead of being mislabeled a three-year figure. The selected-period peak is reset at that window's first eligible NAV, so earlier peaks do not enter the calculation.

The figure is a nonpositive percentage (e.g., **−24%** means the NAV fell 24% from an observed peak before recovering or ending the window). **0%** means no loss between observed peak and later observed NAVs during the eligible window, not that the fund was risk-free. It does not represent the investor's actual loss, a future worst case, a risk score, or a guarantee. Data gaps may hide a deeper trough. Dividend/IDCW options and histories with unresolved quality warnings remain unavailable.

Version **2** of the checkpoint-linked compressed ranking index adds a nullable `threeYearMaxDrawdown` value for every eligible archived Growth scheme. Version **1** remains supported for existing return columns, but cannot provide the new metric and does not enable global drawdown sorting. Values are validated to lie between −100% (exclusive) and 0% (inclusive), and are shown with each scheme's actual NAV end date. Sorting operates on the complete filtered population **before pagination**; the default descending direction shows smaller observed losses (closer to zero) first, and ascending shows deeper declines first. In either direction, missing metrics remain last. The table uses the exact same snapshot values for sorting and display and does not fetch thousands of histories on demand.

The single small compressed index is distributed as a same-origin GitHub Pages asset and checked against the manifest's SHA-256 digest, byte lengths, original catalogue identities and published checkpoint sequence. It does not trigger thousands of MFAPI requests or mutate the source archives. Because a newer individual fund refresh can contain observations not yet in the published checkpoint, a snapshot's sorted returns may differ from the latest open fund details. The table consistently displays the return values used for ranking, and the UI identifies them as archived. Older website deployments do not contain the index; in that case the interface keeps global name sorting and disables return sort for multiple pages until verified data for the entire matching set is available, instead of presenting a misleading page-local order.

## Historical monthly downside (Risk tab)

This section uses the same **complete, consecutive-month-end NAV returns** as the monthly heatmap and risk statistics, within the selected preset or applied custom date range. The existing confirmed Growth-option and unresolved history-quality gates also apply. A failed refresh alone does not invalidate otherwise validated saved data. The section does not use synthetic returns, fill missing months, or bridge gaps.

At least **12 eligible complete monthly returns** are required to show the negative-month share, longest observed losing streak and five worst observed months. The negative-month share equals the number of returns strictly below zero divided by all eligible returns; zero returns are not losses. A losing streak counts consecutive eligible **calendar months** with negative returns. A missing intervening calendar month breaks the streak. It does not imply a market recovery. The displayed worst-five table is sorted by most negative return, with observation-date ties in ascending order.

With at least **60 complete monthly returns**, the panel also displays the empirical fifth-percentile monthly return (ascending values, R-7 linear interpolation at index `(n−1) × 0.05`) and the arithmetic mean of the worst `ceil(0.05 × n)` **actual observed** monthly returns. The tail mean does not interpolate cash flows or monthly observations. For shorter samples these two measures are unavailable, rather than implying high precision from a handful of months. The sample may contain gaps and is not assumed independent or stationary. These are descriptive historical observations, **not** forward-looking value-at-risk, expected shortfall forecasts, probabilities of future losses, or suitability recommendations.

## Rolling holding periods and comparison

Rolling analysis starts at every available observation whose full one-, three-, or five-calendar-year anniversary lies within the history. Its ending NAV is the last eligible observation on or before that anniversary, within seven days. One-year outcomes are absolute returns; longer outcomes use actual observation days for CAGR. Windows overlap and their frequency is descriptive, not a forecast probability.

The chart's horizontal identity is the **starting NAV date**. This retains distinct windows that resolve to the same ending NAV date. Hover details include both start and end dates; summary counts and best/worst/median outcomes use the same full set of completed windows.

Comparison intersects exact reported dates across every selected fund first, then computes a preset period from their common endpoint or applies the requested custom boundaries. It retains only those common observations, without interpolation or forward filling. Each fund starts with ₹10,000 at the common first observation. Its table metrics use that same aligned history, which can have fewer monthly observations than an individual fund's history. At least two common dates are needed to display comparison results.

## Reproducibility

Retain the exact scheme code, provider history, retrieval timestamp, calculation version, selected dates, target-rate assumption, and backup version when reproducing a result. Provider corrections and new observations can change later calculations. See [README.md](../README.md) for run/test commands, cache and backup limits, and the final release verification record.

## Selected comparison peers

The **Selected peer context** panel describes only the two to four funds deliberately placed into Compare. It is not a complete category peer universe, a survivorship-bias-adjusted sample, a market ranking, or a suitability recommendation. It is unavailable if the selections have differing normalized MFAPI `scheme_category` or `scheme_type`, an ambiguous or mismatched Direct/Regular plan, a dividend/IDCW option, unresolved NAV-quality warnings, duplicate scheme codes, or apparent duplicate share-class variants of the same underlying fund. It does not silently drop ineligible selections to manufacture a sample.

All eligible peers share the intersection of **exactly reported NAV dates** in the applied analysis period, with no forward fill or artificial zeros. Peer total return is ending NAV divided by starting NAV minus one; it is called **absolute return** for periods shorter than 365 calendar days, and **ACT/365 CAGR** for periods of at least 365 days. The panel shows common actual dates, common NAV observation count, eligible peer count, and unweighted median across the selected schemes.

Percentile is an empirical **midrank within the selected set**: `100 × (number of fund returns below the observation + 0.5 × number tied at the observation) / eligible fund count`. Two funds with identical returns both receive 50/100. With two to four selected funds, percentile values are descriptive only and do not represent category-wide standing. The panel reports cached/stale source data separately. Its CSV export includes scheme codes, names, decimal returns, percentile values, period bounds, source, measure, and cohort limits.

**Index benchmark data remains unconnected.** NSE Indices publishes TRI reports but [requires prior approval and potentially fees for index benchmarking uses](https://www.nseindia.com/static/nse-indices/index-licensing). FundScope does not redistribute an index history or assume a universal Nifty 50 benchmark. A source-specific approval and verified total-return series would be needed before benchmark excess returns, capture ratios or tracking statistics are shown.

## Monthly return correlation (selected funds)

Compare also reports descriptive **pairwise Pearson correlations** of complete calendar-month returns derived solely from validated Growth-option NAV histories. It is a *return-co-movement* statistic, not a holdings-overlap metric. It may be applied to unlike MFAPI categories for portfolio-fit research; unlike selected peer percentiles, it is not an eligible category ranking.

Each fund first uses the currently selected analysis range. Its monthly returns use valid NAV points near each completed month end, with an uninterrupted previous completed month for each return. For each pair, return months are matched by calendar year and month, not by requiring identical month-end NAV observation dates. Missing or incomplete months are excluded rather than assigned zero. A pair needs at least **12 matched complete monthly returns**. Zero variance, dividend/IDCW options, duplicate selected codes or unresolved quality issues yield unavailable coefficients.

For paired returns x and y, Pearson correlation is the sum of demeaned products divided by the geometric mean of the two demeaned sums of squares. Values are dimensionless from −1 to +1. Different cells can have different paired calendar-month sets. The CSV includes the actual first and last matched month, matched count, source, return basis and unavailable reasons. This statistic does not prove diversification, predict future correlation or estimate holdings overlap.

## User-selected Direct versus Regular Growth plan comparison

The **Direct vs Regular plan** panel appears on Compare when **exactly two different scheme codes** have one explicitly identified Direct scheme and one Regular scheme. This is a comparison of their **observed NAV returns**, not an attempt to determine expenses from NAV. Compare search includes both explicitly named Direct Plan and Regular Plan Growth schemes; the general two-to-four-fund comparison, selected-peer context and monthly correlation remain separate.

Eligibility requires confirmed Growth options, no unresolved source NAV-quality warnings, exactly one explicit `Direct Plan` and `Regular Plan` label, and matching normalized MFAPI fund house, scheme category and scheme type. The scheme names must match after removing only the explicit plan labels, incidental punctuation/spacing, historical `(erstwhile ...)` notes, and normalizing `Growth Option` or `Growth Plan` wording to `Growth`. Strategy names are otherwise retained. This deliberately rejects ambiguous names and may exclude genuine plan pairs. **MFAPI does not supply an explicit scheme-pair mapping or certify same-strategy variants**; even a matching name and metadata require independent confirmation from the asset management company (AMC) documents. No fee, holdings, management-company approval or official matching source is inferred.

Financial results use **the exact common dated NAV observations and applied date range already used by Compare**. There must be at least two shared, ascending, valid actual reported observations. Each plan's starting wealth is fixed at ₹10,000, and terminal value is ₹10,000 × (ending NAV / starting NAV). Each plan's return is **absolute NAV return** when the observed interval is shorter than 365 calendar days, or **ACT/365 CAGR** when it spans 365 days or more. The reported **Direct − Regular return gap** is the difference between those two returns, in *percentage points (pp)*, not a compounded relative fee rate. The **ending-value gap in INR** is the difference between the two normalized ₹10,000 terminal wealth values. For a partial-year interval no annualized gap is shown. Raw NAV levels of two share classes must never be subtracted, because their unit prices are not comparable.

The panel is omitted for unrelated same-plan fund selections. When a Direct/Regular selection fails identity, quality or coverage checks, it explains why instead of producing values; no series are silently removed. A source refresh failure is shown as stale provenance rather than automatically invalidating previously verified data. The downloadable CSV records both scheme codes, names, MFAPI history URLs, retrieval timestamps, requested and actual ranges, calculation basis, percentage-point and rupee outcomes, and every shared actual NAV date with each plan's NAV and normalized wealth. It never inserts missing-date prices.

Fund operating expenses are reflected in reported NAV, but observed plan return differences also depend on other NAV and operational effects. The difference is **not a stated or inferred total expense ratio (TER)**, exact fee saving, transaction cost, guaranteed future spread, or investor recommendation. Taxes, loads and distributions are not separately modeled. Dated TER research and automatic verified plan matching require additional rights-cleared sources.

## Personal research notes

Fund pages have a **Personal research notes** section on Overview. Notes are user-authored plain text, keyed to the exact numeric MFAPI scheme code. The app records the UTC time of creation and each edit, preserving the original creation date. Research notes are **not data supplied or verified by MFAPI**, are not investment recommendations, and are not included in any financial calculation. Notes are rendered as plain text; no user-supplied HTML or embedded scripts are interpreted.

Notes remain in the browser's version-1 ResearchSettings and are included in the existing portable **Data & backups** JSON export/import. Existing version-1 backups without a `fundNotes` field restore normally. Import validates unique note IDs, valid scheme codes, non-empty note bodies up to **3,000 characters**, an overall maximum of **120 notes**, valid UTC timestamps, and updated time no earlier than creation; invalid notes cause the entire backup restore to fail rather than partly overwrite stored research. A note edit reuses its identity instead of creating a second copy. A delete requires in-app confirmation.

Browser localStorage is not cloud synchronization or a guaranteed permanent backup. Clearing browsing data or changing browsers may remove research notes. The GitHub archive, historical NAV data, collector workflows and other website visitors never receive these personal notes.


## Historical SIP cash-flow illustration

The **Returns → Historical SIP simulation** panel is a hypothetical historical scenario, not a
personal transaction ledger or an investment recommendation. Only confirmed Growth
options with resolved material NAV-quality warnings are eligible. The user controls
the monthly rupee contribution (₹100–₹1 crore) and a preset or custom simulation
period, separately from the full-history rolling-return chart. The most recently
reported NAV inside the requested period is used for valuation; future NAVs are
never substituted.

One contribution is scheduled at the requested starting date and each successive
calendar-month anniversary. Day-of-month stays anchored to the original requested
start, with month-end clamping (for example 31 January → 29 February in a leap
year → 31 March). For each scheduled date, the contribution buys hypothetical
fractional units at the **first reported NAV on or after that date**, no more than
seven calendar days later. Missing dates beyond seven days are skipped, visibly
counted and exported as missing—not valued with a preceding NAV or imputed
future observation. A custom chart baseline preceding its requested start cannot
become a simulated SIP purchase. The sample stops on the last reported NAV on
or before the requested ending date.

For a fixed monthly contribution C and an observed eligible NAV P_i, the
hypothetical units purchased are U_i = C/P_i. Contributions accumulate as
I = sum(C); units accumulate as U = sum(U_i). Valuation on the last observed
NAV date T is V = U × P_T; gain is V − I and the simple gain share is
(V − I)/I. This simple gain share is **not** a CAGR or annualized cash-flow return.
The chart shows invested capital and hypothetical NAV value on observed dates only.

A **money-weighted annual XIRR** is shown only when at least 365 calendar days
elapsed between the first executed contribution and the valuation NAV. It solves
the actual dated-cash-flow future-value equation

    V = sum_i C_i × (1 + r)^((T − t_i in calendar days)/365)

for r > −1 by bounded bisection; unavailable or non-finite roots are shown as
unavailable. Missing contributions are not silently backfilled. XIRR uses the
timing of these hypothetical cash flows and is not the fund's NAV CAGR.
No transaction execution, real allotment or exact fractional-unit rounding
is claimed. Taxes, exit loads, transaction charges, inflation and cash
distributions are excluded; normal fund operating costs are already reflected
in published NAV and are not charged again.

The detailed CSV includes the MFAPI source URL, NAV retrieval time, requested
and actual observation dates, scheduled/observed contribution dates including
those without valid NAV, contribution INR, NAV INR per unit, hypothetical
fractional units, number of available NAV observations, invested and terminal
value, and the formula/assumptions used. The chart and table follow exactly
the same simulation result and never fabricate a missing observation.
