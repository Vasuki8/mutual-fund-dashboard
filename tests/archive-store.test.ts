import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { createGitHubStore, CONTROL_TAG } from '../scripts/archive-store.ts';
import { runTranche } from '../scripts/github-history-v2.ts';

const repository = 'Vasuki8/mutual-fund-dashboard';
type Asset = { id: number; name: string; size: number; state: string; digest: string; browser_download_url: string; body: Uint8Array };
class GitHubFixture {
  releases: { id: number; tag_name: string; body: string; assets: Asset[] }[] = [];
  extraRefs = new Set<string>();
  requests: string[] = [];
  binaryRequests: string[] = [];
  // Inject transient or permanent read errors at GitHub or its redirected asset CDN.
  binaryFailures: { host: string; status: number }[] = [];
  nextId = 1;
  uploadLost = false;
  corruptBinary = false;
  corruptNewCheckpoint = false;
  corruptId = 0;
  losePatchResponse = false;
  redirectTo: string | null = null;
  patchCount = 0;
  releaseResponse(release: GitHubFixture['releases'][number]) {
    return { ...release, assets: release.assets.map(({ body, ...metadata }) => metadata) };
  }
  readonly fetch = async (input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const method = init.method ?? 'GET';
    const headers = new Headers(init.headers);
    if (['api.github.com', 'uploads.github.com'].includes(url.hostname)) assert.equal(headers.get('Authorization'), 'Bearer test-token');
    else assert.equal(headers.has('Authorization'), false, 'binary redirects must never receive GitHub credentials');
    const base = `/repos/${repository}/releases`;
    if (url.hostname === 'api.github.com') {
      this.requests.push(`${method} ${url.pathname}`);
      if (url.pathname === `/repos/${repository}/git/matching-refs/tags/fundscope-mfapi-v2-data-`) {
        const refs = new Set([...this.extraRefs, ...this.releases.map(release => `refs/tags/${release.tag_name}`)]);
        return Response.json([...refs].reverse().map(ref => ({ ref, object: { type: 'commit', sha: 'a'.repeat(40) } })));
      }
      // Real Release responses contain nested asset metadata, including lists.
      // Omitting it conceals the generation-discovery response-size problem.
      if (url.pathname === base && method === 'GET') return Response.json(this.releases.map(release => this.releaseResponse(release)));
      if (url.pathname === base && method === 'POST') {
        const raw = JSON.parse(String(init.body));
        const release = { id: this.nextId++, tag_name: raw.tag_name, body: raw.body ?? '', assets: [] as Asset[] };
        this.releases.push(release); return Response.json(this.releaseResponse(release), { status: 201 });
      }
      if (url.pathname.startsWith(`${base}/tags/`)) {
        const release = this.releases.find(entry => entry.tag_name === decodeURIComponent(url.pathname.split('/').at(-1)!));
        return Response.json(release ? this.releaseResponse(release) : {}, { status: release ? 200 : 404 });
      }
      const assetMatch = new RegExp(`^${base}/assets/(\\d+)$`).exec(url.pathname);
      if (assetMatch) {
        const asset = this.releases.flatMap(release => release.assets).find(entry => entry.id === Number(assetMatch[1]));
        return Response.json(asset ?? {}, { status: asset ? 200 : 404 });
      }
      const match = new RegExp(`^${base}/(\\d+)(/assets)?$`).exec(url.pathname);
      if (match) {
        const release = this.releases.find(entry => entry.id === Number(match[1]))!;
        if (match[2]) {
          const page = Number(url.searchParams.get('page') ?? 1);
          return Response.json(release.assets.slice((page - 1) * 100, page * 100).map(({ body, ...asset }) => asset));
        }
        if (method === 'PATCH') {
          this.patchCount++; release.body = JSON.parse(String(init.body)).body;
          if (this.losePatchResponse) { this.losePatchResponse = false; throw new TypeError('lost patch response'); }
        }
        return Response.json(this.releaseResponse(release));
      }
    }
    if (url.hostname === 'uploads.github.com') {
      const release = this.releases.find(entry => entry.id === Number(url.pathname.split('/').at(-2)))!;
      const name = url.searchParams.get('name')!;
      if (release.assets.some(asset => asset.name === name)) return Response.json({}, { status: 422 });
      const body = new Uint8Array(init.body as Uint8Array);
      const asset: Asset = { id: this.nextId++, name, size: body.length, state: 'uploaded',
        digest: `sha256:${createHash('sha256').update(body).digest('hex')}`,
        browser_download_url: `https://github.com/${repository}/releases/download/${release.tag_name}/${name}`, body };
      release.assets.push(asset);
      if (this.corruptNewCheckpoint && name.startsWith('checkpoint-')) this.corruptId = asset.id;
      if (this.uploadLost) { this.uploadLost = false; throw new TypeError('lost upload response'); }
      return Response.json(asset, { status: 201 });
    }
    if (url.hostname === 'github.com') {
      this.binaryRequests.push(url.hostname);
      const failureIndex = this.binaryFailures.findIndex(failure => failure.host === url.hostname);
      if (failureIndex >= 0) return new Response(null, { status: this.binaryFailures.splice(failureIndex, 1)[0].status });
      const asset = this.releases.flatMap(release => release.assets).find(entry => entry.browser_download_url === url.href)!;
      return new Response(null, { status: 302, headers: { Location: this.redirectTo ?? `https://release-assets.githubusercontent.com/${asset.id}` } });
    }
    if (url.hostname === 'release-assets.githubusercontent.com') {
      this.binaryRequests.push(url.hostname);
      const failureIndex = this.binaryFailures.findIndex(failure => failure.host === url.hostname);
      if (failureIndex >= 0) return new Response(null, { status: this.binaryFailures.splice(failureIndex, 1)[0].status });
      const asset = this.releases.flatMap(release => release.assets).find(entry => entry.id === Number(url.pathname.slice(1)))!;
      return new Response(this.corruptBinary || this.corruptId === asset.id ? new Uint8Array([0, 1]) : asset.body);
    }
    throw new Error(`Unexpected test endpoint: ${url.hostname} ${url.pathname}`);
  };
}

