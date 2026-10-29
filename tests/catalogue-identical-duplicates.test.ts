import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchVerifiedCatalogue } from '../scripts/verified-catalogue.ts';
import type { Catalogue } from '../server/types.ts';

const NOW = Date.parse('2026-10-29T16:00:00.000Z');
const first = { schemeCode: 100033, schemeName: 'Synthetic First Growth',
  isinGrowth: 'INFTEST00001', isinDivReinvestment: null };
const second = { schemeCode: 100047, schemeName: 'Synthetic Second Growth',
  isinGrowth: 'INFTEST00002', isinDivReinvestment: null };
const bulk = [{ ...first, date: '29-10-2026', nav: '10.20' }];
const repeated = [first, second, { ...first }, { ...second }];
const previous: Catalogue = { version: 1, fetchedAt: '2026-10-28T08:00:00.000Z', warnings: [],
  entries: [{ ...first, current: true, latestDate: '2026-10-28', nav: '10.10' },
    { ...second, current: true, latestDate: '2026-10-27', nav: '20.00' }] };

test('identical list copies produce one current entry per code and probe the raw row boundary', async () => {
  const paths: string[] = [];
  const original = structuredClone({ previous, repeated, bulk });
  const next = await fetchVerifiedCatalogue(async path => {
    paths.push(path);
    if (path === '/mf/latest') return bulk;
    if (path === '/mf') return repeated;
    assert.equal(path, '/mf?limit=1&offset=4');
    return [];
  }, previous, () => NOW, 1);
  assert.deepEqual(paths, ['/mf/latest', '/mf', '/mf?limit=1&offset=4']);
  assert.deepEqual(next.entries.map(e => [e.schemeCode, e.current, e.latestDate, e.nav]), [
    [100033, true, '2026-10-29', '10.20'], [100047, true, '2026-10-27', '20.00'],
  ]);
  assert.deepEqual(next.membership, { source: 'mf-list', verifiedAt: '2026-10-29T16:00:00.000Z',
    listedSchemes: 2, bulkNavSchemes: 1, missingBulkNav: 1 });
  assert.ok(next.warnings.some(w => /^2 identical duplicate scheme-list rows were consolidated/.test(w)));
  assert.deepEqual({ previous, repeated, bulk }, original);
});

for (const conflict of [
  { name: 'scheme name', row: { ...first, schemeName: 'Different Growth' } },
  { name: 'Growth ISIN', row: { ...first, isinGrowth: 'INFTEST00003' } },
  { name: 'dividend-reinvestment ISIN', row: { ...first, isinDivReinvestment: 'INFTEST00004' } },
  { name: 'missing versus populated ISIN', row: { schemeCode: 100033, schemeName: first.schemeName,
    isinDivReinvestment: null } },
  { name: 'missing versus null ISIN', row: { schemeCode: 100033, schemeName: first.schemeName,
    isinGrowth: first.isinGrowth } },
]) {
  test(`a repeated code with conflicting ${conflict.name} still fails before terminal validation`, async () => {
    const paths: string[] = [];
    await assert.rejects(fetchVerifiedCatalogue(async path => {
      paths.push(path);
      return path === '/mf/latest' ? bulk : [first, conflict.row];
    }, previous, () => NOW, 1), (error: Error & { diagnostic?: { reason: string } }) => {
      assert.equal(error.message, 'source_catalogue_invalid');
      assert.equal(error.diagnostic?.reason, 'duplicate_scheme_code');
      return true;
    });
    assert.deepEqual(paths, ['/mf/latest', '/mf']);
  });
}

test('the existing empty-ISIN normalization permits equivalent unavailable identities', async () => {
  const next = await fetchVerifiedCatalogue(async path => path === '/mf/latest' ? bulk
    : path === '/mf' ? [first, { ...first, isinDivReinvestment: '   ' }] : [],
  previous, () => NOW, 1);
  assert.equal(next.membership?.listedSchemes, 1);
  assert.equal(next.entries.find(e => e.schemeCode === 100033)?.isinDivReinvestment, null);
});

test('duplicate rows cannot satisfy the minimum unique scheme count', async () => {
  const paths: string[] = [];
  await assert.rejects(fetchVerifiedCatalogue(async path => {
    paths.push(path);
    return path === '/mf/latest' ? [...bulk, { ...second, date: '29-10-2026', nav: '20.10' }]
      : [first, { ...first }];
  }, null, () => NOW, 2), (error: Error & { diagnostic?: Record<string, unknown> }) => {
    assert.equal(error.message, 'source_catalogue_invalid');
    assert.equal(error.diagnostic?.reason, 'row_count_out_of_range');
    assert.equal(error.diagnostic?.listedSchemes, 1);
    return true;
  });
  assert.deepEqual(paths, ['/mf/latest', '/mf']);
});

test('duplicate copies cannot hide a contraction of more than ten percent', async () => {
  const entries = Array.from({ length: 100 }, (_, i) => ({ schemeCode: 100033 + i,
    schemeName: `Synthetic ${i}`, current: true, latestDate: '2026-10-28', nav: '10.00' }));
  const saved: Catalogue = { ...previous, entries };
  const listing = entries.slice(0, 89).map(({ schemeCode, schemeName }) => ({ schemeCode, schemeName }));
  const paths: string[] = [];
  await assert.rejects(fetchVerifiedCatalogue(async path => {
    paths.push(path);
    return path === '/mf/latest' ? [{ ...listing[0], date: '29-10-2026', nav: '10.10' }]
      : [...listing, ...structuredClone(listing)];
  }, saved, () => NOW, 1), /source_catalogue_incomplete/);
  assert.deepEqual(paths, ['/mf/latest', '/mf']);
  assert.equal(saved.entries.length, 100);
});

for (const terminal of [null, {}, [second]]) {
  test(`a ${Array.isArray(terminal) ? 'nonempty' : terminal === null ? 'null' : 'wrapped'} terminal response cannot certify a duplicated list`, async () => {
    const paths: string[] = [];
    await assert.rejects(fetchVerifiedCatalogue(async path => {
      paths.push(path);
      if (path === '/mf/latest') return bulk;
      if (path === '/mf') return repeated;
      assert.equal(path, '/mf?limit=1&offset=4');
      return terminal;
    }, previous, () => NOW, 1), /source_catalogue_incomplete/);
    assert.deepEqual(paths, ['/mf/latest', '/mf', '/mf?limit=1&offset=4']);
  });
}
