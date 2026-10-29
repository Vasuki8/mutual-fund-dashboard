import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { test } from 'node:test';
import { handleRequest } from '../server/archive.ts';
import type { ArchiveBindings, HistoryDocument } from '../server/types.ts';
import { mergeHistory, validateHistory } from '../server/validation.ts';
import { validateHistoryShard } from '../scripts/archive-model.ts';
import { validateArchiveProvenance } from '../src/lib/provenance.ts';
import { createSharedArchiveClient } from '../src/lib/shared-archive.ts';

const CODE = 119566;
const BUCKET = String(Math.floor(CODE / 32));
const NOW = '2026-10-21T12:00:00.000Z';
const BEFORE = '2026-10-21T10:00:00.000Z';
const INVALID = 'Invalid NAV observations were excluded (1); derived analytics are blocked until the data is resolved.';
const POSITIVE = [{ date: '20-10-2026', nav: '10.10000' }, { date: '19-10-2026', nav: '10.00000' }];
const zero = (date = '18-10-2026') => ({ date, nav: '0.00000' });
function raw(data: unknown[] = [...POSITIVE, zero()]) {
  return { status: 'SUCCESS', meta: { scheme_code: CODE, scheme_name: 'Example Direct Growth',
    fund_house: 'Example Mutual Fund', scheme_type: 'Open Ended Schemes', scheme_category: 'Equity',
    isin_growth: 'INF903J01PR9', isin_div_reinvestment: null }, data };
}
function stored(): HistoryDocument {
  return { version: 1, schemeCode: CODE, fetchedAt: BEFORE, archivedAt: BEFORE,
    coverageStart: '2026-10-19', coverageEnd: '2026-10-20', unresolved: true,
    warnings: [INVALID], rejectedZeroNavDates: ['2026-10-18'],
    payload: { ...raw(), status: 'SUCCESS', data: structuredClone(POSITIVE) } };
}
const shard = (doc: unknown) => ({ version: 2, bucket: BUCKET, records: [doc] });

test('raw validation certifies all rejected zero dates without changing warnings or positive NAVs', () => {
  const source = raw([...POSITIVE, zero('18-10-2026'), { date: '16-10-2026', nav: '00.000' },
    { date: '17-10-2026', nav: ' 0.0 ' }]);
  const original = structuredClone(source);
  const parsed = validateHistory(source, CODE);
  assert.deepEqual(parsed.rejectedZeroNavDates, ['2026-10-16', '2026-10-17', '2026-10-18']);
  assert.deepEqual(parsed.payload.data, POSITIVE);
  assert.match(parsed.warnings[0], /excluded \(3\)/);
  assert.deepEqual(source, original);
  assert.equal(validateHistory(raw(POSITIVE), CODE).rejectedZeroNavDates, undefined);
});

test('an unqualified rejected row makes the complete rejected-date evidence unknown', () => {
  for (const rejected of [null, [], {}, { date: '31-02-2026', nav: '0.00000' },
    { date: '17-10-2026', nav: 0 }, { date: '17-10-2026', nav: '-0' },
    { date: '17-10-2026', nav: '0e0' }, { date: '17-10-2026', nav: '' },
    { date: '17-10-2026', nav: 'NaN' }]) {
    const parsed = validateHistory(raw([...POSITIVE, zero(), rejected]), CODE);
    assert.equal(parsed.rejectedZeroNavDates, undefined, JSON.stringify(rejected));
    assert.match(parsed.warnings[0], /excluded \(2\)/);
  }
});

test('repeated zero dates, positive collisions and conflicting duplicate NAVs cannot certify zero evidence', () => {
  const cases = [
    [...POSITIVE, zero(), zero()],
    [...POSITIVE, zero('19-10-2026')],
    [...POSITIVE, zero(), { date: '19-10-2026', nav: '10.00100' }],
  ];
  for (const data of cases) assert.equal(validateHistory(raw(data), CODE).rejectedZeroNavDates, undefined);
  const identical = validateHistory(raw([...POSITIVE, zero(), POSITIVE[1]]), CODE);
  assert.deepEqual(identical.rejectedZeroNavDates, ['2026-10-18']);
  assert.match(identical.warnings.join(' '), /Identical duplicate/);
});

test('a same-count source-date swap is recorded from current raw observations, not prior evidence', () => {
  const previous = stored();
  const incoming = validateHistory(raw([...POSITIVE, zero('17-10-2026')]), CODE);
  const original = structuredClone({ previous, incoming });
  const merged = mergeHistory(incoming, previous, NOW, NOW);
  assert.deepEqual(merged.rejectedZeroNavDates, ['2026-10-17']);
  assert.deepEqual(merged.payload.data, POSITIVE);
  assert.equal(merged.unresolved, true);
  assert.ok(merged.warnings.includes(INVALID));
  assert.equal(merged.fetchedAt, BEFORE, 'The existing quality-warning fetch-time behavior stays unchanged.');
  assert.deepEqual({ previous, incoming }, original);
});

