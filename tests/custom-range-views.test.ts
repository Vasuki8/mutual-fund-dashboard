import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import * as analytics from '../src/lib/analytics.ts';
import * as format from '../src/lib/format.ts';
import * as chartData from '../src/lib/chart-data.ts';
import type { FundData, NavPoint, Scheme } from '../src/lib/types.ts';

type Element = { type: unknown; props: { children?: unknown; [key: string]: any } };
type Range = string | { start: string; end: string };
const chartType = Symbol('Chart');
const pickerType = Symbol('RangePicker');
const noticeType = Symbol('RangeNotice');
const episodesType = Symbol('DrawdownEpisodes');
const schemes: Scheme[] = [1, 2].map(code => ({ schemeCode: code, schemeName: `${code === 1 ? 'Alpha' : 'Beta'} Direct Growth` }));
const observations: NavPoint[] = [
  { date: '2023-12-29', nav: 100 },
  { date: '2024-01-05', nav: 80 },
  { date: '2024-01-26', nav: 110 },
  { date: '2024-01-31', nav: 120 },
  { date: '2024-02-29', nav: 90 },
  { date: '2024-03-28', nav: 150 },
  { date: '2025-01-31', nav: 200 },
];
function makeFund(code: number, points = observations): FundData {
  return {
    meta: { ...schemes[code - 1], fundHouse: 'Example', schemeType: 'Open Ended', schemeCategory: 'Equity' },
    points, fetchedAt: '2025-02-01T12:00:00Z', source: 'mfapi.in', fromCache: false, stale: false, warnings: [],
  };
}

