# Invesco and Nippon distribution unit review

**Goal:** Extend the established calculation-copy unit registry only for exact distribution identities supported by primary evidence and complete retained-history verification.

**Base:** GitHub main `8bdc157c8ba985772dd7723c118f77ffcdf936ec`. PR 82 and its 14 UTI registrations are already merged and deployed.

**Design:** Keep the existing registry and calculation-copy safeguards. Add exact code/name/house/both-ISIN matches for verified Invesco 2011/2013 and Nippon 2012 options. Use issuer-documented factors and existing event-specific tolerances. No new normalization framework or collector behavior change is needed.

## Constraints

- Select only exact official-roster members with independently verified current catalogue membership, a finite positive NAV and a nonfuture NAV date within 30 UTC calendar days on the actual execution date.
- Review every retained observation. Do not equate saved coverage with a complete source history.
- Preserve source NAVs, raw archive warnings and unresolved flags. An adjusted calculation copy must not change consumer Growth-only eligibility or establish IDCW total returns.
- Require the exact complete current identity, including null ISIN fields where applicable, and a primary historical identity chain. Sibling evidence alone is insufficient.
- Retain documented factors, exact observed event boundaries and established tolerances. Additional unexplained events or independent invalid/conflicting-value warnings block the action.
- Keep source access restrictions, retry backoffs, collector pacing, collection budgets and concurrency limits unchanged. No AMFI automated requests.
- Keep checkpoint-255 research, checkpoint-257 current-data verification and later collection snapshots separately attributed.

## Evidence gate

- [x] Capture the current checkpoint-257 catalogue and 47 selected history shards; verify their hashes and compressed/expanded sizes.
- [x] Validate all selected source documents using production validators and current eligibility. The 89 screened histories contain 362,985 retained observations and qualify at 2026-10-30T23:22:01.305Z.
- [x] Finalize the exact primary identity/event chains for 33 Invesco and eight Nippon candidates. Treat this as a candidate count until independent review accepts each row.
- [x] Reconcile both current ISIN fields, historical plan labels, issuer NAV anchors, full history boundaries and warnings against checkpoint 257.
- [x] Retain explicit exclusions, retrieval limitations, original document hashes where bytes were available, and identified source URLs/page references.

## Implementation and meaningful tests

- [x] Create literal source fixtures with independent decimal expectations; add behavioral tests and demonstrate failure before registration.
- [x] Add the smallest exact registry extension. Invesco February-2011 boundaries differ by scheme; do not merge those dates into a broad rule.
- [x] Check all positive identities and both ISIN fields, altered identities, missing/wrong boundaries, wrong factors, additional events, independent quality warnings and repeated adjustment.
- [x] Verify source immutability and unchanged consumer ranking exclusion, with a usable Growth control.
- [x] Replay every approved current retained history through production normalization, quality and consumer-ranking functions; also replay every excluded screened identity without a new adjustment.
- [x] Pin the replay's source and archive digests, with an explicit historical scope date and actual evaluation time.

## Review and delivery

- [x] Run the full behavioral suite, typecheck, Worker/Pages builds, link/JSON/diff checks and independent primary/code review.
- [ ] Publish the exact reviewed files in a focused pull request and verify remote hashes and CI.
- [ ] Merge when authorized; verify deployment separately from source collection and report remaining limits.

## Operational follow-up

The first successor of the PR-82 collector passed validation and pacing. Its actual ancestor observation was a first-attempt push root with matching title, `completed` status and `success` conclusion. Checkpoint 258 then advanced successfully. This current success does not identify the cause of the earlier unlogged `backfill_root_invalid` failure. Keep operational verification in the dated evidence report rather than changing the controller on speculation.
