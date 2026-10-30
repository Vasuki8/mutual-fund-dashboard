# Verified NAV follow-up implementation plan

> **For agentic workers:** Use test-first implementation and independent review for each task. Preserve the exact constraints below.

**Goal:** Add calculation-only unit normalization for the next fully verified UTI distribution identities and make the observed collector ancestry failure diagnosable.

**Architecture:** Extend the existing exact-identity unit-action registry. Reuse its complete-series, boundary, factor-tolerance and independent-warning guards. Add a whitelisted ancestor log before existing validation without changing validation decisions or collection limits.

**Tech stack:** TypeScript, Node 24, existing Node test runner and GitHub Actions.

**Specification:** `AGENTS.md`, the existing calculation-copy contract in `src/lib/corporate-actions.ts`, checkpoint-256 source records, and the original UTI Addendum 14/2026-27 / NSE 74721 / CDSL 2026/416 / UTI March-2026 Scheme Summary Document.

## Global constraints

- Strict active repair scope uses the actual UTC date, exact official roster membership, independently verified current catalogue membership, finite positive NAV, and a date no more than 30 calendar days old and not in the future.
- Inspect full retained histories. Preserve raw observations, raw archive flags, excluded schemes, retry backoffs and source failures.
- Consumer eligibility remains literal Growth only. Unit normalization of IDCW NAVs does not establish distribution-adjusted total returns.
- Match code, full option name, fund house and both current ISIN fields. Do not extend an action to an unsupported sibling.
- Only a complete supported event chain may be normalized. No new interpolation, inferred factor or blanket warning exemption.
- Collector provenance checks, first-attempt requirement, three-minute lineage wait, 15-minute pacing, 12-run/four-hour limits and checkpoint/publication checks remain unchanged.

## Task 1: Verified UTI distribution unit basis

Files: `src/lib/corporate-actions.ts`, a focused test and literal source fixture, and a dated evidence report/JSON.

- [x] Pin the complete current source identity for codes 102010, 102011, 120558, 120794, 133973, 134427, 135721, 139838, 140024, 140504, 140517, 140913, 141768 and 144475.
- [x] Add failing behavioral tests for factor 0.1 before 20 June 2026, retaining 19 June as the last saved old-basis NAV and the documented 19 June effective date.
- [x] Exercise actual consumer ranking exclusion and raw input immutability. Reject wrong identities, altered/missing boundaries, additional warnings or discontinuities, and already-adjusted input.
- [x] Add the smallest exact registry extension, reusing the existing tolerance 0.0001 and full-series guards.
- [x] Replay all 14 complete checkpoint-256 histories, independently reconcile counts and decimal expectations, and retain source/document digests.
- [x] Keep legacy 102007/102008 and weekly 102013/120777 unregistered; their exact identity evidence remains incomplete in this pass.

## Task 2: Explain ancestor rejection without relaxing it

Files: `scripts/backfill-control.ts`, `tests/backfill-control.test.ts`, and the dated report.

- [x] Add failing tests proving diagnostic output includes each actually observed ancestor response, before a title/status rejection and before/after a bounded wait.
- [x] Assert unchanged rejection/collection outcomes and zero archive reads on rejection; ensure unrelated API fields and credentials never enter the log.
- [x] Log only ancestor ID, expected/observed title, role, attempt, event, status and conclusion using the existing logger.
- [x] Keep every existing predicate, timeout, wait, limit and returned error unchanged.

## Review and delivery

- [x] Run the full behavioral suite, typecheck, relevant production builds, full-history replay and diff checks.
- [x] Independently review primary identity mappings, both code changes, consumer exclusion, raw immutability and observed collector evidence.
- [ ] Publish a focused pull request, verify its exact contents and CI, merge after review, and check the resulting deployment and normal collector trigger.

## Decisions

The established calculation-copy approach is retained. A raw rewrite would erase source evidence; broad name/family matching would authorize unsupported options. The parent/child failure's original ancestor response was not logged, so status-handling changes are deferred until the new diagnostic evidence establishes a cause.

Taurus 101209 has three promising issuer-confirmed missing values, but the issuer export also contains an unresolved duplicate-date NAV conflict. It is research evidence only in this batch.
