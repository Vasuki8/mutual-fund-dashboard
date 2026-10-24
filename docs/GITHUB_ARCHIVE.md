# GitHub-native FundScope historical archive

The v2 archive uses GitHub Actions, immutable Release assets, and the existing GitHub Pages dashboard. It is independent of the former hosted website and does not use its credentials, data, or paused import task. Counts from those stores must never be combined.

## Activation and public-data review

The collector stays disabled until the repository Actions variable `FUNDSCOPE_GITHUB_ARCHIVE_ENABLED` is exactly `true`. Its workflow and CLI both enforce that gate, the intended repository, and `main`.

**Keep the existing public-data review:** this repository and its Release assets are public. MFAPI documents keyless access and encourages response caching, but the official documentation and OpenAPI specification reviewed on 21 October 2026 do not include an explicit grant for complete-dataset public redistribution. Confirm that the intended publication is permitted before enabling it, or use an approved storage/serving destination. Do not substitute AMFI scraping. This is unresolved permission evidence, not a claim that MFAPI has prohibited the project.

GitHub supplies the workflow's short-lived `GITHUB_TOKEN`. No manually issued personal access token, MFAPI key, former-host credential, or browser secret is needed. The Pages build has read permissions; only the collector has repository contents-write permission. The collector also reads Actions run metadata to validate a continuation's ancestry. A separate final job has `contents: read` and `actions: write` solely to verify the published checkpoint and dispatch one successor; it cannot write archive contents.

## What runs, and when

| Work | Behavior |
| --- | --- |
| Catalogue and latest-NAV discovery | `GET https://api.mfapi.in/mf/latest` is checked in the two daily UTC slots beginning **07:00 and 19:00**. This identifies new schemes and changed latest dates. |
| Bounded history collection | Cron requests starts at **:07, :22, :37, and :52 UTC**; this is not an observed-start guarantee. A main-branch change to the archive workflow also seeds a chain. Each run handles at most **512 schemes in 16 stable shards**, with **two** source workers and a **nine-minute** overall collection budget that reserves the last two minutes for persistence. |
| Bounded first-pass and repair continuation | After successful collection, publication, and live-manifest verification, the final job may dispatch one successor. A chain has at most **12 runs including its root**, with collection admitted only when a full nine-minute budget remains within **four hours of the root's GitHub-recorded creation time**. Publication and cleanup may finish afterward. |
| Shared pacing | Every entrant, including a new cron/manual root, waits until at least **15 minutes after the latest checkpoint's `updatedAt`** before starting collection. Publication time counts toward that interval. This is a minimum gap, not an exact start cadence. |
| Full available history | `GET https://api.mfapi.in/mf/{schemeCode}` supplies the full available source response. There is no fixed year cutoff. A latest-NAV row is never presented as a full historical import. |
| Follow-up | First attempts have priority, followed by new latest dates, retryable source/quality problems, and full-history reconciliation after seven days. Failed histories use increasing backoff. Unstarted work does not consume an attempt. |
| Website publication | A changed, verified checkpoint calls the reusable Pages workflow. Pushes to main, manual dispatch, and **07:17/19:17 UTC** also offer publication opportunities. Every build loads the latest verified snapshot. |

The twice-daily schedule concerns catalogue/latest-NAV discovery and website publication. Full-history reconciliation continues in bounded tranches and may lag; the manifest reports that backlog. GitHub schedules can be delayed or skipped and may be disabled after inactivity. Actual saved timestamps, source NAV dates and deployed checkpoint sequences are the evidence of freshness.

### Continuation bounds and recovery

The existing workflow-wide `fundscope-github-history-v2` concurrency group remains the single-writer lock across every trigger and chain. A successor waits for its parent to finish, then validates the parent/root repository, workflow, main branch, chain position, successful first attempt, and expected checkpoint sequence. Partial or malformed continuation inputs never become a new root. The collector checks the starting sequence again before its first source request. A duplicate or superseded child therefore cannot replay an old tranche.

