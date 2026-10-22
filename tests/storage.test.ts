import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { exportBackup, getSettings, importBackup, saveSettings, storageStats } from '../src/lib/storage.ts';
import * as storage from '../src/lib/storage.ts';
import type { TestContext } from 'node:test';
import type { FundData, ResearchSettings } from '../src/lib/types.ts';
import { qualityBlocked } from '../src/lib/format.ts';

const defaults = (): ResearchSettings => ({ version: 1, watchlist: [], compared: [], riskFreeRate: 0.06, lastFund: null });
const scheme = (code = 122639) => ({ schemeCode: code, schemeName: `Example Direct Plan Growth ${code}` });
const fund = (code = 122639): FundData => ({
  meta: { ...scheme(code), fundHouse: 'Example Mutual Fund', schemeType: 'Open Ended Schemes', schemeCategory: 'Equity Scheme - Flexi Cap Fund' },
  points: [{ date: '2025-01-01', nav: 10 }, { date: '2025-01-02', nav: 10.1 }],
  fetchedAt: '2026-10-20T10:00:00.000Z', source: 'mfapi.in', fromCache: false, stale: false, warnings: [],
});
function backup(funds: FundData[] = [], settings = defaults()) {
  return { version: 1, createdAt: new Date().toISOString(), settings, funds };
}
beforeEach(async () => { await importBackup(JSON.stringify(backup())); });

test('cache writes merge a shortened newer response without deleting earlier observations', async () => {
  await storage.putCachedFund(fund());
  const incoming = fund();
  incoming.fetchedAt = '2026-10-21T10:00:00.000Z';
  incoming.points = [{ date: '2025-01-02', nav: 10.2 }, { date: '2025-01-03', nav: 10.3 }];
  const saved = await storage.putCachedFund(incoming);
  assert.deepEqual(saved.points, [{ date: '2025-01-01', nav: 10 }, { date: '2025-01-02', nav: 10.2 }, { date: '2025-01-03', nav: 10.3 }]);
  assert.ok(saved.warnings.some(warning => /retained/i.test(warning)));
  assert.equal((await storage.getCachedFund(incoming.meta.schemeCode))?.points.length, 3);
});

test('cache history merging never labels a mixed local history as an unchanged archived payload', async () => {
  const saved = fund();
  saved.archive = { fetchedAt: saved.fetchedAt, archivedAt: saved.fetchedAt, coverageStart: '2025-01-01',
    coverageEnd: '2025-01-02', observationCount: 2, fromArchive: true, stale: false, warnings: [] };
  await storage.putCachedFund(saved);
  const incoming = fund();
  incoming.fetchedAt = '2026-10-21T10:00:00.000Z';
  incoming.points = [{ date: '2025-01-03', nav: 10.3 }];
  const merged = await storage.putCachedFund(incoming);
  assert.equal(merged.points.length, 3);
  assert.equal(merged.archive, undefined);
});

test('older archive observations retain their blocking quality warnings when merged into a newer short history', async () => {
  const current = fund();
  current.fetchedAt = '2026-10-21T10:00:00.000Z';
  current.points = [{ date: '2026-10-21', nav: 10.2 }];
  await storage.putCachedFund(current);
  const archived = fund();
  archived.fetchedAt = '2026-10-20T10:00:00.000Z';
  archived.points = [{ date: '2026-10-19', nav: 10 }, { date: '2026-10-20', nav: 10.1 }];
  archived.warnings = ['Conflicting NAV values occur on 1 duplicate date(s); the lowest value is retained deterministically and analytics are blocked.',
    'Invalid NAV observations were excluded (1); derived analytics are blocked until the data is resolved.'];
  const merged = await storage.putCachedFund(archived);
  assert.deepEqual(merged.points.map(point => point.date), ['2026-10-19', '2026-10-20', '2026-10-21']);
  assert.equal(merged.fetchedAt, current.fetchedAt);
  assert.equal(qualityBlocked(merged), true, 'Adding older unresolved observations must not silently enable analytics.');
  for (const warning of archived.warnings) assert.ok(merged.warnings.includes(warning));
  assert.equal(qualityBlocked((await storage.getCachedFund(current.meta.schemeCode))!), true);
});

