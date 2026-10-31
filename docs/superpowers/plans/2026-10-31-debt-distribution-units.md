# Next debt distribution unit review

**Base:** merged main `1ae8021083b4c3e3c6df6a61c500d13fafb6c4a8` (PR 83). **Actual scope date:** 31 October 2026 UTC; 30 October in Toronto at the start of this review.

## Goal and established design

Review the next related distribution histories in a larger batch. Extend the existing calculation-copy registries only where primary documents bind the exact stored identity to a documented unit event or an exact source NAV correction, and the full retained history passes the existing guards. Use the established implementation and evidence workflow from PR 83. Do not create a new adjustment framework.

The investigation contains 56 histories: 17 Aditya Birla, 12 HDFC, 11 SBI and 16 ICICI options. These are research targets, not an approved adjustment count. Each candidate requires its own exact code, complete name, fund house and both stored ISIN fields, including nulls. Retired stored ISINs require an explicit primary identity bridge; do not describe them as current issued securities.

The primary issuer historical-NAV service also supplies exact single-date corrections for two International Equity IDCW options already inside the 17-row Birla scope. Keep these separate from unit actions: one observed date changes in each calculation copy, with exact neighboring anchors, no fitted unit factor, and all original archive values preserved. Independent source review remains a gate before implementation.

## Binding limits

- Select through the production active-repair predicate using the actual UTC date, official open-ended roster, independently verified catalogue membership and finite positive recent NAV.
- Review every retained observation. Preserve source values, warnings, unresolved flags, dates, counts, coverage gaps and excluded histories.
- Keep existing exact event boundaries and event-specific tolerances. A ratio near a documented factor is insufficient evidence. Additional unexplained events and independent invalid/conflicting warnings remain blockers.
- Keep IDCW options outside the existing literal Growth-only consumer rules. Unit normalization does not establish distribution-adjusted total return or recover absent observations.
- Keep the UI, collection budgets, pacing, retry rules, source cooldowns and workflows unchanged. Make no automated AMFI requests and no new MFAPI requests for this research.
- Separate checkpoint-255 discovery, checkpoint-268 verification and later operational snapshots. Keep public-source retrieval failures and capture types explicit.

## Evidence and scope

- [x] Capture checkpoint 268 manifest, catalogue and 30 selected history shards. Verify all 31 compressed assets, expanded sizes and SHA-256 values.
- [x] Validate the catalogue and histories with production validators. At `2026-10-31T02:11:39.297Z`, all 56 targets qualify and retain 260,007 observations.
- [x] Start parallel primary-document research for Birla, HDFC/SBI and ICICI. Current metadata and full histories are available to each researcher.
- [x] Complete exact identity chains, historical option NAV anchors, documented unit terms, rename/ISIN bridges and full-history arithmetic for every included candidate.
- [x] Record all excluded targets with specific reasons, including tolerance failures and unrelated source anomalies.
- [x] Independently review primary evidence before treating any candidate as approved. The independent review accepts 34 bounded unit actions and two exact source corrections; all 20 exclusions are upheld. This source acceptance is separate from implementation verification.

## Implementation and verification

- [x] Write literal source fixtures and independent Decimal expectations; demonstrate meaningful failures before adding registrations. Four Birla Overnight histories retain their sole pre-event point. All 355 new cases ran before production edits: 242 passed and 113 failed for the expected missing behavior; no unexpected failures.
- [x] Add only exact, reviewed identities using the existing registry and established tolerances.
- [x] Verify each positive identity and negative code/name/house/ISIN guards, dates, factors, extra events, independent warnings, input immutability, repeat refusal and consumer exclusion with usable Growth controls. Exact source corrections also require the correct source, category, anomalous NAV, date and both consecutive neighboring observations. Focused new/related suites pass 570/570.
- [x] Replay all 56 complete histories using production functions. Pin 31 archive assets and 15 production sources, report historical and actual-date eligibility separately, and preserve every excluded history. All 260,007 observations pass; actual scope remains 56/56 at `2026-10-31T02:38:24.712Z`.
- [x] Run full tests, typecheck, Worker and Pages builds. The proper isolated suite passes 2,416/2,416 with zero failures/skips/cancellations; typecheck and both builds pass.
- [x] Review the implementation, evidence, links and diff independently. No blocking defect remains. The reviewer checked all 56 fixture identities, 227 source observations, 23 gap-probe points and Decimal expectations, passed the 355 new tests, and reproduced the final full replay at `2026-10-31T02:38:57.175Z`.

## Delivery and operational evidence

- [ ] Publish the exact reviewed tree in a focused pull request, verify remote file hashes and CI, and merge when authorized.
- [ ] Verify the actual live deployment before reporting release completion.
- [x] Record checkpoint 268 collection and publication separately. Its final tranche reduced pending work from 2,600 to 2,527 within the same 8,524-scheme active cohort; raw quality flags remained 603. Later operational results belong in the pull-request delivery record rather than altering this immutable research snapshot.

The previous PR 83 is already merged and deployed. Its prior approval does not change the evidence requirements for this next batch. The earlier unlogged collector ancestry failure remains unexplained; successful later runs are not proof of its cause.
