# Active-fund 30-day repair scope implementation plan

**User requirement:** Resolve discrepancies only for active funds that posted NAV in the last 30 days. Preserve the existing manually supplied official scheme-code roster.

**Design:** Repair eligibility means exact membership in the existing open-ended roster, current MFAPI catalogue membership, a finite positive latest NAV, and a valid latest NAV date no more than 30 UTC calendar days old and not in the future. Use the runner's actual date, not the newest date in a potentially stale catalogue. Exactly 30 days is included; 31 days is excluded. This operational definition is not confirmation of purchase eligibility.

An eligible fund's **whole historical series** remains subject to investigation. Do not truncate analysis to 30 observations or change old prices. Older/excluded fund records, source flags, saved checkpoints and raw NAV remain stored. Keep the website discovery filter's existing seven-day rule unchanged: the user changed repair scope, not directory display.

**Approach:** Add one repair-only predicate, use it in both the automated collector and active-subset audit. Do not merely prioritize active funds while leaving old funds eligible. Do not filter the stored catalogue or rewrite all-universe accounting to make excluded issues look resolved. Keep the general collector engine usable by existing synthetic transport/storage tests; the production CLI must explicitly enable the restrictive policy, without an environment-variable escape hatch.

**Tech stack:** Existing TypeScript, Node test runner and GitHub Actions; no added dependency, provider or automated AMFI request.

## Implementation and checks

1. Add regression tests against the existing collector and audit. Exercise exact 30/31-day boundaries, current/absent identities, future dates, missing/invalid NAV, an empty eligible set, retained off-scope state/history, retry backoff and re-entry after a fresh catalogue NAV. Observe failures before implementing.
2. Add `scripts/active-repair-scope.ts` with the finite-positive NAV/date/roster guard and a 30-day constant.
3. Add an opt-in `activeRepairOnly` policy to the general tranche engine and enable it unconditionally in its production CLI. Filter before shard selection and recheck immediately before each history request. Leave catalogue refreshes running so eligibility can change over time. Preserve source cooldowns, retry delays, workload limits and history merge rules.
4. Change the daily audit's active subset to the same 30-day predicate. Retain full historical totals, clearly marked as storage/accounting totals, not the active repair queue. Update the existing audit fixture's window assertion.
5. Run full typecheck, all tests and both production builds. Review the full patch, merge only a passing revision, and distinguish code/deployment verification from an independently verified live 30-day count.

## Review focus

- A stale catalogue cannot make old funds look recent.
- Ineligible entries consume no history request or shard slot, including first attempts.
- A saved out-of-scope neighbour in a rewritten shard must remain byte-for-byte equivalent as a document and state.
- Re-eligibility is evaluated from each refreshed catalogue, with no permanent exclusion label.
- Scope changes do not clear warnings, lower immutable checkpoint totals or certify old issues as repaired.
