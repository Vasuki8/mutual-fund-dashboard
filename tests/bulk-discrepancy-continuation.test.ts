import assert from 'node:assert/strict';
import test from 'node:test';
import { financialNavBasis } from '../src/lib/corporate-actions.ts';
import { absoluteReturn, isGrowthScheme } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import type { FundData, FundMeta } from '../src/lib/types.ts';

interface Fixture {
  meta: FundMeta; dates: string[]; navs: number[]; expectedNavs: number[];
  eventReturns: number[]; growthEligible: boolean;
  actions: { oldNavThrough: string; firstNewNavDate: string; factor: number;
    maxFactorDeviation: number; evidenceUrl: string }[];
}

// Literal checkpoint-213 observations. Decimal expectations were calculated
// independently from primary unit terms, before editing the production registry.
// Catches wrong unit factors, shifted boundaries, crossed plan identities and cleared source blockers.
// Full histories and exact hashes are reconciled in the continuation evidence ledger.
const FIXTURES: Fixture[] = [
  { meta: {"schemeCode":100814,"schemeName":"UTI - Overnight Fund - Regular Plan - Growth","fundHouse":"UTI Mutual Fund","isinGrowth":"INF789F01604","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Debt Scheme - Overnight Fund"},
    dates: ["2018-04-27", "2018-05-02", "2018-05-03", "2018-05-04"], navs: [24.3651, 24.3861, 2438.9897, 2439.3785],
    expectedNavs: [2436.51, 2438.61, 2438.9897, 2439.3785], eventReturns: [0.00015570345401683745],
    growthEligible: true, actions: [{"oldNavThrough":"2018-05-02","firstNewNavDate":"2018-05-03","factor":100,"maxFactorDeviation":0.5,"evidenceUrl":"https://doc.utimf.com/v1/AUTH_5b9dd00b-8132-4a21-a800-711111810cee/UTIContainer/09-18-19%20-%20%20Change%20in%20face%20value%20of%20units20180502-115257.pdf#page=1"}] },
  { meta: {"schemeCode":104728,"schemeName":"Invesco India Ultra Short to Short Term Fund - Regular Plan - Growth","fundHouse":"Invesco Mutual Fund","isinGrowth":"INF205K01HT0","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Income/Debt Oriented Schemes - Ultra Short to Short Term Fund"},
    dates: ["2011-02-24", "2011-02-25", "2011-02-28", "2011-03-01"], navs: [13.145, 13.1479, 1315.6252, 1315.9105],
    expectedNavs: [1314.5, 1314.79, 1315.6252, 1315.9105], eventReturns: [0.0006352345241445402],
    growthEligible: true, actions: [{"oldNavThrough":"2011-02-25","firstNewNavDate":"2011-02-28","factor":100,"maxFactorDeviation":0.5,"evidenceUrl":"https://invescomutualfund.com/docs/default-source/default-document-library/annual-report-fy-2016-2017.pdf?sfvrsn=0#page=92"}] },
  { meta: {"schemeCode":105189,"schemeName":"Invesco India Short Term Fund - Regular Plan - Growth","fundHouse":"Invesco Mutual Fund","isinGrowth":"INF205K01UR7","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Income/Debt Oriented Schemes - Short Term Fund"},
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"], navs: [15.9601, 15.9748, 1598.7371, 1599.3266],
    expectedNavs: [1596.01, 1597.48, 1598.7371, 1599.3266], eventReturns: [0.0007869269098830658],
    growthEligible: true, actions: [{"oldNavThrough":"2013-04-18","firstNewNavDate":"2013-04-22","factor":100,"maxFactorDeviation":0.5,"evidenceUrl":"https://invescomutualfund.com/docs/default-source/default-document-library/annual-report-fy-2016-2017.pdf?sfvrsn=0#page=92"}] },
  { meta: {"schemeCode":106212,"schemeName":"SBI Ultra Short to Short Term Fund - Regular Plan - Growth","fundHouse":"SBI Mutual Fund","isinGrowth":"INF200K01MO2","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Income/Debt Oriented Schemes - Ultra Short to Short Term Fund"},
    dates: ["2012-01-11", "2012-01-12", "2012-01-13", "2012-01-16"], navs: [13.5122, 13.5153, 1351.86, 1352.8601],
    expectedNavs: [1351.22, 1351.53, 1351.86, 1352.8601], eventReturns: [0.0002441677210272802],
    growthEligible: true, actions: [{"oldNavThrough":"2012-01-12","firstNewNavDate":"2012-01-13","factor":100,"maxFactorDeviation":0.1,"evidenceUrl":"https://www.sbimf.com/docs/default-source/scheme-portfolios/default-library/unaudited-half-yearly-results-%28as-on-march-31-2012%29.pdf?sfvrsn=24795812_0#page=9"}] },
  { meta: {"schemeCode":112120,"schemeName":"Invesco India Money Market Fund - Regular Plan - Growth","fundHouse":"Invesco Mutual Fund","isinGrowth":"INF205K01SG4","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Income/Debt Oriented Schemes - Money Market Fund"},
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"], navs: [13.0085, 13.0112, 1302.1266, 1302.4026],
    expectedNavs: [1300.85, 1301.12, 1302.1266, 1302.4026], eventReturns: [0.0007736411706837186],
    growthEligible: true, actions: [{"oldNavThrough":"2013-04-18","firstNewNavDate":"2013-04-22","factor":100,"maxFactorDeviation":0.5,"evidenceUrl":"https://invescomutualfund.com/docs/default-source/default-document-library/annual-report-fy-2016-2017.pdf?sfvrsn=0#page=100"}] },
  { meta: {"schemeCode":120785,"schemeName":"UTI - Overnight Fund - Direct Plan - Growth","fundHouse":"UTI Mutual Fund","isinGrowth":"INF789FB1S71","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Debt Scheme - Overnight Fund"},
    dates: ["2018-04-27", "2018-05-02", "2018-05-03", "2018-05-04"], navs: [24.5269, 24.5482, 2455.2041, 2455.5989],
    expectedNavs: [2452.69, 2454.82, 2455.2041, 2455.5989], eventReturns: [0.0001564676839849765],
    growthEligible: true, actions: [{"oldNavThrough":"2018-05-02","firstNewNavDate":"2018-05-03","factor":100,"maxFactorDeviation":0.5,"evidenceUrl":"https://doc.utimf.com/v1/AUTH_5b9dd00b-8132-4a21-a800-711111810cee/UTIContainer/09-18-19%20-%20%20Change%20in%20face%20value%20of%20units20180502-115257.pdf#page=1"}] },
  { meta: {"schemeCode":150455,"schemeName":"ICICI Prudential Nifty 200 Momentum 30 ETF","fundHouse":"ICICI Prudential Mutual Fund","isinGrowth":"INF109KC17C7","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2022-08-08", "2022-08-10", "2022-08-12", "2022-08-16"], navs: [185.47, 186.1575, 18.8604, 19.0774],
    expectedNavs: [18.547, 18.61575, 18.8604, 19.0774], eventReturns: [0.013142097417509368],
    growthEligible: false, actions: [{"oldNavThrough":"2022-08-10","firstNewNavDate":"2022-08-12","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://archives.nseindia.com/content/circulars/CML53266.pdf#page=1"}] },
];

