# Verified unit-action batch — 29 October 2026 UTC

## Outcome and scope

This batch registers **27 additional exact fund identities** for calculation-only treatment of documented unit consolidations or splits. The owner requested larger reviewed batches on 28 October (Toronto time). The existing common matching, validation and calculation mechanisms remain intact.

All **99,249 saved observations** were checked. Every selected identity passes the production active-repair predicate using the actual UTC date: existing official open-ended numeric roster membership, current membership in the retained verified MFAPI catalogue, and a finite positive NAV no more than 30 days old and not future dated. The catalogue's selected NAV dates are 26 October 2026. This establishes the configured repair scope, not purchase eligibility or newly refreshed catalogue membership.

The result has two distinct counts: **16 Growth identities become eligible for detail/comparison analytics after their explained discontinuity is removed from the calculation copy; 11 ETF identities gain verified unit-action registrations but remain blocked by the existing Growth-only consumer rule**. `docs/METHODOLOGY.md` requires a confirmed Growth name, and `docs/UI_DESIGN.md` preserves that gate. Registering an ETF unit split does not establish distribution-adjusted total-return eligibility. The global precomputed return index and raw archive flags retain their existing behavior.

The catalogue remains the last accepted snapshot, fetched **2026-10-27T16:59:52.790Z**. Its duplicate/pagination incident is recorded separately in [CATALOGUE_REFRESH_2026-10-28.md](CATALOGUE_REFRESH_2026-10-28.md). This change does not relax catalogue validation.

## Exact identities and observed boundaries

Names below are the current saved source identities. Matching is case-insensitive but otherwise exact and also requires the exact code, fund house and current Growth ISIN. The factor multiplies only observations before the first new-basis NAV; it is the NAV multiplier, not the reciprocal unit-count multiplier.

