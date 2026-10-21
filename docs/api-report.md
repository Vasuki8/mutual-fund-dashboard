# MFAPI and local storage implementation report

## Delivered files and contracts

- `src/lib/api.ts`: `searchSchemes`, `getFund`, and `validateFundResponse`.
- `src/lib/storage.ts`: `getSettings`, `saveSettings`, `exportBackup`, `importBackup`, `storageStats`, and `getStorageGeneration`, plus internal cache and validation helpers used by the API.
- `tests/api.test.ts` and `tests/storage.test.ts`: 47 focused behavioral tests.

No shared types, UI, package/configuration files, or other ownership areas were changed. No commits or publication were performed.

## Data validation

Only `https://api.mfapi.in` is used by the network client. There is no AMFI request path. Scheme codes are positive safe integers; a provider response must have `status: SUCCESS`, matching numeric `meta.scheme_code`, nonempty scheme/AMC/type/category metadata, and usable NAV observations. A mismatched or zero code is rejected even if the provider reports HTTP 200 and SUCCESS.

MFAPI `DD-MM-YYYY` dates are parsed with explicit UTC calendar checks. Output dates are ISO `YYYY-MM-DD`, sorted ascending. NAV values must be positive and finite. Impossible calendar dates, blank/null/boolean NAVs, and nonfinite or nonpositive values are invalid. If some rows are invalid, usable observations are retained with an explicit `invalid` warning; an entirely unusable series is rejected.

Identical duplicate dates are consolidated. Conflicting duplicates retain the lowest value deterministically and add a `conflict` warning. Any single-observation move greater than 40% adds an unresolved `discontinuity` warning. These keywords match the UI analytics guard. Quality warnings survive cache reads, exports, and restores; restore also re-evaluates duplicate conflicts and discontinuities from the submitted observations. Invalid backup observations reject the entire restore.

Full scheme names and plan identifiers remain intact. Fund metadata contains the fields actually provided by MFAPI; it does not invent AUM, TER, holdings, benchmarks, or official risk ratings.

## Requests and caching

- History cache TTL: 6 hours. Search cache TTL: 24 hours.
- Fetch timeout: 15 seconds per attempt, including response-body reading.
- Maximum concurrent provider requests: 3 across history and search.
- At most one retry, only for network/timeout failures or HTTP 408, 425, 429, 500, 502, 503, and 504.
- `Retry-After` supports seconds and HTTP dates. Waits are bounded to 5 seconds; a longer server request is surfaced without retrying early. The default retry delay is 250 ms.
- Concurrent requests for the same fund or normalized name query share a request.
- Request deduplication includes the storage generation. A validated restore supersedes previous requests, which reject with `StorageGenerationError` instead of returning an old network response or cached fallback.
- Fresh cache responses are marked `fromCache: true`. A failed refresh retains the previous history, marks it `stale: true`, and provides the reason. Older latest observations never replace a newer saved history.
- Name queries are URI-encoded; empty queries return immediately. Numeric queries retrieve exact scheme metadata. Empty result arrays mean no match, while HTTP and malformed-payload failures are errors.
- Search failures do not silently substitute expired search results, because the `Scheme[]` return contract has no stale-status field.
- Persistent histories and searches use IndexedDB. If it is absent, blocked, or fails, the session continues with an in-memory cache and a returned persistence notice. Settings use a synchronous localStorage mirror with an in-memory fallback.
- Settings read/write failures produce a separate persistence notice through `storageWarning()`, without marking IndexedDB/history storage unavailable. A successful subsequent settings write clears only the settings notice.

The client reports provider NAV dates and fetch/cache status; it does not describe NAV as a live market price.

## Portable backup behavior

Backups contain only version, creation timestamp, validated settings, and cached `FundData` histories. No remote account credentials are collected or exported. Restore replaces settings and cached histories; repeating the same restore does not duplicate funds. Search caches are cleared on restore.