test('immutable uploads are verified and reused after a lost successful response', async () => {
  const fixture = new GitHubFixture(); fixture.uploadLost = true;
  const store = createGitHubStore({ repository, token: 'test-token', fetch: fixture.fetch });
  const first = await store.writeJSON('catalogue', { rows: [1, 2, 3] });
  const again = await store.writeJSON('catalogue', { rows: [1, 2, 3] });
  assert.deepEqual(again, first);
  assert.equal(fixture.releases.flatMap(release => release.assets).length, 1);
  assert.ok((await store.readAssetBytes(first)).length > 0);
  assert.equal(fixture.patchCount, 0);
});

test('generation rotation retains old assets without crossing its configured cap', async () => {
  const fixture = new GitHubFixture();
  const store = createGitHubStore({ repository, token: 'test-token', fetch: fixture.fetch, generationLimit: 2 });
  const first = await store.writeJSON('catalogue', { rows: [1] });
  await store.writeJSON('catalogue', { rows: [2] });
  const third = await store.writeJSON('catalogue', { rows: [3] });
  assert.notEqual(first.releaseTag, third.releaseTag);
  assert.ok(fixture.releases.every(release => release.assets.length <= 2));
  assert.ok((await store.readAssetBytes(first)).length > 0);
});

test('corrupt readback rejects the upload and leaves the control pointer untouched', async () => {
  const fixture = new GitHubFixture(); fixture.corruptBinary = true;
  const store = createGitHubStore({ repository, token: 'test-token', fetch: fixture.fetch });
  await assert.rejects(store.writeJSON('catalogue', { rows: [1] }), /asset_(size|digest)/);
  assert.equal(fixture.patchCount, 0);
  assert.equal(await store.loadSnapshot(), null);
});

test('malformed control pointers and wrong repository URLs fail before public downloads', async () => {
  const fixture = new GitHubFixture();
  const store = createGitHubStore({ repository, token: 'test-token', fetch: fixture.fetch });
  const ref = await store.writeJSON('catalogue', { rows: [1] });
  await assert.rejects(store.readAssetBytes({ ...ref, url: ref.url.replace(repository, 'other/repository') }), /asset_url/);
  fixture.releases.push({ id: fixture.nextId++, tag_name: CONTROL_TAG, body: '{invalid', assets: [] });
  await assert.rejects(store.loadSnapshot(), /control_pointer/);
});