test('settings default to the explicit annual rate assumption', () => {
  assert.deepEqual(getSettings(), defaults());
});

test('settings preserve plan identifiers and isolate caller mutations', () => {
  const settings = { ...defaults(), watchlist: [scheme()], compared: [scheme()], lastFund: scheme() };
  saveSettings(settings);
  settings.watchlist[0].schemeCode = 123;
  const read = getSettings();
  assert.equal(read.watchlist[0].schemeCode, 122639);
  read.watchlist.length = 0;
  assert.equal(getSettings().watchlist.length, 1);
});

test('invalid rates and list limits leave prior settings intact', () => {
  saveSettings({ ...defaults(), riskFreeRate: 0.07 });
  for (const riskFreeRate of [NaN, Infinity, -1, 1.1]) {
    assert.throws(() => saveSettings({ ...defaults(), riskFreeRate }), /rate/i);
  }
  assert.throws(() => saveSettings({ ...defaults(), compared: [1, 2, 3, 4, 5].map(scheme) }), /compar|four|4/i);
  assert.throws(() => saveSettings({ ...defaults(), watchlist: Array.from({ length: 101 }, (_, index) => scheme(index + 1)) }), /watch|100/i);
  assert.equal(getSettings().riskFreeRate, 0.07);
});

test('duplicate scheme identifiers are rejected before settings mutation', () => {
  assert.throws(() => saveSettings({ ...defaults(), watchlist: [scheme(), scheme()] }), /duplicate/i);
  assert.deepEqual(getSettings(), defaults());
});

test('portable export and restore preserve settings, histories, and quality warnings', async () => {
  const history = fund();
  history.warnings = ['Invalid observations were excluded from the original response.'];
  const settings = { ...defaults(), watchlist: [scheme()], lastFund: scheme(), riskFreeRate: 0.04 };
  await importBackup(JSON.stringify(backup([history], settings)));
  const text = await exportBackup();
  const exported = JSON.parse(text);
  assert.equal(exported.version, 1);
  assert.ok(Number.isFinite(Date.parse(exported.createdAt)));
  assert.deepEqual(exported.funds[0].warnings, history.warnings);
  await importBackup(JSON.stringify(backup()));
  assert.deepEqual(await storageStats(), { fundCount: 0 });
  assert.deepEqual(await importBackup(text), settings);
  assert.deepEqual(await storageStats(), { fundCount: 1 });
  assert.deepEqual(JSON.parse(await exportBackup()).funds[0].points, history.points);
});

test('unsupported backup versions are rejected before any cache or settings mutation', async () => {
  await importBackup(JSON.stringify(backup([fund()], { ...defaults(), riskFreeRate: 0.08 })));
  await assert.rejects(importBackup(JSON.stringify({ ...backup(), version: 2 })), /version/i);
  assert.equal(getSettings().riskFreeRate, 0.08);
  assert.deepEqual(await storageStats(), { fundCount: 1 });
});

test('invalid restored observations reject the whole backup without partial changes', async () => {
  await importBackup(JSON.stringify(backup([fund()], { ...defaults(), riskFreeRate: 0.09 })));
  const malformed = fund(120716);
  malformed.points.push({ date: '2025-02-30', nav: 12 });
  await assert.rejects(importBackup(JSON.stringify(backup([fund(118955), malformed]))), /invalid|NAV|date/i);
  assert.equal(getSettings().riskFreeRate, 0.09);
  const exported = JSON.parse(await exportBackup());
  assert.deepEqual(exported.funds.map((item: FundData) => item.meta.schemeCode), [122639]);
});

