# Verified UTI distribution unit normalization — 30 October 2026

## Result and scope

This batch adds **14 exact UTI Liquid distribution identities** to the existing calculation-only corporate-action registry. The issuer documented a reduction in face value from **₹1,000 to ₹100**, effective **19 June 2026**. Every retained history in this batch records 19 June as the last old-denomination NAV and 20 June as the first new-denomination NAV. The calculation copy therefore multiplies earlier NAVs by the documented **0.1** factor, subject to the existing identity, event-boundary, tolerance and full-series checks.

The complete retained checkpoint-256 histories contain **53,773 positive observations** across these 14 identities. Production replay and an independent review confirmed that the supported unit event is resolved in every calculation copy. **Zero raw archive flags are cleared, and zero funds gain consumer return eligibility.** The original NAVs, warnings, unresolved flags, history lengths and dates remain intact. These IDCW options remain excluded by the consumer's literal Growth rule; a common unit denomination does not establish distribution-adjusted total returns.

All 14 identities, and the four explicitly excluded UTI candidates, met the production active-repair predicate on the actual review date, **30 October 2026 UTC**: exact official open-ended roster membership, independently verified current MFAPI catalogue membership, and a finite positive latest NAV dated **29 October 2026**. This uses the 30-day condition to select funds and investigates their full retained histories. It does not restrict investigation to the latest 30 days or change the website's seven-day discovery rule.

Evidence is provided in the [exact identity ledger](evidence/2026-10-30-uti-distribution-identities.json), [production replay output](evidence/2026-10-30-uti-distribution-replay.json), and [portable replay program](evidence/2026-10-30-uti-distribution-replay.mjs). The earlier [checkpoint-255 non-Growth review](NON_GROWTH_REVIEW_2026-10-30.md) remains a separate historical snapshot.

## Primary evidence chain

The authorization combines three different primary records; no source is used as a substitute for a missing part of the identity chain.

