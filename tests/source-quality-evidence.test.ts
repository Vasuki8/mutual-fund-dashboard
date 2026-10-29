import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { getFund, validateFundResponse } from '../src/lib/api.ts';
import { exportBackup, importBackup, mergeCachedFund, validateCachedFund } from '../src/lib/storage.ts';
import type { FundData } from '../src/lib/types.ts';

type EvidenceFund = FundData & { rejectedZeroNavDates?: string[]; sourceObservedAt?: string };
const DATES = ['2013-01-03', '2013-01-04', '2013-01-07'];
const WARNING = 'Invalid NAV observations were excluded (3); derived analytics are blocked until the data is resolved.';
const POSITIVE = [
  { date: '08-01-2013', nav: '10.0' }, { date: '09-01-2013', nav: '10.1' },
  { date: '10-01-2013', nav: '10.2' }, { date: '11-01-2013', nav: '10.3' },
  { date: '14-01-2013', nav: '10.4' },
];
const ZEROS = [
  { date: '07-01-2013', nav: '0.00000' }, { date: '03-01-2013', nav: '0.00000' },
  { date: '04-01-2013', nav: '0.00000' },
];
function payload(data: unknown[] = [...POSITIVE, ...ZEROS]) {
  return { status: 'SUCCESS', meta: {
    scheme_code: 119566, scheme_name: 'Sundaram Large and Midcap Fund - Direct Plan - GROWTH',
    fund_house: 'Sundaram Mutual Fund', scheme_type: 'Open Ended Schemes',
    scheme_category: 'Equity Scheme - Large & Mid Cap Fund',
    isin_growth: 'INF903J01PR9', isin_div_reinvestment: null,
  }, data: structuredClone(data) };
}
function fund(data?: unknown[], fetchedAt = '2026-10-29T04:46:24.361Z'): EvidenceFund {
  return { ...validateFundResponse(payload(data), 119566), fetchedAt, sourceObservedAt: fetchedAt };
}
function proven(data?: unknown[], fetchedAt?: string): EvidenceFund {
  return { ...fund(data, fetchedAt), rejectedZeroNavDates: [...DATES] };
}
function provenance() {
  return { fetchedAt: '2026-10-28T12:00:00.000Z', archivedAt: '2026-10-28T12:01:00.000Z',
    fromArchive: true, stale: true, coverageStart: '2013-01-08', coverageEnd: '2013-01-14',
    observationCount: 5, warnings: [WARNING] };
}

test('direct raw response records every rejected zero date without changing points or warnings', () => {
  const raw = payload();
  const before = structuredClone(raw);
  const result = validateFundResponse(raw, 119566) as EvidenceFund;
  assert.equal(result.sourceObservedAt, result.fetchedAt);
  assert.ok(Number.isFinite(Date.parse(result.sourceObservedAt!)));
  assert.deepEqual(result.rejectedZeroNavDates, DATES);
  assert.deepEqual(result.points, [
    { date: '2013-01-08', nav: 10 }, { date: '2013-01-09', nav: 10.1 },
    { date: '2013-01-10', nav: 10.2 }, { date: '2013-01-11', nav: 10.3 },
    { date: '2013-01-14', nav: 10.4 },
  ]);
  assert.deepEqual(result.warnings, [WARNING]);
  assert.deepEqual(raw, before);
});

test('raw evidence distinguishes equal positive series and equal invalid counts with different rejected dates', () => {
  const expected = fund();
  const changed = fund([...POSITIVE, { date: '05-01-2013', nav: '0' },
    { date: '06-01-2013', nav: '0' }, { date: '13-01-2013', nav: '0' }]);
  assert.deepEqual(changed.points, expected.points);
  assert.deepEqual(changed.warnings, expected.warnings);
  assert.deepEqual(expected.rejectedZeroNavDates, DATES);
  assert.deepEqual(changed.rejectedZeroNavDates, ['2013-01-05', '2013-01-06', '2013-01-13']);
});