For a **still-incomplete first pass**, a successor still requires actual first attempts, newly saved histories and remaining first attempts. Once **all schemes have been attempted**, a successor can continue *verified source-data cleanup* only when the collector actually attempted source histories and the new checkpoint shows **more clean histories or a reduction in at least one of quality issues, source gaps, or the refresh/reconciliation backlog** compared with the previous checkpoint over the same scheme universe. Overlapping counters are **never added** as if they counted distinct identities. The collector explicitly returns a progress flag calculated from before/after verified checkpoint counts. A no-op, catalogue-only update, new missing source history, quality-warning-only retry, or `changed=true` without real measured improvement never justifies an automatic successor. Chaining still stops at twelve runs/four hours, on rerun, source pause or catalogue error, failed collection/publication/verification, or no eligible progress. This is repair throughput, not proof of complete or licensed data.

Before dispatch, the final job reloads the verified durable checkpoint and checks the live Pages manifest against that exact snapshot. Public manifest reads have bounded retries for propagation. Dispatch uses one POST with no blind retry after a lost response, because GitHub might already have created the child. A child of a failed/uncertain parent stops before collection. Logs identify the root, position, checkpoint, stop reason, and successor run ID when GitHub returns it.

GitHub's default concurrency queue keeps one pending run. A newer cron, push, or successor may replace an older pending run. Every surviving entrant resumes from the authoritative checkpoint; a stale child exits. A later cron wake or a new manual run with all continuation inputs empty can resume an interrupted chain. A rerun can recover an eligible operation but does not renew or extend an automatic chain. This design reduces dependence on cron delivery; it does not promise uninterrupted service if GitHub stops delivering all triggers, rejects dispatch, or stops providing runners.

GitHub may start a dispatched successor while the parent's final continuation job is still closing and the parent workflow still reports `queued` or `in_progress`. The successor now polls the exact validated root/parent run for at most **three minutes in total**, proceeds only after GitHub reports successful first-attempt completion, and stops without reading or writing the archive if the parent fails, is cancelled, changes identity, or never finishes. This does not relax the lineage, expected-sequence, single-writer, four-hour chain or pacing checks. A new cron/manual root still recovers an interrupted chain from the authoritative checkpoint.

The pacing wait happens before the collector's existing nine-minute deadline. The archive job allows 30 minutes for at most 15 minutes of waiting, validation, and collection. The verification/dispatch job has a five-minute timeout. The MFAPI worker count, request pacing, two-attempt HTTP retry limit, persistent backoff, and storage format remain unchanged. A chain's absolute maximum is 6,144 selected scheme operations, with at most two HTTP attempts each; time, shard, progress, and cooldown limits normally reduce this substantially.

No external infrastructure or long-lived credential is added. Standard GitHub-hosted runners are free for this public repository under GitHub's documented public-repository policy. Continuations nevertheless consume runner time, API requests, publication bandwidth, and retained archive/artifact storage. Making the repository private or choosing larger runners changes the cost assessment. The finite chain cap and shared pacing prevent a rapid, unbounded self-dispatch loop.

**After the first pass**, the collector still performs due repair and historical reconciliation within the same source budget. A fund reporting a NAV within the past 90 days has repair priority over legacy schemes whose provider catalogue and history differ by days despite ending years ago. This is scheduling priority only, not inferred scheme closure. Zero-only and empty `/mf/{code}` histories have no positive NAV to save; they receive specific, safe error codes and a per-scheme **seven-day** recheck rather than unbounded repeated requests. Their saved status remains a source gap; no zero NAV is treated as a valid observation. Source-wide rate-limit cooldowns and the existing refresh backoffs for other failures are unaffected.

**Data quality operations:** the read-only [FundScope archive data health](../.github/workflows/archive-data-audit.yml) workflow runs daily and on demand using only `contents:read`. It verifies the latest control checkpoint, classifies stored source failures, invalid NAV/discontinuity warnings, last-NAV date discrepancies and retry eligibility, and writes only aggregate results to the job summary. It never calls MFAPI or changes any data. See [DATA_HEALTH.md](DATA_HEALTH.md) for the baseline evidence and unresolved source/licensing limitations.

Every HTTP 429 pauses requests across the source; absent or invalid retry instructions use a 15-minute pause. Positive Retry-After values on HTTP 429/503 are retained in the checkpoint and honored by later runs. Before the first catalogue exists, a requested pause can only be reported in the failed run's logs and summary; no universe checkpoint exists yet.