test('fresh complete raw evidence can be attached on first save or after unchanged positive history', () => {
  const incoming = validateHistory(raw([{ date: '21-10-2026', nav: '10.20000' }, ...POSITIVE, zero()]), CODE);
  for (const previous of [null, stored()]) {
    const merged = mergeHistory(incoming, previous, NOW, NOW);
    assert.deepEqual(merged.rejectedZeroNavDates, ['2026-10-18']);
    assert.equal(merged.payload.data.length, 3);
    assert.equal(merged.unresolved, true);
    assert.ok(merged.warnings.includes(INVALID));
  }
});

test('partial, changed, late, older and identity-changing merges discard rejected-date evidence', () => {
  const cases = [
    { incoming: raw([POSITIVE[0], zero()]), fetchedAt: NOW },
    { incoming: raw([{ ...POSITIVE[0], nav: '10.11000' }, POSITIVE[1], zero()]), fetchedAt: NOW },
    { incoming: raw([{ ...POSITIVE[0], nav: '10.1000' }, POSITIVE[1], zero()]), fetchedAt: NOW },
    { incoming: raw(), fetchedAt: '2026-10-21T09:00:00.000Z' },
    { incoming: raw([POSITIVE[1], zero()]), fetchedAt: NOW },
    { incoming: { ...raw(), meta: { ...raw().meta, isin_growth: 'INF903J01OTHER' } }, fetchedAt: NOW },
    { incoming: { ...raw(), meta: { ...raw().meta, scheme_name: 'Example Regular Growth' } }, fetchedAt: NOW },
  ];
  for (const { incoming, fetchedAt } of cases) {
    const parsed = validateHistory(incoming, CODE);
    assert.deepEqual(parsed.rejectedZeroNavDates, ['2026-10-18']);
    const merged = mergeHistory(parsed, stored(), fetchedAt, NOW);
    assert.equal(merged.rejectedZeroNavDates, undefined);
    assert.equal(merged.unresolved, true);
    assert.ok(merged.warnings.includes(INVALID));
  }
});

test('an overlapping response cannot certify evidence against a more recently archived quality record', () => {
  const previous = { ...stored(), archivedAt: '2026-10-21T11:00:00.000Z' };
  const incoming = validateHistory(raw([...POSITIVE, zero('17-10-2026')]), CODE);
  const merged = mergeHistory(incoming, previous, '2026-10-21T10:30:00.000Z', NOW);
  assert.equal(merged.rejectedZeroNavDates, undefined);
  assert.deepEqual(merged.payload.data, POSITIVE);
  assert.equal(merged.unresolved, true);
  assert.equal(merged.fetchedAt, BEFORE);
});

test('legacy normalized records stay unknown and cannot inherit previous rejected dates', () => {
  const previous = stored();
  const legacy = { payload: structuredClone(previous.payload), warnings: [INVALID] };
  const merged = mergeHistory(legacy, previous, NOW, NOW);
  assert.equal(merged.rejectedZeroNavDates, undefined);
  assert.equal(merged.unresolved, true);
  assert.ok(merged.warnings.includes(INVALID));
  const oldDocument = stored();
  delete oldDocument.rejectedZeroNavDates;
  const loaded = validateHistoryShard(shard(oldDocument), BUCKET).records[0];
  assert.equal(loaded.rejectedZeroNavDates, undefined);
  assert.equal(loaded.unresolved, true);
});

test('supplied malformed evidence fails the merge and immutable archive boundaries', () => {
  for (const evidence of [null, [], '2026-10-18', ['2026-02-30'], ['2026-10-18', '2026-10-18'],
    ['2026-10-19'], ['2026-10-17', '2026-10-18']]) {
    const doc = { ...stored(), rejectedZeroNavDates: evidence };
    assert.throws(() => validateHistoryShard(shard(doc), BUCKET), /rejected|zero|evidence/i);
    const incoming = { ...validateHistory(raw(), CODE), rejectedZeroNavDates: evidence };
    assert.throws(() => mergeHistory(incoming as ReturnType<typeof validateHistory>, stored(), NOW, NOW), /rejected|zero|evidence/i);
  }
  for (const warnings of [[], [INVALID, INVALID], [INVALID, 'Invalid NAV observations of unknown origin.'],
    [INVALID, 'Conflicting NAV values occur on 1 duplicate date(s); analytics are blocked.']]) {
    assert.throws(() => validateHistoryShard(shard({ ...stored(), warnings }), BUCKET), /rejected|zero|evidence/i);
  }
  const valid = validateHistoryShard(shard(stored()), BUCKET).records[0];
  assert.deepEqual(valid.rejectedZeroNavDates, ['2026-10-18']);
});

function provenance() {
  return { fetchedAt: BEFORE, archivedAt: BEFORE, fromArchive: true, stale: true,
    coverageStart: '2026-10-19', coverageEnd: '2026-10-20', observationCount: 2,
    warnings: [INVALID], rejectedZeroNavDates: ['2026-10-18'] };
}