function nodes(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (value && typeof value === 'object' && 'props' in value) {
    const node = value as Element;
    return [node, ...nodes(node.props.children)];
  }
  return [];
}
function text(value: unknown): string {
  if (Array.isArray(value)) return value.map(text).join(' ');
  if (value && typeof value === 'object' && 'props' in value) return text((value as Element).props.children);
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

// Exercise the real page state, transforms and export handlers. Canvas rendering,
// the separately tested range editor, and network/mounting boundaries are replaced.
function view(name: 'FundDetail' | 'Comparison', overrides: Record<string, unknown> = {}) {
  const source = readFileSync(new URL(`../src/components/${name}.tsx`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const state: unknown[] = [];
  const effects: { deps: unknown[]; cleanup?: () => void }[] = [];
  const downloads: { rows: unknown[][]; filename: string }[] = [];
  let stateIndex = 0, effectIndex = 0, dirty = false;
  let pending: (() => void)[] = [];
  let tree: Element;
  const jsx = (type: unknown, props: Element['props']) => ({ type, props });
  const dependencies: Record<string, unknown> = {
    react: {
      useState(initial: unknown) {
        const index = stateIndex++;
        if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
        return [state[index], (update: unknown) => {
          const next = typeof update === 'function' ? update(state[index]) : update;
          if (!Object.is(next, state[index])) { state[index] = next; dirty = true; }
        }];
      },
      useMemo: (run: () => unknown) => run(),
      useEffect(run: () => void | (() => void), deps: unknown[]) {
        const index = effectIndex++;
        const previous = effects[index];
        if (previous && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
        pending.push(() => { previous?.cleanup?.(); effects[index] = { deps, cleanup: run() || undefined }; });
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: Symbol('Fragment') },
    'lucide-react': {},
    '../lib/analytics.ts': analytics,
    '../lib/format.ts': { ...format, downloadCsv: (rows: unknown[][], filename: string) => downloads.push({ rows, filename }) },
    '../lib/chart-data.ts': chartData,
    '../lib/api.ts': { searchSchemes: async () => [] },
    '../lib/catalog.ts': { STARTER_FUNDS: [] },
    './Chart.tsx': { Chart: chartType, CHART_COLORS: ['one', 'two'] },
    './DrawdownEpisodes.tsx': { DrawdownEpisodes: episodesType },
    './SelectedPeers.tsx': { SelectedPeers: () => null },
    './AnalysisRangePicker.tsx': { RangePicker: pickerType, RangeNotice: noticeType },
    './FundDetail.tsx': { RangePicker: pickerType },
  };
  const exports: Record<string, (props: unknown) => Element> = {};
  new Function('require', 'exports', compiled)((dependency: string) => {
    assert.ok(dependency in dependencies, `Unexpected ${name} dependency: ${dependency}`);
    return dependencies[dependency];
  }, exports);
  let props = {
    fund: makeFund(1), code: 1, tab: 'overview', watchlist: [], compared: [],
    setTab() {}, back() {}, toggleWatch() {}, toggleCompare() {}, refresh() {}, refreshing: false,
    riskFreeRate: .06, setRiskFreeRate() {}, openMethod() {},
    schemes, funds: { 1: makeFund(1), 2: makeFund(2, observations.filter(point => point.date !== '2024-01-26')) },
    errors: {}, ensureFund: async () => {}, browse() {}, openFund() {}, ...overrides,
  };
  function render() {
    let attempts = 0;
    do {
      assert.ok(attempts++ < 10, 'Page state must settle.');
      dirty = false; stateIndex = 0; effectIndex = 0;
      tree = exports[name](props);
      const work = pending; pending = []; work.forEach(run => run());
    } while (dirty);
  }
  const find = (predicate: (node: Element) => boolean) => nodes(tree).find(predicate);
  render();
  return {
    downloads,
    find,
    content: () => text(tree),
    chart: () => find(node => node.type === chartType)?.props,
    metric: (label: string) => find(node => node.props.label === label)?.props,
    range(value: Range) {
      const picker = find(node => node.type === pickerType);
      assert.ok(picker, 'Analysis date controls must remain available.');
      picker.props.onChange(value); render();
    },
    change(next: Record<string, unknown>) { props = { ...props, ...next }; render(); },
    export(label: string) {
      const button = find(node => node.type === 'button' && node.props['aria-label'] === label);
      assert.ok(button && !button.props.disabled, `Export must be available: ${label}`);
      button.props.onClick();
      return downloads.at(-1)!;
    },
    unmount: () => effects.forEach(effect => effect.cleanup?.()),
  };
}

test('fund custom dates keep chart, metrics, drawdown episodes and NAV export on the same observations', () => {
  const page = view('FundDetail');
  page.range({ start: '2024-01-01', end: '2024-02-29' });
  assert.deepEqual(page.chart()!.series[0].data.map((point: NavPoint) => point.date), observations.slice(0, 5).map(point => point.date));
  assert.equal(page.metric('Period return')!.value, '-10.00%');
  assert.match(page.chart()!.title, /2023-12-29 to 2024-02-29$/);
  assert.doesNotMatch(page.chart()!.subtitle, /2025/);
  const csv = page.export('Export selected NAV history as CSV');
  assert.ok(csv.rows.some(row => row[0] === 'Requested period' && row[1] === '2024-01-01 to 2024-02-29'));
  assert.ok(csv.rows.some(row => row[0] === 'Actual NAV dates' && row[1] === '2023-12-29 to 2024-02-29'));
  assert.deepEqual(csv.rows.filter(row => /^\d{4}-/.test(String(row[0]))), observations.slice(0, 5).map(point => [point.date, point.nav]));
  assert.match(csv.filename, /custom-2024-01-01-2024-02-29/);
  page.change({ tab: 'risk' });
  assert.deepEqual(page.find(node => node.type === episodesType)!.props.points, observations.slice(0, 5));
  assert.match(page.chart()!.title, /2023-12-29 to 2024-02-29$/);
  page.unmount();
});

test('fund custom monthly view excludes a clipped final month and can recover from an empty date range', () => {
  const page = view('FundDetail', { tab: 'monthly' });
  page.range({ start: '2023-12-29', end: '2024-01-26' });
  assert.equal(page.metric('Latest complete month')!.value, '—');
  assert.match(page.content(), /No complete monthly returns/);
  page.range({ start: '2023-12-29', end: '2024-01-31' });
  const monthlyCsv = page.export('Export selected monthly returns as CSV');
  assert.ok(monthlyCsv.rows.some(row => row[0] === 'Requested period' && row[1] === '2023-12-29 to 2024-01-31'));
  const monthlyRows = monthlyCsv.rows.filter(row => typeof row[0] === 'number');
  assert.equal(monthlyRows.length, 1);
  assert.deepEqual(monthlyRows[0].slice(0, 3), [2024, 1, '2024-01-31']);
  assert.ok(Math.abs(Number(monthlyRows[0][3]) - 0.2) < 1e-12);
  page.change({ tab: 'overview' });
  page.range({ start: '2020-01-01', end: '2020-12-31' });
  assert.equal(page.metric('Period return')!.value, '—');
  assert.equal(page.metric('Maximum drawdown')!.value, '—');
  assert.equal(page.chart(), undefined);
  assert.match(page.content(), /No NAV observations/);
  assert.equal(page.find(node => node.props['aria-label'] === 'Export selected NAV history as CSV')!.props.disabled, true);
  page.range('MAX');
  assert.equal(page.chart()!.series[0].data.length, observations.length);
  page.unmount();
});

test('comparison custom dates use exact common observations for chart, metrics and exports', () => {
  const page = view('Comparison');
  page.range({ start: '2024-01-01', end: '2024-02-29' });
  const dates = ['2023-12-29', '2024-01-05', '2024-01-31', '2024-02-29'];
  for (const series of page.chart()!.series) assert.deepEqual(series.data.map((point: NavPoint) => point.date), dates);
  assert.match(page.content(), /-10\.00%/);
  const csv = page.export('Export comparison as CSV');
  assert.ok(csv.rows.some(row => row[0] === 'Requested period' && row[1] === '2024-01-01 to 2024-02-29'));
  assert.ok(csv.rows.some(row => row[0] === 'Actual common NAV dates' && row[1] === '2023-12-29 to 2024-02-29'));
  assert.deepEqual(csv.rows.filter(row => /^\d{4}-/.test(String(row[0]))).map(row => row[0]), dates);
  assert.match(csv.filename, /custom-2024-01-01-2024-02-29/);
  page.unmount();
});

test('comparison date controls remain usable for zero or one common observations', () => {
  const page = view('Comparison');
  for (const range of [{ start: '2020-01-01', end: '2020-12-31' }, { start: '2024-01-26', end: '2024-01-31' }]) {
    page.range(range);
    assert.equal(page.chart(), undefined);
    assert.match(page.content(), /not have enough common reported NAV dates/);
  }
  page.range('MAX');
  assert.equal(page.chart()!.series[0].data.length, observations.length - 1);
  page.unmount();
});

test('both pages keep risk unavailable when the custom final month leaves eleven complete returns', () => {
  let nav = 100;
  const points = [{ date: '2022-12-31', nav }, ...Array.from({ length: 12 }, (_, index) => {
    nav *= index % 2 === 0 ? 1.02 : 0.99;
    return { date: index === 11 ? '2023-12-27' : new Date(Date.UTC(2023, index + 1, 0)).toISOString().slice(0, 10), nav };
  })];
  const range = { start: '2022-12-31', end: '2023-12-27' };
  const fundPage = view('FundDetail', { fund: makeFund(1, points) });
  fundPage.range(range);
  assert.equal(fundPage.metric('Annualized volatility')!.value, '—');
  assert.equal(fundPage.metric('Annualized volatility')!.detail, '11 complete monthly returns');
  fundPage.unmount();
  const comparePage = view('Comparison', { funds: { 1: makeFund(1, points), 2: makeFund(2, points) } });
  comparePage.range(range);
  const table = comparePage.find(node => node.props['aria-label'] === 'Fund metrics over common analysis dates')!;
  const body = nodes(table).find(node => node.type === 'tbody')!;
  const rows = nodes(body).filter(node => node.type === 'tr');
  assert.equal(rows.length, 2);
  for (const row of rows) assert.equal(text(nodes(row).filter(node => node.type === 'td')[4]), '—');
  comparePage.unmount();
});

test('holding periods remain explicitly full-history after a custom analysis range was applied', () => {
  const page = view('FundDetail');
  page.range({ start: '2024-01-01', end: '2024-02-29' });
  page.change({ tab: 'holding' });
  assert.equal(page.find(node => node.type === pickerType), undefined);
  assert.match(page.content(), /Full available history/);
  const csv = page.export('Export selected NAV history as CSV');
  assert.deepEqual(csv.rows.filter(row => /^\d{4}-/.test(String(row[0]))), observations.map(point => [point.date, point.nav]));
  page.unmount();
});