## Durable storage and checkpoints

The control Release tag is `fundscope-mfapi-history-v2`. Its JSON body points at one immutable checkpoint. Data generations use `fundscope-mfapi-v2-data-000001`, `000002`, and so on; the store rotates at 880 assets. Previous generations and their history are retained.

A checkpoint contains the source catalogue reference, per-scheme outcomes and attempts, history-shard references, coverage summaries and independently recomputed counters. Shards use `floor(schemeCode / 32)`, so inserting a new scheme never moves existing schemes between shards. Every asset's content hash appears in its filename.

The imported universe is the saved `/mf/latest` catalogue plus retained earlier identities. Parity with MFAPI's separate `/mf` list and inclusion of every discontinued historical scheme have not been independently established. Coverage percentages apply to that known universe, not to a proven census of every Indian mutual fund ever issued.

For each write:

1. Validate incoming identities and NAV observations, then merge with saved history.
2. Upload immutable compressed data and verify its metadata, compressed digest, byte length, and downloaded bytes.
3. Upload and read back the complete checkpoint.
4. Verify the previous sequence still matches, then update and read back the control pointer.
5. Emit `changed=true` only after the new snapshot can be loaded and verified.

An interrupted upload is reconciled by content name. A reserved/incomplete asset name causes generation rotation, never deletion of a previous asset. A failure before pointer advancement leaves the previous checkpoint authoritative. If a pointer update succeeds but its response is lost, readback reconciles it. The workflow concurrency group is the single-writer lock; do not run independent collectors against the same control release concurrently.

GitHub can return HTTP 404 for a Release asset's public download URL, even while its metadata reports `uploaded`. The collector now tries GitHub's **official authenticated release-asset binary endpoint** when that public URL returns 404. It accepts GitHub's direct binary response or a redirect to an allowlisted signed asset host. The GitHub Actions token is sent only to `api.github.com`; never to a redirect, public download host, or browser. **Every read** must match the immutable compressed byte length and SHA-256 digest before it is accepted. The fallback does not substitute metadata JSON or claim that an unreadable asset is valid. If both download routes return 404 for a new upload, at most four bounded, deadline-aware retries are allowed. An older asset missing on both routes fails without retry. HTTP 403/429, corrupt bytes, and malformed redirects remain hard failures. Retry logs record safe codes and numeric asset IDs, not tokens or signed links. No extra upload or checkpoint update is triggered by a fallback.

Existing observations survive shorter, older or failed responses. Valid source corrections may update matching dates; ambiguous values and large discontinuities remain flagged. Missing schemes remain in the catalogue with `current: false`. Source failures retain any previously saved history and its original successful retrieval time.

The original v1 script is retained for historical reference only. The active workflow uses `scripts/github-history-v2.ts`; it does not count v1 filenames or old hosted data as v2 coverage. No v1 Release existed when v2 development began.

## Meaning of the counters

| Field | Meaning |
| --- | --- |
| `total` | Unique known catalogue identities, including retained older schemes. |
| `attempted` | Schemes for which at least one source history request actually started. |
| `pending` | Schemes still awaiting their first actual attempt. |
| `saved` | Schemes with validated observations in referenced durable shards. |
| `clean` | Saved histories without unresolved stored quality flags. A failed later refresh is reported separately. |
| `qualityIssues` | Saved histories still requiring quality/source-date follow-up. |
| `sourceGaps` | Schemes whose most recent attempt failed, including those with a saved fallback. |
| `refreshPending` | Saved histories behind the catalogue, due for reconciliation, or requiring source/quality follow-up. |
| `bulkPassComplete` | Every known scheme has been attempted at least once. This does not mean full coverage. |
| `coverageComplete` | Every scheme has saved history and no pending attempts, source gaps, quality issues, or refresh backlog. This still cannot prove the provider has every observation since legal inception. |

Source failures, quality issues, and refresh backlog can overlap. Do not add them as independent categories. Published issue samples are bounded; aggregate counts describe the whole saved snapshot.

## Pages delivery and browser behavior

