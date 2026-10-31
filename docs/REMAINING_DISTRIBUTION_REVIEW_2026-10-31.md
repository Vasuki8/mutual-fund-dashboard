# Verified remaining distribution NAV review

**Review date:** 31 October 2026 UTC. **Development base:** `521ef8bf79885de57082054adc4f37b75b56cb3d` (merged and deployed PR 84). **Immutable data snapshot:** checkpoint 274, created at `2026-10-31T03:46:25.772Z`.

## Result and boundaries

This batch reviews the remaining **59 previously unreviewed distribution/discontinuity-only histories across 13 fund houses**, containing **226,022 retained observations**. It adds **20 exact unit registrations**, covering **88,646 observations**. The other **39 histories, containing 137,376 observations**, remain excluded. No source NAV correction, restoration, deletion or new warning exemption is introduced.

| Fund house | Histories reviewed | Retained observations | Unit registrations | Excluded histories |
| --- | ---: | ---: | ---: | ---: |
| Edelweiss Mutual Fund | 7 | 21,647 | 6 | 1 |
| Kotak Mahindra Mutual Fund | 4 | 19,807 | 4 | 0 |
| Canara Robeco Mutual Fund | 4 | 20,466 | 4 | 0 |
| Tata Mutual Fund | 2 | 10,885 | 2 | 0 |
| LIC Mutual Fund | 1 | 4,352 | 1 | 0 |
| Union Mutual Fund | 4 | 19,010 | 3 | 1 |
| Navi Mutual Fund | 8 | 33,294 | 0 | 8 |
| Bandhan Mutual Fund | 5 | 21,026 | 0 | 5 |
| Baroda BNP Paribas Mutual Fund | 2 | 11,604 | 0 | 2 |
| PGIM India Mutual Fund | 10 | 24,806 | 0 | 10 |
| JM Financial Mutual Fund | 8 | 22,192 | 0 | 8 |
| quant Mutual Fund | 3 | 11,875 | 0 | 3 |
| Franklin Templeton Mutual Fund | 1 | 5,058 | 0 | 1 |
| **Total** | **59** | **226,022** | **20** | **39** |

The accepted actions multiply **11,817 earlier calculation values by the documented factor 100**. All **214,205 other calculation values** remain exact. The cohort's **71 moves exceeding 40%** become **51** in the calculation copies: each accepted history loses precisely its one documented unit jump; every excluded anomaly stays. These figures come from the [complete production replay](evidence/2026-10-31-remaining-distribution-replay.json), not a sampled window.

**Raw archive flags cleared: zero. Consumer return eligibility added: zero.** Every original NAV, date, observation count, source timestamp, metadata field, warning, unresolved flag and retained gap stays intact. Unit normalization does not reconstruct distribution cashflows or establish reinvested total return. The existing literal Growth-only local and archive return consumers continue to exclude every reviewed option.

## Evidence, scope and reproduction

The [combined source and exclusion ledger](evidence/2026-10-31-remaining-distribution-sources.json) records every exact stored numeric code, complete name, fund house and both ISIN fields, including nulls. It includes the three final research packages' hashes, primary source URLs, original byte hashes where captured, physical page references, identity/rename chains, dated option NAV anchors, failed retrievals and independent review records. A null metadata field is a strict implementation value; it does not assert that no other security identifier ever existed.

The [pinned offline replay](evidence/2026-10-31-remaining-distribution-replay.mjs) verifies the manifest, original compressed bytes and expanded lengths, then uses production archive validators, normalization, active-scope checks, financial basis, quality checks and actual consumer functions. It checks every retained observation and adjacent interval, including all exclusions. Its [result artifact](evidence/2026-10-31-remaining-distribution-replay.json) lists every calendar gap above one day, raw event and calculation result.

The manifest SHA-256 is `6060d56e5dfa60a08a8591b99464fcec1e44093480e81ddcb9c9fae0e0e1dd9e`. The capture verifies **31 assets**—one catalogue and 30 history shards—totalling **8,186,432 compressed bytes**. File hashes cover literal bytes; canonical document/object hashes cover compact insertion-order UTF-8 JSON. The ledger explicitly distinguishes those semantics from the pretty-printed selected-history files.

