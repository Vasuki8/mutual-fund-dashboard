import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchVerifiedCatalogue } from '../scripts/verified-catalogue.ts';
import { createSource, runTranche, safeFailure } from '../scripts/github-history-v2.ts';
import type { ArchiveStore } from '../scripts/archive-store.ts';

const NOW = Date.parse('2026-10-29T00:00:00.000Z');
const identity = { schemeCode: 100033, schemeName: 'Synthetic Growth', isinGrowth: null };
const bulk = [{ ...identity, date: '28-10-2026', nav: '10.10' }];
const list = [identity];
const SECRET = 'PRIVATE_SOURCE_TEXT_MUST_NOT_APPEAR';
type DiagnosticError = Error & { diagnostic?: Record<string, unknown> };

async function rejected(operation: Promise<unknown>): Promise<DiagnosticError> {
  try { await operation; } catch (error) { assert.ok(error instanceof Error); return error; }
  assert.fail('Expected the production validator to reject the fixture.');
}

for (const fixture of [
  { name: 'non-array bulk response', bulk: { data: bulk, secret: SECRET },
    stage: 'bulk_nav', reason: 'response_not_array' },
  { name: 'undersized bulk response', bulk: [], stage: 'bulk_nav', reason: 'row_count_out_of_range', rows: 0 },
  { name: 'malformed bulk identity', bulk: [null], stage: 'bulk_nav', reason: 'scheme_identity_invalid', rows: 1 },
  { name: 'invalid bulk code', bulk: [{ ...bulk[0], schemeCode: SECRET }],
    stage: 'bulk_nav', reason: 'scheme_code_invalid', rows: 1 },
  { name: 'invalid bulk name', bulk: [{ ...bulk[0], schemeName: SECRET.repeat(30) }],
    stage: 'bulk_nav', reason: 'scheme_name_invalid', rows: 1 },
  { name: 'invalid bulk ISIN', bulk: [{ ...bulk[0], isinGrowth: { secret: SECRET } }],
    stage: 'bulk_nav', reason: 'isin_invalid', rows: 1 },
  { name: 'duplicate bulk codes', bulk: [bulk[0], bulk[0]],
    stage: 'bulk_nav', reason: 'duplicate_scheme_code', rows: 2 },
  { name: 'non-array list response', list: { data: list, secret: SECRET },
    stage: 'membership_list', reason: 'response_not_array' },
  { name: 'undersized list response', list: [], stage: 'membership_list', reason: 'row_count_out_of_range', rows: 0 },
  { name: 'invalid list identity', list: [null], stage: 'membership_list', reason: 'scheme_identity_invalid', rows: 1 },
  { name: 'conflicting duplicate list codes', list: [identity, { ...identity, schemeName: 'Conflicting Growth' }],
    stage: 'membership_list', reason: 'duplicate_scheme_code', rows: 2 },
]) {
  test(`catalogue diagnostics identify ${fixture.name} without exposing source content`, async () => {
    const paths: string[] = [];
    const error = await rejected(fetchVerifiedCatalogue(async path => {
      paths.push(path);
      return path === '/mf/latest' ? ('bulk' in fixture ? fixture.bulk : bulk)
        : path === '/mf' ? ('list' in fixture ? fixture.list : list) : [];
    }, null, () => NOW, 1));
    assert.equal(safeFailure(error), 'source_catalogue_invalid');
    assert.equal(error.diagnostic?.stage, fixture.stage);
    assert.equal(error.diagnostic?.reason, fixture.reason);
    assert.equal(error.diagnostic?.rows, fixture.rows);
    assert.deepEqual(paths, fixture.stage === 'bulk_nav' ? ['/mf/latest'] : ['/mf/latest', '/mf']);
    assert.ok(!JSON.stringify(error.diagnostic).includes(SECRET));
  });
}

