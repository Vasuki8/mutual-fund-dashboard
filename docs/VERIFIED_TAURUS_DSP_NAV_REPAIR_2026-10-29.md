# Verified Taurus and DSP NAV calculations

## Scope and resulting behavior

The fifth 29 October continuation reviewed 19 additional schemes and recorded an
outcome for every one of their 490 previously identified zero-NAV dates. Four
Regular Growth schemes have complete evidence for calculation repairs: Taurus
Flexi Cap 100476, Taurus Mid Cap 100477, Taurus ELSS Tax Saver 100480, and DSP Small
Cap 105989. They require ten exact zero restorations and three independently
reproduced positive corrections. This is a calculation-only review; raw source
bodies, saved positive values, warnings and archive quality flags stay intact.

All four meet the existing official open-ended roster, independently verified
current catalogue membership, positive latest NAV and 30-UTC-day rule on
29 October 2026. Checkpoint 217's catalogue was verified against the MFAPI scheme
list at 17:24:16.530 UTC. Its latest Taurus NAV dates are 29 October and DSP's is
28 October. The separate seven-day website discovery rule is unchanged.

## Exact calculation values

| Code | Regular Growth ISIN | Date | Retained raw NAV | Verified calculation NAV |
| --- | --- | --- | --- | --- |
| 100476 | INF044D01989 | 2006-11-11 | 0.00000 | 38.95 |
| 100476 | INF044D01989 | 2006-11-12 | 0.00000 | 38.95 |
| 100476 | INF044D01989 | 2006-11-18 | 0.00000 | 38.71 |
| 100476 | INF044D01989 | 2007-02-12 | 41.05000 | 40.93 |
| 100477 | INF044D01815 | 2006-11-11 | 0.00000 | 15.05 |
| 100477 | INF044D01815 | 2006-11-12 | 0.00000 | 15.05 |
| 100477 | INF044D01815 | 2006-11-18 | 0.00000 | 14.75 |
| 100477 | INF044D01815 | 2008-09-30 | 13.99000 | 13.92 |
| 100480 | INF044D01AC9 | 2006-11-11 | 0.00000 | 17.34 |
| 100480 | INF044D01AC9 | 2006-11-12 | 0.00000 | 17.34 |
| 100480 | INF044D01AC9 | 2006-11-18 | 0.00000 | 17.06 |
| 100480 | INF044D01AC9 | 2007-12-17 | 33.67000 | 35.20 |
| 105989 | INF740K01797 | 2007-06-28 | 0.00000 | 10.1350 |

No unit factor is applied. Every other positive source observation remains at its
original date and NAV. No issuer-only date is added, and no source-only date is
removed. The raw NAV chart and raw export continue to use the original series.
Existing calculation summaries disclose each restoration and positive correction.

## Primary evidence and identity

### Taurus

