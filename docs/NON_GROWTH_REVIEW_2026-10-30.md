# Non-Growth history review and publication recovery — 30 October 2026

## Result

The bulk review covers all **420 active, unresolved non-Growth histories** in checkpoint **255**, including **1,640,171 retained NAV observations**. It also replays the 183 unresolved Growth histories to reconcile the full active cohort. The review adds **no new NAV correction, unit factor, restored observation, or warning exemption**. Its deliverable is a complete, reproducible classification and an exact evidence queue.

The failed publication-verification job was recovered separately. The unchanged controller verified the live checkpoint at **19:17:50 UTC / 3:17:50 p.m. Toronto** and stopped with `recovery_attempt`, `dispatched: false`. The recovery made no NAV requests, archive writes, or successor dispatch.

Source code is pinned to main **`55ff6ad03be436189cd77dd9f627c5f756032d8b`**. The saved checkpoint timestamp is **`2026-10-30T16:27:23.820Z`**. These are dated observations, not live guarantees or a claim that the cleanup is complete.

## Active scope and current backlog

Eligibility uses the unchanged production `isActiveRepairCandidate` predicate on the actual audit date, **30 October 2026 UTC**. A scheme must appear in the manually supplied official open-ended roster and the verified current catalogue, with a finite positive NAV dated **30 September–30 October 2026 inclusive**. The complete saved history of each eligible scheme is examined. Recent NAV reporting does not establish purchase eligibility. The website's seven-day discovery rule is unchanged.

| Active repair measure | Checkpoint 255 |
| --- | ---: |
| Eligible scheme identities | 8,544 |
| Eligible schemes with saved history | 8,544 |
| Eligible schemes without a saved history | 0 |
| Saved histories without an unresolved flag | 7,941 |
| Saved histories with an unresolved flag | 603 |
| Refresh or reconciliation pending | 3,648 |
| Latest source refresh failures, with earlier history retained | 75 |
| Saved history date behind the catalogue | 3,267 |

The pending, source-error, date-lag and unresolved sets overlap. **Do not add them.** Saved history does not prove complete coverage from inception.

The original collector tranche attempted **212 histories** and reduced active refresh/reconciliation pending from **3,843 to 3,648**, while source errors fell from **76 to 75**. Those changes occurred during the original run. The verification-only recovery left these counts unchanged.

The full retained archive is separate: 38,026 catalogue identities, 37,400 saved histories and 3,522 unresolved histories. The other **29,482 catalogue identities** remain outside this audit's active repair scope; exclusion does not mark them repaired or delete their data.

## The complete 420-history batch

The groups below are exclusive. Explicit IDCW/dividend names are classified before ETF names, so a fund of funds that mentions its underlying ETF is not counted as an ETF merely because of that text.

| History group | Reviewed | Existing calculation basis passes the quality gate | Still quality-blocked |
| --- | ---: | ---: | ---: |
| IDCW / dividend / distribution options | 353 | 0 | 353 |
| ETFs without a literal Growth option name | 52 | 48 | 4 |
| Bonus, unclaimed, or unspecified options | 15 | 0 | 15 |
| **Non-Growth total** | **420** | **48** | **372** |

The **48** successful ETF calculations use unit adjustments already registered in previous releases. This pass does not add those adjustments or establish distribution-adjusted total returns. All 420 remain outside the unchanged literal-Growth consumer rule. Their original archive flags and NAV observations remain available.

The other **183 Growth histories** reconcile to 84 that pass the current calculation-quality gate and 99 that remain blocked. Of the 84, 74 use existing unit adjustments and nine use existing verified NAV reviews. One unchanged history, **148595**, has a coverage-related unresolved flag without a calculation-blocking NAV warning. Consequently, **84 is not a count of 84 repairs or 84 complete histories**. Its unresolved archive status still excludes it from the precomputed ranking index.

### What still needs evidence

Among the 420 non-Growth histories:

- **121 histories** retain invalid-observation warnings. Their warning counts describe **3,340 previously excluded observations**, not invalid values remaining in the sanitized archive.
- **87 of those histories** retain complete dated-zero evidence covering **3,003 rejected zeros**. The other **34 histories** lack complete dated evidence for their **337 excluded observations**. Dated evidence identifies a rejected row; it does not supply a valid replacement NAV.
- **267 histories** still contain unexplained threshold boundaries, totaling **306 adjacent moves above 40%** after existing verified adjustments. These counts overlap the invalid-warning group. A multi-year gap, cash distribution, unit event, economic movement and upstream error require different evidence.
- **15 other non-Growth histories** include bonus and unclaimed options or short names with no clear Growth designation. Their exact scheme codes and ISINs are retained in the row-level record. Their option identity must not be inferred from a similar fund name.

The largest grouped evidence tasks include 52 Invesco distribution histories with discontinuity-only warnings, 37 Nippon distribution histories in that class, and 30 UTI distribution histories in that class. Invalid-only distribution groups include 47 Axis, 16 LIC and 14 Sundaram histories. These are investigation groups, not confirmed shared causes or authorized blanket repairs.

