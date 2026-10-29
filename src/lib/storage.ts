import type { FundData, FundMeta, FundNote, NavPoint, ResearchSettings, Scheme } from './types.ts';
import { validateArchiveProvenance } from './provenance.ts';
import { validateRejectedZeroNavDates } from './nav-quality-evidence.ts';

const DATABASE = 'fundscope-research-v1';
const SETTINGS_KEY = 'fundscope:settings:v1';
const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
const MAX_FUNDS = 500;
const MAX_POINTS = 20_000;
const MAX_TOTAL_POINTS = 500_000;
const MAX_SEARCHES = 200;
// Only this generated counter can be replaced by rechecking the stored NAVs.
// Unrecognized discontinuity messages and invalid/conflicting evidence survive.
const GENERATED_DISCONTINUITY_WARNING = /^Unresolved discontinuity: \d+ single-observation move\(s\) exceed 40%; derived analytics are blocked\.$/;
export const MAX_FUND_NOTES = 120;
export const MAX_FUND_NOTE_LENGTH = 3000;

type JsonObject = Record<string, unknown>;
export interface SearchCache { schemes: Scheme[]; fetchedAt: string }
interface FundRecord { code: number; fund: FundData }
interface SearchRecord extends SearchCache { query: string }

const funds = new Map<number, FundData>();
const searches = new Map<string, SearchCache>();
let settingsMemory: ResearchSettings | undefined;
let databasePromise: Promise<IDBDatabase | null> | undefined;
let memoryOnly = false;
let settingsPersistenceWarning: string | null = null;
let storageGeneration = 0;
let restoreBarrier: Promise<void> | null = null;
let mutationTail: Promise<void> = Promise.resolve();
const activeTransactions = new Map<IDBTransaction, number>();

export class StorageGenerationError extends Error {
  constructor() {
    super('This request was superseded by a backup restore.');
    this.name = 'StorageGenerationError';
  }
}

export function getStorageGeneration(): number { return storageGeneration; }

export function assertStorageGeneration(generation: number): void {
  if (generation !== storageGeneration) throw new StorageGenerationError();
}

async function storageReady(generation: number): Promise<void> {
  assertStorageGeneration(generation);
  const pendingRestore = restoreBarrier;
  if (pendingRestore) await pendingRestore;
  assertStorageGeneration(generation);
}

function mutate<T>(action: () => Promise<T>): Promise<T> {
  const operation = mutationTail.then(action);
  mutationTail = operation.then(() => undefined, () => undefined);
  return operation;
}