The issuer's [historical NAV form](https://taurusmutualfund.com/NAVs/NAV_search)
exposes Growth selectors 561, 557 and 563 for Flexi Cap, Mid Cap and ELSS,
respectively. Plan selector 52 is Regular. Its ordinary CSV export returns seven
non-overlapping historical partitions per scheme; the issuer's
[current NAV data](https://taurusmutualfund.com/sites/default/files/downloads/navData.txt)
extends the overlapping comparison through 28 October 2026. Initial whole-range
exports failed with PHP resource errors, so the investigation used smaller ranges
offered by the same form.

The [issuer ISIN table](https://taurusmutualfund.com/sites/default/files/2021-05/List_of_ISIN_numbers_of_Taurus_MF.pdf),
physical page 1, explicitly identifies all three Regular Growth ISINs. The table
was visually checked. The unchanged manually supplied official roster binds the
same exact numeric codes and Growth ISINs; one trailing whitespace character in
its 100476 display name was trimmed only for identity comparison. No automated
AMFI request was made.

Each zero replacement appears in both the full CSV and a separate 10–20 November
2006 query. All eight other positive rows in that closed window match the
retained source. Each positive correction also repeats in its own narrow query:
9–14 February 2007 for 100476, 26 September–3 October 2008 for 100477, and
14–20 December 2007 for 100480. These source windows contain four, five and five
rows, respectively. Other issuer weekend rows are recorded but are not inserted.

### DSP

The [issuer NAV page](https://www.dspim.com/investor-centre/nav) selects RTA code
157 for Regular Growth. Narrow and full history responses agree on 28 June 2007
= 10.1350 under the historical Micro Cap Regular Growth name. Its five surrounding
source observations are 20 June = 10.032, 21 June = 10.063, 25 June = 10.074,
27 June = 10.122 and 4 July = 10.272.

The [issuer Scheme Summary Document hosted by NSE](https://nsearchives.nseindia.com/trading_security/mf/pdf/DSP_20032026132943_DSPMutualFundSchemeSummaryDocument.pdf#page=79),
physical page 79, binds Regular Growth to RTA 157, ISIN INF740K01797 and AMFI code
105989. The [issuer 2017–2018 annual report](https://www.dspim.com/media/pages/mandatory-disclosures/annual-reports/2e50275ec7-1769155731/abridged-annual-report-for-the-financial-year-2017-2018-equity-schemes.pdf#page=14),
physical page 14 / printed page 12, identifies Small Cap as formerly Micro Cap and
separately gives the Regular plan's 14 June 2007 inception. Both tables were
visually checked. Historical NAV rows do not themselves print an ISIN; this
issuer-controlled mapping and rename documentation establish the plan connection.

## Complete retained-history comparison

| Check | 100476 | 100477 | 100480 | 105989 |
| --- | ---: | ---: | ---: | ---: |
| Positive source observations | 5,065 | 5,064 | 5,064 | 4,234 |
| Saved checkpoint-217 positives | 5,062 | 5,062 | 5,062 | 4,231 |
| Exact shared issuer/source positives | 5,055 | 5,056 | 5,055 | 4,219 |
| Separately verified positive corrections | 1 | 1 | 1 | 0 |
| Source-only positives preserved | 9 | 7 | 8 | 15 |
| Other issuer-only dates recorded, not inserted | 1,535 | 1,535 | 1,535 | 2 |
| Restored zero observations | 3 | 3 | 3 | 1 |
| Resulting calculation observations | 5,068 | 5,067 | 5,067 | 4,235 |

The Taurus 100476 retained response includes 29 October, one day beyond the issuer
asset's latest date; that positive is preserved. Six undated empty CSV rows across
the three Taurus histories are explicitly recorded without inferred dates or
values. DSP's full response contains 4,233 rows on 4,222 dates, with eleven
identical duplicates and no conflicting duplicates. Its two other issuer-only
dates are 29 September 2025 and 29 October 2026.

All 19,417 saved positives match the corresponding retained raw source, and all
19,427 source positives survive in the calculation copy except for the three
explicit Taurus value corrections. Full corrected curves contain no move above
the existing 40% threshold. Their maximum absolute single-observation moves are
approximately 19.431%, 19.815%, 17.771% and 25.025%, respectively. These ordinary
returns are preserved, not normalized with an invented unit adjustment.

## Runtime guards and remaining limits

The helper requires the exact code, name, AMC, type, category, Growth ISIN and
explicitly null reinvestment ISIN. Every rejected row must be proved by the
complete ordered `rejectedZeroNavDates` array and the exact generated invalid-row
warning. Legacy count-only archives are insufficient. Other quality warnings,
unrecognized positive revisions, partial repairs, extra or missing window rows,
invalid dates, duplicate dates and any independent large move prevent review.

All insertions are interior to the available history and are merged into a cloned
chronological calculation series. The original input stays unchanged. Taurus's
separate positive correction accepts either its observed source value or the
exact verified value. If the provider later fixes every zero, a positive-only
correction requires all three exact former-zero values in the full eleven-row
November window, no rejection evidence and no quality warning. An absent warning
alone does not prove a source repair. A second application does nothing.

The existing server/cache preservation rules still apply. A fresh complete raw
response can establish current dated rejection evidence after a legacy archive;
deploying this code does not retroactively annotate the old archive or clear its
quality status. A successful isolated replay through API, browser cache, server
merge, shard validation, archive hydration and calculation confirms parity and
preservation for all four complete retained histories. It makes no source request
and writes no production archive data. Static rankings still reject unresolved
archive records.

Local reviewed windows do not prove that an arbitrary future response has no
silent omission elsewhere. The full retained histories were independently
compared, and existing archived-positive retention remains required. Other
issuer-only dates are known but outside this narrow repair; no complete historical
coverage claim is made.

## Remaining audited cases

The 19-scheme research batch records all 490 exact date outcomes; access-denied or
unsupported queries remain unqueried rather than being mislabeled as omissions.
Alongside earlier passes, all 732 known zero observations have an evidence status.
This pass found thirteen positive zero candidates, but three belong to Taurus
101209, whose issuer gives both 75.77 and 75.76 for 28 May 2019. That scheme stays
blocked. SBI's three reviewed schemes still have 452 zero dates omitted by the
issuer; their three new positive conflicts do not resolve those missing dates.
Five Taurus/Tata/Bandhan-group schemes and seven mixed-AMC schemes remain blocked.

After verified delivery of this batch, the original 103-case audit has six
supported calculation repairs and 97 cases without sufficient primary evidence:
71 source-quality cases, 15 unit-event cases and 11 other cases. The two earlier
supported cases are the Sundaram plans documented separately. All original raw
flags, historical reasons and prior reports remain preserved. Delivery and live
archive status are recorded separately in the continuation evidence bundle.