At the initial actual scope evaluation, `2026-10-31T03:59:56.649Z`, all 59 qualify under the unchanged strict repair predicate: exact numeric membership in the 26 October official open-ended roster, independently verified current `/mf` membership, and a finite positive latest NAV on a real nonfuture date within 30 UTC calendar days. Catalogue fetch and list verification are both `2026-10-30T19:58:19.963Z`: 38,026 list members, 38,026 bulk NAV rows and zero absent bulk rows. Current list membership is separately verified; bulk presence alone is insufficient.

The replay separately evaluates actual runtime eligibility at `2026-10-31T04:23:29.790Z`: **59 of 59 remain eligible**. A later offline reproduction must report its own actual-date result rather than treating the frozen date as current. The 30-day rule selects histories; it does not truncate their historical review. The website's separate seven-day discovery rule is unchanged. Research uses captured histories and public issuer/exchange/clearing documents, with no new MFAPI history requests or automated AMFI requests.

To reproduce with the captured archive directory and matching production sources:

```bash
node docs/evidence/2026-10-31-remaining-distribution-replay.mjs \
  /absolute/path/to/checkpoint-274/archive \
  /absolute/path/to/replay-output.json
```

The script refuses an output path inside the immutable input archive, checks its source-ledger and 15 production-source hashes, and rechecks input bytes after evaluation. Later collector checkpoints are distinct snapshots and cannot be substituted silently.

## Twenty documented unit registrations

Every action retains the existing **absolute** ratio-deviation bound: `abs(new NAV / old NAV - 100) <= 0.1`. Legal dates, retained boundaries and exact option identities are separate fields.

| Exact cohort | Numeric codes | Legal effective date | Retained last old → first new NAV | Factor |
| --- | --- | --- | --- | ---: |
| Edelweiss Liquid: four Regular and two Direct IDCW options | 140181, 140183, 140185, 140188, 140193, 140197 | 1 July 2017 | 30 June → 2 July 2017 | 100 |
| Kotak Liquid Daily Regular/Direct and Money Market Monthly Regular/Direct | 100833, 119764, 101892, 119747 | Close of business 18 January 2013 | 18 → 20 January 2013 | 100 |
| Canara Robeco Liquid Regular Daily/Weekly | 109349, 109350 | 20 August 2011 | 20 → 21 August 2011 | 100 |
| Canara Robeco Ultra Short Term Regular Weekly/Daily | 109366, 109372 | 20 August 2011 | 19 → 22 August 2011 | 100 |
| Tata Liquid Daily Reinvestment Regular/Direct | 101714, 119862 | 1 February 2014 | 31 January → 2 February 2014 | 100 |
| LIC Liquid Direct Daily | 120248 | 21 January 2013 | 20 → 21 January 2013 | 100 |
| Union Liquid Regular Monthly/Daily/Weekly | 115400, 115401, 115402 | 2 October 2011 | 29 September → 2 October 2011 | 100 |

### Exact source bindings and date distinctions