## Exact ETF and fund-of-funds follow-up

| Code | Saved identity | Remaining evidence requirement |
| --- | --- | --- |
| 113076 | ICICI Prudential Gold ETF | Resolve the long saved-history gaps at 2010–2012 and 2014–2018, and verify the complete dated unit-event/history chain, including the November 2018 boundary. |
| 113434 | Axis Gold ETF | Obtain exact terms for the 24–27 July 2020 boundary **and resolve its independent one-observation invalid-NAV warning**. Unit-event evidence alone is insufficient. |
| 121366 | ICICI Prudential Nifty 50 ETF | Resolve the 1,482-day saved-history gap from 12 June 2014 to 3 July 2018. The accumulated move across that gap is not proof of a split. |
| 123004 | ICICI Prudential Nifty 100 ETF | Resolve the same 2014–2018 gap and obtain exact target-identity evidence for the 10–13 May 2024 boundary. |
| 116075 | Invesco India Gold ETF Fund of Fund, Regular IDCW | Obtain the exact issuer-published 25 October 2019 NAV for this option. The saved value is 0.1880. This is part of the distribution cohort. |
| 120530 | Invesco India Gold ETF Fund of Fund, Direct IDCW | Obtain the exact issuer-published 25 October 2019 NAV for this option. The saved value is 0.1913. This is part of the distribution cohort. |

The six identities, ISINs, full saved warning sets, exact neighboring observations and evidence gaps are in the [ETF and fund-of-funds follow-up](evidence/2026-10-30-etf-followup.json). Previously identified public-source links are retained as leads. Primary issuer/exchange retrieval was unavailable during this pass; no new primary publication was obtained or verified. Evidence for a Growth sibling, another ETF, a month-end value, an underlying ETF wealth series or a price ratio does not establish a replacement observation for one of these options.

## Publication recovery

[Run 41088053495](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/41088053495) originally saved checkpoint 255 and successfully built and deployed it. Its continuation job failed with `published_checkpoint_not_verified` after the existing six bounded verification reads. The original logs did not retain the response or mismatch reason.

Only the [failed continuation job](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/41088053495/job/124183622894) was rerun. The [recovery job 124263566727](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/41088053495/job/124263566727) verified exact sequence, timestamp, counts, catalogue reference and all shard references, then stopped under the existing recovery guard. The run is successful on attempt 2. Its archive, build and deployment jobs retain their original execution timestamps.

This proves that the unchanged publication verifies now. It supports a transient verification failure but does not distinguish publication propagation, a stale response, HTTP failure, transport failure or JSON/read failure. No gate, timeout, source budget, retry backoff, schedule or continuation limit was changed. The completed recovery did not start another collection chain; at the recorded post-recovery check, no Actions run was running or queued. Later collection depends on a normal authorized trigger.

## Verification and reproducibility

The artifact ZIP is **`12993856840`**, from run **`41088053495`**, with SHA-256 **`2e276f02939f78f79c23db3304448dd73a23e3c97680cd7fa4984e005fc4720a`**. Its exact published manifest is retained below. The original checkpoint Release URL and digest are retained in the recovery record, so the evidence does not rely only on an expiring Actions artifact.

The audit verifies compressed SHA-256, compressed length and expanded length for the catalogue and all **1,615 history shards**, then runs the production catalogue/history validators. All **37,400 retained history identities** pass validation. The replay preserves input objects and raw warnings. Validation concerns the retained positive observations; it does not recover previously rejected rows or prove missing historical dates are complete.

The replay script pins the manifest digest, checkpoint sequence, historical scope date and production source Git blob hashes. Use **Node.js 24.22.1 or a compatible Node 24 runtime with native TypeScript support**, a checkout at the pinned source commit, and the immutable extracted archive:

```bash
node docs/evidence/2026-10-30-non-growth-audit.mjs /path/to/checkpoint-255/archive /path/to/audit-output /path/to/pinned-repository
```

This is an offline historical replay. Running it later does not select a current repair queue. It makes no provider requests and writes only its audit output files. Product tests are not required for this documentation/evidence-only change; validation consists of the actual replay, independent source/data checks, report reconciliation and link/diff review.

## Evidence inventory

- [Summary and exact source pins](evidence/2026-10-30-non-growth-summary.json)
- [All 603 flagged-history replay records](evidence/2026-10-30-flagged-history-replay.json), including the complete 420-history non-Growth batch
- [Sortable row inventory](evidence/2026-10-30-flagged-history-replay.csv)
- [Portable offline replay](evidence/2026-10-30-non-growth-audit.mjs)
- [Exact checkpoint-255 published manifest](evidence/2026-10-30-checkpoint-255-manifest.json)
- [ETF / fund-of-funds evidence queue](evidence/2026-10-30-etf-followup.json)
- [Original failure and verified recovery](evidence/2026-10-30-collector-recovery.json)

The review batch is complete. Source-data reconciliation remains open, with all unsupported cases explicitly retained in the evidence queue.
