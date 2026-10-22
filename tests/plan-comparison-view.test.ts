import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import * as plan from '../src/lib/plan-comparison.ts';
import * as analytics from '../src/lib/analytics.ts';
import * as format from '../src/lib/format.ts';
import type { FundData } from '../src/lib/types.ts';

type Element = { type: unknown; props: { children?: unknown; [key:string]: any } };
const jsx = (type: unknown, props: Element['props']): Element => ({ type, props });
const source = readFileSync(new URL('../src/components/PlanComparison.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function fund(planName: string, code: number, initial: number, ending: number, house='Example AMC'): FundData {
  return {
    meta: { schemeCode: code, schemeName: planName, fundHouse: house,
      schemeType: 'Open Ended Schemes', schemeCategory: 'Equity Scheme - Flexi Cap Fund' },
    points: [{ date:'2023-01-02', nav:initial }, { date:'2023-06-02', nav:initial*1.05 },
      { date:'2024-01-02', nav:ending }],
    fetchedAt:'2024-01-03T12:00:00Z',source:'mfapi.in',fromCache:false,stale:false,warnings:[],
  };
}
const direct = fund('Alpha Flexi Cap Fund - Direct Plan - Growth', 100001, 100, 120);
const regular = fund('Alpha Flexi Cap Fund - Regular Plan - Growth Option', 100002, 40, 44);

function render(funds: FundData[]) {
  const csvs: { rows: unknown[][]; filename: string }[] = [];
  const exports: Record<string, (props: unknown) => Element | null> = {};
  const deps: Record<string, unknown> = {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: Symbol('Fragment') },
    'lucide-react': { AlertCircle:'alert-icon', Download:'download-icon', Info:'info-icon' },
    '../lib/plan-comparison.ts': plan,
    '../lib/format.ts': { ...format, downloadCsv: (rows: unknown[][], filename: string) => csvs.push({rows,filename}) },
  };
  new Function('require','exports',compiled)((dependency: string) => {
    assert.ok(dependency in deps, 'Unexpected component dependency: ' + dependency);
    return deps[dependency];
  }, exports);
  const alignment = analytics.alignFunds(funds.map(f=>f.points), 'MAX');
  const root = exports.PlanComparison({funds,aligned:alignment,requestedPeriod:'All available common history'});
  const nodes: Element[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value==='object' && 'props' in value) {
      const node=value as Element;
      nodes.push(node);
      walk(node.props.children);
    }
  };
  const text=(value:unknown):string => {
    if(Array.isArray(value))return value.map(text).join(' ');
    if(value && typeof value==='object' && 'props' in value)return text((value as Element).props.children);
    return typeof value==='string'||typeof value==='number'?String(value):'';
  };
  walk(root);
  return {root,nodes,csvs,text:text(root)};
}

test('paired Growth plans render source/eligibility caveats and a labeled percentage-point gap', () => {
  const page=render([direct,regular]);
  assert.match(page.text,/Direct vs Regular plan/);
  assert.match(page.text,/Return gap \(Direct − Regular\)/);
  assert.match(page.text,/\+10\.00 pp/);
  assert.match(page.text,/not\s+an estimate of TER/i);
  assert.match(page.text,/MFAPI does not expressly certify these as paired share classes/);
  assert.match(page.text,/365|3 identical NAV dates/);
});

test('plan CSV records exact scheme identities, provenance, period and daily normalized wealth', () => {
  const page=render([regular,direct]);
  const exportButton=page.nodes.find(node=>node.props['aria-label']==='Export Direct Regular plan comparison as CSV');
  assert.ok(exportButton);
  exportButton!.props.onClick();
  assert.equal(page.csvs.length,1);
  const {rows, filename}=page.csvs[0];
  assert.equal(filename,'fundscope-direct-regular-100001-100002.csv');
  assert.ok(rows.some(row=>row[0]==='Return measure'&&row[1]==='CAGR'));
  assert.ok(rows.some(row=>row[0]==='Direct scheme code'&&row[1]===100001));
  assert.ok(rows.some(row=>row[0]==='Regular scheme code'&&row[1]===100002));
  assert.ok(rows.some(row=>row[0]==='Direct history retrieved UTC'&&row[1]==='2024-01-03T12:00:00Z'));
  assert.ok(rows.some(row=>row[0]==='Direct minus Regular return (percentage points)'&&Math.abs(Number(row[1])-10)<1e-9));
  assert.deepEqual(rows.at(-1),['2024-01-02',120,44,12000,11000,1000]);
  assert.equal(rows.filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(String(row[0]))).length,3);
});

test('mismatched strategy exposes a reason but no export or financial result', () => {
  const wrong=fund('Different Equity Fund - Regular Plan - Growth',100003,40,44);
  const page=render([direct,wrong]);
  assert.match(page.text,/normalized scheme names differ/);
  assert.match(page.text,/MFAPI does not certify plan pairings/);
  assert.ok(!page.nodes.some(node=>node.props['aria-label']==='Export Direct Regular plan comparison as CSV'));
});

test('unrelated Direct peers do not show a spurious Direct-versus-Regular panel', () => {
  const second=fund('Different Equity Fund - Direct Plan - Growth',100004,40,44);
  assert.equal(render([direct,second]).root,null);
});
