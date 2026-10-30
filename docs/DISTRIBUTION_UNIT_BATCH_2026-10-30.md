# Verified Invesco and Nippon distribution unit registrations

**Review date:** 30 October 2026. **Development base:** `8bdc157c8ba985772dd7723c118f77ffcdf936ec` (merged PR 82). **Data snapshot:** immutable checkpoint 257, created at `2026-10-30T23:04:15.628Z`. Later collector snapshots are reported separately below.

## Result and boundaries

This batch adds **41 exact distribution identities** to the established calculation-only unit registry: **33 Invesco and eight Nippon**. Independent primary-source review and full retained-series arithmetic support the documented change from face value **₹10 to ₹1,000**. Each registered history has one corresponding large observed NAV move. Multiplying only the pre-event calculation-copy NAVs by the documented factor **100** makes the unit basis consistent while retaining the ordinary return across the event.

The approved histories contain **176,110 retained observations**, including **33,168** on the old unit basis. The complete screened cohort contains **89 histories and 362,985 observations**. The other **48 histories, containing 186,875 observations**, remain unsupported and receive no new adjustment.

**Raw archive flags cleared: zero. Consumer return eligibility added: zero.** Original NAV values, dates, observation counts, archive warnings and unresolved flags remain unchanged. Distribution cashflows have not been reconstructed. These IDCW histories remain outside the existing literal Growth-only consumer rankings. A consistent unit basis does not establish total return or complete source coverage.

## Evidence and reproducibility

- [Primary identity, action, source and exclusion ledger](evidence/2026-10-30-distribution-unit-sources.json): exact current names, codes, houses and both ISIN fields; primary URLs; original byte hashes where available; one-based PDF pages; historical option NAV anchors and rename chains; per-history limitations.
- [Portable offline production replay](evidence/2026-10-30-distribution-unit-replay.mjs) and [complete result](evidence/2026-10-30-distribution-unit-replay.json): all 89 screened histories, full observation-level comparisons, immutable input references, production source digests, eligibility, warnings and consumer outputs.
- [Literal regression fixtures](../tests/fixtures/invesco-nippon-distribution-units.ts) and [behavioral tests](../tests/invesco-nippon-distribution-unit-basis.test.ts): independent Decimal expectations, identity/date/factor guards and usable Growth controls.
- [Collector checkpoint-258 follow-up](evidence/2026-10-30-collector-checkpoint-258.json): exact ancestry, pacing, publication and continuation observations from the previous merged batch.

The capture contains the checkpoint-257 manifest, catalogue and **47 history shards**. All **48 compressed assets** were checked against their manifest hashes, byte counts and expanded sizes before production schema validation. They total **12,461,547 compressed bytes**. Manifest SHA-256: `58e2a21009f582c2caefd1dd7ca6c6def0df934909a87d7409aa337e7e92581a`.

The catalogue was fetched and independently verified against the MFAPI scheme list at `2026-10-30T19:58:19.963Z`. Membership provenance is `mf-list`, with 38,026 listed and 38,026 bulk-NAV identities and zero missing-bulk identities. All 89 histories qualified against the exact 26 October official open-ended roster and the actual UTC date at `2026-10-30T23:22:01.305Z`: current membership, finite positive latest NAV, valid nonfuture date no more than 30 days old. The replay records both this frozen historical selection and eligibility on its actual execution date. The 30-day rule selects histories; every retained historical observation is reviewed.

To reproduce, obtain the exact manifest and content-addressed assets listed in the replay output from the public archive or retained release assets. Put them in one local directory and run from this reviewed repository tree:

```bash
node --experimental-strip-types docs/evidence/2026-10-30-distribution-unit-replay.mjs \
  /path/to/checkpoint-257/archive /path/to/replay-result.json .
```

The replay performs no network requests and rejects incorrect inputs or production source hashes. A later execution may have different actual-date eligibility; it must not relabel a historical snapshot as current. No direct automated AMFI request was made for this batch.

## Exact event groups

