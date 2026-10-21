# Persistent archive server implementation

## Scope delivered

- `server/archive.ts`: JSON API orchestration, token authentication, on-demand histories/search/status, and resumable start/step/finish operations.
- `server/provider.ts`: fixed-origin MFAPI transport, streamed response-size checks, per-attempt timeout, controlled pacing, maximum two simultaneous requests, and bounded transient retry with Retry-After handling.
- `server/validation.ts`: exact raw NAV-string retention, calendar/identity validation, deterministic duplicate handling, quality warnings, complete-history merging, and retained catalogue identities.
- `server/store.ts`: injected D1/R2 persistence, primary-first D1 sessions, immutable history objects, compare-and-swap archive pointers, durable failures, and renewable/fenced synchronization leases.
- `server/types.ts`: internal injected-binding and persistence types. The shared client/server contracts were not modified.
- `db/schema.ts`: six tables for state, archive indexes, runs, idempotency keys, failures, and leases. Root generated the matching migration; server request code does not create or alter tables.
- Six thin `app/api/**/route.ts` wrappers for the specified endpoints; only these wrappers import `cloudflare:workers`.
- `tests/server-archive.test.ts`: 25 behavioral checks using real SQLite behind a D1 adapter and a small in-memory R2 implementation.

## Archive and synchronization behavior

Every new scheduled idempotency key fetches the complete `/mf/latest` response with no pagination. The raw latest snapshot, normalized catalogue, and work queue are written as immutable R2 objects before the D1 pointer and successful timestamp are published together. Previously known and already archived codes remain in the catalogue union, including schemes missing from subsequent provider responses. Null or invalid latest NAV values retain scheme identity and produce explicit warnings.

Replaying the same key returns/resumes its original run. A new key supersedes an interrupted running invocation only after the new snapshot is durable; remaining histories and failures survive. Backfill and refresh work are interleaved while both exist, with oldest successful refreshes first and never-attempted backfill ahead of repeatedly failing schemes.

Each step clamps its requested count to 1–20 and processes at most two schemes at once. It stops launching another pair once eight seconds have elapsed, allowing an already running pair to complete its bounded provider retry before the updater's request timeout. Successful history publication precedes cursor advancement. A crash between publication and checkpoint advancement resumes without refetching or counting that history twice. Failures retain attempts and next retry time; pending includes unresolved failures, so callers should finish after unchanged steps or an invocation budget and expect an honest partial result.

Histories retain all available validated dates without a year cutoff. Complete-source responses merge into the prior history by date; omitted old dates survive, and clean newer source corrections preserve their raw decimal strings. Immutable objects plus version-checked D1 pointer updates prevent concurrent readers/updaters from losing dates or replacing newer corrections with an earlier in-flight request. Earlier failed requests cannot leave a false failure after a concurrent successful refresh.

Mixed-quality histories retain usable observations and blocking Invalid NAV/Conflicting NAV warnings. Histories with no usable observations remain unresolved rather than being labelled archived successfully. If a later response is truncated, blocking warnings on retained older observations survive until covering clean source data resolves them. Unknown-code HTTP-200 SUCCESS payloads cannot create an archive.

GET history responses include complete MFAPI-style data plus `_fundscope`. Six-hour freshness is invalidated early when the persistent catalogue already announces a newer date. Provider/storage refresh failures return an existing saved history with its original successful fetch time and explicit stale provenance. Search validates provider results and falls back to the persistent catalogue, including exact numeric-code matches and disappeared schemes, without a tiny result cap.

All synchronization POSTs reject missing configuration or an incorrect token before provider/storage access. Token equality compares SHA-256 digests in a fixed-length loop. The server constructs MFAPI URLs from validated codes or an encoded search query and rejects provider redirects; it never accepts client-supplied NAV histories or arbitrary upstream URLs.

## Verification evidence

- Initial red: the persistent archive API availability assertion failed before implementation existed.
- Concurrency red/green: a deliberately slower old request initially downgraded a newer archive's freshness; its regression now proves that newer values/timestamps stay current while additional old dates are retained.
- Four additional red/green regressions covered interrupted-run catalogue suppression, step elapsed budget, a stale failure racing a successful archive, and truncated-refresh removal of historical quality warnings.
- A further red/green regression proved that a newly published catalogue observation invalidates a fresh-but-outdated six-hour history cache.
- `node --experimental-strip-types tests/server-archive.test.ts`: **25 passed, 0 failed**.
- `npm test`: **all seven project test files passed**, including client analytics/API/storage, request handling, visualization data, server archive, and updater runner tests.
- `node_modules/.bin/tsc --noEmit`: **exit 0**.
- Inspected root-generated `drizzle/0000_organic_swordsman.sql`; tables and fields match the server's prepared SQL.

No dependencies were installed, migrations run, commits created, or deployments performed by this task.

## Remaining operational limits

- Hosted D1/R2 migration, write/readback, release build/deployment, secret injection, and actual scheduled executions are root integration checks, not established by these local tests.
- A new installation has a durable backfill backlog. Bounded runs do not claim all-provider history completion after catalogue success. Schemes whose provider histories are empty or have unresolved quality issues can remain pending indefinitely until the source changes.
- Historical observations are stored per scheme; only catalogue/index/work metadata for the universe is held together in memory. Current guards allow up to 100,000 schemes/observations per validated array, 32 MiB for latest snapshots, and 16 MiB for other provider responses.
- Old published immutable object versions and failed pre-publication objects are retained. Reference-aware garbage collection is not included; an indiscriminate R2 age-expiry policy would be unsafe because an old object may still be the live pointer for an inactive scheme.
- Status exposes durable coverage and configured UTC times. Actual scheduler enablement is established separately by the saved schedule tasks and their execution evidence.