test('one unclassified invalid row prevents certification of otherwise recognizable zeros', () => {
  for (const row of [null, {}, { date: '30-02-2013', nav: '0' },
    { date: '15-01-2013', nav: '-1' }, { date: '15-01-2013', nav: '' },
    { date: '15-01-2013', nav: 'NaN' }, { date: '15-01-2013', nav: 'Infinity' },
    { date: '15-01-2013', nav: '0x0' }, { date: '15-01-2013', nav: '0e0' },
    { date: '15-01-2013', nav: '1e-5000' }, { date: '15-01-2013', nav: '-0.0' },
    { date: '15-01-2013', nav: -0 }]) {
    const result = fund([...POSITIVE, ...ZEROS, row]);
    assert.equal(result.rejectedZeroNavDates, undefined, JSON.stringify(row));
    assert.ok(result.warnings.some(warning => warning.startsWith('Invalid NAV observations')));
  }
});

test('repeated rejection dates, positive collisions, or conflicting duplicates prevent raw certification', () => {
  for (const rows of [
    [...POSITIVE, ...ZEROS, ZEROS[0]],
    [...POSITIVE, ...ZEROS, { date: '08-01-2013', nav: '0' }],
    [...POSITIVE, ...ZEROS, { date: '09-01-2013', nav: '10.2' }],
  ]) assert.equal(fund(rows).rejectedZeroNavDates, undefined);
  assert.equal(fund(POSITIVE).rejectedZeroNavDates, undefined, 'Clean histories need no rejection evidence.');
});

test('cache validation retains complete evidence and rejects malformed or mismatched assertions', () => {
  const valid = proven();
  const restored = validateCachedFund(valid) as EvidenceFund;
  assert.deepEqual(restored.rejectedZeroNavDates, DATES);
  assert.equal(restored.sourceObservedAt, valid.sourceObservedAt);
  restored.rejectedZeroNavDates![0] = '2012-01-01';
  assert.deepEqual(valid.rejectedZeroNavDates, DATES, 'Validation must isolate caller arrays.');
  for (const evidence of [null, '2013-01-03', [], ['2013-01-03'],
    ['2013-01-07', '2013-01-03', '2013-01-04'],
    ['2013-01-03', '2013-01-03', '2013-01-07'],
    ['2013-01-03', '2013-01-04', '2013-02-30'],
    ['2013-01-03', '2013-01-04', '2013-01-08']]) {
    assert.throws(() => validateCachedFund({ ...valid, rejectedZeroNavDates: evidence }), /reject|evidence|invalid/i);
  }
  for (const warnings of [[], [WARNING, 'Invalid NAV observations from another response remain unresolved.'],
    [WARNING.replace('(3)', '(4)')], [WARNING,
      'Conflicting NAV values occur on 1 duplicate date(s); the lowest value is retained deterministically and analytics are blocked.']]) {
    assert.throws(() => validateCachedFund({ ...valid, warnings }), /reject|evidence|invalid/i);
  }
  assert.throws(() => validateCachedFund({ ...valid, sourceObservedAt: '2026-02-30T12:00:00.000Z' }), /timestamp|invalid/i);
});

test('cache revalidation cannot preserve proof when restored points reveal an unreported conflict', () => {
  const restored = proven();
  restored.points.push({ date: '2013-01-09', nav: 10.2 });
  assert.throws(() => validateCachedFund(restored), /reject|evidence|invalid/i);
});

test('cache validation rejects contradictory top-level and archive rejection evidence', () => {
  const restored = proven();
  restored.archive = { ...provenance(), rejectedZeroNavDates: ['2013-01-02', '2013-01-04', '2013-01-07'] };
  assert.throws(() => validateCachedFund(restored), /conflict|contradict/i);
});

test('a supplied observation clock cannot predate successful retrieval or archive observation time', () => {
  const beforeFetch = proven();
  beforeFetch.sourceObservedAt = '2026-10-20T12:00:00.000Z';
  assert.throws(() => validateCachedFund(beforeFetch), /sourceObservedAt|observation.*time/i);
  const beforeArchive = proven(undefined, '2026-10-20T12:00:00.000Z');
  beforeArchive.archive = { ...provenance(), archivedAt: '2026-10-29T12:00:00.000Z' };
  assert.throws(() => validateCachedFund(beforeArchive), /sourceObservedAt|observation.*time/i);
});

