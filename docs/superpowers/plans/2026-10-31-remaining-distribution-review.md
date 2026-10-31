# Remaining distribution history review

**Base:** merged main `521ef8bf79885de57082054adc4f37b75b56cb3d` (PR 84). **Actual initial scope evaluation:** `2026-10-31T03:59:56.649Z`.

## Goal and established design

Review the next 59 previously unreviewed distribution/discontinuity-only histories across 13 fund houses. Extend the existing calculation-copy registries only when primary records establish the exact stored identity, documented event or source NAV, and complete retained-series consistency. The established registry and evidence design remains in use; a target count is not an approved adjustment count.

Checkpoint 274 contains 226,022 observations for these 59 targets. All satisfy the production active-repair predicate at the initial actual-date check. The 30-day rule selects funds; every retained historical observation is reviewed. Original archive NAVs, timestamps, warnings, unresolved flags, rejected-date provenance, gaps and excluded histories remain intact.

## Evidence boundaries

- Require exact numeric code, complete stored name, fund house and both stored ISIN fields, including nulls. Record legacy identifiers and rename chains explicitly.
- Separate issuer legal dates from the actual old/new NAV boundary. Do not choose a date or factor to fit a price curve.
- Preserve all independent unexplained events, invalid/conflicting warnings and existing event-specific tolerances. Source retrieval failures remain documented blockers.
- Navi candidates need a complete 2014/2022 event chain when both events exist. Preserve both date boundaries even where their combined factor is one.
- Union 115399 retains its 99-day gap across the suspected 2011 event. No missing boundary observation is inferred.
- JM Overnight's documented 14 December 2019 date conflicts with the saved 13 December transition. PGIM Overnight lacks retrieved original dated conversion terms. These prior blockers must be resolved by primary evidence before approval.
- Distribution options retain the literal Growth-only consumer exclusions. Unit normalization does not establish reinvested total returns or complete history.
- Do not change the UI, collector budgets, pacing, retries, cooldowns, workflows or discovery filter. Make no automated AMFI requests or new MFAPI history requests.

## Research and capture

- [x] Verify current GitHub main and create a focused branch.
- [x] Capture checkpoint 274, verify all 31 compressed assets against the manifest, validate their expanded sizes, and use the production archive validators.
- [x] Check all 59 exact targets with the production scope predicate at the actual UTC runtime date; preserve 226,022 observations.
- [x] Divide primary research into Navi/Bandhan/Union (17), six liquid-fund houses (20), and PGIM/JM/quant/Franklin (22).
- [x] Record original source hashes, pages, exact option/code/ISIN bindings, historical NAV anchors, legal terms, rename chains and retrieval limits.
- [x] Independently audit full retained series with Decimal arithmetic and account for all gaps and exclusions.
- [x] Independently review every proposed inclusion before production registration.

## Implementation and verification

- [x] Create literal fixtures and independent expected NAVs. Demonstrate meaningful failures for supported missing behavior before production edits.
- [x] Add only approved exact identities through the existing registries, retaining established tolerances and complete multi-event guards.
- [x] Verify identity, source, dates, factors, independent warnings, extra events, partial/repeat adjustments, raw immutability and actual consumer exclusion with positive Growth controls.
- [x] Replay all 59 complete histories, including exclusions, with pinned archive and production hashes. Report frozen evidence-scope and actual runtime eligibility separately.
- [x] Run focused and full behavioral tests, typecheck, Worker and Pages builds, then independent code/evidence/replay review.

## Delivery and operational evidence

- [ ] Publish the exact reviewed tree in a focused pull request, verify remote contents and CI, and merge under the existing authorization.
- [ ] Verify main CI, the actual Pages checkout/deployment and the live asset hashes before reporting release completion.
- [x] Observe checkpoint-274 collector progress independently of calculation changes: 118 attempts, 105 saved outcomes, two failed outcomes and 11 quality outcomes. Within its final 8,524-scheme active cohort, refresh/reconciliation pending fell from 2,070 to 1,965 and source gaps from 87 to 85; raw quality flags remained 602. The archive and publication jobs succeeded and the ordinary continuation dispatched run 41165992434.

PR 84 is already merged and deployed. This plan starts the next evidence batch; later operational checkpoints and deployment proof remain separate from the immutable checkpoint-274 research capture.

Implementation verification: 20 accepted histories / 88,646 observations, 39 excluded / 137,376; 11,817 calculation points scaled; 71 → 51 moves; every one of 39,312 gap tuples preserved. Meaningful RED: 61 failures / 161 passes. Focused GREEN: 555 / 555. Full suite: 2,638 / 2,638, typecheck and both builds pass. Independent source packaging and implementation/replay reviews pass. The sole report date correction (Edelweiss notice printed 20 June rather than its 21-jun filename) is applied. Delivery checkboxes above are deliberately left open in this prepublication tree; exact remote CI, merge and live deployment proof will be recorded in the pull request.
