import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import { mergeHistory, validateHistory } from '../server/validation.ts';
import type { HistoryDocument } from '../server/types.ts';
import { validateHistoryShard } from '../scripts/archive-model.ts';
import { validateFundResponse } from '../src/lib/api.ts';
import * as analytics from '../src/lib/analytics.ts';
import * as chartData from '../src/lib/chart-data.ts';
import { financialNavBasis } from '../src/lib/corporate-actions.ts';
import * as format from '../src/lib/format.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import { mergeCachedFund, validateCachedFund } from '../src/lib/storage.ts';
import type { FundData, FundMeta, NavPoint } from '../src/lib/types.ts';
import { navReviewSummary, reviewedNavBasis } from '../src/lib/verified-nav-reviews.ts';
import { REVIEW_CASES, deepFreeze, invalidWarning, rawPayload, reviewFixture } from './fixtures/taurus-dsp-nav-review.ts';
import type { ReviewCase } from './fixtures/taurus-dsp-nav-review.ts';

const BEFORE = '2026-10-28T12:00:00.000Z';
const NOW = '2026-10-29T12:00:00.000Z';
const AFTER = '2026-10-29T13:00:00.000Z';
const mutable = (spec: ReviewCase) => structuredClone(reviewFixture(spec));
const providerDate = (date: string) => date.split('-').reverse().join('-');
const nextDate = (date: string) => new Date(Date.parse(date) + 86400000).toISOString().slice(0, 10);

function blocked(fund: FundData, reason: string) {
  const original = structuredClone(fund);
  deepFreeze(fund);
  assert.equal(reviewedNavBasis(fund), null, reason);
  const basis = financialNavBasis(fund);
  assert.equal(basis.fund, fund, reason);
  assert.equal(basis.review, undefined, reason);
  assert.equal(basis.adjusted, false, reason);
  assert.deepEqual(fund, original, `${reason}: the input must remain untouched`);
}

function fixedZeros(spec: ReviewCase, mask = (1 << spec.additions.length) - 1) {
  const payload = rawPayload(spec);
  spec.additions.forEach((point, index) => {
    if (mask & (1 << index)) payload.data.find(row => row.date === providerDate(point.date))!.nav = point.nav.toFixed(5);
  });
  return payload;
}

function archiveResponse(doc: HistoryDocument) {
  return { ...doc.payload, _fundscope: { fetchedAt: doc.fetchedAt, archivedAt: doc.archivedAt,
    fromArchive: true, stale: doc.unresolved, coverageStart: doc.coverageStart, coverageEnd: doc.coverageEnd,
    observationCount: doc.payload.data.length, warnings: doc.warnings,
    ...(doc.rejectedZeroNavDates ? { rejectedZeroNavDates: doc.rejectedZeroNavDates } : {}) } };
}

function hydrateArchive(doc: HistoryDocument): FundData {
  const bucket = String(Math.floor(doc.schemeCode / 32));
  const validated = validateHistoryShard(deepFreeze({ version: 2, bucket, records: [doc] }), bucket).records[0];
  return validateCachedFund(JSON.parse(JSON.stringify(validateFundResponse(archiveResponse(validated), doc.schemeCode))));
}

