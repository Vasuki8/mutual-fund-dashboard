import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { runTranche, createSource } from '../scripts/github-history-v2.ts';
import { validateCatalogue, validateCheckpoint, validateHistoryShard, calculateCounts,
  type ArchiveAssetRef, type ArchiveCheckpoint, type ArchiveSnapshot } from '../scripts/archive-model.ts';
import type { ArchiveStore } from '../scripts/archive-store.ts';
import type { Catalogue } from '../server/types.ts';
import { isActiveRepairCandidate } from '../scripts/active-repair-scope.ts';

const NOW = Date.parse('2026-10-27T08:00:00.000Z');
const low = 100033, high = 145536;
type Options = Parameters<typeof runTranche>[0] & { verifyCatalogueMembership?: boolean };
const run = (options: Options) => runTranche(options);
const latest = (codes = [low, high]) => codes.map(schemeCode => ({
  schemeCode, schemeName: `Synthetic ${schemeCode}`, date: '26-10-2026', nav: '10.10',
}));
const identities = (codes = [low, high]) => codes.map(schemeCode => ({
  schemeCode, schemeName: `Synthetic ${schemeCode}`, isinGrowth: null,
}));
class MemoryStore implements ArchiveStore {
  snapshot: ArchiveSnapshot | null = null;
  assets = new Map<string, unknown>();
  async loadSnapshot() { return structuredClone(this.snapshot); }
  async readAssetBytes(ref: ArchiveAssetRef) { return gzipSync(Buffer.from(JSON.stringify(this.assets.get(ref.sha256)))); }
  async readShard(ref: ArchiveAssetRef, bucket: string) {
    return validateHistoryShard(structuredClone(this.assets.get(ref.sha256)), bucket);
  }
  async writeJSON(kind: string, value: unknown) {
    const json = Buffer.from(JSON.stringify(value)), body = gzipSync(json);
    const sha256 = createHash('sha256').update(body).digest('hex');
    const name = `${kind}-${sha256}.json.gz`;
    const ref: ArchiveAssetRef = { id: this.assets.size + 1,
      releaseTag: 'fundscope-mfapi-v2-data-000001', name, sha256, bytes: body.length, expandedBytes: json.length,
      url: `https://github.com/Vasuki8/mutual-fund-dashboard/releases/download/fundscope-mfapi-v2-data-000001/${name}` };
    this.assets.set(sha256, structuredClone(value)); return ref;
  }
  async commitCheckpoint(checkpoint: ArchiveCheckpoint, expectedSequence: number | null) {
    assert.equal(this.snapshot?.checkpoint.sequence ?? null, expectedSequence);
    const catalogue = structuredClone(this.assets.get(checkpoint.catalogue.sha256)) as Catalogue;
    validateCheckpoint(checkpoint, catalogue);
    this.snapshot = { checkpoint: structuredClone(checkpoint), catalogue };
  }
}
async function seed() {
  const store = new MemoryStore();
  await run({ store, now: () => NOW, minCatalogueSize: 1, source: async (path, onStart) => {
    onStart?.();
    if (path === '/mf/latest') return latest();
    const code = Number(path.split('/').at(-1));
    return { status: 'SUCCESS', meta: { scheme_code: code, scheme_name: `Synthetic ${code}`,
      fund_house: 'Synthetic AMC', scheme_type: 'Open Ended', scheme_category: 'Debt' },
      data: [{ date: '26-10-2026', nav: '10.10' }, { date: '23-10-2026', nav: code === high ? '1.00' : '10.00' }] };
  } });
  return store;
}
async function replaceCatalogue(store: MemoryStore, edit: (catalogue: Catalogue) => void) {
  const catalogue = structuredClone(store.snapshot!.catalogue); edit(catalogue);
  const checkpoint = structuredClone(store.snapshot!.checkpoint);
  checkpoint.catalogue = await store.writeJSON('catalogue', catalogue);
  checkpoint.counts = calculateCounts(catalogue, checkpoint.states, NOW);
  validateCheckpoint(checkpoint, catalogue); store.snapshot = { checkpoint, catalogue };
}
function metadataSource(requests: string[], list = identities(), bulk = latest([low]), tail: unknown = []) {
  return async (path: string) => {
    requests.push(path);
    if (path === '/mf/latest') return bulk;
    if (path === '/mf') return list;
    if (path === `/mf?limit=1&offset=${list.length}`) return tail;
    throw new Error('Unexpected history or source request');
  };
}

