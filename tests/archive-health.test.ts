import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sourceErrorLabel, validateArchiveHealthSummary } from '../src/lib/archive-health.ts';
import type { ArchiveCounts } from '../src/lib/archive-types.ts';

const counts: ArchiveCounts = {
  total:20,attempted:20,saved:18,clean:15,qualityIssues:3,
  sourceGaps:2,pending:0,refreshPending:5,
  bulkPassComplete:true,coverageComplete:false,
};
const valid = {
  version:1,sourceErrors:{source_history_zero_nav_only:1,source_history_invalid:1},
  quality:{invalidOnly:1,discontinuityOnly:1,both:1,other:0},
  latestNav:{missingValue:3,missingDate:0,before2010:10,from2010Through2020:5,since2021:5},
  historyBehind:{oneDay:2,twoToSevenDays:1,eightToThirtyDays:0,overThirtyDays:1},
  retries:{due:6,future:3},
};

test('verified archive issue groups reconcile to checkpoint denominators without summing overlapping populations',()=>{
  const summary=validateArchiveHealthSummary(valid,counts);
  assert.deepEqual(summary,valid);
  assert.equal(summary.sourceErrors.source_history_zero_nav_only,1);
  assert.equal(summary.quality.invalidOnly+summary.quality.discontinuityOnly+summary.quality.both,3);
  assert.equal(summary.historyBehind.oneDay+summary.historyBehind.twoToSevenDays+summary.historyBehind.overThirtyDays,4,
    'Date-lag counts are not a disjoint replacement for the refresh backlog of 5.');
});

test('missing latest dates are counted separately from invalid NAV values',()=>{
  const validMissing={...valid,latestNav:{...valid.latestNav,missingDate:2,before2010:8}};
  assert.deepEqual(validateArchiveHealthSummary(validMissing,counts).latestNav,validMissing.latestNav);
});

test('malformed, forged or excessive error details are rejected before publication and browser display',()=>{
  const broken=[
    {...valid,version:2},
    {...valid,sourceErrors:{...valid.sourceErrors,other_token:'secret'}},
    {...valid,sourceErrors:{...valid.sourceErrors,source_history_invalid:0}},
    {...valid,sourceErrors:{...valid.sourceErrors,source_history_invalid:2}},
    {...valid,quality:{...valid.quality,both:0}},
    {...valid,quality:{...valid.quality,invalidOnly:-1}},
    {...valid,latestNav:{...valid.latestNav,before2010:9}},
    {...valid,latestNav:{...valid.latestNav,since2021:5.5}},
    {...valid,historyBehind:{...valid.historyBehind,oneDay:20}},
    {...valid,retries:{...valid.retries,future:20}},
    {...valid,quality:{...valid.quality,unverifiedExtra:10}},
    {...valid,quality:null},
    {...valid,extra:'unverified field'},
    null,
  ];
  for(const payload of broken) {
    assert.throws(()=>validateArchiveHealthSummary(payload,counts),/health|archive/i);
  }
  assert.throws(()=>validateArchiveHealthSummary(valid,{...counts,sourceGaps:1}),/checkpoint/i);
  assert.throws(()=>validateArchiveHealthSummary(valid,{...counts,qualityIssues:2}),/checkpoint/i);
});

test('source error explanations avoid leaking arbitrary provider messages',()=>{
  assert.equal(sourceErrorLabel('source_history_zero_nav_only'),'History contains only zero NAVs');
  assert.equal(sourceErrorLabel('source_history_invalid'),'History failed validation (cause not yet classified)');
  assert.equal(sourceErrorLabel('source_http_429'),'Provider HTTP 429');
  assert.equal(sourceErrorLabel('secrets_or_tokens'),'Other provider or validation failure');
});
