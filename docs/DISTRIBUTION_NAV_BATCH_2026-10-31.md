# Verified distribution NAV review: Birla, HDFC, SBI and ICICI

**Review date:** 31 October 2026 UTC, beginning on 30 October in Toronto. **Development base:** `1ae8021083b4c3e3c6df6a61c500d13fafb6c4a8` (merged and deployed PR 83). **Data snapshot:** checkpoint 268, created at `2026-10-31T02:05:36.558Z`.

## Result and boundaries

The screened cohort contains **56 distribution histories and 260,007 retained observations**. This batch adds **34 exact unit registrations and two exact single-date source corrections**, covering **36 histories and 175,714 observations**. The other **20 histories, with 84,293 observations**, remain excluded. Independent primary-source review, regression verification, the full production replay and independent implementation review support these bounded changes.

| House | Histories reviewed | Retained observations | Unit registrations | Source corrections | Excluded histories |
| --- | ---: | ---: | ---: | ---: | ---: |
| Aditya Birla Sun Life | 17 | 74,221 | 15 | 2 | 0 |
| HDFC | 12 | 60,588 | 10 | 0 | 2 |
| SBI | 11 | 59,411 | 9 | 0 | 2 |
| ICICI Prudential | 16 | 65,787 | 0 | 0 | 16 |
| **Total** | **56** | **260,007** | **34** | **2** | **20** |

The unit histories contain **167,658 observations**, including **43,428** before their documented denomination changes. Only those older values are multiplied in calculation copies. The two International Equity histories contain **8,056 observations**; their corrections replace exactly one calculation NAV each, with no unit factor. The raw cohort has **59** moves exceeding the existing 40% screen. The changes remove 38 such transitions in supported calculation copies, leaving **21** transitions in the unchanged exclusions.

**Raw archive flags cleared: zero. Consumer return eligibility added: zero.** Raw NAV values, dates, observation counts, metadata, warnings and unresolved flags remain intact. Distribution cashflows and missing observations are not reconstructed. These IDCW options remain outside the existing literal Growth-only consumer calculations. A consistent NAV denomination does not establish total return or complete source coverage.

## Evidence, scope and reproduction

- [Combined source, identity and exclusion ledger](evidence/2026-10-31-distribution-nav-sources.json) records the exact numeric code, full stored name, fund house and both stored ISIN fields for every target. It separates primary original documents, indexed extracts, corroborating material and failed retrievals.
- [Portable production replay](evidence/2026-10-31-distribution-nav-replay.mjs) verifies immutable archive assets and production source files, then runs the production validators, active-scope predicate, normalization, quality checks and consumer functions across all 56 complete retained histories.
- [Replay results](evidence/2026-10-31-distribution-nav-replay.json) record every history, observation count, retained calendar gap, raw warning and calculation outcome.
- [Collector checkpoint evidence](evidence/2026-10-31-collector-checkpoint-268.json) records collection, publication and UTC date-rollover accounting separately from this code change.

The checkpoint manifest SHA-256 is `d91fddfc92fb514d1e7b5050ccc9b5aca9a4b05fac0af7b9652e9ecd68da1190`. The capture verifies **31 assets**: one catalogue and 30 selected history shards, totalling **8,979,863 compressed bytes**. Compressed hashes, compressed and expanded sizes, and production schemas are checked before history analysis. Research uses the saved archive and public issuer/exchange documents; it makes no new MFAPI or automated AMFI requests.

At the actual scope check, `2026-10-31T02:11:39.297Z`, **all 56 histories qualify** under the production repair predicate: exact official open-ended roster membership, independently verified current `/mf` catalogue membership, and a finite positive NAV on a real, nonfuture date no more than 30 UTC calendar days old. The catalogue was fetched and independently list-verified at `2026-10-30T19:58:19.963Z`, with 38,026 list members and no bulk rows missing from that verification. The official roster is dated 26 October 2026. The 30-day rule selects histories; all retained observations are reviewed.

Historical eligibility at this captured scope time and eligibility at the replay's actual execution time are reported separately. A later reproduction must not pretend an old captured NAV is current. The website's separate seven-day discovery rule is unchanged, and recent NAV reporting does not establish purchase availability.

## Documented unit events

