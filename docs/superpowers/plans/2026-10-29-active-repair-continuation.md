# Active repair continuation implementation plan

> **For agentic workers:** Use `superpowers:executing-plans` for the implementation and an independent final review.

**Goal:** Continue a bounded collector chain when the eligible active queue makes verified progress, even when excluded catalogue identities remain unattempted.

**Architecture:** Keep complete-archive counts unchanged. For active-only runs, calculate before/after repair counts against the same current catalogue, exact eligibility rule and checkpoint timestamp. Return that optional progress record only after checkpoint readback. The continuation controller verifies its resulting counts against the authoritative snapshot and uses its pending count and progress to choose the existing continuation rule. Older results retain the existing conservative fallback.

**Tech stack:** Existing TypeScript collector, Node 24, GitHub Actions and Release archive. No new dependency.

**Spec:** Repository `AGENTS.md` active repair scope and the observed checkpoint 217 stop described below.

## Evidence and decision

Run 40921799255 completed 118 source attempts and published checkpoint 217, then stopped with `no_first_pass_progress`. Its full catalogue contains four pending codes, 154858–154861. None belongs to the official open-ended repair roster. All 8,526 eligible schemes already have saved histories. The global pending count therefore does not describe the repair queue.

Progress comparison also used prior full-archive counts captured at a different time and catalogue state. This lets excluded or newly aged histories hide a verified reduction in the active refresh queue. Both sides of the new comparison must use the same final catalogue and timestamp. Excluding a fund or changing the catalogue must not itself count as source repair.

Use an optional `activeRepairProgress` record containing `asOf`, `before` and `after` counts. Do not change archive formats or published total counts. Do not change triggers to launch work. The existing push trigger already covers substantive controller/collector fixes.

## Constraints

- Preserve exact official open-ended membership, independently verified current catalogue membership, finite positive NAV and a real date within 30 actual UTC calendar days.
- Preserve the separate seven-day website discovery rule.
- Preserve all saved observations, raw quality flags and full-archive accounting.
- Keep the existing 512-scheme, 16-shard, two-worker, nine-minute collection limits, two-minute commit reserve, retry/cooldown rules, 15-minute pacing, 12-run and four-hour chain caps.
- Keep sequence fencing, live publication verification, rerun restrictions and single dispatch semantics.
- No automated AMFI calls, source-data backfill from this host, or manual workflow dispatch workaround.

## Review focus

- Excluded pending schemes must not block demonstrated active repair progress.
- A catalogue change or clock advancement alone must not create repair progress.
- Forged, stale, malformed or inconsistent active progress must fail before dispatch.
- UTC-day changes must use the actual checkpoint timestamp for both sides of the comparison.
- No-op runs, unresolved-only repeats, cooldowns, chain caps and old results must retain conservative stopping behavior.

## Task 1: scoped collector proof and controller decision

**Files:** `scripts/github-history-v2.ts`, `scripts/backfill-control.ts`, `tests/github-history-v2.test.ts`, `tests/active-repair-continuation.test.ts`, `docs/GITHUB_ARCHIVE.md`.

**Interface:** Add optional `TrancheResult.activeRepairProgress: { asOf: string; before: ArchiveCheckpoint['counts']; after: ArchiveCheckpoint['counts'] }`. `asOf` is exactly the committed checkpoint's `updatedAt`. Calculate both counts for the final eligible catalogue, with absent prior identities represented as pending. Keep `counts` as the full archive. For an active-only committed run, calculate `reconciliationAdvanced` from the two scoped counts; require actual source attempts as before.

- [x] Write a failing real collector test: one eligible saved history improves while four excluded records remain pending. Check the original four pending states and all full totals are preserved; scoped before/after refresh counts change from one to zero.
- [x] Write a failing controller test with a valid snapshot and the same four excluded pending identities. Verified scoped progress must dispatch exactly one successor after publication; the existing implementation stops.
- [x] Add negative cases for unchanged active counts, malformed values, a wrong timestamp, a wrong post-count record, an inconsistent progress flag, an uncompleted eligible first pass, a chain cap and cooldown. Keep old-result regression coverage.
- [x] Run the new tests and retain the expected failures before changing production code.
- [x] Implement the optional proof after checkpoint readback and validate it in the controller. Validate count arithmetic, equal scope sizes, bounded source-attempt deltas and the exact post-count recomputation.
- [x] Run focused collector/controller tests and typecheck, then the full suite. Replay the retained checkpoint without source requests to verify scope and preservation.
- [x] Obtain an independent code review. Fix material findings and run the affected checks again.
- [ ] Publish on a focused branch, verify CI, merge, and verify the resulting ordinary collector/publication behavior without changing workflow files or dispatching an extra collector.

## Execution record

Pre-flight: collector result and controller validation share the new optional interface. Existing snapshots and manifests do not change.

Ruling: implement the narrow correction within the already authorized bulk repair work. Repeated continuation requests and the existing active-only scope determine the intended behavior; no new product choice or permission is required.

Ruling: use the verified recovered source tree with a focused GitHub branch. This workspace is not a local Git checkout; compare local blobs with the immutable main tree before publishing and keep repository source out of the evidence ZIP.

Task 1 validation: the initial collector regression failed because a valid refresh returned `reconciliationAdvanced=false`; the controller regression failed with `no_first_pass_progress`. After the correction, all three focused test files and typechecking passed. The full suite passed all 79 test files with no failures or skips.

The retained checkpoint replay reconstructed checkpoint 216 from the disjoint logged tranche attempts and the immutable 215/217 states. Its full counts exactly match the recorded checkpoint 216 counts. At checkpoint 217's common clock, the active refresh backlog fell from 8,108 to 7,997; the source-error count rose from 42 to 48. The corrected controller selected one fenced successor in an offline simulation. No source request, real dispatch or archive write occurred in that replay.

Independent review found one UTC-boundary issue: an actually saved first-attempt fund could age out during the tranche and incorrectly satisfy the remaining first-pass rule using global counters. A failing real producer/controller regression reproduced this. The pending branch now requires positive attempted and saved deltas within the verified final eligible cohort. Both the aging-out negative case and a still-eligible positive control pass. The three affected test files and typechecking pass after this final correction. An independent rerun confirms the aging-out case performs only publication verification and no successor dispatch; the reviewer found no remaining material issue in the scoped continuation, legacy fallback, publication checks, sequence fences, caps or cooldown handling.

GitHub publication and live-run observation are pending at commit preparation. The delivery record will distinguish CI/deployment evidence from the separate archive continuation result.