test('invalid configuration stops before any source request and has no arbitrary value in diagnostics', async () => {
  const error = await rejected(fetchVerifiedCatalogue(async () => assert.fail('No request expected'), null, () => NOW, NaN));
  assert.equal(safeFailure(error), 'source_catalogue_invalid');
  assert.deepEqual(error.diagnostic, { stage: 'configuration', reason: 'minimum_size_invalid' });
});

test('membership disagreement reports counts while retaining the membership-conflict code', async () => {
  const paths: string[] = [];
  const error = await rejected(fetchVerifiedCatalogue(async path => {
    paths.push(path); return path === '/mf/latest' ? bulk : [{ ...identity, schemeCode: 100034 }];
  }, null, () => NOW, 1));
  assert.equal(safeFailure(error), 'source_catalogue_membership_conflict');
  assert.deepEqual(error.diagnostic, { stage: 'membership_crosscheck', reason: 'bulk_codes_missing',
    listedSchemes: 1, bulkNavSchemes: 1 });
  assert.deepEqual(paths, ['/mf/latest', '/mf']);
});

test('large contraction diagnostics retain the existing known-catalogue baseline', async () => {
  const previous = { version: 1 as const, fetchedAt: new Date(NOW).toISOString(), warnings: [],
    entries: Array.from({ length: 100 }, (_, i) => ({ ...identity, schemeCode: 100033 + i,
      current: i < 90, latestDate: '2026-10-28', nav: '10.10' })) };
  const error = await rejected(fetchVerifiedCatalogue(async path => path === '/mf/latest' ? bulk
    : Array.from({ length: 81 }, (_, i) => ({ ...identity, schemeCode: 100033 + i })), previous, () => NOW, 1));
  assert.equal(safeFailure(error), 'source_catalogue_incomplete');
  assert.deepEqual(error.diagnostic, { stage: 'membership_list', reason: 'large_contraction', listedSchemes: 81, previousEntries: 100 });
});

test('unexpected validator exceptions are reduced to a static reason', async () => {
  const malicious = { ...identity, get isinGrowth() { throw new Error(SECRET); } };
  const error = await rejected(fetchVerifiedCatalogue(async () => [malicious], null, () => NOW, 1));
  assert.equal(safeFailure(error), 'source_catalogue_invalid');
  assert.deepEqual(error.diagnostic, { stage: 'bulk_nav', reason: 'validation_failed', rows: 1, previousEntries: 0 });
});

for (const tail of [{ value: { secret: SECRET }, reason: 'response_not_array', rows: undefined },
  { value: [identity], reason: 'terminal_not_empty', rows: 1 }]) {
  test(`terminal ${tail.reason} preserves the incomplete error and stops after three requests`, async () => {
    const paths: string[] = [];
    const error = await rejected(fetchVerifiedCatalogue(async path => {
      paths.push(path); return path === '/mf/latest' ? bulk : path === '/mf' ? list : tail.value;
    }, null, () => NOW, 1));
    assert.equal(safeFailure(error), 'source_catalogue_incomplete');
    assert.equal(error.diagnostic?.stage, 'terminal_probe');
    assert.equal(error.diagnostic?.reason, tail.reason);
    assert.equal(error.diagnostic?.rows, tail.rows);
    assert.deepEqual(paths, ['/mf/latest', '/mf', '/mf?limit=1&offset=1']);
  });
}

for (const fixture of [
  { name: 'malformed JSON', response: () => new Response(SECRET), reason: 'json_parse_failed' },
  { name: 'oversized body header', response: () => new Response(SECRET, { headers: { 'content-length': String(32 * 1024 * 1024 + 1) } }), reason: 'response_size_invalid' },
  { name: 'missing body', response: () => new Response(null), reason: 'response_body_missing' },
  { name: 'failed body stream', response: () => new Response(new ReadableStream({ start(controller) {
    controller.error(new Error(SECRET));
  } })), reason: 'response_read_failed' },
]) {
  test(`${fixture.name} retains the payload code with one request and a safe reason`, async () => {
    let requests = 0;
    const source = createSource({ now: () => NOW, deadline: NOW + 60_000,
      fetch: async () => { requests++; return fixture.response(); } });
    const error = await rejected(source('/mf/latest'));
    assert.equal(safeFailure(error), 'source_payload_invalid');
    assert.equal(error.diagnostic?.stage, 'bulk_nav');
    assert.equal(error.diagnostic?.reason, fixture.reason);
    assert.equal(error.diagnostic?.attempts, 1);
    assert.equal(requests, 1);
    assert.ok(!JSON.stringify(error.diagnostic).includes(SECRET));
  });
}