test('duplicate fund records and invalid source identifiers are rejected', async () => {
  await assert.rejects(importBackup(JSON.stringify(backup([fund(), fund()]))), /duplicate/i);
  const invalid = { ...fund(), source: 'other.example' };
  await assert.rejects(importBackup(JSON.stringify({ ...backup(), funds: [invalid] })), /source/i);
  assert.deepEqual(await storageStats(), { fundCount: 0 });
});

test('restoring the same backup twice replaces rather than duplicates histories', async () => {
  const text = JSON.stringify(backup([fund(), fund(120716)]));
  await importBackup(text);
  await importBackup(text);
  assert.deepEqual(await storageStats(), { fundCount: 2 });
});

test('restore re-evaluates discontinuity warnings even if the backup removed them', async () => {
  const history = fund();
  history.points[1].nav = 20;
  history.warnings = [];
  await importBackup(JSON.stringify(backup([history])));
  const restored = JSON.parse(await exportBackup()).funds[0];
  assert.ok(restored.warnings.some((warning: string) => /discontinuity/i.test(warning)));
});

test('restore re-evaluates conflicting duplicate observations', async () => {
  const history = fund();
  history.points.push({ date: '2025-01-02', nav: 10.2 });
  await importBackup(JSON.stringify(backup([history])));
  const restored = JSON.parse(await exportBackup()).funds[0];
  assert.equal(restored.points.length, 2);
  assert.equal(restored.points[1].nav, 10.1);
  assert.ok(restored.warnings.some((warning: string) => /conflict/i.test(warning)));
});

test('invalid timestamps, warning fields, and oversized backups are rejected', async () => {
  await assert.rejects(importBackup(JSON.stringify({ ...backup(), createdAt: 'not-a-date' })), /date|timestamp|createdAt/i);
  const invalid = { ...fund(), warnings: [42] };
  await assert.rejects(importBackup(JSON.stringify({ ...backup(), funds: [invalid] })), /warning/i);
  await assert.rejects(importBackup('x'.repeat(20 * 1024 * 1024 + 1)), /large|size|limit/i);
  assert.deepEqual(await storageStats(), { fundCount: 0 });
});

let isolatedModule = 0;
async function freshStorage() {
  return import(new URL(`../src/lib/storage.ts?storage-regression=${++isolatedModule}`, import.meta.url).href);
}

function installGlobal(t: TestContext, key: string, value: unknown) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, key, previous);
    else Reflect.deleteProperty(globalThis, key);
  });
}

test('restore generation changes only after complete backup validation', async () => {
  assert.equal(typeof storage.getStorageGeneration, 'function');
  const initial = storage.getStorageGeneration();
  await assert.rejects(importBackup(JSON.stringify({ ...backup(), version: 2 })), /version/i);
  assert.equal(storage.getStorageGeneration(), initial);
  const pending = importBackup(JSON.stringify(backup([fund()])));
  assert.equal(storage.getStorageGeneration(), initial + 1);
  await pending;
  assert.equal(storage.getStorageGeneration(), initial + 1);
});

test('a cache hit started before restore is rejected at its asynchronous return boundary', async () => {
  await importBackup(JSON.stringify(backup([fund()])));
  const read = storage.getCachedFund(122639).then(() => 'resolved', () => 'rejected');
  const restored = fund();
  restored.points[1].nav = 10.5;
  await importBackup(JSON.stringify(backup([restored])));
  assert.equal(await read, 'rejected');
});

test('failed settings writes warn immediately without claiming IndexedDB is unavailable', async t => {
  installGlobal(t, 'window', { localStorage: {
    getItem: () => null,
    setItem: () => { throw new Error('Quota exceeded'); },
  } });
  const local = await freshStorage();
  local.saveSettings({ ...defaults(), watchlist: [scheme()] });
  assert.equal(local.getSettings().watchlist.length, 1);
  assert.match(local.storageWarning() ?? '', /settings|watchlist/i);
  assert.match(local.storageWarning() ?? '', /session|persist|reload/i);
  assert.doesNotMatch(local.storageWarning() ?? '', /history storage|IndexedDB/i);
  const reloaded = await freshStorage();
  assert.equal(reloaded.getSettings().watchlist.length, 0, 'A reload demonstrates why the session-only warning matters.');
});

