# FundScope data integrity baseline and remediation

**Audit date:** 24 October 2026, 00:15–00:18 UTC.  
**Authoritative source:** GitHub Release control checkpoint **103** (`fundscope-mfapi-history-v2`), immutable data releases and source HTTP samples.  
**Diagnostics:** [Read-only GitHub Actions audit #40044040378](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40044040378), [source sample #40044187403](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40044187403), [detailed discrepancy audit #40044317617](https://github.com/Vasuki8/mutual-fund-dashboard/actions/runs/40044317617).

See [investor-first NAV discrepancy triage](NAV_DISCREPANCY_TRIAGE.md) for the October 26 official-scheme subset and daily read-only audit priorities. The historical baseline below remains unchanged.

These are observed snapshots, **not live guarantees**. The Pages publisher now includes an optional, checkpoint-matched `health` breakdown in its small archive manifest. The Data Status page can explain the exact reasons behind source gaps, invalid-only histories, discontinuities, date lags and retry backoffs without opening every full history. It does **not** lower the warning counts, synthesize prices or reclassify an invalid history as clean. Use the daily read-only `FundScope archive data health` workflow to review new verified checkpoints and whether quality indicators genuinely improve. No raw NAV rows are emitted by that workflow.

## Verified coverage

| Property | Checkpoint 103 | Meaning |
| --- | ---: | --- |
| Known scheme identities | 37,991 | All identities listed by the retained MFAPI latest catalogue; **not** proof these are all active/tradable schemes |
| Ever attempted | 37,991 | First import pass complete, not full-quality coverage |
| Saved histories | 37,373 | **98.4%** of identities have some validated positive NAV observations |
| Clean histories | 33,852 | **89.1%** of identities have saved history without flagged source-quality issues |
| Unavailable histories | 618 | Latest attempt produced a history-validation error; no valid saved history |
| Saved quality flags | 3,521 | Still persisted with full available validated observations; derived financial analysis remains blocked |
| Refresh or reconciliation backlog | 5,378 | Overlaps quality/source gaps and date discrepancies; **do not sum these buckets** |
| First attempts pending | 0 | Does not mean the provider's history is complete |

## What the failing records actually contain

- **618 source gaps:** the prior checkpoint recorded `source_history_invalid` for every failure, hiding the root condition. Seven *small, paced* source probes returned HTTP 200 and success-shaped JSON. Five failed examples (`100555`, `100606`, `100717`, `101160`, `101745`) contained **only `0.00000` NAV observations**. For example, `100606` returned 1,707 zero-valued rows. This sample **does not prove all 618 gaps are zero-only**. Zero is not a usable NAV for returns, so the collector must not pretend these schemes have saved history.
- **Invalid observation warnings:** 2,540 schemes, of which **2,412** have only an invalid-NAV issue. Some (e.g. `100218`) had only one rejected observation among thousands of valid rows. Quality warnings remain intact, rather than automatically clearing them and advertising unreviewed returns.
- **Discontinuities:** 1,109 schemes, of which **981** have only a >40% single-step NAV-move flag; **128** overlap the invalid-NAV group. Such moves may be genuine economic events, splits, distributions, or upstream errors. The NAV source alone cannot establish which; no automatic adjustment is justified.
- **Latest catalogue anomalies:** 2,329 identities have an invalid or missing latest **NAV value**, although their latest NAV **date** was present. This is a source condition, not a browser-rendering failure.

## Targeted invalid-NAV positioning sample

On 24 October 2026 UTC, a **15-scheme, paced, read-only** follow-up checked selected `invalid-only` histories against MFAPI `/mf/{code}`. The five-digit scheme IDs sampled were `100218`, `100312`, `100313`, `100316`, `100317`, `100318`, `100319`, `100321`, `100323`, `100325`, `100332`, `100337`, `100338`, `100347`, and `100358`. All returned HTTP 200 and valid positive NAV observations **plus** source-supplied `0.00000` placeholders. Fourteen had zero NAV rows **inside** their otherwise positive historical date range; one (`100358`) had 41 zero rows only **before** its first positive NAV. Sample bad dates ranged from 2006 to 2010. Several sampled schemes also had positive NAV observations through 23 October 2026. The temporary audit workflow was removed after obtaining these aggregate observations. This sample is **not** a statistical estimate of all 2,412 invalid-only funds.

This supports an important engineering distinction: a fund's full historical record can be unresolved while its more recent observed NAVs appear usable. However, **no recent performance or risk calculations are unblocked based on this sample alone**. A future period-scoped data-quality system would need to retain source-verified invalid observation dates and guarantee that the chosen metric's entire holding-period window is unaffected (including any preceding baseline), preserve full-history quality warnings, and independently test the cutoff. Invalid zeros must never be interpolated, counted as NAVs or silently treated as real losses.

## Historical-date discrepancies

Of 3,958 saved histories whose latest NAV date trails the catalogue: **2,745** trail by one day, **469** by 2–7 days, **119** by 8–30 days, and **625** by more than 30 days. Do not infer missing observations or append a synthetic NAV to make these dates match.

The latest NAV in the catalogue is dated **before 2010 for 5,473 identities** and **2010–2020 for 18,249 more**; the remaining **14,269** are dated 2021 or later. Listing in the latest-catalogue endpoint is **not proof of current investor accessibility or an active scheme**. FundScope should prioritize reconciliation for recently reporting histories without deleting or disguising legacy ones.

## Remediation implemented

1. **Safe failure taxonomy:** instead of treating every successful HTTP response with unusable NAVs as one generic error, record fixed codes for **all-zero history**, **empty history**, **unsuccessful payload**, **oversized history** and the generic invalid case. Never log arbitrary provider error strings, raw NAV values, secrets or signed URLs.
2. **Conservative rechecks:** zero-only/empty source histories remain in the catalogue with 0 saved observations and an explicit source gap. Their individual retry is deferred seven days, reducing repeated traffic for historical records that remain all-zero. A later validated response may still recover the scheme. Existing Retry-After and source-wide cooldown logic remains unchanged.
3. **Investor-first reconciliation:** among due work, recent (last NAV within 90 days) histories are processed before aged discrepancies. All older schemes remain eligible and retained; recency is only a queue priority, **not a statement of closure or a fund-quality score**. Existing two-worker, sixteen-shard, 512-scheme and time budgets remain unchanged.
4. **Repeatable read-only audit:** a daily GitHub Actions workflow retrieves and verifies the saved control release and catalogue, publishes aggregate quality/error/date counts in the job summary, and never fetches MFAPI, uploads assets or advances a checkpoint.
5. **No misleading completion claim:** clean coverage is distinguished from saved-history coverage, and unresolved underlying source issues continue to be visible.

## Conditions that remain unresolved

- **A different, reliably sourced NAV history** would be required to fill all-zero sources or prove specific past changes. Do not merge another provider's observations under the existing `mfapi.in` provenance without explicit mapping, independent cross-checking, rights review, and a source-versioned import contract.
- **Commercial data redistribution rights are unconfirmed.** MFAPI's documentation states that its unauthenticated API is free and recommends caching; it does **not establish a complete-dataset commercial redistribution license**. The separate AMFI response disallows AMFI website automation. These permissions must be resolved before treating public advertisement-supported data redistribution as approved. No direct AMFI automation is used here.
- **Some flagged discontinuities and old/latest mismatch records may never be reconciled** from MFAPI alone. Report the source-quality limitation, preserve original records, and do not infer an adjusted return.
- **First-pass completeness is not full investor coverage.** The bounded continuation chain originally stopped after the first pass. The reviewed continuation repair can now follow actual improvements from saved reconciliation runs, without increasing the per-run source-worker count, changing the 15-minute pacing, or bypassing any source cooldown. Chains still stop if a run produces no measurable source-data improvement, or at 12 runs/four hours; later scheduled triggers remain necessary for persistent upstream anomalies. This does not invent source data or guarantee completion.

Once the reviewed fix is merged, the archive workflow will run one bounded tranche, allowing the new taxonomy and recent-first work order to be verified against the live checkpoint. Future data improvements must be measured from verified Releases, not optimistic UI counters.
