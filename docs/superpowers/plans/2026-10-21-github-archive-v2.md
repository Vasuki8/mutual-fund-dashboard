# GitHub archive v2 implementation plan

Specification: `docs/superpowers/specs/2026-10-21-github-archive-v2.md`.

## 1. Durable collector

Implement an isolated Node 24 collector and Release-store adapter. Reuse the existing server validators. Test real state transitions with an in-memory store and small synthetic provider histories: deadline deferral, source errors/retries, shorter histories, catalogue changes, immutable readback verification, failed checkpoint publication, and restart. Keep the old host and its bindings out of all new runtime paths.

## 2. Public snapshot materialization

Implement a read-only build command taking the durable snapshot and writing `dist/pages/archive/`. Validate every referenced asset and per-scheme summary, preserve immutable content names, bound compressed/expanded/total bytes, and write the manifest last. Test missing/corrupt shards, inconsistent coverage, size budget and disabled state with a real temporary filesystem. Connect it to every Pages deployment, then call the reusable deployment after a changed archive checkpoint.

## 3. Browser integration

Implement the public contract in `src/lib/archive-types.ts` and a bounded same-origin reader. Integrate archive-first loading, direct refresh, cached history merging, shared catalogue search fallback and status. Preserve all existing routing, comparison, analytics, backup and generation invalidation behavior. Tests should prove rejection of wrong scheme/provenance and fallback without loss of older observations.

## 4. Verification and delivery

Run targeted tests as each component is developed, then the whole suite, TypeScript and both builds. Independently review failure paths, gate preservation, no secrets in client output, and serialization/publication ordering. Commit a feature branch, open a reviewable PR, and verify GitHub checks. Complete the authorized UI rollout if checks pass. Report the exact activation prerequisite and do not claim any archived data until a real checkpoint has been saved and verified.