test('a fresh complete scheme list restores an omitted recent code without changing any saved NAV or quality flags', async () => {
  const store = await seed();
  await replaceCatalogue(store, c => { c.entries.find(e => e.schemeCode === high)!.current = false; });
  const before = structuredClone(store.snapshot!);
  const requests: string[] = [];
  const result = await run({ store, now: () => NOW + 1000, minCatalogueSize: 1,
    activeRepairOnly: true, verifyCatalogueMembership: true, source: metadataSource(requests) });
  assert.deepEqual(requests, ['/mf/latest', '/mf', '/mf?limit=1&offset=2']);
  assert.equal(result.attempted, 0, 'Metadata recovery does not claim history repairs or bypass quality retry backoff.');
  const recovered = store.snapshot!.catalogue.entries.find(e => e.schemeCode === high)!;
  assert.equal(recovered.current, true);
  assert.equal(recovered.latestDate, before.catalogue.entries[1].latestDate);
  assert.equal(recovered.nav, before.catalogue.entries[1].nav);
  assert.equal(isActiveRepairCandidate(recovered, NOW), true);
  assert.deepEqual(store.snapshot!.checkpoint.states, before.checkpoint.states);
  assert.deepEqual(store.snapshot!.checkpoint.shards, before.checkpoint.shards);
  assert.equal(result.counts?.qualityIssues, before.checkpoint.counts.qualityIssues);
  assert.ok(store.snapshot!.catalogue.warnings.some(w => /bulk.*retained/i.test(w)));
  assert.deepEqual((store.snapshot!.catalogue as Catalogue & { membership?: unknown }).membership, {
    source: 'mf-list', verifiedAt: new Date(NOW + 1000).toISOString(), listedSchemes: 2,
    bulkNavSchemes: 1, missingBulkNav: 1,
  });
  const repeat = await run({ store, now: () => NOW + 2000, minCatalogueSize: 1,
    activeRepairOnly: true, verifyCatalogueMembership: true,
    source: async () => { throw new Error('Verified same-slot catalogue must be cached.'); } });
  assert.equal(repeat.changed, false);
});

test('an incomplete listing cannot replace the prior catalogue or falsely deactivate its missing tail', async () => {
  const store = await seed(), before = structuredClone(store.snapshot!);
  const requests: string[] = [];
  const result = await run({ store, now: () => NOW + 1000, minCatalogueSize: 1,
    activeRepairOnly: true, verifyCatalogueMembership: true,
    source: metadataSource(requests, identities([low]), latest([low]), identities([high])) });
  assert.equal(result.lastCatalogueError, 'source_catalogue_incomplete');
  assert.deepEqual(store.snapshot!.catalogue, before.catalogue);
  assert.deepEqual(store.snapshot!.checkpoint.catalogue, before.checkpoint.catalogue);
  assert.deepEqual(store.snapshot!.checkpoint.states, before.checkpoint.states);
  assert.equal(result.attempted, 0);
});

test('listing membership does not create missing NAVs or make stale or future dates eligible', async () => {
  const store = await seed();
  await replaceCatalogue(store, c => {
    const e = c.entries.find(x => x.schemeCode === high)!;
    e.current = false; e.latestDate = '2026-09-26';
  });
  const requests: string[] = [];
  await run({ store, now: () => NOW + 1000, minCatalogueSize: 1,
    activeRepairOnly: true, verifyCatalogueMembership: true,
    source: metadataSource(requests, identities([low, high, 119436, 100047]),
      [...latest([low]), { ...latest([100047])[0], date: '28-10-2026' }]) });
  const entries = store.snapshot!.catalogue.entries;
  const missing = entries.find(e => e.schemeCode === 119436)!;
  assert.equal(missing.current, true);
  assert.equal(missing.nav, null); assert.equal(missing.latestDate, null);
  assert.equal(isActiveRepairCandidate(missing, NOW), false);
  assert.equal(isActiveRepairCandidate(entries.find(e => e.schemeCode === high)!, NOW), false);
  assert.equal(isActiveRepairCandidate(entries.find(e => e.schemeCode === 100047)!, NOW), false);
  assert.equal(store.snapshot!.checkpoint.states[119436].attempts, 0);
  assert.equal(store.snapshot!.checkpoint.states[100047].attempts, 0);
});