| Record | What it establishes | Location |
| --- | --- | --- |
| UTI Addendum 14/2026–27, dated 4 June 2026, and NSE notice 74721, dated 16 June 2026 | UTI Liquid Fund's ₹1,000-to-₹100 face-value change, effective 19 June 2026 | [Original NSE ZIP containing both notices](https://nsearchives.nseindia.com/content/circulars/NMF74721.zip) |
| UTI March-2026 Scheme Summary Document | Exact numeric scheme codes, plan/distribution options, pre-event ISINs and original face value | [Original issuer SSD hosted by NSE](https://nsearchives.nseindia.com/trading_security/mf/pdf/UTI_10032026180054_UTIMutualFund.pdf), PDF page 114, fields 10, 28 and 29 |
| CDSL communiqué 2026/416 | New payout and reinvestment ISINs for the exact plans/options, face value ₹100, admitted on 18 June 2026 | [Original CDSL communiqué](https://www.cdslindia.com/eservices/Publications/DownloadFile?eventID=DP2026-416&method=communique), PDF pages 5–8 (printed Annexure pages 4–7) |

The CDSL admission date is an identifier admission date, not the NAV transition boundary. Neither notice explicitly establishes close-of-business NAV timing. The implementation retains the documented 19 June effective date in its label and separately requires the actual saved 19 June/20 June boundary. It does not change the legal date to fit the series.

Original downloaded bytes are pinned by SHA-256 in the identity ledger. The NSE ZIP is `b0b810c51b8307af39fae035455977c86c966613a3502d36fe1dbaab00710dde`; the issuer addendum inside it is `87b61495aa0150dda94f627fcc90e4dfeb88622481c2975ea1c4b044d51d3cdb`; the NSE PDF is `db0962b621f4c59393dd27f9e2ce61845fd854988eb6a0082b2331cfcefd347e`. The CDSL PDF is `1bfde588087093f8d1fc53564f5fafae0d928539f2c46ef538e9f2fe181beef6`; the SSD is `1cb76ea553debbd2a9993aad950a2f8cccbd91f656a781503f216956fa06c1f8`.

### Exact approved identities

All rows are UTI Liquid Fund IDCW options. P/R means payout/reinvestment. A dash means the current payout field is actually null and must remain null for the registry match. The source model's field named `isinGrowth` holds the payout ISIN for these distribution options; the field name does not make them Growth funds.

| Code | Plan and frequency | Pre-event ISIN P / R | Current ISIN P / R | CDSL PDF page: row |
| --- | --- | --- | --- | --- |
| 102010 | Regular Daily (Reinvestment) | — / INF789F01PG3 | — / INF789F1AF77 | 7:59 |
| 102011 | Regular Monthly | INF789F01PI9 / INF789F01PJ7 | INF789F1AF93 / INF789F1AG01 | 8:61–62 |
| 120558 | Direct Daily (Reinvestment) | — / INF789F01XP8 | — / INF789F1AD38 | 5:35 |
| 120794 | Direct Monthly | INF789F01XR4 / INF789F01XS2 | INF789F1AD53 / INF789F1AD61 | 5:37–38 |
| 133973 | Regular Annual | INF789FA1J66 / INF789FA1J74 | INF789F1AD12 / INF789F1AD20 | 5:33–34 |
| 134427 | Direct Annual | INF789FA1K63 / INF789FA1K71 | INF789F1AE45 / INF789F1AE52 | 6:46–47 |
| 135721 | Regular Quarterly | INF789FA1J25 / INF789FA1J33 | INF789F1AG43 / INF789F1AG50 | 8:66–67 |
| 139838 | Regular Fortnightly | INF789FA1J09 / INF789FA1J17 | INF789F1AF28 / INF789F1AF36 | 7:54–55 |
| 140024 | Direct Quarterly | INF789FA1K22 / INF789FA1K30 | INF789F1AE03 / INF789F1AE11 | 6:42–43 |
| 140504 | Direct Half-Yearly | INF789FA1K48 / INF789FA1K55 | INF789F1AE29 / INF789F1AE37 | 6:44–45 |
| 140517 | Regular Flexi | INF789FA1J82 / INF789FA1J90 | INF789F1AF02 / INF789F1AF10 | 7:52–53 |
| 140913 | Direct Fortnightly | INF789FA1K06 / INF789FA1K14 | INF789F1AD87 / INF789F1AD95 | 5:40; 6:41 |
| 141768 | Direct Flexi | INF789FA1K89 / INF789FA1K97 | INF789F1AE60 / INF789F1AE78 | 6:48–49 |
| 144475 | Regular Half-Yearly | INF789FA1J41 / INF789FA1J58 | INF789F1AF51 / INF789F1AF69 | 7:57–58 |

The registry requires the numeric code, complete option name, `UTI Mutual Fund`, and both current ISIN fields to agree. It does not extend authorization by family name. The independent primary identity review originally used checkpoint 255; the final production replay uses checkpoint 256 and confirms the same exact identities. Both snapshots retain their own hashes and dates in the evidence.

### Four candidates deliberately excluded

| Code | Candidate | Missing evidence |
| --- | --- | --- |
| 102007 | Legacy discontinued periodic dividend | No exact numeric-code bridge in SSD field 29. New CDSL securities alone do not establish this historical code's identity. |
| 102008 | Legacy discontinued monthly dividend | No exact numeric-code bridge; an unnamed IDCW entry cannot be substituted for the documented current monthly option. |
| 102013 | Regular Weekly IDCW | Reinvestment chain `INF789F01PK5` → `INF789F1AG19` is supported, but current payout `INF789F1AH83` lacks retrieved primary support. |
| 120777 | Direct Weekly IDCW | Reinvestment chain `INF789F01XT0` → `INF789F1AD79` is supported, but current payout `INF789F1AH75` lacks retrieved primary support. |

A September CDSL communiqué is a research lead for the two weekly payout identifiers. The original endpoint returned HTTP 403, and its later admission date would still require reconciliation with the June event. No secondary listing was promoted into an exact June identity authorization. All four histories remain unregistered and calculation-quality blocked in the replay.

## Full retained-history verification

The source is artifact **13008571816**, `github-pages-41119482529-1`, from the [successful checkpoint-256 collector run](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/41119482529). Its ZIP SHA-256 is `c0720aa4212ba3efe41c4336fcb37f837fe73c5037d0c9ac0fdc47d554a671a1`. The archive manifest SHA-256 is `0cea4ec864490977b8914f4b50293f98f82c3327f9a3c1951a1aa1a28ab38bd2`; checkpoint time is **2026-10-30 20:01:41.985 UTC**.

The replay verifies the compressed catalogue and all 13 required history shards against the manifest, including digest and compressed/expanded size. It uses the production archive validators, active-repair predicate, normalization, quality checks and consumer ranking functions. Catalogue membership was independently verified from the MFAPI list at **19:58:19.963 UTC**; the official roster is dated 26 October 2026. No new provider history requests are made by the replay.

| Code | Retained observations | First saved date | Last saved date |
| --- | ---: | --- | --- |
| 102010 | 7,024 | 2006-04-01 | 2026-10-29 |
| 102011 | 7,024 | 2006-04-01 | 2026-10-29 |
| 120558 | 4,556 | 2013-01-01 | 2026-10-26 |
| 120794 | 4,527 | 2013-01-10 | 2026-10-26 |
| 133973 | 3,777 | 2015-02-20 | 2026-10-27 |
| 134427 | 3,456 | 2015-03-31 | 2026-10-29 |
| 135721 | 3,517 | 2015-11-09 | 2026-10-29 |
| 139838 | 3,226 | 2016-08-25 | 2026-10-28 |
| 140024 | 3,186 | 2016-10-04 | 2026-10-28 |
| 140504 | 2,891 | 2017-01-05 | 2026-10-29 |
| 140517 | 2,808 | 2017-10-17 | 2026-10-28 |
| 140913 | 2,981 | 2017-03-06 | 2026-10-29 |
| 141768 | 2,595 | 2017-08-14 | 2026-10-28 |
| 144475 | 2,205 | 2018-07-26 | 2026-10-28 |
| **Total** | **53,773** | | |

“Full history” here means every retained observation in these checkpoint records, not proof that every historical source observation exists. Some saved histories trail their catalogue's 29 October NAV; that remains visible in the row-level evidence. No missing observations are synthesized to remove those lags.

For each approved history, replay asserts:

- The raw input's serialized hash is unchanged after calculation.
- Point counts, dates and order are preserved; every pre-20-June value equals the raw NAV divided by ten within `1e-9`, and every later value is unchanged.
- The documented factor is fixed at `0.1`, rather than inferred from the observed price ratio. The existing `0.0001` factor tolerance remains unchanged.
- Exactly one expected raw discontinuity matches the authorized 19 June/20 June boundary; no unexplained move above 40% remains in the calculation copy.
- A second adjustment attempt is refused.
- One-, three- and five-year consumer returns and three-year maximum drawdown remain null. The archived consumer ranking is also absent.

Focused behavioral tests also verify that independent invalid/conflicting-value quality warnings and unmatched discontinuity warnings prevent normalization, while unrelated non-quality warnings are retained.

The four excluded histories add **25,564 retained observations** to the negative replay. They remain raw and blocked. The replay records per-document, per-fund and calculation-point hashes and pins the 15 production source files it imports.

### Reproduce the calculation review

From the repository version containing this batch, extract the artifact's archive directory and run:

```bash
node docs/evidence/2026-10-30-uti-distribution-replay.mjs /path/to/archive /tmp/uti-distribution-replay.json
```

The output must be outside the input archive. The program verifies the exact checkpoint-256 manifest and runtime source hashes before evaluating records. Its `2026-10-30` date is an explicit historical evidence snapshot, not an operational selector for future collection. The production collector continues to use its actual runtime date.

## Collector observation and diagnostic change

The normal scheduled root run **41119482529** advanced the archive to checkpoint 256 and published it successfully. The root's continuation job verified the exact public checkpoint at **20:07:09.596 UTC** and received the successor dispatch acknowledgment at **20:07:11.242 UTC**. The [position-2 child, run 41120732139](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/41120732139), failed at **20:07:20.399 UTC** with `backfill_root_invalid`, before archive reads or NAV collection. Its original ancestor API response was not logged. Later API `updated_at` values are not treated as job completion times.

This batch adds three production lines to emit `backfill_ancestor_observed` for each initial or refreshed ancestor response, before validation. The log contains only run/ancestor IDs, root-or-parent role, expected/observed title, attempt, event, status and conclusion. Tests verify both diagnostic coverage and exclusion of unrelated API fields and credentials.

This is diagnostic instrumentation, not a claimed fix for the unidentified failure. All attempt/title/event predicates, accepted state combinations, rejection codes, three-minute lineage wait, 15-minute pacing, 12-run/four-hour limits and checkpoint/publication checks remain unchanged. The next ordinary root trigger can provide the missing observation if the failure recurs; no failed job is repurposed into a new chain and no continuation inputs are fabricated.

### Checkpoint-256 accounting

These are observed counts at the saved checkpoint, not live guarantees or effects attributed to this unit-normalization patch. Buckets overlap.

| Measure | Active repair scope | Full retained archive |
| --- | ---: | ---: |
| Eligible / listed identities | 8,542 | 38,026 |
| Saved histories | 8,542 | 37,400 |
| Clean raw histories | 7,939 | 33,878 |
| Raw quality flags | 603 | 3,522 |
| Source gaps | 76 | 696 |
| Refresh or reconciliation pending | 3,550 | 32,142 |
| First attempts pending | 0 | 8 |

Within the root's same final eligible cohort, pending refresh/reconciliation fell from **3,720 to 3,550**, an improvement of **170**, during **192 history attempts**. One attempt recorded `source_transport` for code `119784`. There was no recorded source-wide retry time or catalogue error at the final checkpoint. The active cohort changed from checkpoint 255, so direct subtraction of those separate snapshots is not used as a repair count.

## Research advanced but not implemented

The [pending follow-up evidence](evidence/2026-10-30-followup-research.json) preserves the primary URLs and reasons these candidates remain blocked.

**Taurus Large Cap Regular Growth, 101209.** The issuer's exact identity and NAV table support three missing values: 11 and 12 November 2006 at **34.68**, and 18 November 2006 at **34.25**. Eight surrounding retained values match. However, five bounded issuer exports expose an independent contradiction: **28 May 2019 appears at both 75.76 and 75.77**, also confirmed in the issuer HTML. There are 4,853 unambiguous shared-date matches, no unambiguous mismatches, and 211 archived dates absent from those exports (six within their range and 205 later). No source value is selected silently and no new Taurus review is registered.

**Four remaining ETF histories.** Primary ICICI notices establish two Gold ETF face-value changes for `113076` (2016 and 2018), and NSE/issuer records establish the Nifty 100 ETF `123004` change in May 2024. These do not fill the independent multi-year gaps. Gold ETF has three identified gaps, including the newly recorded 2012-08-13 to 2014-06-12 gap. Axis Gold `113434` still has an excluded invalid observation without its date and incomplete original split terms; ICICI Nifty 50 `121366` still has its 2014–2018 gap. None gains a new complete-chain adjustment in this batch.

**Other Growth candidates.** Existing Sundaram reviews for `119566` and `119635` require actual retained rejected-date provenance before activation. PGIM Overnight needs the original dated conversion terms; JM Overnight has an unresolved notice/NAV-date discrepancy; the ICICI 2009 group needs dated primary terms and complete historical identity links. The PGIM Ultra Short Term jump is being investigated as a possible economic recovery gain, not a unit split. No guessed factor, date, interpolation or broad warning exemption is added.

## Validation and delivery boundary

The focused UTI tests contain 17 cases, including all 14 positive identities, exact-identity negatives, boundary/factor/independent-warning failures, repeat-adjustment refusal, raw immutability and the actual consumer ranking gate with a positive Growth control. The collector tests contain 33 cases; test-first runs demonstrated the new diagnostics were absent before the logging change.

The full behavioral suite passed **1,862 tests**, with zero failures or skipped tests, and TypeScript checking passed. Both the Worker and Pages production builds passed; their existing large-bundle warnings remain. An independent reviewer approved both production changes and independently replayed all 53,773 approved observations. Evidence, links and exact remote contents are reviewed before merge; CI and the resulting Pages deployment must be verified separately before reporting the change as live.

This report documents the implemented and locally verified batch. A commit or test result alone does not establish deployment, a repaired raw archive, complete historical coverage or IDCW total-return suitability.