`scripts/publish-archive.ts` reads the control pointer, verifies every catalogue/history asset and its corresponding checkpoint summary, and materializes same-origin compressed files plus `archive/manifest.json` in `dist/pages`. It writes the public manifest only after the complete snapshot is ready. Public files contain no token or authenticated endpoint.

The Pages publisher also writes a small compressed, source-verified **category index** covering every saved fund, including IDCW and unresolved-quality histories. It is tied to the catalogue and current checkpoint, and it is not part of the immutable GitHub Release data format. The browser fetches this metadata instead of opening every saved history to populate category filters. Histories not yet saved are explicitly unclassified; the website does not infer fund categories from names. The category index is optional for older deployed manifests, which remain readable. No source workflow or collection schedule is changed.

The build enforces **32 MiB compressed**, **64 MiB expanded per history shard**, **100 MiB expanded metadata**, and a conservative **850 MiB complete Pages artifact budget**. Missing/corrupt/inconsistent/oversize data fails publication. It does not silently discard histories or replace the live site with an empty archive. If a complete dataset exceeds this serving budget, the immutable Release archive remains saved; an approved larger serving destination is required before full publication can resume.

Every UI deployment hydrates the archive. Setting the enable variable to false pauses new imports; it does not delete saved data or cause later UI deployments to omit it. A genuine absence of a checkpoint produces an explicit `disabled` or `not-started` manifest. An unreadable/corrupt checkpoint is a failed build, not an empty successful deployment.

Ready manifests include `collectionEnabled` as observed at publication, so retained history is not mistaken for an active import after collection is paused. This is published configuration, not a claim that a job is currently running.

The static browser verifies and decompresses same-origin assets under `/mutual-fund-dashboard/`. Fund refresh can request MFAPI directly, with saved-history fallback and merging that retains older observations. Shared coverage and source freshness stay distinct from this browser's cache and private research. A shared snapshot can be older than a direct source response; the UI exposes those timestamps.

## Operator procedure

1. Finish the public-data review above. Do not change the former hosted task.
2. Keep the already configured **Settings → Pages → Source = GitHub Actions** setting. No additional hosting credential is needed.
3. Set the repository Actions variable `FUNDSCOPE_GITHUB_ARCHIVE_ENABLED` to `true`.
4. Allow cron or a main-branch archive-workflow change to seed the chain, or manually run **FundScope GitHub-only MFAPI archive** on `main` with all continuation inputs empty.
5. Inspect the final `phase: verified` log, checkpoint sequence, attempted/deferred counts, saved coverage and source gaps. Verify the control Release points at the new checkpoint.
6. Confirm its Pages publication succeeded, then check the live `archive/manifest.json` sequence and counts. A successful archive write and a successful website publication are separate results.
7. Verify at least two automatic successor runs advance the saved checkpoint and publish the matching live manifest. A dispatch response, green deployment, or successful manually triggered tranche alone does not verify automatic collection. After the first pass, **a positive verified reduction in unresolved issues may continue a bounded repair chain**; otherwise the chain stops and later scheduled runs remain eligible. Keep source failures, unverified NAVs and complete first-pass coverage distinct.
8. To pause collection, set the variable to false. Keep the immutable assets and control pointer intact; ordinary UI deploys will continue serving them.

If an upload or checkpoint readback fails, rerun normally after the transient fault clears. Never advance counters manually or delete a prior good asset to make a retry pass. A failed website build leaves the previous deployment live; fix the reported validation/capacity problem and rerun Pages.

Each Pages build names its temporary workflow artifact with the run ID and build attempt. The deployment job reads that exact name from the build's saved output. Rebuilding therefore does not collide with an earlier artifact, and retrying only deployment still selects the original build's artifact. These temporary website artifacts are separate from the immutable historical Release assets.

Runs created before this naming fix retain the older workflow definition. If one fails with `Multiple artifacts named "github-pages"`, start a new **Deploy FundScope to GitHub Pages** run on current `main` (a new main-branch push also starts one). That build reads the latest verified archive checkpoint. Repeatedly retrying the old deployment will not resolve its duplicate artifact names; no historical data needs to be deleted or reimported.

## Trigger investigation: 21–22 October 2026