| Exact cohort | Codes | Legal effective date | Retained old → new NAV boundary | Factor | Existing absolute factor-deviation limit |
| --- | --- | --- | --- | ---: | ---: |
| Birla Cash Plus / current Liquid, two Regular IDCW options | 100046, 100051 | 7 Oct 2011 | 6 → 7 Oct 2011 | 10 | 0.05 |
| Birla Savings, Floating Rate Short Term, Cash Manager and Ultra Short Term, nine exact options | 101973, 101974, 103193, 105887, 105888, 108272, 108274, 110282, 113307 | 7 Oct 2011 | 6 → 7 Oct for 101973/101974; 5 → 7 Oct for the others | 10 | 0.01 |
| Birla Overnight, four exact Regular/Direct IDCW options | 145483, 145485, 145487, 145489 | 4 Nov 2018 | 2 → 4 Nov 2018 | 100 | 0.1 |
| HDFC Liquid, Cash Management Savings / current Money Market, and Call / current Overnight | 100874, 100875, 100876, 101994, 101997, 119088, 119089, 119090, 119093, 119109 | 30 Aug 2015 | 28 → 30 Aug 2015 | 100 | 0.1 |
| SBI InstaCash, Premier Liquid, Short Horizon Ultra Short Term and Liquid Floater | 103884, 105080, 105275, 105281, 106213, 106214, 106216, 106221, 114297 | 13 Jan 2012 | 12 → 13 Jan 2012 | 100 | 0.1 |

### Birla identity and source limits

The original issuer October 2014 Empower factsheet retrospectively documents the October 2011 face-value change from ₹10 to ₹100. Its plan-specific NAV tables, current issuer scheme-summary numeric codes, original rename notices and supplementary clearing-corporation ISIN rows establish the exact continuing options. The ledger identifies the particular document and page supporting each field; it does not attribute a second ISIN to an issuer summary that omits it. Shared NAV values alone do not distinguish Daily Regular and Direct options.

The original Addendum 25/2018 establishes the Overnight change from ₹10 to ₹1,000. Each of the four retained Overnight histories has **only one pre-event observation**, dated 2 November 2018. The public issuer selector and exact historical exports establish the plan-specific 4–5 November values; the exports do not contain 2 November. That sole older observation remains archive evidence, with no invented second point or claim of an issuer-confirmed 2 November NAV. The issuer branding, Addendum 25/2018 heading, factor, effective date and unit/NAV/value-preservation terms are legible; the lower portion of the page, including the notice's closing area, is damaged in the rendering.

### HDFC identity and source limits

The original 14 August 2015 issuer addendum covers all Regular and Direct options of Liquid and Cash Management Savings/Call, effective 30 August. It separately describes new ISIN availability from 1 September after the dematerialization pause. Current issuer scheme-summary code/option bindings and rename evidence connect the exact retained histories.

Code **119088** retains two literal null ISIN fields. The original issuer summary explicitly binds its numeric code to the Direct Weekly option. Nulls are strict metadata values in the implementation, not wildcards; omission from a document is not presented as proof that an ISIN does not exist. Two other HDFC rows exceed the established factor-deviation guard and remain excluded despite the documented event.

### SBI identity and source limits

The original March 2012 half-year report documents the ₹10 to ₹1,000 action, effective 13 January 2012, and its plan coverage. Historical identities are tied through exact option NAV anchors, issuer code/ISIN tables and rename notices. In particular, the March 2024 issuer summary binds **105275** to Institutional Daily IDCW / `INF200K01LR7` and **105281** to Regular Daily IDCW / `INF200K01LX5`.

The Short Horizon table in the March 2012 report is dated **31 March 2012**. Retained **30 March** observations differ and are not claimed as exact matches. Both the 30 September 2011 and 31 March 2012 report-date NAVs are absent from the selected histories. The accepted identity chain instead uses the September 2011 report's **31 March 2011** option anchors and the September 2022 factsheet's **30 September 2022** anchors. The March 2012 report remains evidence for the legal event terms. Code 106222 stays excluded because the second non-null retained ISIN has no verified primary binding.

## Two exact International Equity source corrections

| Code and plan | Issuer selector ID | Date | Raw NAV preserved | Verified calculation NAV | Exact 9 Apr anchor | Exact 11 Apr anchor |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| 106872 — Regular IDCW | 297D | 10 Apr 2019 | 50.35620 | 15.4144 | 15.50220 | 15.38090 |
| 119516 — Direct IDCW | 297DZ | 10 Apr 2019 | 70.58460 | 21.6065 | 21.72940 | 21.55980 |

The issuer's public historical-NAV selector explicitly lists IDs **297D** and **297DZ** for these IDCW plans. The exact 9–11 April exports agree with both retained neighbors and give the replacement middle values above. Current issuer and NCCL code/option/ISIN evidence binds the stored identities. The CSV's Scheme Name column may echo the query label; the query text is not identity evidence. The explicit selector, original response bytes and matching neighboring observations provide that link.