function warning(n: number): string {
  return `Unresolved discontinuity: ${n} single-observation move(s) exceed 40%; derived analytics are blocked.`;
}
function fixture(spec: Fixture): FundData {
  return { meta: { ...spec.meta }, points: spec.dates.map((date, i) => ({ date, nav: spec.navs[i] })),
    fetchedAt: '2026-10-29T01:02:19.208Z', source: 'mfapi.in', fromCache: true,
    stale: false, warnings: [warning(spec.actions.length)] };
}
function close(actual: number | null, expected: number, tolerance = 1e-9): void {
  assert.notEqual(actual, null);
  assert.ok(Math.abs(actual! - expected) < tolerance, `${actual} should equal ${expected}`);
}
function unchanged(raw: FundData, reason: string): void {
  const original = structuredClone(raw), result = financialNavBasis(raw);
  assert.equal(result.adjusted, false, reason);
  assert.equal(result.fund, raw, reason);
  assert.equal(result.adjustment, undefined, reason);
  assert.equal(result.adjustments, undefined, reason);
  assert.deepEqual(raw, original, reason);
}
function shifted(date: string, days: number): string {
  return new Date(Date.parse(date + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10);
}

for (const spec of FIXTURES) {
  const code = spec.meta.schemeCode;
  test(`${code}: matches independent calculation NAVs, preserves raw evidence and reports every action`, () => {
    const raw = fixture(spec), original = structuredClone(raw);
    raw.points.forEach(Object.freeze); Object.freeze(raw.points); Object.freeze(raw.meta);
    Object.freeze(raw.warnings); Object.freeze(raw);
    const result = financialNavBasis(raw);
    assert.equal(result.adjusted, true);
    assert.notEqual(result.fund, raw);
    assert.notEqual(result.fund.points, raw.points);
    result.fund.points.forEach((p, i) => { assert.equal(p.date, spec.dates[i]); close(p.nav, spec.expectedNavs[i]); });
    assert.equal(result.fund.points.length, raw.points.length);
    const lastDate = spec.actions.at(-1)!.firstNewNavDate;
    assert.deepEqual(result.fund.points.filter(p => p.date >= lastDate), raw.points.filter(p => p.date >= lastDate));
    assert.deepEqual({ ...result.fund, points: raw.points, warnings: raw.warnings }, raw);
    assert.deepEqual(result.fund.warnings, []);
    assert.deepEqual(raw, original);
    const actions = result.adjustments ?? (result.adjustment ? [result.adjustment] : []);
    assert.equal(actions.length, spec.actions.length);
    for (let i = 0; i < actions.length; i++) {
      const a = actions[i], expected = spec.actions[i];
      assert.equal(a.schemeCode, code);
      assert.equal(a.factor, expected.factor);
      assert.equal(a.oldNavThrough, expected.oldNavThrough);
      assert.equal(a.firstNewNavDate, expected.firstNewNavDate);
      assert.equal(a.evidenceUrl, expected.evidenceUrl);
      assert.match(a.label, /^verified /);
      assert.equal('maxFactorDeviation' in a, false);
    }
    assert.equal(result.adjustment === undefined, actions.length > 1);
    assert.equal(result.adjustments === undefined, actions.length === 1);
  });

  test(`${code}: retains independently calculated nonzero investment returns at every unit change`, () => {
    const result = financialNavBasis(fixture(spec));
    assert.equal(result.adjusted, true);
    spec.actions.forEach((a, i) => {
      const eventIndex = spec.dates.indexOf(a.firstNewNavDate);
      close(absoluteReturn(result.fund.points.slice(eventIndex - 1, eventIndex + 1)), spec.eventReturns[i], 1e-12);
      assert.notEqual(spec.eventReturns[i], 0);
    });
  });

  test(`${code}: requires the exact code, untrimmed name, fund house and current ISIN`, () => {
    const changes: Partial<FundMeta>[] = [
      { schemeCode: 999999 }, { schemeName: spec.meta.schemeName + ' Extra' },
      { schemeName: ' ' + spec.meta.schemeName }, { schemeName: spec.meta.schemeName + ' IDCW' },
      { fundHouse: 'Another Mutual Fund' }, { isinGrowth: null }, { isinGrowth: undefined },
      { isinGrowth: 'INF000000000' },
    ];
    const sibling = FIXTURES.find(f => f.meta.schemeCode !== code && f.meta.schemeName === spec.meta.schemeName);
    if (sibling) changes.push({ schemeCode: sibling.meta.schemeCode }, { isinGrowth: sibling.meta.isinGrowth });
    const previouslyRegisteredSibling = ([
      [104728, 104726, 'INF205K01HY0'], [105189, 105185, 'INF205K01UN6'],
      [112120, 112123, 'INF205K01SD1'], [106212, 106217, 'INF200K01MG8'],
    ] as const).find(([candidate]) => candidate === code);
    if (previouslyRegisteredSibling) changes.push(
      { schemeCode: previouslyRegisteredSibling[1] }, { isinGrowth: previouslyRegisteredSibling[2] });
    for (const change of changes) {
      const raw = fixture(spec); Object.assign(raw.meta, change);
      unchanged(raw, 'identity mismatch: ' + JSON.stringify(change));
    }
  });

  test(`${code}: requires both exact observed boundary dates for every action`, () => {
    for (const a of spec.actions) {
      const previous = fixture(spec);
      previous.points = previous.points.map(p => p.date <= a.oldNavThrough ? { ...p, date: shifted(p.date, -1) } : p);
      unchanged(previous, 'wrong last old-basis date');
      const next = fixture(spec);
      next.points = next.points.map(p => p.date >= a.firstNewNavDate ? { ...p, date: shifted(p.date, 1) } : p);
      unchanged(next, 'wrong first new-basis date');
      for (const date of [a.oldNavThrough, a.firstNewNavDate]) {
        const raw = fixture(spec); raw.points = raw.points.filter(p => p.date !== date);
        unchanged(raw, 'missing exact boundary row');
      }
    }
  });

  test(`${code}: requires the exact generated warning count and retains independent quality blockers`, () => {
    const expected = warning(spec.actions.length);
    for (const warnings of [[], [warning(spec.actions.length + 1)], [expected, expected],
      [expected.replace('single-observation', 'single observation')],
      [expected, 'Invalid NAV observations were excluded (1).'],
      [expected, 'Conflicting NAV values were reported for 1 date(s).']]) {
      const raw = fixture(spec); raw.warnings = warnings;
      unchanged(raw, 'warning contract');
    }
    const raw = fixture(spec), coverage = 'History coverage has not been independently verified.';
    raw.warnings.push(coverage);
    const result = financialNavBasis(raw);
    assert.equal(result.adjusted, true);
    assert.deepEqual(result.fund.warnings, [coverage]);
    assert.deepEqual(raw.warnings, [expected, coverage]);
  });

  test(`${code}: enforces a bounded residual return without fitting the observed NAV ratio`, () => {
    for (const a of spec.actions) for (const sign of [-1, 1]) {
      const index = spec.dates.indexOf(a.firstNewNavDate);
      const outside = fixture(spec);
      outside.points[index].nav = outside.points[index - 1].nav * (a.factor + sign * a.maxFactorDeviation * 1.01);
      unchanged(outside, 'outside documented-factor bound');
      const inside = fixture(spec);
      inside.points[index].nav = inside.points[index - 1].nav * (a.factor + sign * a.maxFactorDeviation * .99);
      assert.equal(financialNavBasis(inside).adjusted, true, 'bounded market/interest residual remains valid');
    }
  });

  test(`${code}: refuses an additional unexplained jump, even with a rewritten count warning`, () => {
    for (const rewrite of [false, true]) {
      const raw = fixture(spec), first = raw.points[0];
      raw.points.unshift({ date: shifted(first.date, -1), nav: first.nav / 2 });
      if (rewrite) raw.warnings = [warning(spec.actions.length + 1)];
      unchanged(raw, 'an additional unresolved jump cannot be partly cleared');
    }
  });

  test(`${code}: refuses malformed, unordered, duplicate or too-short input`, () => {
    for (const nav of [0, -1, NaN, Infinity]) {
      const raw = fixture(spec); raw.points[0].nav = nav; unchanged(raw, 'invalid NAV');
    }
    for (const date of ['invalid', '2026-02-30', '2026-1-01']) {
      const raw = fixture(spec); raw.points[0].date = date; unchanged(raw, 'invalid date');
    }
    const reversed = fixture(spec); reversed.points.reverse(); unchanged(reversed, 'descending dates');
    const duplicate = fixture(spec); duplicate.points.splice(1, 0, { ...duplicate.points[0] }); unchanged(duplicate, 'duplicate date');
    const short = fixture(spec); short.points = short.points.slice(0, 2); unchanged(short, 'too few observations');
  });

  test(`${code}: keeps the Growth consumer gate and refuses repeated application`, () => {
    const result = financialNavBasis(fixture(spec)); assert.equal(result.adjusted, true);
    assert.equal(isGrowthScheme(result.fund.meta.schemeName) && !qualityBlocked(result.fund), spec.growthEligible);
    unchanged(result.fund, 'already adjusted calculation copy');
    const forced = structuredClone(result.fund); forced.warnings = [warning(spec.actions.length)];
    unchanged(forced, 'restoring the warning cannot reapply the factors');
  });
}

for (const spec of FIXTURES.filter(f => f.actions.length > 1)) {
  test(`${spec.meta.schemeCode}: rejects each partially adjusted multi-event history as a whole`, () => {
    for (const action of spec.actions) {
      const raw = fixture(spec);
      raw.points = raw.points.map(p => p.date < action.firstNewNavDate ? { ...p, nav: p.nav * action.factor } : p);
      unchanged(raw, 'only one event already adjusted');
      raw.warnings = [warning(1)];
      unchanged(raw, 'partial normalization plus a rewritten count is still not an exact complete history');
    }
  });
}