test('archive evidence is validated against final warnings and positives while legacy counts remain unknown', () => {
  const legacy = validateFundResponse({ ...payload(POSITIVE), _fundscope: provenance() }, 119566) as EvidenceFund;
  assert.equal(legacy.rejectedZeroNavDates, undefined);
  assert.equal(legacy.sourceObservedAt, '2026-10-28T12:01:00.000Z');
  assert.deepEqual(legacy.warnings, [WARNING]);
  const archive = { ...provenance(), rejectedZeroNavDates: [...DATES] };
  const restored = validateFundResponse({ ...payload(POSITIVE), _fundscope: archive }, 119566) as EvidenceFund;
  assert.deepEqual(restored.rejectedZeroNavDates, DATES);
  assert.throws(() => validateFundResponse({ ...payload(POSITIVE), _fundscope: {
    ...archive, rejectedZeroNavDates: ['2013-01-03', '2013-01-04', '2013-01-08'],
  } }, 119566), /reject|evidence|invalid/i);
  assert.throws(() => validateFundResponse({ ...payload([...POSITIVE, { date: '15-01-2013', nav: '-1' }]),
    _fundscope: archive }, 119566), /reject|evidence|invalid/i);
  assert.throws(() => validateFundResponse({ ...payload([...POSITIVE,
    { date: '05-01-2013', nav: '0' }, { date: '06-01-2013', nav: '0' }, { date: '13-01-2013', nav: '0' }]),
    _fundscope: archive }, 119566), /reject|evidence|invalid/i);
});

test('a fresh complete raw response supplies its own evidence over an unknown legacy projection', () => {
  const previous = fund(undefined, '2026-10-28T12:00:00.000Z');
  delete previous.rejectedZeroNavDates;
  previous.archive = provenance();
  const before = structuredClone(previous);
  const incoming = proven([...POSITIVE, ...ZEROS, { date: '15-01-2013', nav: '10.5' }]);
  const merged = mergeCachedFund(incoming, previous) as EvidenceFund;
  assert.deepEqual(merged.rejectedZeroNavDates, DATES);
  assert.deepEqual(merged.points, incoming.points);
  assert.equal(merged.fetchedAt, previous.fetchedAt, 'Raw merge retrieval policy stays unchanged.');
  assert.ok(merged.warnings.includes(WARNING));
  assert.deepEqual(previous, before);
});

test('same-positive later responses replace proof with their own rejection dates instead of inheriting old proof', () => {
  const previous = proven(undefined, '2026-10-28T12:00:00.000Z');
  previous.archive = { ...provenance(), rejectedZeroNavDates: [...DATES] };
  const incoming = { ...proven(), rejectedZeroNavDates: ['2013-01-05', '2013-01-06', '2013-01-13'] };
  const merged = mergeCachedFund(incoming, previous) as EvidenceFund;
  assert.deepEqual(merged.rejectedZeroNavDates, ['2013-01-05', '2013-01-06', '2013-01-13']);
  const unknown = { ...incoming };
  delete unknown.rejectedZeroNavDates;
  const unknownMerged = mergeCachedFund(unknown, previous) as EvidenceFund;
  assert.equal(unknownMerged.rejectedZeroNavDates, undefined);
  assert.equal(unknownMerged.archive?.rejectedZeroNavDates, undefined);
  assert.deepEqual(previous.rejectedZeroNavDates, DATES);
  assert.deepEqual(previous.archive.rejectedZeroNavDates, DATES);
});

test('older, late, changed-overlap, shortened, or identity-mismatched merges cannot retain proof', () => {
  const previous = proven(undefined, '2026-10-28T12:00:00.000Z');
  const variants = [
    proven(undefined, '2026-10-27T12:00:00.000Z'),
    proven([...POSITIVE.slice(0, -1), ...ZEROS]),
    proven([...POSITIVE.slice(1), ...ZEROS]),
    proven([...POSITIVE.slice(0, -1), { date: '14-01-2013', nav: '10.45' }, ...ZEROS]),
    { ...proven(), meta: { ...previous.meta, isinGrowth: 'INF903J01ZZ9' } },
    { ...proven(), meta: { ...previous.meta, schemeName: 'Another Direct Plan Growth' } },
    { ...proven(), meta: { ...previous.meta, schemeCategory: 'Equity Scheme - Other' } },
  ];
  for (const incoming of variants) {
    assert.equal((mergeCachedFund(incoming, previous) as EvidenceFund).rejectedZeroNavDates, undefined);
  }
});

