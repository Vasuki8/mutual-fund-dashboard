# GitHub-native FundScope historical archive

The v2 archive uses GitHub Actions, immutable Release assets, and the existing GitHub Pages dashboard. It is independent of the former hosted website and does not use its credentials, data, or paused import task. Counts from those stores must never be combined.

## Activation and public-data review

The collector stays disabled until the repository Actions variable `FUNDSCOPE_GITHUB_ARCHIVE_ENABLED` is exactly `true`. Its workflow and CLI both enforce that gate, the intended repository, and `main`.

**Keep the existing public-data review:** this repository and its Release assets are public. MFAPI documents keyless access and encourages response caching, but the official documentation and OpenAPI specification reviewed on 21 October 2026 do not include an explicit grant for complete-dataset public redistribution. Confirm that the intended publication is permitted before enabling it, or use an approved storage/serving destination. Do not substitute AMFI scraping. This is unresolved permission evidence, not a claim that MFAPI has prohibited the project.

GitHub supplies the workflow's short-lived `GITHUB_TOKEN`. No manually issued personal access token, MFAPI key, former-host credential, or browser secret is needed. The Pages build has read permissions; only the collector has repository contents-write permission.

## What runs, and when

| Work | Behavior |
| --- | --- |
| Catalogue and latest-NAV discovery | `GET https://api.mfapi.in/mf/latest` is checked in the two daily UTC slots beginning **07:00 and 19:00**. This identifies new schemes and changed latest dates. |
| Bounded history collection | The existing off-peak schedule runs at **:07, :22, :37, and :52 UTC**. Each run handles at most **512 schemes in 16 stable shards**, with **two** source workers and a **nine-minute** overall budget that reserves the last two minutes for persistence. |
| Full available history | `GET https://api.mfapi.in/mf/{schemeCode}` supplies the full available source response. There is no fixed year cutoff. A latest-NAV row is never presented as a full historical import. |
| Follow-up | First attempts have priority, followed by new latest dates, retryable source/quality problems, and full-history reconciliation after seven days. Failed histories use increasing backoff. Unstarted work does not consume an attempt. |
| Website publication | A changed, verified checkpoint calls the reusable Pages workflow. Pushes to main, manual dispatch, and **07:17/19:17 UTC** also offer publication opportunities. Every build loads the latest verified snapshot. |

The twice-daily schedule concerns catalogue/latest-NAV discovery and website publication. Full-history reconciliation continues in bounded tranches and may lag; the manifest reports that backlog. GitHub schedules can be delayed or skipped and may be disabled after inactivity. Actual saved timestamps, source NAV dates and deployed checkpoint sequences are the evidence of freshness.

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

The build enforces **32 MiB compressed**, **64 MiB expanded per history shard**, **100 MiB expanded metadata**, and a conservative **850 MiB complete Pages artifact budget**. Missing/corrupt/inconsistent/oversize data fails publication. It does not silently discard histories or replace the live site with an empty archive. If a complete dataset exceeds this serving budget, the immutable Release archive remains saved; an approved larger serving destination is required before full publication can resume.

Every UI deployment hydrates the archive. Setting the enable variable to false pauses new imports; it does not delete saved data or cause later UI deployments to omit it. A genuine absence of a checkpoint produces an explicit `disabled` or `not-started` manifest. An unreadable/corrupt checkpoint is a failed build, not an empty successful deployment.

Ready manifests include `collectionEnabled` as observed at publication, so retained history is not mistaken for an active import after collection is paused. This is published configuration, not a claim that a job is currently running.

The static browser verifies and decompresses same-origin assets under `/mutual-fund-dashboard/`. Fund refresh can request MFAPI directly, with saved-history fallback and merging that retains older observations. Shared coverage and source freshness stay distinct from this browser's cache and private research. A shared snapshot can be older than a direct source response; the UI exposes those timestamps.

## Operator procedure

1. Finish the public-data review above. Do not change the former hosted task.
2. Keep the already configured **Settings → Pages → Source = GitHub Actions** setting. No additional hosting credential is needed.
3. Set the repository Actions variable `FUNDSCOPE_GITHUB_ARCHIVE_ENABLED` to `true`.
4. Manually run **FundScope GitHub-only MFAPI archive** on `main`.
5. Inspect the final `phase: verified` log, checkpoint sequence, attempted/deferred counts, saved coverage and source gaps. Verify the control Release points at the new checkpoint.
6. Confirm its Pages publication succeeded, then check the live `archive/manifest.json` sequence and counts. A successful archive write and a successful website publication are separate results.
7. Let bounded continuations run. A completed first pass does not require changing the workflow: the same collector discovers new schemes and performs subsequent refresh work. Keep unresolved failures visible.
8. To pause collection, set the variable to false. Keep the immutable assets and control pointer intact; ordinary UI deploys will continue serving them.

If an upload or checkpoint readback fails, rerun normally after the transient fault clears. Never advance counters manually or delete a prior good asset to make a retry pass. A failed website build leaves the previous deployment live; fix the reported validation/capacity problem and rerun Pages.

## Verification commands

```sh
node --experimental-strip-types --test tests/github-history-v2.test.ts tests/archive-store.test.ts tests/publish-archive.test.ts tests/shared-archive.test.ts
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
- [Reusable workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows).
