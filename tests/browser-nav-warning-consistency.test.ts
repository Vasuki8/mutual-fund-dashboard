import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportBackup, getCachedFund, importBackup, mergeCachedFund,
  putCachedFund, validateCachedFund } from '../src/lib/storage.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';

const CODE = 900001;
const FIRST = '2026-10-26T10:00:00.000Z';
const NEXT = '2026-10-26T11:00:00.000Z';
const UNKNOWN = 'Unresolved discontinuity: independent source discrepancy still under review.';
const countWarning = (count: number) =>
  `Unresolved discontinuity: ${count} single-observation move(s) exceed 40%; derived analytics are blocked.`;
const points: NavPoint[] = [
  { date: '2026-10-19', nav: 10 },
  { date: '2026-10-20', nav: 10.1 },
  { date: '2026-10-21', nav: 10.2 },
  { date: '2026-10-22', nav: 10.3 },
];
function fund(overrides: Partial<FundData> = {}): FundData {
  return { meta: { schemeCode: CODE, schemeName: 'Synthetic - Direct Plan - Growth',
    fundHouse: 'Synthetic AMC', schemeType: 'Open Ended', schemeCategory: 'Equity' },
    points, fetchedAt: FIRST, source: 'mfapi.in', fromCache: false, stale: false,
    warnings: [], ...overrides };
}
const jumpWarnings = (value: FundData) => value.warnings.filter(w => /^Unresolved discontinuity:/.test(w));

// These fixtures test warning accounting, not replacement prices for any real fund.
test('cache validation removes an obsolete generated jump count after checking the actual stored NAVs', () => {
  const original = fund({ warnings: [countWarning(1), 'Using a saved source history.'] });
  const before = structuredClone(original);
  const checked = validateCachedFund(original);
  assert.deepEqual(jumpWarnings(checked), []);
  assert.equal(qualityBlocked(checked), false);
  assert.deepEqual(checked.points, original.points);
  assert.equal(checked.fetchedAt, FIRST);
  assert.ok(checked.warnings.includes('Using a saved source history.'));
  assert.deepEqual(original, before, 'Reading the cache must not mutate the saved input.');
});

test('cache validation replaces conflicting generated counts with the true two-jump count', () => {
  const observed = [
    { date: '2026-10-19', nav: 10 }, { date: '2026-10-20', nav: 30 },
    { date: '2026-10-21', nav: 10 }, { date: '2026-10-22', nav: 10.1 },
  ];
  const checked = validateCachedFund(fund({ points: observed, warnings: [countWarning(1), countWarning(7)] }));
  assert.deepEqual(jumpWarnings(checked), [countWarning(2)]);
  assert.equal(qualityBlocked(checked), true, 'Real price discontinuities must stay blocked.');
  assert.deepEqual(checked.points, observed);
});

test('cache validation keeps invalid, conflicting and unrecognized evidence when no large move is present', () => {
  const evidence = [UNKNOWN,
    'Invalid NAV observations were excluded (1); derived analytics are blocked until the data is resolved.',
    'Conflicting NAV values occur on 1 duplicate date(s); analytics are blocked.'];
  const checked = validateCachedFund(fund({ warnings: [countWarning(1), ...evidence] }));
  assert.deepEqual(checked.warnings, evidence);
  assert.equal(qualityBlocked(checked), true);
});

test('browser refresh retains an unknown discontinuity warning rather than treating it as a generated counter', () => {
  const previous = fund();
  const incoming = fund({ fetchedAt: NEXT, warnings: [UNKNOWN] });
  const before = structuredClone({ previous, incoming });
  const merged = mergeCachedFund(incoming, previous);
  assert.ok(merged.warnings.includes(UNKNOWN));
  assert.equal(qualityBlocked(merged), true);
  assert.deepEqual(merged.points, points);
  assert.deepEqual({ previous, incoming }, before);
});

test('a late refresh cannot remove an unknown warning attached to the preferred newer history', () => {
  const previous = fund({ fetchedAt: NEXT, warnings: [UNKNOWN] });
  const merged = mergeCachedFund(fund(), previous);
  assert.ok(merged.warnings.includes(UNKNOWN));
  assert.equal(qualityBlocked(merged), true);
  assert.equal(merged.fetchedAt, NEXT);
});

test('regenerated browser counters do not alter the original archive provenance record', () => {
  const archive = { fetchedAt: FIRST, archivedAt: NEXT, fromArchive: true, stale: false,
    coverageStart: '2026-10-19', coverageEnd: '2026-10-22', observationCount: points.length,
    warnings: [countWarning(1)] };
  const checked = validateCachedFund(fund({ archive, warnings: [countWarning(1)] }));
  assert.deepEqual(jumpWarnings(checked), []);
  assert.deepEqual(checked.archive, archive, 'Original archive diagnostics remain available for inspection.');
});

test('backup restore and refresh preserve unknown warnings but do not resurrect obsolete generated counters', async () => {
  const saved = fund({ warnings: [countWarning(1)] });
  const settings = { version: 1, watchlist: [saved.meta], compared: [], riskFreeRate: 0.06, lastFund: saved.meta };
  await importBackup(JSON.stringify({ version: 1, createdAt: FIRST, settings, funds: [saved] }));
  const restored = await getCachedFund(CODE);
  assert.ok(restored);
  assert.deepEqual(jumpWarnings(restored), []);
  assert.deepEqual(restored.points, points);
  const refreshed = await putCachedFund(fund({ fetchedAt: NEXT, warnings: [UNKNOWN] }));
  assert.ok(refreshed.warnings.includes(UNKNOWN));
  assert.equal(qualityBlocked(refreshed), true);
  const exported = JSON.parse(await exportBackup());
  assert.deepEqual(exported.funds[0].points, points);
  assert.deepEqual(jumpWarnings(exported.funds[0]), [UNKNOWN]);
  assert.equal(exported.settings.watchlist[0].schemeCode, CODE);
});
