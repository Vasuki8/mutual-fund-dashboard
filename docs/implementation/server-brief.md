# Server archive task

Read the design spec and shared src/lib/sync-types.ts. Work only in server/*, db/schema.ts, app/api/** and tests/server-*.test.ts. Root owns configs, client code, migration generation, credentials, publication and schedules. Do not commit or spawn subagents.

Build real D1/R2 persistent market data. db/schema.ts uses Drizzle; request code can use prepared parameterized D1 SQL, one statement per prepare, batch writes. No create/alter table in routes. R2 full histories, durable latest/catalogue snapshot; preserve raw NAV string precision. Avoid placing all historical observations in one memory object.

Use env from cloudflare:workers only in thin route wrappers; core functions inject {DB,BUCKET,FUNDSCOPE_SYNC_TOKEN} and fetch so Node tests can use small fakes. Core tests must assert real resulting histories/status, not merely mocked method calls. Separate validation/merge from persistence.

Endpoints are fixed by the spec. All sync POSTs require x-fundscope-sync-token with constant-time hashed comparison against FUNDSCOPE_SYNC_TOKEN. Reject missing config or bad token before fetch/storage. Worker only reads MFAPI URLs constructed from validated scheme codes; never trusts uploaded NAV payloads.

start: {idempotencyKey:string <=100}. Idempotent per key; resume a running run or return completed/partial state consistently. Fetch complete /mf/latest (no pagination; ~11MB, 37,982 rows currently); derive full catalogue and latest dates, union previously known codes. Store snapshot before publishing metadata/pointer. No full universe DB row upserts in one giant request; R2 catalogue + D1 archive indexes are suitable. Persist last successful catalogue timestamp only after successful writes. Preserve old snapshot on failure. Avoid sharing old cached snapshots as newly fetched.

step: {runId:string,limit?:number}, clamp1..20. Max2 upstream requests concurrently; controlled pacing, per-attempt timeout, bounded transient retry respecting Retry-After. Full /mf/{code} history only. Persist successful scheme before advancing checkpoint. Resume after interruption, avoid concurrent duplicate run corruption via a durable lease. Prioritize refreshing existing archived histories needing newer observations and then unarchived schemes; keep failures/backfill durable. This is long-running backlog, not a claim one 20-scheme step archives everything. Keep prior histories when source returns older/truncated/invalid history; merge complete source observations into prior data by date, preserving all older dates. Record corrections/coverage honestly. A scheme absent from current catalogue must remain retrievable from archive.

finish: {runId:string}, accurately mark partial when backlog remains; never mark full-universe history complete on catalogue success alone. Response for all three operations uses SyncProgress.

GET /api/data/status uses SyncStatus, with schedule timezone UTC, times ['05:37','17:37']. Counts must come from durable state. Empty initial deployment is valid status with warnings.
GET /api/mf/search?q supports validated provider search plus persistent catalogue fallback, matches names or exact numeric code. Do not cap away all results at an arbitrary tiny count.
GET /api/mf/[code] serves full MFAPI-style history + _fundscope: ArchiveProvenance. Use a 6h server cache; stale fallback on upstream failures with accurate fetchedAt/stale flags. On-demand reads archive full histories too. Safeguard concurrent read/sync writes against downgrade. Never merge different scheme codes. Validate unknown-code HTTP200 SUCCESS empty metadata as an error; legitimate empty history on bootstrap is unresolved, not success. Raw observations/invalid values must be rejected or warned consistently with existing quality gate. Return appropriate JSON error/status (no HTML stack).

Return concise report docs/implementation/server-report.md with files, tests/red-green proof, remaining limits. Request any contract change from root before applying it. Do not edit sync-types.ts.
