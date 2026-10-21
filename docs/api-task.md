# MFAPI and storage implementation task

Own src/lib/api.ts, src/lib/storage.ts, tests/api.test.ts, tests/storage.test.ts, docs/api-report.md. Shared types already exist at src/lib/types.ts; do not edit them. No product UI or config edits. No commits; site owner integrates. Only mfapi.in, never automated AMFI access.

Implement exactly:

```ts
// api.ts
export async function searchSchemes(query:string):Promise<Scheme[]>;
export async function getFund(code:number, options?:{force?:boolean}):Promise<FundData>;
export function validateFundResponse(payload:unknown,code:number):FundData;
// storage.ts
export function getSettings():ResearchSettings;
export function saveSettings(settings:ResearchSettings):void;
export async function exportBackup():Promise<string>;
export async function importBackup(text:string):Promise<ResearchSettings>;
export async function storageStats():Promise<{fundCount:number}>;
```

Internal cache helpers can be exported between api/storage. Cache validated history in IndexedDB; cache search queries. Keep working in memory if IndexedDB unavailable. Conservative TTL (history6h, search24h), timeout15s, request deduplication, bounded concurrency3, capped retry only for transient failures (respect bounded Retry-After). Force refresh retains good previous cache on error. Returned FundData.fromCache/stale flags and warnings explain network/cache status. Reject older responses replacing newer latest observations. Do not label provider NAV live.

Validate payload status, exact requested scheme_code, nonempty metadata and observations. Parse DD-MM-YYYY explicitly using UTC calendar validation and positive finite NAVs. Deduplicate deterministically, preserve warnings; conflicting duplicate dates or invalid data must flag affected analytics rather than hide problems. Flag single-step move >40% as unresolved discontinuity. FundData warnings containing 'discontinuity', 'invalid' or 'conflict' will block derived analytics in UI; cache warning strings faithfully. Exact full scheme names preserved.

Numeric search input must support code lookup (return meta as Scheme); name queries /mf/search?q= encoded. Empty query returns [] without network. Handle no match as empty, HTTP error as explicit Error, invalid HTTP200/statusSUCCESS as error.

Settings default {version:1,watchlist:[],compared:[],riskFreeRate:0.06,lastFund:null}; annual rate is user assumption, not a sourced historical risk-free rate. Watchlist and comparisons preserve plan codes. Limit4 compared, bounded watchlist (100). Validate restore version, schemes, finite rate greater than-1 and <=1, cache NAV records, duplicates and resource size before any mutation. Backup includes version, createdAt, settings, and cached FundData histories. Restore must avoid partial mutation and must not duplicate funds. Atomic IndexedDB transaction where possible. Export is portable JSON; never include private remote credentials.

Tests first, node --experimental-strip-types --test tests/*.test.ts. Cover invalid200, empty/invalid NAV, reverse-sort, duplicate handling, code identity, empty search, stale cache fallback via injected fetch or mock global only around network, and backup schema rejection before mutation. Use a small fake storage or memory fallback without extra dependencies. Write report with command and evidence. Parent handles browser end-to-end verification.