test('failed settings reads report the session fallback', async t => {
  installGlobal(t, 'window', { localStorage: {
    getItem: () => { throw new Error('Storage access denied'); },
    setItem: () => { throw new Error('Storage access denied'); },
  } });
  const local = await freshStorage();
  assert.deepEqual(local.getSettings(), defaults());
  assert.match(local.storageWarning() ?? '', /settings/i);
  assert.match(local.storageWarning() ?? '', /read|load|access|persist/i);
  assert.doesNotMatch(local.storageWarning() ?? '', /history storage|IndexedDB/i);
});

test('a later successful settings write clears only the settings warning and survives reload', async t => {
  let denied = true;
  let saved: string | null = null;
  installGlobal(t, 'window', { localStorage: {
    getItem: () => saved,
    setItem: (_key: string, value: string) => { if (denied) throw new Error('Quota exceeded'); saved = value; },
  } });
  const local = await freshStorage();
  const settings = { ...defaults(), watchlist: [scheme()], riskFreeRate: 0.04 };
  local.saveSettings(settings);
  assert.match(local.storageWarning() ?? '', /settings/i);
  denied = false;
  local.saveSettings(settings);
  assert.equal(local.storageWarning(), null);
  assert.deepEqual((await freshStorage()).getSettings(), settings);
});

// A minimal transactional IndexedDB fixture: writes remain staged until commit,
// and abort discards every staged change. Delays exercise actual async boundaries.
function databaseFixture(holdOpen = false) {
  const state = new Map<string, Map<unknown, unknown>>([
    ['funds', new Map()], ['searches', new Map()], ['settings', new Map()],
  ]);
  let request: any;
  let opened!: () => void;
  const opening = new Promise<void>(resolve => { opened = resolve; });
  let holdWrites = false;
  let failWrite = false;
  const delayed: Array<() => void> = [];
  const writeObservers: Array<() => void> = [];
  const database = {
    objectStoreNames: { contains: () => true },
    close() {},
    transaction(names: string[] | string, mode: string) {
      const stores = Array.isArray(names) ? names : [names];
      const staged = new Map(stores.map(name => [name, new Map(state.get(name))]));
      let aborted = false;
      const tx: any = {
        error: null, oncomplete: null, onabort: null, onerror: null,
        abort() {
          if (aborted) return;
          aborted = true;
          tx.error = new Error('Transaction aborted');
          queueMicrotask(() => tx.onabort?.());
        },
        objectStore(name: string) {
          const values = staged.get(name)!;
          function read(result: unknown) {
            const pending: any = { result: undefined, error: null, onsuccess: null, onerror: null };
            queueMicrotask(() => {
              if (!aborted) { pending.result = structuredClone(result); pending.onsuccess?.(); }
            });
            return pending;
          }
          return {
            get: (key: unknown) => read(values.get(key)),
            getAll: () => read([...values.values()]),
            put(value: any) { values.set(value.code ?? value.query ?? value.id, structuredClone(value)); },
            clear() { values.clear(); },
            delete(key: unknown) { values.delete(key); },
          };
        },
      };
      const finish = () => {
        if (aborted) return;
        if (mode === 'readwrite' && failWrite) { failWrite = false; tx.abort(); return; }
        if (mode === 'readwrite') for (const [name, values] of staged) state.set(name, values);
        tx.oncomplete?.();
      };
      queueMicrotask(() => {
        if (mode === 'readwrite') {
          for (const observer of writeObservers.splice(0)) observer();
          if (holdWrites) { delayed.push(finish); return; }
        }
        queueMicrotask(finish);
      });
      return tx;
    },
  };
  const releaseOpen = () => queueMicrotask(() => request?.onsuccess?.());
  return {
    factory: { open() { request = { result: database, onsuccess: null, onerror: null }; opened(); if (!holdOpen) releaseOpen(); return request; } },
    opening, releaseOpen,
    pauseWrites() { holdWrites = true; },
    releaseWrites() { holdWrites = false; for (const finish of delayed.splice(0)) queueMicrotask(finish); },
    nextWrite() { return new Promise<void>(resolve => { writeObservers.push(resolve); }); },
    failNextWrite() { failWrite = true; },
  };
}