The existing source-review mechanism requires the exact source, complete metadata, both stored ISINs, anomaly date and value, consecutive 9/11 April anchors, and exactly the two spike transitions. It changes only 10 April in a calculation copy and rejects other unexplained moves or independent invalid/conflicting warnings. This is a source correction: `review.correction` is present and the unit-adjustment flag remains false.

Separately identified reinvestment IDs returned **header-only exports** for this date range. Those responses provide no NAV evidence and are recorded as such. No reinvestment values or sibling Growth values are substituted. The original raw values and warning flags stay visible in source records, charts and CSV exports.

## Twenty exclusions retained

| Codes | Histories | Observations | Reason no adjustment is registered |
| --- | ---: | ---: | --- |
| HDFC 101995, 119094 | 2 | 9,406 | The documented factor is 100, but absolute observed deviations are about 0.1024445718 and 0.1052601900, exceeding the unchanged 0.1 event guard. No fitted factor or widened tolerance. |
| SBI 106095 | 1 | 4,439 | A 71.3333% rise spans the 463-day gap from 2 Apr 2009 to 9 Jul 2010. No supported unit event or exact missing-history restoration for this IDCW identity. |
| SBI 106222 | 1 | 4,661 | The issuer binds code/ISIN `INF200K01MK0`; the other retained non-null ISIN, `INF200K01MJ2`, lacks a verified primary binding. |
| ICICI 101617, 101618, 101804, 103342, 103343, 103634, 103635, 111545 | 8 | 43,164 | November 2009 debt histories lack the required dated primary conversion terms and complete historical option identity chain. |
| ICICI 102134, 102136 | 2 | 10,112 | January 2008 FOF anomalies lack exact replacement NAV evidence or a documented economic explanation. |
| ICICI 145537, 145538, 145539, 145547 | 4 | 9,519 | Overnight unit terms are documented, but the retained and issuer-indexed ISIN sets lack an explicit verified bridge. |
| ICICI 149408, 149411 | 2 | 2,992 | Unclaimed Overnight identities have current NCCL bindings, but lack the historical 2022 NAV anchor and Stable/Transitory-to-notice-name bridge. No contrary ISIN was observed for these two rows themselves. |
| **Total** | **20** | **84,293** | **All original values and unresolved warnings remain.** |

ICICI notice 011/07/2022, dated 28 July, documents a ₹100 to ₹1,000 Overnight change effective 16 August; the retained NAV boundary is 16–17 August. The asterisk in the notice limits minimum-subscription text, not face-value plan coverage. This legal event evidence does not resolve identity contradictions.

| Ordinary ICICI Overnight code | Stored `isinGrowth` | Stored `isinDivReinvestment` | Contrary issuer-summary indexed ISIN |
| --- | --- | --- | --- |
| 145537 | null | INF109KC12G9 | INF109KC1OP9 |
| 145538 | INF109KC12F1 | INF109KC11F3 | INF109KC1OE3 |
| 145539 | INF109KC16G0 | INF109KC15G2 | INF109KC1OS3 |
| 145547 | null | INF109KC18E1 | INF109KC1OB9 |

The issuer-summary original returned HTTP 403; its search-indexed excerpt is explicitly weaker evidence than retained original bytes. The December 2025 NCCL original binds 15 of the 16 ICICI numeric codes; 145539 and both of its stored ISINs are absent. A separate unbranded 2019 spreadsheet-derived PDF hosted on an exchange-announcement mirror already contains alternate ISINs. Its institutional authorship is unverified, so it is corroboration only, not an issuer NAV statement or proof of a 2022 ISIN conversion. No set is labelled current, retired or newly issued on that evidence alone.

The FOF anomalies also differ: 102134 falls from 28.9649 to 17.7769 on 2 January 2008, below the 40% loss threshold, then rebounds to 29.0558 above the gain threshold. Code 102136 moves 37.1037 → 19.2933 → 37.1764, crossing both thresholds. Full retained-series review preserves the distinction. A hypothetical factor that makes a curve smoother is not approval evidence.

## Preserved history gaps

All calendar gaps are retained and recorded by the replay. The five gaps longer than 30 days are:

| Code | Status | Last observation before gap | First observation after gap | Calendar days |
| --- | --- | --- | --- | ---: |
| 100874 | Supported unit copy | 1 May 2006 | 4 Jun 2006 | 34 |
| 145489 | Supported unit copy | 1 Aug 2022 | 29 Dec 2022 | 150 |
| 106095 | Excluded | 2 Apr 2009 | 9 Jul 2010 | 463 |
| 111545 | Excluded | 11 Jul 2011 | 29 Mar 2012 | 262 |
| 145539 | Excluded | 27 Aug 2019 | 2 Oct 2019 | 36 |

