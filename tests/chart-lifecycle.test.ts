import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import { currency, dateLabel, number, percent } from '../src/lib/format.ts';

const source = readFileSync(new URL('../src/components/Chart.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
type Series = { name: string; data: { date: string; value: number }[] }[];
const initial: Series = [{ name: 'Example', data: [{ date: '2025-01-01', value: 100 }] }];

// Execute Chart itself with a controllable layout/animation clock. Canvas and
// React's mounting boundary are replaced; resize and update decisions are not.
function mountedChart() {
  let width = 640, height = 300, disposed = 0, disconnected = false;
  const element = {
    isConnected: true,
    get clientWidth() { return width; },
    get clientHeight() { return height; },
    getBoundingClientRect: () => ({ width, height }),
  };
  let renderedWidth = width, renderedHeight = height;
  const resizes: { width: number; height: number }[] = [];
  const options: any[] = [];
  const exportOptions: any[] = [];
  let appearance = 'light';
  let rendered: any;
  const listeners = new Map<string, Set<() => void>>();
  const windowBoundary = {
    addEventListener(name: string, listener: () => void) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name)!.add(listener); },
    removeEventListener(name: string, listener: () => void) { listeners.get(name)?.delete(listener); },
  };
  const cssBoundary = () => ({ getPropertyValue(name: string) {
    const light: Record<string, string> = { '--atlas-panel': '#faf7f0', '--atlas-raised': '#faf7f0', '--atlas-border': '#c9d0c4', '--atlas-text': '#26352e', '--atlas-muted': '#5e6e63', '--atlas-grid': '#e1e4db', '--atlas-accent': '#25795d', '--atlas-secondary-series': '#b85832', '--atlas-third-series': '#4d6fa3', '--atlas-fourth-series': '#98651c' };
    const dark: Record<string, string> = { '--atlas-panel': '#24332d', '--atlas-raised': '#24332d', '--atlas-border': '#455a4c', '--atlas-text': '#edf1e9', '--atlas-muted': '#aebdb2', '--atlas-grid': '#35483d', '--atlas-accent': '#9ad7b1', '--atlas-secondary-series': '#e7ae7a', '--atlas-third-series': '#9db9df', '--atlas-fourth-series': '#d6c281' };
    return (appearance === 'light' ? light : dark)[name] ?? '';
  } });
  const chart = {
    getWidth: () => renderedWidth,
    getHeight: () => renderedHeight,
    isDisposed: () => disposed > 0,
    resize(size?: { width?: number; height?: number }) {
      renderedWidth = size?.width ?? width;
      renderedHeight = size?.height ?? height;
      resizes.push({ width: renderedWidth, height: renderedHeight });
    },
    setOption: (option: unknown) => { options.push(option); },
    dispose: () => { disposed += 1; },
    getDataURL: (options: unknown) => { exportOptions.push(options); return ""; },
  };
  const refs: { current: unknown }[] = [];
  const effects: { deps: unknown[]; cleanup?: () => void }[] = [];
  let refIndex = 0, effectIndex = 0;
  let pending: (() => void)[] = [];
  let observe: (entries: unknown[]) => void = () => {};
  let nextFrame = 0;
  const frames = new Map<number, () => void>();
  const jsx = (type: unknown, props: any) => {
    if (props?.ref) props.ref.current = element;
    return { type, props };
  };
  const dependencies: Record<string, unknown> = {
    react: {
      useRef(value: unknown) { return refs[refIndex++] ??= { current: value }; },
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
    'echarts/core': { use() {}, init: () => chart, graphic: { LinearGradient: class {} } },
    'echarts/charts': {}, 'echarts/components': {}, 'echarts/renderers': {},
    'lucide-react': {}, '../lib/format.ts': { currency, dateLabel, number, percent },
  };
  const exports: { Chart?: (props: { series: Series }) => unknown } = {};
  new Function('require', 'exports', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'window', 'getComputedStyle', compiled)(
    (name: string) => { assert.ok(name in dependencies, `Unexpected Chart dependency: ${name}`); return dependencies[name]; },
    exports,
    class {
      constructor(callback: (entries: unknown[]) => void) { observe = callback; }
      observe() {}
      disconnect() { disconnected = true; }
    },
    (callback: () => void) => { const id = ++nextFrame; frames.set(id, callback); return id; },
    (id: number) => { frames.delete(id); },
    windowBoundary, cssBoundary,
  );
  const render = (series = initial) => {
    refIndex = 0; effectIndex = 0;
    rendered = exports.Chart!({ series });
    const work = pending; pending = [];
    work.forEach(run => run());
  };
  render();
  return {
    resizes, options, render, exportOptions,
    appearance(next: string) { appearance = next; listeners.get('fundscope:appearance')?.forEach(listener => listener()); },
    exportPng() {
      const find = (value: any): any => Array.isArray(value) ? value.map(find).find(Boolean) : value?.props ? String(value.props['aria-label'] ?? '').startsWith('Download ') ? value : find(value.props.children) : undefined;
      find(rendered).props.onClick();
    },
    notify(nextWidth = width, nextHeight = height, connected = true) {
      width = nextWidth; height = nextHeight; element.isConnected = connected;
      observe([{ target: element, contentRect: element.getBoundingClientRect() }]);
    },
    frame() {
      const work = [...frames.values()]; frames.clear(); work.forEach(run => run());
    },
    unmount() { effects.forEach(effect => effect.cleanup?.()); },
    state: () => ({ pendingFrames: frames.size, disposed, disconnected }),
  };
}

test('chart resizes after observer delivery, batching changes to the latest bounds', () => {
  const mounted = mountedChart();
  mounted.notify(600);
  assert.equal(mounted.resizes.length, 0, 'ResizeObserver must not synchronously resize the chart.');
  mounted.notify(720, 320);
  assert.equal(mounted.state().pendingFrames, 1);
  mounted.frame();
  assert.deepEqual(mounted.resizes, [{ width: 720, height: 320 }]);
  mounted.notify(720, 320);
  mounted.frame();
  assert.equal(mounted.resizes.length, 1, 'Unchanged bounds do not require another resize.');
  mounted.unmount();
});

test('hidden, disconnected, and invalid bounds are ignored until the chart is visible', () => {
  const mounted = mountedChart();
  for (const [width, height, connected] of [[0, 300, true], [640, 0, true], [NaN, 300, true], [Infinity, 300, true], [720, 300, false]] as const) {
    mounted.notify(width, height, connected);
    mounted.frame();
  }
  assert.deepEqual(mounted.resizes, []);
  mounted.notify(720, 300);
  mounted.frame();
  assert.deepEqual(mounted.resizes, [{ width: 720, height: 300 }]);
  mounted.unmount();
});

test('unmount cancels a pending resize before disposing the chart', () => {
  const mounted = mountedChart();
  mounted.notify(720);
  assert.equal(mounted.state().pendingFrames, 1);
  mounted.unmount();
  assert.deepEqual(mounted.state(), { pendingFrames: 0, disposed: 1, disconnected: true });
  mounted.frame();
  assert.deepEqual(mounted.resizes, []);
});

test('new data renders at unchanged dimensions and retains real dates and null gaps', () => {
  const mounted = mountedChart();
  mounted.render([
    { name: 'Example', data: [{ date: '2025-01-01', value: 100 }, { date: '2025-01-03', value: 125 }] },
    { name: 'Second', data: [{ date: '2025-01-02', value: 110 }, { date: '2025-01-03', value: 130 }] },
  ]);
  assert.equal(mounted.options.length, 2);
  const updated = mounted.options.at(-1);
  assert.deepEqual(updated.xAxis.data, ['2025-01-01', '2025-01-02', '2025-01-03']);
  assert.deepEqual(updated.series.map((series: any) => series.data), [[100, null, 125], [null, 110, 130]]);
  assert.ok(updated.series.every((series: any) => series.connectNulls === false));
  mounted.unmount();
});


test('appearance changes recolor existing charts and PNG exports without changing NAV observations', () => {
  const mounted = mountedChart();
  assert.equal(mounted.options.at(-1).backgroundColor, '#faf7f0');
  const originalDates = mounted.options.at(-1).xAxis.data;
  const originalValues = mounted.options.at(-1).series[0].data;
  mounted.appearance('dark');
  const dark = mounted.options.at(-1);
  assert.equal(dark.backgroundColor, '#24332d');
  assert.equal(dark.series[0].lineStyle.color, '#9ad7b1');
  assert.deepEqual(dark.xAxis.data, originalDates);
  assert.deepEqual(dark.series[0].data, originalValues);
  mounted.exportPng();
  assert.equal(mounted.exportOptions.at(-1).backgroundColor, '#24332d');
  mounted.appearance('light');
  assert.equal(mounted.options.at(-1).series[0].lineStyle.color, '#25795d');
  const count = mounted.options.length;
  mounted.unmount();
  mounted.appearance('dark');
  assert.equal(mounted.options.length, count, 'Disposed charts must not receive appearance updates.');
});