test('a newer unknown response advances the evidence clock so an overlapping known response cannot restore stale proof', () => {
  const previous = proven(undefined, '2026-10-20T12:00:00.000Z');
  previous.sourceObservedAt = '2026-10-27T12:00:00.000Z';
  const unknown = fund([...POSITIVE, ...ZEROS, { date: '15-01-2013', nav: '-1' }],
    '2026-10-29T12:00:00.000Z');
  const newerUnknown = mergeCachedFund(unknown, previous) as EvidenceFund;
  assert.equal(newerUnknown.rejectedZeroNavDates, undefined);
  assert.equal(newerUnknown.fetchedAt, '2026-10-20T12:00:00.000Z');
  assert.equal(newerUnknown.sourceObservedAt, '2026-10-29T12:00:00.000Z');
  const overlapping = proven(undefined, '2026-10-28T12:00:00.000Z');
  const result = mergeCachedFund(overlapping, newerUnknown) as EvidenceFund;
  assert.equal(result.rejectedZeroNavDates, undefined);
  assert.equal(result.sourceObservedAt, '2026-10-29T12:00:00.000Z');
  assert.equal(result.fetchedAt, '2026-10-20T12:00:00.000Z');
  assert.deepEqual(result.points, previous.points);
});

test('legacy archive observation time guards evidence even when no separate observation clock was saved', () => {
  const previous = fund(undefined, '2026-10-20T12:00:00.000Z');
  delete previous.sourceObservedAt;
  delete previous.rejectedZeroNavDates;
  previous.archive = { ...provenance(), fetchedAt: previous.fetchedAt, archivedAt: '2026-10-29T12:00:00.000Z' };
  const result = mergeCachedFund(proven(undefined, '2026-10-28T12:00:00.000Z'), previous) as EvidenceFund;
  assert.equal(result.rejectedZeroNavDates, undefined);
  assert.equal(result.sourceObservedAt, '2026-10-29T12:00:00.000Z');
});

test('merge defensively uses the latest provenance clock even if a supplied clock regresses', () => {
  const previous = fund(undefined, '2026-10-20T12:00:00.000Z');
  delete previous.rejectedZeroNavDates;
  previous.archive = { ...provenance(), fetchedAt: previous.fetchedAt, archivedAt: '2026-10-29T12:00:00.000Z' };
  const result = mergeCachedFund(proven(undefined, '2026-10-28T12:00:00.000Z'), previous) as EvidenceFund;
  assert.equal(result.rejectedZeroNavDates, undefined);
  assert.equal(result.sourceObservedAt, '2026-10-29T12:00:00.000Z');
  assert.equal(result.fetchedAt, '2026-10-20T12:00:00.000Z');
});

test('legacy hydration blocks the same old archive twice until a later complete raw response establishes proof', t => {
  let now = Date.parse('2026-10-29T12:00:00.000Z');
  t.mock.method(Date, 'now', () => now);
  const legacy = fund(undefined, '2026-10-20T12:00:00.000Z');
  delete legacy.sourceObservedAt;
  delete legacy.rejectedZeroNavDates;
  const hydrated = validateCachedFund(legacy) as EvidenceFund;
  assert.equal(hydrated.sourceObservedAt, '2026-10-29T12:00:00.000Z');
  assert.equal(hydrated.fetchedAt, '2026-10-20T12:00:00.000Z');
  assert.equal(hydrated.rejectedZeroNavDates, undefined);
  const oldArchive = validateFundResponse({ ...payload(POSITIVE), _fundscope: {
    ...provenance(), fetchedAt: legacy.fetchedAt, archivedAt: '2026-10-28T12:00:00.000Z',
    rejectedZeroNavDates: [...DATES],
  } }, 119566);
  let current: EvidenceFund = hydrated;
  now = Date.parse('2026-10-29T13:00:00.000Z');
  for (let attempt = 0; attempt < 2; attempt++) {
    current = validateCachedFund(mergeCachedFund(oldArchive, validateCachedFund(current))) as EvidenceFund;
    assert.equal(current.rejectedZeroNavDates, undefined);
    assert.equal(current.sourceObservedAt, '2026-10-29T12:00:00.000Z');
    assert.equal(current.fetchedAt, legacy.fetchedAt);
  }
  const fresh = proven([...POSITIVE, ...ZEROS, { date: '15-01-2013', nav: '10.5' }],
    '2026-10-29T14:00:00.000Z');
  const reviewed = validateCachedFund(mergeCachedFund(fresh, current)) as EvidenceFund;
  assert.deepEqual(reviewed.rejectedZeroNavDates, DATES);
  assert.deepEqual(reviewed.points, fresh.points);
  assert.equal(reviewed.sourceObservedAt, '2026-10-29T14:00:00.000Z');
  assert.equal(reviewed.fetchedAt, legacy.fetchedAt);
  assert.ok(reviewed.warnings.includes(WARNING));
});

