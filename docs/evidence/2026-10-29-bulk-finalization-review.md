# Independent whole-branch review — 29 October 2026

Reviewer: fresh `finalization_independent_review` agent, independently reading the implementation, baseline diff, primary evidence and tests. This reviewer did not edit production code.

**Verdict: changes requested for one Important export-provenance defect.** The calculation core and four evidence-supported identities are acceptable on the evidence inspected. The implementer accepted the export finding and is preparing remediation. This report does not imply that later remediation hashes, final CI, merge, deployment, or live artifacts have been reviewed or verified by this reviewer.

## Scope and immutable basis

The baseline is main `cac0463a0d9f71b22aa365ce1d1c6a9524de9e2b`, read directly from `base-source.tar.gz`, SHA-256 `d7dc1556355058d78035c394302a6f7e1dc34fd2754da64540d2afc64933d7f3`. It was not replaced or modified. I read `AGENTS.md`, the bulk-finalization design and implementation plan, then compared all five modified existing production files directly with this archive and inspected the new review module, three new test files and both fixture helpers. I also traced downstream calculation and export consumers.

The initially reviewed production files were:

| File | SHA-256 |
|---|---|
| `src/lib/verified-nav-reviews.ts` | `f758fd903a5d54e28617e0aec307c2db32ee15d1e8d3f902e823d28cb5c60849` |
| `src/lib/corporate-actions.ts` | `48c79e3b6bc58211effe5d801f468c3431d1705de056789d69d75b78bb44cc77` |
| `src/lib/format.ts` | `37985e48f63dc26a2a5cc7e1ef2c45f054a22ceec4d780bb92160f29d661c19c` |
| `src/components/FundDetail.tsx` | `be6fe6062aef57f9d797045c9a701d8e6d69ab7c36ac30ec3d56d3fa51cd39c1` |
| `src/components/Comparison.tsx` | `33731dd7da9641771e9809c7a16611a481f0387d2e8e1b906cd42b69d79d855a` |
| `src/components/SipSimulator.tsx` | `0c400087948d41f0f4a87984f40cb29300b91a28d376ba0d7c3defa7edb9be83` |

Reviewed new test hashes: `verified-nav-reviews.test.ts` `921dad130c348e1dd225711665210863374f5c8e18fdf48613763aebe95cf600`; `absl-source-corrections.test.ts` `1d780b92c64138d7a73cf974fad991f3b81c6892be886a23a98d0b87a78b2605`; `verified-nav-review-views.test.ts` `2ec85192f30187971d4c25214e10c3f34a5cbdedaef0b91e1627a6cec4c6ff34`; fixtures `boi-nav-review.ts` `1db3bd70d24f892d5a374fb1be4cb7d8df2a391526b789175bc593054e86cfba` and `absl-nav-review.ts` `e4dce284e247139fb7257ec49d408eb6aca4b1c56700287a1aa86d4a61a2aa7c`.

## Findings

### Important I1 — nested comparison CSVs silently lose reviewed calculation provenance

`Comparison.tsx` passes corrected `loadedDatasets` and corrected aligned series to `PlanComparison`, `SelectedPeers`, and `ReturnCorrelation`. The initially reviewed branch adds review metadata only to Comparison's own CSV. All three child components have their own downloadable CSVs, and none receives or emits the new review metadata.

This is especially concrete in `PlanComparison.tsx` around its `exportPlans` handler: it labels the data source `MFAPI validated Growth NAV observations`, exports `Direct NAV` / `Regular NAV`, and includes only the original MFAPI source links and retrieval times. When both BOI plans are selected, its 31 March 2022 row contains Direct `10.4219` and Regular `10.2756`, even though the raw MFAPI observations are respectively `9.7667` and `9.6296`. The CSV contains no review date, replacement values, issuer source link, or retained-economic-event explanation. The page's visible notice does not accompany a separately downloaded file.

I reproduced this by transpiling and executing the real `PlanComparison` component, passing the actual `financialNavBasis` results and common aligned series, then invoking its actual CSV button handler. See `nested-export-finding-reproduction.json`; `hasReviewProvenance` is false while `correctedInputsHaveReview` is true. This is a behavior observation, not solely a text search.