const source = async (path: string, onStart?: () => void) => {
  onStart?.();
  return path === '/mf/latest'
  ? [{ schemeCode: 118955, schemeName: 'Test fund', date: '21-10-2026', nav: '10.10' }]
  : { status: 'SUCCESS', meta: { scheme_code: 118955, scheme_name: 'Test fund', fund_house: 'Test', scheme_type: 'Open', scheme_category: 'Equity' },
    data: [{ date: '21-10-2026', nav: '10.10' }, { date: '20-10-2026', nav: '10.00' }] };
};

test('a complete verified checkpoint survives generation rotation and a lost pointer response', async () => {
  const fixture = new GitHubFixture(); fixture.losePatchResponse = true;
  const store = createGitHubStore({ repository, token: 'test-token', fetch: fixture.fetch, generationLimit: 2 });
  const result = await runTranche({ store, source, now: () => Date.parse('2026-10-21T08:00:00Z'), minCatalogueSize: 1 });
  assert.equal(result.changed, true); assert.equal(result.counts!.saved, 1);
  assert.equal((await store.loadSnapshot())!.checkpoint.sequence, 1);
  assert.equal(fixture.patchCount, 1);
  assert.equal(fixture.releases.filter(release => release.tag_name !== CONTROL_TAG).length, 2);
});

test('failed immutable checkpoint readback preserves the previous public pointer', async () => {
  const fixture = new GitHubFixture();
  const store = createGitHubStore({ repository, token: 'test-token', fetch: fixture.fetch });
  await runTranche({ store, source, now: () => Date.parse('2026-10-21T08:00:00Z'), minCatalogueSize: 1 });
  const control = fixture.releases.find(release => release.tag_name === CONTROL_TAG)!;
  const previousBody = control.body;
  fixture.corruptNewCheckpoint = true;
  await assert.rejects(runTranche({ store, source, now: () => Date.parse('2026-10-21T20:00:00Z'), minCatalogueSize: 1 }), /asset_(size|digest)/);
  assert.equal(control.body, previousBody);
  assert.equal((await store.loadSnapshot())!.checkpoint.sequence, 1);
  fixture.corruptId = 0; fixture.corruptNewCheckpoint = false;
  const restarted = await runTranche({ store, source, now: () => Date.parse('2026-10-21T20:00:00Z'), minCatalogueSize: 1 });
  assert.equal(restarted.sequence, 2);
  assert.equal((await store.loadSnapshot())!.checkpoint.states[118955].attempts, 1);
});

test('a reserved starter upload rotates safely without deleting the uncertain asset', async () => {
  const fixture = new GitHubFixture();
  const firstStore = createGitHubStore({ repository, token: 'test-token', fetch: fixture.fetch });
  const old = await firstStore.writeJSON('catalogue', { rows: [1] });
  const oldAsset = fixture.releases.flatMap(release => release.assets).find(asset => asset.id === old.id)!;
  oldAsset.state = 'starter';
  const resumed = createGitHubStore({ repository, token: 'test-token', fetch: fixture.fetch });
  const saved = await resumed.writeJSON('catalogue', { rows: [1] });
  assert.notEqual(saved.releaseTag, old.releaseTag);
  assert.equal(oldAsset.state, 'starter');
  assert.equal(fixture.releases.flatMap(release => release.assets).length, 2);
});

test('binary redirects reject unexpected ports before forwarding a request', async () => {
  const fixture = new GitHubFixture();
  const store = createGitHubStore({ repository, token: 'test-token', fetch: fixture.fetch });
  const ref = await store.writeJSON('catalogue', { rows: [1] });
  fixture.redirectTo = `https://release-assets.githubusercontent.com:444/${ref.id}`;
  await assert.rejects(store.readAssetBytes(ref), /asset_redirect_invalid/);
});

