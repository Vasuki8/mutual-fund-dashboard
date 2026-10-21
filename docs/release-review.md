# FundScope first-release correctness review

Reviewed 2026-10-21 against the approved first-release design and implementation plan. Scope: analytics, API/cache, backup/settings, explorer, fund detail, comparison and their chart integration. This was a read-only source review with targeted Node reproductions; application source was not modified and browser QA belongs to the site owner.

## Decision

Scoped re-review on 2026-10-21: all four findings are resolved, including the failed-restore request-cleanup boundary identified during follow-up. No material blocker remains in these reviewed paths. No P0/P1 issue was identified. The site owner retains final full-suite, production-build and browser gates.

## Scoped re-review

| Original finding | Status | Evidence |
| --- | --- | --- |
| 1. Restore can be overwritten by earlier requests | Resolved | API promises are keyed by generation, storage writes are serialized, and old responses/fallbacks reject. App callbacks reject stale generations; pending-entry reuse checks generation, and finalizers clean up only the exact task they own. Both successful and failed restores are covered. |
| 2. Malformed refresh blocks a valid cache | Resolved | `qualityBlocked` now matches only anchored source-observation warnings. Operational refresh errors no longer match; actual invalid NAV, duplicate conflicts and discontinuities still block. |
| 3. Rolling chart loses shared-endpoint windows | Resolved | `rollingChartData` keys each window by its unique start date. The detail view labels the horizontal axis accordingly, and hover includes the end date. Both 21% and 10% outcomes survive the chart's date map. |
| 4. Settings write failures are silent | Resolved | Read/write failures now produce a settings-specific `storageWarning`. Save updates state synchronously before checking the warning, the app displays a persistent banner, and restore feedback distinguishes a session-only fallback. Tests demonstrate the warning before reload and its clearing after a successful durable write. |

### Follow-up P2 under finding 1 — Failed-restore request cleanup resolved

**Current locations:** `src/lib/storage.ts:418` (`importBackup` generation boundary), `src/App.tsx:27` and `:31` (`ensureFund` pending lookup and finalizer), `src/components/Methodology.tsx:13` (success-only `restore` callback).

A valid backup advances the storage generation before its IndexedDB transaction. If that transaction aborts, the old workspace is retained and the generation intentionally stays advanced. In the first re-review revision, an earlier `ensureFund` promise then rejected as superseded, but both its catch and finalizer returned immediately on generation mismatch. Its `inFlight` entry and loading marker remained because the successful-import `App.restore` callback did not run. Every later call for the same scheme—including a forced retry—joined the already-settled old promise without issuing another request.

**Pre-fix reproduction:** Run that revision's `ensureFund` block extracted directly from `App.tsx` with the real API/storage modules and an IndexedDB fixture that aborts the restore transaction. Start a first-time fund request, hold its response, attempt the valid restore, then release the old response and force a retry. Observed:

```text
Restore failure: Backup restore could not commit to browser storage. Previous settings and histories were retained.
startGeneration: 0
endGeneration: 1
inFlight: 1
loading: [122639]
errors: {}
fundCount: 0
networkRequestsAfterForcedRetry: 1
```

**Verified correction:** `inFlight` entries now contain `{ generation, task }`. A load joins only an entry from the current generation. The finalizer checks exact task identity rather than refusing all cleanup after a generation change, so it clears its own obsolete task without disturbing a successor. Re-running the same failed-restore reproduction observed `inFlight: 0`, `loading: []` after the old response, followed by a successful forced retry with `networkRequests: 2` and one loaded fund.

**Regression preserved:** `tests/app-requests.test.ts` extracts/transpiles the actual App callback and injects only its hook/state boundary. It uses the real API/storage modules and an aborting IndexedDB fixture. It verifies recovery after an aborted restore and verifies that an obsolete task settling while a successor is pending cannot clear that successor or its loading marker. No request implementation is copied into the test.

**Fresh verification:** `node --experimental-strip-types tests/app-requests.test.ts` passed 1 test with 0 failures. `node --experimental-strip-types --test --test-reporter=tap tests/app-requests.test.ts tests/api.test.ts tests/storage.test.ts tests/visual-data.test.ts` exited 0 for all four test files. No browser or application-source edits were performed by this reviewer; the report and the explicitly requested new regression test are the only owned changes.

## Original findings and reproductions

### 1. P2 — A request started before restore can overwrite the restored snapshot

**Locations:** `src/lib/api.ts:126` (`refreshFund`), `src/lib/storage.ts:248` (`putCachedFund`) and `:319` (`importBackup`), `src/App.tsx:26` (`ensureFund`) and `:37` (`restore`).

Import commits its replacement cache, but outstanding requests retain permission to write afterwards. The application also keeps its `inFlight` map and outstanding success/failure callbacks when resetting loaded funds. Consequently, an old request can repopulate restored state, and a post-restore view can join that old promise. Latest-observation protection does not help when the two histories have the same final date.

**Reproduction:** Seed a valid Growth history ending 2025-01-02 at NAV 110. Start a forced `getFund` refresh and hold its fetch response. Restore a backup ending on the same date at NAV 105. Release the old request with a valid response ending at NAV 120. A targeted Node run observed:

