# FundScope analytics implementation report

Calculation version: **1.0.0**. Verification date: **2026-10-21**.

## Delivered scope

Implemented every export specified in `docs/analytics-task.md` in `src/lib/analytics.ts`, with no external runtime dependencies. Behavioral tests live in `tests/analytics.test.ts`. No shared configuration was modified.

The functions consume ascending, validated ISO-date observations with positive finite NAVs. They preserve input arrays and point identity when selecting or aligning observations. Provider validation, anomaly warnings, and scheme-level eligibility remain integration responsibilities.

## Calculation decisions

- Dates use calendar arithmetic and UTC midnight for elapsed-day counts. Provider dates must match `DD-MM-YYYY`; impossible calendar dates are rejected. Month and year offsets clamp to the last valid day, including leap-day anniversaries.
- Period starts prefer the last observation on or before the requested boundary, at most seven calendar days earlier. If that point is unavailable, `selectPeriod` starts at the first later observation. Its returned dates expose the shorter available range; the interface must disclose that range. A future observation is never used to value a requested historical boundary.
- Absolute return is ending NAV divided by starting NAV minus one. CAGR is `(end / start) ** (365 / actualDays) - 1`, available only with at least 365 elapsed days. Empty and single-observation return histories yield `null`.
- Trailing and rolling one-year outcomes are absolute returns. Multi-year outcomes are ACT/365 CAGR. Both require a complete requested horizon; rolling windows also require the complete calendar anniversary to fall within the history before selecting a preceding endpoint. Every rolling result includes its actual observation dates.
- Drawdowns begin at the first selected observation. Maximum-drawdown dates identify the deepest episode and its first subsequent recovery to the episode's peak. A later deeper episode replaces those dates. No-loss histories return zero drawdown and null episode dates.
- Monthly returns use the final available observation in each month, no more than seven days before calendar month end, paired only with the immediately preceding eligible month. Missing or stale months are never bridged. Each result's date is the actual reported NAV date.
- Months before the latest observation's month are complete. The final month is eligible only when the last observation is actual calendar month end, or that month precedes the current UTC calendar month. Its observation must still satisfy the seven-day tolerance. This final-month decision is the module's only wall-clock read (`Date.now`), and the relevant test fixes that clock without relying on the host timezone.
- Risk requires twelve complete monthly returns. Volatility uses sample standard deviation annualized by `sqrt(12)`. Sharpe uses twelve times arithmetic mean monthly excess return divided by annualized volatility. The monthly target is `(1 + annualRiskFreeRate) ** (1 / 12) - 1`; the optional default annual target is zero.
- Sortino divides squared monthly target shortfalls by **all** available monthly periods, takes the square root, and annualizes consistently. A zero denominator yields `null`. Constant NAV at a zero target therefore has zero volatility and null Sharpe/Sortino. At a positive target, constant NAV has a defined negative Sortino of `-sqrt(12)` because its downside shortfalls are nonzero; Sharpe remains null. Counts and best/worst complete months remain available when fewer than twelve returns exist.
- Comparisons use exact date intersections across every supplied fund, compute the requested period from the common final date, and preserve equal-length arrays. No interpolation or forward filling occurs. Empty or disjoint inputs return empty arrays and null range bounds.
- Growth classification first rejects names containing IDCW, dividend, income distribution, or capital withdrawal wording, even when the same name also includes “Growth”. A separate whole-word Growth designation is required.

## Integration requirements

The caller must disclose actual selected start and end dates and distinguish one-year return from multi-year annualized return. It must also gate total-return, wealth, and risk analytics using scheme eligibility and provider anomaly warnings. The numeric functions intentionally do not accept scheme metadata or warnings; raw NAV inspection can remain available for excluded schemes.

The input-validation layer owns ascending order, duplicate dates, positive finite values, and detection of unexplained changes exceeding 40%. The analytics layer neither rewrites raw data nor conceals an anomaly.

## Test evidence

Tests were written before implementation. The first run failed because the analytics module did not yet exist. With neutral export stubs in place, the initial 26 behavioral tests produced **23 assertion failures and 3 passes**. A subsequent positive-target constant-NAV test also failed against those stubs before the implementation was written.

Final analytics checks:

| Command | Observed result |
| --- | --- |
| `node --experimental-strip-types --test tests/analytics.test.ts` | Exit 0; the isolated runner reports the analytics file as one passing file. |
| `node --experimental-strip-types --test --test-isolation=none tests/analytics.test.ts` | Exit 0; **27 tests passed, 0 failed**. |
| `TZ=America/Los_Angeles node --experimental-strip-types --test --test-isolation=none tests/analytics.test.ts` | Exit 0; the same **27 tests passed, 0 failed** with a non-UTC host timezone. |
| `./node_modules/.bin/tsc --noEmit` | Exit 0; no TypeScript diagnostics. |

The runtime's isolated Node test runner summarizes at file level. `--test-isolation=none` exposes the individual behavioral assertions and was used to inspect both the expected red phase and the passing implementation.

The full project `npm test` command was also run. At this integration snapshot it exited 1: `tests/analytics.test.ts` passed, while `tests/api.test.ts` and `tests/storage.test.ts` failed while the separate data/storage implementation was still in progress. No full-suite success is claimed here. The site owner must rerun the full suite after integration. npm also emitted warnings about pnpm-specific project configuration and its proxy environment; these were not modified by this task.

Covered numerical and boundary cases include 100→121 over 730 days giving 10% CAGR; a 25% drawdown and final recovery; zero denominators; positive-target constant NAV; sample deviation; downside division by all months; insufficient monthly history; missing and stale month-end observations; UTC final-month completion; leap-day clamping; seven-day inclusivity; unavailable historical horizons; future-date avoidance; exact common-date comparison; point identity; and Growth/IDCW distinctions.