`SelectedPeers.tsx` and `ReturnCorrelation.tsx` have the same metadata omission for exported derived returns/statistics. The peer path can be reached by selecting one reviewed plan with a distinct clean fund of matching category/plan. Correlation can be reached for reviewed histories with enough complete monthly observations. Their numerical consumers use the reviewed values correctly; the exported attribution is incomplete.

Recommended bounded fix: carry optional review metadata from Comparison into these three components and include per-scheme correction/economic-event provenance in their CSVs, preserving existing unreviewed export behavior. Add behavioral tests of the real child handlers and parent-to-child metadata flow. The original new view harness stubs these three children, which explains why its main-export tests pass without catching this omission.

Status: **accepted by root; remediation pending at this review's conclusion.** Root should establish failing-before/passing-after coverage and rerun applicable gates before release. A change to `format.ts` must also update the audit's explicit expected-delta assertion; otherwise the offline proof becomes stale.

### Minor M1 — pre-existing PNG downloads omit provenance outside the chart canvas

`Chart.tsx` around `exportChart` downloads only ECharts' canvas. The title/subtitle, metadata and newly added review notice are rendered outside that canvas. This was already true on the immutable baseline, so all historical PNG exports have this limitation; it is not a new blocker for the four exact corrections. The page itself visibly explains the reviewed basis. If exported chart images are later required to stand alone as attributed financial evidence, the export should incorporate the chart title, basis and source caption.

No other Critical or Important finding was identified in this pass. `DrawdownEpisodes` has no export handler. FundNotes and workspace backups use their existing raw-storage paths, not these calculation copies.

## Core behavior and evidence assessment

The runtime matching is exact for scheme code, complete case-sensitive name, issuer, Growth ISIN, absence of dividend-reinvestment ISIN, open-ended type, category and `mfapi.in` source. A partial match cannot fall through to a generic source correction. Both identities in each pair are separately specified; crossing a Regular/Direct code, label or ISIN fails closed.

The complete supplied series must have real ISO dates, positive finite NAVs, strictly increasing unique dates and sufficient points. Exactly one exact generated two-jump warning is required; invalid-NAV and conflicting-value warnings independently block review. Every large movement is rescanned both before and after the one-point substitution. Additional past, middle or future jumps cannot be concealed by an expected warning count.

BOI requires the precise 23/24 April 2020 and 30/31 March/4 April 2022 adjacent anchors. The 31 March value may be only the known bad value or the independently verified value. An inserted observation between 31 March and 4 April, a changed anchor, a third replacement candidate, or a new threshold jump rejects the entire operation. The calculation series retains the approximately 50.22% credit loss and 121.83% gain. `adjusted` remains false, with no unit adjustment fields. An already primary-correct source is described as needing no substitution. Reapplying the basis to the calculation copy does not repeat the correction; its informational warning remains available even though the returned second basis has no new `review` metadata.

ABSL requires exactly the known bad 10 April 2019 source point with consecutive exact 9/10/11 April observations. Raw jumps must be precisely the spike and reversal; the corrected complete series must have zero threshold jumps. `events` is empty. Already corrected clean input receives no override; an already corrected point with the stale two-jump warning remains blocked. There is no invented economic event or factor.

All raw points, source warning strings, retrieval/cache/archive metadata and source inputs remain immutable. Only the calculation copy changes. Operational warnings survive. FundDetail's latest NAV, source chart and raw CSV use the original fund; derived charts/monthly calculations, Comparison and SIP use the reviewed series. SIP receives review metadata explicitly. React text interpolation and hard-coded HTTPS evidence links introduce no new HTML-injection path; CSV strings still pass through the established quote escaping and formula-prefix protection.

I independently matched 18 unique primary/fixture file hashes referenced by `multiple-events/four-supported-primary-proof.json`. I inspected the original ABSL CSV response bytes, the independently saved issuer internal-code mapping (`297G` versus `297GZ`), and the rendered issuer scheme summary page 37 mapping exact codes/ISINs. I inspected the rendered BOI audited 2022 balance-sheet NAV table page 87, the factsheet page 14 text, daily service response values/dates, the current identity document page 31 and annual-report recovery context page 24. These agree with the specified corrections. The BOI recovery explanation appropriately avoids assigning the entire exact-date gain to a particular security receipt.