test('restore supersedes an old cache write that is waiting for IndexedDB to open', async t => {
  const database = databaseFixture(true);
  installGlobal(t, 'indexedDB', database.factory);
  const local = await freshStorage();
  const oldFund = fund();
  oldFund.points[1].nav = 12;
  const old = local.putCachedFund(oldFund).then(() => 'resolved', () => 'rejected');
  await database.opening;
  const restored = fund();
  restored.points[1].nav = 10.5;
  const restore = local.importBackup(JSON.stringify(backup([restored])));
  database.releaseOpen();
  await restore;
  assert.equal(await old, 'rejected');
  assert.equal(JSON.parse(await local.exportBackup()).funds[0].points.at(-1).nav, 10.5);
});

test('requests in the new generation wait for an asynchronous restore commit', async t => {
  const database = databaseFixture();
  installGlobal(t, 'indexedDB', database.factory);
  const local = await freshStorage();
  await local.importBackup(JSON.stringify(backup([fund()])));
  database.pauseWrites();
  const writing = database.nextWrite();
  const restored = fund();
  restored.points[1].nav = 10.5;
  const restore = local.importBackup(JSON.stringify(backup([restored])));
  await writing;
  let settled = false;
  const read = local.getCachedFund(122639).then((value: FundData) => { settled = true; return value; });
  await new Promise(resolve => setImmediate(resolve));
  const readBeforeCommit = settled;
  database.releaseWrites();
  await restore;
  assert.equal((await read).points.at(-1)?.nav, 10.5);
  assert.equal(readBeforeCommit, false);
});

test('restore aborts an earlier active cache transaction without letting it return stale data', async t => {
  const database = databaseFixture();
  installGlobal(t, 'indexedDB', database.factory);
  const local = await freshStorage();
  await local.importBackup(JSON.stringify(backup([fund()])));
  database.pauseWrites();
  const oldWriteStarted = database.nextWrite();
  const oldFund = fund();
  oldFund.points[1].nav = 12;
  const old = local.putCachedFund(oldFund).then(() => 'resolved', () => 'rejected');
  await oldWriteStarted;
  const restoreWriteStarted = database.nextWrite();
  const restored = fund();
  restored.points[1].nav = 10.5;
  const restore = local.importBackup(JSON.stringify(backup([restored])));
  await restoreWriteStarted;
  database.releaseWrites();
  await restore;
  assert.equal(await old, 'rejected');
  assert.equal(JSON.parse(await local.exportBackup()).funds[0].points.at(-1).nav, 10.5);
});

test('an aborted restore preserves old settings and every cached fund', async t => {
  const database = databaseFixture();
  installGlobal(t, 'indexedDB', database.factory);
  const local = await freshStorage();
  const settings = { ...defaults(), riskFreeRate: 0.07, watchlist: [scheme()] };
  await local.importBackup(JSON.stringify(backup([fund(), fund(120716)], settings)));
  database.failNextWrite();
  await assert.rejects(local.importBackup(JSON.stringify(backup([fund(118955)]))), /commit|retained/i);
  assert.deepEqual(local.getSettings(), settings);
  const exported = JSON.parse(await local.exportBackup());
  assert.deepEqual(exported.funds.map((item: FundData) => item.meta.schemeCode), [120716, 122639]);
});