test('archive provenance preserves validated evidence and rejects malformed metadata before warning deduplication', () => {
  const original = provenance();
  const parsed = validateArchiveProvenance(original)!;
  assert.deepEqual(parsed.rejectedZeroNavDates, ['2026-10-18']);
  assert.notEqual(parsed.rejectedZeroNavDates, original.rejectedZeroNavDates);
  assert.throws(() => validateArchiveProvenance({ ...original, rejectedZeroNavDates: ['2026-02-30'] }), /rejected|zero|evidence/i);
  assert.throws(() => validateArchiveProvenance({ ...original, warnings: [INVALID, INVALID] }), /rejected|zero|evidence/i);
  const legacy = { ...original, rejectedZeroNavDates: undefined };
  assert.equal(validateArchiveProvenance(legacy)?.rejectedZeroNavDates, undefined);
});

function sharedReader(doc: unknown) {
  const pack = (value: unknown, name: string) => {
    const json = Buffer.from(JSON.stringify(value));
    const bytes = gzipSync(json);
    return { bytes, descriptor: { path: `archive/${name}.json.gz`, bytes: bytes.length,
      expandedBytes: json.length, sha256: createHash('sha256').update(bytes).digest('hex') } };
  };
  const catalogue = pack({ version: 1, fetchedAt: NOW, warnings: [], entries: [{ schemeCode: CODE,
    schemeName: raw().meta.scheme_name, latestDate: '2026-10-20', nav: '10.10000', current: true }] }, 'catalogue');
  const history = pack(shard(doc), 'history');
  const manifest = { version: 2, source: 'mfapi.in', status: 'ready', collectionEnabled: true, sequence: 1,
    generatedAt: NOW, checkpointAt: NOW, catalogueFetchedAt: NOW, latestNavDate: '2026-10-20',
    catalogue: catalogue.descriptor, shards: { [BUCKET]: history.descriptor }, warnings: [], issues: [],
    counts: { total: 1, attempted: 1, saved: 1, clean: 0, qualityIssues: 1, sourceGaps: 0,
      pending: 0, refreshPending: 1, bulkPassComplete: true, coverageComplete: false } };
  const files = new Map<string, unknown>([['archive/manifest.json', manifest],
    [catalogue.descriptor.path, catalogue.bytes], [history.descriptor.path, history.bytes]]);
  return createSharedArchiveClient({ baseUrl: 'https://example.test/', now: () => Date.parse(NOW),
    fetch: async input => {
      const value = files.get(new URL(String(input)).pathname.slice(1));
      if (value === undefined) throw new Error('Unexpected test archive request.');
      return Buffer.isBuffer(value) ? new Response(new Uint8Array(value)) : Response.json(value);
    } });
}

test('shared archive loads exact evidence into _fundscope while legacy quality records remain unknown', async () => {
  const supplied = stored();
  const result = await sharedReader(supplied).loadFund(CODE);
  assert.deepEqual(result?._fundscope.rejectedZeroNavDates, ['2026-10-18']);
  assert.deepEqual(result?.data, POSITIVE);
  assert.equal(result?._fundscope.stale, true);
  assert.ok(result?._fundscope.warnings.includes(INVALID));
  delete supplied.rejectedZeroNavDates;
  const legacy = await sharedReader(supplied).loadFund(CODE);
  assert.equal(legacy?._fundscope.rejectedZeroNavDates, undefined);
  assert.ok(legacy?._fundscope.warnings.includes(INVALID));
});

test('shared archive refuses malformed, colliding or repeated-warning evidence', async () => {
  for (const doc of [
    { ...stored(), rejectedZeroNavDates: ['2026-02-30'] },
    { ...stored(), rejectedZeroNavDates: ['2026-10-19'] },
    { ...stored(), warnings: [INVALID, INVALID] },
  ]) await assert.rejects(sharedReader(doc).loadFund(CODE), /rejected|zero|evidence/i);
});

function workerBindings(doc: unknown): ArchiveBindings {
  return { DB: { prepare(sql: string) {
    return { bind() { return { first: async () => {
      if (sql === 'SELECT * FROM fundscope_archives WHERE scheme_code = ?') return { object_key: 'history.json' };
      if (sql === 'SELECT value FROM fundscope_state WHERE key = ?') return null;
      throw new Error('Unexpected test database query.');
    } }; } };
  } }, BUCKET: { get: async (key: string) => {
    if (key !== 'history.json') throw new Error('Unexpected test object key.');
    return { json: async () => structuredClone(doc) };
  } } } as unknown as ArchiveBindings;
}

test('Worker archive load validates and exposes optional evidence without a provider request', async () => {
  const request = new Request(`https://example.test/api/mf/${CODE}`);
  const options = { now: () => new Date(NOW), fetch: async () => { throw new Error('Provider access is forbidden in this test.'); } };
  const response = await handleRequest(request, workerBindings(stored()), options);
  assert.equal(response.status, 200);
  const fund = await response.json();
  assert.deepEqual(fund._fundscope.rejectedZeroNavDates, ['2026-10-18']);
  assert.ok(fund._fundscope.warnings.includes(INVALID));
  const malformed = { ...stored(), rejectedZeroNavDates: ['2026-10-19'] };
  const rejected = await handleRequest(request, workerBindings(malformed), options);
  assert.equal(rejected.status, 503);
});