Both supported gaps lie wholly on one side of their unit boundary. Their presence still prevents any claim of complete source coverage. Shorter gaps are preserved too, including 101974's 18/17/15/9-day intervals, a 14-day interval for 100874, and the **10-day** 29 December 2019 to 8 January 2020 interval for 145539.

## Implementation and verification

The implementation extends only the existing exact-identity unit registry and bounded issuer-NAV source-review table. Every new unit identity requires the exact numeric code, complete case-normalized name, fund house and both stored ISIN fields, including strict nulls. Existing event dates, tolerances, raw-source preservation and additional-warning blockers remain in force. Existing Growth source-review behavior is preserved.

Literal regression fixtures come from checkpoint 268. Independent Python Decimal arithmetic supplies expected adjusted NAVs and boundary returns; the tests do not derive expected answers from the production registry. Four Overnight fixtures preserve their sole older observation. Negative cases cover mismatched or omitted identities, wrong dates, wrong factors, additional events, independent invalid/conflicting warnings and repeat application. Source-correction cases additionally require exact source/category metadata, the anomalous middle value and both consecutive anchors. Consumer tests use sufficient date coverage and usable Growth controls so missing coverage cannot explain IDCW exclusion.

**Test-first verification:** before production edits, all 355 new tests ran: 242 passed and 113 failed for the expected missing registrations/corrections, with no unexpected failures, skips or cancellations. The initial sandbox-worker attempt produced file-level runner errors and was not counted as behavioral RED. After the implementation, the focused new and related existing suites passed **570/570**. The complete proper isolated `pnpm test` suite passed **2,416/2,416**, with zero failures, skips or cancellations. Typecheck, the retained Worker build and the standalone Pages build all passed.

**Full production replay:** all 56 histories and 260,007 observations passed. The replay independently checked 43,428 scaled unit NAVs, exactly two source replacements and **216,577 unchanged calculation NAVs**. Maximum absolute error against independent decimal-string arithmetic was `2.2737367544323206e-13`, below `1e-9`. All post-event unit NAVs and all source-correction NAVs outside 10 April 2019 are exactly unchanged. The 21 remaining large transitions belong only to the 20 unchanged exclusions. All 56 raw unresolved flags, raw warnings and source documents remain preserved. Repeat application is refused for all 34 unit copies and both source corrections; all local/archive IDCW consumer results remain null.

All **49,843 retained calendar intervals longer than one day** are recorded unchanged, including weekends and holidays; an interval alone does not establish an expected missing publication. All 31 archive assets and 15 production files were re-read with unchanged hashes. Actual-runtime scope was evaluated independently at `2026-10-31T02:38:24.712Z`: **56/56 eligible**.

Independent code/test review found no blocking defect. It matched all 34 production unit tuples, all 56 literal fixture identities, **227 source observations and 23 gap-probe observations**, and their independent Decimal NAV/return expectations against checkpoint 268 and the frozen source evidence. The reviewer ran the 355 new cases successfully and independently reproduced the final compact replay at `2026-10-31T02:38:57.175Z`, again finding 56/56 currently eligible. Its parsed result differs only in the three execution timestamps. The report's source limitations and exclusion reasons were reviewed as well. Deployment is a separate result and will be reported only after actual remote verification.

## Separately verified collector checkpoint 268

[Collector run 41157410336](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/41157410336), position 9 of root 41145945778, completed successfully. It created checkpoint 268 at `2026-10-31T02:05:36.558Z`, verified the archive at `02:05:41.6340911Z`, and verified the exact published checkpoint at `02:08:39.0574199Z`. The archive, Pages build, Pages deployment and continuation jobs all succeeded.

The tranche made **74 attempts: 73 saved and one failed**. There were no first attempts or new history additions. Within the same **8,524-scheme** active cohort, refresh/reconciliation pending fell **2,600 → 2,527**, a reduction of 73. Saved histories stayed at 8,524, clean histories at 7,921 and raw quality flags at 603; active source gaps rose **86 → 87**. These categories overlap and must not be added together.

The UTC date rollover is separate from that tranche. Re-evaluating the same catalogue on 30 versus 31 October changes eligible membership **8,542 → 8,524**: **20** histories with 30 September NAVs age from 30 to 31 days, while **two** with 31 October NAVs become nonfuture and enter. The net change is minus 18, not 18 aged-out histories. The evidence records all affected codes. No history is deleted and no scheme-closure or purchase-eligibility inference is made.

Continuation dispatched [child 41158630893](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/41158630893), position 10, at `02:08:40.2820026Z`. It was observed in progress in this capture; this historical snapshot does not claim its later outcome. No manual dispatch, workflow change, enlarged budget or altered pacing was needed. The earlier unlogged ancestry failure remains unexplained; successful later ancestry checks do not prove its cause.
