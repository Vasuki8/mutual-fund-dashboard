import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import * as sip from '../src/lib/sip.ts';
import * as analytics from '../src/lib/analytics.ts';
import * as format from '../src/lib/format.ts';
import type { FundData } from '../src/lib/types.ts';

const source = readFileSync(new URL('../src/components/SipSimulator.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
type Element = { type: unknown; props: { children?: unknown; [key: string]: any } };
const jsx = (type: unknown, props: Element['props']): Element => ({ type, props });
const chartType = Symbol('SIP Chart');
const pickerType = Symbol('SIP RangePicker');

function sample(name = 'Example Direct Plan Growth', warnings: string[] = []): FundData {
  const points = Array.from({length:13},(_,month)=>{
    const date = new Date(Date.UTC(2023,month,1)).toISOString().slice(0,10);
    return {date, nav: 100 + month * 3};
  });
  return {
    meta: {schemeCode:122639,schemeName:name,fundHouse:'Example AMC',
      schemeType:'Open Ended',schemeCategory:'Equity Scheme - Flexi Cap Fund'},
    points, fetchedAt:'2024-01-02T12:00:00Z',source:'mfapi.in',
    fromCache:false,stale:false,warnings,
  };
}
function createView(fund = sample()) {
  const states: unknown[] = [];
  const downloads: {rows:(string|number|null)[][];filename:string}[] = [];
  let index=0,tree:Element;
  const deps: Record<string,unknown> = {
    react: {
      useState(initial:unknown) {
        const at=index++;
        if (!(at in states)) states[at] = typeof initial === 'function' ? (initial as ()=>unknown)() : initial;
        return [states[at],(updated:unknown)=>{
          states[at] = typeof updated === 'function' ? (updated as (old:unknown)=>unknown)(states[at]) : updated;
        }];
      },
      useMemo:(fn:()=>unknown)=>fn(),
    },
    'react/jsx-runtime':{jsx,jsxs:jsx},
    'lucide-react':{ Download:'download-icon',Info:'info-icon' },
    '../lib/types.ts':{},
    '../lib/sip.ts':sip,
    '../lib/analytics.ts':analytics,
    '../lib/format.ts':{...format,downloadCsv:(rows:(string|number|null)[][],filename:string)=>{
      downloads.push({rows,filename});
    }},
    './Chart.tsx':{Chart:chartType},
    './AnalysisRangePicker.tsx':{RangePicker:pickerType,RangeNotice:()=>null},
  };
  const exports:Record<string,(props:unknown)=>Element>={};
  new Function('require','exports',compiled)((name:string)=>{
    assert.ok(name in deps,'Unexpected SipSimulator dependency: '+name);
    return deps[name];
  },exports);
  const all=(value:unknown):Element[]=>{
    if(Array.isArray(value))return value.flatMap(all);
    if(value&&typeof value==='object'&&'props' in value){
      const node=value as Element;
      return [node,...all(node.props.children)];
    }
    return [];
  };
  const textual=(value:unknown):string=>{
    if(Array.isArray(value))return value.map(textual).join(' ');
    if(value&&typeof value==='object'&&'props' in value)return textual((value as Element).props.children);
    return typeof value==='string'||typeof value==='number'?String(value):'';
  };
  const render=()=>{index=0;tree=exports.SipSimulator({fund});};
  const find=(predicate:(node:Element)=>boolean)=>all(tree).find(predicate);
  render();
  return {
    all:()=>all(tree),
    text:()=>textual(tree),
    chart:()=>find(node=>node.type===chartType),
    changePeriod:(period:string)=>{const picker=find(node=>node.type===pickerType);assert.ok(picker);picker.props.onChange(period);render();},
    setAmount:(amount:string)=>{const field=find(node=>node.type==='input'&&node.props['aria-label']==='Hypothetical monthly SIP contribution in INR');
      assert.ok(field);field.props.onChange({target:{value:amount}});render();},
    export:()=>{const button=find(node=>node.type==='button'&&node.props['aria-label']==='Export hypothetical SIP cash flows as CSV');
      assert.ok(button);assert.equal(button.props.disabled,false);button.props.onClick();},
    exportDisabled:()=>find(node=>node.type==='button'&&node.props['aria-label']==='Export hypothetical SIP cash flows as CSV')?.props.disabled,
    downloads,
  };
}

test('historical SIP tab shows NAV-backed cash flow chart and dated reproducible CSV',()=>{
  const view=createView();
  view.changePeriod('MAX');
  const chart=view.chart();
  assert.ok(chart);
  assert.equal(chart.props.unit,'currency');
  assert.equal(chart.props.series.length,2);
  assert.equal(chart.props.series[0].name,'Hypothetical SIP value');
  assert.equal(chart.props.series[1].name,'Cumulative contributions');
  assert.deepEqual(chart.props.series[0].data.map((p:{date:string})=>p.date),
    view.chart()!.props.series[1].data.map((p:{date:string})=>p.date));
  assert.match(view.text(),/Money-weighted XIRR/);
  assert.match(view.text(),/13 valued \/ 13 scheduled/);
  assert.match(view.text(),/Reported NAV/);
  view.export();
  assert.equal(view.downloads[0].filename,'fundscope-122639-historical-sip.csv');
  assert.deepEqual(view.downloads[0].rows[0],['Fund','Example Direct Plan Growth']);
  assert.ok(view.downloads[0].rows.some(row=>row[0]==='Money-weighted XIRR (decimal, ACT/365)'));
  assert.ok(view.downloads[0].rows.some(row=>row[0]==='2023-01-01'&&row[1]==='2023-01-01'));
  assert.ok(view.downloads[0].rows.some(row=>row[0]==='NAV observations in selected period'&&row[1]===13));
});

test('bad user contribution displays a visible warning instead of exporting stale results',()=>{
  const view=createView();
  view.setAmount('');
  assert.match(view.text(),/Choose a monthly contribution between/);
  assert.equal(view.exportDisabled(),true);
  assert.equal(view.chart(),undefined);
  view.setAmount('1000');
  assert.equal(view.exportDisabled(),false);
});

test('IDCW NAV and unresolved NAV-quality histories do not expose total-return SIP results',()=>{
  const idcw=createView(sample('Example Direct Plan IDCW'));
  assert.match(idcw.text(),/A verified Growth option is required/);
  assert.equal(idcw.exportDisabled(),true);
  assert.equal(idcw.chart(),undefined);
  const poor=createView(sample('Example Direct Plan Growth',[
    'Invalid NAV observations were excluded (1); derived analytics are blocked until the data is resolved.',
  ]));
  assert.match(poor.text(),/SIP analytics unavailable until material NAV/);
  assert.equal(poor.exportDisabled(),true);
  assert.equal(poor.chart(),undefined);
});