test('a genuinely unlisted code stays non-current while its observations and warning state are retained', async () => {
  const store = await seed(), before = structuredClone(store.snapshot!);
  await run({ store, now: () => NOW + 1000, minCatalogueSize: 1,
    activeRepairOnly: true, verifyCatalogueMembership: true,
    source: metadataSource([], identities([low])) });
  const e = store.snapshot!.catalogue.entries.find(x => x.schemeCode === high)!;
  assert.equal(e.current, false);
  assert.equal(isActiveRepairCandidate(e, NOW), false);
  assert.deepEqual(store.snapshot!.checkpoint.states[high], before.checkpoint.states[high]);
  assert.deepEqual(store.snapshot!.checkpoint.shards, before.checkpoint.shards);
});

test('duplicate identities and bulk codes absent from the independently checked list fail before a first publication', async () => {
  for (const list of [identities([low, low]), identities([high])]) {
    const store = new MemoryStore();
    await assert.rejects(run({ store, now: () => NOW, minCatalogueSize: 1,
      activeRepairOnly: true, verifyCatalogueMembership: true,
      source: metadataSource([], list) }), /source_catalogue_(invalid|membership_conflict)/);
    assert.equal(store.snapshot, null); assert.equal(store.assets.size, 0);
  }
});

test('a rate limit during membership verification keeps the catalogue and honors the existing global cooldown', async () => {
  const store = await seed(), before = structuredClone(store.snapshot!);
  const requests: string[] = [];
  const source = createSource({ now: () => NOW + 1000, deadline: NOW + 60_000,
    fetch: (async input => {
      const path = new URL(String(input)).pathname; requests.push(path);
      return path === '/mf/latest' ? Response.json(latest([low]))
        : new Response('', { status: 429, headers: { 'Retry-After': '900' } });
    }) as typeof fetch });
  const result = await run({ store, now: () => NOW + 1000, minCatalogueSize: 1,
    activeRepairOnly: true, verifyCatalogueMembership: true, source });
  assert.deepEqual(requests, ['/mf/latest', '/mf']);
  assert.equal(result.lastCatalogueError, 'source_http_429');
  assert.equal(result.sourceRetryAt, new Date(NOW + 901_000).toISOString());
  assert.deepEqual(store.snapshot!.catalogue, before.catalogue);
  assert.deepEqual(store.snapshot!.checkpoint.states, before.checkpoint.states);
});

test('source transport permits only the exact bounded list and terminal-probe paths', async () => {
  const requests: string[] = [];
  const source = createSource({ now: () => NOW, deadline: NOW + 60_000,
    fetch: (async (input, init) => {
      requests.push(String(input));
      assert.equal(init?.credentials, 'omit'); assert.equal(init?.redirect, 'error');
      assert.deepEqual(init?.headers, { Accept: 'application/json' });
      return Response.json([]);
    }) as typeof fetch });
  for (const path of ['/mf', '/mf?limit=1&offset=37998']) await source(path);
  for (const path of ['/mf?limit=1&offset=-1', '/mf?limit=1&offset=100001',
    '/mf?limit=1&offset=037998', '/mf?limit=1000&offset=0', '/mf?limit=1&offset=2&url=evil',
    'https://example.com/mf', '//example.com/mf']) await assert.rejects(source(path), /source_path_invalid/);
  assert.equal(requests.length, 2);
});

test('optional membership provenance is validated rather than trusted as an arbitrary migration marker', () => {
  const catalogue: Catalogue = { version: 1, fetchedAt: new Date(NOW).toISOString(),
    entries: [{ schemeCode: low, schemeName: 'Synthetic', current: true, nav: '10', latestDate: '2026-10-26' }], warnings: [] };
  assert.deepEqual(validateCatalogue(catalogue), catalogue, 'Legacy catalogues remain readable.');
  const valid = { source: 'mf-list', verifiedAt: catalogue.fetchedAt,
    listedSchemes: 1, bulkNavSchemes: 1, missingBulkNav: 0 };
  assert.doesNotThrow(() => validateCatalogue({ ...catalogue, membership: valid }));
  for (const membership of [null, {}, { ...valid, source: 'unverified' },
    { ...valid, listedSchemes: 2 }, { ...valid, missingBulkNav: 1 },
    { ...valid, bulkNavSchemes: -1 }, { ...valid, verifiedAt: '2026-10-26T08:00:00.000Z' }])
    assert.throws(() => validateCatalogue({ ...catalogue, membership }), /catalogue_membership_invalid/);
});