test('transport timeouts retain two attempts and expose no exception message', async () => {
  let requests = 0, starts = 0;
  const source = createSource({ now: () => NOW, deadline: NOW + 60_000, fetch: async () => {
    requests++; throw new DOMException(SECRET, 'TimeoutError');
  } });
  const error = await rejected(source('/mf', () => { starts++; }));
  assert.equal(safeFailure(error), 'source_transport');
  assert.deepEqual(error.diagnostic, { stage: 'membership_list', reason: 'request_timeout', attempts: 2 });
  assert.equal(requests, 2); assert.equal(starts, 1);
});

test('a deadline prevents the terminal request without claiming an HTTP attempt', async () => {
  const source = createSource({ now: () => NOW, deadline: NOW,
    fetch: async () => assert.fail('Deadline must prevent fetch') });
  const error = await rejected(source('/mf?limit=1&offset=1', () => assert.fail('No started attempt')));
  assert.equal(safeFailure(error), 'source_deadline');
  assert.deepEqual(error.diagnostic, { stage: 'terminal_probe', reason: 'deadline', attempts: 0 });
});

test('rate-limit diagnostics keep the existing status, cooldown and one-request stop', async () => {
  for (const status of [429, 503]) {
    let requests = 0;
    const source = createSource({ now: () => NOW, deadline: NOW + 60_000, fetch: async () => {
      requests++; return new Response(SECRET, { status, headers: { 'retry-after': '900', 'x-private': SECRET } });
    } });
    const error = await rejected(source('/mf')) as DiagnosticError & { retryAfterMs: number; sourceWide: boolean };
    assert.equal(safeFailure(error), `source_http_${status}`);
    assert.deepEqual(error.diagnostic, { stage: 'membership_list', reason: 'http_status', status, attempts: 1 });
    assert.equal(error.retryAfterMs, 900_000); assert.equal(error.sourceWide, true); assert.equal(requests, 1);
  }
});

const unwrittenStore: ArchiveStore = {
  loadSnapshot: async () => null,
  readAssetBytes: async () => assert.fail('No archive read expected'),
  readShard: async () => assert.fail('No shard read expected'),
  writeJSON: async () => assert.fail('Invalid catalogue must not be written'),
  commitCheckpoint: async () => assert.fail('Invalid catalogue must not advance a checkpoint'),
};

test('collector logs diagnostic context without persisting an invalid catalogue or arbitrary exceptions', async () => {
  const events: Record<string, unknown>[] = [];
  await assert.rejects(runTranche({ store: unwrittenStore, now: () => NOW, minCatalogueSize: 1,
    verifyCatalogueMembership: true, source: async () => [], log: event => { events.push(event); } }), /source_catalogue_invalid/);
  assert.deepEqual(events, [{ phase: 'catalogue', outcome: 'failed', error: 'source_catalogue_invalid',
    sourceRetryAt: null, diagnostic: { stage: 'bulk_nav', reason: 'row_count_out_of_range', rows: 0 } }]);
  events.length = 0;
  await assert.rejects(runTranche({ store: unwrittenStore, now: () => NOW, minCatalogueSize: 1,
    verifyCatalogueMembership: true, source: async () => { throw new Error(SECRET); },
    log: event => { events.push(event); } }), /source_unavailable/);
  assert.deepEqual(events, [{ phase: 'catalogue', outcome: 'failed', error: 'source_unavailable', sourceRetryAt: null }]);
});
