import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { setTimeout as sleep } from 'node:timers/promises';
import { MAX_COMPRESSED_BYTES, MAX_METADATA_EXPANDED_BYTES, MAX_SHARD_EXPANDED_BYTES,
  validateAssetRef, validateCatalogue, validateCheckpoint, validateHistoryShard,
  type ArchiveAssetRef, type ArchiveCheckpoint, type ArchiveSnapshot, type HistoryShard } from './archive-model.ts';

export const CONTROL_TAG = 'fundscope-mfapi-history-v2';
const GENERATION = /^fundscope-mfapi-v2-data-(\d{6})$/;
const MAX_API_BYTES = 4 * 1024 * 1024;

export interface ArchiveStore {
  loadSnapshot(): Promise<ArchiveSnapshot | null>;
  readAssetBytes(ref: ArchiveAssetRef): Promise<Uint8Array>;
  readShard(ref: ArchiveAssetRef, bucket: string): Promise<HistoryShard>;
  writeJSON(kind: string, value: unknown): Promise<ArchiveAssetRef>;
  commitCheckpoint(checkpoint: ArchiveCheckpoint, expectedSequence: number | null): Promise<void>;
}
interface StoreOptions {
  repository: string;
  token: string;
  fetch?: typeof fetch;
  now?: () => number;
  deadline?: number;
  generationLimit?: number;
  wait?: (milliseconds: number) => Promise<unknown>;
  onRetry?: (event: { phase: 'archive_asset_retry'; assetId: number; reason: string;
    attempt: number; delayMs: number; freshlyUploaded: boolean }) => void;
}
interface Release { id: number; tag_name: string; body: string | null }
interface Asset { id: number; name: string; size: number; state: string; digest: string; browser_download_url: string }
interface Pointer { version: 2; checkpoint: ArchiveAssetRef | null }

