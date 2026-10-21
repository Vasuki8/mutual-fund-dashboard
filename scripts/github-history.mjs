#!/usr/bin/env node
// GitHub-only MFAPI archive. No Sites service credential or hosted database.
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { setTimeout as sleep } from 'node:timers/promises';
import { scheme, validateHistory } from '../server/validation.ts';

const TAG = 'fundscope-mfapi-history-v1';
const SOURCE = 'https://api.mfapi.in';
const CHUNK = 200;
const WORK_MS = 9 * 60_000;
const MAX_BODY = 32 * 1024 * 1024;
const NAME = /^nav-(\d{6})-(\d{6})-a([012])-ok(\d{3})-gap(\d{3})\.json\.gz$/;
const CATALOGUE = 'catalogue-v1.json.gz';

function requireValue(condition, code) {
  if (!condition) throw new Error(code);
}
function digest(buffer) {
  return 'sha256:' + createHash('sha256').update(buffer).digest('hex');
}
function gzip(value) {
  return gzipSync(Buffer.from(JSON.stringify(value)), { level: 9, mtime: 0 });
}
export function parseCatalogue(raw) {
  requireValue(Array.isArray(raw) && raw.length >= 10_000 && raw.length <= 100_000, 'catalogue_invalid');
  const result = new Map();
  let invalidCount = 0;
  for (const item of raw) {
    try {
      const entry = scheme(item);
      const previous = result.get(entry.schemeCode);
      requireValue(!previous || previous.schemeName === entry.schemeName, 'catalogue_conflict');
      result.set(entry.schemeCode, entry);
    } catch (error) {
      if (error.message === 'catalogue_conflict') throw error;
      invalidCount += 1;
    }
  }
  requireValue(result.size >= 10_000, 'catalogue_incomplete');
  return { entries: [...result.values()].sort((a, b) => a.schemeCode - b.schemeCode), invalidCount };
}
export function parseAssets(assets, count) {
  const found = new Map();
  for (const asset of assets) {
    if (asset.name === CATALOGUE) continue;
    const match = NAME.exec(asset.name);
    if (!match) continue;
    const [, left, right, pass, ok, gap] = match;
    const start = Number(left), end = Number(right), attempt = Number(pass);
    requireValue(start % CHUNK === 0 && end === Math.min(start + CHUNK, count) - 1
      && end >= start && (attempt === 0 ? Number(ok) + Number(gap) === end - start + 1
        : Number(ok) + Number(gap) <= end - start + 1), 'asset_name_invalid');
    requireValue(asset.state === 'uploaded' && Number.isSafeInteger(asset.id)
      && asset.size > 0 && typeof asset.browser_download_url === 'string', 'asset_unverified');
    const key = start + ':' + attempt;
    requireValue(!found.has(key), 'duplicate_asset');
    found.set(key, { ...asset, start, end, attempt, ok: Number(ok), gap: Number(gap) });
  }
  return found;
}
export function chooseWork(count, found) {
  for (let start = 0; start < count; start += CHUNK) {
    for (let pass = 1; pass <= 2; pass++) {
      const current = found.get(start + ':' + pass);
      if (!current) continue;
      const previous = found.get(start + ':' + (pass - 1));
      requireValue(!!previous && previous.gap === current.ok + current.gap, 'retry_asset_inconsistent');
    }
    if (!found.has(start + ':0')) return { start, attempt: 0, previous: null };
  }
  for (let start = 0; start < count; start += CHUNK) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const prior = found.get(start + ':' + (attempt - 1));
      if (!prior || !prior.gap) break;
      if (!found.has(start + ':' + attempt)) return { start, attempt, previous: prior };
    }
  }
  return null;
}
export function coverage(count, found) {
  let checked = 0, valid = 0, gaps = 0, unresolved = 0, exhausted = 0;
  for (let start = 0; start < count; start += CHUNK) {
    const base = found.get(start + ':0');
    if (!base) continue;
    checked += base.ok + base.gap;
    let latest = base;
    for (let i = 1; i <= 2; i++) {
      const retry = found.get(start + ':' + i);
      if (!retry) break;
      latest = retry;
    }
    valid += base.ok;
    for (let i = 1; i <= latest.attempt; i++) valid += found.get(start + ':' + i).ok;
    gaps += latest.gap;
    if (latest.gap && latest.attempt === 2) exhausted += latest.gap;
    else if (latest.gap) unresolved += latest.gap;
  }
  return { checked, valid, gaps, unresolved, exhausted,
    unattempted: count - checked, completePass: checked === count && unresolved === 0 };
}
function nameFor(start, end, attempt, ok, gap) {
  return 'nav-' + String(start).padStart(6, '0') + '-' + String(end).padStart(6, '0')
    + '-a' + attempt + '-ok' + String(ok).padStart(3, '0')
    + '-gap' + String(gap).padStart(3, '0') + '.json.gz';
}
async function readLimited(response, maximum = MAX_BODY) {
  const length = Number(response.headers.get('content-length'));
  requireValue(!Number.isFinite(length) || length <= maximum, 'response_too_large');
  let size = 0;
  const buffers = [];
  for await (const piece of response.body) {
    size += piece.byteLength;
    requireValue(size <= maximum, 'response_too_large');
    buffers.push(Buffer.from(piece));
  }
  return Buffer.concat(buffers);
}
async function sourceGet(path) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(SOURCE + path, {
      signal: AbortSignal.timeout(12_000), redirect: 'error', headers: { accept: 'application/json' },
    });
    if (response.status === 429 || [502, 503, 504].includes(response.status)) {
      const retry = Number(response.headers.get('retry-after'));
      await response.body?.cancel();
      if (attempt === 0 && (!Number.isFinite(retry) || retry <= 5)) {
        await sleep(Math.max(500, (Number.isFinite(retry) ? retry : 0) * 1000));
        continue;
      }
    }
    requireValue(response.ok, 'source_http_' + response.status);
    const data = await readLimited(response);
    try { return JSON.parse(data.toString('utf8')); } catch { throw new Error('source_json_invalid'); }
  }
  throw new Error('source_unavailable');
}
async function github(path, options = {}) {
  const response = await fetch('https://api.github.com/repos/' + process.env.GITHUB_REPOSITORY + path, {
    ...options, redirect: 'error',
    headers: { accept: 'application/vnd.github+json', authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
      'user-agent': 'FundScope-GitHub-Archive', ...(options.headers ?? {}) },
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404 && options.allow404) return null;
  requireValue(response.ok, 'github_http_' + response.status);
  const content = await readLimited(response, 2 * 1024 * 1024);
  return content.length ? JSON.parse(content.toString('utf8')) : null;
}
async function release() {
  let item = await github('/releases/tags/' + TAG, { allow404: true });
  if (item) return item;
  return github('/releases', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tag_name: TAG, name: 'FundScope MFAPI historical archive (data)',
      prerelease: true, body: 'Public historical source snapshots. Individual NAV gaps remain explicitly marked.' }) });
}
async function assetsFor(id) {
  const assets = [];
  for (let page = 1; page <= 15; page++) {
    const values = await github('/releases/' + id + '/assets?per_page=100&page=' + page);
    requireValue(Array.isArray(values), 'asset_list_invalid');
    assets.push(...values);
    if (values.length < 100) break;
  }
  requireValue(assets.length < 1500, 'too_many_assets');
  return assets;
}
async function readAsset(asset) {
  requireValue(asset.browser_download_url.startsWith('https://github.com/' + process.env.GITHUB_REPOSITORY + '/releases/download/' + TAG + '/'),
    'asset_url_invalid');
  const response = await fetch(asset.browser_download_url, { signal: AbortSignal.timeout(45_000) });
  requireValue(response.ok, 'asset_download_failed');
  const body = await readLimited(response);
  requireValue(digest(body) === asset.digest, 'asset_digest_mismatch');
  return JSON.parse(gunzipSync(body).toString('utf8'));
}
async function upload(id, name, body) {
  const url = 'https://uploads.github.com/repos/' + process.env.GITHUB_REPOSITORY
    + '/releases/' + id + '/assets?name=' + encodeURIComponent(name);
  const response = await fetch(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(90_000),
    headers: { authorization: 'Bearer ' + process.env.GITHUB_TOKEN, 'content-type': 'application/gzip',
      'user-agent': 'FundScope-GitHub-Archive', accept: 'application/vnd.github+json' }, body });
  requireValue(response.status === 201, 'upload_http_' + response.status);
  const item = JSON.parse((await readLimited(response, 2 * 1024 * 1024)).toString('utf8'));
  requireValue(item.name === name && item.size === body.length, 'upload_invalid');
  const persisted = await github('/releases/assets/' + item.id);
  requireValue(persisted.state === 'uploaded' && persisted.digest === digest(body)
    && persisted.size === body.length, 'upload_readback_invalid');
}
async function collect(entries, until) {
  const results = new Array(entries.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (cursor < entries.length) {
      const position = cursor++;
      const entry = entries[position];
      if (Date.now() > until) {
        results[position] = { code: entry.schemeCode, kind: 'gap', reason: 'work_limit' };
        continue;
      }
      try {
        const source = await sourceGet('/mf/' + entry.schemeCode);
        const parsed = validateHistory(source, entry.schemeCode);
        const warnings = parsed.warnings;
        results[position] = { code: entry.schemeCode, kind: warnings.length ? 'gap' : 'ok',
          ...(warnings.length ? { reason: 'source_quality', warnings } : {}),
          history: parsed.payload };
      } catch {
        results[position] = { code: entry.schemeCode, kind: 'gap', reason: 'source_unavailable_or_invalid' };
      }
      await sleep(150);
    }
  }));
  return results;
}
export async function main() {
  requireValue(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(process.env.GITHUB_REPOSITORY ?? '')
    && !!process.env.GITHUB_TOKEN, 'github_context_missing');
  const currentRelease = await release();
  const assetList = await assetsFor(currentRelease.id);
  let catalogAsset = assetList.find(asset => asset.name === CATALOGUE);
  if (!catalogAsset) {
    const parsed = parseCatalogue(await sourceGet('/mf/latest'));
    const body = gzip({ version: 1, source: 'mfapi.in', savedAt: new Date().toISOString(), ...parsed });
    await upload(currentRelease.id, CATALOGUE, body);
    console.log(JSON.stringify({ phase: 'catalogue', catalogueCount: parsed.entries.length,
      invalidCatalogueRows: parsed.invalidCount, readbackVerified: true, completePass: false }));
    return;
  }
  const catalogue = await readAsset(catalogAsset);
  requireValue(catalogue.version === 1 && Array.isArray(catalogue.entries)
    && catalogue.entries.length >= 10_000, 'saved_catalogue_invalid');
  const found = parseAssets(assetList, catalogue.entries.length);
  const selected = chooseWork(catalogue.entries.length, found);
  if (!selected) {
    console.log(JSON.stringify({ phase: 'complete', ...coverage(catalogue.entries.length, found),
      sourceGapsRemain: coverage(catalogue.entries.length, found).gaps > 0, readbackVerified: true }));
    return;
  }
  let entries = catalogue.entries.slice(selected.start, selected.start + CHUNK);
  if (selected.previous) {
    const previous = await readAsset(selected.previous);
    requireValue(previous.version === 1 && Array.isArray(previous.records), 'saved_chunk_invalid');
    const missing = new Set(previous.records.filter(row => row.kind === 'gap').map(row => row.code));
    requireValue(missing.size === selected.previous.gap, 'saved_chunk_count_mismatch');
    entries = entries.filter(row => missing.has(row.schemeCode));
  }
  const records = await collect(entries, Date.now() + WORK_MS);
  const ok = records.filter(row => row.kind === 'ok').length;
  const gap = records.length - ok;
  const end = Math.min(selected.start + CHUNK, catalogue.entries.length) - 1;
  const filename = nameFor(selected.start, end, selected.attempt, ok, gap);
  const body = gzip({ version: 1, source: 'mfapi.in', fetchedAt: new Date().toISOString(),
    range: [selected.start, end], attempt: selected.attempt, records });
  await upload(currentRelease.id, filename, body);
  found.set(selected.start + ':' + selected.attempt, { start: selected.start, end, attempt: selected.attempt, ok, gap });
  console.log(JSON.stringify({ phase: selected.attempt === 0 ? 'backfill' : 'retry',
    processedThisRun: records.length, cleanThisRun: ok, sourceGapsThisRun: gap,
    ...coverage(catalogue.entries.length, found), readbackVerified: true,
    asset: filename }));
}
if (import.meta.main) {
  main().catch(error => {
    const known = /^[a-z_]+(?:_\d+)?$/.test(error?.message ?? '') ? error.message : 'unexpected_error';
    console.error(JSON.stringify({ status: 'failed', reason: known, readbackVerified: false }));
    process.exitCode = 1;
  });
}
