import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCatalogue, parseAssets, chooseWork, coverage } from '../scripts/github-history.mjs';

function item(name, start, end, attempt, ok, gap) {
  return { name: name ?? ('nav-' + String(start).padStart(6, '0') + '-'
    + String(end).padStart(6, '0') + '-a' + attempt + '-ok'
    + String(ok).padStart(3, '0') + '-gap' + String(gap).padStart(3, '0') + '.json.gz'),
    state: 'uploaded', id: start * 10 + attempt + 1, size: 1000,
    digest: 'sha256:abc', browser_download_url: 'https://github.com/Vasuki8/mutual-fund-dashboard/releases/download/test/asset' };
}
test('catalogue preserves unique fund identity without requiring hosted Site state', () => {
  const list = Array.from({ length: 10_100 }, (_, n) =>
    ({ schemeCode: 100_000 + n, schemeName: 'Fund ' + n }));
  list.push({ schemeCode: 100_000, schemeName: 'Fund 0' });
  const parsed = parseCatalogue(list);
  assert.equal(parsed.entries.length, 10_100);
  assert.equal(parsed.invalidCount, 0);
  assert.equal(parsed.entries[0].schemeCode, 100_000);
  assert.throws(() => parseCatalogue(list.slice(0, 100)));
});
test('primary assets support independent GitHub-only checkpoint progress', () => {
  const assets = parseAssets([item(null, 0, 199, 0, 195, 5)], 420);
  assert.deepEqual(chooseWork(420, assets), { start: 200, attempt: 0, previous: null });
  assert.deepEqual(coverage(420, assets), { checked: 200, valid: 195, gaps: 5,
    unresolved: 5, exhausted: 0, unattempted: 220, completePass: false });
});
test('after primary pass, retries target only remaining gaps and cannot conceal exhausted gaps', () => {
  const assets = parseAssets([
    item(null, 0, 199, 0, 190, 10),
    item(null, 200, 399, 0, 200, 0),
    item(null, 400, 419, 0, 20, 0),
  ], 420);
  assert.equal(chooseWork(420, assets).attempt, 1);
  assets.set('0:1', { start: 0, attempt: 1, ok: 8, gap: 2 });
  assert.equal(chooseWork(420, assets).attempt, 2);
  assets.set('0:2', { start: 0, attempt: 2, ok: 1, gap: 1 });
  assert.equal(chooseWork(420, assets), null);
  assert.deepEqual(coverage(420, assets), { checked: 420, valid: 419, gaps: 1,
    unresolved: 0, exhausted: 1, unattempted: 0, completePass: true });
});
test('malformed assets cannot authorize historical data coverage', () => {
  assert.throws(() => parseAssets([item(null, 0, 199, 0, 198, 1)], 420));
  assert.throws(() => parseAssets([
    item(null, 0, 199, 0, 199, 1), item(null, 0, 199, 0, 199, 1),
  ], 420));
  assert.throws(() => parseAssets([item(null, 0, 199, 0, 199, 1)], 100));
});