function requireValue(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}
export function sha256(bytes: Uint8Array): string { return createHash('sha256').update(bytes).digest('hex'); }
export async function readLimited(response: Response, maximum: number): Promise<Uint8Array> {
  const length = response.headers.get('content-length');
  if (length !== null) requireValue(/^\d+$/.test(length) && Number(length) <= maximum, 'response_size_invalid');
  requireValue(!!response.body, 'response_body_missing');
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      requireValue(size <= maximum, 'response_size_invalid'); chunks.push(chunk.value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  const result = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

export function createGitHubStore(options: StoreOptions): ArchiveStore {
  requireValue(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(options.repository)
    && !options.repository.split('/').some(part => part === '.' || part === '..'), 'repository_invalid');
  requireValue(typeof options.token === 'string' && options.token.length > 0, 'github_token_missing');
  const request = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const wait = options.wait ?? sleep;
  const deadline = options.deadline ?? Infinity;
  const generationLimit = options.generationLimit ?? 880;
  requireValue(Number.isSafeInteger(generationLimit) && generationLimit >= 2 && generationLimit < 900, 'generation_limit_invalid');
  const repository = options.repository;
  const apiBase = `https://api.github.com/repos/${repository}`;
  const headers = { Authorization: `Bearer ${options.token}`, Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28' };
  let generation: { release: Release; assets: Asset[] } | null = null;

  function signal(timeout: number): AbortSignal {
    const remaining = deadline - now(); requireValue(remaining > 0, 'work_deadline');
    return AbortSignal.timeout(Math.max(1, Math.min(timeout, Math.floor(remaining))));
  }
  async function api(path: string, init: RequestInit = {}, allow404 = false): Promise<unknown> {
    let response: Response;
    try { response = await request(`${apiBase}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) },
      redirect: 'error', signal: signal(30_000) }); }
    catch { throw new Error(now() >= deadline ? 'work_deadline' : 'github_transport'); }
    if (allow404 && response.status === 404) return null;
    requireValue(response.ok, `github_http_${response.status}`);
    try { return JSON.parse(Buffer.from(await readLimited(response, MAX_API_BYTES)).toString('utf8')); }
    catch (error) { if (error instanceof Error && /^response_/.test(error.message)) throw error; throw new Error('github_response_invalid'); }
  }
  function releaseValue(value: unknown): Release {
    const item = value as Release;
    requireValue(!!item && Number.isSafeInteger(item.id) && item.id > 0 && typeof item.tag_name === 'string'
      && (typeof item.body === 'string' || item.body === null), 'release_invalid');
    return item;
  }
  async function releaseByTag(tag: string): Promise<Release | null> {
    const value = await api(`/releases/tags/${encodeURIComponent(tag)}`, {}, true);
    if (value === null) return null;
    const release = releaseValue(value); requireValue(release.tag_name === tag, 'release_tag_invalid'); return release;
  }
  async function createRelease(tag: string, body = ''): Promise<Release> {
    try { return releaseValue(await api('/releases', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_name: tag, name: tag === CONTROL_TAG ? 'FundScope archive checkpoint' : `FundScope history storage ${tag.slice(-6)}`,
        body, prerelease: true, make_latest: 'false' }) })); }
    catch (error) { const existing = await releaseByTag(tag); if (existing) return existing; throw error; }
  }
  async function listAssets(release: Release): Promise<Asset[]> {
    const result: Asset[] = [];
    for (let page = 1; page <= 11; page++) {
      const values = await api(`/releases/${release.id}/assets?per_page=100&page=${page}`);
      requireValue(Array.isArray(values), 'assets_invalid'); result.push(...values as Asset[]);
      requireValue(result.length <= 1000, 'release_asset_limit');
      if (values.length < 100) return result;
    }
    throw new Error('release_asset_limit');
  }
  async function currentGeneration(): Promise<{ release: Release; assets: Asset[] }> {
    if (generation) return generation;
    // Listing Releases embeds every generation's asset metadata. Discover only
    // compact tag refs, then read the newest generation and its assets.
    const values = await api('/git/matching-refs/tags/fundscope-mfapi-v2-data-');
    requireValue(Array.isArray(values), 'generation_refs_invalid');
    let latestTag: string | null = null;
    for (const raw of values) {
      requireValue(!!raw && typeof raw === 'object' && typeof raw.ref === 'string', 'generation_ref_invalid');
      const match = /^refs\/tags\/(fundscope-mfapi-v2-data-\d{6})$/.exec(raw.ref);
      if (match && (!latestTag || match[1] > latestTag)) latestTag = match[1];
    }
    const tag = latestTag ?? 'fundscope-mfapi-v2-data-000001';
    // A prior run may have created the tag before its Release was saved.
    const latest = await releaseByTag(tag) ?? await createRelease(tag);
    generation = { release: latest, assets: await listAssets(latest) }; return generation;
  }
  async function rotate(current: { release: Release; assets: Asset[] }): Promise<{ release: Release; assets: Asset[] }> {
    const number = Number(GENERATION.exec(current.release.tag_name)![1]) + 1;
    requireValue(number <= 999999, 'generation_limit_reached');
    const tag = `fundscope-mfapi-v2-data-${String(number).padStart(6, '0')}`;
    const release = await releaseByTag(tag) ?? await createRelease(tag);
    generation = { release, assets: await listAssets(release) }; return generation;
  }
  function refFor(asset: Asset, release: Release, digest: string, bytes: number, expandedBytes: number): ArchiveAssetRef {
    requireValue(asset.state === 'uploaded' && asset.size === bytes && asset.digest === `sha256:${digest}`,
      'asset_metadata_invalid');
    return validateAssetRef({ id: asset.id, releaseTag: release.tag_name, name: asset.name,
      url: asset.browser_download_url, sha256: digest, bytes, expandedBytes });
  }
  async function readAssetBytesOnce(ref: ArchiveAssetRef): Promise<Uint8Array> {
    // Signed Release redirects can change between requests. Every attempt must
    // start at the canonical GitHub URL and revalidate all redirect hosts.
    let url = new URL(ref.url);
    for (let redirects = 0; redirects <= 3; redirects++) {
      requireValue(url.protocol === 'https:' && !url.port && !url.username && !url.password && !url.hash
        && (redirects === 0 ? url.hostname === 'github.com'
          : ['release-assets.githubusercontent.com', 'objects.githubusercontent.com'].includes(url.hostname)), 'asset_redirect_invalid');
      let response: Response;
      try { response = await request(url.href, { redirect: 'manual', credentials: 'omit',
        headers: { Accept: 'application/octet-stream' }, signal: signal(45_000) }); }
      catch { throw new Error(now() >= deadline ? 'work_deadline' : 'asset_transport'); }
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location'); requireValue(location && redirects < 3, 'asset_redirect_invalid');
        await response.body?.cancel(); url = new URL(location, url); continue;
      }
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        throw new Error(`asset_http_${response.status}`);
      }
      const bytes = await readLimited(response, Math.min(ref.bytes, MAX_COMPRESSED_BYTES));
      requireValue(bytes.length === ref.bytes, 'asset_size_invalid');
      requireValue(sha256(bytes) === ref.sha256, 'asset_digest_invalid'); return bytes;
    }
    throw new Error('asset_redirect_invalid');
  }
  async function readAssetBytes(value: ArchiveAssetRef, freshlyUploaded = false): Promise<Uint8Array> {
    const ref = validateAssetRef(value);
    requireValue(ref.url === `https://github.com/${repository}/releases/download/${ref.releaseTag}/${ref.name}`, 'asset_url_invalid');
    const transportDelays = [750, 1500] as const;
    const fresh404Delays = [750, 1500, 3000, 6000] as const;
    let transportRetries = 0, fresh404Retries = 0;
    for (;;) {
      try { return await readAssetBytesOnce(ref); }
      catch (error) {
        const code = error instanceof Error ? error.message : '';
        // GitHub may briefly return 404 for a just-uploaded Release asset even
        // after its authenticated metadata confirms state=uploaded. Only this
        // freshly uploaded asset gets bounded 404 retries. Older, missing
        // references still fail closed immediately. All successful GETs are
        // reverified by the exact compressed byte length and SHA-256 digest.
        let delay: number | undefined;
        if (freshlyUploaded && code === 'asset_http_404') delay = fresh404Delays[fresh404Retries++];
        else if (code === 'asset_transport' || /^asset_http_(?:408|425|500|502|503|504)$/.test(code)) {
          delay = transportDelays[transportRetries++];
        }
        // Never retry 403/429, malformed redirects, or mismatched content.
        if (delay === undefined || now() + delay + 1000 >= deadline) throw error;
        options.onRetry?.({ phase: 'archive_asset_retry', assetId: ref.id,
          reason: code, attempt: fresh404Retries + transportRetries, delayMs: delay, freshlyUploaded });
        await wait(delay);
      }
    }
  }
  async function readJSON(ref: ArchiveAssetRef, maximum = MAX_METADATA_EXPANDED_BYTES): Promise<unknown> {
    requireValue(ref.expandedBytes <= maximum, 'asset_expanded_size_invalid');
    const bytes = await readAssetBytes(ref);
    let expanded: Buffer;
    try { expanded = gunzipSync(bytes, { maxOutputLength: Math.min(ref.expandedBytes, maximum) }); }
    catch { throw new Error('asset_gzip_invalid'); }
    requireValue(expanded.length === ref.expandedBytes, 'asset_expanded_size_invalid');
    try { return JSON.parse(expanded.toString('utf8')); } catch { throw new Error('asset_json_invalid'); }
  }
  function pointer(release: Release): Pointer {
    let parsed: unknown; try { parsed = JSON.parse(release.body ?? ''); } catch { throw new Error('control_pointer_invalid'); }
    const value = parsed as Pointer;
    requireValue(!!value && value.version === 2 && 'checkpoint' in value, 'control_pointer_invalid');
    if (value.checkpoint !== null) {
      validateAssetRef(value.checkpoint);
      requireValue(value.checkpoint.name.startsWith('checkpoint-'), 'control_pointer_invalid');
    }
    return value;
  }
  async function loadSnapshot(): Promise<ArchiveSnapshot | null> {
    const release = await releaseByTag(CONTROL_TAG);
    if (!release) return null;
    const saved = pointer(release); if (!saved.checkpoint) return null;
    const candidate = await readJSON(saved.checkpoint) as ArchiveCheckpoint;
    requireValue(!!candidate && typeof candidate === 'object' && !!candidate.catalogue, 'checkpoint_invalid');
    validateAssetRef(candidate.catalogue);
    const catalogue = validateCatalogue(await readJSON(candidate.catalogue));
    const checkpoint = validateCheckpoint(candidate, catalogue); return { checkpoint, catalogue };
  }
  async function readShard(ref: ArchiveAssetRef, bucket: string): Promise<HistoryShard> {
    requireValue(ref.name.startsWith(`history-${bucket}-`), 'shard_ref_invalid');
    return validateHistoryShard(await readJSON(ref, MAX_SHARD_EXPANDED_BYTES), bucket);
  }
  async function writeJSON(kind: string, value: unknown): Promise<ArchiveAssetRef> {
    requireValue(/^(?:catalogue|checkpoint|history-\d+)$/.test(kind), 'asset_kind_invalid');
    const expanded = Buffer.from(JSON.stringify(value));
    requireValue(expanded.length > 0 && expanded.length <= (kind.startsWith('history-')
      ? MAX_SHARD_EXPANDED_BYTES : MAX_METADATA_EXPANDED_BYTES), 'asset_expanded_size_invalid');
    const bytes = gzipSync(expanded, { level: 9 });
    requireValue(bytes.length <= MAX_COMPRESSED_BYTES, 'asset_size_invalid');
    const digest = sha256(bytes); const name = `${kind}-${digest}.json.gz`;
    let current = await currentGeneration();
    for (let rotation = 0; rotation < 10; rotation++) {
      const existing = current.assets.find(asset => asset.name === name);
      // Never delete an interrupted starter or a prior generation. An uploaded
      // content-name is reusable; a reserved starter-name needs a new generation.
      if (existing?.state === 'uploaded') {
        const ref = refFor(existing, current.release, digest, bytes.length, expanded.length);
        await readAssetBytes(ref); return ref;
      }
      if (existing || current.assets.length >= generationLimit) { current = await rotate(current); continue; }
      let uploaded: Asset | undefined;
      try {
        const response = await request(`https://uploads.github.com/repos/${repository}/releases/${current.release.id}/assets?name=${encodeURIComponent(name)}`,
          { method: 'POST', redirect: 'error', headers: { ...headers, 'Content-Type': 'application/gzip' },
            body: new Uint8Array(bytes), signal: signal(90_000) });
        requireValue(response.status === 201, `github_upload_http_${response.status}`);
        uploaded = JSON.parse(Buffer.from(await readLimited(response, MAX_API_BYTES)).toString('utf8')) as Asset;
      } catch (error) {
        // The server may have committed the immutable upload before transport
        // failed. Reconcile by content-name instead of repeating progress.
        current.assets = await listAssets(current.release);
        const reconciled = current.assets.find(asset => asset.name === name);
        if (reconciled?.state === 'uploaded') uploaded = reconciled;
        else if (reconciled) { current = await rotate(current); continue; }
        else throw error instanceof Error && /^[a-z][a-z0-9_]+$/.test(error.message) ? error : new Error('github_upload_transport');
      }
      requireValue(!!uploaded && uploaded.name === name, 'asset_upload_invalid');
      const metadata = await api(`/releases/assets/${uploaded.id}`) as Asset;
      requireValue(metadata.id === uploaded.id && metadata.name === name, 'asset_metadata_invalid');
      const ref = refFor(metadata, current.release, digest, bytes.length, expanded.length);
      // A new immutable upload can be visible in metadata before its
      // canonical public download URL becomes available on GitHub's CDN.
      await readAssetBytes(ref, true);
      current.assets = [...current.assets.filter(asset => asset.id !== metadata.id), metadata]; return ref;
    }
    throw new Error('generation_rotation_limit');
  }
  async function commitCheckpoint(checkpoint: ArchiveCheckpoint, expectedSequence: number | null): Promise<void> {
    const catalogue = validateCatalogue(await readJSON(checkpoint.catalogue));
    validateCheckpoint(checkpoint, catalogue);
    requireValue(checkpoint.sequence === (expectedSequence ?? 0) + 1, 'checkpoint_sequence_invalid');
    const ref = await writeJSON('checkpoint', checkpoint);
    // Verify the saved JSON, not only GitHub's upload response.
    const savedCheckpoint = validateCheckpoint(await readJSON(ref), catalogue);
    requireValue(JSON.stringify(savedCheckpoint) === JSON.stringify(checkpoint), 'checkpoint_readback_invalid');
    const previous = await loadSnapshot();
    requireValue((previous?.checkpoint.sequence ?? null) === expectedSequence, 'checkpoint_conflict');
    const control = await releaseByTag(CONTROL_TAG)
      ?? await createRelease(CONTROL_TAG, JSON.stringify({ version: 2, checkpoint: null }));
    const currentPointer = pointer(control);
    requireValue(!!currentPointer.checkpoint === (expectedSequence !== null), 'checkpoint_conflict');
    const body = JSON.stringify({ version: 2, checkpoint: ref });
    try { await api(`/releases/${control.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) }); }
    catch (error) {
      const reconciled = await releaseByTag(CONTROL_TAG);
      if (!reconciled || pointer(reconciled).checkpoint?.sha256 !== ref.sha256) throw error;
    }
    const readback = await releaseByTag(CONTROL_TAG);
    requireValue(readback && pointer(readback).checkpoint?.sha256 === ref.sha256, 'control_readback_invalid');
    const snapshot = await loadSnapshot();
    requireValue(snapshot?.checkpoint.sequence === checkpoint.sequence
      && JSON.stringify(snapshot.checkpoint) === JSON.stringify(checkpoint), 'checkpoint_readback_invalid');
  }
  return { loadSnapshot, readAssetBytes, readShard, writeJSON, commitCheckpoint };
}
