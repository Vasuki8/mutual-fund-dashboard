# FundScope Implementation Plan

> **For agentic workers:** Use the approved development scope below. Keep edits in the assigned modules; integration and publication belong to the site owner.

**Goal:** Deliver a private working minimal mutual fund research website powered by MFAPI.

**Architecture:** Static React/TypeScript interface, pure analytics, client MFAPI adapter and IndexedDB persistence.

**Tech Stack:** React 19.2.6, Vite 8.0.13, TypeScript 5.9.3, ECharts 6.0.0, Node test runner.

**Spec:** ../specs/2026-10-20-fundscope-design.md

## Global Constraints

- Use the approved minimal light UI; original terminal layout is superseded.
- MFAPI is the only external data provider. Never call AMFI directly.
- No synthetic financial values or unsupported AUM/TER/benchmark claims.
- Use source observation dates; never describe end-of-day NAV as live.
- Types in src/lib/types.ts are the shared interface.
- Source publication goes through the Sites source workflow.

## Review Focus

- Short histories and zero denominators must show unavailable results.
- Missing months, large discontinuities and IDCW must not produce false total-return analytics.
- Comparison uses actual common dates and shared chart hover.
- Slow responses must not overwrite a newer user selection.
- Network or storage failures must preserve usable local data and clearly explain status.

## Task 1: API and storage

Files: src/lib/api.ts, src/lib/storage.ts, tests/api.test.ts, tests/storage.test.ts.

Interfaces: searchSchemes(query:string):Promise<Scheme[]>; getFund(code:number,options?:{force?:boolean}):Promise<FundData>; getSettings():ResearchSettings; saveSettings(settings:ResearchSettings):void; exportBackup():Promise<string>; importBackup(text:string):Promise<ResearchSettings>; storageStats():Promise<{fundCount:number}>.

- [x] Write and observe failing tests for validation, cache fallback and backup import.
- [x] Implement direct API with bounded requests, timeout, deduplication and cache.
- [x] Validate identity, dates and positive NAVs; flag unresolved discontinuities.
- [x] Implement versioned backup/restore with validation before mutation.
- [x] Run node test runner and report results.

## Task 2: Analytics

Files: src/lib/analytics.ts, tests/analytics.test.ts.

Interfaces and exact types are documented in docs/analytics-task.md before dispatch. Pure functions consume NavPoint[] only. Financial percentages are decimal fractions internally.

- [x] Write and observe failing financial tests from the calculation contract.
- [x] Implement date periods, absolute/CAGR, drawdown and monthly returns.
- [x] Implement monthly risk, rolling outcomes and common-date alignment.
- [x] Verify tests and document limitations.

## Task 3: Application UI

Files: src/App.tsx, src/styles.css, src/components/*, src/lib/format.ts, src/main.tsx.

- [x] Implement the minimal explorer, fund detail, comparison and methodology views.
- [x] Wire real responses, local watchlist, settings and backup restore.
- [x] Add accessible interactive chart and table exports.
- [x] Verify behavior in the browser at desktop and narrow viewport.

## Task 4: Review and private publication

- [x] Independent review of analytics/data flow and user-visible claims.
- [x] Fix material findings and run all tests plus the production build.
- [x] Record capability checklist, method, install/run instructions and limitations.
- Release action: synchronize the verified source, package and deploy owner-private through Sites.
- Release action: return the deployment tool’s verified URL and concise release notes.
