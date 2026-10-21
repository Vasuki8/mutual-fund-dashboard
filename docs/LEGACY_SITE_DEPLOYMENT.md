# Archived ChatGPT Site deployment procedure

> **Inactive from 21 October 2026.** The owner stopped development of the ChatGPT-hosted website and directed further work to GitHub. Do not perform this procedure or obtain Site credentials without a later explicit request from the owner. Existing data and deployment resources are retained. The active development direction is in [DEPLOYMENT.md](DEPLOYMENT.md).

The sections below describe the previous deployment. They are preserved for historical reference and do not authorize new releases, credential changes, or scheduled imports.

## Identity

- Canonical GitHub repository: `Vasuki8/mutual-fund-dashboard`.
- Selected Site project: `appgprj_6ad81952c5308191bb02200f3010c8c1`.
- Live origin: `https://fundscope-research.patelvasuki.chatgpt.site`.
- Runtime: supported Vinext Worker with D1 binding `DB` and R2 binding `BUCKET`.
- Audience: preserve the existing Site owner access unless the owner explicitly asks for a sharing change.

## Release process

1. Develop on a GitHub feature/fix branch. Keep the approved UI and calculation contracts. Run typechecking, meaningful behavioral tests and the production build. Review changes before integrating into main.
2. Use the Sites skill and selected Site's fresh source write credential. Open the existing Site source through the supported source workflow before editing the release checkout; the GitHub checkout remains canonical.
3. Copy the reviewed source revision into the release checkout while retaining that checkout's Git identity and local runtime state. Do not copy `.git`, dependencies, local databases, environment files or credentials. Include `drizzle/` SQL and metadata and `.openai/hosting.json` with the existing project ID and logical bindings. There is no static hosting entry in this Worker release.
4. Use the supported workflow to commit and push the exact source, build it, and package the deployment archive. Save/deploy that exact pushed commit and archive using the private Site operation. Do not claim that a GitHub push itself deploys the Site.
5. Read back the deployment status and the hosted data API. Verify new/changed write paths using their intended service access. Check the linked schedules for duplicates before creating or editing an automation. Schedule-only changes do not redeploy the app.

The deployer applies D1 migrations before uploading the Worker; a deployment failure can therefore leave a migration applied. Treat applied migration files as immutable and make forward-compatible changes.

## Runtime configuration

`FUNDSCOPE_SYNC_TOKEN` is a secret required by the three synchronization routes. The current authorized Site service token is stored as its value for this deployment, and the cloud updater provides that value in both the platform service header and application sync header. Read the fresh selected Site metadata in memory for each run; never write the token into a task prompt or repository. If the supported service token changes and no longer matches the application secret, report the mismatch and update the authorized runtime secret through Sites, then redeploy. Do not rotate or weaken authentication as an automatic workaround.

D1 and R2 are provisioned through the logical bindings in the hosting manifest. No database IDs, bucket credentials, Git credentials, or unrelated external app credentials belong in the manifest.

## CI

`.github/workflows/ci.yml` uses read-only repository permissions to install the committed pnpm lockfile, typecheck, execute tests and build. Cloud market-data refreshes run through the linked Site automation and do not require GitHub Actions secrets or repository commits.