test('generation discovery uses compact exact tag refs despite oversized historical Release metadata', async () => {
  const fixture = new GitHubFixture();
  for (let number = 1; number <= 4; number++) {
    const tag = `fundscope-mfapi-v2-data-${String(number).padStart(6, '0')}`;
    const release = { id: fixture.nextId++, tag_name: tag, body: 'Retained history generation', assets: [] as Asset[] };
    for (let index = 0; index < 880; index++) {
      const id = fixture.nextId++; const name = `history-${index}-${'a'.repeat(64)}.json.gz`;
      const uploader: Record<string, string | number | boolean> = { login: 'github-actions[bot]', id: 41898282, type: 'Bot', site_admin: false };
      for (const field of ['avatar_url', 'url', 'html_url', 'followers_url', 'following_url', 'gists_url', 'starred_url',
        'subscriptions_url', 'organizations_url', 'repos_url', 'events_url', 'received_events_url']) {
        uploader[field] = `https://api.github.com/users/github-actions%5Bbot%5D/${field}`;
      }
      release.assets.push({ id, name, size: 10, state: 'uploaded', digest: `sha256:${'a'.repeat(64)}`,
        browser_download_url: `https://github.com/${repository}/releases/download/${tag}/${name}`, body: new Uint8Array(),
        ...{ url: `https://api.github.com/repos/${repository}/releases/assets/${id}`, content_type: 'application/gzip',
          label: 'Immutable validated MFAPI archive shard', created_at: '2026-10-21T08:00:00Z', updated_at: '2026-10-21T08:00:00Z', uploader } });
    }
    fixture.releases.push(release);
  }
  const latestTag = 'fundscope-mfapi-v2-data-000010';
  fixture.releases.push({ id: fixture.nextId++, tag_name: latestTag, body: '', assets: [] });
  fixture.extraRefs.add('refs/tags/fundscope-mfapi-v2-data-999999-backup');
  fixture.extraRefs.add('refs/heads/fundscope-mfapi-v2-data-999999');
  const allReleases = JSON.stringify(fixture.releases.map(release => fixture.releaseResponse(release)));
  assert.ok(Buffer.byteLength(allReleases) > 4 * 1024 * 1024, 'fixture must reproduce the prior 4 MiB discovery overflow');
  const oldIds = fixture.releases.slice(0, 4).map(release => release.assets.map(asset => asset.id));
  const store = createGitHubStore({ repository, token: 'test-token', fetch: fixture.fetch });
  const saved = await store.writeJSON('catalogue', { rows: [1] });
  assert.equal(saved.releaseTag, latestTag);
  assert.ok(fixture.requests.includes(`GET /repos/${repository}/git/matching-refs/tags/fundscope-mfapi-v2-data-`));
  assert.equal(fixture.requests.includes(`GET /repos/${repository}/releases`), false);
  const listed = fixture.requests.filter(path => /\/releases\/\d+\/assets$/.test(path));
  assert.deepEqual(listed, [`GET /repos/${repository}/releases/${fixture.releases.at(-1)!.id}/assets`]);
  assert.deepEqual(fixture.releases.slice(0, 4).map(release => release.assets.map(asset => asset.id)), oldIds);
});

test('the highest generation tag without a Release gets a Release without replacing older data', async () => {
  const fixture = new GitHubFixture();
  const initial = createGitHubStore({ repository, token: 'test-token', fetch: fixture.fetch });
  const previous = await initial.writeJSON('catalogue', { rows: [1] });
  fixture.extraRefs.add('refs/tags/fundscope-mfapi-v2-data-000042');
  const resumed = createGitHubStore({ repository, token: 'test-token', fetch: fixture.fetch });
  const saved = await resumed.writeJSON('catalogue', { rows: [2] });
  assert.equal(saved.releaseTag, 'fundscope-mfapi-v2-data-000042');
  assert.ok(fixture.releases.some(release => release.tag_name === saved.releaseTag));
  assert.ok((await resumed.readAssetBytes(previous)).length > 0);
  assert.equal(fixture.requests.includes(`GET /repos/${repository}/releases`), false);
});


test('a transient GitHub asset CDN 502 retries a safe GET from the canonical URL without re-uploading', async () => {
  const fixture = new GitHubFixture();
  fixture.binaryFailures.push({ host: 'release-assets.githubusercontent.com', status: 502 });
  const waits: number[] = [];
  const store = createGitHubStore({
    repository, token: 'test-token', fetch: fixture.fetch,
    wait: async milliseconds => { waits.push(milliseconds); },
  });
  const reference = await store.writeJSON('catalogue', { rows: [1, 2, 3] });
  assert.ok((await store.readAssetBytes(reference)).length > 0);
  assert.deepEqual(waits, [750]);
  assert.deepEqual(fixture.binaryRequests.slice(0, 4),
    ['github.com', 'release-assets.githubusercontent.com', 'github.com', 'release-assets.githubusercontent.com'],
    'An expiring signed CDN redirect must be refreshed from the original URL.');
  assert.equal(fixture.releases.flatMap(release => release.assets).length, 1);
  assert.equal(fixture.patchCount, 0);
});

