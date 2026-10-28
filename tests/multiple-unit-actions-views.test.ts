import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import * as analytics from '../src/lib/analytics.ts';
import * as format from '../src/lib/format.ts';
import * as chartData from '../src/lib/chart-data.ts';
import * as sip from '../src/lib/sip.ts';
import { financialNavBasis } from '../src/lib/corporate-actions.ts';
import type { VerifiedUnitAdjustment } from '../src/lib/corporate-actions.ts';
import type { FundData } from '../src/lib/types.ts';

type Element={type:unknown;props:{children?:unknown;[key:string]:any}};
const chartType=Symbol('Chart'),sipType=Symbol('Sip');
function nodes(value:unknown):Element[]{
  if(Array.isArray(value))return value.flatMap(nodes);
  if(value&&typeof value==='object'&&'props' in value){const n=value as Element;return [n,...nodes(n.props.children)];}
  return [];
}
function text(value:unknown):string{
  if(Array.isArray(value))return value.map(text).join(' ');
  if(value&&typeof value==='object'&&'props' in value)return text((value as Element).props.children);
  return typeof value==='string'||typeof value==='number'?String(value):'';
}
function sourceFund():FundData{return {
  meta:{schemeCode:135854,schemeName:'HDFC BSE Sensex ETF - Growth Option',isinGrowth:'INF179KC1HX2',
    fundHouse:'HDFC Mutual Fund',schemeType:'Open Ended Schemes',schemeCategory:'Other Scheme - Other  ETFs'},
  points:[
    {date:'2015-12-09',nav:4000},{date:'2020-10-23',nav:4800},
    {date:'2021-02-19',nav:5100},{date:'2021-02-22',nav:500},
    {date:'2021-10-22',nav:550},{date:'2023-10-23',nav:680},
    {date:'2024-02-02',nav:700},{date:'2024-02-05',nav:69.65},
    {date:'2024-10-23',nav:75},{date:'2025-10-23',nav:80},{date:'2026-10-23',nav:83},
  ],warnings:['Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.'],
  fetchedAt:'2026-10-26T11:31:26.749Z',source:'mfapi.in',stale:true,fromCache:true,
};}
// Execute real component transforms and CSV handlers; only framework/canvas/network boundaries are stubbed.
function view(name:'FundDetail'|'Comparison'|'SipSimulator',overrides:Record<string,unknown>={}){
  const source=readFileSync(new URL(`../src/components/${name}.tsx`,import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,
    module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const jsx=(type:unknown,props:Element['props'])=>({type,props});
  const downloads:{rows:unknown[][];filename:string}[]=[];
  let hook=0;
  const deps:Record<string,unknown>={
    react:{useMemo:(run:()=>unknown)=>run(),useEffect:()=>{},
      useState:(initial:unknown)=>[hook++===0?'MAX':typeof initial==='function'?initial():initial,()=>{}]},
    'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:Symbol('Fragment')},'lucide-react':{},
    '../lib/analytics.ts':analytics,'../lib/format.ts':{...format,
      downloadCsv:(rows:unknown[][],filename:string)=>downloads.push({rows,filename})},
    '../lib/chart-data.ts':chartData,'../lib/sip.ts':sip,
    '../lib/api.ts':{searchSchemes:async()=>[]},'../lib/catalog.ts':{STARTER_FUNDS:[]},
    './Chart.tsx':{Chart:chartType,CHART_COLORS:['one','two']},
    './AnalysisRangePicker.tsx':{RangePicker:Symbol('Picker'),RangeNotice:Symbol('RangeNotice')},
    './DrawdownEpisodes.tsx':{DrawdownEpisodes:Symbol('Drawdowns')},
    './FundNotes.tsx':{FundNotes:()=>null},'./SipSimulator.tsx':{SipSimulator:sipType},
    './SelectedPeers.tsx':{SelectedPeers:()=>null},'./ReturnCorrelation.tsx':{ReturnCorrelation:()=>null},
    './PlanComparison.tsx':{PlanComparison:()=>null},
  };
  const exports:Record<string,(props:unknown)=>Element>={};
  new Function('require','exports',compiled)((key:string)=>{
    assert.ok(key in deps,`Unexpected component dependency ${key}`);return deps[key];
  },exports);
  const raw=sourceFund();
  const tree=exports[name]({fund:raw,code:135854,tab:'overview',watchlist:[],compared:[],
    setTab(){},back(){},toggleWatch(){},toggleCompare(){},refresh(){},refreshing:false,
    riskFreeRate:.06,setRiskFreeRate(){},openMethod(){},schemes:[],funds:{},errors:{},
    ensureFund:async()=>{},browse(){},openFund(){},...overrides});
  return {
    text:()=>text(tree),nodes:()=>nodes(tree),
    export(label:string){
      const button=nodes(tree).find(n=>n.type==='button'&&n.props['aria-label']===label);
      assert.ok(button&&!button.props.disabled,'Export must be enabled');button.props.onClick();
      return downloads.at(-1)!;
    },
  };
}

test('fund research explains both events, applies cumulative factors and keeps raw NAV CSV unchanged',()=>{
  const raw=sourceFund(),original=structuredClone(raw),page=view('FundDetail',{fund:raw});
  const metric=page.nodes().find(n=>n.props.label==='Period return');
  assert.notEqual(metric?.props.value,'—');
  assert.match(page.text(),/2021/);assert.match(page.text(),/2024/);
  const links=page.nodes().filter(n=>n.type==='a'&&String(n.props.children).includes('action notice'));
  assert.equal(links.length,2,'Each split must expose its own evidence link.');
  const exportData=page.export('Export selected NAV history as CSV');
  for(const p of raw.points)assert.ok(exportData.rows.some(row=>row[0]===p.date&&row[1]===p.nav));
  const chart=page.nodes().find(n=>n.type===chartType);
  assert.ok(chart);assert.equal(chart.props.series[0].data[0].value,10000);
  assert.ok(Math.abs(chart.props.series[0].data.at(-1).value-20750)<1e-8);
  const holding=view('FundDetail',{fund:raw,tab:'holding'});
  const component=holding.nodes().find(n=>n.type===sipType);
  assert.equal(component?.props.unitAdjustments?.length,2,'SIP must receive both event disclosures.');
  assert.deepEqual(raw,original);
});

test('comparison exports both adjustment boundaries for one scheme without reporting an artificial loss',()=>{
  const raw=sourceFund(),clean:FundData={...structuredClone(raw),warnings:[],stale:false,
    meta:{...raw.meta,schemeCode:999999,schemeName:'Example ETF - Growth Option'},
    points:raw.points.map(p=>({...p,nav:p.nav*(p.date<'2021-02-22'?0.01:p.date<'2024-02-05'?0.1:1)}))};
  const page=view('Comparison',{schemes:[raw.meta,clean.meta],funds:{135854:raw,999999:clean}});
  const csv=page.export('Export comparison as CSV');
  const disclosure=String(csv.rows.find(row=>row[0]==='Corporate action')?.[1]??'');
  assert.match(disclosure,/2021-02-19/);assert.match(disclosure,/2024-02-02/);
  assert.equal((disclosure.match(/Scheme 135854/g)??[]).length,2);
  assert.match(page.text(),/2021/);assert.match(page.text(),/2024/);
  const last=csv.rows.find(row=>row[0]==='2026-10-23')!;
  assert.ok(Math.abs(Number(last[1])-Number(last[2]))<1e-8);
});

test('SIP view and CSV disclose both factors and label calculation NAV rather than raw reported NAV',()=>{
  const basis=financialNavBasis(sourceFund());assert.equal(basis.adjusted,true);
  const actions=(basis as typeof basis&{adjustments?:VerifiedUnitAdjustment[]}).adjustments;
  const page=view('SipSimulator',{fund:basis.fund,unitAdjustments:actions});
  assert.match(page.text(),/2021/);assert.match(page.text(),/2024/);
  const csv=page.export('Export hypothetical SIP cash flows as CSV');
  const disclosure=String(csv.rows.find(row=>row[0]==='NAV calculation basis')?.[1]??'');
  assert.match(disclosure,/2021-02-19/);assert.match(disclosure,/2024-02-02/);
  assert.match(disclosure,/cumulativ/i);
  const header=csv.rows.find(row=>row[0]==='Scheduled date');
  assert.equal(header?.[2],'Calculation NAV (INR/unit)');
  assert.ok(csv.rows.some(row=>row.at(-1)==='Valued using unit-adjusted NAV'));
});