ABSL has one dated issuer historical-NAV publication for each option. The issuer mapping and scheme summary independently establish identity, not a second independent numerical NAV source. The report states this limitation honestly. I found no reason to reject the bounded correction based on that distinction.

The new helper adds a constant-time identity screen for unrelated histories and linear scans/copying only for selected exact identities. Existing unit-action code is unchanged beyond the entry-point delegation and optional result type. Comparison now computes each basis once per memoization rather than twice. No meaningful performance regression is apparent for the inspected histories.

## Independently executed checks

- `node --experimental-strip-types --test --test-isolation=none tests/verified-nav-reviews.test.ts tests/absl-source-corrections.test.ts tests/verified-nav-review-views.test.ts`: **47 tests passed, zero failed**. This includes exact values, raw immutability, known/unknown revised values, adjacent boundaries, wrong identities, invalid/order/duplicate input, independent warnings, future jumps, already-corrected input, raw/derived view routing, retained loss/gain, SIP, monthly export, and partial-load transition behavior.
- `pnpm typecheck`: **exit 0**.
- `node --experimental-strip-types evidence/bulk-finalization-2026-10-29/audit/audit-finalization.mjs --output-prefix independent-review`: **exit 0**, generated at `2026-10-29T04:12:45.495Z`. I read the audit implementation before executing it. It imports the exact baseline registry, checks baseline archive/registry hashes, validates every fixture against its source shard and previous ledger, compares complete returned results for unselected cases, and verifies selected points/warnings/metadata exactly.
- Independent audit results: 610 raw unresolved fixtures, 237 source shards plus the returns asset, 13,683 observations across four selected histories, all 606 unselected results both deeply and serially identical, existing unit-adjustment count unchanged at 122, consumer-eligible count 81 to 85, remaining Growth-blocked count 104, zero raw source flags cleared. Actual-UTC eligibility reconciled to the same 8,524-scheme saved scope. See `audit/independent-review-results.json`, `audit/independent-review-summary.json`, and `audit/independent-review-run.log`.
- Real nested Direct/Regular CSV handler reproduction: missing provenance confirmed in `nested-export-finding-reproduction.json`.

The small fixture tests use literal expected correction values and independently stated return numbers; the full-cohort audit supplies the important complete-history/regression coverage absent from the compact test windows. The UI tests exercise real transforms and handlers but replace React mounting, canvas and nested component boundaries. They are useful behavioral tests, not browser layout or end-to-end coverage.

## Declined-to-judge and release limits

I did not judge final deployment status, exact-head GitHub CI, merge eligibility after other remote changes, live Pages artifacts, or browser-rendered layout. Those are root's remaining delivery gates. I did not fetch MFAPI, AMFI, credentials, private services or new upstream histories; this is a review of immutable saved evidence and authorized local execution. The cohort audit proves behavior over checkpoint 213 and actual-UTC scope reconciliation, not a fresh upstream census or complete truth of every historical observation.

The final report/evidence bundle still being assembled by root and later remediation hashes are outside this reviewed snapshot. The initial branch should not ship with I1 open. After the bounded export fix is tested, the numerical/source-evidence review supplies no additional reason to block this batch.

## Root remediation and release ruling

The original review above is preserved as written and applies to its listed hashes. Root accepted I1 and inspected the bounded fix: Comparison now passes reviews to all three nested exporters, including both correlation branches. Each CSV contains the exact per-scheme correction, issuer evidence and retained economic-event evidence; affected plan NAV and return labels identify reviewed values. Five new behavioral tests failed for absent provenance before the fix and then passed against the real nested handlers and actual parent props. All 15 reviewed-view tests, 40 affected view regressions, the final 1,691-test isolated suite, typecheck and both production builds pass. The calculation core and format helper hashes remain identical to the independently audited snapshot.

Root closes I1 on that tested remediation. This is a root integration ruling, not a claim that the independent reviewer inspected later remediation hashes. M1 remains a documented pre-existing Minor follow-up. Exact-head CI, merge and live deployment are subsequent gates recorded in the PR. See the adjacent validation JSON for hashes and commands.
