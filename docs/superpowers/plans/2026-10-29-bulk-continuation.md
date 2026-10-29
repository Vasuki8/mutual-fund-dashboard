# Bulk discrepancy continuation implementation plan

> **For agentic workers:** Use superpowers:executing-plans for implementation and a fresh independent reviewer for the final diff.

**Goal:** Resolve every adequately supported case found in the remaining Growth-priority queue, together in one reviewed release, and record concrete evidence for unresolved cases.

**Architecture:** Add exact identities and documented unit events to the existing calculation-only registry. Preserve all source documents and existing runtime validation, and audit the complete610-case queue against the immutable before/after implementations.

**Tech stack:** TypeScript, Node24 native tests, Python Decimal fixture arithmetic, GitHub immutable trees and expected-head merges.

**Spec:** `AGENTS.md`; `docs/BULK_DISCREPANCY_COMPLETION_2026-10-29.md`; the owner's renewed instruction to continue and complete the bulk task.

## Constraints

- Base main: `b024a9b48f722a3d24f9592ec71ce6d79bbcbdf2`. Public source checkpoint213 and actualUTCday2026-10-29.
- Strict production active scope: official open-ended roster, independently verified catalogue membership, positive NAV within30UTCcalendar days; full saved histories.
- Preserve raw NAVs, all source warnings/errors, checkpoints, excluded histories, retries/cooldowns, source acceptance guards, literal Growth/distribution gate, sidebar/table and Atlas theme.
- No automated AMFI downloads. Do not start the former hosted importer or change its schedule.
- Local folder is a partial mirror, not a git checkout; use a focused remote branch through immutable GitHub objects.

## Review focus

Check misidentified discontinued plans, conflicting primary evidence, differences between legal dates and actual source boundaries, partial explanations of multi-event histories, and accidental changes to source data or consumer eligibility. Tests must reject wrong code/name/house/ISIN, shifted/missing boundaries, additional jumps, independent invalid warnings and repeated application.

## Tasks

- [x] Freeze current main registry and baseline queue. Reconcile main and latest successful CI/Pages release.
- [x] Finish parallel primary research for all26single-jumpGrowth cases and audit77invalid-source plus11cleanmulti-jumpGrowth cases. Add any fully evidenced remainingETF event. Record the source or identity blocker for every investigated case.
- [x] Consolidate supported actions in `docs/evidence/2026-10-29-bulk-continuation-actions.json`, with exact identity, published factor/date, observed boundary, source pages/hashes and explicit qualifications. Independently review nonstandard provenance chains before implementation.
- [x] Write literal source fixtures and independent Decimal expectations in `tests/bulk-discrepancy-continuation.test.ts`; run them against the unchanged base and verify the expected missing-registration failures.
- [x] Add only approved entries in `src/lib/corporate-actions.ts`, then run focused and existing regression tests. No shared threshold or quality gate changes.
- [x] Recompute all610saved queue histories with the production scope and financial-basis functions. Verify every selected observation, unchanged source hashes and unselected behavior, and write the complete disposition ledger plus `docs/BULK_DISCREPANCY_CONTINUATION_2026-10-29.md`.
- [ ] Obtain independent whole-diff review. Publish focused branch and PR; require exact-head full test suite, typecheck and Worker/Pages builds. Merge with expected head.
- [ ] Verify actual public HTML/JavaScript/manifest against the successful deployment artifact, exact compiled new registrations and allarchive asset references. Report achieved reductions and remaining external blockers precisely.

## Acceptance

A completed investigation/release is distinct from a zero-defect source archive. Do not claim repaired source warnings, current complete upstream coverage, or newly available global precomputed returns unless separately proven.