test('two transient asset-host errors allow three verified reads without changing the archive identity', async () => {
  const fixture = new GitHubFixture();
  fixture.binaryFailures.push(
    { host: 'github.com', status: 503 },
    { host: 'release-assets.githubusercontent.com', status: 502 },
  );
  const waits: number[] = [];
  const store = createGitHubStore({
    repository, token: 'test-token', fetch: fixture.fetch,
    wait: async milliseconds => { waits.push(milliseconds); },
  });
  const reference = await store.writeJSON('catalogue', { rows: [1] });
  assert.equal(reference.id, fixture.releases[0].assets[0].id);
  assert.deepEqual(waits, [750, 1500]);
  assert.deepEqual(fixture.binaryRequests.slice(0, 5),
    ['github.com', 'github.com', 'release-assets.githubusercontent.com', 'github.com', 'release-assets.githubusercontent.com']);
  assert.equal(fixture.releases.flatMap(release => release.assets).length, 1);
});

test('persistent asset 502 stops after three GET attempts and a fresh runner reuses the uploaded bytes', async () => {
  const fixture = new GitHubFixture();
  fixture.binaryFailures.push(...Array.from({ length: 3 }, () => ({ host: 'release-assets.githubusercontent.com', status: 502 })));
  const waits: number[] = [];
  const store = createGitHubStore({
    repository, token: 'test-token', fetch: fixture.fetch,
    wait: async milliseconds => { waits.push(milliseconds); },
  });
  await assert.rejects(store.writeJSON('catalogue', { rows: [1] }), /asset_http_502/);
  assert.deepEqual(waits, [750, 1500]);
  assert.equal(fixture.binaryRequests.filter(host => host === 'release-assets.githubusercontent.com').length, 3);
  assert.equal(fixture.releases.flatMap(release => release.assets).length, 1);
  assert.equal(fixture.patchCount, 0, 'A failed readback must not publish a checkpoint.');

  // A resumed GitHub Actions runner discovers and verifies the same immutable asset.
  const resumed = createGitHubStore({ repository, token: 'test-token', fetch: fixture.fetch });
  const ref = await resumed.writeJSON('catalogue', { rows: [1] });
  assert.equal(ref.id, fixture.releases[0].assets[0].id);
  assert.equal(fixture.releases.flatMap(release => release.assets).length, 1);
});

test('HTTP 403/429 and corrupt binaries never enter the asset retry loop', async () => {
  for (const status of [403, 429]) {
    const fixture = new GitHubFixture();
    fixture.binaryFailures.push({ host: 'release-assets.githubusercontent.com', status });
    const waits: number[] = [];
    const store = createGitHubStore({
      repository, token: 'test-token', fetch: fixture.fetch,
      wait: async milliseconds => { waits.push(milliseconds); },
    });
    await assert.rejects(store.writeJSON('catalogue', { rows: [1] }), new RegExp('asset_http_' + status));
    assert.deepEqual(waits, [], 'Permanent or throttling responses must not be retried immediately.');
    assert.equal(fixture.binaryRequests.filter(host => host === 'release-assets.githubusercontent.com').length, 1);
    assert.equal(fixture.patchCount, 0);
  }
  const fixture = new GitHubFixture();
  fixture.corruptBinary = true;
  const waits: number[] = [];
  const store = createGitHubStore({
    repository, token: 'test-token', fetch: fixture.fetch,
    wait: async milliseconds => { waits.push(milliseconds); },
  });
  await assert.rejects(store.writeJSON('catalogue', { rows: [1] }), /asset_(size|digest)_invalid/);
  assert.deepEqual(waits, [], 'Checksum and length mismatches still fail closed.');
});

