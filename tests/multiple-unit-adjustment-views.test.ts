import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import * as analytics from '../src/lib/analytics.ts';
import * as format from '../src/lib/format.ts';
import * as chartData from '../src/lib/chart-data.ts';
import * as sip from '../src/lib/sip.ts';
import { financialNavBasis } from '../src/lib/corporate-actions.ts';
import type { FundData } from '../src/lib/types.ts';

type Element={type:unknown;props:{children?:unknown;[key:string]:any}};
const pickerType=Symbol('RangePicker');
function nodes(value:unknown):Element[]{
  if(Array.isArray(value))return value.flatMap(nodes);
  if(value&&typeof value==='object'&&'props' in value){const n=value as Element;return[n,...nodes(n.props.children)];}
  return[];
}
function text(value:unknown):string{
  if(Array.isArray(value))return value.map(text).join(' ');
  if(value&&typeof value==='object'&&'props' in value)return text((value as Element).props.children);
  return typeof value==='string'||typeof value==='number'?String(value):'';
}
function rawFund():FundData{return{
  meta:{schemeCode:135854,schemeName:'HDFC BSE Sensex ETF - Growth Option',isinGrowth:'INF179KC1HX2',
    fundHouse:'HDFC Mutual Fund',schemeType:'Open Ended Schemes',schemeCategory:'Other Scheme - Other ETFs'},
  points:[{date:'2015-12-09',nav:2500},{date:'2020-10-23',nav:4000},
    {date:'2021-02-19',nav:5000},{date:'2021-02-22',nav:490},{date:'2021-10-22',nav:520},
    {date:'2023-10-23',nav:630},{date:'2024-02-02',nav:700},{date:'2024-02-05',nav:69.65},
    {date:'2025-10-23',nav:75},{date:'2026-10-23',nav:80.5}],
  warnings:['Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.'],
  source:'mfapi.in',fetchedAt:'2026-10-26T11:31:26.749Z',fromCache:true,stale:false,
};}

