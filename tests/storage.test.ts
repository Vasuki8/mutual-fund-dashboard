import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { exportBackup, getSettings, importBackup, saveSettings, storageStats } from '../src/lib/storage.ts';
import * as storage from '../src/lib/storage.ts';
import type { TestContext } from 'node:test';
import type { FundData, ResearchSettings } from '../src/lib/types.ts';

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