**Edelweiss.** The [original 20 June 2017 notice](https://www.edelweissmf.com/Files/downloads/Notice-Cum-Addendum/2017/Edelweiss-NoticecumAddendum-21-jun17.pdf#page=1) documents the all-option denomination change. The original February 2026 scheme summary binds numeric codes and options; the 2021 common KIM supplies both stored nonnull ISINs. The June 2020 factsheet's physical page 17 provides six literal 30 June option NAV anchors. All originals were hashed and visually inspected. Code **140181** has a generic stored Regular IDCW name but is explicitly Daily by numeric code; generic sibling **140190** is not substituted. Code **140184** starts after the documented event and remains excluded.

**Kotak.** The [original 14 January 2013 notice](https://vatseelabs-s3.kotakmf.com/FormsDownloads_BKP_05_April_2024/Addendums/KLiquid,-KFST---14-January-2013/14-01-13.pdf#page=1) covers Liquid and Floater Short Term, all plans/options, at close of business 18 January. The 2018 issuer notice maps Floater Short Term to Money Market, effective 1 June. Original clearing records bind all four codes and stored ISINs. The original November 2024 factsheet, page 40, gives the two exact Monthly Money Market NAVs as of 29 November. The [original January 2024 factsheet](https://vatseelabs-s3.kotakmf.com/FormsDownloads/Factsheet/Factsheet-for-January-2024/KotakMFFactsheetJanuary2024.pdf#page=34), found through the issuer's public download index, gives separate Daily Liquid Regular/Direct NAVs of **1222.8100 on 31 January 2024**, matching both retained histories. The 2013 annual report's period-end values differ from retained 28 March values and are not used as literal anchors. The Direct Money Market history's 31- and 61-day gaps remain.

**Canara Robeco.** The original [Liquid financial report](https://www.canararobeco.com/wp-content/uploads/2025/02/canara-robeco-liquid-fund-f-y-2012-13.pdf#page=21) and [Treasury Advantage report](https://www.canararobeco.com/wp-content/uploads/2025/02/canara-robeco-treasury-advantage-f-y-2012-13.pdf#page=22) document the same 20 August 2011 legal event. Their plan descriptions explicitly connect former Super Institutional to current Regular. Literal 31 May 2011 option anchors come from the original May factsheet; the October 2018 factsheet maps Treasury Advantage to Ultra Short Term. Current issuer and clearing documents bind exact codes and all stored nonnull ISINs. The observed Liquid and Ultra Short Term boundaries differ and are registered separately.

**Tata.** The [original March 2014 financial report](https://www.tatamutualfund.com/system/files/2023-08/half_yearly_portfolios_march_2014.pdf#page=4) documents the old Money Market scheme's 1 February event, with exact option anchors before and after it. The original 2019 annual report explicitly identifies current Liquid as former Money Market. Its reciprocal rename—old Liquid becoming current Money Market—is a different identity. The two directions are not conflated. Current numeric-code and reinvestment ISIN bindings identify only the two accepted Daily options.

**LIC.** The [original 2013 financial statements](https://www.licmf.com/assets/pdf/statuary_disclosure/LIC%20-%20Balance%20Sheet%20-%2010%20May%202013.pdf#page=4) give the 21 January event in note 14. Physical page 2 gives Direct Dividend NAV **1098.0000**, explicitly as of **28 March 2013** because 29–31 March were nonbusiness days. The retained 28 March observation matches. The report's nominal 31 March period end is not substituted for the stated NAV date. Original rename material and clearing records connect the current LIC identity and both stored ISINs.

**Union.** The issuer's [October 2012 factsheet](https://www.unionmf.com/docs/default-source/downloads/scheme-disclosures/factsheets/october-2012.pdf?sfvrsn=f69eb488_3#page=5) explicitly states the 2 October 2011 denomination terms and provides distinct, matching 31 October 2012 option NAVs. The [original NSE ZIP](https://nsearchives.nseindia.com/web/sites/default/files/inline-files/Union_02042022.zip) contains the unchanged issuer scheme-summary PDF; physical pages 1–2 visually bind all three numeric codes, exact options and every stored nonnull ISIN. The issuer's July 2017 heading supplies the former Union KBC name bridge. Independent Decimal replay checks all **14,358 points**; exactly **88 earlier points per code** receive factor 100. Daily's factor deviation is zero; Monthly/Weekly are about **0.0743901586**, within the unchanged absolute bound.

Union has a material capture limitation: the October 2012 legal/NAV factsheet and July 2017 rename heading were retrieved as directly indexed primary issuer text, **without original PDF byte hashes or successful visual inspection**. Normal October downloads returned 503 and the web opening timed out. Those limits remain explicit in both independent reviews and the final ledger. The identity PDF is a byte-for-byte original ZIP member, not a document reconstructed from a workbook. This limited primary-text capture is not represented as an original-byte capture.

## Thirty-nine exclusions retained

| Exact codes | Histories | Evidence still missing or contradictory |
| --- | ---: | --- |
| Navi 112645, 112646, 112647, 119161, 119162, 119163 | 6 | Both the 2014 and revised 2022 denomination events and historical option NAVs are established, but a primary bridge to the complete current stored ISIN tuple is missing. No partial event or collapsed net factor of one is registered. |
| Navi 139386, 140437 | 2 | Complete option/ISIN binding remains missing. For 140437, the issuer's 29 October workbook labels the exact code as unclaimed balances **greater than three years**, while the stored name says **Direct Plan / less than three years**. Matching NAVs do not resolve that conflict. |
| Bandhan 108692, 115489 | 2 | Current identity evidence does not replace the missing original November 2011 conversion terms and exact historical option NAV anchors. |
| Bandhan 108766, 131388, 131396 | 3 | Nonunit drops or spike/reversal patterns lack primary dated distributions/corrections. Specific stored reinvestment ISIN and legacy-name gaps remain. The 240-day gap in 131388 is preserved. |
| Union 115399 | 1 | The retained series crosses the legal event in a **99-day gap**, 11 July → 18 October 2011. Neither the required 29 September nor 2 October boundary observation exists. A hypothetical smoothing factor does not supply them. |
| Edelweiss 140184 | 1 | History begins 14 September 2017, after the July conversion. Its September drop and October jump are later nonunit anomalies, including a 23-day gap, without exact primary explanation or correction. |
| Baroda BNP Paribas 101407, 111707 | 2 | February 2011 arithmetic fits 100, but no original primary dated conversion terms or complete historical option/rename chain were retrieved. A secondary contemporary report stays a discovery lead. The legacy issuer archive returned 503. |
| PGIM 138341, 138342, 138344, 138359, 138361, 138362 | 6 | The September 2019 debt-recovery hypothesis lacks original issuer event evidence and exact option NAV confirmation. Grouped SSD codes/ISINs do not establish an ambiguous pairing. |
| PGIM 147605, 147607, 147608, 147609 | 4 | September 2019 Overnight values resemble a 100x event, but original dated conversion terms remain missing. A current face value does not prove the historical event. |
| JM 147834, 147835, 147838, 147839 | 4 | Clean original issuer annual-report text states **14 December 2019**; retained new-basis values start **13 December**. The legal/observed conflict is unresolved. The clean amount/date note is printed page 50; the garbled page-89 repeat is not amount proof. |
| JM 100220, 131476, 134959, 134961 | 4 | Primary distribution explanations and exact ex-NAVs are established, but no source correction/restoration is justified and exact preceding-day issuer NAVs were not recovered. No artificial correction or new warning waiver is created. |
| quant 100176, 120825, 120827 | 3 | Original issuer historical-form responses omit 27 May 2015 for the two Small Cap options and repeat the anomalous **36.7479** for Large & Mid Cap Direct. Omission is not deletion authority; repetition is not a replacement or explanation. |
| Franklin 100549 | 1 | No original 4 July 2006 replacement NAV or economic-event explanation for the retained drop/rebound was recovered. Current identity records do not establish the old NAV. |
| **Total** | **39** | **All 137,376 observations, warnings and calculation blocks remain.** |

### Four JM economic explanations, with no calculation mutation

The issuer's May 2024 factsheet identifies these distributions and ex-NAVs; each ex-NAV equals the exact retained date. Current original scheme-summary pages 3, 5 and 25 establish the exact code/option/both-ISIN bindings. Distribution amounts may include tax and do not themselves establish an investor reinvestment return.

| Code | Record date | Declared amount | Published ex-NAV | Retained ex-NAV |
| --- | --- | ---: | ---: | ---: |
| 100220 | 25 March 2015 | 8.8700 | 13.1510 | 13.15100 |
| 131476 | 22 March 2018 | 13.0000 | 19.0713 | 19.07130 |
| 134959 | 22 March 2018 | 9.0000 | 11.9538 | 11.95380 |
| 134961 | 20 March 2019 | 12.2500 | 15.3962 | 15.39620 |

The [primary factsheet](https://www.jmfinancialmf.com/CMS/downloads/Factsheet/Factsheet/Factsheet%20May%202024.pdf) remains web-reader text: the original GET returned 406, and the screenshot exceeded the tool size limit. The ledger does not claim original bytes or visual verification for that factsheet. Exact preceding-day issuer NAVs were not obtained. The current source-review API requires an actual correction or restoration; no fabricated value change is introduced to gain an economic-event waiver. All four remain classified in evidence only.

## Every retained gap survives

The independent source pass checks **225,963 adjacent pairs**, with **39,312 intervals longer than one calendar day**. These include ordinary weekends and holidays; a long calendar interval alone does not prove an expected publication is missing. All gap tuples survive production replay exactly. Seven histories contain 13 intervals longer than seven days; six contain eight intervals longer than 30 days.

| Code | Retained intervals longer than seven calendar days | Disposition |
| --- | --- | --- |
| 112646 | 18–31 March 2010: 13 days; 31 March–17 May 2010: 47 days; 30 March–7 April 2011: 8 days | Excluded |
| 112647 | 18–31 March 2010: 13 days; 31 March 2010–9 September 2011: 527 days | Excluded |
| 115399 | 11 July–18 October 2011: 99 days; 29 December 2011–8 February 2012: 41 days | Excluded |
| 115489 | 7 July–7 September 2011: 62 days; 27 September–7 October 2011: 10 days | Excluded |
| 119747 | 22 March–22 April 2013: 31 days; 12 June–12 August 2013: 61 days | Unit conversion only; both gaps retained |
| 131388 | 1 November 2016–29 June 2017: 240 days | Excluded |
| 140184 | 18 September–11 October 2017: 23 days | Excluded |

No dates, NAVs or warnings are added to make these histories appear complete. The successful unit adjustment for 119747 preserves its unrelated coverage gaps.

## Implementation and verification

Production changes are confined to **20 exact entries in seven groups** inside `src/lib/corporate-actions.ts`. Existing algorithms, factor tolerances, multi-event guards, warning handling, collector behavior, UI and Growth consumers are unchanged. The three independently researched groups and all proposed inclusions were reviewed before registration.

The new fixture file contains **396 literal anomaly-window observations across all 59 targets**, independently calculated expected NAVs/returns, and a **14-point real gap probe** for 119747. The new test file adds **222 cases**. Before production edits, it produced **61 meaningful missing-registration failures and 161 passes**, with no import, syntax or environment failure. After the registrations, the focused suite passes **555 of 555 tests** and the complete suite passes **2,638 of 2,638**, with no skipped tests. Typecheck and both Worker and Pages production builds pass. The [independent implementation and ledger reviews](evidence/2026-10-31-remaining-distribution-independent-review.json) pass with no blocking findings. The implementation reviewer also reran the pinned production replay and independently checked every fixture and full-series count.

The regression cases exercise exact code/name/house/both-ISIN requirements, literal null versus omission, incorrect boundary dates, out-of-tolerance factors, extra unexplained events, accurate and stale warning counts, invalid/conflicting evidence, repeat refusal, preservation of unrelated coverage warnings and raw object immutability. Every excluded history uses its real anomalous observations. A supported same-house event cannot authorize an excluded sibling. Real local and archive return functions reject the normalized IDCW cases while usable synthetic Growth controls produce finite results.

The full replay independently shifts original decimal strings and compares every calculation NAV; its maximum binary-number difference is **2.2737367544323206e-13**, below the fixed 1e-9 bound. It preserves all 59 raw unresolved flags, all excluded quality blocks, all dates and all source asset bytes. Frozen and actual-date repair eligibility are reported separately. The portable replay and evidence hashes make the exact implementation and input version explicit.

## Collector progress is separate

The [checkpoint-274 collector evidence](evidence/2026-10-31-collector-checkpoint-274.json) records [run 41164968685](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/41164968685), with successful archive, build, deploy and continuation jobs. It made **118 attempts**: **105 saved**, **two failed**, and **11 quality outcomes**. There were no first attempts or newly added histories; reconciliation advanced.

Within its same final **8,524-scheme active cohort**, all histories are saved, **7,922 are raw-clean**, **602 retain raw quality flags**, and active source gaps fell **87 → 85**. Refresh/reconciliation pending fell **2,070 → 1,965**. These buckets overlap; saved history does not establish complete coverage. The ordinary continuation dispatched run **41165992434**. No collector budgets, pacing, retry rules, cooldowns or workflows changed in this batch.

The full archive separately records 38,026 listed identities, 37,400 saved histories, 3,521 raw quality flags, 705 source gaps, eight first-attempt pending identities and 30,841 refresh/reconciliation pending identities. These broader archive counts are not the strict active cohort.

The recorded Pages artifact is **13029317284**, `github-pages-41164968685-1`, **176,340,509 bytes**, digest `sha256:352a9171fc877fd876011d8fdf9b54294b4316816388550a99d9e52384830eb9`. It was created at 03:48:57 UTC and expires **1 November at 03:48:53 UTC** under the one-day retention. That whole ZIP was not downloaded for this audit; the research capture independently verified the 31 selected public archive assets. Later collector checkpoints and the new code deployment are observed separately.

## Delivery record

The reviewed tree is published through a focused pull request from `fix/remaining-distribution-nav-2026-10-31`. Exact remote tree/file identities, PR and main CI, actual Pages checkout, artifact/deployment outcome, and live JavaScript/CSS hashes are verified in the pull request's delivery record after publication. A build alone is not treated as proof that the live site serves this change. PR 84 remains the verified prior release; this document and checkpoint 274 describe the subsequent batch.