| Code | Current source name | Current Growth ISIN | Last old-basis date | First new-basis date | Factor | Observations |
| ---: | --- | --- | --- | --- | ---: | ---: |
| 134782 | Nippon India ETF Nifty 50 Value 20 - Direct Plan | INF204KB18I3 | 2019-12-20 | 2019-12-23 | 0.1 | 2,801 |
| 140084 | Nippon India ETF Nifty 50 BeES - Direct Plan | INF204KB14I2 | 2019-12-20 | 2019-12-23 | 0.1 | 2,463 |
| 140087 | Nippon India ETF Nifty Bank BeES - Direct Plan | INF204KB15I9 | 2019-12-20 | 2019-12-23 | 0.1 | 2,463 |
| 140088 | Nippon India ETF Gold BeES - Direct Plan | INF204KB17I5 | 2019-12-20 | 2019-12-23 | 0.01 | 2,463 |
| 140089 | Nippon India ETF Nifty PSU Bank BeES - Direct Plan | INF204KB16I7 | 2019-12-20 | 2019-12-23 | 0.1 | 2,463 |
| 140095 | Nippon India ETF Hang Seng BeES - Direct Plan | INF204KB19I1 | 2019-12-20 | 2019-12-23 | 0.1 | 2,371 |
| 101317 | Aditya Birla Sun Life Ultra Short Term Fund - Regular Plan - GROWTH | INF209K01LZ1 | 2011-10-05 | 2011-10-07 | 10 | 4,976 |
| 101976 | Aditya Birla Sun Life Money Market Fund - Regular Plan - GROWTH | INF209K01RV7 | 2011-10-06 | 2011-10-07 | 10 | 5,721 |
| 103192 | Aditya Birla Sun Life Ultra short to short term Fund - Regular Plan - GROWTH | INF209K01LQ0 | 2011-10-05 | 2011-10-07 | 10 | 5,242 |
| 108273 | Aditya Birla Sun Life Banking & PSU Debt Fund - Regular Plan - GROWTH | INF209K01LV0 | 2011-10-05 | 2011-10-07 | 10 | 4,458 |
| 102012 | UTI - Liquid Fund - Regular Plan - Growth | INF789F1AF85 | 2026-06-19 | 2026-06-20 | 0.1 | 7,021 |
| 120304 | UTI - Liquid Fund - Direct Plan - Growth | INF789F1AD46 | 2026-06-19 | 2026-06-20 | 0.1 | 4,556 |
| 115127 | Aditya Birla Sun Life Gold ETF | INF209KB18D3 | 2021-11-26 | 2021-11-29 | 0.01 | 3,804 |
| 115512 | Aditya Birla Sun Life Nifty 50 ETF | INF209KB19D1 | 2021-11-26 | 2021-11-29 | 0.1 | 3,755 |
| 139581 | Aditya Birla Sun Life BSE Sensex ETF | INF209KB10E8 | 2021-11-26 | 2021-11-29 | 0.1 | 2,535 |
| 145881 | Aditya Birla Sun Life Nifty Next 50 ETF | INF209KB16D7 | 2021-11-26 | 2021-11-29 | 0.1 | 1,934 |
| 147735 | ADITYA BIRLA SUN LIFE NIFTY BANK ETF | INF209KB17D5 | 2021-11-26 | 2021-11-29 | 0.1 | 1,731 |
| 105185 | Invesco India Short Term Fund - Regular Plan - Growth | INF205K01UN6 | 2013-04-18 | 2013-04-22 | 100 | 4,724 |
| 106177 | Invesco India Corporate Bond Fund - Regular Plan - Growth | INF205K01RM4 | 2013-04-18 | 2013-04-22 | 100 | 4,637 |
| 107477 | Invesco India Gilt Fund - Regular Plan - Growth | INF205K01SR1 | 2013-04-18 | 2013-04-22 | 100 | 4,506 |
| 112123 | Invesco India Money Market Fund - Regular Plan - Growth | INF205K01SD1 | 2013-04-18 | 2013-04-22 | 100 | 4,140 |
| 114359 | Invesco India Ultra Short Term Fund - Regular Plan - Growth | INF205K01TM0 | 2013-04-18 | 2013-04-22 | 100 | 3,815 |
| 120497 | Invesco India Corporate Bond Fund - Direct Plan - Growth | INF205K01RF8 | 2013-04-18 | 2013-04-22 | 100 | 3,334 |
| 120507 | Invesco India Money Market Fund - Direct Plan - Growth | INF205K01RY9 | 2013-04-18 | 2013-04-22 | 100 | 3,334 |
| 120520 | Invesco India Gilt Fund - Direct Plan - Growth | INF205K01SN0 | 2013-04-18 | 2013-04-22 | 100 | 3,334 |
| 120541 | Invesco India Ultra Short Term Fund - Direct Plan - Growth | INF205K01TH0 | 2013-04-18 | 2013-04-22 | 100 | 3,334 |
| 120560 | Invesco India Short Term Fund - Direct Plan - Growth | INF205K01UH8 | 2013-04-18 | 2013-04-22 | 100 | 3,334 |

Exact houses are `Nippon India Mutual Fund`, `Aditya Birla Sun Life Mutual Fund`, `UTI Mutual Fund`, and `Invesco Mutual Fund`. A neighboring plan, historical name, old ISIN or similar name does not authorize an adjustment.

## Primary evidence

### Six Nippon ETFs: December 2019