function clone<T>(value: T): T { return structuredClone(value); }
function object(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${label}.`);
  return value as JsonObject;
}
function text(value: unknown, label: string, maximum = 500): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) throw new Error(`Invalid ${label}.`);
  return value;
}
function isin(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return value;
  // MFAPI uses blank strings for unavailable optional ISINs, as on the server.
  if (typeof value === 'string' && value.length <= 64 && !value.trim()) return null;
  return text(value, 'ISIN', 64);
}
export function validSchemeCode(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export function validateScheme(value: unknown): Scheme {
  const item = object(value, 'scheme');
  if (!validSchemeCode(item.schemeCode)) throw new Error('Invalid scheme code.');
  const scheme: Scheme = { schemeCode: item.schemeCode, schemeName: text(item.schemeName, 'scheme name') };
  if (item.isinGrowth !== undefined) scheme.isinGrowth = isin(item.isinGrowth);
  if (item.isinDivReinvestment !== undefined) scheme.isinDivReinvestment = isin(item.isinDivReinvestment);
  return scheme;
}

function validateMeta(value: unknown): FundMeta {
  const item = object(value, 'fund metadata');
  return { ...validateScheme(item), fundHouse: text(item.fundHouse, 'fund house metadata'),
    schemeType: text(item.schemeType, 'scheme type metadata'), schemeCategory: text(item.schemeCategory, 'scheme category metadata') };
}

function isoCalendarDate(value: unknown, format: 'iso' | 'mfapi'): string | null {
  if (typeof value !== 'string') return null;
  const match = format === 'iso' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!match) return null;
  const year = Number(match[format === 'iso' ? 1 : 3]);
  const month = Number(match[2]);
  const day = Number(match[format === 'iso' ? 3 : 1]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

function timestamp(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
      || !isoCalendarDate(value.slice(0, 10), 'iso') || !Number.isFinite(Date.parse(value))
      || new Date(value).toISOString().slice(0, 10) !== value.slice(0, 10)) {
    throw new Error(`Invalid ${label} timestamp.`);
  }
  return value;
}

export function normalizeNavRecords(raw: unknown, format: 'iso' | 'mfapi', strict = false): {
  points: NavPoint[]; warnings: string[]; rejectedZeroNavDates?: string[];
} {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('Invalid NAV history: no observations are available.');
  if (raw.length > MAX_POINTS) throw new Error('NAV history exceeds the observation limit.');
  const values = new Map<string, Set<number>>();
  let invalid = 0;
  let duplicate = 0;
  const rejectedZeros = new Set<string>();
  let completeZeroEvidence = true;
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      invalid += 1; completeZeroEvidence = false; continue;
    }
    const entry = item as JsonObject;
    const date = isoCalendarDate(entry.date, format);
    const numeric = typeof entry.nav === 'number' || (format === 'mfapi' && typeof entry.nav === 'string' && entry.nav.trim());
    const nav = numeric ? Number(entry.nav) : NaN;
    if (!date || !Number.isFinite(nav) || nav <= 0) {
      invalid += 1;
      const zero = typeof entry.nav === 'number' ? entry.nav === 0 && !Object.is(entry.nav, -0)
        : typeof entry.nav === 'string' && entry.nav.length <= 128 && /^0+(?:\.0+)?$/.test(entry.nav.trim());
      if (date && zero && !rejectedZeros.has(date)) rejectedZeros.add(date);
      else completeZeroEvidence = false;
      continue;
    }
    const existing = values.get(date);
    if (existing) { duplicate += 1; existing.add(nav); }
    else values.set(date, new Set([nav]));
  }
  if ((strict && invalid > 0) || values.size === 0) throw new Error('Invalid NAV observations in the history.');
  const points = [...values].sort(([a], [b]) => a.localeCompare(b))
    .map(([date, navs]) => ({ date, nav: Math.min(...navs) }));
  const warnings: string[] = [];
  if (invalid) warnings.push(`Invalid NAV observations were excluded (${invalid}); derived analytics are blocked until the data is resolved.`);
  const conflicts = [...values.values()].filter(navs => navs.size > 1).length;
  if (conflicts) warnings.push(`Conflicting NAV values occur on ${conflicts} duplicate date(s); the lowest value is retained deterministically and analytics are blocked.`);
  else if (duplicate) warnings.push(`Identical duplicate NAV dates were consolidated (${duplicate}).`);
  let discontinuities = 0;
  for (let index = 1; index < points.length; index += 1) {
    const ratio = points[index].nav / points[index - 1].nav;
    if (ratio > 1.4 + 1e-12 || ratio < 0.6 - 1e-12) discontinuities += 1;
  }
  if (discontinuities) warnings.push(`Unresolved discontinuity: ${discontinuities} single-observation move(s) exceed 40%; derived analytics are blocked.`);
  const rejectedZeroNavDates = invalid > 0 && completeZeroEvidence && conflicts === 0
    && ![...rejectedZeros].some(date => values.has(date))
    ? validateRejectedZeroNavDates([...rejectedZeros].sort(), warnings, values.keys()) : undefined;
  return { points, warnings, ...(rejectedZeroNavDates ? { rejectedZeroNavDates } : {}) };
}

function warningStrings(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 100 || value.some(warning => typeof warning !== 'string' || warning.length > 1_000)) {
    throw new Error('Invalid cache warning fields.');
  }
  return [...new Set(value as string[])];
}

export function validateCachedFund(value: unknown): FundData {
  const item = object(value, 'cached fund');
  if (item.source !== 'mfapi.in') throw new Error('Invalid cached fund source.');
  if (typeof item.fromCache !== 'boolean' || typeof item.stale !== 'boolean') throw new Error('Invalid cache status fields.');
  const normalized = normalizeNavRecords(item.points, 'iso', true);
  const archive = validateArchiveProvenance(item.archive);
  if (archive && (archive.observationCount !== normalized.points.length
    || archive.coverageStart !== normalized.points[0].date || archive.coverageEnd !== normalized.points.at(-1)!.date)) {
    throw new Error('Archived history provenance does not match its observation count or coverage.');
  }
  const rawWarnings = warningStrings(item.warnings);
  const rejectedZeroNavDates = validateRejectedZeroNavDates(item.rejectedZeroNavDates,
    [...item.warnings as string[], ...normalized.warnings], normalized.points.map(point => point.date));
  if (archive) validateRejectedZeroNavDates(archive.rejectedZeroNavDates, [...archive.warnings, ...normalized.warnings],
    normalized.points.map(point => point.date));
  if (rejectedZeroNavDates && archive?.rejectedZeroNavDates
    && (rejectedZeroNavDates.length !== archive.rejectedZeroNavDates.length
      || rejectedZeroNavDates.some((date, index) => date !== archive.rejectedZeroNavDates![index]))) {
    throw new Error('Conflicting rejected-zero NAV evidence in cache and archive provenance.');
  }
  const warnings = rawWarnings.filter(warning => !GENERATED_DISCONTINUITY_WARNING.test(warning));
  const fetchedAt = timestamp(item.fetchedAt, 'fetchedAt');
  let sourceObservedAt = item.sourceObservedAt === undefined ? undefined : timestamp(item.sourceObservedAt, 'sourceObservedAt');
  if (sourceObservedAt === undefined && [...warnings, ...normalized.warnings].some(warning =>
    /^(?:Invalid NAV observations|Conflicting NAV values|Unresolved discontinuity)\b/i.test(warning))) {
    // Old unresolved caches lost their latest response time; a retained archive
    // may also predate a discarded newer response. Hydration supplies an internal
    // upper bound, not a claimed source retrieval time. Persisting it prevents
    // repeated older archive reads from renewing proof.
    sourceObservedAt = new Date(Math.max(Date.now(), Date.parse(fetchedAt),
      Date.parse(archive?.archivedAt ?? fetchedAt))).toISOString();
  }
  if (sourceObservedAt && (Date.parse(sourceObservedAt) < Date.parse(fetchedAt)
    || (archive && Date.parse(sourceObservedAt) < Date.parse(archive.archivedAt)))) {
    throw new Error('sourceObservedAt cannot precede known source observation times.');
  }
  return { meta: validateMeta(item.meta), points: normalized.points, fetchedAt,
    source: 'mfapi.in', fromCache: item.fromCache, stale: item.stale,
    warnings: [...new Set([...warnings, ...normalized.warnings])],
    ...(sourceObservedAt ? { sourceObservedAt } : {}),
    ...(rejectedZeroNavDates ? { rejectedZeroNavDates } : {}), ...(archive ? { archive } : {}) };
}

/** Merge source observations without allowing a shortened refresh to erase history. */
export function mergeCachedFund(incoming: FundData, previous: FundData | null): FundData {
  const rejectedZeroNavDates = validateRejectedZeroNavDates(incoming.rejectedZeroNavDates, incoming.warnings,
    incoming.points.map(point => point.date));
  if (!previous) return incoming;
  if (incoming.meta.schemeCode !== previous.meta.schemeCode) throw new Error('Cannot merge different scheme identities.');
  const observedAt = (fund: FundData): string => [fund.fetchedAt, fund.archive?.archivedAt, fund.sourceObservedAt]
    .filter((value): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value)))
    .reduce((latest, value) => Date.parse(value) > Date.parse(latest) ? value : latest);
  const incomingObservedAt = observedAt(incoming);
  const previousObservedAt = observedAt(previous);
  const observationNotOlder = Date.parse(incomingObservedAt) >= Date.parse(previousObservedAt);
  const older = incoming.points.at(-1)!.date < previous.points.at(-1)!.date;
  const late = Date.parse(incoming.fetchedAt) < Date.parse(previous.fetchedAt);
  const questionable = incoming.warnings.some(warning => /^(Invalid NAV|Conflicting NAV)/.test(warning));
  const preferPrevious = older || late || questionable;
  const preferred = preferPrevious ? previous : incoming;
  const first = preferPrevious ? incoming : previous;
  const pointsByDate = new Map([...first.points, ...preferred.points].map(point => [point.date, point]));
  const normalized = normalizeNavRecords([...pointsByDate.values()], 'iso', true);
  const incomingPoints = new Map(incoming.points.map(point => [point.date, point.nav]));
  const retained = previous.points.filter(point => !incomingPoints.has(point.date)).length;
  const previousPoints = new Map(previous.points.map(point => [point.date, point.nav]));
  const corrections = preferPrevious ? 0 : incoming.points.filter(point => previousPoints.has(point.date)
    && previousPoints.get(point.date) !== point.nav).length;
  const warnings = [...(late ? previous.warnings : incoming.warnings)]
    .filter(warning => !GENERATED_DISCONTINUITY_WARNING.test(warning));
  if (late && incoming.points.some(point => !previousPoints.has(point.date))) {
    // A newer short response can take precedence on overlapping dates while
    // older archive-only dates still enter the union. Their unresolved source
    // quality must travel with those observations, not with the preferred clock.
    warnings.push(...incoming.warnings.filter(warning => /^(Invalid NAV|Conflicting NAV)/.test(warning)));
  }
  if (retained) {
    warnings.push(...previous.warnings.filter(warning => /^(Invalid NAV|Conflicting NAV)/.test(warning)));
    warnings.push(`A shorter or changed source history omitted ${retained} saved observation(s); those older observations were retained.`);
  }
  if (corrections) warnings.push(`Applied source corrections to ${corrections} saved observation(s).`);
  if (older) warnings.push('The source returned an older latest observation; newer saved values and their retrieval time were retained.');
  if (late) warnings.push('A later saved history took precedence over an earlier source retrieval.');
  if (questionable) warnings.push('Saved values were retained where the incoming response had unresolved data-quality issues.');
  const merged: FundData = { ...preferred, points: normalized.points,
    sourceObservedAt: observationNotOlder ? incomingObservedAt : previousObservedAt,
    stale: preferred.stale || older || questionable,
    warnings: [...new Set([...warnings, ...normalized.warnings])] };
  // Archive provenance describes an exact published payload. Locally unioned or
  // corrected observations must not inherit its count/range/retrieval claim.
  if (merged.archive && (preferred.points.length !== merged.points.length
    || preferred.points.some((point, index) => point.date !== merged.points[index]?.date || point.nav !== merged.points[index]?.nav))) {
    delete merged.archive;
  }
  // Proof belongs to a complete incoming response, never to the preferred clock
  // or an old archive whose positive projection happens to match.
  delete merged.rejectedZeroNavDates;
  if (merged.archive?.rejectedZeroNavDates !== undefined) {
    merged.archive = { ...merged.archive };
    delete merged.archive.rejectedZeroNavDates;
  }
  if (rejectedZeroNavDates && !older && !late && observationNotOlder
    && (['schemeCode', 'schemeName', 'fundHouse', 'schemeType', 'schemeCategory',
      'isinGrowth', 'isinDivReinvestment'] as const).every(field => incoming.meta[field] === previous.meta[field])
    && previous.points.every(point => incomingPoints.get(point.date) === point.nav)
    && merged.points.length === incoming.points.length
    && merged.points.every((point, index) => point.date === incoming.points[index].date && point.nav === incoming.points[index].nav)) {
    merged.rejectedZeroNavDates = rejectedZeroNavDates;
  }
  return merged;
}

function schemeList(value: unknown, limit: number, label: string): Scheme[] {
  if (!Array.isArray(value) || value.length > limit) throw new Error(`Invalid ${label}: maximum ${limit} schemes.`);
  const seen = new Set<number>();
  return value.map(item => {
    const scheme = validateScheme(item);
    if (seen.has(scheme.schemeCode)) throw new Error(`Duplicate scheme code in ${label}.`);
    seen.add(scheme.schemeCode);
    return scheme;
  });
}

function validateFundNotes(value: unknown): FundNote[] {
  if (!Array.isArray(value) || value.length > MAX_FUND_NOTES) {
    throw new Error('Invalid fund notes: maximum 120 notes.');
  }
  const ids = new Set<string>();
  return value.map(raw => {
    const note = object(raw, 'fund note');
    const id = text(note.id, 'fund note ID', 64);
    if (!/^[A-Za-z0-9_-]+$/.test(id) || ids.has(id)) throw new Error('Duplicate or invalid fund note ID.');
    ids.add(id);
    if (!validSchemeCode(note.schemeCode)) throw new Error('Invalid fund note scheme code.');
    const body = text(note.body, 'fund note body', MAX_FUND_NOTE_LENGTH);
    const createdAt = timestamp(note.createdAt, 'fund note creation');
    const updatedAt = timestamp(note.updatedAt, 'fund note update');
    if (createdAt > updatedAt) throw new Error('Fund note update predates creation.');
    return { id, schemeCode: note.schemeCode, body, createdAt, updatedAt };
  });
}

function validateSettings(value: unknown): ResearchSettings {
  const item = object(value, 'research settings');
  if (item.version !== 1) throw new Error('Unsupported settings version.');
  if (typeof item.riskFreeRate !== 'number' || !Number.isFinite(item.riskFreeRate) || item.riskFreeRate <= -1 || item.riskFreeRate > 1) {
    throw new Error('The assumed annual risk-free rate must be finite, greater than -1, and at most 1.');
  }
  return { version: 1, watchlist: schemeList(item.watchlist, 100, 'watchlist'), compared: schemeList(item.compared, 4, 'comparisons'),
    riskFreeRate: item.riskFreeRate, lastFund: item.lastFund === null ? null : validateScheme(item.lastFund),
    ...(item.fundNotes !== undefined ? { fundNotes: validateFundNotes(item.fundNotes) } : {}) };
}

function defaultSettings(): ResearchSettings {
  return { version: 1, watchlist: [], compared: [], riskFreeRate: 0.06, lastFund: null };
}

export function getSettings(): ResearchSettings {
  if (!settingsMemory) {
    try {
      const stored = typeof window === 'undefined' ? null : window.localStorage.getItem(SETTINGS_KEY);
      settingsMemory = stored ? validateSettings(JSON.parse(stored)) : defaultSettings();
      settingsPersistenceWarning = null;
    } catch {
      settingsMemory = defaultSettings();
      settingsPersistenceWarning = 'Saved settings could not be loaded. Session defaults are in use; changes may not survive a reload.';
    }
  }
  return clone(settingsMemory);
}

function storeSettings(settings: ResearchSettings): void {
  settingsMemory = clone(settings);
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      settingsPersistenceWarning = null;
    }
  } catch {
    settingsPersistenceWarning = 'Settings are saved for this session only because browser settings storage is unavailable. Export a backup before reloading.';
  }
}

export function saveSettings(settings: ResearchSettings): void { storeSettings(validateSettings(settings)); }

function openDatabase(): Promise<IDBDatabase | null> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise(resolve => {
    let factory: IDBFactory;
    try {
      if (typeof indexedDB === 'undefined') { memoryOnly = true; resolve(null); return; }
      factory = indexedDB;
    } catch { memoryOnly = true; resolve(null); return; }
    let settled = false;
    const finish = (database: IDBDatabase | null) => {
      if (settled) { database?.close(); return; }
      settled = true;
      clearTimeout(timer);
      if (!database) memoryOnly = true;
      resolve(database);
    };
    const timer = setTimeout(() => finish(null), 1_500);
    try {
      const request = factory.open(DATABASE, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('funds')) database.createObjectStore('funds', { keyPath: 'code' });
        if (!database.objectStoreNames.contains('searches')) database.createObjectStore('searches', { keyPath: 'query' });
        if (!database.objectStoreNames.contains('settings')) database.createObjectStore('settings', { keyPath: 'id' });
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => { request.result.close(); memoryOnly = true; };
        finish(request.result);
      };
      request.onerror = () => finish(null);
      request.onblocked = () => finish(null);
    } catch { finish(null); }
  });
  return databasePromise;
}

function transaction(database: IDBDatabase, stores: string[], action: (tx: IDBTransaction) => void, generation: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let tx: IDBTransaction;
    try { assertStorageGeneration(generation); tx = database.transaction(stores, 'readwrite'); }
    catch (error) { reject(error); return; }
    activeTransactions.set(tx, generation);
    tx.oncomplete = () => { activeTransactions.delete(tx); resolve(); };
    tx.onabort = () => { activeTransactions.delete(tx); reject(tx.error ?? new Error('Browser storage transaction was aborted.')); };
    tx.onerror = () => { /* onabort reports the final atomic transaction failure. */ };
    try { action(tx); } catch (error) { activeTransactions.delete(tx); tx.abort(); reject(error); }
  });
}

function readStore<T>(database: IDBDatabase, store: string, key?: IDBValidKey): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      const tx = database.transaction(store, 'readonly');
      const request = key === undefined ? tx.objectStore(store).getAll() : tx.objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error ?? new Error('Browser cache could not be read.'));
      tx.onabort = () => reject(tx.error ?? new Error('Browser cache read was aborted.'));
    } catch (error) { reject(error); }
  });
}

export function storageWarning(): string | null {
  const warnings = [
    memoryOnly ? 'Persistent browser history storage is unavailable; this session uses a memory cache.' : null,
    settingsPersistenceWarning,
  ].filter((warning): warning is string => warning !== null);
  return warnings.length ? warnings.join(' ') : null;
}

export async function getCachedFund(code: number, generation = getStorageGeneration()): Promise<FundData | null> {
  await storageReady(generation);
  assertStorageGeneration(generation);
  const known = funds.get(code);
  if (known) return clone(known);
  const database = await openDatabase();
  assertStorageGeneration(generation);
  if (!database) return null;
  try {
    const record = await readStore<FundRecord | undefined>(database, 'funds', code);
    assertStorageGeneration(generation);
    if (!record) return null;
    const fund = validateCachedFund(record.fund);
    if (fund.meta.schemeCode !== code) return null;
    funds.set(code, fund);
    return clone(fund);
  } catch { assertStorageGeneration(generation); return null; }
}

export async function putCachedFund(value: FundData, generation = getStorageGeneration()): Promise<FundData> {
  const incoming = validateCachedFund(value);
  await storageReady(generation);
  assertStorageGeneration(generation);
  return mutate(async () => {
    assertStorageGeneration(generation);
    const previous = await getCachedFund(incoming.meta.schemeCode, generation);
    assertStorageGeneration(generation);
    const fund = validateCachedFund(mergeCachedFund(incoming, previous));
    const database = await openDatabase();
    assertStorageGeneration(generation);
    if (database) {
      try { await transaction(database, ['funds'], tx => tx.objectStore('funds').put({ code: fund.meta.schemeCode, fund }), generation); }
      catch { assertStorageGeneration(generation); memoryOnly = true; }
    }
    // Mutations are serialized. A completed disk commit is mirrored before the
    // next restore can run; a superseded caller still receives no old result.
    funds.set(fund.meta.schemeCode, clone(fund));
    assertStorageGeneration(generation);
    return clone(fund);
  });
}

export async function getCachedSearch(query: string, generation = getStorageGeneration()): Promise<SearchCache | null> {
  await storageReady(generation);
  assertStorageGeneration(generation);
  const known = searches.get(query);
  if (known) return clone(known);
  const database = await openDatabase();
  assertStorageGeneration(generation);
  if (!database) return null;
  try {
    const record = await readStore<SearchRecord | undefined>(database, 'searches', query);
    assertStorageGeneration(generation);
    if (!record) return null;
    const cached = { schemes: schemeList(record.schemes, 50_000, 'search results'), fetchedAt: timestamp(record.fetchedAt, 'search fetchedAt') };
    searches.set(query, cached);
    return clone(cached);
  } catch { assertStorageGeneration(generation); return null; }
}

export async function putCachedSearch(query: string, schemes: Scheme[], generation = getStorageGeneration()): Promise<void> {
  const cached = { schemes: schemeList(schemes, 50_000, 'search results'), fetchedAt: new Date().toISOString() };
  await storageReady(generation);
  assertStorageGeneration(generation);
  return mutate(async () => {
    assertStorageGeneration(generation);
    const evicted = searches.size >= MAX_SEARCHES && !searches.has(query) ? searches.keys().next().value : undefined;
    const database = await openDatabase();
    assertStorageGeneration(generation);
    if (database) {
      try {
        await transaction(database, ['searches'], tx => {
          if (evicted !== undefined) tx.objectStore('searches').delete(evicted);
          tx.objectStore('searches').put({ query, ...cached });
        }, generation);
      } catch { assertStorageGeneration(generation); memoryOnly = true; }
    }
    if (evicted !== undefined) searches.delete(evicted);
    searches.set(query, clone(cached));
    assertStorageGeneration(generation);
  });
}

async function allFunds(generation = getStorageGeneration()): Promise<FundData[]> {
  await storageReady(generation);
  assertStorageGeneration(generation);
  const combined = new Map<number, FundData>();
  const database = await openDatabase();
  assertStorageGeneration(generation);
  if (database) {
    try {
      const records = await readStore<FundRecord[]>(database, 'funds');
      assertStorageGeneration(generation);
      for (const record of records) {
        try {
          const fund = validateCachedFund(record.fund);
          if (fund.meta.schemeCode === record.code) combined.set(record.code, fund);
        } catch { /* Corrupt browser cache entries are never exported or trusted. */ }
      }
    } catch { assertStorageGeneration(generation); memoryOnly = true; }
  }
  for (const [code, fund] of funds) combined.set(code, clone(fund));
  return [...combined.values()].sort((a, b) => a.meta.schemeCode - b.meta.schemeCode);
}

export async function exportBackup(): Promise<string> {
  const generation = getStorageGeneration();
  const histories = await allFunds(generation);
  assertStorageGeneration(generation);
  if (histories.length > MAX_FUNDS || histories.reduce((total, fund) => total + fund.points.length, 0) > MAX_TOTAL_POINTS) {
    throw new Error('The cache exceeds the portable backup resource limit.');
  }
  const output = JSON.stringify({ version: 1, createdAt: new Date().toISOString(), settings: getSettings(), funds: histories }, null, 2);
  if (new TextEncoder().encode(output).byteLength > MAX_BACKUP_BYTES) throw new Error('The backup exceeds the 20 MiB size limit.');
  return output;
}

export async function importBackup(input: string): Promise<ResearchSettings> {
  if (typeof input !== 'string' || input.length > MAX_BACKUP_BYTES || new TextEncoder().encode(input).byteLength > MAX_BACKUP_BYTES) {
    throw new Error('The backup exceeds the 20 MiB size limit.');
  }
  let parsed: unknown;
  try { parsed = JSON.parse(input); } catch { throw new Error('Invalid backup JSON.'); }
  const backup = object(parsed, 'backup');
  if (backup.version !== 1) throw new Error('Unsupported backup version.');
  timestamp(backup.createdAt, 'createdAt');
  const settings = validateSettings(backup.settings);
  if (!Array.isArray(backup.funds) || backup.funds.length > MAX_FUNDS) throw new Error('Invalid backup fund count or resource limit.');
  const restored = new Map<number, FundData>();
  let observations = 0;
  for (const value of backup.funds) {
    const fund = validateCachedFund(value);
    if (restored.has(fund.meta.schemeCode)) throw new Error('Duplicate fund code in backup.');
    observations += fund.points.length;
    if (observations > MAX_TOTAL_POINTS) throw new Error('Backup exceeds the total observation resource limit.');
    restored.set(fund.meta.schemeCode, fund);
  }
  // Validation precedes the generation boundary. Never roll a generation back:
  // even a failed commit must not revive requests that the restore superseded.
  const generation = ++storageGeneration;
  let releaseRestore!: () => void;
  const barrier = new Promise<void>(resolve => { releaseRestore = resolve; });
  restoreBarrier = barrier;
  for (const [tx, previousGeneration] of activeTransactions) {
    if (previousGeneration !== generation) {
      try { tx.abort(); } catch { /* An already committed transaction is mirrored by the serialized operation. */ }
    }
  }
  try {
    return await mutate(async () => {
      assertStorageGeneration(generation);
      const database = await openDatabase();
      assertStorageGeneration(generation);
      if (database) {
        try {
          await transaction(database, ['funds', 'searches', 'settings'], tx => {
            tx.objectStore('funds').clear();
            tx.objectStore('searches').clear();
            for (const [code, fund] of restored) tx.objectStore('funds').put({ code, fund });
            tx.objectStore('settings').put({ id: 'current', settings });
          }, generation);
        } catch {
          assertStorageGeneration(generation);
          throw new Error('Backup restore could not commit to browser storage. Previous settings and histories were retained.');
        }
      }
      funds.clear();
      for (const [code, fund] of restored) funds.set(code, clone(fund));
      searches.clear();
      storeSettings(settings);
      assertStorageGeneration(generation);
      return clone(settings);
    });
  } finally {
    if (restoreBarrier === barrier) restoreBarrier = null;
    releaseRestore();
  }
}

export async function storageStats(): Promise<{ fundCount: number }> {
  const generation = getStorageGeneration();
  const histories = await allFunds(generation);
  assertStorageGeneration(generation);
  return { fundCount: histories.length };
}
