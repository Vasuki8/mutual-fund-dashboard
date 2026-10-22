import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import * as analytics from '../src/lib/analytics.ts';
import * as format from '../src/lib/format.ts';
import * as chartData from '../src/lib/chart-data.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';

const require = createRequire(import.meta.url);
const components = new Map<string, Record<string, React.ComponentType<any>>>();

// Render real components and calculations. Only the canvas chart is replaced;
// server rendering cannot mount its browser canvas and it is not under test here.
function component(file: string): Record<string, React.ComponentType<any>> {
  if (components.has(file)) return components.get(file)!;
  const source = readFileSync(new URL(`../src/components/${file}`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports: Record<string, React.ComponentType<any>> = {};
  const dependencies: Record<string, unknown> = {
    '../lib/analytics.ts': analytics,
    '../lib/format.ts': format,
    '../lib/chart-data.ts': chartData,
    './Chart.tsx': { Chart: () => null },
  };
  new Function('require', 'exports', compiled)((name: string) => {
    if (name === './DrawdownEpisodes.tsx') return component('DrawdownEpisodes.tsx');
    return name in dependencies ? dependencies[name] : require(name);
  }, exports);
  components.set(file, exports);
  return exports;
}

const points: NavPoint[] = [
  { date: '2024-01-01', nav: 100 },
  { date: '2024-01-03', nav: 80 },
  { date: '2024-01-11', nav: 100 },
  { date: '2024-02-01', nav: 120 },
  { date: '2024-02-05', nav: 108 },
  { date: '2024-02-09', nav: 114 },
];
const fund: FundData = {
  meta: { schemeCode: 1, schemeName: 'Example Direct Growth', fundHouse: 'Example', schemeCategory: 'Equity', schemeType: 'Open Ended' },
  points, fetchedAt: '2024-02-09T20:00:00Z', source: 'mfapi.in', fromCache: false, stale: false, warnings: [],
};

function renderFund(value: FundData, tab = 'risk') {
  const { FundDetail } = component('FundDetail.tsx');
  return renderToStaticMarkup(React.createElement(FundDetail, {
    fund: value, code: 1, tab, setTab() {}, back() {}, watchlist: [], compared: [],
    toggleWatch() {}, toggleCompare() {}, refresh() {}, refreshing: false,
    riskFreeRate: .06, setRiskFreeRate() {}, openMethod() {},
  }));
}

function episodeTable(html: string) {
  const table = html.match(/<table[^>]*aria-label="Drawdown episodes"[^>]*>([\s\S]*?)<\/table>/)?.[1];
  assert.ok(table, 'The risk view must render the drawdown episode table.');
  return table;
}

function text(html: string) { return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }

test('risk view shows distinct completed and unrecovered episodes with calendar-day durations', () => {
  const html = renderFund(fund);
  const table = episodeTable(html);
  const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].slice(1).map(match => text(match[1]));
  assert.equal(rows.length, 2);
  assert.match(rows[0], /1 Jan 2024.*3 Jan 2024.*-20\.00%.*2.*11 Jan 2024.*8.*10.*Recovered/);
  assert.match(rows[1], /1 Feb 2024.*5 Feb 2024.*-10\.00%.*4.*Not observed.*—.*8.*Unrecovered/);
  assert.match(text(html), /Calendar days/);
  assert.match(text(html), /9 Feb 2024/);
});

test('episode view preserves the Growth and source-quality gates', () => {
  const invalid = [
    { ...fund, meta: { ...fund.meta, schemeName: 'Example Direct IDCW' } },
    { ...fund, warnings: ['Conflicting NAV values occur on 1 duplicate date(s); analytics are blocked.'] },
  ];
  for (const value of invalid) {
    const html = renderFund(value);
    assert.match(text(html), /Drawdown episodes/);
    assert.doesNotMatch(html, /<table[^>]*aria-label="Drawdown episodes"/);
    assert.match(text(html), /Episode analysis unavailable/);
  }
});

test('failed refresh still permits episodes from validated retained history', () => {
  const html = renderFund({ ...fund, fromCache: true, stale: true, warnings: ['Refresh failed: MFAPI returned invalid JSON. Showing the saved history.'] });
  assert.match(text(episodeTable(html)), /-20\.00%/);
});

test('flat history and insufficient history have different episode states', () => {
  const flat = renderFund({ ...fund, points: points.map(point => ({ ...point, nav: 100 })) });
  assert.match(text(flat), /No decline was observed in this period/);
  const single = renderFund({ ...fund, points: [points[0]] });
  assert.match(text(single), /At least two NAV observations/);
  for (const html of [flat, single]) assert.doesNotMatch(html, /<table[^>]*aria-label="Drawdown episodes"/);
});

test('episode analysis uses the selected range and remains in the risk tab', () => {
  const value = { ...fund, points: [
    { date: '2015-01-01', nav: 100 }, { date: '2015-02-01', nav: 50 }, { date: '2015-03-01', nav: 100 },
    ...points,
  ] };
  const table = episodeTable(renderFund(value));
  assert.doesNotMatch(text(table), /2015|-50\.00%/);
  assert.doesNotMatch(renderFund(fund, 'overview'), /<table[^>]*aria-label="Drawdown episodes"/);
});
