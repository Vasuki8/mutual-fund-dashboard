# ICICI Prudential Overnight Fund — unit consolidation (2022)

## Official source and scope

ICICI Prudential Asset Management Company's **Notice-cum-Addendum No. 011/07/2022**, dated 28 July 2022, states that the face value of ICICI Prudential Overnight Fund units changed from **₹100 to ₹1,000** effective **16 August 2022**. Existing investor units were adjusted proportionately; the change was not an economic return.

The announcement appears in the [AMC notice in Financial Express, 29 July 2022, newspaper page 10 / PDF page 2](https://nsearchives.nseindia.com/corporate/CHALET_29072022144748_NewspaperAdvertisement29072022.pdf#page=2), retained in an NSE filing. It names the scheme without a Direct-only restriction. The implementation is restricted to the independently verified Growth identities **145536, ICICI Prudential Overnight Fund – Direct Plan – Growth**, and **145535, ICICI Prudential Overnight Fund – Regular Plan – Growth**. Exact code/name pairs are required. IDCW and unclaimed options remain excluded.

## Calculation-only normalization

When the saved MFAPI history contains **exactly one** >40% discontinuity warning, the derived-calculation layer checks the original ascending source NAV observations. It must observe a single positive approximately **10:1** jump across the published action date, with the previous NAV dated exactly 16 August 2022 and the next NAV dated exactly 17 August 2022, as confirmed from the immutable FundScope checkpoint 180. It verifies the series has no duplicate dates, invalid values or additional >40% movements.

**Only then** are source NAV values through **16 August 2022** multiplied by **10** in a temporary financial-analysis copy. The latest reported NAV, raw NAV chart, raw-history CSV, saved observations, source warnings and GitHub archive records remain unchanged. Any other unexplained discontinuity, invalid NAV, conflict, unrelated scheme, IDCW option or failed boundary check preserves the blocking safety gate.

The normalized copy may feed Growth-option performance, drawdowns, monthly risk, holding periods, SIP illustration and selected-fund comparisons. These results must clearly disclose the unit adjustment. The correction is not generalized to unrelated scheme codes or inferred from a threshold alone.

## Observed boundary evidence (read-only)

The 26 October 2026 diagnostic, [GitHub Actions run #40420487789](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40420487789), loaded checkpoint **180** and verified the Direct Growth history. A read-only inspection on 27 October independently checked both exact immutable shard references against their compressed SHA-256, compressed length and expanded length, then validated each shard and its checkpoint state.

| Scheme | Saved positive observations | >40% moves | Verified 16–17 August 2022 ratio |
| --- | ---: | ---: | ---: |
| 145536 — Direct Growth | 2,455 | 1 | 10.00138143× |
| 145535 — Regular Growth | 2,455 | 1 | 10.00135726× |

Both histories cover 15 November 2018 through 25 October 2026. The source document, checkpoint state and reparsed history each report only the single discontinuity warning; neither has an invalid-NAV or conflicting-date warning. Applying the documented factor through 16 August leaves no >40% moves. This does not clear either archive's unresolved state.

The Direct Growth shard SHA-256 is `722583a214af58914e1d194f1ef6670e0d47440591d0dbee42f805011abc0026` (161,352 compressed bytes; 1,222,494 expanded bytes). The [Regular Growth shard](https://github.com/Vasuki8/mutual-fund-dashboard/releases/download/fundscope-mfapi-v2-data-000004/history-4547-6bf8d0d2bd820a8a8a70ea653e6bc28ecc6ff1461a15a82c7e071bfa63d57e48.json.gz) SHA-256 is `6bf8d0d2bd820a8a8a70ea653e6bc28ecc6ff1461a15a82c7e071bfa63d57e48` (127,281 compressed bytes; 900,946 expanded bytes). Regular Growth metadata identifies ISIN `INF109KC17E3`; [ICICI Bank's scheme-code roster](https://www.icici.bank.in/personal-banking/loans/loan-against-securities/approved-list) independently maps code 145535 to Regular Growth. Neither the inspection nor this adjustment overwrites the source history.

The AMC notice gives an **effective corporate-action date of 16 August**, but the saved NAV observations switch their unit basis on **17 August**. We therefore use the verified NAV boundary, not the legal effective date, for the calculation-only transform.

## Remaining limits

- Source NAV values at the action boundary must independently satisfy the conservative 10:1 verification at runtime. A mismatch fails closed; the user will continue to see the warning rather than an invented return.
- A historical move outside this AMC-documented action still needs independent evidence. A generic large move must not be automatically repaired by dividing it away.
- The published global return index excludes unresolved source histories until its separate archive-quality policy is reviewed; this targeted update does not modify historical checkpoint accounting or certify every previously flagged record.
- This feature is a documented adjustment of one corporate action, not a claim that the data source's full mutual-fund dataset has commercial redistribution clearance.
