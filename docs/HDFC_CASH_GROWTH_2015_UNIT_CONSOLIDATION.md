# HDFC cash-management Growth successors — verified 2015 unit basis

## Primary evidence and identity chain

[HDFC's official addendum dated 14 August 2015](https://files.hdfcfund.com/s3fs-public/addenda-reports/636%20-%20Addendum%20-%20Change%20in%20Face%20Value%20of%20Liquid%20Schemes%20-%20August%2014,%202015.pdf) changes the unit face value from Rs10 to Rs1000 effective **30 August 2015**. It expressly includes Regular and Direct plans of HDFC Cash Management Fund's **Savings Plan and Call Plan**, as well as HDFC Liquid Fund. Existing unit balances are adjusted proportionately. The denomination change itself is not an investment return. The original one-page notice was visually inspected.

[HDFC's official 2018 scheme positioning document, page 8](https://files.hdfcfund.com/s3fs-public/2018-07/HDFC-Mutual-Fund-Scheme-Positioning-and-Categorization.pdf#page=8), visually checked, maps **Savings Plan to HDFC Money Market Fund** and **Call Plan to HDFC Overnight Fund**. It gives effective positioning dates of 26 May 2018 and 2 June 2018 respectively. The [official Call Plan addendum](https://files.hdfcfund.com/s3fs-public/2018-07/1547-Notice-Fundamental-Attributes-%26-Merger-of-Select-Schemes-Tranche%20V.pdf), page 1, also records the name and fundamental-attribute changes from close of business on 1 June 2018. This proves the predecessor/successor naming chain, not that the investment strategy was identical throughout the historical period.

## Observed source histories, not an inferred family-wide adjustment

[Read-only investigation #40626398651](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40626398651), job **122612231964**, inspected immutable **checkpoint 208** at **2026-10-28T03:23:30.556Z** (27 October, 23:23 Toronto). All four exact source identities belong to **HDFC Mutual Fund**, report positive catalogue NAV dated **26 October 2026**, and pass the existing official-roster/current-membership/30-day eligibility rule.

| Exact source identity | Code | Saved observations | 28-to-30 August 2015 NAV ratio |
| --- | ---: | ---: | ---: |
| HDFC Money Market Fund - Regular Plan - Growth Option | 101993 | 5,735 | 100.04110070335236 |
| HDFC Overnight Fund - Regular Plan - Growth Option | 101996 | 6,330 | 100.0370975577441 |
| HDFC Money Market Fund - Direct Plan - Growth Option | 119092 | 3,665 | 100.04235339273836 |
| HDFC Overnight Fund - Direct Plan - Growth Option | 119110 | 4,259 | 100.03748754090553 |

Each entire saved series has **exactly one** move above 40%, between **28 August 2015 and 30 August 2015**, and no invalid-NAV or conflicting-NAV warning. Each history ends on 26 October 2026. The earlier calculation registry leaves all four blocked. The investigation made zero MFAPI/AMFI requests and zero archive writes.

### Immutable document fingerprints

- 101993: `a94088b5091c6f31fce638f879579ba64f00c03023b4cb947693e0e471181da9`
- 101996: `41ada432c23e4951a56fa3217bc84293e1f448b68c034ee749ad11a378c57351`
- 119092: `90874e6653fabac3bbcc0af35eb73ba42a6b60fa1c0a03a28ad74aa478ca7951`
- 119110: `30c5308dad5f7949b87aff400e770aef4ea92e093475067c03ec3467381d8670`

The first two records share shard SHA-256 `f5c01eed789946e54739b04b264e0897e940e6145fbdc28dc76d4e4b4d40c303`; Direct Money Market uses `37413e28a5972ea2b2474968cd99886a69bf043e7eb41b5f35aee351c02edca3`; Direct Overnight uses `49cfbb70d44375154efc2cc2b936c2f32dd0a07486f98b15ebcf4849f6e44b45`.

## Narrow repair and verification plan

Add four explicit code/name/predecessor entries to the existing calculation registry. Require HDFC fund-house identity and the exact corresponding Growth-option name, not a wildcard, sibling-plan inference or fuzzy match. The current one-jump, unique ascending dates, positive finite NAV, exact 28-to-30 August boundary, 99.9-to-100.1 factor range, and independent-warning checks remain unchanged.

Only a temporary financial-analysis copy scales old-basis NAVs by **100**. Values from 30 August 2015 onward, every observation date, source warning, archive document, latest quote, raw chart, raw CSV, successful retrieval timestamp and checkpoint remain unchanged. The existing disclosure names the historic Savings or Call Plan. Do not infer a 29 August observation, scale unrelated funds, unlock distribution-option total returns or normalize an already adjusted copy again.

Seven regression tests were written before implementation. [Baseline #40626609913](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40626609913) passed type checking and **607/612 tests**: all 605 original tests plus the two negative cases passed; the five new positive expectations failed as intended. Require the final head's full suite, typecheck, both builds, direct diff review and read-only full-history before/after checks before merge. Publication must be verified separately.

The production change does not touch collection, retry budgets, source cooldowns, repair eligibility, the seven-day website discovery rule or the global precomputed return-index policy. Checkpoint208 still has 8,524 repair candidates and 610 original source-quality flags. A calculation-only explanation does not reduce that raw count or establish complete historical accuracy. The Quant price reversals, invalid-value cases and other unresolved discrepancies remain blocked.
