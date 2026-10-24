#!/usr/bin/env node
/**
 * A checkpoint-only NAV integrity audit. It makes NO MFAPI requests, writes
 * NO Release assets, and never changes source/history counters or checkpoints.
 */
import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type { ArchiveSnapshot } from './archive-model.ts';
import { createGitHubStore } from './archive-store.ts';

export interface DataHealthReport {
  checkedAt: string;
  sequence: number;
  counts: ArchiveSnapshot['checkpoint']['counts'];
  sourceErrors: Record<string, number>;
  quality: { invalidOnly: number; discontinuityOnly: number; both: number; other: number };
  latestNav: { missingValue: number; missingDate: number; before2010: number; from2010Through2020: number; since2021: number };
  historyBehind: { oneDay: number; twoToSevenDays: number; eightToThirtyDays: number; overThirtyDays: number };
  retries: { due: number; future: number };
}

function increase(group: Record<string,number>, key:string) {
  group[key] = (group[key] ?? 0) + 1;
}

export function auditArchiveSnapshot(snapshot: ArchiveSnapshot, now = Date.now()): DataHealthReport {
  if (!Number.isFinite(now)) throw new Error('audit_time_invalid');
  const { checkpoint, catalogue } = snapshot;
  const sourceErrors: Record<string,number> = {};
  const quality = { invalidOnly:0, discontinuityOnly:0, both:0, other:0 };
  const latestNav = { missingValue:0, missingDate:0, before2010:0, from2010Through2020:0, since2021:0 };
  const historyBehind = { oneDay:0, twoToSevenDays:0, eightToThirtyDays:0, overThirtyDays:0 };
  const retries = {due:0,future:0};
  for(const entry of catalogue.entries) {
    const state = checkpoint.states[entry.schemeCode];
    if(!state) throw new Error('audit_scheme_state_missing');
    if(entry.nav===null) latestNav.missingValue++;
    if(entry.latestDate){
      const year=Number(entry.latestDate.slice(0,4));
      if(year<2010)latestNav.before2010++;
      else if(year<=2020)latestNav.from2010Through2020++;
      else latestNav.since2021++;
      if(state.coverageEnd && state.coverageEnd<entry.latestDate){
        const days=(Date.parse(entry.latestDate+'T00:00:00Z')-Date.parse(state.coverageEnd+'T00:00:00Z'))/86400_000;
        if(days===1)historyBehind.oneDay++;
        else if(days<=7)historyBehind.twoToSevenDays++;
        else if(days<=30)historyBehind.eightToThirtyDays++;
        else historyBehind.overThirtyDays++;
      }
    } else latestNav.missingDate++;
    if(state.status==='source-error') increase(sourceErrors,state.lastError??'source_unknown');
    if(state.quality){
      const invalid=state.warnings.some(w=>/^Invalid NAV/.test(w));
      const discontinuity=state.warnings.some(w=>/^Unresolved discontinuity/.test(w));
      if(invalid && discontinuity)quality.both++;
      else if(invalid)quality.invalidOnly++;
      else if(discontinuity)quality.discontinuityOnly++;
      else quality.other++;
    }
    if(state.nextAttemptAt){
      if(Date.parse(state.nextAttemptAt)<=now) retries.due++;
      else retries.future++;
    }
  }
  const count = catalogue.entries.length;
  if(count!==checkpoint.counts.total ||
    Object.values(sourceErrors).reduce((sum,value)=>sum+value,0)!==checkpoint.counts.sourceGaps ||
    Object.values(quality).reduce((sum,value)=>sum+value,0)!==checkpoint.counts.qualityIssues) {
    throw new Error('audit_checkpoint_counts_inconsistent');
  }
  return { checkedAt:new Date(now).toISOString(),sequence:checkpoint.sequence,
    counts:checkpoint.counts,sourceErrors,quality,latestNav,historyBehind,retries };
}

function reportMarkdown(report:DataHealthReport):string {
  const c=report.counts;
  const pct=(value:number)=>(100*value/c.total).toFixed(1)+'%';
  const errors=Object.entries(report.sourceErrors).sort((a,b)=>b[1]-a[1])
    .map(([code,count])=>`| \`${code}\` | ${count} |`).join('\n');
  return `## FundScope archive health audit\n\nCheckpoint **${report.sequence}**, checked ${report.checkedAt}. Read only; no MFAPI requests.\n\n`
    + `| Measure | Count |\n| --- | ---: |\n| Known scheme identities | ${c.total} |\n`
    + `| Saved histories | ${c.saved} (${pct(c.saved)}) |\n`
    + `| Saved histories without quality flags | ${c.clean} (${pct(c.clean)}) |\n`
    + `| No saved history after source failure | ${c.sourceGaps} |\n`
    + `| Histories with quality flags | ${c.qualityIssues} |\n`
    + `| First attempts pending | ${c.pending} |\n`
    + `| Refresh/reconciliation pending (overlapping issues) | ${c.refreshPending} |\n\n`
    + `### Source errors\n\n| Safe error code | Schemes |\n| --- | ---: |\n${errors}\n\n`
    + `### Quality flags (exclusive classification)\n\n| Invalid NAV only | ${report.quality.invalidOnly} |\n`
    + `| Large discontinuity only | ${report.quality.discontinuityOnly} |\n`
    + `| Both classes | ${report.quality.both} |\n| Other | ${report.quality.other} |\n\n`
    + `### Catalogue / historical inconsistencies\n\n| Invalid latest NAV value | ${report.latestNav.missingValue} |\n`
    + `| Missing latest NAV date | ${report.latestNav.missingDate} |\n`
    + `| History behind latest date by 1 day | ${report.historyBehind.oneDay} |\n`
    + `| History behind by 2–7 days | ${report.historyBehind.twoToSevenDays} |\n`
    + `| History behind by 8–30 days | ${report.historyBehind.eightToThirtyDays} |\n`
    + `| History behind by more than 30 days | ${report.historyBehind.overThirtyDays} |\n`
    + `| Latest NAV dated before 2010 | ${report.latestNav.before2010} |\n`
    + `| Latest NAV dated 2010–2020 | ${report.latestNav.from2010Through2020} |\n`
    + `| Latest NAV dated 2021 or later | ${report.latestNav.since2021} |\n`
    + `| Retry backoffs due / future | ${report.retries.due} / ${report.retries.future} |\n\n`
    + 'The source catalogue includes historical/discontinued-looking identities. Being listed is not proof of an active fund. No questionable NAV is treated as a valid price.\n';
}

async function main():Promise<void>{
  const repository=process.env.GITHUB_REPOSITORY,token=process.env.GITHUB_TOKEN;
  if(repository!=='Vasuki8/mutual-fund-dashboard'||!token)
    throw new Error('audit_repository_or_token_missing');
  const store=createGitHubStore({repository,token,deadline:Date.now()+4*60_000});
  const snapshot=await store.loadSnapshot();
  if(!snapshot)throw new Error('audit_checkpoint_absent');
  const report=auditArchiveSnapshot(snapshot);
  console.log('FUND_DATA_AUDIT: '+JSON.stringify(report));
  if(process.env.GITHUB_STEP_SUMMARY){
    await appendFile(process.env.GITHUB_STEP_SUMMARY,reportMarkdown(report),'utf8');
  }
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  main().catch(err=>{console.error(err instanceof Error?err.message:'audit_failed');process.exitCode=1;});
}
