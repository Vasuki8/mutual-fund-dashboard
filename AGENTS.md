# FundScope development instructions

## Active direction

On 21 October 2026, the owner stopped development of the ChatGPT-hosted website and directed all further work to this GitHub repository.

- Develop, review, and track changes in `Vasuki8/mutual-fund-dashboard`.
- On 23 October 2026, the owner clarified: keep the previous sidebar/table layout and use the Atlas colour theme. Preserve that layout, the Atlas light/dark palette and the documented financial calculation rules; the contract is in `docs/UI_DESIGN.md`. Do not reintroduce the Atlas horizontal navigation or expandable starter bands without a new request.
- Do not publish to the former ChatGPT Site, retrieve its service credentials, or run `scripts/sync-cloud.mjs` unless the owner later explicitly requests that work.
- The former hosted import task is paused. Do not resume it or restore its old refresh schedule as part of GitHub development.
- Keep existing stored data and historical source code. Stopping development does not authorize deleting the old deployment, its database, or its object storage.

## Current discrepancy-repair scope

On 27 October 2026, the owner limited discrepancy work to **active funds that posted NAV in the last 30 days**.

- Use `scripts/active-repair-scope.ts`: exact existing official open-ended roster membership, current MFAPI catalogue membership, a finite positive NAV, and a real NAV date no more than 30 UTC calendar days old and not in the future. The runner's actual date is the reference; exactly 30 days qualifies, 31 does not.
- Apply this as a strict eligibility filter to automated history repair, not merely a priority over older schemes. The production collector CLI enables it unconditionally. Catalogue refreshes continue so an existing scheme can re-enter scope after a new NAV.
- Membership is checked independently against the documented `/mf` scheme list by `scripts/verified-catalogue.ts`. Absence from the bulk `/mf/latest` cache alone is not proof of inactivity. Keep list-verification provenance separate from actual NAV observation dates; see `docs/CATALOGUE_MEMBERSHIP.md`.
- Investigate the full historical series of each eligible fund. The 30-day condition selects funds; it does not truncate their NAV histories.
- Preserve excluded schemes, saved observations, source errors and quality warnings. Exclusion is not evidence of repair. Full-archive accounting must remain separate from the active repair queue.
- Do not widen the website's existing seven-day discovery filter as part of this repair-only instruction. Recent NAV reporting is not proof that purchases are permitted.
- This scope supersedes older documentation that allowed routine repair of obsolete histories after a 90-day priority pass. Retry backoffs, source-wide cooldowns, resource limits and data-quality thresholds remain binding.

## Deployment and data status

- Read `docs/DEPLOYMENT.md` for the current GitHub delivery status and the remaining standalone deployment work.
- A repository commit or successful CI build is not proof of a live website. Report a deployment URL only after verifying a successful deployment.
- The existing Worker archive, browser cache, and optional GitHub Release archive are separate stores. Do not combine their coverage counts or claim that data was migrated without verification.
- Keep source gaps visible. Saved history does not prove complete historical coverage.
- Respect the existing activation conditions in `docs/GITHUB_ARCHIVE.md`; the GitHub-only importer is not a website deployment.

## Change workflow

On 28 October 2026, the owner requested larger batches of discrepancy fixes instead of two at a time. Investigate related fund groups in parallel and combine supported fixes into a larger reviewed batch. Keep exact per-fund evidence and full-history verification; a batch target is not a reason to include an unverified adjustment.

1. Work from current GitHub `main` on a focused branch.
2. Validate the behavior affected by the change. Documentation-only edits need a diff and link review, not a new product test suite.
3. Review changes before merging. Report what is implemented, what is verified, and what remains pending.

`docs/SYNC_OPERATIONS.md` and `docs/LEGACY_SITE_DEPLOYMENT.md` are historical references. Their former operational instructions do not override this direction or a later instruction from the owner.
