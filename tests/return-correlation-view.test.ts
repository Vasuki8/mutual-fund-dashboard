import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import * as correlation from '../src/lib/return-correlation.ts';
import * as format from '../src/lib/format.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';

const source = readFileSync(new URL('../src/components/ReturnCorrelation.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX},
}).outputText;
type Element = {type: unknown; props: {children?: unknown; [key: string]: unknown}};
const jsx = (type: unknown, props: Element['props']): Element => ({type, props});
function fund(code: number, complete: boolean): FundData {
  let value = 100;
  const points: NavPoint[] = [{date: '2023-01-31', nav: value}];
  for (let i = 0; i < (complete ? 12 : 4); i++) {
    value *= i % 2 === 0 ? 1.06 : 0.97;
    points.push({date: new Date(Date.UTC(2023,i + 2,0)).toISOString().slice(0,10), nav: value});
  }
  return {
    meta: {schemeCode: code, schemeName: 'Example ' + code + ' - Direct Growth', fundHouse: 'Example AMC',
      schemeType: 'Open Ended', schemeCategory: 'Equity Scheme - Large Cap Fund'},
    points, fetchedAt: '2024-02-01T00:00:00Z', source: 'mfapi.in', fromCache: false, stale: false, warnings: [],
  };
}
function render(complete: boolean) {
  const saved: {rows: unknown[][]; filename: string}[] = [];
  const deps = {
    react: {useMemo: (build: () => unknown) => build()},
    'react/jsx-runtime': {jsx, jsxs: jsx, Fragment: Symbol('fragment')},
    'lucide-react': {Download: 'download-icon'},
    '../lib/return-correlation.ts': correlation,
    '../lib/format.ts': {...format, downloadCsv: (rows: unknown[][], filename: string) => saved.push({rows,filename})},
  };
  const exports: Record<string, (props: unknown) => Element> = {};
  new Function('require','exports',compiled)((dependency: string) => {
    assert.ok(dependency in deps, 'Unexpected ReturnCorrelation dependency: ' + dependency);
    return deps[dependency as keyof typeof deps];
  },exports);
  const tree = exports.ReturnCorrelation({funds:[fund(100001,complete),fund(100002,complete)],
    range:'MAX',requestedPeriod:'All available history'});
  const nodes: Element[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object' && 'props' in value) {
      const element = value as Element;
      nodes.push(element); visit(element.props.children);
    }
  };
  visit(tree);
  const text = (value: unknown): string => {
    if (Array.isArray(value)) return value.map(text).join(' ');
    if (value && typeof value === 'object' && 'props' in value) return text((value as Element).props.children);
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  };
  return {nodes,saved,text:text(tree)};
}

test('monthly correlation table exposes pairwise sample counts, units and export metadata', () => {
  const view=render(true);
  assert.match(view.text,/Monthly return correlation/);
  assert.match(view.text,/12 complete, matching calendar-month returns/);
  assert.match(view.text,/Return correlation is not portfolio holdings overlap/);
  assert.ok(view.nodes.some(node=>node.props['aria-label']==='Monthly return correlation matrix' && node.props.tabIndex===0));
  const exportButton=view.nodes.find(node=>node.props['aria-label']==='Export monthly return correlation as CSV');
  assert.ok(exportButton);
  (exportButton.props.onClick as ()=>void)();
  assert.equal(view.saved.length,1);
  assert.equal(view.saved[0].filename,'fundscope-monthly-return-correlation.csv');
  assert.deepEqual(view.saved[0].rows[0],['Source','mfapi.in; validated NAV history; locally computed monthly returns']);
  assert.ok(view.saved[0].rows.some(row=>row[0]==='Minimum paired returns' && row[1]===12));
  assert.ok(view.saved[0].rows.some(row=>row[0]===100001 && row[2]===100002 && row[5]===12));
});

test('short histories show unavailable correlations rather than made-up estimates', () => {
  const view=render(false);
  assert.match(view.text,/No pair has enough eligible complete monthly observations/);
  assert.match(view.text,/—/);
  assert.ok(view.nodes.some(node=>node.type==='table'));
});