test('the conservative legacy hydration bound never predates an already recorded successful fetch', t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-10-29T12:00:00.000Z'));
  const legacy = fund(undefined, '2026-10-30T12:00:00.000Z');
  delete legacy.sourceObservedAt;
  delete legacy.rejectedZeroNavDates;
  const hydrated = validateCachedFund(legacy) as EvidenceFund;
  assert.equal(hydrated.sourceObservedAt, '2026-10-30T12:00:00.000Z');
  assert.equal(hydrated.fetchedAt, legacy.fetchedAt);
});

test('legacy hydration does not mistake a retained archive clock for the latest unknown response time', t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-10-29T12:00:00.000Z'));
  const legacy = fund(undefined, '2026-10-20T12:00:00.000Z');
  delete legacy.sourceObservedAt;
  delete legacy.rejectedZeroNavDates;
  legacy.archive = { ...provenance(), fetchedAt: legacy.fetchedAt, archivedAt: legacy.fetchedAt };
  const hydrated = validateCachedFund(legacy) as EvidenceFund;
  assert.equal(hydrated.sourceObservedAt, '2026-10-29T12:00:00.000Z');
  assert.equal(hydrated.archive?.archivedAt, '2026-10-20T12:00:00.000Z');
  const oldArchive = validateFundResponse({ ...payload(POSITIVE), _fundscope: {
    ...provenance(), fetchedAt: legacy.fetchedAt, archivedAt: '2026-10-28T12:00:00.000Z',
    rejectedZeroNavDates: [...DATES],
  } }, 119566);
  const result = validateCachedFund(mergeCachedFund(oldArchive, hydrated)) as EvidenceFund;
  assert.equal(result.rejectedZeroNavDates, undefined);
  assert.equal(result.sourceObservedAt, '2026-10-29T12:00:00.000Z');
  assert.equal(result.fetchedAt, legacy.fetchedAt);
});

test('portable backup round trips retain proven evidence without promoting legacy warning counts', async () => {
  const settings = { version: 1, watchlist: [], compared: [], riskFreeRate: 0.06, lastFund: null };
  const original = proven();
  await importBackup(JSON.stringify({ version: 1, createdAt: '2026-10-29T10:00:00.000Z', settings, funds: [original] }));
  const saved = JSON.parse(await exportBackup()).funds[0];
  assert.deepEqual(saved.rejectedZeroNavDates, DATES);
  assert.deepEqual(saved.warnings, [WARNING]);
  assert.equal(saved.sourceObservedAt, original.sourceObservedAt);
  delete original.rejectedZeroNavDates;
  await importBackup(JSON.stringify({ version: 1, createdAt: '2026-10-29T10:00:00.000Z', settings, funds: [original] }));
  assert.equal(JSON.parse(await exportBackup()).funds[0].rejectedZeroNavDates, undefined);
});

function gate<T = void>() {
  let release!: (value: T) => void;
  const promise = new Promise<T>(resolve => { release = resolve; });
  return { promise, release };
}
async function resetSourceCache() {
  await importBackup(JSON.stringify({ version: 1, createdAt: new Date().toISOString(), funds: [],
    settings: { version: 1, watchlist: [], compared: [], riskFreeRate: 0.06, lastFund: null } }));
}
let sourceTestRun = 0;
async function staticSourceTest(t: TestContext, source: () => Promise<Response>,
  archive: () => Promise<Response> = async () => new Response('', { status: 404 })) {
  await resetSourceCache();
  const base = new URL(`https://source-quality-${++sourceTestRun}.example/mutual-fund-dashboard/`);
  for (const [key, value] of [['__FUNDSCOPE_STATIC__', true], ['window', { location: base }]] as const) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.origin === base.origin) {
      assert.ok(url.pathname.endsWith('/archive/manifest.json'));
      return archive();
    }
    assert.equal(url.href, 'https://api.mfapi.in/mf/119566', 'Unexpected network request in offline test.');
    return source();
  });
}
const nextTurn = () => new Promise<void>(resolve => setImmediate(resolve));

