# FundScope development instructions

## Active direction

On 21 October 2026, the owner stopped development of the ChatGPT-hosted website and directed all further work to this GitHub repository.

- Develop, review, and track changes in `Vasuki8/mutual-fund-dashboard`.
- On 23 October 2026, the owner supplied the Atlas UI template and requested its implementation, replacing the earlier Graphite visual direction. Preserve the resulting FundScope Atlas interface and the documented financial calculation rules; its adaptation contract is in `docs/UI_DESIGN.md`.
- Do not publish to the former ChatGPT Site, retrieve its service credentials, or run `scripts/sync-cloud.mjs` unless the owner later explicitly requests that work.
- The former hosted import task is paused. Do not resume it or restore its old refresh schedule as part of GitHub development.
- Keep existing stored data and historical source code. Stopping development does not authorize deleting the old deployment, its database, or its object storage.

## Deployment and data status

- Read `docs/DEPLOYMENT.md` for the current GitHub delivery status and the remaining standalone deployment work.
- A repository commit or successful CI build is not proof of a live website. Report a deployment URL only after verifying a successful deployment.
- The existing Worker archive, browser cache, and optional GitHub Release archive are separate stores. Do not combine their coverage counts or claim that data was migrated without verification.
- Keep source gaps visible. Saved history does not prove complete historical coverage.
- Respect the existing activation conditions in `docs/GITHUB_ARCHIVE.md`; the GitHub-only importer is not a website deployment.

## Change workflow

1. Work from current GitHub `main` on a focused branch.
2. Validate the behavior affected by the change. Documentation-only edits need a diff and link review, not a new product test suite.
3. Review changes before merging. Report what is implemented, what is verified, and what remains pending.

`docs/SYNC_OPERATIONS.md` and `docs/LEGACY_SITE_DEPLOYMENT.md` are historical references. Their former operational instructions do not override this direction or a later instruction from the owner.
