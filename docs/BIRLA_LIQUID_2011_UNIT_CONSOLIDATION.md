# Birla Sun Life Cash Plus / Liquid Fund — 2011 unit consolidation

## Dated scheme evidence

On **5 October 2011**, Value Research reported Birla Sun Life Mutual Fund's decision to change the **face value per unit from ₹10 to ₹100 effective 7 October 2011**, including **Birla Sun Life Cash Plus** and all its plans/options:
[Contemporary announcement](https://www.valueresearchonline.com/stories/18192/birla-sun-life-mf-changes-the-face-value-of-6-debt-schemes/).
[Morningstar's contemporaneous industry roundup](https://www.morningstar.in/posts/5321/fund-times-indian-mf-industrys-aaum-falls-over-4.aspx) also records the same issuer, scheme, effective date and ratio. Historic fund materials later identify Cash Plus with the liquid scheme.

The owner-supplied October 2026 scheme sheet identifies:
- **100047** — Aditya Birla Sun Life Liquid Fund - Growth.
- **100046** — Aditya Birla Sun Life Liquid Fund -Daily IDCW.
- **100051** — Aditya Birla Sun Life Liquid Fund -weekly IDCW.

A [read-only FundScope immutable-archive inspection #40435700984](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40435700984) verified checkpoint **182**, using saved SHA-256-checked shard data.

| Scheme | Source observations | 2011-10-06 to 2011-10-07 ratio | Large historical moves |
| --- | ---: | ---: | ---: |
| 100047 — Growth | 6,459 | 10.0024181× | 1 |
| 100046 — Daily IDCW | 6,458 | 10.0000000× | 1 |
| 100051 — Weekly IDCW | 6,459 | 9.9929210× | 1 |

These near-tenfold unit-price changes occur at precisely the public action date. The archival check does **not** authorize deletion or overwriting of historical source NAV rows.

## Calculation-only adjustment

Only the exact **scheme-code and scheme-name pair** `100047` + `Aditya Birla Sun Life Liquid Fund - Growth` is eligible for the current Growth-option performance adjustment. The calculation verifies that:
- the positive NAV series has unique, ascending dates and no other large moves;
- the single observed >40% change lies **exactly** between 6 and 7 October 2011;
- the observed ratio is **9.95 to 10.05**, near the issuer's documented 10:1 consolidation;
- there are no unresolved invalid-NAV or conflicting-duplicate-date warnings;
- the original source warning is the exact single-discontinuity warning.

Then, and only then, it uses NAV through **6 October 2011 multiplied by 10** in a temporary derived-calculation copy. New-basis values from **7 October 2011** remain unchanged. A new provider revision must pass this full validation again.

The fund detail, historical SIP illustration and selected-fund comparison disclose the adjustment and show the specific evidence link. Source NAV, latest quote, raw NAV chart, CSV, saved history and source-quality flags remain unchanged.

## Limitations

The matching **IDCW/distribution schemes 100046 and 100051 remain ineligible for Growth-only return and risk calculations**. Their 10:1 unit adjustment alone does not account for cash distributions. They require separate distribution-adjusted data before computing investor total returns.

Do not generalize the same factor to another fund by name, apparent tenfold ratio, or common issue date without verifying its exact scheme identity, AMC disclosure and archived NAV boundary.

The site's **global precomputed return index** remains governed by the stricter archive-quality gate. This change does not mark the source history clean, modify an archive checkpoint or confirm commercial redistribution rights.
