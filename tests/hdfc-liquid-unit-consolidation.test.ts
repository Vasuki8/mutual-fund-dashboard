import assert from 'node:assert/strict';
import { test } from 'node:test';
import { financialNavBasis, KNOWN_OVERNIGHT_WARNING } from '../src/lib/corporate-actions.ts';
import { cagr, trailingReturn } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';

const CODE = 100868;
const NAME = 'HDFC Liquid Fund - Regular Plan - Growth Option';
// Synthetic daily fixture, not claimed to be historical source prices.
// The exact event dates and 100:1 factor are independently source-verified.
function series(): NavPoint[] {
  const start = Date.parse('2014-01-01T00:00:00Z');
  const end = Date.parse('2026-10-26T00:00:00Z');
  const rows: NavPoint[] = [];
  for (let at = start; at <= end; at += 86_400_000) {
    const date = new Date(at).toISOString().slice(0, 10);
    if (date === '2015-08-29') continue;
    const adjusted = 2000 * Math.exp((at - start) / 86_400_000 * 0.00015);
    rows.push({ date, nav: date < '2015-08-30' ? adjusted / 100 : adjusted });
  }
  return rows;
}
function fund(overrides: Partial<FundData> = {}): FundData {
  return { meta: { schemeCode: CODE, schemeName: NAME, fundHouse: 'HDFC Mutual Fund',
    schemeType: 'Open Ended', schemeCategory: 'Debt Scheme - Liquid Fund' },
    points: series(), warnings: [KNOWN_OVERNIGHT_WARNING], fetchedAt: '2026-10-27T00:00:00.000Z',
    source: 'mfapi.in', stale: false, fromCache: false, ...overrides };
}

test('verified HDFC Liquid Regular Growth uses a calculation-only 100:1 old-unit adjustment', () => {
  const raw = fund(), before = structuredClone(raw);
  const result = financialNavBasis(raw);
  assert.equal(result.adjusted, true);
  assert.equal(result.adjustment?.schemeCode, CODE);
  assert.equal(result.adjustment?.factor, 100);
  assert.equal(result.adjustment?.oldNavThrough, '2015-08-28');
  assert.equal(result.adjustment?.firstNewNavDate, '2015-08-30');
  assert.match(result.adjustment?.label ?? '', /100-to-1 HDFC Liquid Fund.*30 August 2015/);
  assert.ok(result.adjustment?.evidenceUrl.startsWith('https://files.hdfcfund.com/'));
  assert.deepEqual(raw, before, 'Source dates, prices, warnings and fetch time stay untouched.');
  assert.notEqual(result.fund, raw);
  assert.deepEqual(result.fund.points.map(p => p.date), raw.points.map(p => p.date));
  for (let i = 0; i < raw.points.length; i++) {
    const expected = raw.points[i].nav * (raw.points[i].date < '2015-08-30' ? 100 : 1);
    assert.equal(result.fund.points[i].nav, expected);
  }
  assert.equal(qualityBlocked(raw), true);
  assert.equal(qualityBlocked(result.fund), false);
});

test('the 2015 unit change is not counted as investment return and post-event returns do not change', () => {
  const raw = fund(), result = financialNavBasis(raw);
  assert.equal(result.adjusted, true);
  const expected = Math.exp(0.00015 * 365) - 1;
  assert.ok(Math.abs(cagr(result.fund.points)! - expected) < 1e-10);
  assert.equal(trailingReturn(result.fund.points, 3), trailingReturn(raw.points, 3));
  assert.equal(trailingReturn(result.fund.points, 5), trailingReturn(raw.points, 5));
  const at = result.fund.points.findIndex(p => p.date === '2015-08-30');
  assert.ok(result.fund.points[at].nav / result.fund.points[at - 1].nav - 1 < 0.001);
  assert.ok(raw.points[at].nav / raw.points[at - 1].nav > 99);
  const twice = financialNavBasis(result.fund);
  assert.equal(twice.adjusted, false, 'Already adjusted copies must not be multiplied again.');
  assert.strictEqual(twice.fund, result.fund);
});

test('HDFC exact scheme identity does not authorize Direct, IDCW, renamed or unrelated plans', () => {
  const original = fund();
  const variants = [
    { ...original.meta, schemeCode: 100869 },
    { ...original.meta, schemeName: NAME.replace('Regular', 'Direct') },
    { ...original.meta, schemeName: NAME.replace('Growth', 'IDCW') },
    { ...original.meta, schemeName: 'HDFC Other Liquid Fund - Regular Plan - Growth Option' },
    { ...original.meta, fundHouse: 'Another Mutual Fund' },
  ];
  for (const meta of variants) {
    const raw = fund({ meta });
    assert.strictEqual(financialNavBasis(raw).fund, raw);
    assert.equal(financialNavBasis(raw).adjusted, false);
  }
});

test('unverified event dates, factors, further jumps and invalid observations remain blocked', () => {
  const initial = series();
  const variants = [
    initial.filter(p => p.date !== '2015-08-28'),
    initial.filter(p => p.date !== '2015-08-30'),
    initial.map(p => ({ ...p, nav: p.date < '2015-08-30' ? p.nav * 2 : p.nav })),
    initial.map(p => ({ ...p, nav: p.date === '2020-01-01' ? p.nav * 2 : p.nav })),
    initial.map(p => ({ ...p, nav: p.date === '2015-08-28' ? 0 : p.nav })),
    [...initial].reverse(),
    [...initial, initial.at(-1)!],
  ];
  for (const points of variants) {
    const raw = fund({ points });
    assert.equal(financialNavBasis(raw).adjusted, false);
    assert.strictEqual(financialNavBasis(raw).fund, raw);
  }
});

test('the new action cannot clear independent quality evidence or hide refresh failures', () => {
  for (const extra of [
    'Invalid NAV observations were excluded (1); derived analytics are blocked.',
    'Conflicting NAV values occur on 1 duplicate date(s); analytics are blocked.',
    'Unresolved discontinuity: independent source discrepancy still under review.',
  ]) {
    const raw = fund({ warnings: [KNOWN_OVERNIGHT_WARNING, extra] });
    assert.equal(financialNavBasis(raw).adjusted, false);
    assert.strictEqual(financialNavBasis(raw).fund, raw);
  }
  const operational = 'Refresh failed: MFAPI timeout. Showing cached history.';
  const raw = fund({ warnings: [KNOWN_OVERNIGHT_WARNING, operational] });
  const result = financialNavBasis(raw);
  assert.equal(result.adjusted, true);
  assert.deepEqual(result.fund.warnings, [operational]);
  assert.deepEqual(raw.warnings, [KNOWN_OVERNIGHT_WARNING, operational]);
});
