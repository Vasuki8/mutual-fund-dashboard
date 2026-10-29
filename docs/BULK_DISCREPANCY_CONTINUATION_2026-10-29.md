# Bulk discrepancy continuation — 29 October 2026 UTC

This continuation adds seven independently supported calculation-copy unit adjustments to the PR72 baseline: six Growth histories and one ETF history. It investigates all 114 Growth histories that remained consumer-blocked after PR72 and records a disposition for each. This is a completed evidence pass over that priority queue; it does not claim that the source archive has no unresolved defects.

The baseline is `b024a9b48f722a3d24f9592ec71ce6d79bbcbdf2`, public archive checkpoint 213. The actual UTC reference date is 29 October 2026. The owner's local date was still 28 October in America/Toronto during this work.

## Result of the complete saved-history comparison

| Measure | Before continuation | After continuation |
| --- | ---: | ---: |
| Strictly eligible saved histories | 8,524 | 8,524 |
| Eligible saved observations | 17,268,530 | 17,268,530 |
| Raw source-unresolved histories | 610 | 610 |
| Histories with independently explained unit changes | 115 | **122** |
| Unexplained jump histories | 311 | **304** |
| Growth histories still consumer-blocked | 114 | **108** |
| Clean single-jump Growth cases still blocked | 26 | **20** |
| Clean multiple-jump Growth cases still blocked | 11 | 11 |
| Growth histories with independent invalid-source warnings | 77 | 77 |
| Unexplained Growth jump histories, including six with invalid-source warnings | 43 | **37** |
| Unexplained ETF jump histories | 5 | **4** |
| Consumer-eligible histories within the raw unresolved queue | 75 | **81** |

The mutually exclusive remaining Growth categories are 77 invalid-source cases, 20 clean single-jump cases and 11 clean multiple-jump cases: 108 in total. Six of the 77 invalid-source cases also have jumps and are not counted twice. Outside the Growth queue, policy blocks and source-data defects remain separate reasons for withholding analytics.

All 28,737 saved observations across the seven selected histories were checked. Each selected history has one raw jump and no remaining movement exceeding the existing 40% threshold after applying its fixed, documented unit factor. All 603 unselected histories return exactly the same complete result under both implementations, by deep and serialized comparison. Consumer eligibility has zero regressions.

The audit re-evaluated the strict active-repair predicate over all 37,998 saved catalogue rows using the actual UTC date, confirming the same 8,524 eligible codes. It verified all 610 unresolved fixture hashes, all 237 referenced compressed history shards, and the unchanged returns asset. No missing eligible saved history was found. These are saved-history coverage statements, not claims of complete upstream history.

## Seven supported identities

| Code | Exact saved identity | Factor applied to earlier NAVs | Last old / first new saved NAV dates | Consumer effect |
| --- | --- | ---: | --- | --- |
| 100814 | UTI Overnight, Regular Growth — `INF789F01604` | 100 | 2 / 3 May 2018 | Growth analytics eligible |
| 120785 | UTI Overnight, Direct Growth — `INF789FB1S71` | 100 | 2 / 3 May 2018 | Growth analytics eligible |
| 104728 | Invesco Ultra Short to Short Term, legacy Regular Growth — `INF205K01HT0` | 100 | 25 / 28 February 2011 | Growth analytics eligible |
| 105189 | Invesco Short Term, legacy Plan B Growth — `INF205K01UR7` | 100 | 18 / 22 April 2013 | Growth analytics eligible |
| 112120 | Invesco Money Market, legacy Regular Growth — `INF205K01SG4` | 100 | 18 / 22 April 2013 | Growth analytics eligible |
| 106212 | SBI Ultra Short to Short Term, Regular Growth — `INF200K01MO2` | 100 | 12 / 13 January 2012 | Growth analytics eligible |
| 150455 | ICICI Prudential Nifty 200 Momentum 30 ETF — `INF109KC17C7` | 0.1 | 10 / 12 August 2022 | Unit event explained; existing literal Growth policy remains |

All entries require the complete numeric code, exact archive name, fund house and ISIN. Scheme labels in this table are shortened for readability; the evidence inventory and registry preserve exact identities. Ordinary market or interest returns across the events remain present. The Momentum ETF retains its approximately 1.3142% residual return across its event; the factor is not fitted to erase that return.

### UTI Overnight