for (const spec of REVIEW_CASES) {
  test(`${spec.code} restores only the exact issuer-reviewed interior NAVs in a calculation copy`, () => {
    const raw = reviewFixture(spec), original = structuredClone(raw);
    const result = reviewedNavBasis(raw);
    assert.ok(result, 'The independently evidenced exact plan and complete rejected-zero set should be reviewed.');
    assert.equal(result.review.restoration?.addedObservations, spec.additions.length);
    assert.equal(result.fund.points.length, raw.points.length + spec.additions.length);
    assert.equal(qualityBlocked(raw), true);
    assert.equal(qualityBlocked(result.fund), false);
    assert.deepEqual(result.review.events, [], 'A source correction must not invent a corporate action.');
    assert.equal(result.review.schemeCode, spec.code);
    assert.equal(result.review.restoration?.fromDate, spec.additions[0].date);
    assert.equal(result.review.restoration?.throughDate, spec.additions.at(-1)!.date);
    for (const point of spec.additions) {
      assert.deepEqual(result.fund.points.find(row => row.date === point.date), point);
      assert.equal(raw.points.some(row => row.date === point.date), false);
    }
    for (const point of raw.points) {
      assert.equal(result.fund.points.find(row => row.date === point.date)?.nav,
        point.date === spec.correction?.date ? spec.correction.verifiedNav : point.nav);
    }
    if (spec.correction) {
      const correction = result.review.restoration?.corrections?.[0];
      assert.equal(correction?.date, spec.correction.date);
      assert.equal(correction?.sourceNav, spec.correction.sourceNav);
      assert.equal(correction?.verifiedNav, spec.correction.verifiedNav);
      assert.equal(correction?.applied, true);
    }
    assert.equal(new Set(result.fund.points.map(row => row.date)).size, result.fund.points.length);
    assert.deepEqual(result.fund.points.map(row => row.date), result.fund.points.map(row => row.date).sort());
    for (let index = 1; index < result.fund.points.length; index += 1) {
      const ratio = result.fund.points[index].nav / result.fund.points[index - 1].nav;
      assert.ok(ratio >= .6 && ratio <= 1.4, 'The repaired calculation series has no remaining independent large move.');
    }
    assert.match(navReviewSummary(result.review), /Raw source observations and warnings remain unchanged/);
    assert.equal(financialNavBasis(raw).adjusted, false);
    assert.deepEqual(raw, original, 'Raw NAVs, rejected evidence, warnings and identity must remain unchanged.');
    assert.equal(reviewedNavBasis(result.fund), null, 'A calculation basis must not apply its review twice.');
  });

  test(`${spec.code} requires every exact identity field and the original source`, () => {
    const changes: Partial<FundMeta>[] = [
      { schemeCode: 999999 }, { schemeName: spec.meta.scheme_name.replace('Regular', 'Direct') },
      { fundHouse: 'Other Mutual Fund' }, { schemeType: 'Closed Ended Schemes' },
      { schemeCategory: 'Other' }, { isinGrowth: null }, { isinGrowth: 'INF000000001' },
      { isinGrowth: undefined },
      { isinDivReinvestment: 'INF000000002' }, { isinDivReinvestment: undefined },
    ];
    for (const change of changes) {
      const fund = mutable(spec); Object.assign(fund.meta, change);
      blocked(fund, `different exact identity ${JSON.stringify(change)}`);
    }
    const source = mutable(spec); source.source = 'issuer.example' as FundData['source'];
    blocked(source, 'different source');
  });

  test(`${spec.code} requires the complete exact dated-zero evidence and one exact invalid count`, () => {
    const dates = spec.additions.map(point => point.date);
    const changedDate = spec.code === 105989 ? '2007-06-29' : '2006-11-09';
    const differentDates = [changedDate, ...dates.slice(1)].sort();
    const rejectedSets: (string[] | undefined)[] = [undefined, [], differentDates,
      [...dates, dates[0]].sort(), ['2007-02-30', ...dates.slice(1)].sort()];
    if (dates.length > 1) rejectedSets.push([...dates].reverse());
    for (const evidence of rejectedSets) {
      const fund = mutable(spec); fund.rejectedZeroNavDates = evidence;
      blocked(fund, `unverified rejected dates ${JSON.stringify(evidence)}`);
    }
    const expected = invalidWarning(dates.length);
    for (const warnings of [[], [invalidWarning(dates.length + 1)], [expected, expected],
      [expected, invalidWarning(dates.length + 1)],
      [expected, 'Conflicting NAV values occur on 1 duplicate date(s); analytics are blocked.'],
      [expected, 'Unresolved discontinuity: independent source evidence remains.']]) {
      const fund = mutable(spec); fund.warnings = warnings;
      blocked(fund, `unresolved warnings ${JSON.stringify(warnings)}`);
    }
    for (const target of spec.additions) {
      for (const nav of [target.nav, target.nav + .0001]) {
        const fund = mutable(spec);
        fund.points.push({ date: target.date, nav }); fund.points.sort((a, b) => a.date.localeCompare(b.date));
        blocked(fund, `a claimed rejected date already has a positive NAV: ${target.date}`);
      }
    }
  });

  test(`${spec.code} raw API validation does not turn negatives, duplicates or a same-count date swap into proof`, () => {
    const sameCount = rawPayload(spec);
    sameCount.data.find(row => row.date === providerDate(spec.additions[0].date))!.date =
      spec.code === 105989 ? '29-06-2007' : '09-11-2006';
    const changed = validateFundResponse(deepFreeze(sameCount), spec.code);
    assert.equal(changed.rejectedZeroNavDates?.length, spec.additions.length);
    assert.deepEqual(changed.warnings, [invalidWarning(spec.additions.length)]);
    blocked(changed, 'same invalid count with a different dated zero');

    const negative = rawPayload(spec);
    negative.data.find(row => row.date === providerDate(spec.additions[0].date))!.nav = '-1.00000';
    const unknown = validateFundResponse(deepFreeze(negative), spec.code);
    assert.equal(unknown.rejectedZeroNavDates, undefined);
    blocked(unknown, 'one rejected observation is negative, not a syntactically valid zero');

    const duplicate = rawPayload(spec);
    duplicate.data.push({ date: providerDate(spec.additions[0].date), nav: '0.00000' });
    const repeated = validateFundResponse(deepFreeze(duplicate), spec.code);
    assert.equal(repeated.rejectedZeroNavDates, undefined);
    blocked(repeated, 'the same rejected date occurs twice');

    const conflicting = rawPayload(spec);
    conflicting.data.push({ date: providerDate(spec.zeroWindow[0].date), nav: (spec.zeroWindow[0].nav + .001).toFixed(5) });
    const conflict = validateFundResponse(deepFreeze(conflicting), spec.code);
    assert.equal(conflict.rejectedZeroNavDates, undefined);
    blocked(conflict, 'a conflicting positive duplicate cannot be hidden behind the known zero count');
  });

  test(`${spec.code} matches the entire zero window, including every positive anchor`, () => {
    for (const anchor of spec.zeroWindow) {
      const changed = mutable(spec); changed.points.find(row => row.date === anchor.date)!.nav += .00001;
      blocked(changed, `changed zero-window anchor ${anchor.date}`);
      const missing = mutable(spec); missing.points = missing.points.filter(row => row.date !== anchor.date);
      blocked(missing, `missing zero-window anchor ${anchor.date}`);
    }
    const extra = mutable(spec);
    extra.points.push({ date: spec.code === 105989 ? '2007-06-22' : '2006-11-11', nav: spec.zeroWindow[0].nav });
    extra.points.sort((a, b) => a.date.localeCompare(b.date));
    blocked(extra, 'an extra positive inside the closed window is a changed input');
  });

  test(`${spec.code} checks the whole series while preserving unrelated valid observations and informational warnings`, () => {
    const last = reviewFixture(spec).points.at(-1)!;
    for (const nav of [0, -1, NaN, Infinity, last.nav * 2, last.nav * .5]) {
      const fund = mutable(spec); fund.points.push({ date: nextDate(last.date), nav });
      blocked(fund, `independent invalid NAV or large move outside the guarded windows: ${nav}`);
    }
    const reversed = mutable(spec); reversed.points.reverse(); blocked(reversed, 'unsorted observations');
    const duplicate = mutable(spec); duplicate.points.push({ ...last }); blocked(duplicate, 'duplicate date');
    const impossible = mutable(spec); impossible.points.push({ date: '2009-02-30', nav: last.nav });
    blocked(impossible, 'impossible calendar date');

    const fund = mutable(spec);
    const appended = { date: nextDate(last.date), nav: last.nav * 1.001 };
    fund.points.push(appended); fund.warnings.push('Using saved data after a connection failure.');
    const original = structuredClone(fund), basis = financialNavBasis(deepFreeze(fund));
    assert.ok(basis.review);
    assert.deepEqual(basis.fund.points.at(-1), appended);
    assert.ok(basis.fund.warnings.includes('Using saved data after a connection failure.'));
    assert.deepEqual(fund, original);
  });

  test(`${spec.code} production archive validation and cache hydration preserve proof without clearing raw quality`, () => {
    const payload = deepFreeze(rawPayload(spec)), parsed = validateHistory(payload, spec.code);
    const doc = mergeHistory(parsed, null, BEFORE, NOW);
    const original = structuredClone(doc), hydrated = hydrateArchive(doc);
    assert.equal(doc.unresolved, true);
    assert.deepEqual(doc.warnings, [invalidWarning(spec.additions.length)]);
    assert.equal(doc.payload.data.length, reviewFixture(spec).points.length);
    assert.deepEqual(hydrated.rejectedZeroNavDates, spec.additions.map(point => point.date));
    assert.equal(qualityBlocked(hydrated), true);
    const result = financialNavBasis(deepFreeze(hydrated));
    assert.ok(result.review);
    assert.equal(qualityBlocked(result.fund), false);
    assert.deepEqual(doc, original, 'Calculation repair must not rewrite the archived document or its unresolved flag.');

    const legacy = structuredClone(doc); delete legacy.rejectedZeroNavDates;
    const unknown = hydrateArchive(legacy);
    assert.equal(unknown.rejectedZeroNavDates, undefined);
    blocked(unknown, 'a legacy archived invalid count does not establish the original rejected dates');
  });

  test(`${spec.code} only a complete unchanged current response can establish proof over a legacy archive`, () => {
    const parsed = validateHistory(rawPayload(spec), spec.code);
    const previous = mergeHistory(parsed, null, BEFORE, NOW); delete previous.rejectedZeroNavDates;
    const original = structuredClone(previous);
    const complete = mergeHistory(parsed, deepFreeze(previous), AFTER, AFTER);
    assert.deepEqual(complete.payload.data, previous.payload.data);
    assert.equal(complete.fetchedAt, previous.fetchedAt, 'The prior successful fetch time remains unchanged.');
    assert.equal(complete.unresolved, true);
    assert.ok(financialNavBasis(hydrateArchive(complete)).review);
    assert.deepEqual(previous, original);

    const changedDate = rawPayload(spec);
    changedDate.data.find(row => row.date === providerDate(spec.additions[0].date))!.date =
      spec.code === 105989 ? '29-06-2007' : '09-11-2006';
    const swapped = mergeHistory(validateHistory(changedDate, spec.code), complete, AFTER, AFTER);
    assert.equal(swapped.rejectedZeroNavDates?.length, spec.additions.length);
    blocked(hydrateArchive(swapped), 'a newer same-count different-date response must replace, not inherit, prior proof');

    for (const change of ['omission', 'revision', 'identity'] as const) {
      const payload = rawPayload(spec);
      if (change === 'omission') payload.data = payload.data.filter(row => row.date !== providerDate(spec.zeroWindow[1].date));
      if (change === 'revision') payload.data.find(row => row.date === providerDate(spec.zeroWindow[1].date))!.nav = (spec.zeroWindow[1].nav + .001).toFixed(5);
      if (change === 'identity') payload.meta.scheme_name += ' renamed';
      const merged = mergeHistory(validateHistory(payload, spec.code), complete, AFTER, AFTER);
      assert.equal(merged.rejectedZeroNavDates, undefined, change);
      blocked(hydrateArchive(merged), `archive union or identity change cannot reuse proof: ${change}`);
    }
  });

  test(`${spec.code} browser cache merging keeps current exact proof separate from retained positive history`, () => {
    const previous = mutable(spec); delete previous.rejectedZeroNavDates;
    previous.fetchedAt = BEFORE; previous.sourceObservedAt = BEFORE;
    const legacy = validateCachedFund(deepFreeze(previous));
    const incoming = mutable(spec); incoming.fetchedAt = NOW; incoming.sourceObservedAt = NOW;
    const merged = mergeCachedFund(deepFreeze(incoming), deepFreeze(legacy));
    assert.equal(merged.fetchedAt, BEFORE);
    assert.deepEqual(merged.points, legacy.points);
    assert.deepEqual(merged.rejectedZeroNavDates, spec.additions.map(point => point.date));
    assert.equal(qualityBlocked(merged), true);
    assert.ok(financialNavBasis(validateCachedFund(merged)).review);

    const changed = mutable(spec); changed.fetchedAt = AFTER; changed.sourceObservedAt = AFTER;
    changed.points[1].nav += .001;
    const retained = mergeCachedFund(deepFreeze(changed), deepFreeze(merged));
    assert.deepEqual(retained.points, merged.points, 'Raw quality merge still prefers the saved positive values.');
    assert.equal(retained.rejectedZeroNavDates, undefined, 'Saved anchors must not hide a changed current source response.');
    blocked(validateCachedFund(retained), 'positive conflicts cannot inherit old proof');
  });

  if (spec.correction) {
    test(`${spec.code} requires every correction-window row and rejects an unknown positive revision`, () => {
      for (const anchor of spec.correction!.window) {
        const changed = mutable(spec); changed.points.find(row => row.date === anchor.date)!.nav += .00001;
        blocked(changed, `changed correction-window NAV ${anchor.date}`);
        const missing = mutable(spec); missing.points = missing.points.filter(row => row.date !== anchor.date);
        blocked(missing, `missing correction-window row ${anchor.date}`);
      }
      const extra = mutable(spec);
      extra.points.push({ date: nextDate(spec.correction!.window[0].date), nav: spec.correction!.window[0].nav });
      extra.points.sort((a, b) => a.date.localeCompare(b.date));
      blocked(extra, 'an issuer-only weekend date may not enter the reviewed positive window silently');

      const corrected = mutable(spec);
      corrected.points.find(row => row.date === spec.correction!.date)!.nav = spec.correction!.verifiedNav;
      const result = financialNavBasis(deepFreeze(corrected));
      assert.ok(result.review?.restoration);
      assert.equal(result.review.restoration.addedObservations, 3);
      assert.equal(result.review.restoration.corrections?.[0].applied, false);
      assert.match(navReviewSummary(result.review), /already matches issuer-verified/);
      assert.equal(result.fund.points.find(row => row.date === spec.correction!.date)?.nav, spec.correction!.verifiedNav);
    });

    test(`${spec.code} every proper subset of provider-fixed zero rows remains unresolved`, () => {
      for (let mask = 1; mask < 7; mask += 1) {
        const payload = fixedZeros(spec, mask), fund = validateFundResponse(deepFreeze(payload), spec.code);
        const fixed = spec.additions.filter((_, index) => mask & (1 << index));
        assert.equal(fund.rejectedZeroNavDates?.length, 3 - fixed.length);
        assert.equal(qualityBlocked(fund), true);
        blocked(fund, `partial source zero repair mask ${mask}`);
      }
    });

    test(`${spec.code} positive-only correction requires all former zero dates at the exact issuer NAVs`, () => {
      const clean = validateFundResponse(deepFreeze(fixedZeros(spec)), spec.code);
      assert.deepEqual(clean.warnings, []); assert.equal(clean.rejectedZeroNavDates, undefined);
      const original = structuredClone(clean), result = financialNavBasis(deepFreeze(clean));
      assert.equal(result.review?.correction?.applied, true);
      assert.equal(result.review?.correction?.verifiedNav, spec.correction!.verifiedNav);
      assert.equal(result.review?.restoration, undefined);
      assert.equal(result.fund.points.length, clean.points.length);
      assert.deepEqual(clean, original);
      assert.equal(reviewedNavBasis(result.fund), null);

      for (let mask = 0; mask < 7; mask += 1) {
        const payload = fixedZeros(spec);
        const omitted = spec.additions.filter((_, index) => !(mask & (1 << index))).map(point => providerDate(point.date));
        payload.data = payload.data.filter(row => !omitted.includes(row.date));
        const fund = validateFundResponse(payload, spec.code);
        assert.equal(fund.rejectedZeroNavDates, undefined); assert.deepEqual(fund.warnings, []);
        blocked(fund, `clean projection silently omits former rejected date(s), mask ${mask}`);
      }
      for (const target of spec.additions) {
        const payload = fixedZeros(spec); payload.data.find(row => row.date === providerDate(target.date))!.nav = (target.nav + .0001).toFixed(5);
        blocked(validateFundResponse(payload, spec.code), `provider-fixed zero has an unverified NAV ${target.date}`);
      }
      for (const anchor of [...spec.zeroWindow, ...spec.correction!.window]) {
        const changed = structuredClone(clean); changed.points.find(row => row.date === anchor.date)!.nav += .00001;
        blocked(changed, `positive-only branch still requires exact anchor ${anchor.date}`);
        const missing = structuredClone(clean); missing.points = missing.points.filter(row => row.date !== anchor.date);
        blocked(missing, `positive-only branch still requires complete window row ${anchor.date}`);
      }
      const residual = structuredClone(clean); residual.rejectedZeroNavDates = spec.additions.map(point => point.date);
      blocked(residual, 'residual rejection evidence is inconsistent with the claimed clean positive-only basis');
      const quality = structuredClone(clean); quality.warnings.push('Conflicting NAV values occur on 1 duplicate date(s); analytics are blocked.');
      blocked(quality, 'positive-only correction cannot suppress separate quality evidence');
      const fullyCorrected = fixedZeros(spec);
      fullyCorrected.data.find(row => row.date === providerDate(spec.correction!.date))!.nav = spec.correction!.verifiedNav.toFixed(5);
      blocked(validateFundResponse(fullyCorrected, spec.code), 'already fully corrected input requires no review or second correction');
    });
  } else {
    test(`${spec.code} an already repaired source requires no synthetic second restoration`, () => {
      const fund = validateFundResponse(deepFreeze(fixedZeros(spec)), spec.code);
      assert.deepEqual(fund.warnings, []); assert.equal(fund.rejectedZeroNavDates, undefined);
      blocked(fund, 'the DSP zero date is already an ordinary positive source observation');
    });
  }
}