test('normal and forced refreshes share the same pending raw response and validated proof', async t => {
  const began = gate();
  const release = gate();
  let requests = 0;
  await staticSourceTest(t, async () => {
    const request = ++requests;
    began.release();
    await release.promise;
    return Response.json(request === 1 ? payload() : payload([...POSITIVE, ...ZEROS.slice(1),
      { date: '07-01-2013', nav: '-1' }]));
  });
  const normal = getFund(119566);
  await began.promise;
  const forced = getFund(119566, { force: true });
  await nextTurn();
  release.release();
  const [first, second] = await Promise.all([normal, forced]);
  assert.equal(requests, 1);
  assert.deepEqual(first.rejectedZeroNavDates, DATES);
  assert.deepEqual(second.rejectedZeroNavDates, DATES);
  assert.equal(first.sourceObservedAt, second.sourceObservedAt);
  first.points[0].nav = 999;
  assert.equal(second.points[0].nav, 10);
  assert.equal(JSON.parse(await exportBackup()).funds[0].points[0].nav, 10);
});

test('forced raw work starts independently while normal refresh is still archive-only', async t => {
  const archiveBegan = gate();
  const releaseArchive = gate();
  const releaseSource = gate();
  let sourceRequests = 0;
  await staticSourceTest(t, async () => {
    sourceRequests += 1;
    await releaseSource.promise;
    return Response.json(payload());
  }, async () => {
    archiveBegan.release();
    await releaseArchive.promise;
    return new Response('', { status: 404 });
  });
  const normal = getFund(119566);
  await archiveBegan.promise;
  const forced = getFund(119566, { force: true });
  await nextTurn();
  const requestsBeforeArchiveFinished = sourceRequests;
  releaseArchive.release();
  await nextTurn();
  releaseSource.release();
  const results = await Promise.all([normal, forced]);
  assert.equal(requestsBeforeArchiveFinished, 1, 'Force must not wait for the archive read.');
  assert.equal(sourceRequests, 1, 'Once both callers need raw data, they share that pending source request.');
  assert.ok(results.every(result => result.rejectedZeroNavDates?.join() === DATES.join()));
});

test('a new storage generation cannot join or be overwritten by an earlier pending raw request', async t => {
  const began = gate();
  const releaseOld = gate();
  let requests = 0;
  await staticSourceTest(t, async () => {
    requests += 1;
    if (requests === 1) {
      began.release();
      await releaseOld.promise;
      return Response.json(payload());
    }
    return Response.json(payload([...POSITIVE, ...ZEROS.slice(1), { date: '07-01-2013', nav: '-1' }]));
  });
  const old = getFund(119566, { force: true }).then(value => ({ value, error: null }), error => ({ value: null, error }));
  await began.promise;
  await resetSourceCache();
  const current = getFund(119566, { force: true }).then(value => ({ value, error: null }), error => ({ value: null, error }));
  await nextTurn();
  const requestsBeforeOldFinished = requests;
  releaseOld.release();
  const [oldResult, currentResult] = await Promise.all([old, current]);
  assert.equal(requestsBeforeOldFinished, 2);
  assert.match(oldResult.error?.message ?? '', /superseded|restore|generation/i);
  assert.equal(currentResult.error, null);
  assert.equal(currentResult.value?.rejectedZeroNavDates, undefined);
  assert.equal(JSON.parse(await exportBackup()).funds[0].rejectedZeroNavDates, undefined);
});

test('a rejected shared raw request is removed so a later refresh can retry normally', async t => {
  const began = gate();
  const release = gate();
  let requests = 0;
  await staticSourceTest(t, async () => {
    requests += 1;
    if (requests === 1) {
      began.release();
      await release.promise;
      return new Response('', { status: 400 });
    }
    return Response.json(payload());
  });
  const normal = getFund(119566);
  await began.promise;
  const forced = getFund(119566, { force: true });
  const outcomes = Promise.allSettled([normal, forced]);
  await nextTurn();
  release.release();
  const failed = await outcomes;
  assert.equal(requests, 1);
  assert.ok(failed.every(result => result.status === 'rejected'));
  const retried = await getFund(119566, { force: true });
  assert.equal(requests, 2);
  assert.deepEqual(retried.rejectedZeroNavDates, DATES);
});