test('dated fund notes survive version-1 backup and restore without changing legacy settings', async () => {
  const createdAt = '2026-10-21T10:30:00.000Z';
  const updatedAt = '2026-10-22T09:45:00.000Z';
  const note = { id: 'test-note-1', schemeCode: 122639,
    body: 'Watch drawdown after the next monthly NAV update.', createdAt, updatedAt };
  const settings = { ...defaults(), fundNotes: [note] };
  saveSettings(settings);
  const read = getSettings();
  assert.deepEqual(read.fundNotes, [note]);
  read.fundNotes![0].body = 'mutated';
  assert.deepEqual(getSettings().fundNotes, [note], 'Read callers must not mutate saved personal research.');
  const portable = await exportBackup();
  assert.deepEqual(JSON.parse(portable).settings.fundNotes, [note]);
  await importBackup(JSON.stringify(backup()));
  assert.deepEqual(getSettings(), defaults(), 'Older version-1 backups stay usable without a notes field.');
  await importBackup(portable);
  assert.deepEqual(getSettings().fundNotes, [note]);
});

test('fund note validation rejects duplicate IDs, invalid schemes, excessive text and wrong dates', () => {
  const note = { id: 'note_100', schemeCode: 122639, body: 'Research context',
    createdAt: '2026-10-21T10:30:00.000Z', updatedAt: '2026-10-22T10:30:00.000Z' };
  const attempts = [
    [note, note],
    [{ ...note, id: 'bad id' }],
    [{ ...note, schemeCode: 0 }],
    [{ ...note, body: '' }],
    [{ ...note, body: ' '.repeat(3001) }],
    [{ ...note, body: 'x'.repeat(3001) }],
    [{ ...note, updatedAt: '2026-10-20T10:30:00.000Z' }],
    [{ ...note, createdAt: 'not-a-date' }],
    Array.from({ length: 121 }, (_, i) => ({ ...note, id: 'note_' + i })),
  ];
  for (const fundNotes of attempts) {
    assert.throws(() => saveSettings({ ...defaults(), fundNotes }), /note|date|timestamp|duplicate/i);
    assert.deepEqual(getSettings(), defaults());
  }
});

test('invalid notes in a portable backup reject the entire restore without changing current settings', async () => {
  const note = { id: 'note-1', schemeCode: 122639, body: 'Retain this research',
    createdAt: '2026-10-22T10:00:00.000Z', updatedAt: '2026-10-22T10:00:00.000Z' };
  const original = { ...defaults(), fundNotes: [note] };
  await importBackup(JSON.stringify(backup([fund()], original)));
  const saved = await exportBackup();
  const badNote = { ...note, schemeCode: Number.NaN, body: 'bad' };
  await assert.rejects(importBackup(JSON.stringify(backup([], { ...defaults(), fundNotes: [badNote] }))), /note|invalid/i);
  assert.deepEqual(getSettings(), original);
  assert.deepEqual(JSON.parse(await exportBackup()).funds, JSON.parse(saved).funds);
});

test('changing a fund note via the same ID preserves a single logical note across backups', async () => {
  const earlier = '2026-10-20T08:30:00.000Z';
  const later = '2026-10-22T12:00:00.000Z';
  saveSettings({ ...defaults(), fundNotes: [{
    id: 'memo-1', schemeCode: 122639, body: 'Initial thesis', createdAt: earlier, updatedAt: earlier,
  }] });
  const previous = getSettings().fundNotes![0];
  saveSettings({ ...getSettings(), fundNotes: [{
    ...previous, body: 'Revised thesis', updatedAt: later,
  }] });
  assert.equal(getSettings().fundNotes?.length, 1);
  assert.equal(getSettings().fundNotes?.[0].createdAt, earlier);
  assert.equal(getSettings().fundNotes?.[0].updatedAt, later);
  const exported = await exportBackup();
  await importBackup(exported);
  assert.equal(getSettings().fundNotes?.length, 1);
  assert.equal(getSettings().fundNotes?.[0].body, 'Revised thesis');
});
