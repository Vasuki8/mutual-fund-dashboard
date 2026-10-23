import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyArchiveBytes, writeUnavailableManifest, assertPagesBudget, materializeSnapshot, publishArchive } from '../scripts/publish-archive.ts';
import { calculateCounts, pendingState } from '../scripts/archive-model.ts';
import { buildCatalogue, mergeHistory, validateHistory } from '../server/validation.ts';
import { createSharedArchiveClient } from '../src/lib/shared-archive.ts';

function asset(value: unknown) {
  const raw = Buffer.from(JSON.stringify(value));
  const bytes = gzipSync(raw);
  return { bytes, ref: { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length,
    expandedBytes: raw.length } };
}

test('Pages publication verifies compressed digest and expanded byte count before parsing', () => {
  const { bytes, ref } = asset({ history: ['kept'] });
  assert.deepEqual(verifyArchiveBytes(bytes, ref), { history: ['kept'] });
  assert.throws(() => verifyArchiveBytes(bytes, { ...ref, sha256: 'a'.repeat(64) }), /digest/i);
  assert.throws(() => verifyArchiveBytes(bytes, { ...ref, bytes: ref.bytes + 1 }), /size/i);
  assert.throws(() => verifyArchiveBytes(bytes, { ...ref, expandedBytes: ref.expandedBytes + 1 }), /expanded/i);
});

test('oversize decompression is rejected even when compressed input is tiny', () => {
  const { bytes, ref } = asset({ value: 'x'.repeat(10_000) });
  assert.throws(() => verifyArchiveBytes(bytes, ref, 100), /expanded|limit/i);
});

