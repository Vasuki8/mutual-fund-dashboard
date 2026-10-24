import type { Catalogue, HistoryDocument, ProviderHistory } from '../../server/types.ts';
import type { ArchiveCounts, PublicArchiveAsset, PublicArchiveManifest, ReadyArchiveManifest } from './archive-types.ts';
import type { ArchiveProvenance } from './sync-types.ts';
import type { Scheme } from './types.ts';
import { normalizeNavRecords, validSchemeCode, validateScheme } from './storage.ts';
import { validateCategoryIndex, type CategoryLookup } from './fund-directory.ts';
import { validateReturnIndex, type FundReturnLookup } from './fund-sort.ts';

const MAX_COMPRESSED = 32 * 1024 * 1024;
const MAX_EXPANDED = 64 * 1024 * 1024;
const MAX_CATALOGUE_EXPANDED = 100 * 1024 * 1024;
const MAX_MANIFEST = 2 * 1024 * 1024;
const MANIFEST_TTL = 60_000;
const HISTORY_TTL = 6 * 3600_000;
type ObjectValue = Record<string, unknown>;
export type SharedFundPayload = ProviderHistory & { _fundscope: ArchiveProvenance };

function object(value: unknown, label: string): ObjectValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid shared archive ${label}.`);
  return value as ObjectValue;
}
function timestamp(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value.slice(0, 10);
}
function date(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function integer(value: unknown, maximum = 100_000): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= maximum;
}
function messages(value: unknown, maximum = 100): string[] {
  if (!Array.isArray(value) || value.length > maximum || value.some(item => typeof item !== 'string' || item.length > 1000)) {
    throw new Error('Invalid shared archive warning fields.');
  }
  return [...new Set(value as string[])];
}
function asset(value: unknown, expandedLimit = MAX_EXPANDED): PublicArchiveAsset {
  const item = object(value, 'asset');
  if (typeof item.path !== 'string' || !/^archive\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}\.json\.gz$/.test(item.path)
    || typeof item.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(item.sha256)
    || !integer(item.bytes, MAX_COMPRESSED) || item.bytes === 0
    || !integer(item.expandedBytes, expandedLimit) || item.expandedBytes === 0) {
    throw new Error('Invalid shared archive asset path, digest or size.');
  }
  return { path: item.path, sha256: item.sha256, bytes: item.bytes, expandedBytes: item.expandedBytes };
}
function counts(value: unknown): ArchiveCounts {
  const item = object(value, 'counts');
  for (const key of ['total', 'attempted', 'saved', 'clean', 'qualityIssues', 'sourceGaps', 'pending', 'refreshPending']) {
    if (!integer(item[key])) throw new Error('Invalid shared archive counts.');
  }
  const result = item as unknown as ArchiveCounts;
  const bulkPassComplete = result.total > 0 && result.pending === 0;
  const coverageComplete = bulkPassComplete && result.saved === result.total && result.sourceGaps === 0
    && result.qualityIssues === 0 && result.refreshPending === 0;
  if (result.saved > result.attempted || result.attempted > result.total || result.pending !== result.total - result.attempted
    || result.clean !== result.saved - result.qualityIssues || result.qualityIssues > result.saved || result.sourceGaps > result.attempted
    || result.refreshPending > result.total || result.bulkPassComplete !== bulkPassComplete || result.coverageComplete !== coverageComplete) {
    throw new Error('Shared archive counts or coverage claims are inconsistent.');
  }
  return { total: result.total, attempted: result.attempted, saved: result.saved, clean: result.clean,
    qualityIssues: result.qualityIssues, sourceGaps: result.sourceGaps, pending: result.pending,
    refreshPending: result.refreshPending, bulkPassComplete, coverageComplete };
}

export function validateSharedManifest(value: unknown): PublicArchiveManifest {
  const item = object(value, 'manifest');
  if (item.version !== 2 || item.source !== 'mfapi.in' || !timestamp(item.generatedAt)) throw new Error('Invalid shared archive manifest version or timestamp.');
  if (item.status === 'disabled' || item.status === 'not-started') {
    if (typeof item.message !== 'string' || !item.message.trim() || item.message.length > 1000) throw new Error('Invalid shared archive status message.');
    return { version: 2, source: 'mfapi.in', status: item.status, generatedAt: item.generatedAt, message: item.message };
  }
  if (item.status !== 'ready' || typeof item.collectionEnabled !== 'boolean' || !integer(item.sequence, Number.MAX_SAFE_INTEGER) || item.sequence === 0
    || !timestamp(item.checkpointAt) || !timestamp(item.catalogueFetchedAt)
    || !(item.latestNavDate === null || date(item.latestNavDate))) throw new Error('Invalid shared archive checkpoint.');
  if (Date.parse(item.catalogueFetchedAt) > Date.parse(item.checkpointAt)
    || Date.parse(item.checkpointAt) > Date.parse(item.generatedAt)) throw new Error('Shared archive checkpoint timestamps are inconsistent.');
  const rawShards = object(item.shards, 'shards');
  if (Object.keys(rawShards).length > 10_000) throw new Error('Shared archive shard index exceeds its limit.');
  const shards: Record<string, PublicArchiveAsset> = {};
  for (const [bucket, value] of Object.entries(rawShards)) {
    if (!/^(0|[1-9]\d{0,12})$/.test(bucket) || !Number.isSafeInteger(Number(bucket))) throw new Error('Invalid shared archive shard bucket.');
    shards[bucket] = asset(value);
  }
  if (!Array.isArray(item.issues) || item.issues.length > 100) throw new Error('Invalid shared archive issue examples.');
  const issues = item.issues.map(value => {
    const issue = object(value, 'issue');
    if (!validSchemeCode(issue.code) || !integer(issue.attempts, Number.MAX_SAFE_INTEGER)
      || !(issue.lastAttemptAt === null || timestamp(issue.lastAttemptAt))
      || typeof issue.message !== 'string' || issue.message.length > 1000) throw new Error('Invalid shared archive issue.');
    return { code: issue.code, attempts: issue.attempts, lastAttemptAt: issue.lastAttemptAt, message: issue.message };
  });
  return { version: 2, source: 'mfapi.in', status: 'ready', collectionEnabled: item.collectionEnabled, sequence: item.sequence,
    generatedAt: item.generatedAt, checkpointAt: item.checkpointAt, catalogueFetchedAt: item.catalogueFetchedAt,
    latestNavDate: item.latestNavDate, counts: counts(item.counts), catalogue: asset(item.catalogue, MAX_CATALOGUE_EXPANDED),
    ...(item.returns === undefined ? {} : {
      returns: (() => {
        const index = asset(item.returns, MAX_CATALOGUE_EXPANDED);
        if (!/^archive\/returns-[a-f0-9]{64}\.json\.gz$/.test(index.path)
          || index.path !== `archive/returns-${index.sha256}.json.gz`) {
          throw new Error('Invalid shared return index path.');
        }
        return index;
      })(),
    }),
    ...(item.categories === undefined ? {} : {
      categories: (() => {
        const index = asset(item.categories, MAX_CATALOGUE_EXPANDED);
        if (!/^archive\/categories-[a-f0-9]{64}\.json\.gz$/.test(index.path)
          || index.path !== `archive/categories-${index.sha256}.json.gz`) {
          throw new Error('Invalid shared category index path.');
        }
        return index;
      })(),
    }), shards, issues, warnings: messages(item.warnings) };
}

function validateCatalogue(value: unknown, manifest: ReadyArchiveManifest): Catalogue {
  const item = object(value, 'catalogue');
  if (item.version !== 1 || item.fetchedAt !== manifest.catalogueFetchedAt || !Array.isArray(item.entries)
    || item.entries.length !== manifest.counts.total || item.entries.length > 100_000) throw new Error('Shared archive catalogue does not match its checkpoint.');
  const seen = new Set<number>();
  const entries = item.entries.map(value => {
    const entry = object(value, 'catalogue entry');
    const scheme = validateScheme(entry);
    if (seen.has(scheme.schemeCode)) throw new Error('Duplicate scheme identity in shared catalogue.');
    seen.add(scheme.schemeCode);
    if (!(entry.latestDate === null || date(entry.latestDate))
      || !(entry.nav === null || typeof entry.nav === 'string' && /^\d+(?:\.\d+)?$/.test(entry.nav)
        && Number.isFinite(Number(entry.nav)) && Number(entry.nav) > 0)
      || typeof entry.current !== 'boolean') throw new Error('Invalid shared catalogue NAV or current status.');
    return { ...scheme, latestDate: entry.latestDate as string | null, nav: entry.nav as string | null, current: entry.current };
  });
  return { version: 1, fetchedAt: item.fetchedAt as string, entries, warnings: messages(item.warnings) };
}

function validateShard(value: unknown, bucket: string): HistoryDocument[] {
  const item = object(value, 'history shard');
  if (item.version !== 2 || item.bucket !== bucket || !Array.isArray(item.records) || item.records.length > 32) throw new Error('Invalid shared archive shard bucket or records.');
  const seen = new Set<number>();
  return item.records.map(value => {
    const doc = object(value, 'history');
    if (doc.version !== 1 || !validSchemeCode(doc.schemeCode) || String(Math.floor(doc.schemeCode / 32)) !== bucket || seen.has(doc.schemeCode)) {
      throw new Error('Invalid or duplicate scheme identity in shared archive bucket.');
    }
    seen.add(doc.schemeCode);
    if (!timestamp(doc.fetchedAt) || !timestamp(doc.archivedAt) || !date(doc.coverageStart) || !date(doc.coverageEnd)
      || typeof doc.unresolved !== 'boolean' || Date.parse(doc.fetchedAt) > Date.parse(doc.archivedAt)) throw new Error('Invalid shared history provenance.');
    const payload = object(doc.payload, 'history payload');
    const meta = object(payload.meta, 'history metadata');
    if (payload.status !== 'SUCCESS' || meta.scheme_code !== doc.schemeCode) throw new Error('Shared history scheme identity does not match its payload.');
    validateScheme({ schemeCode: meta.scheme_code, schemeName: meta.scheme_name, isinGrowth: meta.isin_growth,
      isinDivReinvestment: meta.isin_div_reinvestment });
    for (const key of ['fund_house', 'scheme_type', 'scheme_category']) {
      if (typeof meta[key] !== 'string' || !meta[key].trim() || meta[key].length > 500) throw new Error('Invalid shared history metadata.');
    }
    const normalized = normalizeNavRecords(payload.data, 'mfapi', true);
    if (!Array.isArray(payload.data) || normalized.points.length !== payload.data.length
      || normalized.points[0].date !== doc.coverageStart || normalized.points.at(-1)!.date !== doc.coverageEnd) {
      throw new Error('Shared history count or coverage range does not match its observations.');
    }
    for (const row of payload.data) {
      const point = object(row, 'NAV observation');
      if (typeof point.nav !== 'string' || point.nav.length > 128 || !/^\d+(?:\.\d+)?$/.test(point.nav)) {
        throw new Error('Invalid shared history NAV representation.');
      }
    }
    const warnings = [...new Set([...messages(doc.warnings), ...normalized.warnings])];
    return { version: 1, schemeCode: doc.schemeCode, fetchedAt: doc.fetchedAt, archivedAt: doc.archivedAt,
      coverageStart: doc.coverageStart, coverageEnd: doc.coverageEnd, unresolved: doc.unresolved,
      warnings, payload: payload as unknown as ProviderHistory };
  });
}

async function limitedBytes(stream: ReadableStream<Uint8Array> | null, maximum: number): Promise<Uint8Array<ArrayBuffer>> {
  if (!stream) throw new Error('Shared archive response has no readable body.');
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > maximum) throw new Error('Shared archive response exceeds its size limit.');
      chunks.push(value);
    }
  } catch (error) { await reader.cancel().catch(() => undefined); throw error; }
  finally { reader.releaseLock(); }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

function defaultBase(): string {
  if (typeof window === 'undefined' || !window.location?.href) throw new Error('Shared archive is unavailable outside the website.');
  const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/mutual-fund-dashboard/';
  const url = new URL(base, window.location.href);
  if (url.origin !== window.location.origin) throw new Error('Shared archive base must have the same origin as the website.');
  return url.href;
}

export function createSharedArchiveClient(options: { baseUrl?: string; fetch?: typeof fetch; now?: () => number } = {}) {
  const now = options.now ?? Date.now;
  const request = (...args: Parameters<typeof fetch>) => (options.fetch ?? globalThis.fetch)(...args);
  let cacheBase = '';
  let manifestCache: { value: PublicArchiveManifest; at: number } | null = null;
  let manifestPending: Promise<PublicArchiveManifest> | null = null;
  const files = new Map<string, Promise<unknown>>();
  function baseUrl(): string {
    const base = options.baseUrl ?? defaultBase();
    if (cacheBase !== base) { cacheBase = base; manifestCache = null; manifestPending = null; files.clear(); }
    return base;
  }
  async function download(path: string, limit: number, signal?: AbortSignal, immutable = false) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const signals = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    try {
      const response = await request(new URL(path, baseUrl()).href, { credentials: 'omit', redirect: 'error',
        cache: immutable ? 'force-cache' : 'no-store', signal: signals });
      if (!response.ok) throw new Error(`Shared archive request failed (HTTP ${response.status}).`);
      const declared = response.headers.get('Content-Length');
      if (declared && (!/^\d+$/.test(declared) || Number(declared) > limit)) throw new Error('Shared archive response exceeds its size limit.');
      return await limitedBytes(response.body, limit);
    } finally { clearTimeout(timeout); }
  }
  async function loadManifest(settings: { force?: boolean; signal?: AbortSignal } = {}): Promise<PublicArchiveManifest> {
    baseUrl();
    if (!settings.force && manifestCache && now() - manifestCache.at >= 0 && now() - manifestCache.at < MANIFEST_TTL) return structuredClone(manifestCache.value);
    if (!settings.force && manifestPending) return structuredClone(await manifestPending);
    const pending = (async () => {
      const bytes = await download('archive/manifest.json', MAX_MANIFEST, settings.signal);
      const value = validateSharedManifest(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
      if (value.status === 'ready' && manifestCache?.value.status === 'ready' && value.sequence < manifestCache.value.sequence) {
        throw new Error('Shared archive returned an older checkpoint; previous saved data was retained.');
      }
      manifestCache = { value, at: now() };
      return value;
    })();
    manifestPending = pending;
    try { return structuredClone(await pending); }
    finally { if (manifestPending === pending) manifestPending = null; }
  }
  async function loadAsset(descriptor: PublicArchiveAsset): Promise<unknown> {
    const key = `${descriptor.sha256}:${descriptor.bytes}:${descriptor.expandedBytes}`;
    let pending = files.get(key);
    if (!pending) {
      pending = (async () => {
        const compressed = await download(descriptor.path, descriptor.bytes, undefined, true);
        if (compressed.length !== descriptor.bytes) throw new Error('Shared archive compressed size does not match its manifest.');
        const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', compressed))]
          .map(byte => byte.toString(16).padStart(2, '0')).join('');
        if (digest !== descriptor.sha256) throw new Error('Shared archive integrity digest did not match.');
        const expanded = await limitedBytes(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip')), descriptor.expandedBytes);
        if (expanded.length !== descriptor.expandedBytes) throw new Error('Shared archive expanded size does not match its manifest.');
        return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(expanded));
      })();
      files.set(key, pending);
      while (files.size > 6) files.delete(files.keys().next().value!);
    }
    try { return await pending; }
    catch (error) { if (files.get(key) === pending) files.delete(key); throw error; }
  }
  async function catalogue(manifest: ReadyArchiveManifest) { return validateCatalogue(await loadAsset(manifest.catalogue), manifest); }
  async function loadDirectory(): Promise<Scheme[] | null> {
    const manifest = await loadManifest();
    if (manifest.status !== 'ready') return null;
    const list = await catalogue(manifest);
    return list.entries.map(entry => validateScheme(entry));
  }
  async function loadCategories(): Promise<CategoryLookup | null> {
    const manifest = await loadManifest();
    if (manifest.status !== 'ready' || !manifest.categories) return null;
    const [raw, list] = await Promise.all([loadAsset(manifest.categories), catalogue(manifest)]);
    return validateCategoryIndex(raw, manifest.sequence, manifest.catalogueFetchedAt, list, manifest.counts.saved);
  }
  async function loadReturns(): Promise<FundReturnLookup | null> {
    const manifest = await loadManifest();
    if (manifest.status !== 'ready' || !manifest.returns) return null;
    const [raw, list] = await Promise.all([loadAsset(manifest.returns), catalogue(manifest)]);
    return validateReturnIndex(raw, manifest.sequence, manifest.catalogueFetchedAt,
      new Set(list.entries.map(entry => entry.schemeCode)), manifest.counts.clean);
  }
  async function loadFund(code: number): Promise<SharedFundPayload | null> {
    if (!validSchemeCode(code)) throw new Error('Invalid requested scheme code.');
    const manifest = await loadManifest();
    if (manifest.status !== 'ready') return null;
    const bucket = String(Math.floor(code / 32));
    const descriptor = manifest.shards[bucket];
    if (!descriptor) return null;
    const [histories, list] = await Promise.all([loadAsset(descriptor).then(value => validateShard(value, bucket)), catalogue(manifest)]);
    const doc = histories.find(item => item.schemeCode === code);
    if (!doc) return null;
    const entry = list.entries.find(item => item.schemeCode === code);
    if (!entry) throw new Error('Shared history scheme is absent from the verified catalogue.');
    const age = now() - Date.parse(doc.fetchedAt);
    const behind = entry.latestDate !== null && doc.coverageEnd < entry.latestDate;
    const latest = doc.payload.data.find(point => point.date.split('-').reverse().join('-') === doc.coverageEnd)!;
    const decimalIdentity = (value: string) => {
      const [whole, fraction = ''] = value.split('.');
      return `${whole.replace(/^0+(?=\d)/, '')}.${fraction.replace(/0+$/, '')}`;
    };
    const corrected = entry.latestDate === doc.coverageEnd && entry.nav !== null
      && decimalIdentity(entry.nav) !== decimalIdentity(latest.nav);
    const stale = age < 0 || age >= HISTORY_TTL || behind || corrected || doc.unresolved;
    const warnings = [...doc.warnings];
    if (behind) warnings.push(`Shared history has not yet reached catalogue NAV date ${entry.latestDate}; reconciliation is pending.`);
    if (corrected) warnings.push(`The catalogue NAV for ${entry.latestDate} differs from the saved history; source correction reconciliation is pending.`);
    if (age >= HISTORY_TTL) warnings.push(`Using the shared history retrieved ${doc.fetchedAt}. Refresh this fund to check MFAPI now.`);
    return { ...structuredClone(doc.payload), _fundscope: { fetchedAt: doc.fetchedAt, archivedAt: doc.archivedAt,
      coverageStart: doc.coverageStart, coverageEnd: doc.coverageEnd, observationCount: doc.payload.data.length,
      fromArchive: true, stale, warnings: [...new Set(warnings)] } };
  }
  async function search(query: string): Promise<Scheme[] | null> {
    const manifest = await loadManifest();
    if (manifest.status !== 'ready') return null;
    const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const list = await catalogue(manifest);
    return list.entries.filter(item => words.every(word => item.schemeName.toLocaleLowerCase().includes(word)
      || String(item.schemeCode).includes(word))).map(item => validateScheme(item));
  }
  return { loadManifest, loadFund, loadReturns, loadDirectory, loadCategories, search };
}

const sharedArchive = createSharedArchiveClient();
export const loadSharedManifest = sharedArchive.loadManifest;
export const loadSharedFund = sharedArchive.loadFund;
export const loadSharedReturnIndex = sharedArchive.loadReturns;
export const loadSharedDirectory = sharedArchive.loadDirectory;
export const loadSharedCategoryIndex = sharedArchive.loadCategories;
export const searchSharedCatalogue = sharedArchive.search;
