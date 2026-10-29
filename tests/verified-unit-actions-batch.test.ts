import assert from 'node:assert/strict';
import test from 'node:test';
import { financialNavBasis } from '../src/lib/corporate-actions.ts';
import { absoluteReturn, trailingReturn } from '../src/lib/analytics.ts';
import type { FundData, FundMeta, NavPoint } from '../src/lib/types.ts';

const WARNING = 'Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked.';
const TWO_MOVES = 'Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.';

interface Fixture {
  meta: FundMeta; dates: string[]; navs: number[]; expectedNavs: number[];
  factor: number; deviation: number; eventReturn: number; source: string;
}

// Literal source observations and independent decimal expectations; see the evidence document.
const FIXTURES: Fixture[] = [
  { meta: {"schemeCode":134782,"schemeName":"Nippon India ETF Nifty 50 Value 20 - Direct Plan","fundHouse":"Nippon India Mutual Fund","isinGrowth":"INF204KB18I3","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2019-12-19","2019-12-20","2019-12-23","2019-12-24"], navs: [589.9707,589.6885,58.8982,58.6075],
    expectedNavs: [58.99707,58.96885,58.8982,58.6075], factor: 0.1, deviation: 0.005000000000000001,
    eventReturn: -0.0011980901781194647, source: "https://archives.nseindia.com/content/circulars/CML42888.pdf" },
  { meta: {"schemeCode":140084,"schemeName":"Nippon India ETF Nifty 50 BeES - Direct Plan","fundHouse":"Nippon India Mutual Fund","isinGrowth":"INF204KB14I2","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2019-12-19","2019-12-20","2019-12-23","2019-12-24"], navs: [1299.0255,1300.3137,129.9356,129.4264],
    expectedNavs: [129.90255,130.03137,129.9356,129.4264], factor: 0.1, deviation: 0.005000000000000001,
    eventReturn: -0.0007365145810584016, source: "https://archives.nseindia.com/content/circulars/CML42888.pdf" },
  { meta: {"schemeCode":140087,"schemeName":"Nippon India ETF Nifty Bank BeES - Direct Plan","fundHouse":"Nippon India Mutual Fund","isinGrowth":"INF204KB15I9","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2019-12-19","2019-12-20","2019-12-23","2019-12-24"], navs: [3290.5918,3305.2296,330.0579,329.4585],
    expectedNavs: [329.05918,330.52296,330.0579,329.4585], factor: 0.1, deviation: 0.005000000000000001,
    eventReturn: -0.0014070429479392293, source: "https://archives.nseindia.com/content/circulars/CML42888.pdf" },
  { meta: {"schemeCode":140088,"schemeName":"Nippon India ETF Gold BeES - Direct Plan","fundHouse":"Nippon India Mutual Fund","isinGrowth":"INF204KB17I5","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Gold ETF"},
    dates: ["2019-12-19","2019-12-20","2019-12-23","2019-12-24"], navs: [3353.2295,3358.6429,33.7313,33.8801],
    expectedNavs: [33.532295,33.586429,33.7313,33.8801], factor: 0.01, deviation: 0.0005,
    eventReturn: 0.00431337907343469, source: "https://archives.nseindia.com/content/circulars/CML42888.pdf" },
  { meta: {"schemeCode":140089,"schemeName":"Nippon India ETF Nifty PSU Bank BeES - Direct Plan","fundHouse":"Nippon India Mutual Fund","isinGrowth":"INF204KB16I7","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2019-12-19","2019-12-20","2019-12-23","2019-12-24"], navs: [276.5196,282.7986,27.8997,27.8561],
    expectedNavs: [27.65196,28.27986,27.8997,27.8561], factor: 0.1, deviation: 0.005000000000000001,
    eventReturn: -0.013442782248568416, source: "https://archives.nseindia.com/content/circulars/CML42888.pdf" },
  { meta: {"schemeCode":140095,"schemeName":"Nippon India ETF Hang Seng BeES - Direct Plan","fundHouse":"Nippon India Mutual Fund","isinGrowth":"INF204KB19I1","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2019-12-19","2019-12-20","2019-12-23","2019-12-24"], navs: [3188.1444,3200.8548,321.0601,320.8585],
    expectedNavs: [318.81444,320.08548,321.0601,320.8585], factor: 0.1, deviation: 0.005000000000000001,
    eventReturn: 0.0030448741379958877, source: "https://archives.nseindia.com/content/circulars/CML42888.pdf" },
  { meta: {"schemeCode":101317,"schemeName":"Aditya Birla Sun Life Ultra Short Term Fund - Regular Plan - GROWTH","fundHouse":"Aditya Birla Sun Life Mutual Fund","isinGrowth":"INF209K01LZ1","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Income/Debt Oriented Schemes - Ultra Short Term Fund"},
    dates: ["2011-10-04","2011-10-05","2011-10-07","2011-10-10"], navs: [19.5352,19.5399,195.4934,195.6369],
    expectedNavs: [195.352,195.399,195.4934,195.6369], factor: 10, deviation: 0.01,
    eventReturn: 0.0004831140384546492, source: "https://mutualfund.adityabirlacapital.com/-/media/bsl/files/resources/factsheets/2014/empower-october-2014.pdf#page=54" },
  { meta: {"schemeCode":101976,"schemeName":"Aditya Birla Sun Life Money Market Fund - Regular Plan - GROWTH","fundHouse":"Aditya Birla Sun Life Mutual Fund","isinGrowth":"INF209K01RV7","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Income/Debt Oriented Schemes - Money Market Fund"},
    dates: ["2011-10-05","2011-10-06","2011-10-07","2011-10-09"], navs: [13.6039,13.6073,136.1057,136.1718],
    expectedNavs: [136.039,136.073,136.1057,136.1718], factor: 10, deviation: 0.01,
    eventReturn: 0.00024031218537108758, source: "https://mutualfund.adityabirlacapital.com/-/media/bsl/files/resources/factsheets/2014/empower-october-2014.pdf#page=61" },
  { meta: {"schemeCode":103192,"schemeName":"Aditya Birla Sun Life Ultra short to short term Fund - Regular Plan - GROWTH","fundHouse":"Aditya Birla Sun Life Mutual Fund","isinGrowth":"INF209K01LQ0","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Income/Debt Oriented Schemes - Ultra Short to Short Term Fund"},
    dates: ["2011-10-04","2011-10-05","2011-10-07","2011-10-10"], navs: [24.9135,24.9193,249.3002,249.4739],
    expectedNavs: [249.135,249.193,249.3002,249.4739], factor: 10, deviation: 0.01,
    eventReturn: 0.0004301886489588391, source: "https://mutualfund.adityabirlacapital.com/-/media/bsl/files/resources/factsheets/2014/empower-october-2014.pdf#page=53" },
  { meta: {"schemeCode":108273,"schemeName":"Aditya Birla Sun Life Banking & PSU Debt Fund - Regular Plan - GROWTH","fundHouse":"Aditya Birla Sun Life Mutual Fund","isinGrowth":"INF209K01LV0","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Income/Debt Oriented Schemes - Banking and PSU Debt Fund"},
    dates: ["2011-10-04","2011-10-05","2011-10-07","2011-10-10"], navs: [12.2393,12.2423,122.4839,122.5758],
    expectedNavs: [122.393,122.423,122.4839,122.5758], factor: 10, deviation: 0.01,
    eventReturn: 0.0004974555434844759, source: "https://mutualfund.adityabirlacapital.com/-/media/bsl/files/resources/factsheets/2014/empower-october-2014.pdf#page=55" },
  { meta: {"schemeCode":102012,"schemeName":"UTI - Liquid Fund - Regular Plan - Growth","fundHouse":"UTI Mutual Fund","isinGrowth":"INF789F1AF85","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Income/Debt Oriented Schemes - Liquid Fund"},
    dates: ["2026-06-18","2026-06-19","2026-06-20","2026-06-21"], navs: [4542.9226,4543.7279,454.4497,454.5266],
    expectedNavs: [454.29226,454.37279,454.4497,454.5266], factor: 0.1, deviation: 0.0001,
    eventReturn: 0.000169266297834428, source: "https://nsearchives.nseindia.com/content/circulars/NMF74721.zip" },
  { meta: {"schemeCode":120304,"schemeName":"UTI - Liquid Fund - Direct Plan - Growth","fundHouse":"UTI Mutual Fund","isinGrowth":"INF789F1AD46","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Income/Debt Oriented Schemes - Liquid Fund"},
    dates: ["2026-06-18","2026-06-19","2026-06-20","2026-06-21"], navs: [4588.2967,4589.1243,458.9915,459.0706],
    expectedNavs: [458.82967,458.91243,458.9915,459.0706], factor: 0.1, deviation: 0.0001,
    eventReturn: 0.00017229866708992826, source: "https://nsearchives.nseindia.com/content/circulars/NMF74721.zip" },
  { meta: {"schemeCode":115127,"schemeName":"Aditya Birla Sun Life Gold ETF","fundHouse":"Aditya Birla Sun Life Mutual Fund","isinGrowth":"INF209KB18D3","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Exchange Traded Funds (ETFs) - Equity ETF"},
    dates: ["2021-11-25","2021-11-26","2021-11-29","2021-11-30"], navs: [4354.4946,4406.2469,43.9372,43.9913],
    expectedNavs: [43.544946,44.062469,43.9372,43.9913], factor: 0.01, deviation: 0.0005,
    eventReturn: -0.0028429863973351106, source: "https://nsearchives.nseindia.com/content/circulars/CML50382.pdf#page=1" },
  { meta: {"schemeCode":115512,"schemeName":"Aditya Birla Sun Life Nifty 50 ETF","fundHouse":"Aditya Birla Sun Life Mutual Fund","isinGrowth":"INF209KB19D1","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Exchange Traded Funds (ETFs) - Equity ETF"},
    dates: ["2021-11-25","2021-11-26","2021-11-29","2021-11-30"], navs: [194.6672,189.0093,18.9314,18.8529],
    expectedNavs: [19.46672,18.90093,18.9314,18.8529], factor: 0.1, deviation: 0.005000000000000001,
    eventReturn: 0.0016120899871064544, source: "https://nsearchives.nseindia.com/content/circulars/CML50382.pdf#page=1" },
  { meta: {"schemeCode":139581,"schemeName":"Aditya Birla Sun Life BSE Sensex ETF","fundHouse":"Aditya Birla Sun Life Mutual Fund","isinGrowth":"INF209KB10E8","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Exchange Traded Funds (ETFs) - Equity ETF"},
    dates: ["2021-11-25","2021-11-26","2021-11-29","2021-11-30"], navs: [560.9325,544.8429,54.6304,54.4437],
    expectedNavs: [56.09325,54.48429,54.6304,54.4437], factor: 0.1, deviation: 0.005000000000000001,
    eventReturn: 0.0026816904469159825, source: "https://nsearchives.nseindia.com/content/circulars/CML50382.pdf#page=1" },
  { meta: {"schemeCode":145881,"schemeName":"Aditya Birla Sun Life Nifty Next 50 ETF","fundHouse":"Aditya Birla Sun Life Mutual Fund","isinGrowth":"INF209KB16D7","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Exchange Traded Funds (ETFs) - Equity ETF"},
    dates: ["2021-11-25","2021-11-26","2021-11-29","2021-11-30"], navs: [442.5578,429.1908,42.5268,42.4243],
    expectedNavs: [44.25578,42.91908,42.5268,42.4243], factor: 0.1, deviation: 0.005000000000000001,
    eventReturn: -0.009139990885172748, source: "https://nsearchives.nseindia.com/content/circulars/CML50382.pdf#page=1" },
  { meta: {"schemeCode":147735,"schemeName":"ADITYA BIRLA SUN LIFE NIFTY BANK ETF","fundHouse":"Aditya Birla Sun Life Mutual Fund","isinGrowth":"INF209KB17D5","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Exchange Traded Funds (ETFs) - Equity ETF"},
    dates: ["2021-11-25","2021-11-26","2021-11-29","2021-11-30"], navs: [371.9525,358.6222,35.813,35.5331],
    expectedNavs: [37.19525,35.86222,35.813,35.5331], factor: 0.1, deviation: 0.005000000000000001,
    eventReturn: -0.0013724749889995657, source: "https://nsearchives.nseindia.com/content/circulars/CML50382.pdf#page=1" },
];

