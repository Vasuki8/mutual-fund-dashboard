import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readAppearance, saveAppearance } from '../src/lib/appearance.ts';

test('a saved appearance survives the next read without touching research settings', () => {
  const values = new Map<string, string>([['fundscope-settings-v1', 'research-state']]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  assert.equal(readAppearance(storage), 'light');
  assert.equal(saveAppearance('dark', storage), true);
  assert.equal(readAppearance(storage), 'dark');
  assert.equal(values.get('fundscope-settings-v1'), 'research-state');
  saveAppearance('light', storage);
  assert.equal(readAppearance(storage), 'light');
});

test('invalid and inaccessible saved appearances fall back without crashing the app', () => {
  for (const value of [null, '', 'invalid', 'DARK']) assert.equal(readAppearance({ getItem: () => value }), 'light');
  const unavailable = { getItem(): never { throw new Error('Storage denied'); }, setItem(): never { throw new Error('Storage denied'); } };
  assert.equal(readAppearance(unavailable), 'light');
  assert.equal(saveAppearance('dark', unavailable), false);
});
