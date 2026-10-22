import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import * as peers from '../src/lib/selected-peers.ts';
import * as format from '../src/lib/format.ts';
import type { FundData } from '../src/lib/types.ts';

const source = readFileSync(new URL('../src/components/SelectedPeers.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
type Element = { type: unknown; props: { children?: unknown; [key: string]: unknown } };
const jsx = (type: unknown, props: Element['props']): Element => ({ type, props });
const first = (code: number, end: number, category = 'Equity Scheme - Flexi Cap Fund'): FundData => ({
  meta: { schemeCode: code, schemeName: 'Example Fund ' + code + ' - Direct Plan - Growth',
    fundHouse: 'Example AMC', schemeCategory: category, schemeType: 'Open Ended Schemes' },
  points: [{ date: '2023-01-01', nav: 100 }, { date: '2024-01-01', nav: end }],
  fetchedAt: '2024-01-02T00:00:00Z', source: 'mfapi.in', fromCache: false, stale: false, warnings: [],
});
function render(funds: FundData[]) {
  const downloads: { rows: (string | number | null)[][]; filename: string }[] = [];
  const mock = {
    react: { useMemo: (build: () => unknown) => build() },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: Symbol('fragment') },
    'lucide-react': { Download: 'download-icon' },
    '../lib/types.ts': {},
    '../lib/selected-peers.ts': peers,
    '../lib/format.ts': { ...format, downloadCsv: (rows: (string | number | null)[][], filename: string) => {
      downloads.push({ rows, filename });
    } },
  };
  const exports: Record<string, (props: unknown) => Element> = {};
  new Function('require', 'exports', compiled)((name: string) => {
    assert.ok(name in mock, 'Unexpected SelectedPeers dependency: ' + name);
    return mock[name as keyof typeof mock];
  }, exports);
  const opened: number[] = [];
  const tree = exports.SelectedPeers({
    funds, range: 'MAX', requestedPeriod: 'All available common history',
    openFund: (scheme: { schemeCode: number }) => { opened.push(scheme.schemeCode); },
  });
  const nodes: Element[] = [];
  const visit = (child: unknown): void => {
    if (Array.isArray(child)) child.forEach(visit);
    else if (child && typeof child === 'object' && 'props' in child) {
      const element = child as Element;
      nodes.push(element); visit(element.props.children);
    }
  };
  visit(tree);
  const content = (child: unknown): string => {
    if (Array.isArray(child)) return child.map(content).join(' ');
    if (child && typeof child === 'object' && 'props' in child) return content((child as Element).props.children);
    return child === null || child === undefined || typeof child === 'boolean' ? '' : String(child);
  };
  return { nodes, tree, text: content(tree), downloads, opened };
}

test('eligible selected peers show a labeled median, shared observation count and exportable source metadata', () => {
  const view = render([first(100001, 120), first(100002, 110)]);
  assert.match(view.text, /Selected peer context/);
  assert.match(view.text, /Peer median\s+CAGR/);
  assert.match(view.text, /Eligible peer count/);
  assert.match(view.text, /Shared NAV observations/);
  assert.match(view.text, /Selected-set percentile/);
  assert.match(view.text, /not representative of all funds/i);
  const region = view.nodes.find(node => node.props['aria-label'] === 'Selected peer percentile table');
  assert.equal(region?.props.tabIndex, 0);
  const exportButton = view.nodes.find(node => node.props['aria-label'] === 'Export selected peer statistics as CSV');
  assert.ok(exportButton && exportButton.props.disabled === false);
  (exportButton.props.onClick as () => void)();
  assert.equal(view.downloads.length, 1);
  assert.equal(view.downloads[0].filename, 'fundscope-selected-peer-context.csv');
  assert.deepEqual(view.downloads[0].rows[0], ['Source', 'mfapi.in NAV history; user-selected schemes']);
  assert.ok(view.downloads[0].rows.some(row => row[0] === 'Common NAV observations' && row[1] === 2));
  assert.ok(view.downloads[0].rows.some(row => row[0] === 100001 && row[1] === 'Example Fund 100001 - Direct Plan - Growth'));
  const fundButton = view.nodes.find(node => node.type === 'button' && String(node.props.className) === 'text-action');
  assert.ok(fundButton);
  (fundButton.props.onClick as () => void)();
  assert.deepEqual(view.opened, [100001]);
});

test('mixed categories show a non-clickable unavailable state without invented percentile rows', () => {
  const view = render([first(100001, 120), first(100002, 110, 'Equity Scheme - Small Cap Fund')]);
  assert.match(view.text, /Selected-peer statistics unavailable/);
  assert.match(view.text, /same verified MFAPI scheme category/);
  assert.equal(view.nodes.filter(node => node.type === 'tr').length, 0);
  const button = view.nodes.find(node => node.props['aria-label'] === 'Export selected peer statistics as CSV');
  assert.equal(button?.props.disabled, true);
});