Every submitted value is validated before mutation. Limits are 20 MiB per backup, 500 histories, 20,000 records per history, and 500,000 total normalized observations. Watchlists allow 100 distinct scheme codes; comparison lists allow 4. The assumed annual risk-free rate must be finite, greater than -1, and at most 1; its default is the user assumption 0.06. Duplicate scheme IDs and duplicate fund records are rejected.

Where IndexedDB is available, fund replacement, search clearing, and the settings snapshot commit in one transaction. Memory and the localStorage settings mirror update only after the transaction succeeds. A transaction failure rejects restore and retains prior application state. Without IndexedDB, validated values are committed to memory together. localStorage and IndexedDB are separate browser facilities; if localStorage is blocked, synchronous settings remain available for the current session and in exported backups.

`getStorageGeneration(): number` exposes the current workspace generation for UI request guards. Complete validation occurs before the generation advances, and the advance happens synchronously before restore begins asynchronous persistence work. The generation stays advanced if a valid restore later fails to commit; canceled requests must never be revived. Invalid backup schemas do not change it.

Cache mutations and restore operations are serialized. Starting a validated restore aborts active older write transactions. Generation checks surround asynchronous cache reads, IndexedDB opening, network responses, retries, and cache writes; new-generation reads wait until the pending restore finishes. Thus an old response with the same final date cannot overwrite the restored NAV, and a failed old request cannot return its captured pre-restore cache.

## Verification evidence

Tests were written before the implementation. The initial run failed against explicit `Not implemented` stubs; direct execution confirmed the expected storage hook failures. The sandbox initially hid isolated child-process output, so isolated Node test runs were repeated with the required execution permission. A parser error revealed by the first implementation run was corrected before verification.

Final checks on Node 24.19.0:

```text
node --experimental-strip-types --test tests/api.test.ts tests/storage.test.ts
47 API/storage tests in the final combined run; all passed

node --experimental-strip-types --test tests/*.test.ts
77 tests; 77 passed; 0 failed

node node_modules/typescript/bin/tsc --noEmit
exit code 0; no diagnostics
```

Coverage includes invalid HTTP-200 success payloads, code identity, UTC date validation, invalid rows, duplicate/conflicting dates, discontinuities, search encoding/numeric lookup, cache isolation and TTL fallback, force-refresh preservation, request deduplication/concurrency, transient retries, long Retry-After handling, portable backup roundtrips, resource limits, warning reconstruction, and rejection before mutation. Added release-review regression tests initially failed for the same-date restore race, old-cache fallback, old-promise deduplication, settings write/read warnings, and IndexedDB boundaries; they pass after the fixes.

The automated storage tests exercise the no-IndexedDB memory fallback and a small transactional IndexedDB fixture covering delayed opening, delayed commit, transaction abort, rollback, and generation-aware reads. Settings tests simulate quota/access failures, subsequent successful writes, and module reloads. The parent owns real-browser verification of IndexedDB persistence, reload behavior, blocked-storage handling, UI status, and import/export interactions.

## Official source checks informing the implementation

- [MFAPI documentation](https://www.mfapi.in/docs/)
- [MFAPI OpenAPI specification](https://www.mfapi.in/docs/openapi.json)
- [MFAPI homepage](https://www.mfapi.in/)
- [Parag Parikh Flexi Cap Direct Growth response](https://api.mfapi.in/mf/122639/latest)

Read-only live checks on 21 October 2026 verified Direct Growth codes 122639 (Parag Parikh Flexi Cap), 120716 (UTI Nifty 50 Index), 118955 (HDFC Flexi Cap), 118778 (Nippon India Small Cap), 120586 (ICICI Prudential Large Cap, formerly Bluechip), and 125497 (SBI Small Cap). All six latest responses were dated 19 October 2026. The documentation's HDFC example for 125497 is illustrative/mislabeled; real metadata identifies SBI Small Cap.

Live requests returned `Access-Control-Allow-Origin: *`. No Cache-Control, ETag, or Last-Modified response headers were observed. The homepage says no rate limiting, while the documentation describes fair-use rate limiting and asks clients to cache. This implementation follows the conservative documentation guidance. No automated AMFI downloads were used.