test('Taurus 101209 remains outside the review while its primary same-date conflict is unresolved', () => {
  const fund = validateFundResponse(deepFreeze({ status: 'SUCCESS', meta: {
    scheme_code: 101209, scheme_name: 'Taurus Large Cap Fund - Regular Plan - Growth',
    fund_house: 'Taurus Mutual Fund', scheme_type: 'Open Ended Schemes',
    scheme_category: 'Equity Scheme - Large Cap Fund', isin_growth: 'INF044D01773', isin_div_reinvestment: null,
  }, data: [
    { date: '20-11-2006', nav: '33.87000' }, { date: '19-11-2006', nav: '34.25000' },
    { date: '18-11-2006', nav: '0.00000' }, { date: '17-11-2006', nav: '34.25000' },
    { date: '16-11-2006', nav: '34.71000' }, { date: '15-11-2006', nav: '34.75000' },
    { date: '14-11-2006', nav: '34.82000' }, { date: '13-11-2006', nav: '35.09000' },
    { date: '12-11-2006', nav: '0.00000' }, { date: '11-11-2006', nav: '0.00000' },
    { date: '10-11-2006', nav: '34.68000' },
  ] }), 101209);
  assert.deepEqual(fund.rejectedZeroNavDates, ['2006-11-11', '2006-11-12', '2006-11-18']);
  blocked(fund, 'Taurus 101209 was explicitly excluded from the evidence-supported candidates');
});