[NSE/CML/42888, dated 12 December 2019](https://archives.nseindia.com/content/circulars/CML42888.pdf), pages 1–2, lists the six ETF names, exact new ISINs and subdivisions. Gold changes face value Rs100→Rs1, giving factor **0.01**. The other five change Rs10→Rs1, giving factor **0.1**.

The circular gives an ISIN change date of **20 December 2019**, with the new ISIN applicable to exchange trades from the **19 December ex-date**. Each saved NAV series retains the old basis through 20 December and first uses the new basis on 23 December. Labels identify the exchange date; calculation uses the observed 20→23 December boundary.

The [NSE-hosted issuer Scheme Summary Document](https://nsearchives.nseindia.com/trading_security/mf/pdf/Nippon_10032026151550_NipponMutualFund.pdf) binds the codes and ISINs: 134782/INF204KB18I3 (PDF page 159), 140084/INF204KB14I2 (4), 140087/INF204KB15I9 (7), 140088/INF204KB17I5 (8), 140089/INF204KB16I7 (9), and 140095/INF204KB19I1 (11).

The source's “Direct Plan” suffix is retained in matching. It does not establish a separate legal Direct/Regular ETF option; the issuer summary says options are not applicable.

### Four Birla debt Growth identities: October 2011

The issuer's [October 2014 Empower factsheet](https://mutualfund.adityabirlacapital.com/-/media/bsl/files/resources/factsheets/2014/empower-october-2014.pdf) explicitly records face value **Rs10→Rs100 effective 7 October 2011**, covering all plans/options of the named schemes. The earlier-NAV factor is **10**. This is retrospective issuer evidence; the original advance notice was not located.

Exact 30 September 2014 Growth NAVs independently bind the saved histories to historical plan columns:

| Code | Historical scheme and option | PDF / printed page | Issuer NAV | Saved NAV, numerically identical |
| ---: | --- | --- | ---: | ---: |
| 101317 | Savings, Regular Growth | 54 / 51 | 257.1431 | 257.14310 |
| 101976 | Floating Rate Short Term, Regular Growth | 61 / 58 | 178.3033 | 178.30330 |
| 103192 | Cash Manager, Regular Growth | 53 / 50 | 321.9300 | 321.93000 |
| 108273 | Treasury Optimizer, Regular Growth, formerly Ultra Short Term | 55 / 52 | 163.0384 | 163.03840 |

Issuer letters dated 30 April 2018 give transitions effective 4 June 2018: [Cash Manager→Low Duration](https://mutualfund.adityabirlacapital.com/-/media/bsl/files/resources/other-disclosures/letters-to-unit-holders/absl-cash-manager.pdf), [Floating Rate Short Term→Money Manager](https://mutualfund.adityabirlacapital.com/-/media/bsl/files/resources/other-disclosures/letters-to-unit-holders/absl-floating-rate-fund-short-term-plan.pdf), and [Treasury Optimizer→Banking & PSU Debt](https://mutualfund.adityabirlacapital.com/-/media/bsl/files/resources/other-disclosures/letters-to-unit-holders/absl-treasury-optimizer-plan.pdf), each page 1.

[NSE/NMFTM/75941 and attached issuer Addendum 46/2026](https://nsearchives.nseindia.com/content/circulars/NMF75941.zip), each page 1, give the final renamings effective 26 August 2026: Savings→Ultra Short Term, Money Manager→Money Market, and Low Duration→Ultra Short to Short Term. The issuer addendum is dated 14 August; the exchange circular is dated 25 August. The old Ultra Short Term lineage and current Ultra Short Term lineage are distinct.

The [NSE-hosted ABSL issuer summary](https://nsearchives.nseindia.com/trading_security/mf/pdf/Aditya_06042026165307_SchemeSummaryDocument.pdf) binds the exact code/ISIN pairs on PDF pages 67 (101317), 44 (101976), 39 (103192), and 5 (108273). The existing official numeric roster establishes code membership, not ISIN membership.

Money Market's adjacent predecessor is **6 October**. The other three saved histories have **5 October** as the last old-basis observation. No missing 6 October NAV is invented.

### Five ABSL ETFs: November 2021

[NSE/CML/50382, dated 23 November 2021](https://nsearchives.nseindia.com/content/circulars/CML50382.pdf#page=1), page 1, binds all five new ISINs to the subdivisions. Gold changes face value **Rs10→Rs0.1** (factor **0.01**); the other four change **Rs10→Rs1** (factor **0.1**).

The [issuer's signed BSE filing dated 10 November, with Addendum 41/2021 dated 9 November](https://bsmedia.business-standard.com/_media/bs/data/announcements/bse/11112021/0635528d-957c-4012-80c5-653837c0ab2b.pdf) supplies the **26 November 2021 record date** (page 1), face values (page 2), old ISINs and unit counts (page 3), and notice (page 4).

The exchange ex-date is **25 November**, the ISIN date is **26 November**, and the saved NAVs first use the new basis on **29 November**. Calculations use only the verified 26→29 November boundary.

The same ABSL issuer summary binds current code/ISIN pairs on PDF pages 31 (115127), 49 (115512), 68 (139581), 53 (145881), and 7 (147735). Several summary-table face-value cells are inconsistent. The summary is used for identity; the contemporaneous circular and issuer notice establish factors.

### Two UTI Liquid Growth plans: June 2026

The [official NSE package NMF74721.zip](https://nsearchives.nseindia.com/content/circulars/NMF74721.zip) contains UTI **Addendum 14/2026-27, dated 4 June 2026**, and **NSE/NMFTM/74721, dated 16 June**. Both original one-page documents specify **Rs1,000→Rs100 effective 19 June 2026** for UTI Liquid Fund. The NAV multiplier is **0.1**, corresponding to ten units for each old unit.

The [issuer's March 2026 Scheme Summary Document](https://nsearchives.nseindia.com/trading_security/mf/pdf/UTI_10032026180054_UTIMutualFund.pdf), PDF page 114, gives the exact codes and pre-event ISINs: Regular Growth 102012/INF789F01PH1 and Direct Growth 120304/INF789F01XQ6.

[CDSL/ADM/DP/GENRL/2026/416, dated 19 June 2026](https://www.cdslindia.com/eservices/Publications/DownloadFile?eventID=DP2026-416&method=communique), identifies the same exact issuer/scheme/plan names with their new ISINs and face value Rs100:

| Plan | Current ISIN | PDF / printed page / row |
| --- | --- | --- |
| Direct Growth | INF789F1AD46 | 5 / 4 / 36 |
| Regular Growth | INF789F1AF85 | 7 / 6 / 60 |

The securities were admitted on 18 June. A single explicit old→new ISIN conversion table was not located. The identity chain joins the exact named options in the issuer's pre-event summary and depository's admission record, then matches current saved metadata. Discontinued Growth 102009 is not equated with either selected option.

Both saved series retain the old basis on **19 June** and first report the new basis on **20 June**. The issuer effective date remains 19 June.

### Ten Invesco Growth identities: April 2013

The contemporaneous issuer [May 2013 factsheet](https://www.invescomutualfund.com/docs/default-source/Fact-Sheet/factsheet_may_2013.pdf?sfvrsn=0#page=5), PDF/printed page 5, states that face value changed **Rs10→Rs1,000 at close of business on 18 April 2013**. Its central note explicitly names Short Term, Credit Opportunities, Medium Term Bond, Active Income and Gilt Long Duration, among other schemes. The documented earlier-NAV multiplier is **100**. All ten selected saved series retain the old basis on **18 April** and first report the new basis on **22 April**; the four-day observed interval is retained.

Exact **31 May 2013** Growth NAVs bind each selected saved series to its historical issuer plan column:

| Historical issuer scheme | Base Growth code / issuer NAV | Direct Growth code / issuer NAV | PDF / printed page |
| --- | --- | --- | ---: |
| Short Term | 105185 / 1624.9320 | 120560 / 1628.3762 | 26 |
| Credit Opportunities | 112123 / 1346.9409 | 120507 / 1348.3518 | 27 |
| Medium Term Bond | 114359 / 1223.5230 | 120541 / 1228.8894 | 28 |
| Active Income | 106177 / 1453.3516 | 120497 / 1456.2509 | 29 |
| Gilt — Long Duration | 107477 / 1321.2990 | 120520 / 1329.2668 | 34 |

The [NSE-hosted May 2026 issuer Scheme Summary Document](https://nsearchives.nseindia.com/trading_security/mf/pdf/Invesco_20052026172310_IMF.pdf), fields 28–29, independently binds the ten exact current codes and ISINs:

| Codes, base / Direct | Current Growth ISINs, base / Direct | Current issuer family | PDF page |
| --- | --- | --- | ---: |
| 105185 / 120560 | INF205K01UN6 / INF205K01UH8 | Short Duration | 43 |
| 106177 / 120497 | INF205K01RM4 / INF205K01RF8 | Corporate Bond | 53 |
| 107477 / 120520 | INF205K01SR1 / INF205K01SN0 | Gilt | 61 |
| 112123 / 120507 | INF205K01SD1 / INF205K01RY9 | Money Market | 67 |
| 114359 / 120541 | INF205K01TM0 / INF205K01TH0 | Ultra Short Duration | 72 |

The identity chain uses issuer records rather than treating similarly named schemes as interchangeable:

- The [2016–17 annual report](https://invescomutualfund.com/docs/default-source/default-document-library/annual-report-fy-2016-2017.pdf?sfvrsn=0), PDF page 106 / printed 102, records the Religare → Religare Invesco → Invesco fund-house history and replacement of the live scheme prefix with **Invesco India on 6 May 2016**. Page 107 / printed 103 records **Gilt Long Duration → Gilt from 1 October 2016**.
- The [March 2018 issuer recategorization addendum](https://invescomutualfund.com/docs/default-source/default-document-library/44---change-in-fundamental-attributes---mar-21-18.pdf?sfvrsn=0) establishes **Active Income → Corporate Bond** (PDF page 3), **Credit Opportunities → Money Market** (12), and **Medium Term Bond → Ultra Short Term** (20), effective **27 April 2018**, as specified on page 3.
- The [2024–25 issuer annual report](https://www.invescomutualfund.com/docs/default-source/financial-pdf/invesco-mutual-fund-annual-report-fy-2024-254ecaf807eee8616aaa28ff00007d74af.pdf?sfvrsn=592299c2_0), PDF page 141, establishes **Short Term → Short Duration** and **Ultra Short Term → Ultra Short Duration**, effective **31 January 2024**. The archive still supplies the older Short Term names; matching preserves those exact observed names and the verified code/ISIN pairs. It does not rewrite source metadata or accept arbitrary aliases.

The older pre-2018 Ultra Short Term Fund that became Treasury Advantage is a different lineage. Codes 114359/120541 come from **Medium Term Bond**, then acquired the Ultra Short Term name in 2018. The issuer's [September 2018 fixed-income presentation](https://www.invescomutualfund.com/docs/default-source/Presentations-PDF/fixed-income-investment-process---september-18.pdf?sfvrsn=0), PDF page 9, lists both distinct renamings.

**Two same-name legacy plans remain unadjusted.** Code 105189 / INF205K01UR7 matches the historical Short Term **Plan B Growth** anchor, 1619.0920. Code 112120 / INF205K01SG4 matches Credit Opportunities **Regular Growth**, 1311.7938. The current issuer summary does not bind either exact code/ISIN pair. The 2016–17 report separately lists these legacy plans and says fresh subscriptions ceased from 1 October 2012 while existing investors remained invested. The 2024–25 report still distinguishes the legacy Money Market Regular plan. Exact historical NAV matches corroborate plan identity but do not replace the missing independent primary code/ISIN binding. No merger into the selected base plans is inferred. Regression and full-history checks explicitly require both deferred identities to remain blocked.

The original 36-page May 2013 PDF is **739,848 bytes**, SHA-256 `3fc8cefeb3a1fee6a5a927b45adbfc2ce777e79059493d6c2f8d6477091dcd1c`. Event and anchor pages were text-extracted and visually checked. The ten selected histories contribute **38,492 observations**.

## Calculation safeguards and verification

The common logic requires one exact generated discontinuity warning, one actual large move, valid ordered positive observations, exact identities and exact adjacent dates. Invalid/conflicting NAV evidence or any additional unexplained move prevents adjustment. A calculation copy cannot be adjusted again, even if its raw warning is restored.

ETF observations must be within **5% of the documented factor**. The four debt consolidations and two UTI liquid splits use **0.1% factor-relative tolerance**: 0.01 around 10 and 0.0001 around 0.1. Invesco uses **0.5% factor-relative tolerance**, or 0.5 around 100, over its four-day observed gap. The largest selected residual is Corporate Bond Direct's **+0.22086154%**; a 0.1% bound would incorrectly reject that documented event. This is a fixed bounded acceptance condition, not an inferred multiplier. The multiplier is always the documented constant; ordinary market/interest movement survives.

Raw documents, dates, metadata, source warnings, archive unresolved flags and hashes are retained. Only the explained warning is removed from the transient calculation copy; unrelated source notices remain visible. Raw NAV chart/export and the global precomputed return index retain their existing behavior. For the 16 selected Growth identities, `financialNavBasis` supplies an eligible calculation copy to the existing detail/comparison paths. All 11 selected ETF names fail the unchanged literal-Growth eligibility predicate and remain consumer blocked. These are calculation-copy changes; the global index is not rewritten.

At **2026-10-29T00:57:51.607Z**, the independent verifier checked all 27 eligibility predicates and all 99,249 observations; exact factor application; date and post-event preservation; event residual returns; full-history returns from independent endpoints and actual elapsed days; independently selected 1/3/5-year and 1/3/6-month predecessors; repeat-application refusal; warning preservation; and unchanged source-file and production-code bytes. It separately checked the production Growth predicate, the 16/11 consumer eligibility split and both deferred legacy refusals. This checks the calculation functions and consumer predicates; it is not a claim of rendered UI or published-return verification.

UTI's recent event crosses all current 1/3/5-year baselines. Verified calculation-copy results through 26 October 2026:

| Plan | 1-year absolute | 3-year annualized | 5-year annualized |
| --- | ---: | ---: | ---: |
| Regular Growth | 6.368509% | 6.812642% | 6.322350% |
| Direct Growth | 6.477841% | 6.910598% | 6.420444% |

These are calculation verification examples from saved data, not new observations or investment recommendations. Previously blocked raw-denomination calculations are not described as returns that the website previously displayed.

For all five ABSL 2021 ETFs, the current five-year period crosses the split; one- and three-year periods do not. Nippon 2019, Birla 2011 and Invesco 2013 events precede all current 1/3/5-year baselines. The ETF period calculations are verification of their calculation copies, not displayed return eligibility. All 27 preserve identical one- and three-month observations and returns. Full saved coverage does not prove inception completeness or agreement with an independent daily NAV source.

## Archive provenance

Discovery used the existing Pages artifact from [run 40735957107](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40735957107), checkpoint **210**, artifact 12837043335. ZIP SHA-256: `fc30433d688f3057b20cd57a9462c3bef985f6a056eb3aabbae84189e2498169`.

The offline scan, evaluated on actual UTC 29 October, covered **8,524 eligible saved histories / 17,267,865 observations**, validating **914 assets**. It found 610 unresolved histories, including 426 with large moves; 30 of these already had recognized adjustments in the baseline. The other 396 remain research candidates with differing blockers. These are checkpoint-210 counts, not a new checkpoint-213 census.

The selected 27 histories were separately verified against live **checkpoint 213**, timestamp **2026-10-29T00:10:48.697Z**, published in [run 40793436577](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40793436577). Retrieved public-manifest SHA-256: `8b0f65e852a6492e3938d5245da25a25416c2d844b0555db45450d4a51ec0180`.

Nineteen selected history shards and the catalogue are byte-identical to checkpoint 210. Updated shards 4361 and 4377 were downloaded from the public archive and passed exact compressed SHA-256, compressed/expanded lengths and production structure validation. Each of six selected histories gains three observations through 28 October while preserving every earlier row and warning. Twenty-two selected compressed assets were revalidated.

| Asset | SHA-256 |
| --- | --- |
| catalogue | `81cb2cf8d22d07caa0ed081c8cbe74600c1e9e975d7813b8cd924e71bb8988e9` |
| 4211 | `9cd67245237767328ac4b9d03b0774e6537a06620d19f611dbed56e2b9403274` |
| 4377 | `99f62498240bd2b775c41bf3d19ee3ebe00bc8af89a25d21a0b920f420cc8a0a` |
| 3166 | `5706f3a5b24cd783cc6c754d1bb393b75f91f8783d78f68dbba81514cc41dc37` |
| 3186 | `6eaa3a3f1c745084565d48142d809fc5594117d1eda22fdcbf6df3b6479e1e19` |
| 3224 | `86a19f13a1b4aaa2a56be8ae2417a24827824c4c5bd3f880b0d69410cc367e61` |
| 3383 | `c4aa0cdfdc911c290cb6c17ad921e37c880827b5ae848b2259172c4f333a1976` |
| 3187 | `f5c01eed789946e54739b04b264e0897e940e6145fbdc28dc76d4e4b4d40c303` |
| 3759 | `55846e2e1cd7cfc9a1c3cad1e5c56540b42ae3a7207550c17fc3bb8acd0c44da` |
| 3597 | `b5b144e8899e27f9a45864ce8ae0af61f924e4b40295dc466900ed789b0f05c4` |
| 3609 | `db4a6aaa150bc8182cb2fcf9d177ca37e93fa3ac798a304cd0ed9f24c7590742` |
| 4361 | `93046afa3b6d526e914c0065f9b8b1c52282c08c5d70c8147c8cffdb45e25b7e` |
| 4558 | `0fa242188b8b51dce35e64051970f73d1ca36a3f81df4d725026de0b39a1147c` |
| 4616 | `7bba4efce8f77047ec4811f91add0678f35327098426780db1ecc2bc9d163a43` |
| 3287 | `3955dac6a785de1a231a05720b67cd7bb6044f589c916e1dceb4e8185bde091a` |
| 3318 | `8e288306a7a0197097c1880758429d3c5cae2840e0308b4d0c664e728dd816bb` |
| 3358 | `6e488a703bd95922527de18bb3bcc7aafada42fcd1d0618c4b80af0c6030d741` |
| 3503 | `1fa07e6ae5f98c249d4512debb8fada97f6101e0cb5625891578af8d198101fe` |
| 3573 | `4fc694e411f659dba740c66b900274842309c2eb683edff0d8c8b034a19ff6c5` |
| 3765 | `86efa7e846d727a48df487e64626f1eac9f74e4265cd848fdb6a6ebc65edc7ce` |
| 3766 | `be565b5a88c963e9313a2b6e1fa4fb4f061399e562eb83a6df9e4aae4800dfae` |
| 3767 | `6e26a3d4a4a217ce53aed3cb5272aaaaf4f6d3c3291b036936ce32fa5679dbea` |

The following hashes identify the saved JSON representations used in the full-history verification, including their existing serialization and trailing newline:

| Code | Observations | Through | Source-file SHA-256 |
| ---: | ---: | --- | --- |
| 134782 | 2,801 | 2026-10-27 | `249e6e1b6b11fcce6b2ba9083af5537ef0a2e3e107cd5ca7c49bcebfa8e0c5bf` |
| 140084 | 2,463 | 2026-10-28 | `11d88cbaa1ea3383ec4cdb3c66c7620b38acfd383e908a726883e9e71816442c` |
| 140087 | 2,463 | 2026-10-28 | `61f84831461e9812d137573c509d78a827224f7607459c022498ce23a77a92d8` |
| 140088 | 2,463 | 2026-10-28 | `c5b53aa1d1eb5a5a25c931cdcefc1bece9b5211d0ef497ddd5ef5e3382e906f9` |
| 140089 | 2,463 | 2026-10-28 | `302c197ec4341e41ae2d9fa25af8e6eb6c03989b6116c66df320332558a62f98` |
| 140095 | 2,371 | 2026-10-28 | `4f48d20e54a18fe60177d4a99ab586350e2caece248881baac5f0cf444a6fc81` |
| 101317 | 4,976 | 2026-10-26 | `eeafff82ed47c36f84a12fff86f3caa84c9ef225ab36f2b66988c8b4ff9f4799` |
| 101976 | 5,721 | 2026-10-26 | `b53dc2dc043b8fee0a24718d8cd04964b7ea4895835342f602f04364e0da2393` |
| 103192 | 5,242 | 2026-10-26 | `62ef893913278de67276fde7a0050e68ac34a15b7fbd7935b9d1b2151c8441f7` |
| 108273 | 4,458 | 2026-10-26 | `fc73f6de953dbfd15c4ceb05b51757e83257a0c0ed1ba7d86d7d728127d7e506` |
| 102012 | 7,021 | 2026-10-26 | `53aa20a41b586e5b868644a901ad6321252d46718a0e16c8772fa38c554363f3` |
| 120304 | 4,556 | 2026-10-26 | `de472e6a466c379e810736e6b85dd92e641a186edbe19774cba23a9a6374736b` |
| 115127 | 3,804 | 2026-10-26 | `ef9cb3423dc2d2d0fd8f275c7a5ebeafcb76b0e0270f1544eebb42fa05a8c24b` |
| 115512 | 3,755 | 2026-10-26 | `67e1c68bfe47f51dbf150de85b231cd83db4340fc090a17f3bc22cf374498f87` |
| 139581 | 2,535 | 2026-10-28 | `f0bd06f396d0cd06bc6002c327fa601be64a1bf61f03fa48a0518c990b3e143c` |
| 145881 | 1,934 | 2026-10-23 | `441a526f5594e323fa0a27a2251c3cdb99e8cb1c629e75bed6b67a3999422937` |
| 147735 | 1,731 | 2026-10-26 | `90077e617dd76d60b0a16dbdba7943e2175e22fede2679ce4025a7870ca5c7cf` |
| 105185 | 4,724 | 2026-10-23 | `1c9a7c7123a90345dc5ddcac3c0e33432706e49c738794d756483454c56ecb15` |
| 106177 | 4,637 | 2026-10-26 | `17bc0d36e9d17316bf5b846151753accd655caac06a1636060f01496d70e6f13` |
| 107477 | 4,506 | 2026-10-23 | `3a625199a329e9ca46c005e5dbdc87980404046b5f1d30826c0bf180db9ae766` |
| 112123 | 4,140 | 2026-10-26 | `657903414f56173b3fd650810fdb242b54452c632da39cc65b26b3fb6b5896e6` |
| 114359 | 3,815 | 2026-10-26 | `b9ddc92ffea30138ee772d75b84ebb4170901b672631bb287e5ea65486493145` |
| 120497 | 3,334 | 2026-10-26 | `cb9a4ef637dc013d3293a28eb8499d7d6db90b230a5189e3b7cb02ea1d7c9dac` |
| 120507 | 3,334 | 2026-10-26 | `4c24e57acb302b3a41d63f914836483be943b92991db4abac6df04d506cd7c45` |
| 120520 | 3,334 | 2026-10-26 | `f61c384c2a742341f4df321b2a38deba08916e8e72273ce4d8e9c1e1e51acbfa` |
| 120541 | 3,334 | 2026-10-26 | `70a918645f63b19b003aa096346c7e022b072fc788716ece50d67c6e10b42cde` |
| 120560 | 3,334 | 2026-10-26 | `e480d239443e82b6f42dec91320e90ced1016333e1aee4b1dfcdb8e12812d9f6` |

## Validation and integration

- Immutable pre-batch corporate-action blob `171801aa720a0f89df80890efbc90e87c5f5b619` refuses all 27 selected histories.
- Locally verified expanded candidate blob: `cc943e729f3c586a9b5009d4f0ceba4a5d846a7b`. All common machinery and prior registrations are byte-identical to the baseline after removing the 94 added registry lines.
- Initial 17-identity red run: **190 cases, 102 passed, 88 expected adjustment-absent failures**, followed by **190/190 passed**.
- Expanded 27-identity red run, before adding Invesco: **303 cases, 252 passed, 51 expected missing-adjustment failures**, followed by **303/303 passed**.
- The expanded tests cover both same-name legacy refusals and the preserved Growth-only consumer predicate.
- Independent full-history checks: **27/27 selected funds, 99,249/99,249 observations, 22/22 assets passed**. Both deferred histories also remain unadjusted with their raw points, hashes and warnings intact.
- The first 17 registrations produce exactly the same calculation copies and action metadata as reviewed blob `944f6d539ca8c33d1928db1fbfd31c6cffb54a88`.
- Independent review of the initial head identified the consumer-eligibility overstatement; the evidence document and PR distinguish 16 eligible Growth histories from 11 registered but blocked ETFs. The consumer gate remains unchanged.
- Initial-head CI passed **938 tests**, typecheck and both builds. Expanded-head suite, typecheck, both builds, focused independent review and actual Pages publication remain integration gates. Final immutable head/run evidence is recorded in the associated PR.

## Follow-up batches

The full audit provides further leads: five Kotak ETFs around February 2026 and ICICI ETF groups of four and five around March/May 2024. The two deferred Invesco legacy plans require exact primary identity evidence before reconsideration. These are candidate cohorts, not verified events or implemented fixes. Each requires exact primary evidence and full-history verification.

UTI Overnight, January 2013 Kotak liquid/money-market events and the discontinued UTI Liquid Growth identity remain unadjusted. Retained raw flags mean calculation-only corrections do not reduce the archive's stored unresolved count.