test('an absent archive writes an explicit zero-claim status under the existing Pages base', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fundscope-publish-'));
  try {
    await writeUnavailableManifest(directory, false, '2026-10-21T12:00:00.000Z');
    const disabled = JSON.parse(await readFile(join(directory, 'archive/manifest.json'), 'utf8'));
    assert.equal(disabled.status, 'disabled');
    assert.equal(disabled.version, 2);
    assert.equal(disabled.counts, undefined);
    await writeUnavailableManifest(directory, true, '2026-10-21T12:01:00.000Z');
    const pending = JSON.parse(await readFile(join(directory, 'archive/manifest.json'), 'utf8'));
    assert.equal(pending.status, 'not-started');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('Pages budget counts the complete application and archive without silently dropping files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fundscope-budget-'));
  try {
    await mkdir(join(directory, 'archive'));
    await writeFile(join(directory, 'index.html'), 'x'.repeat(40));
    await writeFile(join(directory, 'archive/history.json.gz'), 'x'.repeat(80));
    assert.equal(await assertPagesBudget(directory, 120), 120);
    await assert.rejects(assertPagesBudget(directory, 119), /budget/i);
    assert.equal((await readFile(join(directory, 'archive/history.json.gz'))).length, 80);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

function snapshotFixture() {
  const now = '2026-10-21T10:00:00.000Z';
  const stored = new Map<string, Uint8Array>();
  let id = 1;
  function store(kind: string, value: unknown) {
    const { bytes, ref } = asset(value);
    const name = `${kind}-${ref.sha256}.json.gz`;
    stored.set(name, bytes);
    return { ...ref, id: id++, name, releaseTag: 'fundscope-mfapi-v2-data-000001',
      url: `https://github.com/Vasuki8/mutual-fund-dashboard/releases/download/fundscope-mfapi-v2-data-000001/${name}` };
  }
  const catalogue = buildCatalogue([
    { schemeCode: 100000, schemeName: 'Synthetic Growth', date: '20-10-2026', nav: '10.1000' },
    { schemeCode: 100032, schemeName: 'Synthetic Pending', date: '20-10-2026', nav: '20.0000' },
  ], null, [], now);
  const history = mergeHistory(validateHistory({ status: 'SUCCESS', meta: { scheme_code: 100000,
    scheme_name: 'Synthetic Growth', fund_house: 'Synthetic', scheme_type: 'Open Ended', scheme_category: 'Equity' },
    data: [{ date: '20-10-2026', nav: '10.1000' }, { date: '19-10-2026', nav: '10.0000' }] }, 100000), null, now, now);
  const states = { '100000': { ...pendingState(100000), status: 'clean', attempts: 1,
    lastAttemptAt: now, historyFetchedAt: now, coverageStart: history.coverageStart,
    coverageEnd: history.coverageEnd, latestNav: history.payload.data[0].nav, observationCount: 2 }, '100032': pendingState(100032) };
  const checkpoint = { version: 2, source: 'mfapi.in', sequence: 7, updatedAt: now,
    catalogueFetchedAt: now, catalogueSlot: '2026-10-21T07:00:00.000Z',
    catalogue: store('catalogue', catalogue),
    shards: { '3125': store('history-3125', { version: 2, bucket: '3125', records: [history] }) },
    states, counts: calculateCounts(catalogue, states, Date.parse(now)), lastCatalogueError: null, sourceRetryAt: null };
  return { snapshot: { catalogue, checkpoint }, stored,
    readAssetBytes: async (ref: { name: string }) => {
      const bytes = stored.get(ref.name);
      if (!bytes) throw new Error('Missing saved asset');
      return bytes;
    } };
}

test('a verified snapshot publishes every history and honest partial coverage in one same-origin manifest', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fundscope-snapshot-'));
  try {
    const fixture = snapshotFixture();
    const manifest = await materializeSnapshot({ ...fixture, outputDirectory: directory,
      now: '2026-10-21T10:01:00.000Z' });
    assert.equal(manifest.sequence, 7);
    assert.equal(manifest.counts.saved, 1);
    assert.equal(manifest.counts.pending, 1);
    assert.equal(manifest.counts.coverageComplete, false);
    assert.equal(manifest.catalogueFetchedAt, fixture.snapshot.catalogue.fetchedAt);
    assert.equal(manifest.checkpointAt, fixture.snapshot.checkpoint.updatedAt);
    assert.ok(manifest.catalogue.path.startsWith('archive/catalogue-'));
    assert.ok(manifest.shards['3125'].path.startsWith('archive/history-3125-'));
    assert.ok(manifest.returns?.path.startsWith('archive/returns-'), 'The complete return index is published once per checkpoint.');
    assert.ok(manifest.categories?.path.startsWith('archive/categories-'),
      'Every saved source category must be published without excluding IDCW/quality histories.');
    const categoryIndex = verifyArchiveBytes(
      await readFile(join(directory,manifest.categories!.path)),manifest.categories!,100*1024*1024
    ) as {sequence:number;entries:{schemeCode:number;schemeCategory:string}[]};
    assert.equal(categoryIndex.sequence,manifest.sequence);
    assert.deepEqual(categoryIndex.entries,[{schemeCode:100000,schemeCategory:'Equity'}]);
    assert.ok(!categoryIndex.entries.some(x=>x.schemeCode===100032),
      'A pending fund must not be assigned an invented category.');
    const sortIndex = verifyArchiveBytes(await readFile(join(directory, manifest.returns!.path)), manifest.returns!, 100 * 1024 * 1024) as {sequence:number;entries:{schemeCode:number;oneYear:number|null}[]};
    assert.equal(sortIndex.sequence, manifest.sequence);
    assert.equal((sortIndex as typeof sortIndex & {version:number}).version, 2);
    assert.deepEqual(sortIndex.entries.map(entry=>entry.schemeCode), [100000]);
    assert.equal(sortIndex.entries[0].oneYear,null, 'Two observations within one month cannot support a one-year return.');
    assert.ok(Object.prototype.hasOwnProperty.call(sortIndex.entries[0], 'threeYearMaxDrawdown'));
    assert.equal((sortIndex.entries[0] as typeof sortIndex.entries[0] & {threeYearMaxDrawdown:number|null})
      .threeYearMaxDrawdown,null, 'Do not label a shorter observed drawdown as a full 3Y maximum.');
    const bytes = await readFile(join(directory, manifest.shards['3125'].path));
    const decoded = verifyArchiveBytes(bytes, manifest.shards['3125']);
    assert.equal(decoded.records[0].payload.data.length, 2);
    assert.deepEqual(JSON.parse(await readFile(join(directory, 'archive/manifest.json'), 'utf8')), manifest);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('a missing or mismatched shard cannot replace the previous public manifest', async () => {
  for (const failure of ['missing', 'summary', 'digest']) {
    const directory = await mkdtemp(join(tmpdir(), 'fundscope-invalid-snapshot-'));
    try {
      await mkdir(join(directory, 'archive'));
      await writeFile(join(directory, 'archive/manifest.json'), 'previous verified deployment');
      const fixture = snapshotFixture();
      if (failure === 'missing') fixture.stored.delete(fixture.snapshot.checkpoint.shards['3125'].name);
      if (failure === 'summary') fixture.snapshot.checkpoint.states['100000'].observationCount = 3;
      if (failure === 'digest') fixture.stored.set(fixture.snapshot.checkpoint.shards['3125'].name, new Uint8Array([1, 2, 3]));
      await assert.rejects(materializeSnapshot({ ...fixture, outputDirectory: directory,
        now: '2026-10-21T10:01:00.000Z' }), /missing|mismatch|size/i);
      assert.equal(await readFile(join(directory, 'archive/manifest.json'), 'utf8'), 'previous verified deployment');
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
});

test('an oversize snapshot stops publication without dropping history or advertising completion', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fundscope-large-snapshot-'));
  try {
    const fixture = snapshotFixture();
    await assert.rejects(materializeSnapshot({ ...fixture, outputDirectory: directory,
      maxTotalBytes: 100, now: '2026-10-21T10:01:00.000Z' }), /budget/i);
    await assert.rejects(readFile(join(directory, 'archive/manifest.json')), { code: 'ENOENT' });
    assert.equal(fixture.stored.size, 2);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('pausing imports retains an existing verified archive during a UI deployment', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fundscope-paused-archive-'));
  try {
    const fixture = snapshotFixture();
    const manifest = await publishArchive({ store: { loadSnapshot: async () => fixture.snapshot,
      readAssetBytes: fixture.readAssetBytes }, enabled: false, outputDirectory: directory,
    now: '2026-10-21T10:01:00.000Z' });
    assert.equal(manifest?.status, 'ready');
    assert.equal(manifest?.collectionEnabled, false);
    assert.equal(manifest?.counts.saved, 1);
    assert.equal(JSON.parse(await readFile(join(directory, 'archive/manifest.json'), 'utf8')).sequence, 7);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('a failed archive read cannot be converted into a disabled empty deployment', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fundscope-read-failure-'));
  try {
    await mkdir(join(directory, 'archive'));
    await writeFile(join(directory, 'archive/manifest.json'), 'previous verified deployment');
    await assert.rejects(publishArchive({ store: { loadSnapshot: async () => { throw new Error('github_transport'); },
      readAssetBytes: async () => { throw new Error('unexpected asset read'); } }, enabled: false,
    outputDirectory: directory }), /github_transport/);
    assert.equal(await readFile(join(directory, 'archive/manifest.json'), 'utf8'), 'previous verified deployment');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('published compressed files load through the real Pages reader with matching coverage and pending identities', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fundscope-browser-snapshot-'));
  try {
    const fixture = snapshotFixture();
    await materializeSnapshot({ ...fixture, outputDirectory: directory, collectionEnabled: true,
      now: '2026-10-21T10:01:00.000Z' });
    const client = createSharedArchiveClient({ baseUrl: 'https://fundscope.example/mutual-fund-dashboard/',
      now: () => Date.parse('2026-10-21T10:02:00.000Z'), fetch: async (input, init) => {
        const url = new URL(String(input));
        assert.equal(url.origin, 'https://fundscope.example');
        assert.equal(init?.credentials, 'omit');
        assert.equal(init?.redirect, 'error');
        assert.ok(url.pathname.startsWith('/mutual-fund-dashboard/archive/'));
        return new Response(await readFile(join(directory, url.pathname.slice('/mutual-fund-dashboard/'.length))));
      } });
    const fund = await client.loadFund(100000);
    assert.equal(fund?.meta.scheme_code, 100000);
    assert.equal(fund?._fundscope.observationCount, 2);
    assert.equal(fund?._fundscope.coverageStart, '2026-10-19');
    assert.equal(fund?._fundscope.stale, false);
    assert.equal(await client.loadFund(100032), null);
    assert.equal((await client.search('Synthetic'))?.length, 2);
    assert.deepEqual(await client.loadDirectory(),[
      {schemeCode:100000,schemeName:'Synthetic Growth'},
      {schemeCode:100032,schemeName:'Synthetic Pending'},
    ],'Empty-search browse includes the complete catalogue, not only starter examples.');
    assert.deepEqual(await client.loadCategories(),{100000:'Equity'},
      'Category metadata loads without full history requests and excludes pending schemes.');
    assert.deepEqual(Object.keys((await client.loadReturns()) ?? {}).map(Number),[100000],
      'The public site can rank the full verified population from one small asset.');
    const manifest = await client.loadManifest();
    assert.equal(manifest.status, 'ready');
    assert.equal(manifest.collectionEnabled, true);
    assert.equal(manifest.counts.coverageComplete, false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
