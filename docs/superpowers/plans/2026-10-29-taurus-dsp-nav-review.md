# Taurus and DSP calculation NAV review plan

## Goal and authorization

Complete one larger, evidence-supported batch within the owner's continuing active-fund discrepancy task: Taurus Regular Growth codes 100476, 100477 and 100480, and DSP Small Cap Regular Growth 105989. Preserve the active-only eligibility rule, raw histories, warnings, archive records and existing financial rules. The owner has already authorized continuing supported fixes, review, deployment and evidence updates; this narrow batch requires no new product decision.

## Evidence gate

The parent independently verifies retained issuer responses, current official code/plan/ISIN identity, historical plan continuity where needed, source-body hashes, saved-history hashes and every overlapping positive value. Restore only precisely identified rejected zero rows. Independently reproduced Taurus positive conflicts must be corrected separately in the calculation copy. No sibling scheme values, interpolation, fitted unit factors, source-only date deletion or issuer-only date addition is permitted.

Taurus evidence comprises seven non-overlapping full-history CSV partitions per scheme, the issuer current NAV asset, separate narrow zero/correction queries, the issuer ISIN table and the unchanged manually supplied official roster. DSP evidence comprises full and narrow issuer history, its issuer scheme summary linking RTA 157/AMFI 105989/ISIN INF740K01797, and issuer documentation of Micro Cap becoming Small Cap.

## Architecture

Add one narrow helper to `src/lib/verified-nav-reviews.ts`, called by the existing calculation review entry point. Keep all existing review behavior unchanged. The four exact identities select literal verified NAVs and literal positive anchor windows. Validate the full chronological series and reject any independent large move before and after a review.

- A restoration requires the exact invalid-observation warning and the complete sorted rejected-zero date list, with no other quality warning.
- Compare complete closed windows by ordered date, value and row count. The target dates must not already be positive.
- Merge cloned restored points chronologically. Change only the separately named Taurus positive date, accepting its observed source value or exact verified replacement.
- For Taurus only, a positive-only correction remains possible after a complete provider zero repair: all three former zero dates must already equal the verified NAVs within the complete eleven-row zero window, with no rejection evidence or quality warning. Partial source repairs, silent omission, unknown positive revisions and changed anchors fail closed.
- A second application makes no changes. Existing raw objects, positive observations and warnings remain intact; the calculation view receives a transparent evidence summary through the existing interface.

## Tasks and verification

1. Independently parse original full/narrow issuer responses and compare the entire retained source and saved histories. Record exact exceptions and all omitted dates without inferring values.
2. Write literal, independent regression fixtures and observe expected failures before implementation. Cover all four identities, source/schema variants, complete/partial proofs, complete windows, positive-only behavior, unknown revisions, existing values, additional warnings/jumps and frozen raw input.
3. Implement the narrow review helper and run affected regressions plus typechecking.
4. Replay all four complete retained source responses through the actual client and server/archive paths. Verify the exact ten added dates, three named positive corrections, all other positive values, raw warnings and all saved observation preservation. A legacy archive without dated rejection proof remains blocked until a valid full-source refresh supplies it.
5. Obtain independent code review, resolve material findings, and run the full necessary validation suite.
6. Publish only the explicit reviewed source/test/docs allowlist on `fix/verified-taurus-dsp-navs-2026-10-29`, based on merged controller commit `8b282a0da8937b9183c6e49862c0ba211c395040`. Verify CI, merge and confirm live deployment separately from archive collection.
7. Append the exact delivery results to the existing case ledger and evidence bundle, preserving all prior findings and raw source flags.

## Design review

Independent review confirmed that these are interior insertions, not a prefix restoration. It required full window comparisons and exact former-zero values in the positive-only branch to prevent a silent omission from being treated as a source repair. Local windows do not prove that an arbitrary future source response has no silent omission elsewhere; existing server saved-history preservation remains binding.

## Execution record

Parent Taurus verification passed on all 28 relevant retained primary bodies, three raw-source bodies and three saved documents. Each scheme has one distinct, independently repeated positive conflict; every other overlapping positive matches. All nine zero replacements match both narrow and full issuer queries. Source-only positives are retained and no issuer-only date is inserted. The issuer ISIN table was visually checked; the current official CSV identity matches after trimming one trailing whitespace character in the 100476 display name.

Parent DSP verification passed on the exact full and narrow issuer bodies, all 4,234 positive source observations, all 4,231 saved positives, and checkpoint 217's immutable shard. Both identity/rename PDF tables were visually checked. The full issuer response has 4,219 matching overlaps and no positive conflict; fifteen source-only dates stay preserved and two issuer-only dates are not inserted.

Four independent literal baseline tests failed as expected before the helper was implemented. The initial implementation passed those tests. Broader identity tests found that an absent reinvestment ISIN was accepted as equivalent to the documented explicit null; the new helper now requires explicit null, and all 47 current guard/API/cache/archive cases pass after that tightening.

The complete offline pipeline replay passed on all four retained histories: 19,427 source positives and 19,417 saved positives, exactly ten insertions and three positive corrections, no other positive change, no unit adjustment, no raw mutation, and parity between direct/cache/archive calculation routes. Legacy archives without complete dated proof stay blocked. No network or production archive write occurred in that replay.

The final new suite passes all 55 cases, including real FundDetail calculation/SIP routing and raw chart/CSV preservation. Seventy existing affected regressions and fresh non-incremental typechecking pass. The full suite passes all 80 test files, and the standalone production Pages build succeeds.

Independent code review found no remaining concrete issue. The reviewer independently replayed all four complete retained source responses and saved documents through actual application/server interfaces, and exercised 14 positive scenarios plus 282 negative mutations. Complete window checks, every partial Taurus mask, silent omission, unknown positive revisions, explicit-null identity, raw preservation, legacy rejection and no second application all behave as designed.

GitHub delivery and verification of the exact served application bytes remain pending at commit preparation. Those operational results will be recorded separately from the successful collector continuation already delivered in PR #78.