```text
After restore, before old response: 105
Old request returned: 120
After old response: 120
```

The final value came from `exportBackup()`, so the restored cache itself changed. A failed old refresh can also return its captured pre-restore cache to the application.

**Required behavior:** Treat successful restore as a new workspace generation. Prevent earlier operations from mutating either the cache or React state, and ensure subsequent loads do not join earlier requests. Add a deferred-response regression test covering restore during refresh.

### 2. P2 — A malformed refresh response disables valid cached analytics

**Locations:** `src/lib/api.ts:137` (fallback warning construction), `src/lib/format.ts:11` (`qualityBlocked`), and the safety gates in `FundDetail`/`Comparison`.

Data-quality classification searches every warning for `invalid`, `conflict` or `discontinuity`. Operational refresh failures share that warning array. Thus “MFAPI returned invalid JSON” is interpreted as a defect in the retained NAV history, although the malformed response was discarded.

**Reproduction:** Seed a clean, valid Growth history with no warnings. Mock a forced refresh to return HTTP 200 with body `{`. The targeted run returned unchanged cached observations and `stale: true`, but `qualityBlocked(fallback)` was also `true`. The UI consequently replaces usable cached return/risk analytics with unavailable values and blocks comparison.

**Required behavior:** Separate data-quality state from refresh/cache messages, or otherwise classify only warnings about the retained observations. Keep valid cached analytics usable after response-parsing failure while displaying the stale-data explanation. Test the safety gate together with the fallback result.

### 3. P2 — Rolling charts silently discard valid windows sharing an end date

**Locations:** `src/lib/analytics.ts:205` (`rollingReturns`), `src/components/FundDetail.tsx:57` (chart input keyed by window end), `src/components/Chart.tsx:26` and `:46` (date deduplication).

Different start dates can have anniversaries that resolve to the same preceding NAV date, commonly around weekends. The rolling engine correctly retains those distinct windows. The chart collapses them into a `Map` keyed only by end date and retains the last value. The summary cards and best/worst table still use every window, so an extreme shown in the summary can disappear entirely from the plotted series.

**Reproduction:** Use these ascending observations:

| Date | NAV |
| --- | ---: |
| 2023-01-05 | 100 |
| 2023-01-06 | 110 |
| 2024-01-05 | 121 |
| 2024-01-08 | 122 |

`rollingReturns(points, 1)` returns two windows ending 2024-01-05, at 21% and 10%. Applying the chart's `byDate` transformation yields only 10%, while the best-window summary remains 21%. This was reproduced in Node.

**Required behavior:** Preserve every window in the chart with a unique horizontal identity, such as its start date with corresponding labels, or adopt a clearly documented single-window-per-end-date convention consistently in both calculations and chart. Do not silently drop windows at the rendering boundary.

### 4. P2 — Settings persistence failures are silent despite “saved” feedback

**Locations:** `src/lib/storage.ts:151` (`getSettings`), `:161` (`storeSettings`), `:229` (`storageWarning`); `src/App.tsx:35` (`toggleWatch`); `src/components/Methodology.tsx:13` (restore success feedback).

`storeSettings` swallows localStorage write errors and continues in memory, without recording a settings-persistence warning. `storageWarning` only reflects IndexedDB/history failures. The UI still says a fund was saved or a backup restored. Reload can silently return to old/default watchlists, comparison selections and risk-free assumptions. The settings snapshot written to IndexedDB during restore is never read by `getSettings`, so it does not repair this path.

**Reproduction:** Provide localStorage whose `setItem` throws a quota error and whose `getItem` returns null. Save a watchlist containing one fund. The targeted Node run observed session count 1 and warning null; loading a fresh storage-module instance to simulate reload returned count 0 and warning null.

**Required behavior:** Keep the useful session fallback, but expose settings-persistence status immediately and make save/restore feedback accurate. Alternatively, implement and read a durable fallback. Add a write-failure/reload regression case distinct from IndexedDB fallback.

## Areas reviewed without a material finding

- Absolute returns, ACT/365 CAGR, one-year absolute versus multi-year annualized returns, and minimum history checks follow the stated contract.
- Monthly buckets require eligible consecutive month ends; missing months are not bridged; incomplete current months and initial partial months are excluded by the intended rules. Risk uses sample deviation and the specified downside denominator.
- Period selection, seven-day predecessor tolerance, leap-day clamping, drawdown episode tracking and actual common-date intersection are consistent with the documented method.
- Growth/IDCW and observed-history anomaly gates are applied to fund-list returns, detail analytics and comparison. Finding 2 concerns misclassification of operational messages, not missing distribution gates.
- Search responses are guarded against replacing results for a newer query; fund responses are keyed by scheme code. Finding 1 concerns workspace restore, not ordinary navigation between funds.
- Invalid backup validation occurs before mutation; IndexedDB replacement uses one transaction. The review did not exercise a real browser IndexedDB transaction-abort case.
- Planned portfolio, benchmark-import and simulator capabilities are labeled as later milestones rather than implemented features.

The initial implementers' reported 62 passing tests and successful typecheck, and the later reported 77-test result, were supplied as review context. This reviewer ran the scoped follow-up command recorded above, but did not rerun the complete suite or production build. The site owner retains those final gates and browser QA.
