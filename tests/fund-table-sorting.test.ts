import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import * as format from '../src/lib/format.ts';
import * as sort from '../src/lib/fund-sort.ts';
import type { FundData, Scheme } from '../src/lib/types.ts';

const require=createRequire(import.meta.url);
const content=readFileSync(new URL('../src/components/FundTable.tsx',import.meta.url),'utf8');
const transpiled=ts.transpileModule(content,{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,
}}).outputText;
const exported:Record<string,React.ComponentType<any>>={};
new Function('require','exports',transpiled)((name:string)=>{
  if(name==='react')return {...React,useEffect(){}};
  if(name==='../lib/fund-sort.ts')return sort;
  if(name==='../lib/format.ts')return format;
  return require(name);
},exported);

const schemes:Scheme[]=[
  {schemeCode:3,schemeName:'Fund Gamma - Direct Growth'},
  {schemeCode:1,schemeName:'Fund Alpha - Direct Growth'},
  {schemeCode:2,schemeName:'Fund Beta - Direct Growth'},
];
const fund:FundData={meta:{schemeCode:3,schemeName:schemes[0].schemeName,
  fundHouse:'Example',schemeType:'Open Ended',schemeCategory:'Equity'},
  points:[{date:'2025-01-01',nav:100},{date:'2026-01-01',nav:150}],
  fetchedAt:'2026-01-02T10:00:00.000Z',source:'mfapi.in',fromCache:false,stale:false,warnings:[]};
const returns={
  3:{schemeCode:3,navDate:'2026-01-01',oneYear:.05,threeYear:null,fiveYear:null},
  1:{schemeCode:1,navDate:'2026-01-01',oneYear:.44,threeYear:null,fiveYear:null},
  2:{schemeCode:2,navDate:'2026-01-01',oneYear:.11,threeYear:null,fiveYear:null},
};
function render(canSortReturns:boolean){
  const FundTable=exported.FundTable;assert.ok(FundTable);
  return renderToStaticMarkup(React.createElement(FundTable,{
    schemes,funds:{3:fund},errors:{},ensureFund:async()=>{},openFund(){},
    watchlist:[],compared:[],toggleWatch(){},toggleCompare(){},
    sort:{key:'1',desc:true},onSort(){},returnsByScheme:returns,canSortReturns,
  }));
}

test('FundTable renders global order without re-sorting the page or mixing refreshed returns',()=>{
  const html=render(true);
  assert.ok(html.indexOf('Fund Gamma')<html.indexOf('Fund Alpha'));
  assert.ok(html.indexOf('Fund Alpha')<html.indexOf('Fund Beta'));
  assert.match(html,/\+5\.00%/,'Archived 1Y value must be shown for Gamma even when its refreshed NAV is newer.');
  assert.doesNotMatch(html,/\+50\.00%/,'Do not display a refreshed value while ordering from a different snapshot.');
  assert.match(html,/aria-sort="descending"/,'The active global sort is exposed to screen readers.');
});

test('return columns clearly disable sorting when the global return population is missing',()=>{
  const html=render(false);
  assert.match(html,/disabled=""/,'Unavailable return sorting must not act as a page-only sort.');
  assert.match(html,/Global return sorting requires a published return index/);
});


test('fund names open full analysis directly while save and compare remain separate',()=>{
  const opened:number[]=[],saved:number[]=[],compared:number[]=[];
  const tree=(exported.FundTable as (props:any)=>React.ReactElement)({
    schemes,funds:{3:fund},errors:{},ensureFund:async()=>{},openFund:(s:Scheme)=>opened.push(s.schemeCode),
    watchlist:[],compared:[],toggleWatch:(s:Scheme)=>saved.push(s.schemeCode),toggleCompare:(s:Scheme)=>compared.push(s.schemeCode),
    sort:{key:'name',desc:false},onSort(){},returnsByScheme:returns,canSortReturns:true,
  });
  const walk=(node:any):any[]=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==='object'&&node.props?[node,...walk(node.props.children)]:[];
  const buttons=walk(tree).filter(node=>node.type==='button');
  const name=buttons.find(node=>node.props.className==='fund-link');
  name.props.onClick();assert.deepEqual(opened,[3]);
  assert.equal(name.props['aria-label'],'Open Fund Gamma');
  assert.equal(name.props['aria-haspopup'],undefined);
  buttons.find(node=>node.props['aria-label']==='Save Fund Gamma to watchlist').props.onClick();
  buttons.find(node=>node.props['aria-label']==='Add Fund Gamma to comparison').props.onClick();
  assert.deepEqual(saved,[3]);assert.deepEqual(compared,[3]);assert.deepEqual(opened,[3]);
});
