# Keep routine refreshes moving

## Purpose and evidence

The owner requested completion of the existing bulk task. Checkpoint 238, published on 30 October 2026 at 04:21 UTC, contains all 8,526 eligible histories. Its refresh backlog is 3,420: 609 have raw quality flags, 74 have source errors without quality flags, and 2,737 otherwise clean histories lag the catalogue.

Run 41001225326 selected 40 quality histories across the 16-shard limit. All remained unresolved, so the existing controller correctly stopped for `no_reconciliation_progress`. The selector places every recent lagging history in priority 2, regardless of its saved outcome. Older failed/quality histories can therefore occupy every shard before routine clean refreshes. An independent replay of checkpoint 238 reproduces this ordering.

## Approaches

1. **Prioritize due clean lagging histories before retries of saved problem histories.** This addresses selection at its source and keeps the verified-progress requirement. This is the implementation choice for the authorized bulk continuation.
2. Count unchanged quality retries as progress. Rejected: an attempt alone cannot prove repaired data or a smaller backlog.
3. Increase shard, request or chain limits. Rejected: larger limits do not correct ordering and increase the resource budget.

## Change and boundaries

Restrict priority 2 to recent lagging states with `status === 'clean'` and `quality === false`. Saved source-error and quality histories use the existing recent-issue priority. First attempts and due recent missing histories retain their higher priority. Normal retries still run when selected; sharing an admitted shard may include them in the same batch.

Keep the active-only official-roster/current-catalogue/positive-NAV/30-day filter, full historical scope, retry delays, source cooldowns, 512-scheme/16-shard limits, two workers, persistence reserve, sequence fences, publication verification and 12-run/four-hour chain limits. Keep every saved observation and warning. Do not change the controller, workflow triggers, archive format or calculation rules.

## Verification

Reproduce a clean refresh displaced by 16 older problem shards. Verify that an actual in-memory collector refresh reduces the backlog and the unchanged controller permits its successor. Cover saved source errors, missing-history priority, backoff, deterministic ordering and preserved raw flags. Replay the retained real checkpoint, run the existing suite and typecheck, then independently review the patch. Publish through a focused PR from current main and verify the normal collector and Pages results.
