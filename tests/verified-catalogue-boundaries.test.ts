import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchVerifiedCatalogue } from '../scripts/verified-catalogue.ts';
import { createSource } from '../scripts/github-history-v2.ts';
import type { Catalogue } from '../server/types.ts';

const NOW = Date.parse('2026-10-27T08:00:00.000Z');
const entry = (i: number) => ({ schemeCode: 100000 + i, schemeName: `Synthetic ${i}` });
const previous: Catalogue = { version: 1, fetchedAt: new Date(NOW - 1000).toISOString(), warnings: [],
  entries: Array.from({ length: 100 }, (_, i) => ({ ...entry(i), current: true,
    latestDate: '2026-10-26', nav: '10.50' })) };
const bulk = [{ ...entry(0), date: '26-10-2026', nav: '10.50' }];

test('an apparently terminal list with more than ten percent missing is rejected without touching saved data', async () => {
  const original = structuredClone(previous), paths: string[] = [];
  await assert.rejects(fetchVerifiedCatalogue(async path => {
    paths.push(path);
    return path === '/mf/latest' ? bulk : Array.from({ length: 89 }, (_, i) => entry(i));
  }, previous, () => NOW, 1), /source_catalogue_incomplete/);
  assert.deepEqual(paths, ['/mf/latest', '/mf']);
  assert.deepEqual(previous, original);
});

test('the ten-percent contraction boundary preserves unlisted histories but does not mark them current', async () => {
  const next = await fetchVerifiedCatalogue(async path => path === '/mf/latest' ? bulk
    : path === '/mf' ? Array.from({ length: 90 }, (_, i) => entry(i)) : [], previous, () => NOW, 1);
  assert.equal(next.entries.length, 100);
  assert.equal(next.entries.filter(e => e.current).length, 90);
  assert.equal(next.entries[99].nav, '10.50');
  assert.equal(next.entries[99].latestDate, '2026-10-26');
  assert.equal(next.entries[99].current, false);
  assert.equal(next.membership?.missingBulkNav, 89);
});

test('null, object and nonempty terminal responses never certify membership', async () => {
  for (const terminal of [null, {}, { data: [] }, [entry(1)]]) {
    await assert.rejects(fetchVerifiedCatalogue(async path => path === '/mf/latest' ? bulk
      : path === '/mf' ? [entry(0)] : terminal, null, () => NOW, 1), /source_catalogue_incomplete/);
  }
});

test('the existing transport deadline blocks a terminal probe rather than extending the catalogue budget', async () => {
  let clock = NOW;
  const paths: string[] = [];
  const source = createSource({ now: () => clock, deadline: NOW + 1000,
    fetch: (async input => {
      const path = new URL(String(input)).pathname; paths.push(path);
      if (path === '/mf/latest') return Response.json(bulk);
      clock = NOW + 1000;
      return Response.json([entry(0)]);
    }) as typeof fetch });
  await assert.rejects(fetchVerifiedCatalogue(source, null, () => clock, 1), /source_deadline/);
  assert.deepEqual(paths, ['/mf/latest', '/mf']);
});
