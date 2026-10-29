# Nippon Liquid growth plans: verified August 2012 unit consolidation

## Scope and calculation change

Two exact source identities qualify for a calculation-only denomination adjustment:

| Scheme code | Current source name | Growth ISIN | Historical Treasury option |
| --- | --- | --- | --- |
| 100837 | Nippon India Liquid Fund - Regular Plan - Retail Plan - Growth Option | INF204K01UL3 | Retail Growth |
| 100851 | Nippon India Liquid Fund - Regular Plan - Growth Option | INF204K01UN9 | Institutional Growth |

Both must also match **Nippon India Mutual Fund** as the source fund house. The existing official numeric roster contains both codes. At validation on **29 October 2026 UTC**, both passed the production `isActiveRepairCandidate` filter: current membership in the retained verified catalogue, positive NAV dated **26 October 2026**, and the strict 30-day window. The numeric roster does not itself supply the ISIN mapping; the issuer document below does.

The issuer changed the Treasury scheme's face value from **₹10 to ₹1,000 on 5 August 2012**, including every plan/option. The denomination ratio is therefore 100. The calculation copy multiplies earlier NAVs by 100 and preserves the actual market/interest change at the boundary. Raw observations, dates, stored source warnings and archive checkpoints are untouched.

The registry requires the exact old-basis last date **3 August 2012**, first new-basis date **5 August 2012**, an observed factor within **99.9–100.1**, one actual discontinuity and the matching single generated discontinuity warning. Existing invalid/conflicting NAV, unrelated-warning, identity, extra-jump and repeated-adjustment guards remain unchanged. No other fund, option, broad name match or approximately 100× move is authorized by these entries.

## Primary evidence and identity chain

1. **[Reliance's September 2012 half-year report, PDF page 34](https://mf.nipponindiaim.com/InvestorServices/AnnualHalfYearlyReportsFY20122013/Half_Yearly_Portfolio_-_Financials_-_Oct-_2012_-_for_Website_upload.pdf#page=34).** Note 9 under Reliance Liquid Fund — Treasury Plan specifies the 5 August effective date and ₹10-to-₹1,000 change for all options. Note 3 provides the plan NAVs below. Cash Plan is separately listed and is not the historical identity of these two series.
2. **[Nippon issuer scheme summary hosted by NSE, PDF page 120](https://nsearchives.nseindia.com/trading_security/mf/pdf/Nippon_10032026151550_NipponMutualFund.pdf#page=120).** The Liquid Fund sheet maps 100837 to the retail Growth option and INF204K01UL3 (RTA LFGPG), and 100851 to the Growth option and INF204K01UN9 (RTA LFIGG). It reports face value ₹1,000.
3. **[September 2018 issuer half-year financial report, page 33, row 25](https://mf.nipponindiaim.com/InvestorServices/AnnualHalfYearlyReportsFY201819/Half-Yearly-Unaudited-Financials-September-2018.pdf#page=33).** Treasury Plan became Reliance Liquid Fund on **19 May 2018**. The separate Cash Plan became Ultra Short Duration, resolving the potentially confusing names.
4. **[Issuer notice-cum-addendum 76, dated 27 September 2019](https://mf.nipponindiaim.com/InvestorServices/Addenda/Notice-No-76-W12-x-H16.pdf).** It changed the Reliance scheme-name prefix to Nippon India with immediate effect, while retaining the schemes' other features.

The 2012 report does not print these AMFI codes or ISINs. Historical plan attribution uses the dated issuer name chain and the exact saved-history matches at both report dates, with current identifiers independently verified by the issuer sheet:

| Code / historical option | 30 March 2012, issuer / saved | 30 September 2012, issuer / saved |
| --- | --- | --- |
| 100837 / Retail Growth | 25.5142 / 25.51420 | 2666.9413 / 2666.94130 |
| 100851 / Institutional Growth | 26.1133 / 26.11330 | 2739.0884 / 2739.08840 |

The contemporaneous report is the dated corporate-action evidence; an original advance notice was not located. PDF text and page references were checked, without claiming a separate visual inspection of rendered pages.

## Full saved-history verification

The verification used the actual saved source documents from **checkpoint 210**, extracted from successful Pages artifact **12837043335**, run **40735957107**. Its ZIP SHA-256 is `fc30433d688f3057b20cd57a9462c3bef985f6a056eb3aabbae84189e2498169`. The immutable catalogue asset remained unchanged through published checkpoint **213**, so this eligibility input was still the retained verified catalogue. Its retrieval time is **2026-10-27T16:59:52.790Z**; this is not a claim that catalogue freshness recovered.

Both histories have **6,358 observations**, spanning **2 April 2006–26 October 2026**: **12,716 observations** in total. Each contains exactly one generated discontinuity warning and no invalid/conflicting NAV warning. The production history validator reproduces the saved observations and warnings.

| Code | 3 August raw NAV | 5 August raw NAV | Observed ratio | Preserved boundary return | Earlier observations scaled |
| --- | ---: | ---: | ---: | ---: | ---: |
| 100837 | 26.32680 | 2633.88000 | 100.0455809289 | 0.0455809289% | 1,933 |
| 100851 | 27.00940 | 2702.27060 | 100.0492643302 | 0.0492643302% | 1,933 |

Actual-code validation at **2026-10-29T00:17:16.677Z** compared the baseline registry blob `574ee28207abde5d4341c87efd7c2b2baaafb655` with candidate `171801aa720a0f89df80890efbc90e87c5f5b619`. Every point retained its date; exactly the pre-event points changed denomination in the calculation copy. Independent endpoint/day-count CAGR arithmetic matched the production calculation. Post-event 1Y, 3Y and 5Y returns were exactly unchanged. Frozen source inputs and serialized hashes remained unchanged, and a second adjustment was refused.

| Saved evidence | SHA-256 |
| --- | --- |
| Catalogue compressed asset | `81cb2cf8d22d07caa0ed081c8cbe74600c1e9e975d7813b8cd924e71bb8988e9` |
| Shared history-3151 compressed shard | `a916f5cb61f494ef523a436b6b76903463c7ab4136f7063c6c286e6dfd2797eb` |
| 100837 canonical source document | `d66b97eae100cf7abbf4329128d6b51ff39281c7a148a32e0022d08fb35cd74c` |
| 100851 canonical source document | `b6eaa0c68880f4a1d13f407003f1c5669048294273e690b383f73c40c957b9af` |

The shard's compressed **546,205 bytes**, expanded **4,337,517 bytes** and digest were verified before extraction. Canonical source-document hashes use the saved JSON serialization. The focused regression file has 26 cases, including source immutability and negative identity/date/warning/factor guards. Its initial run produced 12 expected failures without the entries; all 26 passed after implementation. Full repository CI and independent review are separate integration gates.

## Limits

This recognizes the two documented denomination changes in detailed financial calculations. It does not edit the archive, erase stored source flags, certify complete inception history, alter the precomputed global return index, infer purchase eligibility or resolve the separate catalogue-source incident. UTI Overnight and Kotak candidate events still lack sufficient primary event evidence and remain unadjusted.
