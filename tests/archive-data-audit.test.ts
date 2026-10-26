import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditArchiveSnapshot } from '../scripts/archive-data-audit.ts';
import type { ArchiveSnapshot } from '../scripts/archive-model.ts';

function fixture():ArchiveSnapshot {
  const entries=[
    {schemeCode:10001,schemeName:'Historical equity',latestDate:'2007-04-13',nav:'10.00',current:true},
    {schemeCode:10002,schemeName:'Recent equity',latestDate:'2026-10-22',nav:'14.00',current:true},
    {schemeCode:10003,schemeName:'Old zero-only source',latestDate:'2006-07-10',nav:null,current:true},
    {schemeCode:10004,schemeName:'Recent clean scheme',latestDate:'2026-10-23',nav:'24.00',current:true},
  ];
  const base={attempts:2,failures:1,lastAttemptAt:'2026-10-23T02:00:00.000Z',
    historyFetchedAt:'2026-10-23T01:00:00.000Z',coverageStart:'2006-01-01',
    nextAttemptAt:'2026-10-23T01:00:00.000Z',observationCount:20};
  const states={
    10001:{...base,code:10001,status:'quality',quality:true,
      coverageEnd:'2007-04-12',latestNav:'10.00',
      warnings:['Invalid NAV observations were excluded (1); derived analytics are blocked until the data is resolved.'],lastError:null},
    10002:{...base,code:10002,status:'quality',quality:true,
      nextAttemptAt:'2026-10-30T01:00:00.000Z',coverageEnd:'2026-10-22',latestNav:'14.00',
      warnings:['Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked.'],lastError:null},
    10003:{...base,code:10003,status:'source-error',quality:false,
      nextAttemptAt:'2026-10-30T01:00:00.000Z',historyFetchedAt:null,coverageStart:null,coverageEnd:null,
      latestNav:null,observationCount:0,warnings:[],lastError:'source_history_zero_nav_only'},
    10004:{...base,code:10004,status:'clean',quality:false,
      nextAttemptAt:null,coverageEnd:'2026-10-20',latestNav:'23.00',
      warnings:[],lastError:null},
  };
  return {catalogue:{version:1,fetchedAt:'2026-10-23T10:00:00.000Z',entries,warnings:[]},
    checkpoint:{version:2,sequence:102,source:'mfapi.in',
      counts:{total:4,attempted:4,saved:3,clean:1,qualityIssues:2,sourceGaps:1,pending:0,
        refreshPending:4,bulkPassComplete:true,coverageComplete:false},states}
  } as unknown as ArchiveSnapshot;
}

test('audit differentiates missing, quality, stale dates, old scheme ages and retry cadence',()=>{
  const report=auditArchiveSnapshot(fixture(),Date.parse('2026-10-23T12:00:00.000Z'));
  assert.equal(report.sequence,102);
  assert.deepEqual(report.sourceErrors,{source_history_zero_nav_only:1});
  assert.deepEqual(report.quality,{invalidOnly:1,discontinuityOnly:1,both:0,other:0});
  assert.deepEqual(report.latestNav,{missingValue:1,missingDate:0,before2010:2,from2010Through2020:0,since2021:2});
  assert.deepEqual(report.historyBehind,{oneDay:1,twoToSevenDays:1,eightToThirtyDays:0,overThirtyDays:0});
  assert.deepEqual(report.retries,{due:1,future:2});
  assert.equal(report.counts.saved,3);
  assert.equal(report.currentlyReporting.reporting,0,'Synthetic scheme codes are not on the official roster.');
  assert.ok(!JSON.stringify(report).includes('Historical equity'),'Audit outputs aggregate data, not raw source rows or scheme names.');
});

test('read-only investor triage separates recently reporting open-ended fund gaps from old histories',()=>{
  const snapshot=fixture();
  const remap:Record<number,number>={10001:100033,10002:119436,10003:154804,10004:100034};
  snapshot.catalogue.entries=snapshot.catalogue.entries.map(entry=>({
    ...entry,schemeCode:remap[entry.schemeCode],
    ...(entry.schemeCode===10003?{latestDate:'2026-10-26',nav:'10.5'}:{}),
  }));
  snapshot.checkpoint.states=Object.fromEntries(Object.entries(snapshot.checkpoint.states)
    .map(([old,state])=>[remap[Number(old)],{...state,code:remap[Number(old)]}]));
  const report=auditArchiveSnapshot(snapshot,Date.parse('2026-10-26T16:00:00.000Z'));
  assert.deepEqual(report.currentlyReporting,{
    asOfDate:'2026-10-26',manualRosterDate:'2026-10-26',navRecencyDays:7,
    reporting:3,noSavedHistory:1,failedRefreshWithHistory:0,firstAttemptPending:0,
    invalidOnly:0,discontinuityOnly:1,both:0,other:0,historyBehindCatalogue:1,
    examples:{noSavedHistory:[154804],invalidOnly:[],discontinuityOnly:[119436],both:[],other:[]},
  });
  assert.equal(report.counts.sourceGaps,1);
  assert.equal(report.quality.invalidOnly,1,'Historical warning remains in total, not investor triage.');
  assert.ok(!JSON.stringify(report).includes('Historical equity'),'Do not print scheme names or raw NAV.');
});

test('investor quality flags remain explicit even when sources report current NAV',()=>{
  const snapshot=fixture();
  snapshot.catalogue.entries[0]={...snapshot.catalogue.entries[0],
    schemeCode:100033,latestDate:'2026-10-26',nav:'21.00'};
  const original=snapshot.checkpoint.states[10001];
  Reflect.deleteProperty(snapshot.checkpoint.states,'10001');
  snapshot.checkpoint.states[100033]={...original,code:100033,
    warnings:['Conflicting NAV values occur on 1 duplicate date(s); derived analytics are blocked.']};
  const report=auditArchiveSnapshot(snapshot,Date.parse('2026-10-26T20:00:00.000Z'));
  assert.equal(report.currentlyReporting.other,1);
  assert.deepEqual(report.currentlyReporting.examples.other,[100033]);
  assert.equal(report.counts.clean,1,'Quality counts do not get silently lowered.');
});

test('audit refuses missing or fabricated accounting rather than reporting inaccurate coverage',()=>{
  const missing=fixture();
  Reflect.deleteProperty(missing.checkpoint.states, '10001');
  assert.throws(()=>auditArchiveSnapshot(missing),/audit_scheme_state_missing/);
  const mismatched=fixture();
  mismatched.checkpoint.counts.sourceGaps=0;
  assert.throws(()=>auditArchiveSnapshot(mismatched),/audit_checkpoint_counts_inconsistent/);
  const badTime=fixture();
  assert.throws(()=>auditArchiveSnapshot(badTime,NaN),/audit_time_invalid/);
});