// Run actual view handlers and financial modules; only rendering/network boundaries are replaced.
function view(name:'FundDetail'|'Comparison'|'SipSimulator',overrides:Record<string,unknown>){
  const source=readFileSync(new URL(`../src/components/${name}.tsx`,import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,
    module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const state:unknown[]=[],downloads:{rows:unknown[][];filename:string}[]=[];
  let index=0,tree:Element;
  const jsx=(type:unknown,props:Element['props'])=>({type,props});
  const dependencies:Record<string,unknown>={
    react:{useState(initial:unknown){const i=index++;if(!(i in state))state[i]=initial;
      return[state[i],(value:unknown)=>{state[i]=typeof value==='function'?value(state[i]):value;}];},
      useMemo:(fn:()=>unknown)=>fn(),useEffect:()=>{}},
    'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:Symbol('Fragment')},'lucide-react':{},
    '../lib/analytics.ts':analytics,'../lib/chart-data.ts':chartData,'../lib/sip.ts':sip,
    '../lib/format.ts':{...format,downloadCsv:(rows:unknown[][],filename:string)=>downloads.push({rows,filename})},
    '../lib/api.ts':{searchSchemes:async()=>[]},'../lib/catalog.ts':{STARTER_FUNDS:[]},
    './Chart.tsx':{Chart:Symbol('Chart'),CHART_COLORS:['one','two']},
    './AnalysisRangePicker.tsx':{RangePicker:pickerType,RangeNotice:Symbol('RangeNotice')},
    './DrawdownEpisodes.tsx':{DrawdownEpisodes:Symbol('DrawdownEpisodes')},
    './FundNotes.tsx':{FundNotes:Symbol('FundNotes')},'./SipSimulator.tsx':{SipSimulator:Symbol('SipSimulator')},
    './SelectedPeers.tsx':{SelectedPeers:Symbol('SelectedPeers')},
    './ReturnCorrelation.tsx':{ReturnCorrelation:Symbol('ReturnCorrelation')},
    './PlanComparison.tsx':{PlanComparison:Symbol('PlanComparison')},
  };
  const exports:Record<string,(props:unknown)=>Element>={};
  new Function('require','exports',compiled)((path:string)=>{
    assert.ok(path in dependencies,`Unexpected dependency ${path}`);return dependencies[path];
  },exports);
  const props={tab:'overview',watchlist:[],compared:[],riskFreeRate:.06,refreshing:false,
    setTab(){},back(){},toggleWatch(){},toggleCompare(){},refresh(){},setRiskFreeRate(){},openMethod(){},
    errors:{},ensureFund:async()=>{},browse(){},openFund(){},...overrides};
  const render=()=>{index=0;tree=exports[name](props);};render();
  return{content:()=>text(tree),nodes:()=>nodes(tree),
    range(value:string){const picker=nodes(tree).find(n=>n.type===pickerType);assert.ok(picker);picker.props.onChange(value);render();},
    export(label:string){const button=nodes(tree).find(n=>n.props['aria-label']===label);assert.ok(button);
      assert.ok(!button.props.disabled);button.props.onClick();assert.ok(downloads.length);return downloads.at(-1)!;},
  };
}

test('fund detail discloses both event dates and cumulative factors without changing the raw NAV export',()=>{
  const raw=rawFund(),original=structuredClone(raw),page=view('FundDetail',{fund:raw,code:135854});
  assert.match(page.content(),/19 February 2021/);assert.match(page.content(),/2 February 2024/);
  assert.match(page.content(),/compound/i);
  const hrefs=page.nodes().filter(n=>n.type==='a').map(n=>n.props.href);
  assert.ok(hrefs.includes('https://www.msei.in/SX-Content/Circulars/2021/February/Circular-10126.pdf'));
  assert.ok(hrefs.includes('https://nsearchives.nseindia.com/content/circulars/CML60421.pdf'));
  page.range('MAX');const csv=page.export('Export selected NAV history as CSV');
  assert.ok(csv.rows.some(row=>row[0]==='2021-02-19'&&row[1]===5000));
  assert.ok(csv.rows.some(row=>row[0]==='2024-02-02'&&row[1]===700));
  assert.deepEqual(raw,original);
});

test('comparison view and export describe both Sensex actions instead of only the latest split',()=>{
  const raw=rawFund(),basis=financialNavBasis(raw);
  assert.equal(basis.adjusted,true);
  const clean={...basis.fund,meta:{...raw.meta,schemeCode:990001,schemeName:'Example Direct Growth'}};
  const page=view('Comparison',{schemes:[raw.meta,clean.meta],funds:{135854:raw,990001:clean}});
  assert.match(page.content(),/19 February 2021/);assert.match(page.content(),/2 February 2024/);
  page.range('MAX');const csv=page.export('Export comparison as CSV');
  const description=String(csv.rows.find(row=>row[0]==='Corporate action')?.[1]);
  assert.match(description,/2021-02-19/);assert.match(description,/2024-02-02/);
  assert.match(description,/compound/i);
});

test('SIP disclosure and CSV label both adjustments and distinguish adjusted NAV from source NAV',()=>{
  const basis=financialNavBasis(rawFund());assert.equal(basis.adjusted,true);
  const page=view('SipSimulator',{fund:basis.fund,unitAdjustment:basis.adjustment});
  assert.match(page.content(),/19 February 2021/);assert.match(page.content(),/2 February 2024/);
  page.range('MAX');const csv=page.export('Export hypothetical SIP cash flows as CSV');
  const description=String(csv.rows.find(row=>row[0]==='NAV calculation basis')?.[1]);
  assert.match(description,/2021-02-19/);assert.match(description,/2024-02-02/);
  assert.match(description,/compound/i);
  const header=csv.rows.find(row=>row[0]==='Scheduled date');assert.ok(header);
  assert.equal(header[2],'Unit-adjusted NAV (INR/unit)');
  assert.equal(csv.rows.find(row=>row[0]==='Original NAV retrieval')?.[1],basis.fund.fetchedAt);
});
