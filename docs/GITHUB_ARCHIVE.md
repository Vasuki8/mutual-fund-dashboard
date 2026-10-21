# GitHub-native FundScope historical archive

This is a separate GitHub-only import. It does not use the private hosted website, its token, or its D1/R2 archive. It does not migrate the website's existing saved histories. Never add the coverage counts from the two independent stores.

## Activation and data rights

Workflow: .github/workflows/github-history.yml. It schedules bounded GitHub Actions executions at **:07, :22, :37 and :52 UTC**. GitHub schedules are best-effort and can run late or be skipped.

The job is **disabled by default** until the repository Actions variable FUNDSCOPE_GITHUB_ARCHIVE_ENABLED is set to true.

**Public-data warning:** Vasuki8/mutual-fund-dashboard is public. GitHub Release assets published here are downloadable publicly. MFAPI states that access requires no API key. This does not prove permission to republish the whole dataset or to redistribute it commercially. Verify permission before enabling public release publication. Do not scrape AMFI as a substitute.

The workflow requires no manually issued API key or personal access token. GitHub Actions supplies a short-lived GITHUB_TOKEN with repository contents write permission. It does not rely on any credential for the private website.

## Storage and checkpoint rules

- Source catalogue: https://api.mfapi.in/mf/latest; saved once as the compressed catalogue-v1.json.gz asset under release tag fundscope-mfapi-history-v1. The initial universe remains fixed across import runs.
- Full history: https://api.mfapi.in/mf/{schemeCode} for each listed scheme.
- Storage: compressed JSON assets in the GitHub Release. One execution handles 200 scheme codes at most, or one retry group. At most two concurrent MFAPI workers are used.
- Names such as nav-000000-000199-a0-ok180-gap020.json.gz identify the group, attempt number, clean responses, and source or quality gaps. The asset contains each scheme's outcome and its valid historical observations when available.
- After the first full pass, a1 and a2 retry only unresolved codes. Assets are immutable. A failed retry does not erase valid history in an older group.
- After upload, GitHub asset metadata is read back and its SHA-256 digest and byte count are verified. Missing or unverified assets are not counted as completed checkpoints.
- Each work execution has a nine-minute source-work deadline. Entries not attempted before this deadline are recorded as work-limit gaps and remain eligible for retry.
- completePass indicates that all snapshot schemes have been attempted and two additional retries have been resolved or exhausted. It does **not** mean the source has complete history. The report retains source gaps, quality flags, exhausted attempts, and missing observations separately.
- Newly listed schemes after the saved catalogue snapshot are not automatically added. This initial importer is not a routine twice-daily updater.

A release can hold at most 1,000 assets, and individual assets must be smaller than 2 GiB. For a snapshot of about 38,000 schemes, group size 200 requires about 190 primary assets and at most 380 retry assets.

## Operations

1. Confirm permission to distribute the full MFAPI-derived dataset publicly, or move the storage to an approved private destination before activating.
2. In GitHub repository Settings → Secrets and variables → Actions → Variables, set FUNDSCOPE_GITHUB_ARCHIVE_ENABLED to true.
3. Manually dispatch the workflow. The first invocation saves a verified catalogue. Later executions store bounded historical tranches.
4. Inspect the job summaries and GitHub Release assets. Record source gaps and data-quality warnings rather than claiming full coverage.
5. When the first full pass is finished, disable the high-frequency workflow or replace it with a separately reviewed twice-daily incremental updater.

This does **not** deploy a website. The existing Next/Vinext UI uses D1/R2 and needs a separate static-site data adapter before it can consume this GitHub archive.

## Tests

Run: node --experimental-strip-types --test tests/github-history.test.ts

Node 24 and standard built-in libraries are used; the existing source history validator is reused.
