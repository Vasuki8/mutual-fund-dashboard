# Catalogue failure diagnostics implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this single task and obtain independent review before merging.

**Goal:** Identify which existing source or catalogue guard rejects a refresh without changing accepted data, requests, retries, cooldowns, or archive contents.

**Architecture:** Attach bounded, allowlisted diagnostic metadata to existing source and catalogue errors. Include it only in the collector's existing catalogue failure log. The durable error code and all validation/control-flow decisions remain unchanged.

**Tech stack:** TypeScript, Node 24, node:test, existing GitHub Actions CI and collector.

**Spec:** `docs/CATALOGUE_REFRESH_2026-10-28.md`, `AGENTS.md`, and the existing source validation contracts.

## Global constraints

- Use current `main` (93e355b32cd80cd6c70ce1bb992452a3171f4e66) and a focused branch.
- Preserve the strict 30 UTC day repair filter, official roster, raw observations and all saved warnings.
- Retain 12-second requests, 32 MiB bodies, two HTTP attempts, source cooldowns, deadlines, and the existing single-writer workflow.
- Never log response bodies, scheme fields, arbitrary exception text, headers, credentials or signed URLs.
- Add no provider requests, workflow, schedule, storage format, dependencies or UI changes.

## Review focus

- Distinguish malformed bulk/list identities from duplicate identities and undersized responses.
- Preserve error code, cooldown and attempt accounting for 429/503, timeout, body and JSON failures.
- Retain the previous snapshot after any failed refresh; diagnostics are logs only.
- Unknown exceptions yield no arbitrary diagnostic text.
- Keep the final catalogue validation's existing error semantics and avoid additional clock reads.

## Task 1: Add safe failure context

**Files:** `scripts/verified-catalogue.ts`, `scripts/github-history-v2.ts`, a focused diagnostic regression test, existing catalogue membership integration tests, and the incident record.

**Interfaces:** Keep `fetchVerifiedCatalogue`, `createSource`, `runTranche` and `safeFailure` signatures and successful results unchanged. Add optional readonly diagnostic metadata to the existing error classes and an optional `diagnostic` field in an existing catalogue failure event.

- [ ] Write tests asserting exact safe stage/reason/count metadata from malformed bulk/list rows, duplicates, count boundaries, membership conflicts and terminal results; verify preserved safe error codes and request stopping.
- [ ] Write transport tests covering JSON, size, missing-body, timeout, unknown exceptions and cooldowns; verify request limits and redaction.
- [ ] Extend an existing saved-snapshot integration test to assert the emitted diagnostic and no persisted diagnostic or source data loss.
- [ ] Run the new tests against the baseline and observe failures caused by absent diagnostic metadata.
- [ ] Implement only metadata construction, exact error-message allowlisting and error-log forwarding; preserve all control-flow guards.
- [ ] Run focused tests, then the full project CI (tests, typecheck, Worker and Pages builds), and obtain independent review.
- [ ] Merge the verified head; observe the existing bounded bootstrap collector and record its actual diagnostic separately from any claim of recovery.

The local source mirror is not a git checkout. Verify base blob hashes and create the focused GitHub branch/commit through the repository connector; do not overwrite a moving remote head.