test('fresh Release asset 404 retries safely after verified upload metadata', async () => {
  const fixture = new GitHubFixture();
  fixture.binaryFailures.push({ host: 'github.com', status: 404 },
    { host: 'release-assets.githubusercontent.com', status: 404 });
  const waits: number[] = [];
  const events: { reason: string; assetId: number; attempt: number; delayMs: number;
    freshlyUploaded: boolean }[] = [];
  const store = createGitHubStore({
    repository, token: 'test-token', fetch: fixture.fetch,
    wait: async milliseconds => { waits.push(milliseconds); },
    onRetry: event => { events.push(event); },
  });
  const ref = await store.writeJSON('catalogue', { rows: [11, 22] });
  assert.equal(ref.id, fixture.releases[0].assets[0].id);
  assert.deepEqual(waits, [750, 1500]);
  assert.deepEqual(fixture.binaryRequests, [
    'github.com', 'github.com', 'release-assets.githubusercontent.com',
    'github.com', 'release-assets.githubusercontent.com',
  ], 'Each retry must restart at canonical GitHub URL, not reuse an expired redirect.');
  assert.deepEqual(events.map(e => [e.reason, e.assetId, e.attempt, e.delayMs, e.freshlyUploaded]), [
    ['asset_http_404', ref.id, 1, 750, true],
    ['asset_http_404', ref.id, 2, 1500, true],
  ]);
  assert.equal(fixture.releases.flatMap(release => release.assets).length, 1);
  assert.equal(fixture.patchCount, 0);
  assert.ok((await store.readAssetBytes(ref)).length > 0);
});

test('permanent fresh 404 stops after five reads and leaves the control pointer untouched', async () => {
  const fixture = new GitHubFixture();
  fixture.binaryFailures.push(...Array.from({ length: 5 },
    () => ({ host: 'release-assets.githubusercontent.com', status: 404 })));
  const waits: number[] = [];
  const store = createGitHubStore({
    repository, token: 'test-token', fetch: fixture.fetch,
    wait: async milliseconds => { waits.push(milliseconds); },
  });
  await assert.rejects(store.writeJSON('catalogue', { rows: [12] }), /asset_http_404/);
  assert.deepEqual(waits, [750, 1500, 3000, 6000]);
  assert.equal(fixture.binaryRequests.filter(host => host === 'release-assets.githubusercontent.com').length, 5);
  assert.equal(fixture.releases.flatMap(release => release.assets).length, 1);
  assert.equal(fixture.patchCount, 0);
  // A later root reconciles the same immutable content by name, without upload
  // duplication or unverified sequence changes.
  const resumed = createGitHubStore({ repository, token: 'test-token', fetch: fixture.fetch });
  const ref = await resumed.writeJSON('catalogue', { rows: [12] });
  assert.equal(ref.id, fixture.releases[0].assets[0].id);
  assert.equal(fixture.releases.flatMap(release => release.assets).length, 1);
});

test('404 for previously uploaded references is not treated as eventual consistency', async () => {
  const fixture = new GitHubFixture();
  const initial = createGitHubStore({ repository, token: 'test-token', fetch: fixture.fetch });
  const ref = await initial.writeJSON('catalogue', { rows: [30] });
  fixture.binaryFailures.push({ host: 'release-assets.githubusercontent.com', status: 404 });
  const waits: number[] = [];
  const resumed = createGitHubStore({ repository, token: 'test-token', fetch: fixture.fetch,
    wait: async milliseconds => { waits.push(milliseconds); } });
  await assert.rejects(resumed.readAssetBytes(ref), /asset_http_404/);
  assert.deepEqual(waits, [], 'Missing older data must be reported immediately.');
  assert.equal(fixture.patchCount, 0);
});

test('fresh asset 404 does not delay after the archive work deadline', async () => {
  const fixture = new GitHubFixture();
  fixture.binaryFailures.push({ host: 'release-assets.githubusercontent.com', status: 404 });
  const waits: number[] = [];
  const now = 1000;
  const store = createGitHubStore({ repository, token: 'test-token', fetch: fixture.fetch,
    now: () => now, deadline: now + 1600, wait: async milliseconds => { waits.push(milliseconds); } });
  await assert.rejects(store.writeJSON('catalogue', { rows: [50] }), /asset_http_404/);
  assert.deepEqual(waits, []);
  assert.equal(fixture.patchCount, 0);
});

test('asset retries do not sleep past the existing work deadline', async () => {
  const fixture = new GitHubFixture();
  fixture.binaryFailures.push({ host: 'release-assets.githubusercontent.com', status: 502 });
  const waits: number[] = [];
  const now = 1000;
  const store = createGitHubStore({
    repository, token: 'test-token', fetch: fixture.fetch, now: () => now, deadline: now + 1600,
    wait: async milliseconds => { waits.push(milliseconds); },
  });
  await assert.rejects(store.writeJSON('catalogue', { rows: [1] }), /asset_http_502/);
  assert.deepEqual(waits, [], 'No retry begins without at least a one-second deadline reserve.');
});
