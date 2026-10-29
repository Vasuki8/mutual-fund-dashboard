import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import * as analytics from '../src/lib/analytics.ts';
import * as format from '../src/lib/format.ts';
import * as sip from '../src/lib/sip.ts';
import * as planComparison from '../src/lib/plan-comparison.ts';
import * as selectedPeers from '../src/lib/selected-peers.ts';
import * as returnCorrelation from '../src/lib/return-correlation.ts';
import { BOI_CASES, boiFixture } from './fixtures/boi-nav-review.ts';
import { ABSL_CASES, abslFixture } from './fixtures/absl-nav-review.ts';
import * as chartData from '../src/lib/chart-data.ts';
import type { FundData, NavPoint, Scheme } from '../src/lib/types.ts';

type Element = { type: unknown; props: { children?: unknown; [key: string]: any } };
type Range = string | { start: string; end: string };
const chartType = Symbol('Chart');
const pickerType = Symbol('RangePicker');
const noticeType = Symbol('RangeNotice');
const episodesType = Symbol('DrawdownEpisodes');
const sipType = Symbol('SipSimulator');

function nodes(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (value && typeof value === 'object' && 'props' in value) {
    const node = value as Element;
    return [node, ...nodes(node.props.children)];
  }
  return [];
}

// Removing provenance, routing raw values into calculations, or routing reviewed
// values into raw exports must fail these real component/handler tests.
for (const spec of BOI_CASES) {
  test(`${spec.plan} detail discloses the exact review while chart and CSV retain raw NAV`, () => {
    const fund=boiFixture(spec), raw=structuredClone(fund);
    const page=view('FundDetail',{fund,code:spec.code});
    page.range('MAX');
    assert.match(page.content(), /reviewed calculation NAV/i);
    assert.match(page.content(), /2022-03-31/);
    assert.ok(page.content().includes(String(spec.navs[4])));
    assert.equal(page.content().split(String(spec.navs[4])).length-1,1,'Show the correction once, while preserving raw exports.');
    assert.ok(page.content().includes(String(spec.verified)));
    assert.doesNotMatch(page.content(), /unit consolidation|unit split/i);
    assert.match(page.content(), /loss|markdown/i);
    assert.match(page.content(), /gain|recovery/i);
    assert.ok(page.links().some(url=>String(url).startsWith('https://www.boimf.in/')));
    assert.doesNotMatch(page.content(),/https?:\/\//,'Evidence URLs remain clickable links instead of long literal text.');
    const wealth=page.chart()!.series[0].data;
    assert.ok(Math.abs(wealth[1].value/wealth[0].value-1-spec.loss)<1e-12);
    assert.ok(Math.abs(wealth[4].value/wealth[3].value-1-spec.recovery)<1e-12);
    page.click('NAV');
    assert.equal(page.chart()!.series[0].data.find((p:any)=>p.date==='2022-03-31').value,spec.navs[4]);
    const csv=page.export('Export selected NAV history as CSV');
    assert.deepEqual(csv.rows.filter(row=>/^\d{4}-/.test(String(row[0]))),fund.points.map(p=>[p.date,p.nav]));
    assert.equal(csv.rows.find(row=>row[0]==='Basis')?.[1],'Raw NAV; distributions are not included');
    assert.deepEqual(fund,raw);
    page.change({tab:'returns'});
    const simulator=page.find(node=>node.type===sipType)!;
    const sipPage=view('SipSimulator',simulator.props);
    sipPage.range({start:'2022-03-31',end:'2022-04-04'});
    const sipCsv=sipPage.export('Export hypothetical SIP cash flows as CSV');
    assert.equal(sipCsv.rows.find(row=>row[0]==='2022-03-31')?.[2],spec.verified);
    page.unmount(); sipPage.unmount();
  });
}

test('monthly export identifies the review and calculates from the verified observation',()=>{
  const fund=boiFixture();
  fund.points.push({date:'2022-02-28',nav:4.63},{date:'2022-04-29',nav:10.3});
  fund.points.sort((a,b)=>a.date.localeCompare(b.date));
  const page=view('FundDetail',{fund,tab:'monthly'});
  page.range('MAX');
  const csv=page.export('Export selected monthly returns as CSV');
  const metadata=csv.rows.filter(row=>typeof row[0]==='string'&&!/^\d{4}-/.test(String(row[0]))).flat().join(' ');
  assert.match(metadata,/reviewed calculation NAV/i);
  assert.match(metadata,/2022-03-31/);
  assert.match(metadata,/9\.6296/); assert.match(metadata,/10\.2756/);
  assert.match(metadata,/https:\/\/www\.boimf\.in\//);
  const march=csv.rows.find(row=>row[0]===2022&&row[1]===3)!;
  assert.ok(Math.abs(Number(march[3])-1.2193520518358532)<1e-12);
  page.unmount();
});

test('comparison export retains both economic returns and discloses each exact reviewed plan',()=>{
  const funds=BOI_CASES.map(spec=>boiFixture(spec)),raw=structuredClone(funds);
  const page=view('Comparison',{schemes:funds.map(f=>f.meta),funds:Object.fromEntries(funds.map(f=>[f.meta.schemeCode,f]))}); page.range('MAX');
  assert.match(page.content(),/reviewed calculation NAV/i);
  assert.doesNotMatch(page.content(),/https?:\/\//);
  assert.doesNotMatch(page.content(),/unit consolidation|unit split/i);
  const csv=page.export('Export comparison as CSV');
  const metadata=csv.rows.filter(row=>!/^\d{4}-/.test(String(row[0]))).flat().join(' ');
  for(const spec of BOI_CASES){
    assert.ok(metadata.includes(String(spec.code)));
    assert.ok(metadata.includes(String(spec.navs[4])));
    assert.ok(metadata.includes(String(spec.verified)));
  }
  assert.match(metadata,/https:\/\/www\.boimf\.in\//);
  const dated=csv.rows.filter(row=>/^\d{4}-/.test(String(row[0])));
  for(let index=0;index<2;index++){
    assert.ok(Math.abs(Number(dated[1][index+1])/Number(dated[0][index+1])-1-BOI_CASES[index].loss)<1e-12);
    assert.ok(Math.abs(Number(dated[4][index+1])/Number(dated[3][index+1])-1-BOI_CASES[index].recovery)<1e-12);
  }
  assert.deepEqual(funds,raw); page.unmount();
});

test('SIP uses reviewed columns, statuses and primary provenance without repeating a substitution already in source',()=>{
  const fund=boiFixture(); fund.points[4].nav=10.2756;
  const basis=format.financialNavBasis(fund);
  const page=view('SipSimulator',{fund:basis.fund,navReview:basis.review});
  page.range({start:'2022-03-31',end:'2022-04-04'});
  assert.match(page.content(),/reviewed calculation NAV/i);
  assert.match(page.content(),/no substitution|already.*verified/i);
  assert.ok(page.links().some(url=>String(url).startsWith('https://www.boimf.in/')));
  assert.doesNotMatch(page.content(),/https?:\/\//);
  const csv=page.export('Export hypothetical SIP cash flows as CSV');
  assert.match(String(csv.rows.find(row=>row[0]==='NAV calculation basis')?.[1]),/no substitution|already.*verified/i);
  assert.equal(csv.rows.find(row=>row[0]==='Scheduled date')?.[2],'Reviewed calculation NAV (INR/unit)');
  assert.equal(csv.rows.find(row=>row[0]==='2022-03-31')?.[5],'Valued using reviewed calculation NAV');
  assert.equal(csv.rows.find(row=>row[0]==='2022-03-31')?.[2],10.2756);
  page.range({start:'2020-04-23',end:'2020-04-27'});
  const lossCsv=page.export('Export hypothetical SIP cash flows as CSV');
  assert.ok(Number(lossCsv.rows.find(row=>row[0]==='Simple gain divided by contributions (decimal)')?.[1])<-.50);
  page.unmount();
});

test('independent source blockers preserve paused views, disabled exports and no review claim',()=>{
  const fund=boiFixture(); fund.warnings.push('Invalid NAV observations were excluded (1); derived analytics are blocked until the data is resolved.');
  const page=view('FundDetail',{fund,tab:'monthly'});
  assert.match(page.content(),/Analytics are paused/);
  assert.doesNotMatch(page.content(),/reviewed calculation NAV/i);
  assert.equal(page.find(node=>node.props['aria-label']==='Export selected monthly returns as CSV')?.props.disabled,true);
  page.change({tab:'returns'});
  const sipPage=view('SipSimulator',page.find(node=>node.type===sipType)!.props);
  assert.equal(sipPage.find(node=>node.props['aria-label']==='Export hypothetical SIP cash flows as CSV')?.props.disabled,true);
  const comparison=view('Comparison',{funds:{133867:fund,133868:boiFixture(BOI_CASES[1])}});
  assert.match(comparison.content(),/requires Growth schemes with validated NAV histories/);
  assert.equal(comparison.find(node=>node.props['aria-label']==='Export comparison as CSV'),undefined);
  page.unmount(); sipPage.unmount(); comparison.unmount();
});

for(const spec of ABSL_CASES){
  test(`${spec.plan} source-error review removes the false spike without claiming an economic event`,()=>{
    const fund=abslFixture(spec),original=structuredClone(fund);
    fund.warnings.push('History came from the saved archive.');
    const page=view('FundDetail',{fund,code:spec.code}); page.range('MAX');
    assert.match(page.content(),/reviewed calculation NAV/i);
    assert.doesNotMatch(page.content(),/https?:\/\//);
    assert.doesNotMatch(page.content(),/recovery|markdown|consolidation|split/i);
    assert.equal(page.content().split(String(spec.navs[2])).length-1,1);
    assert.match(page.content(),/History came from the saved archive/);
    const values=page.chart()!.series[0].data;
    assert.ok(Math.abs(values[2].value/values[1].value-1-spec.firstReturn)<1e-12);
    assert.ok(Math.abs(values[3].value/values[2].value-1-spec.secondReturn)<1e-12);
    const rawCsv=page.export('Export selected NAV history as CSV');
    assert.equal(rawCsv.rows.find(row=>row[0]==='2019-04-10')?.[1],spec.navs[2]);
    assert.deepEqual(fund.points,original.points);
    assert.equal(fund.warnings[0],original.warnings[0]);
    page.change({tab:'returns'});
    const simulator=view('SipSimulator',page.find(node=>node.type===sipType)!.props);
    simulator.range({start:'2019-04-10',end:'2019-04-12'});
    assert.doesNotMatch(simulator.content(),/recovery|markdown|consolidation|split/i);
    const csv=simulator.export('Export hypothetical SIP cash flows as CSV');
    assert.equal(csv.rows.find(row=>row[0]==='2019-04-10')?.[2],spec.verified);
    assert.equal(csv.rows.find(row=>row[0]==='2019-04-10')?.[5],'Valued using reviewed calculation NAV');
    assert.equal(csv.rows.some(row=>row[0]==='Economic event evidence'),false);
    assert.match(String(csv.rows.find(row=>row[0]==='NAV calculation basis')?.[1]),/2019-04-10/);
    page.unmount(); simulator.unmount();
  });
}

test('comparison discloses source-only reviews without inventing economic events',()=>{
  const funds=ABSL_CASES.map(spec=>abslFixture(spec));
  const page=view('Comparison',{schemes:funds.map(f=>f.meta),funds:Object.fromEntries(funds.map(f=>[f.meta.schemeCode,f]))});
  page.range('MAX');
  assert.doesNotMatch(page.content(),/recovery|markdown|consolidation|split/i);
  const csv=page.export('Export comparison as CSV');
  assert.equal(csv.rows.filter(row=>row[0]==='NAV calculation basis').length,2);
  assert.equal(csv.rows.some(row=>row[0]==='Economic event evidence'),false);
  const points=csv.rows.filter(row=>/^\d{4}-/.test(String(row[0])));
  for(let i=0;i<2;i++)assert.ok(Math.abs(Number(points[2][i+1])/Number(points[1][i+1])-1-ABSL_CASES[i].firstReturn)<1e-12);
  page.unmount();
});

test('comparison waits for every selected history and recovers when missing reviewed data arrives',()=>{
  const regular=boiFixture(),direct=boiFixture(BOI_CASES[1]);
  const page=view('Comparison',{funds:{133867:regular}});
  assert.match(page.content(),/Aligning your fund histories/);
  assert.equal(page.chart(),undefined);
  assert.equal(page.find(node=>node.props['aria-label']==='Export comparison as CSV'),undefined);
  page.change({funds:{133867:regular,133868:direct}});
  assert.ok(page.chart());
  assert.equal(page.export('Export comparison as CSV').rows.filter(row=>row[0]==='NAV calculation basis').length,2);
  page.change({funds:{133868:direct}});
  assert.match(page.content(),/Aligning your fund histories/);
  assert.equal(page.chart(),undefined);
  page.unmount();
});
function text(value: unknown): string {
  if (Array.isArray(value)) return value.map(text).join(' ');
  if (value && typeof value === 'object' && 'props' in value) return text((value as Element).props.children);
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

// Exercise the real page state, transforms and export handlers. Canvas rendering,
// the separately tested range editor, and network/mounting boundaries are replaced.
function view(name: 'FundDetail' | 'Comparison' | 'SipSimulator', overrides: Record<string, unknown> = {}) {
  const source = readFileSync(new URL(`../src/components/${name}.tsx`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const state: unknown[] = [];
  const effects: { deps: unknown[]; cleanup?: () => void }[] = [];
  const downloads: { rows: unknown[][]; filename: string }[] = [];
  let stateIndex = 0, effectIndex = 0, dirty = false;
  let hooks: string[] = [], previousHooks: string[] | undefined;
  let pending: (() => void)[] = [];
  let tree: Element;
  const jsx = (type: unknown, props: Element['props']) => ({ type, props });
  const dependencies: Record<string, unknown> = {
    react: {
      useState(initial: unknown) {
        hooks.push('state');
        const index = stateIndex++;
        if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
        return [state[index], (update: unknown) => {
          const next = typeof update === 'function' ? update(state[index]) : update;
          if (!Object.is(next, state[index])) { state[index] = next; dirty = true; }
        }];
      },
      useMemo: (run: () => unknown) => { hooks.push('memo'); return run(); },
      useEffect(run: () => void | (() => void), deps: unknown[]) {
        hooks.push('effect');
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
    '../lib/sip.ts': sip,
    '../lib/plan-comparison.ts': planComparison,
    '../lib/selected-peers.ts': selectedPeers,
    '../lib/return-correlation.ts': returnCorrelation,
    '../lib/api.ts': { searchSchemes: async () => [] },
    '../lib/catalog.ts': { STARTER_FUNDS: [] },
    './Chart.tsx': { Chart: chartType, CHART_COLORS: ['one', 'two'] },
    './DrawdownEpisodes.tsx': { DrawdownEpisodes: episodesType },
    './FundNotes.tsx': { FundNotes: () => null },
    './SipSimulator.tsx': { SipSimulator: sipType },
    './AnalysisRangePicker.tsx': { RangePicker: pickerType, RangeNotice: noticeType },
    './FundDetail.tsx': { RangePicker: pickerType },
  };
  // Keep the real nested components: their export handlers must receive the
  // provenance supplied by Comparison, not separately assembled test props.
  const nested: Record<string, (props: any) => Element> = {};
  for (const child of ['PlanComparison', 'SelectedPeers', 'ReturnCorrelation']) {
    const source = readFileSync(new URL(`../src/components/${child}.tsx`, import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
    }}).outputText;
    const exported: Record<string, (props: any) => Element> = {};
    new Function('require', 'exports', compiled)((dependency: string) => {
      assert.ok(dependency in dependencies, `Unexpected ${child} dependency: ${dependency}`);
      return dependencies[dependency];
    }, exported);
    dependencies[`./${child}.tsx`] = exported;
    nested[child] = exported[child];
  }
  const exports: Record<string, (props: unknown) => Element> = {};
  new Function('require', 'exports', compiled)((dependency: string) => {
    assert.ok(dependency in dependencies, `Unexpected ${name} dependency: ${dependency}`);
    return dependencies[dependency];
  }, exports);
  let props = {
    fund: boiFixture(), code: 133867, tab: 'overview', watchlist: [], compared: [],
    setTab() {}, back() {}, toggleWatch() {}, toggleCompare() {}, refresh() {}, refreshing: false,
    riskFreeRate: .06, setRiskFreeRate() {}, openMethod() {},
    schemes: BOI_CASES.map(spec=>boiFixture(spec).meta), funds: Object.fromEntries(BOI_CASES.map(spec=>[spec.code,boiFixture(spec)])),
    errors: {}, ensureFund: async () => {}, browse() {}, openFund() {}, ...overrides,
  };
  function render() {
    let attempts = 0;
    do {
      assert.ok(attempts++ < 10, 'Page state must settle.');
      dirty = false; stateIndex = 0; effectIndex = 0;
      hooks = [];
      tree = exports[name](props);
      if (previousHooks) assert.deepEqual(hooks, previousHooks, 'Hook order must survive asynchronous fund loading.');
      previousHooks = [...hooks];
      const work = pending; pending = []; work.forEach(run => run());
    } while (dirty);
  }
  const find = (predicate: (node: Element) => boolean) => nodes(tree).find(predicate);
  render();
  return {
    downloads,
    nestedExport(child: string, label: string) {
      const component = nested[child];
      const node = find(node => node.type === component);
      assert.ok(node, `${child} must be rendered by Comparison.`);
      const childTree = component(node.props);
      const button = nodes(childTree).find(node => node.type === 'button' && node.props['aria-label'] === label);
      assert.ok(button && !button.props.disabled, `Nested export must be available: ${label}`);
      const count = downloads.length;
      button.props.onClick();
      assert.equal(downloads.length, count + 1);
      return downloads.at(-1)!;
    },
    find,
    content: () => text(tree),
    links: () => nodes(tree).filter(node=>node.type==='a').map(node=>node.props.href),
    click(label: string) { const button=find(node=>node.type==='button'&&text(node)===label); assert.ok(button); button.props.onClick(); render(); },
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


function comparisonPage(funds: FundData[]) {
  return view('Comparison', { schemes: funds.map(f => f.meta), funds: Object.fromEntries(funds.map(f => [f.meta.schemeCode, f])) });
}
function assertReviewRows(rows: unknown[][], funds: FundData[]) {
  for (const fund of funds) {
    const review = format.financialNavBasis(fund).review;
    assert.ok(review);
    const basis = rows.find(row => row[0] === 'NAV calculation basis' && String(row[1]).includes(`Scheme ${review.schemeCode}:`));
    assert.ok(basis, `Export must identify the review for scheme ${review.schemeCode}.`);
    assert.match(String(basis[1]), /reviewed calculation NAV/i);
    assert.ok(String(basis[1]).includes(format.navReviewSummary(review)));
    for (const event of review.events) assert.ok(rows.some(row => row[0] === 'Economic event evidence' && String(row[1]).includes(`Scheme ${review.schemeCode}, ${event.date}: ${event.evidenceUrl}`)));
  }
  assert.match(String(rows.find(row => row[0] === 'Source' || row[0] === 'Data source')?.[1]), /reviewed calculation NAV.*issuer/i);
}

test('nested plan CSV carries both review chains and labels its actual corrected NAV columns', () => {
  const funds = BOI_CASES.map(spec => boiFixture(spec));
  const raw = structuredClone(funds);
  const page = comparisonPage(funds); page.range('MAX');
  const csv = page.nestedExport('PlanComparison', 'Export Direct Regular plan comparison as CSV');
  assertReviewRows(csv.rows, funds);
  const header = csv.rows.find(row => row[0] === 'Date')!;
  assert.equal(header[1], 'Direct reviewed calculation NAV');
  assert.equal(header[2], 'Regular reviewed calculation NAV');
  const corrected = csv.rows.find(row => row[0] === '2022-03-31')!;
  assert.equal(corrected[1], 10.4219); assert.equal(corrected[2], 10.2756);
  const dated = csv.rows.filter(row => /^\d{4}-/.test(String(row[0])));
  assert.ok(Math.abs(Number(dated[1][2]) / Number(dated[0][2]) - 1 - BOI_CASES[0].loss) < 1e-12);
  assert.ok(Math.abs(Number(dated[4][2]) / Number(dated[3][2]) - 1 - BOI_CASES[0].recovery) < 1e-12);
  assert.deepEqual(funds, raw); page.unmount();
});

test('nested selected-peer CSV uses corrected returns and identifies the reviewed scheme in a mixed cohort', () => {
  const reviewed = boiFixture();
  const peer = boiFixture(); peer.meta = { ...peer.meta, schemeCode: 900001, schemeName: 'Example Credit Fund - Regular Plan - Growth' };
  peer.warnings = []; peer.points = peer.points.map((point, i) => ({ ...point, nav: 20 + i }));
  const page = comparisonPage([reviewed, peer]); page.range({ start: '2022-03-30', end: '2022-03-31' });
  const csv = page.nestedExport('SelectedPeers', 'Export selected peer statistics as CSV');
  assertReviewRows(csv.rows, [reviewed]);
  assert.equal(csv.rows.filter(row => row[0] === 'NAV calculation basis').length, 1);
  const row = csv.rows.find(row => row[0] === 133867)!;
  assert.ok(Math.abs(Number(row[2]) - BOI_CASES[0].recovery) < 1e-12);
  page.unmount();
});

test('nested correlation CSV retains review provenance even when the sample cannot support correlation', () => {
  const funds = BOI_CASES.map(spec => boiFixture(spec));
  const page = comparisonPage(funds); page.range('MAX');
  const csv = page.nestedExport('ReturnCorrelation', 'Export monthly return correlation as CSV');
  assertReviewRows(csv.rows, funds);
  const pair = csv.rows.find(row => row[0] === 133867 && row[2] === 133868)!;
  assert.equal(pair[4], null); assert.ok(pair[8], 'Unavailable estimates keep their reason.');
  page.range({ start: '2022-04-01', end: '2022-04-04' });
  assertReviewRows(page.nestedExport('ReturnCorrelation', 'Export monthly return correlation as CSV').rows, funds);
  page.unmount();
});

test('nested exports preserve source-only ABSL evidence', () => {
  const funds = ABSL_CASES.map(spec => abslFixture(spec));
  const page = comparisonPage(funds); page.range('MAX');
  for (const [child, label] of [['PlanComparison', 'Export Direct Regular plan comparison as CSV'], ['ReturnCorrelation', 'Export monthly return correlation as CSV']]) {
    const csv = page.nestedExport(child, label);
    assertReviewRows(csv.rows, funds);
    assert.equal(csv.rows.some(row => row[0] === 'Economic event evidence'), false);
    assert.doesNotMatch(csv.rows.flat().join(' '), /recovery|markdown|consolidation|split/i);
  }
  page.unmount();
});

test('nested plan and correlation CSV preserve already-correct BOI source wording', () => {
  const funds = BOI_CASES.map(spec => boiFixture(spec));
  funds[0].points[4].nav = BOI_CASES[0].verified;
  const page = comparisonPage(funds); page.range('MAX');
  for (const [child, label] of [['PlanComparison', 'Export Direct Regular plan comparison as CSV'], ['ReturnCorrelation', 'Export monthly return correlation as CSV']]) {
    const csv = page.nestedExport(child, label);
    assertReviewRows(csv.rows, funds);
    assert.match(String(csv.rows.find(row => row[0] === 'NAV calculation basis' && String(row[1]).includes('Scheme 133867:'))?.[1]), /already matches issuer-verified/);
  }
  page.unmount();
});
