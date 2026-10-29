# Nippon August 2012 unit consolidations implementation plan

> **For agentic workers:** Use superpowers:test-driven-development and independent whole-branch review for this focused registry change.

**Goal:** Recognize the issuer-documented denomination change for exactly two eligible Liquid Growth histories.

**Architecture:** Add two entries to the existing corporate-action registry; reuse all identity, warning, boundary and factor guards. Raw saved data remains unchanged.

**Tech stack:** TypeScript, Node 24, node:test, existing GitHub CI and Pages deployment.

**Spec:** `docs/NIPPON_AUGUST_2012_UNIT_CONSOLIDATION.md` and `AGENTS.md`.

## Global constraints

- Start from main `27ed3d19e9639afc4a6ffb836d5e3d2db6b710ad` on `fix/nippon-august-2012-unit-consolidations`.
- Exact codes 100837 and 100851, names, fund house and Growth ISINs must agree.
- Old basis through 2012-08-03, first new basis 2012-08-05, multiplier 100, permitted observed ratio 99.9–100.1.
- Apply only to calculation copies; preserve source observations, warnings, excluded funds and every existing adjustment guard.
- The 30-day rule selects eligible funds; inspect their full available saved histories.

## Task 1: Register and verify the two documented events

**Files:** `src/lib/corporate-actions.ts`, `tests/nippon-august-2012-unit-consolidation.test.ts`, and the evidence document.

- [x] Verify the dated primary event, exact current code/ISIN mappings, historical NAV anchors and issuer name changes.
- [x] Write the focused tests first and observe missing-adjustment failures.
- [x] Add the two registry entries without editing shared adjustment machinery.
- [x] Run all 26 focused tests and the existing SBI regression.
- [x] Verify all 12,716 actual saved observations, source immutability, recent-return invariance and independent return arithmetic.
- [ ] Obtain independent review and green complete CI, then merge the exact verified head.
- [ ] Confirm a successful Pages deployment of the merged source.

## Separate incident record

Update the catalogue incident documentation with the already-completed production diagnostic and read-only probe. Its duplicate list and inconsistent pagination do not authorize a duplicate-normalization acceptance change. No collector, workflow, source threshold or archive mutation belongs in this registry patch.
