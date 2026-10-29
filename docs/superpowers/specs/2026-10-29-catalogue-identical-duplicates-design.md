# Consolidate identical scheme-list rows

## Intent and evidence

Restore verified catalogue updates when the provider repeats the same scheme identity. On 29 October 2026, the public `/mf` response contained 76,008 rows representing 38,004 unique codes, each repeated exactly twice. All four identity fields matched within each pair. `/mf/latest` contained 38,004 unique codes. The one-row probe at offset 76,007 matched the last returned identity, and offset 76,008 was empty. The existing validator reproduced the production `membership_list / duplicate_scheme_code` error.

The owner's standing instruction covers data repairs, preservation, tests, review and release. The implementation choice below is an engineering decision within that work.

## Approaches

Waiting for the provider preserves strict rejection but leaves a known equivalent-row defect blocking catalogue updates. Accepting arbitrary duplicate codes risks hiding conflicting identities. Consolidating only identical validated identities preserves one record per code and keeps conflicting duplicates blocked; use this approach.

## Behavior

- In `fetchVerifiedCatalogue`, validate every list row with the existing `scheme` validator.
- Retain one identity per code only when the validated name, Growth ISIN and dividend-reinvestment ISIN are equal. Missing and explicit-null identifiers remain distinct unless the existing validator already normalizes them.
- Reject a conflicting repeated code with the existing static diagnostic. Keep bulk-NAV duplicate rejection unchanged.
- Apply minimum-size and 90% contraction checks to the unique identity count. Keep the 100,000 raw-row ceiling.
- Probe the endpoint at the raw response length, because documented offsets count results, including repeated rows. Require the same empty terminal array.
- Report the number of consolidated rows in catalogue warnings. Membership metadata and current entries count unique codes.
- Preserve the three-request metadata flow, deadlines, retries, cooldowns, raw histories, source-quality warnings, repair eligibility and seven-day discovery filter.

## Verification and delivery

Regression tests cover exact copies, each conflicting identity field, missing versus null identifiers, unique-count guards and terminal failures. A collector test proves unchanged saved shards and quality state. Replay the captured source responses offline before and after the patch, validate candidate counts and input hashes, then run the required suite, typecheck and builds. Obtain an independent whole-patch review, publish through a focused pull request, and verify CI, merge and deployment separately. Source captures remain separate evidence; the public repository receives synthetic tests and a concise technical explanation.