type Element = { type: unknown; props: { children?: unknown; [key: string]: any } };
const chartType = Symbol('Chart'), rangeType = Symbol('RangePicker'), sipType = Symbol('SipSimulator');
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

// Run the real FundDetail transforms and event handlers. Only React mounting,
// chart rendering and separately tested child widgets are replaced.
function buildFundView(fund: FundData) {
  const source = readFileSync(new URL('../src/components/FundDetail.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const state: unknown[] = [], downloads: { rows: unknown[][]; filename: string }[] = [];
  let stateIndex = 0, tree: Element;
  const jsx = (type: unknown, props: Element['props']) => ({ type, props });
  const dependencies: Record<string, unknown> = {
    react: {
      useState(initial: unknown) {
        const index = stateIndex++;
        if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
        return [state[index], (value: unknown) => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
      },
      useMemo: (run: () => unknown) => run(),
    },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: Symbol('Fragment') },
    'lucide-react': {},
    '../lib/analytics.ts': analytics,
    '../lib/format.ts': { ...format, downloadCsv: (rows: unknown[][], filename: string) => downloads.push({ rows, filename }) },
    '../lib/chart-data.ts': chartData,
    './Chart.tsx': { Chart: chartType },
    './DrawdownEpisodes.tsx': { DrawdownEpisodes: Symbol('DrawdownEpisodes') },
    './AnalysisRangePicker.tsx': { RangePicker: rangeType, RangeNotice: Symbol('RangeNotice') },
    './FundNotes.tsx': { FundNotes: Symbol('FundNotes') },
    './SipSimulator.tsx': { SipSimulator: sipType },
  };
  const exported: Record<string, (props: unknown) => Element> = {};
  new Function('require', 'exports', compiled)((dependency: string) => {
    assert.ok(dependency in dependencies, `Unexpected FundDetail dependency: ${dependency}`);
    return dependencies[dependency];
  }, exported);
  const props = { fund, code: fund.meta.schemeCode, tab: 'overview', watchlist: [], compared: [],
    setTab() {}, back() {}, toggleWatch() {}, toggleCompare() {}, refresh() {}, refreshing: false,
    riskFreeRate: .06, setRiskFreeRate() {}, openMethod() {} };
  function render() { stateIndex = 0; tree = exported.FundDetail(props); }
  const find = (predicate: (node: Element) => boolean) => nodes(tree).find(predicate);
  render();
  find(node => node.type === rangeType)!.props.onChange('MAX'); render();
  return {
    find, content: () => text(tree),
    chart: () => find(node => node.type === chartType)?.props,
    changeTab(tab: string) { props.tab = tab; render(); },
    click(label: string) {
      const button = find(node => node.type === 'button' && text(node) === label);
      assert.ok(button && !button.props.disabled, `Button must be usable: ${label}`);
      button.props.onClick(); render();
    },
    exportRaw() {
      const button = find(node => node.type === 'button' && node.props['aria-label'] === 'Export selected NAV history as CSV');
      assert.ok(button && !button.props.disabled);
      const before = downloads.length; button.props.onClick(); assert.equal(downloads.length, before + 1);
      return downloads.at(-1)!;
    },
  };
}

for (const spec of REVIEW_CASES) {
  test(`${spec.code} real fund view uses reviewed calculations and preserves the raw NAV chart and CSV`, () => {
    const fund = reviewFixture(spec), original = structuredClone(fund), view = buildFundView(fund);
    const expected: NavPoint[] = [...fund.points.map(point => ({ ...point,
      nav: point.date === spec.correction?.date ? spec.correction.verifiedNav : point.nav })), ...spec.additions]
      .sort((a, b) => a.date.localeCompare(b.date));
    assert.match(view.content(), /reviewed calculation NAV/i);
    assert.match(view.content(), new RegExp(`Added ${spec.additions.length} issuer-verified NAV observations`));
    assert.doesNotMatch(view.content(), /Analytics are paused/);
    const wealth = view.chart()!.series[0].data as { date: string; value: number }[];
    assert.deepEqual(wealth.map(point => point.date), expected.map(point => point.date));
    expected.forEach((point, index) => assert.ok(Math.abs(wealth[index].value - point.nav / expected[0].nav * 10000) < 1e-9));
    const evidence = view.find(node => node.type === 'a' && text(node).includes('verified NAV evidence'))?.props.href;
    assert.ok(evidence);
    const url = new URL(evidence);
    assert.equal(url.origin, spec.code === 105989 ? 'https://www.dspim.com' : 'https://taurusmutualfund.com');
    assert.equal(url.pathname, spec.code === 105989 ? '/investor-centre/nav' : '/NAVs/NAV_search');

    view.click('NAV');
    assert.deepEqual(view.chart()!.series[0].data, fund.points.map(point => ({ date: point.date, value: point.nav })));
    const csv = view.exportRaw();
    assert.deepEqual(csv.rows.filter(row => /^\d{4}-\d{2}-\d{2}$/.test(String(row[0]))), fund.points.map(point => [point.date, point.nav]));
    assert.equal(csv.rows.find(row => row[0] === 'Basis')?.[1], 'Raw NAV; distributions are not included');
    assert.equal(csv.rows.some(row => row[0] === 'NAV calculation basis'), false, 'Raw CSV must not claim its NAVs were changed.');

    view.changeTab('returns');
    const sip = view.find(node => node.type === sipType)!;
    assert.deepEqual(sip.props.fund.points, expected);
    assert.equal(sip.props.navReview.schemeCode, spec.code);
    assert.deepEqual(fund, original);
  });

  test(`${spec.code} legacy count-only history keeps real calculated views paused while raw export remains available`, () => {
    const fund = mutable(spec); delete fund.rejectedZeroNavDates;
    const view = buildFundView(deepFreeze(fund));
    assert.match(view.content(), /Analytics are paused/);
    assert.doesNotMatch(view.content(), /reviewed calculation NAV/i);
    assert.equal(view.chart(), undefined);
    view.changeTab('monthly');
    assert.equal(view.find(node => node.props['aria-label'] === 'Export selected monthly returns as CSV')?.props.disabled, true);
    assert.deepEqual(view.exportRaw().rows.filter(row => /^\d{4}-\d{2}-\d{2}$/.test(String(row[0]))), fund.points.map(point => [point.date, point.nav]));
    view.changeTab('overview'); view.click('NAV');
    assert.equal(view.chart()!.series[0].data.length, fund.points.length);
  });
}
