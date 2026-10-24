import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import * as archiveHealth from '../src/lib/archive-health.ts';

const require=createRequire(import.meta.url);
const source=readFileSync(new URL('../src/components/DataStatus.tsx',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,
}}).outputText;
const exported:Record<string,React.ComponentType<any>>={};
new Function('require','exports',compiled)((name:string)=>{
  if(name==='../lib/runtime.ts')return {isStaticRuntime:()=>true};
  if(name==='../lib/archive-health.ts')return archiveHealth;
  if(name==='../lib/archive-status.ts')return {};
  if(name==='../lib/shared-archive.ts')return {};
  return require(name);
},exported);

const health={
  version:1,sourceErrors:{source_history_zero_nav_only:14,source_history_invalid:604},
  quality:{invalidOnly:2412,discontinuityOnly:981,both:128,other:0},
  latestNav:{missingValue:2329,missingDate:0,before2010:5473,from2010Through2020:18249,since2021:14269},
  historyBehind:{oneDay:2745,twoToSevenDays:469,eightToThirtyDays:119,overThirtyDays:625},
  retries:{due:4139,future:0},
};
const counts={total:37991,attempted:37991,saved:37373,clean:33852,
  qualityIssues:3521,sourceGaps:618,pending:0,refreshPending:5261,
  bulkPassComplete:true,coverageComplete:false};
const manifest={version:2,source:'mfapi.in',status:'ready',collectionEnabled:true,
  sequence:105,generatedAt:'2026-10-24T00:48:00.000Z',checkpointAt:'2026-10-24T00:45:07.000Z',
  catalogueFetchedAt:'2026-10-23T19:00:00.000Z',latestNavDate:'2026-10-23',
  counts,health,catalogue:{path:'archive/catalogue-x.json.gz',sha256:'a'.repeat(64),bytes:1,expandedBytes:1},
  shards:{},issues:[],warnings:[],
};

function render(hasHealth:boolean) {
  const state={localStatus:{kind:'browser',checkedAt:'2026-10-24T00:50:00.000Z',
    fundCount:241,cacheWarning:null,cacheError:null,sourceAvailable:true,
    sourceError:null,sharedManifest:hasHealth?manifest:{...manifest,health:undefined},
    sharedError:null},status:null,error:'',busy:false,revision:0,refresh(){}};
  assert.ok(exported.DataStatus);
  return renderToStaticMarkup(React.createElement(exported.DataStatus,{state,compact:false}));
}

test('data page explains quality, source, lag and browser-only local cache distinctly',()=>{
  const html=render(true);
  for(const expected of [
    'Source failures needing follow-up','618',
    'Saved histories with quality flags','3,521',
    'History refresh or reconciliation pending','5,261',
    'Histories cached in this browser (local only)','241',
    'History contains only zero NAVs','14',
    'History failed validation (cause not yet classified)','604',
    'Invalid NAV observations only','2,412',
    'Large historical NAV changes only','981',
    'Both kinds of warning','128',
    'Behind by 1 day','2,745',
    'Latest source NAV dated before 2010','5,473',
    'Follow-ups in source backoff',
    'not a central backfill deficit',
  ]) assert.ok(html.includes(expected),expected);
  assert.match(html,/<details[^>]*archive-health-breakdown/);
});

test('older manifests without detailed breakdown still render valid saved totals',()=>{
  const html=render(false);
  assert.match(html,/37,373/);
  assert.doesNotMatch(html,/archive-health-breakdown/);
  assert.match(html,/241/);
});