function fixture(spec: Fixture): FundData {
  return { meta: { ...spec.meta }, points: spec.dates.map((date, i) => ({ date, nav: spec.navs[i] })),
    fetchedAt: '2026-10-29T00:00:00Z', source: 'mfapi.in', fromCache: true,
    stale: false, warnings: [WARNING] };
}

function close(actual: number | null, expected: number, tolerance = 1e-10): void {
  assert.notEqual(actual, null);
  assert.ok(Math.abs(actual! - expected) < tolerance, `${actual} should equal ${expected}`);
}

function unchanged(fund: FundData, reason: string): void {
  const original = structuredClone(fund);
  const result = financialNavBasis(fund);
  assert.equal(result.adjusted, false, reason);
  assert.equal(result.fund, fund, reason);
  assert.equal(result.adjustment, undefined, reason);
  assert.equal(result.adjustments, undefined, reason);
  assert.deepEqual(fund, original, reason);
}

function shifted(date: string, days: number): string {
  return new Date(Date.parse(date + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10);
}

for (const spec of FIXTURES) {
  const code = spec.meta.schemeCode;

  test(`${code}: changes only the calculation copy and preserves post-event NAVs and metadata`, () => {
    const raw = fixture(spec), original = structuredClone(raw);
    raw.points.forEach(Object.freeze);
    Object.freeze(raw.points); Object.freeze(raw.meta); Object.freeze(raw.warnings); Object.freeze(raw);
    const result = financialNavBasis(raw);
    assert.equal(result.adjusted, true);
    assert.notEqual(result.fund, raw);
    assert.notEqual(result.fund.points, raw.points);
    assert.equal(result.fund.points.length, original.points.length);
    result.fund.points.forEach((point, i) => {
      assert.equal(point.date, original.points[i].date);
      close(point.nav, spec.expectedNavs[i]);
    });
    assert.deepEqual(result.fund.points.slice(2), original.points.slice(2));
    assert.deepEqual({ ...result.fund, points: raw.points, warnings: raw.warnings }, raw);
    assert.deepEqual(result.fund.warnings, []);
    assert.deepEqual(raw, original);
    assert.equal(result.adjustment?.schemeCode, code);
    assert.equal(result.adjustment?.factor, spec.factor);
    assert.equal(result.adjustment?.oldNavThrough, spec.dates[1]);
    assert.equal(result.adjustment?.firstNewNavDate, spec.dates[2]);
    assert.equal(result.adjustment?.evidenceUrl, spec.source);
    assert.equal(result.adjustments, undefined);
    assert.match(result.adjustment!.label, /verified .* unit (?:split|consolidation)/);
  });

  test(`${code}: retains the actual event return after removing only the denomination change`, () => {
    const result = financialNavBasis(fixture(spec));
    assert.equal(result.adjusted, true);
    close(absoluteReturn(result.fund.points.slice(1, 3)), spec.eventReturn, 1e-12);
    assert.notEqual(absoluteReturn(result.fund.points.slice(1, 3)), 0);
  });

  test(`${code}: requires the exact code, current name, fund house and current Growth ISIN`, () => {
    const other = FIXTURES.find(item => item.meta.schemeCode !== code)!;
    const changes: Partial<FundMeta>[] = [
      { schemeCode: 999999 }, { schemeCode: other.meta.schemeCode },
      { schemeName: other.meta.schemeName }, { schemeName: spec.meta.schemeName + ' Extra' },
      { schemeName: ' ' + spec.meta.schemeName }, { schemeName: spec.meta.schemeName + ' IDCW' },
      { schemeName: spec.meta.schemeName.replace('Regular', 'Direct').replace('ETF', 'Index Fund') },
      { fundHouse: 'Another Mutual Fund' }, { isinGrowth: other.meta.isinGrowth },
      { isinGrowth: null }, { isinGrowth: undefined }, { isinGrowth: 'INF000000000' },
    ].filter(change => change.schemeName !== spec.meta.schemeName);
    if (code === 102012) changes.push({ isinGrowth: 'INF789F01PH1' });
    if (code === 120304) changes.push({ isinGrowth: 'INF789F01XQ6' });
    for (const change of changes) {
      const raw = fixture(spec); Object.assign(raw.meta, change);
      unchanged(raw, 'identity mismatch: ' + JSON.stringify(change));
    }
  });

  test(`${code}: requires its exact adjacent observed dates, not a nearby legal or exchange date`, () => {
    const previous = fixture(spec);
    previous.points[0].date = shifted(previous.points[0].date, -2);
    previous.points[1].date = shifted(previous.points[1].date, -1);
    unchanged(previous, 'wrong last old-basis observation, still ordered');
    const next = fixture(spec);
    next.points[2].date = shifted(next.points[2].date, 1);
    next.points[3].date = shifted(next.points[3].date, 2);
    unchanged(next, 'wrong first new-basis observation, still ordered');
    for (const index of [1, 2]) {
      const raw = fixture(spec); raw.points.splice(index, 1);
      unchanged(raw, 'missing exact boundary row');
    }
  });

  test(`${code}: requires one matching generated warning without clearing other quality evidence`, () => {
    for (const warnings of [[], [TWO_MOVES], [WARNING, WARNING], [WARNING, TWO_MOVES],
      [WARNING.replace('1 single-observation', 'one single-observation')]]) {
      const raw = fixture(spec); raw.warnings = warnings;
      unchanged(raw, 'wrong discontinuity warning');
    }
    for (const warning of ['Invalid NAV observations were excluded (1).',
      'Conflicting NAV values were reported for 1 date(s).']) {
      const raw = fixture(spec); raw.warnings.push(warning);
      unchanged(raw, warning);
    }
  });

  test(`${code}: preserves an unrelated source-coverage warning in the calculation copy`, () => {
    const raw = fixture(spec), coverage = 'History coverage has not been independently verified.';
    raw.warnings.push(coverage);
    const result = financialNavBasis(raw);
    assert.equal(result.adjusted, true);
    assert.deepEqual(result.fund.warnings, [coverage]);
    assert.deepEqual(raw.warnings, [WARNING, coverage]);
  });

  test(`${code}: refuses an additional unexplained move with either one-move or two-move warning`, () => {
    for (const warning of [WARNING, TWO_MOVES]) {
      const raw = fixture(spec), last = raw.points.at(-1)!;
      raw.points.push({ date: shifted(last.date, 1), nav: last.nav * 2 });
      raw.warnings = [warning];
      unchanged(raw, 'additional event is not independently verified');
    }
  });

  test(`${code}: refuses a missing unit event even when the raw warning survives`, () => {
    const raw = fixture(spec);
    for (const point of raw.points.slice(2)) point.nav /= spec.factor;
    unchanged(raw, 'no denomination jump');
  });

  test(`${code}: uses the documented factor within its bounded residual-return tolerance`, () => {
    for (const direction of [-1, 1]) {
      const raw = fixture(spec);
      raw.points[2].nav = raw.points[1].nav * (spec.factor + direction * spec.deviation * 0.99);
      raw.points[3].nav = raw.points[2].nav * 1.001;
      const result = financialNavBasis(raw);
      assert.equal(result.adjusted, true);
      close(result.fund.points[1].nav, spec.expectedNavs[1]);
      assert.equal(result.fund.points[2].nav, raw.points[2].nav);
    }
    for (const ratio of [spec.factor - spec.deviation * 1.01, spec.factor + spec.deviation * 1.01,
      spec.factor / 2, spec.factor * 2]) {
      const raw = fixture(spec);
      raw.points[2].nav = raw.points[1].nav * ratio;
      raw.points[3].nav = raw.points[2].nav * 1.001;
      unchanged(raw, 'unverified ratio ' + ratio);
    }
  });

  test(`${code}: rejects malformed, unordered, duplicate, non-positive or non-finite observations`, () => {
    const corruptions: [string, (points: NavPoint[]) => void][] = [
      ['duplicate', points => points.splice(1, 0, { ...points[0] })],
      ['unordered', points => points.reverse()],
      ['impossible date', points => { points[0].date = points[0].date.slice(0, 8) + '32'; }],
      ['zero', points => { points[0].nav = 0; }],
      ['non-finite', points => { points[0].nav = NaN; }],
      ['too short', points => points.splice(0, 2)],
    ];
    for (const [reason, corrupt] of corruptions) {
      const raw = fixture(spec); corrupt(raw.points); unchanged(raw, reason);
    }
  });

  test(`${code}: cannot apply twice, even with the original discontinuity warning restored`, () => {
    const first = financialNavBasis(fixture(spec));
    assert.equal(first.adjusted, true);
    unchanged(first.fund, 'already adjusted copy');
    unchanged({ ...first.fund, warnings: [WARNING] }, 'already adjusted with stale warning');
  });
}

// Actual predecessor observations for 1/3/5-year periods, with intermediate
// source rows retained to avoid inventing a large multi-year single-row move.
const PERIOD_FIXTURES = [
  {
    "code": 102012,
    "points": [
      {
        "date": "2021-10-26",
        "nav": 3414.897
      },
      {
        "date": "2022-04-26",
        "nav": 3475.6799
      },
      {
        "date": "2022-10-26",
        "nav": 3560.5538
      },
      {
        "date": "2023-04-26",
        "nav": 3681.7338
      },
      {
        "date": "2023-10-26",
        "nav": 3807.3868
      },
      {
        "date": "2024-04-26",
        "nav": 3948.0277
      },
      {
        "date": "2024-10-26",
        "nav": 4087.9945
      },
      {
        "date": "2025-04-26",
        "nav": 4236.2411
      },
      {
        "date": "2025-10-26",
        "nav": 4362.7499
      },
      {
        "date": "2026-04-26",
        "nav": 4501.1673
      },
      {
        "date": "2026-06-18",
        "nav": 4542.9226
      },
      {
        "date": "2026-06-19",
        "nav": 4543.7279
      },
      {
        "date": "2026-06-20",
        "nav": 454.4497
      },
      {
        "date": "2026-06-21",
        "nav": 454.5266
      },
      {
        "date": "2026-10-26",
        "nav": 464.0592
      }
    ],
    "expectedReturns": [
      0.06368508540909026,
      0.06812641720007269,
      0.06322349929716155
    ]
  },
  {
    "code": 120304,
    "points": [
      {
        "date": "2021-10-26",
        "nav": 3434.4079
      },
      {
        "date": "2022-04-26",
        "nav": 3497.2726
      },
      {
        "date": "2022-10-26",
        "nav": 3584.341
      },
      {
        "date": "2023-04-26",
        "nav": 3707.9942
      },
      {
        "date": "2023-10-26",
        "nav": 3836.2726
      },
      {
        "date": "2024-04-26",
        "nav": 3979.7661
      },
      {
        "date": "2024-10-26",
        "nav": 4122.7179
      },
      {
        "date": "2025-04-26",
        "nav": 4273.8778
      },
      {
        "date": "2025-10-26",
        "nav": 4403.4392
      },
      {
        "date": "2026-04-26",
        "nav": 4545.3776
      },
      {
        "date": "2026-06-18",
        "nav": 4588.2967
      },
      {
        "date": "2026-06-19",
        "nav": 4589.1243
      },
      {
        "date": "2026-06-20",
        "nav": 458.9915
      },
      {
        "date": "2026-06-21",
        "nav": 459.0706
      },
      {
        "date": "2026-10-26",
        "nav": 468.8687
      }
    ],
    "expectedReturns": [
      0.06477841229191947,
      0.06910597722119002,
      0.06420443676318452
    ]
  },
  {
    "code": 115512,
    "points": [
      {
        "date": "2021-10-26",
        "nav": 202.6705
      },
      {
        "date": "2021-11-25",
        "nav": 194.6672
      },
      {
        "date": "2021-11-26",
        "nav": 189.0093
      },
      {
        "date": "2021-11-29",
        "nav": 18.9314
      },
      {
        "date": "2021-11-30",
        "nav": 18.8529
      },
      {
        "date": "2022-04-26",
        "nav": 19.1418
      },
      {
        "date": "2022-10-25",
        "nav": 19.8364
      },
      {
        "date": "2023-04-26",
        "nav": 20.0549
      },
      {
        "date": "2023-10-26",
        "nav": 21.418
      },
      {
        "date": "2024-04-26",
        "nav": 25.519
      },
      {
        "date": "2024-10-25",
        "nav": 27.7397
      },
      {
        "date": "2025-04-25",
        "nav": 27.6774
      },
      {
        "date": "2025-10-24",
        "nav": 29.9541
      },
      {
        "date": "2026-04-24",
        "nav": 27.8292
      },
      {
        "date": "2026-10-26",
        "nav": 26.7128
      }
    ],
    "expectedReturns": [
      -0.10820889293953082,
      0.07634373460183534,
      0.05675093080836346
    ]
  }
];

for (const period of PERIOD_FIXTURES) {
  test(`${period.code}: correctly changes cross-event trailing returns and preserves post-event returns`, () => {
    const spec = FIXTURES.find(item => item.meta.schemeCode === period.code)!;
    const raw = fixture(spec); raw.points = structuredClone(period.points);
    const original = structuredClone(raw);
    const result = financialNavBasis(raw);
    assert.equal(result.adjusted, true);
    for (const [index, years] of [1, 3, 5].entries()) {
      close(trailingReturn(result.fund.points, years), period.expectedReturns[index], 1e-12);
      if (period.code === 115512 && years < 5) {
        assert.equal(trailingReturn(result.fund.points, years), trailingReturn(raw.points, years));
      } else {
        assert.notEqual(trailingReturn(result.fund.points, years), trailingReturn(raw.points, years));
      }
    }
    assert.deepEqual(raw, original);
  });
}