At **02:07 UTC on 22 October**, workflow `391380370` was `active`, the repository was public and active with default branch `main`, and the workflow's cron remained `7,22,37,52 * * * *`. The complete repository run listing contained six archive runs, four with event `schedule`, and no queued/in-progress archive run. The durable checkpoint and live manifest both reported sequence **6**, with **1,478 / 37,982** histories saved, **36,457** first attempts pending, **47** source gaps, and **466** saved quality issues. The checkpoint's source cooldown and catalogue error were both null. The immutable checkpoint's SHA-256 and compressed/expanded lengths were checked.

| Scheduled run | Run created (UTC, 21 October) | What actually happened |
| --- | --- | --- |
| [39599567731](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/39599567731) | 12:26:11 | Archive job skipped before the collector was enabled. This is a created-but-skipped run, not a missing trigger. |
| [39645475912](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/39645475912) | 17:37:42 | Archive job skipped before activation. |
| [39674533543](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/39674533543) | 20:55:47 | First attempt collected and published successfully. Its later second attempt collected successfully but failed Pages publication on duplicate `github-pages` artifacts, the known issue fixed by [PR 11](https://github.com/Vasuki8/mutual-fund-dashboard/pull/11). |
| [39696830999](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/39696830999) | 23:58:46 | Collector started within seconds, saved checkpoint 6, and published it successfully by 00:01:20 on 22 October. |

The last two scheduled run records were created **3 hours 2 minutes 59 seconds** apart. Earlier gaps were 5:11:31 and 3:18:05. No later archive run record existed at the initial 02:07 check. Run/job timestamps distinguish this from runner queueing: created jobs began within seconds. For rerun IDs, the top-level `run_started_at` describes the latest attempt; comparing it with the original `created_at` incorrectly turns the time between attempts into apparent queue delay. All-attempt jobs and attempt-one records were checked separately.

The last scheduled collector's logs show the enable variable true and effective contents-write permission; its Pages jobs had the required read/deployment permissions. It reported 294 source attempts, verified checkpoint 6, no catalogue error and no source-wide cooldown. The final manifest was later republished by an ordinary UI deployment, which changed `generatedAt` but did not advance the archive. That is publication activity, not evidence of new collection.

**Supported diagnosis:** scheduled run creation was sparse before any visible job ran. Collector source errors, the enable gate, the archive concurrency lock, and the fixed Pages artifact bug do not explain absent run records. The repository compounded that dependency by performing exactly one tranche per wake with no automatic continuation. GitHub's public API cannot identify the intended cron slot of an absent event or establish whether it was dropped versus still delayed; its internal scheduler cause remains unconfirmed.

GitHub reported an [Actions/workflow-status incident](https://www.githubstatus.com/incidents/nms1dpzmh9d9) earlier on 21 October, resolved at 19:22 UTC; Actions was listed operational during the later investigation. That incident does not establish the cause of the gap after 23:58. The documented possibility of delayed/dropped schedules is a platform limitation, not proof of the specific internal cause here. The bounded continuation addresses the demonstrated dependency without changing the archive, increasing source concurrency, or restarting the former hosted importer.

## Verification commands

```sh
node --experimental-strip-types --test tests/backfill-control.test.ts tests/github-history-v2.test.ts tests/archive-store.test.ts tests/publish-archive.test.ts tests/shared-archive.test.ts
pnpm test
pnpm run typecheck
pnpm run build:pages
pnpm run build
```

Tests use synthetic source fixtures and in-memory GitHub adapters or temporary files. They do not import or publish the real dataset. A real first-tranche checkpoint and deployed manifest must be verified separately after activation.

## Primary references

- [MFAPI documentation](https://www.mfapi.in/docs/) and [official OpenAPI specification](https://www.mfapi.in/docs/openapi.json).
- [GitHub Release asset limits](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases): 1,000 assets per release and less than 2 GiB per asset.
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits): published site limit of 1 GB, deployment timeout and bandwidth guidance.
- [Scheduled workflow behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
- [GITHUB_TOKEN workflow-dispatch exception](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow) and [dispatch API permissions](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event).
- [Concurrency queue behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#concurrency) and [public-runner billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
- [Reusable workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows).

## GitHub queued-run status and safe bootstrap

A GitHub Actions workflow-run REST response can report `status: "queued"` even
after its `archive` job begins executing, while dependent jobs are still waiting.
The collector's preparation guard accepts only `queued` or `in_progress`
with a null conclusion, matching run attempt, full run/workflow/repository
identity and expected continuation lineage. It logs the observed workflow-run
status (never its token) so a future metadata mismatch is diagnosable.

Changes to `scripts/backfill-control.ts` on `main`, as well as changes to
the workflow file itself, seed a new **bounded** chain automatically. Other
application and documentation pushes do not trigger history collection.
The single-writer concurrency group, checkpoint-sequence fence, per-source
cooldowns, fifteen-minute pacing and 12-run/four-hour bounds remain unchanged.
The new chain resumes from the current durable checkpoint; it cannot reset
the archive or double-count schemes simply by rereading an old batch.

## Duplicate prevention and safe replay

The published archive is a **logical snapshot**, not a count of every HTTP request or every immutable release asset ever written:

- **Scheme identity:** a numerical MFAPI scheme code is the unique record key. A Direct and a Regular plan, or Growth and IDCW options, may legitimately have different codes; similar fund names are not proof of duplicate schemes.
- **NAV identity:** within each code, observations are keyed by normalized calendar date. Repeated equivalent source dates are consolidated. Different NAV values reported for the same code/date are deterministically resolved for raw inspection and **flagged as an unresolved quality conflict**; affected analytics are blocked.
- **Repeat runs:** a successful history replaces its previous record in the stable `floor(schemeCode / 32)` shard rather than appending another copy. On a refresh, previously saved dates not returned by the provider are retained; overlapping dates do not grow the observation count.
- **Counts:** `attempted`, `saved`, `clean`, `qualityIssues`, and `pending` are recalculated from the distinct catalogue codes and their checkpoint states. Refresh attempts never increment the number of distinct saved histories.
- **Concurrent work:** one workflow-wide GitHub Actions concurrency group covers collection, publication, and continuation. Each collector validates its expected durable checkpoint sequence before any source requests, and the checkpoint writer rejects a changed predecessor before advancing the control pointer.
- **Publication:** the Pages build verifies the catalogue, each referenced shard, its content hash, the absence of duplicate scheme records, exact observation normalization (no repeated dates), and consistency with checkpoint counts and state metadata. Invalid files prevent a new publication; previous verified checkpoints remain available.
- **Old assets:** versioned GitHub Releases may retain older immutable shard copies for recovery. They are *not additional rows* in the current manifest: the current checkpoint points to exactly one asset per active shard bucket.

Duplicate-focused regression tests cover repeated source NAV dates, conflicting same-date NAV values, catalogue identity duplication, duplicate shard documents, and restarting from a saved checkpoint followed by a normal refresh. Re-fetching a scheme for an eligible update is not itself a duplicate import.

## Transient GitHub Release asset downloads

The collector reads immutable Release assets through the canonical GitHub URL and
validates every redirect host, compressed size and SHA-256 before decoding history.
GitHub or its asset CDN may sometimes return HTTP 502 while a shard is being
read back after upload. A single transient download error must not cause an
otherwise completed MFAPI tranche to be re-fetched.

Archive **GET** reads retry at most twice (three attempts total) after 750 ms
and 1,500 ms for transport errors and transient HTTP 408/425/500/502/503/504.
Each retry starts at the original canonical URL, obtains a fresh signed redirect,
never forwards the GitHub token to asset hosts, and respects the existing work
deadline. HTTP 403/404/429, invalid redirects, wrong compressed length,
checksum mismatches and malformed data do **not** receive retries. Uploads,
checkpoint writes and pointer changes retain their existing reconciliation and
verification safeguards; no blind upload or publication retry is introduced.

A merge that changes the reviewed `scripts/archive-store.ts` source seeds one
new bounded backfill chain on `main`. It resumes from the durable checkpoint.
If all three read attempts fail, the collector stops without advancing the
checkpoint or changing previously saved histories; the next successful root
retries the same pending schemes. These reads are bounded and do not raise
the MFAPI concurrency or source request budget.