The original [UTI Addendum 09/2018–19](https://doc.utimf.com/v1/AUTH_5b9dd00b-8132-4a21-a800-711111810cee/UTIContainer/09-18-19%20-%20%20Change%20in%20face%20value%20of%20units20180502-115257.pdf), published 2 May 2018, establishes face value Rs10 to Rs1,000 effective 3 May and explicitly renames G-Sec Fund STP to Overnight. The issuer's Overnight scheme summary in the [13 September 2023 NSE-hosted archive](https://nsearchives.nseindia.com/web/sites/default/files/inline-files/UTIAMC_13092023.zip), page 1, fields 28/29, binds both exact codes and ISINs. The original notice SHA256 is `b70bcb4b2449adc519a5304de8247eec39664d3f2bc068f815fb27cfefd94313`; the exact scheme-summary member hash is in the inventory.

### Three Invesco legacy plans

New primary CDSL records independently identify [HT0](https://www.cdslindia.com/Investors/popup-isin.aspx?isin_code=INF205K01HT0) as Low Duration Regular Growth, [UR7](https://www.cdslindia.com/Investors/popup-isin.aspx?isin_code=INF205K01UR7) as Short Duration Plan B Growth, and [SG4](https://www.cdslindia.com/Investors/popup-isin.aspx?isin_code=INF205K01SG4) as Money Market Regular Growth. This distinguishes the legacy plans from other codes sharing the archive's current display names.

The issuer's [FY2016–17 annual report](https://invescomutualfund.com/docs/default-source/default-document-library/annual-report-fy-2016-2017.pdf?sfvrsn=0), PDF pages 92 and 100, documents the fixed face-value changes and close-of-business dates. Page 112 gives exact plan NAVs on 31 March 2016 and 2017. Those eight total anchors, including the two additional 31 May 2013 anchors in the [May 2013 factsheet](https://www.invescomutualfund.com/docs/default-source/Fact-Sheet/factsheet_may_2013.pdf?sfvrsn=0), pages 26/27, match the corresponding immutable saved series exactly.

The [2018 recategorization addendum](https://invescomutualfund.com/docs/default-source/default-document-library/44---change-in-fundamental-attributes---mar-21-18.pdf?sfvrsn=0), pages 3/12/27, establishes Credit Opportunities to Money Market and old Ultra Short Term to Treasury Advantage from 27 April 2018. The [FY2024–25 annual report](https://www.invescomutualfund.com/docs/default-source/financial-pdf/invesco-mutual-fund-annual-report-fy-2024-254ecaf807eee8616aaa28ff00007d74af.pdf?sfvrsn=592299c2_0), page 141, establishes Treasury Advantage to Low Duration and Short Term to Short Duration from 31 January 2024. The similarly named former Medium Term Bond family is distinct.

Qualification: the numeric-code/ISIN association for these three discontinued legacy options remains archived metadata. No independent primary numeric-code row was located. Their exact CDSL ISIN/plan identities, distinct dated issuer NAV anchors and historical rename chains together support the case-specific identity judgment. This is not a generic rule allowing similar names or a near-100 ratio to prove identity. The latest legal effective date of code 104728's current archive display-name change is not claimed.

### SBI 106212

The [March 2012 half-yearly report](https://www.sbimf.com/docs/default-source/scheme-portfolios/default-library/unaudited-half-yearly-results-%28as-on-march-31-2012%29.pdf?sfvrsn=24795812_0), PDF page 3, marks the entire Short Horizon Ultra Short Term column with the face-value footnote. Page 9, note 22, specifies Rs10 to Rs1,000 effective 13 January 2012. It applies across the scheme's plans and options.

The newly recovered [2013–14 audited scheme report](https://www.sbimf.com/docs/default-source/lists/schemeannualreports/scheme-annual-report-2013-14.pdf?sfvrsn=9f121e9b_0), PDF page 425 / printed 421, explicitly identifies Ultra Short Term Debt as formerly Short Horizon. The [September 2018 half-yearly report](https://www.sbimf.com/docs/default-source/scheme-portfolios/default-library/half-yearly-unaudited-financial-results-for-the-year-ended-30th-september-2018.pdf?sfvrsn=e3e01e8a_0), PDF page 26, supplies the later Magnum Low Duration rename. Issuer scheme-summary, NCCL and CDSL records establish the exact current code and ISIN.

The registration therefore describes a scheme-wide consolidation. It does not assert an independently verified Retail-to-Regular option rename. Published September/March report-end NAVs are not substituted for adjacent saved dates; no nonexistent exact NAV-date match is claimed.

### ICICI Momentum ETF 150455

[NSE/CML53266](https://archives.nseindia.com/content/circulars/CML53266.pdf), dated 11 August 2022, explains that the original allotment used the wrong index divisor. It documents the price correction and additional units. The original exchange action records nine additional units for each existing unit, ex-date 12 August and record date 17 August. The [issuer scheme summary](https://nsearchives.nseindia.com/trading_security/mf/pdf/ICICI_06112025113009_ICICIPrudentialNifty200Momentum30ETF.pdf), page 1, fields 28/29, binds code 150455 and ISIN `INF109KC17C7`.

Ten resulting units imply a 0.1 historical NAV factor. This is an allotment-price rectification, not a face-value split. The existing literal Growth eligibility rule still applies.

## What the remaining research established

All 77 invalid-warning Growth histories retain sanitized valid observations. Their warning counts sum to 732 historical rejected observations; the original rejected dates, values and row shapes were not persisted. Re-validating these sanitized payloads cannot resolve the original warning. No parser defect was demonstrated, and no such warning is cleared.

BOI Credit Risk codes 133867/133868 have primary-supported economic markdown and recovery events, plus a concrete saved-source conflict. The issuer's daily NAV service, March 2022 factsheet and audited 2021–22 report independently agree on NAVs **10.2756 / 10.4219** for 31 March 2022; saved values are **9.62960 / 9.76670**. The issuer also confirms preceding and subsequent dates. These are documented date-correction candidates, excluded from this unit-adjustment batch. Economic losses and recoveries must remain investment returns, and both histories stay blocked pending a separately reviewed correction and event-handling path.

Quant's official historical NAV service repeats the suspicious 2015 spikes for 104513/120826 and omits the suspect dates for 100177/101072/120821. Neither result provides a proven replacement or permission to delete a saved observation. SBI 106096 has a 463-day source gap across its apparent jump, so the change is not evidence of a one-day unit event. PGIM's 2019 rise has a secondary credit-recovery lead, but the necessary original evidence remains unavailable.

An exact UTI Liquid identity conflict also remains: NCCL associates code 102009 with old ISIN `INF789F01BB4`, while the original issuer demat workbook identifies that ISIN as Monthly Dividend Reinvestment and `INF789F01BC2` as Discontinued Growth. A scheme-wide 2026 event cannot resolve this conflicting option bridge by itself. Other UTI, ICICI, JM, PGIM and Baroda cases retain their explicit missing-date, source-conflict or identity-evidence reasons in the queue.

## Implementation and verification

Only seven registry entries and explanatory comments change production behavior. Shared validation, factor bounds for existing entries, strict active scope, distribution/Growth policy, import controls and UI styling remain intact. The source records, raw NAV chart/CSV basis, errors, checkpoints and global precomputed returns asset are unchanged. The six newly eligible Growth histories affect detail/comparison calculations when their full histories load; this release does not rebuild the global returns index.

The new tests contain literal source observations and independent Decimal-derived expected NAVs and residual returns. Against the unchanged baseline, 35 expected missing-registration checks failed and 28 rejection checks passed. After registration, all 63 checks pass. The prior completion suite passes 525 tests, the prior verified-actions suite passes 303, and the Nippon/SBI regression suites pass 26 each: 943 focused checks in total. Two obsolete Invesco tests were updated to reject mixed code/ISIN pairs; complete newly supported pairs are tested using their own literal source observations.

Independent evidence reviews accepted the Invesco and SBI applicability chains before implementation. The complete 610-history audit checks every selected calculation point, source hashes, untouched raw warnings and all 603 unselected results. Exact-head repository CI, typecheck, Worker/Pages builds, expected-head merge and live artifact comparison are release gates; their executed results belong to the linked pull request and deployment record.

## Evidence files

- [Exact supported actions and all 115 researched dispositions](evidence/2026-10-29-bulk-continuation-actions.json)
- [Complete 610-history continuation queue](evidence/2026-10-29-bulk-continuation-queue.json)
- [Source-quality audit and exact primary correction candidates](evidence/2026-10-29-bulk-continuation-source-quality.json)
- [Implementation plan](superpowers/plans/2026-10-29-bulk-continuation.md)

The machine-readable records contain exact primary URLs, pages, SHA256 hashes, archived identities and qualifications. No automated AMFI downloads, former hosted importer restart or schedule changes were performed.