| Group | Identities | Retained observations | Legal effective date | Last old NAV → first new NAV | Factor / absolute ratio tolerance |
| --- | ---: | ---: | --- | --- | --- |
| Invesco Liquid distribution | 1 | 6,098 | Close of 25 Feb 2011 | 25 Feb → 27 Feb 2011 | 100 / 0.1 |
| Invesco former Ultra Short Term distributions | 2 | 9,398 | Close of 25 Feb 2011 | 25 Feb → 28 Feb 2011 | 100 / 0.1 |
| Invesco April debt distributions | 30 | 110,979 | Close of 18 Apr 2013 | 18 Apr → 22 Apr 2013 | 100 / 0.5 |
| Nippon former Treasury/Liquidity distributions | 8 | 49,635 | 5 Aug 2012 | 3 Aug → 5 Aug 2012 | 100 / 0.1 |
| **Total** | **41** | **176,110** | | | |

These tolerances match established registrations for the same events. They are acceptance bounds around the documented factor, not replacement factors fitted to observed prices. Maximum observed absolute deviations from 100 are approximately **0.06786712** for February Invesco, **0.22161501** for April Invesco and **0.04931059** for Nippon. Ordinary interest and market movement remain in the calculation copy.

### Invesco primary identity chain

The [May 2026 issuer summary](https://nsearchives.nseindia.com/trading_security/mf/pdf/Invesco_20052026172310_IMF.pdf) binds named options to numeric codes and ISINs on PDF pages 38, 41, 43, 53, 61, 67 and 72. Issuer documents establish the applicable 2016, 2018 and January 2024 changes; original August 2026 notices establish the latest names. The January 2024 evidence is in issuer financial-statement footnotes. The historical old Ultra Short Term fund leads to today's **Ultra Short to Short Term Fund**; the historical Medium Term Bond fund leads to today's **Ultra Short Term Fund**. The ledger keeps these distinct.

The [May 2013 issuer factsheet](https://www.invescomutualfund.com/docs/default-source/Fact-Sheet/factsheet_may_2013.pdf?sfvrsn=0), PDF page 5, documents the April event; its plan-specific NAV tables supply dated identity anchors. The [October 2013 factsheet](https://www.invescomutualfund.com/docs/default-source/Fact-Sheet/factsheet_october_2013.pdf?sfvrsn=2502afc2_0), PDF page 5, retrospectively confirms the February 2011 event. It is not represented as the original February announcement.

Historical main/unheaded option blocks and legacy “Regular Plan” blocks are different identities. **104725** and excluded **104722** share the same May 2013 weekly NAV, so that value alone is insufficient. The additional March 2017 primary table, PDF page 6, distinguishes main weekly **1025.3116** from legacy Regular weekly **1129.1250** and matches their respective retained histories. The ledger retains this discriminator, historical headings and the daily-option cross-check.

Historical Invesco PDFs were readable through primary-site web text extraction, but fresh original binary requests returned HTTP 403. No access restriction was bypassed. Those historical original binaries were not freshly captured or visually reviewed; their original-file hashes remain null. Separately labeled extraction hashes identify the text captures. The fresh 2026 issuer PDF and original August 2026 rename-notice bytes were captured, hashed and visually reviewed. The source ledger preserves this retrieval distinction.

### Nippon primary identity chain

The [September 2012 issuer half-year financial statements](https://mf.nipponindiaim.com/InvestorServices/AnnualHalfYearlyReportsFY20122013/Half_Yearly_Portfolio_-_Financials_-_Oct-_2012_-_for_Website_upload.pdf), PDF page 34, separately document the change for all plans/options of the historical Treasury and Liquidity funds. Their plan-specific March and September NAV tables, official rename notices and the [March 2026 issuer summary](https://nsearchives.nseindia.com/trading_security/mf/pdf/Nippon_10032026151550_NipponMutualFund.pdf), PDF pages 106 and 120, bind the eight current identities.

For **103051**, the March 2012 issuer value is **NA**, and that observation is absent from the retained history. Approval uses the exact current weekly identity, explicit all-options action, actual 3–5 August boundary and named September weekly NAV **1000.8409**. It does not invent a March anchor or complete earlier coverage.

For **100853**, payout ISIN `INF204KC1FM8` belongs to a weekly payout option introduced on **30 June 2025**, supported by [issuer Addendum 29](https://mf.nipponindiaim.com/InvestorServices/Addenda/29-Introduction-of-new-plan-and-record-date-in-Liquid-Fund.pdf). The [24 December 2025 NCCL circular](https://www.nccl.co.in/public/api/getData/assets/circulars/Scheme_of_deposit_for_acceptance_of_Mutual_Fund_Units_as_Collateral_24_12_2025.pdf), PDF page 196, rows 48–49, ties code 100853 to this payout ISIN and reinvestment ISIN `INF204K01US8`. The March 2026 issuer summary establishes only the code/option/reinvestment part for this row. No claim is made that the payout option or ISIN existed in 2012, and no additional unit factor is applied for its 2025 introduction.

All six captured Nippon original PDF byte counts and hashes were independently checked, and the relevant original pages were visually reviewed.

## Registered current identities

The registry and evidence ledger use each exact complete archived name, numeric code, fund house and **both** ISIN fields, including required null values.

| Code | Current option | Retained observations | First new-basis NAV |
| --- | --- | ---: | --- |
| 100838 | Nippon India Liquid Fund - Regular Plan - RETAIL Plan - WEEKLY IDCW OPTION | 6,361 | 2012-08-05 |
| 100842 | Nippon India Liquid Fund - Regular Plan - RETAIL Plan - DAILY IDCW OPTION | 6,361 | 2012-08-05 |
| 100843 | Nippon India Liquid Fund - Regular Plan - RETAIL plan - MONTHLY IDCW OPTION | 6,361 | 2012-08-05 |
| 100844 | Nippon India Liquid Fund - Regular Plan - RETAIL Plan - QUARTERLY IDCW OPTION | 6,345 | 2012-08-05 |
| 100852 | Nippon India Liquid Fund - Regular Plan - DAILY IDCW OPTION | 6,361 | 2012-08-05 |
| 100853 | Nippon India Liquid Fund - Regular Plan - WEEKLY IDCW OPTION | 6,361 | 2012-08-05 |
| 103050 | Nippon India Money Market Fund - Regular Plan - DAILY IDCW Option | 5,787 | 2012-08-05 |
| 103051 | Nippon India Money Market Fund - Regular Plan - WEEKLY IDCW Option | 5,698 | 2012-08-05 |
| 104484 | Invesco India Liquid Fund - Regular Plan - Daily IDCW | 6,098 | 2011-02-27 |
| 104725 | Invesco India Ultra Short to Short Term Fund - Regular Plan - Weekly IDCW | 4,658 | 2011-02-28 |
| 105025 | Invesco India Ultra Short to Short Term Fund - Regular Plan - Daily IDCW | 4,740 | 2011-02-28 |
| 105190 | Invesco India Short Term Fund - Regular Plan - Weekly IDCW | 4,728 | 2013-04-22 |
| 105191 | Invesco India Short Term Fund - Regular Plan - Monthly IDCW | 4,728 | 2013-04-22 |
| 106171 | Invesco India Corporate Bond Fund - Regular Plan - Monthly IDCW | 4,640 | 2013-04-22 |
| 106172 | Invesco India Corporate Bond Fund - Regular Plan - Quarterly IDCW | 4,640 | 2013-04-22 |
| 106179 | Invesco India Corporate Bond Fund - Regular Plan - Annual IDCW | 4,282 | 2013-04-22 |
| 107471 | Invesco India Gilt Fund - Regular Plan - Monthly IDCW | 4,510 | 2013-04-22 |
| 107472 | Invesco India Gilt Fund - Regular Plan - Quarterly IDCW | 4,510 | 2013-04-22 |
| 107476 | Invesco India Gilt Fund - Regular Plan - Annual IDCW | 4,371 | 2013-04-22 |
| 112125 | Invesco India Money Market Fund - Regular Plan - Monthly IDCW | 4,143 | 2013-04-22 |
| 114360 | Invesco India Ultra Short Term Fund - Regular Plan - Quarterly IDCW | 3,818 | 2013-04-22 |
| 114361 | Invesco India Ultra Short Term Fund - Regular Plan - Annual IDCW | 3,818 | 2013-04-22 |
| 114362 | Invesco India Ultra Short Term Fund - Regular Plan - Monthly IDCW | 3,818 | 2013-04-22 |
| 115515 | Invesco India Money Market Fund - Regular Plan - Daily IDCW | 3,701 | 2013-04-22 |
| 116110 | Invesco India Short Term Fund - Regular Plan - Discretionary IDCW | 2,446 | 2013-04-22 |
| 117973 | Invesco India Short Term Fund - Regular Plan - Daily IDCW | 3,395 | 2013-04-22 |
| 120496 | Invesco India Corporate Bond Fund - Direct Plan - Monthly IDCW | 3,338 | 2013-04-22 |
| 120499 | Invesco India Corporate Bond Fund - Direct Plan - Discretionary IDCW | 3,115 | 2013-04-22 |
| 120501 | Invesco India Corporate Bond Fund - Direct Plan - Quarterly IDCW | 3,338 | 2013-04-22 |
| 120506 | Invesco India Money Market Fund - Direct Plan - Daily IDCW | 3,338 | 2013-04-22 |
| 120508 | Invesco India Money Market Fund - Direct Plan - Discretionary IDCW | 3,338 | 2013-04-22 |
| 120509 | Invesco India Money Market Fund - Direct Plan - Monthly IDCW | 3,338 | 2013-04-22 |
| 120519 | Invesco India Gilt Fund - Direct Plan - Annual IDCW | 3,134 | 2013-04-22 |
| 120521 | Invesco India Gilt Fund - Direct Plan - Monthly IDCW | 3,338 | 2013-04-22 |
| 120522 | Invesco India Gilt Fund - Direct Plan - Quarterly IDCW | 3,126 | 2013-04-22 |
| 120542 | Invesco India Ultra Short Term Fund - Direct Plan - Monthly IDCW | 3,338 | 2013-04-22 |
| 120543 | Invesco India Ultra Short Term Fund - Direct Plan - Annual IDCW | 3,338 | 2013-04-22 |
| 120544 | Invesco India Ultra Short Term Fund - Direct Plan - Quarterly IDCW | 3,338 | 2013-04-22 |
| 120559 | Invesco India Short Term Fund - Direct Plan - Daily IDCW | 3,338 | 2013-04-22 |
| 120562 | Invesco India Short Term Fund - Direct Plan - Weekly IDCW | 3,338 | 2013-04-22 |
| 120563 | Invesco India Short Term Fund - Direct Plan - Discretionary IDCW | 3,338 | 2013-04-22 |

## Preserved material coverage gaps

Six approved histories have gaps longer than 30 calendar days. None spans the verified unit boundary. The replay preserves all dates and observation counts and lists all such gaps, not only the largest gap in each history.

| Code | Retained material gap(s) |
| --- | --- |
| 103051 | 15 Jan → 4 May 2012: **110 days**; March issuer NAV is NA |
| 104725 | 24 Apr → 8 Oct 2012: **167 days** |
| 116110 | 31 Dec 2015 → 7 Oct 2016: **281 days**; 7 Oct 2016 → 23 Aug 2017: **320 days**; 29 Aug 2017 → 19 Sep 2018: **386 days**; 19 Sep 2018 → 26 Nov 2019: **433 days** |
| 120499 | 21 Mar 2017 → 21 Feb 2018: **337 days** |
| 120519 | 25 Jun 2018 → 3 May 2019: **312 days** |
| 120522 | 26 Jul 2018 → 18 Jun 2019: **327 days** |

## Unsupported screened histories

The **19 Invesco exclusions** retain **76,164 observations and 24 large moves**. Reasons include missing exact current identity bridges for legacy options; absent event-boundary observations; separate unexplained moves; and isolated low NAVs followed by reversals. Examples include 104485's 597-day gap across the 2011 event, 104722's distinct legacy identity, 116653's approximately 151.45 ratio across a long gap, and extra unexplained moves in 116109, 120500 and 120561. No partial adjustment is made when another unresolved event remains.

The **29 Nippon exclusions** retain **110,711 observations and 42 large moves**. Code 103052 lacks the required boundary across a 251-day gap, and its observed ratio of about 99.8253 lies outside the established 0.1 tolerance. Codes 112340 and 112341 have 855-day gaps across the 2012 action; 112340 also retains a separate 55.47% drop. Another 26 options have unexplained April 2026 movements. Their values are not flattened into a guessed unit event.

The ledger records every excluded code, full identity, reason, raw warnings, observed moves and point count. Regression tests prevent each excluded identity from borrowing a valid sibling event. The full production replay confirms that all 48 original histories remain unchanged and quality-blocked.

## Implementation and verification

Only `src/lib/corporate-actions.ts` changes production behavior, with three exact identity groups and 84 added lines. Existing whole-series, warning, ratio, date and repeat-adjustment guards remain in force. The collector, source requests, workflows, pacing, retries, resource limits, website discovery window and consumer Growth gate are unchanged.

Literal fixtures were written before production changes, using two retained points on each side of every event and independent Python Decimal expectations. Against the unchanged registry, the focused run had **199 tests: 113 passed and 86 expected assertion failures**. After registration, all **199 passed**. Coverage includes all positive identities; altered codes, names, houses and both ISIN fields; missing/wrong boundaries; out-of-bound factors with the entire post-event segment moved consistently; accurate and stale additional-event warnings; independent invalid/conflicting warnings; preserved nonquality warnings; immutable inputs; and refusal to adjust twice. Consumer tests use usable one-, three- and five-year observations and a positive Growth control, so missing coverage cannot explain IDCW ranking exclusions.

The complete proper isolated suite passes **2,061 tests with zero failures or skips**. Typecheck and both Worker and Pages builds pass. Full production replay, evidence consistency and independent code review are recorded below before publication.

**Final production replay:** all 89 histories and 362,985 points passed. The 41 approved copies contain 176,110 points, with 33,168 pre-event points checked against independent decimal-string arithmetic. Maximum absolute error was `2.2737367544323206e-13`, below `1e-9`. Every post-event value is exactly unchanged. The raw large-move count is 107; the 66 remaining moves all belong to the 48 unchanged exclusions. All 89 raw unresolved flags remain preserved, and all local/archive consumer return results remain null. All 48 archive assets and 15 production source files were re-read with unchanged hashes.

Actual-runtime eligibility was independently evaluated at `2026-10-30T23:40:19.372Z`: **89/89 eligible**. A separate pre-publication assertion at `2026-10-30T23:40:56.856Z` also passed. Independent reproduction at `2026-10-30T23:41:59.813Z` confirmed the complete result and 89/89 actual eligibility. Primary-source and code/test reviews found no remaining substantive blocker. The review independently matched all 164 literal boundary observations, their Decimal expectations and every current identity. This report does not claim a deployed change; pull-request and deployment results are reported after actual verification.

## Previous collector successor: verified checkpoint 258

This follow-up belongs to **PR 82's already merged commit**, independently of the 41 new registrations. [Successor run 41142515461](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/41142515461) completed successfully. Its ancestry log showed root 41141818678 with matching expected/observed title, attempt 1, push event, completed status and success conclusion. It waited until `2026-10-30T23:19:15.628Z` under the existing pacing rule before collection.

**Checkpoint 258** was created at `2026-10-30T23:21:29.294Z` and archive-verified at `2026-10-30T23:21:34.1993206Z`. Of 135 attempts, 126 were saved, eight retained quality issues and one failed with `source_transport` for code 120822. There were no first attempts or new history additions. In the same 8,542-scheme active cohort, refresh/reconciliation pending fell **3,367 → 3,241**, a reduction of **126**. Raw quality flags stayed at **603** and active source gaps rose **79 → 80**. These buckets overlap; saved history does not prove complete coverage.

The Pages deployment succeeded, and continuation verified that exact public checkpoint at `2026-10-30T23:25:34.7878744Z` before dispatching [run 41144397944](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/41144397944), position 3 of the existing bounded chain. The linked evidence is a historical snapshot whose next-run metadata was last updated at `2026-10-30T23:25:41Z`; the original capture did not record its retrieval timestamp. It makes no claim about later child status. No manual dispatch, rerun, shortened pacing, enlarged budget or collector behavior change was needed.

This accepted ancestor observation and successful continuation **do not establish the cause** of the earlier unlogged `backfill_root_invalid` failure. The diagnostics provide evidence for this successful run; the earlier cause remains unproven.
