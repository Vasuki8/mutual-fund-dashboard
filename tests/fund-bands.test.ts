import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import * as format from '../src/lib/format.ts';
import * as analytics from '../src/lib/analytics.ts';
import * as sorting from '../src/lib/fund-sort.ts';

function bands() {
  const source = readFileSync(new URL('../src/components/FundBands.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const schemes = [1, 2].map(schemeCode => ({ schemeCode, schemeName: `Fund ${schemeCode} - Direct Plan - Growth` }));
  let expanded: number | null | undefined;
  let tree: any;
  const selected: number[] = [];
  const requested: number[] = [];
  const dependencies: Record<string, unknown> = {
    react: { useState(initial: number | null) { if (expanded === undefined) expanded = initial; return [expanded, (change: any) => { expanded = typeof change === 'function' ? change(expanded) : change; }]; }, useEffect(run: () => void) { run(); } },
    'react/jsx-runtime': { jsx: (type: unknown, props: any) => ({ type, props }), jsxs: (type: unknown, props: any) => ({ type, props }) },
    'lucide-react': {}, '../lib/format.ts': format, '../lib/analytics.ts': analytics,
    '../lib/fund-sort.ts': sorting, './FundPreview.tsx': { FundPreview: 'preview-boundary' },
  };
  const exports: any = {};
  new Function('require', 'exports', compiled)((name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; }, exports);
  function render() { tree = exports.FundBands({ schemes, funds: {}, errors: {}, returnsByScheme: {},
    ensureFund: async (code: number) => { requested.push(code); }, onSelect: (scheme: any) => selected.push(scheme.schemeCode),
    watchlist: [], compared: [], openFund() {}, toggleWatch() {}, toggleCompare() {} }); }
  function collect(value: any, predicate: (node: any) => boolean): any[] {
    if (Array.isArray(value)) return value.flatMap(child => collect(child, predicate));
    return value?.props ? [...(predicate(value) ? [value] : []), ...collect(value.props.children, predicate)] : [];
  }
  render();
  return { requested, selected,
    expanded: () => collect(tree, node => node.type === 'button' && node.props['aria-expanded'] === true).map(node => node.props['aria-controls']),
    click(index: number) { collect(tree, node => node.type === 'button' && 'aria-expanded' in node.props)[index].props.onClick(); render(); },
    previews: () => collect(tree, node => node.type === 'preview-boundary'),
    text: () => JSON.stringify(tree),
  };
}

test('starter bands allow one evidence panel, closing it, and opening another without navigating', () => {
  const view = bands();
  assert.deepEqual(view.expanded(), ['fund-evidence-1']);
  view.click(1);
  assert.deepEqual(view.expanded(), ['fund-evidence-2']);
  assert.equal(view.previews().length, 1);
  assert.equal(view.previews()[0].props.scheme.schemeCode, 2);
  view.click(1);
  assert.deepEqual(view.expanded(), []);
  assert.equal(view.previews().length, 0);
  assert.deepEqual(view.selected, [2, 2]);
});

test('starter readings keep unavailable returns missing and request the actual scheme histories', () => {
  const view = bands();
  assert.deepEqual(view.requested, [1, 2]);
  assert.ok(view.text().includes('3Y CAGR'));
  assert.ok(view.text().includes('—'));
  assert.ok(!view.text().includes('0.00%'));
});
