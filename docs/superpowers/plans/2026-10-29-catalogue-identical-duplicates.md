# Catalogue Identical Duplicates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Resume verified catalogue refreshes by consolidating identical scheme-list rows without admitting conflicting identities.

**Architecture:** Keep the existing catalogue validation and three metadata requests. Consolidate validated equivalent identities before unique-count checks, and use the raw response length for the terminal probe.

**Tech Stack:** TypeScript, Node 24, the existing Node test runner and pnpm lockfile.

**Spec:** `docs/superpowers/specs/2026-10-29-catalogue-identical-duplicates-design.md`.

## Global Constraints

- Keep the 100,000 raw-row ceiling, three-request flow, source deadlines, retries and cooldowns.
- Preserve raw histories, source-quality warnings, 30-day repair eligibility and seven-day discovery filtering.
- Reject conflicting duplicate names or either ISIN; retain bulk-NAV duplicate rejection.
- Work from immutable main `75e6870c9fcdfde9300f6318614865d281066f56`; no workflow trigger changes or archive reset.

## Review Focus

Exact copies must not inflate counts. Conflicting optional identifiers must fail. Duplicate rows must not mask an undersized or contracted unique list. Nonempty or malformed terminal probes must fail. Metadata refresh must preserve saved histories and warnings.

## Task 1: Validate and consolidate list identities

**Files:** `scripts/verified-catalogue.ts`; new `tests/catalogue-identical-duplicates.test.ts`; existing `tests/catalogue-diagnostics.test.ts` and `tests/catalogue-membership.test.ts`; `docs/CATALOGUE_MEMBERSHIP.md`.

**Interface:** Preserve `fetchVerifiedCatalogue(source, previous, now, minimumSize): Promise<Catalogue>` and its existing static error types.

- [x] Add failing behavioral cases for exact copies, unique counts, raw-offset terminal validation and retained saved state. Change previous duplicate-rejection fixtures to conflicting identities.
- [x] Run `node --experimental-strip-types --test tests/catalogue-identical-duplicates.test.ts tests/catalogue-diagnostics.test.ts tests/catalogue-membership.test.ts tests/verified-catalogue-boundaries.test.ts`. Confirm new supported behavior fails before implementation.
- [x] Implement exact validated-field equality, unique-count minimum, raw-length terminal offset and a count-only consolidation warning.
- [x] Run the same focused tests. Expect zero failures, including conflict and preservation cases.
- [x] Replay the four captured metadata responses offline. Expect 38,004 unique current entries, no missing bulk codes and unchanged raw input bytes; report observed NAV changes separately.
- [x] Update the membership documentation with the supported normalization and public evidence hashes.
- [x] Run `pnpm test`, `pnpm run typecheck`, `pnpm run build` and `pnpm run build:pages`. Expect all required checks to pass.
- [x] Obtain an independent review of the complete patch and resolve material findings.
- [ ] Create the focused branch and pull request through GitHub, verify CI, merge, and verify the deployed commit. Report production checkpoint status separately from offline candidate validation.

The pull request records subsequent CI, merge and live deployment evidence for the final release step; this document is the reviewed pre-release snapshot.
