import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import { getFund } from '../src/lib/api.ts';
import { getStorageGeneration, importBackup } from '../src/lib/storage.ts';
import type { FundData } from '../src/lib/types.ts';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(accept => { resolve = accept; });
  return { promise, resolve };
}

// Execute the callback from App.tsx itself. Only its hook/state boundary is
// replaced; request behavior is not duplicated in this regression fixture.
function appRequests() {
  const source = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const callback = source.match(/const ensureFund=useCallback[\s\S]*?\},\[\]\);/);
  assert.ok(callback, 'Update this fixture if the App callback moves or changes structure.');
  const compiled = ts.transpile(callback[0], { target: ts.ScriptTarget.ES2022 });
  const inFlight = { current: new Map<number, { generation: number; task: Promise<void> }>() };
  const loaded = { current: {} as Record<number, FundData> };
  const failed = { current: new Set<number>() };
  let loading: number[] = [];
  let errors: Record<number, string> = {};
  let funds: Record<number, FundData> = {};
  const create = new Function('useCallback', 'getFund', 'getStorageGeneration', 'inFlight',
    'loaded', 'failed', 'setLoading', 'setErrors', 'setFunds', `${compiled}; return ensureFund;`);
  const ensureFund = create((fn: unknown) => fn, getFund, getStorageGeneration, inFlight, loaded, failed,
    (update: (value: number[]) => number[]) => { loading = update(loading); },
    (update: (value: Record<number, string>) => Record<number, string>) => { errors = update(errors); },
    (update: (value: Record<number, FundData>) => Record<number, FundData>) => { funds = update(funds); },
  ) as (code: number, force?: boolean) => Promise<void>;
  return { ensureFund, inFlight, snapshot: () => ({ loading, errors, funds }) };
}

// Reads miss; every write aborts without committing. This reproduces a valid
// restore reaching its transaction boundary and failing after generation changes.
function abortingDatabase() {
  const database = {
    objectStoreNames: { contains: () => true }, close() {},
    transaction(_stores: unknown, mode: string) {
      const tx: any = {
        error: null, oncomplete: null, onabort: null, onerror: null,
        objectStore() {
          return {
            get() {
              const request: any = { result: undefined, onsuccess: null };
              queueMicrotask(() => request.onsuccess?.());
              return request;
            },
            clear() {}, put() {},
          };
        },
      };
      if (mode === 'readwrite') queueMicrotask(() => {
        tx.error = new Error('Quota exceeded');
        tx.onabort?.();
      });
      return tx;
    },
  };
  return { open() {
    const request: any = { result: database, onsuccess: null };
    queueMicrotask(() => request.onsuccess?.());
    return request;
  } };
}

const backup = () => JSON.stringify({ version: 1, createdAt: new Date().toISOString(),
  settings: { version: 1, watchlist: [], compared: [], riskFreeRate: 0.06, lastFund: null }, funds: [] });
const payload = (nav: number) => Response.json({ status: 'SUCCESS', meta: {
  scheme_code: 122639, scheme_name: 'Example Direct Growth', fund_house: 'Example',
  scheme_type: 'Open Ended', scheme_category: 'Equity',
}, data: [{ date: '01-01-2025', nav: '100' }, { date: '02-01-2025', nav: String(nav) }] });

test('App requests recover from an aborted restore without clearing a successor request', async t => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: abortingDatabase() });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'indexedDB', previous);
    else Reflect.deleteProperty(globalThis, 'indexedDB');
  });
  const jobs: { started: ReturnType<typeof deferred<void>>; reply: ReturnType<typeof deferred<Response>> }[] = [];
  const enqueue = () => {
    const job = { started: deferred<void>(), reply: deferred<Response>() };
    jobs.push(job);
    return job;
  };
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    const job = jobs.shift();
    assert.ok(job, 'Unexpected provider request.');
    requests += 1;
    job.started.resolve();
    return job.reply.promise;
  });
  const app = appRequests();

  const firstJob = enqueue();
  const first = app.ensureFund(122639);
  await firstJob.started.promise;
  await assert.rejects(importBackup(backup()), /commit.*retained/i);
  firstJob.reply.resolve(payload(120));
  await first;
  assert.equal(app.inFlight.current.size, 0);
  assert.deepEqual(app.snapshot(), { loading: [], errors: {}, funds: {} });

  const retryJob = enqueue();
  const retry = app.ensureFund(122639, true);
  await retryJob.started.promise;
  retryJob.reply.resolve(payload(105));
  await retry;
  assert.equal(requests, 2);
  assert.equal(app.snapshot().funds[122639].points.at(-1)?.nav, 105);

  const oldJob = enqueue();
  const old = app.ensureFund(122639, true);
  await oldJob.started.promise;
  await assert.rejects(importBackup(backup()), /commit.*retained/i);
  const successorJob = enqueue();
  const successor = app.ensureFund(122639, true);
  await successorJob.started.promise;
  oldJob.reply.resolve(payload(120));
  await old;
  assert.equal(app.inFlight.current.get(122639)?.task, successor);
  assert.deepEqual(app.snapshot().loading, [122639]);
  assert.equal(app.snapshot().funds[122639].points.at(-1)?.nav, 105);
  successorJob.reply.resolve(payload(106));
  await successor;
  assert.equal(requests, 4);
  assert.equal(app.inFlight.current.size, 0);
  assert.deepEqual(app.snapshot().loading, []);
  assert.deepEqual(app.snapshot().errors, {});
  assert.equal(app.snapshot().funds[122639].points.at(-1)?.nav, 106);
});
