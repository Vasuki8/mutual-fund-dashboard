import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import * as analytics from '../src/lib/analytics.ts';
import * as format from '../src/lib/format.ts';
import type { FundData, Scheme } from '../src/lib/types.ts';

const source = readFileSync(new URL('../src/components/Comparison.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const schemes: Scheme[] = ['Alpha', 'Beta', 'Gamma'].map((name, i) => ({ schemeCode: i + 1, schemeName: `${name} - Direct Growth` }));
const funds: Record<number, FundData> = Object.fromEntries(schemes.map((scheme, i) => [scheme.schemeCode, {
  meta: { ...scheme, fundHouse: 'Example', schemeType: 'Open Ended', schemeCategory: 'Equity' },
  points: [{ date: '2024-01-01', nav: 100 }, { date: '2024-06-01', nav: 105 + i }, { date: '2025-01-01', nav: 110 + i }],
  fetchedAt: '2025-01-01T12:00:00Z', source: 'mfapi.in', fromCache: false, stale: false, warnings: [],
}]));
type Element = { type: unknown; props: { children?: unknown; [key: string]: any } };

// Run the component's real visibility transitions and financial transformations.
// Only React's mounting boundary and unrelated rendering/network components are replaced.
function comparison(initial = schemes) {
  const chartType = Symbol('Chart');
  const states: unknown[] = [];
  const effects: { deps: unknown[]; cleanup?: () => void }[] = [];
  let stateIndex = 0, effectIndex = 0, dirty = false;
  let pending: (() => void)[] = [];
  let tree: Element;
  let selection = initial;
  const visibleFrames: string[][] = [];
  const jsx = (type: unknown, props: Element['props']) => ({ type, props });
  const dependencies: Record<string, unknown> = {
    react: {
      useState(initialValue: unknown) {
        const index = stateIndex++;
        if (!(index in states)) states[index] = typeof initialValue === 'function' ? initialValue() : initialValue;
        return [states[index], (update: unknown) => {
          const value = typeof update === 'function' ? update(states[index]) : update;
          if (!Object.is(value, states[index])) { states[index] = value; dirty = true; }
        }];
      },
      useMemo: (run: () => unknown) => run(),
      useEffect(run: () => void | (() => void), deps: unknown[]) {
        const index = effectIndex++;
        const previous = effects[index];
        if (previous && deps.length === previous.deps.length && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
        pending.push(() => {
          previous?.cleanup?.();
          effects[index] = { deps, cleanup: run() || undefined };
        });
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react': {}, '../lib/api.ts': { searchSchemes: async () => [] },
    '../lib/analytics.ts': analytics, '../lib/format.ts': format,
    '../lib/catalog.ts': { STARTER_FUNDS: schemes },
    './Chart.tsx': { Chart: chartType, CHART_COLORS: ['one', 'two', 'three', 'four'] },
    './AnalysisRangePicker.tsx': {},
    './SelectedPeers.tsx': { SelectedPeers: () => null },
  };
  const exports: { Comparison?: (props: unknown) => Element } = {};
  new Function('require', 'exports', compiled)(
    (name: string) => { assert.ok(name in dependencies, `Unexpected Comparison dependency: ${name}`); return dependencies[name]; },
    exports,
  );
  const props = {
    funds, errors: {}, riskFreeRate: .06,
    ensureFund: async () => {}, browse() {}, openFund() {},
    toggleCompare(scheme: Scheme) {
      selection = selection.some(s => s.schemeCode === scheme.schemeCode)
        ? selection.filter(s => s.schemeCode !== scheme.schemeCode) : [...selection, scheme];
    },
  };
  function render() {
    let attempts = 0;
    do {
      assert.ok(attempts++ < 10, 'Comparison should settle without repeated state updates.');
      dirty = false; stateIndex = 0; effectIndex = 0;
      tree = exports.Comparison!({ ...props, schemes: selection });
      const chart = find(node => node.type === chartType, tree);
      if (chart) visibleFrames.push(chart.props.series.map((series: { name: string }) => series.name));
      const work = pending; pending = [];
      work.forEach(run => run());
    } while (dirty);
  }
  function find(predicate: (node: Element) => boolean, value: unknown): Element | undefined {
    if (Array.isArray(value)) {
      for (const child of value) { const match = find(predicate, child); if (match) return match; }
    } else if (value && typeof value === 'object' && 'props' in value) {
      const node = value as Element;
      return predicate(node) ? node : find(predicate, node.props.children);
    }
    return undefined;
  }
  function click(label: string) {
    const button = find(node => node.type === 'button' && node.props['aria-label'] === label, tree);
    assert.ok(button, `Missing button: ${label}`);
    button.props.onClick();
    render();
  }
  render();
  return {
    visibleFrames,
    hide: (name: string) => click(`${name} chart visibility`),
    remove: (name: string) => click(`Remove ${name} from comparison`),
    add(name: string) {
      const scheme = schemes.find(s => format.shortName(s.schemeName) === name);
      assert.ok(scheme);
      props.toggleCompare(scheme);
      render();
    },
    visible: () => (find(node => node.type === chartType, tree)?.props.series ?? []).map((series: { name: string }) => series.name),
    series: () => find(node => node.type === chartType, tree)?.props.series,
    unmount: () => effects.forEach(effect => effect.cleanup?.()),
  };
}

test('removing the only visible fund reveals a remaining series and re-added funds are visible', () => {
  const view = comparison();
  view.hide('Alpha'); view.hide('Beta');
  assert.deepEqual(view.visible(), ['Gamma']);
  view.remove('Gamma');
  assert.deepEqual(view.visible(), ['Alpha']);
  view.add('Gamma');
  assert.deepEqual(view.visible(), ['Alpha', 'Gamma']);
  assert.ok(view.visibleFrames.every(frame => frame.length > 0), 'The chart must stay populated before selection effects finish.');
  view.unmount();
});

test('removing a hidden fund clears its visibility preference before it is re-added', () => {
  const view = comparison();
  view.hide('Beta');
  view.remove('Beta');
  assert.deepEqual(view.visible(), ['Alpha', 'Gamma']);
  view.add('Beta');
  assert.deepEqual(view.visible(), ['Alpha', 'Gamma', 'Beta']);
  const expected: Record<string, number[]> = { Alpha: [10000, 10500, 11000], Beta: [10000, 10600, 11100], Gamma: [10000, 10700, 11200] };
  for (const series of view.series() as { name: string; data: { date: string; value: number }[] }[]) {
    assert.deepEqual(series.data.map(point => point.date), ['2024-01-01', '2024-06-01', '2025-01-01']);
    series.data.forEach((point, i) => assert.ok(Math.abs(point.value - expected[series.name][i]) < 1e-8, `${series.name} value ${i} must retain its normalization.`));
  }
  view.unmount();
});

test('visibility is reconciled even when removal leaves only one selected fund', () => {
  const view = comparison(schemes.slice(0, 2));
  view.hide('Alpha');
  view.remove('Beta');
  view.add('Beta');
  assert.deepEqual(view.visible(), ['Alpha', 'Beta']);
  view.hide('Alpha'); view.hide('Beta');
  assert.deepEqual(view.visible(), ['Beta'], 'The legend must retain one visible series.');
  view.unmount();
});
