import assert from 'node:assert/strict';
import { test } from 'node:test';
import { financialNavBasis, KNOWN_OVERNIGHT_WARNING } from '../src/lib/corporate-actions.ts';
import { cagr, trailingReturn } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';

const CODE = 119091;
const NAME = 'HDFC Liquid Fund - Direct Plan - Growth Option';
// Synthetic fixture: the identity, dates and factor are independently verified;
// these generated prices are NOT represented as the actual archived NAVs.
function points(): NavPoint[] {
  const start = Date.parse('2013-01-01T00:00:00Z');
  const end = Date.parse('2026-10-26T00:00:00Z');
  const result: NavPoint[] = [];
  for (let at = start; at <= end; at += 86_400_000) {
    const date = new Date(at).toISOString().slice(0, 10);
    if (date === '2015-08-29') continue;
    const normalized = 1000 * Math.exp((at - start) / 86_400_000 * 0.00016);
    result.push({ date, nav: date < '2015-08-30' ? normalized / 100 : normalized });
  }
  return result;
}
function fund(overrides: Partial<FundData> = {}): FundData {
  return { meta: { schemeCode: CODE, schemeName: NAME, fundHouse: 'HDFC Mutual Fund',
    schemeType: 'Open Ended', schemeCategory: 'Debt Scheme - Liquid Fund' },
    points: points(), warnings: [KNOWN_OVERNIGHT_WARNING],
    fetchedAt: '2026-10-27T00:00:00.000Z', source: 'mfapi.in', stale: false, fromCache: true,
    ...overrides };
}

test('the independently verified HDFC Direct Growth identity receives its calculation-only 100:1 adjustment', () => {
  const original = fund(), saved = structuredClone(original);
  const result = financialNavBasis(original);
  assert.equal(result.adjusted, true);
  assert.equal(result.adjustment?.schemeCode, CODE);
  assert.equal(result.adjustment?.factor, 100);
  assert.equal(result.adjustment?.oldNavThrough, '2015-08-28');
  assert.equal(result.adjustment?.firstNewNavDate, '2015-08-30');
  assert.ok(result.adjustment?.evidenceUrl.startsWith('https://files.hdfcfund.com/'));
  assert.deepEqual(original, saved, 'Raw NAVs, metadata, dates, timestamps and warnings stay unchanged.');
  assert.equal(result.fund.points.length, original.points.length);
  for (let i = 0; i < original.points.length; i++) {
    const raw = original.points[i], adjusted = result.fund.points[i];
    assert.equal(adjusted.date, raw.date);
    assert.equal(adjusted.nav, raw.date < '2015-08-30' ? raw.nav * 100 : raw.nav);
  }
  assert.equal(qualityBlocked(original), true);
  assert.equal(qualityBlocked(result.fund), false);
});

test('HDFC Direct Growth return calculation removes denomination gain without altering post-event returns', () => {
  const original = fund(), basis = financialNavBasis(original);
  assert.equal(basis.adjusted, true);
  assert.ok(Math.abs(cagr(basis.fund.points)! - (Math.exp(0.00016 * 365) - 1)) < 1e-10);
  for (const years of [1, 3, 5]) {
    assert.equal(trailingReturn(basis.fund.points, years), trailingReturn(original.points, years));
  }
  const at = basis.fund.points.findIndex(p => p.date === '2015-08-30');
  assert.ok(basis.fund.points[at].nav / basis.fund.points[at - 1].nav < 1.001);
  assert.strictEqual(financialNavBasis(basis.fund).fund, basis.fund);
  assert.equal(financialNavBasis(basis.fund).adjusted, false, 'No double normalization.');
});

test('HDFC Regular and Direct codes cannot exchange plan names or authorize distribution options', () => {
  const meta = fund().meta;
  const invalid = [
    { ...meta, schemeCode: 100868 },
    { ...meta, schemeName: NAME.replace('Direct', 'Regular') },
    { ...meta, schemeCode: 119090 },
    { ...meta, schemeName: NAME.replace('Growth', 'IDCW') },
    { ...meta, schemeName: NAME + ' Bonus' },
    { ...meta, fundHouse: 'Another Mutual Fund' },
  ];
  for (const identity of invalid) {
    const original = fund({ meta: identity });
    assert.equal(financialNavBasis(original).adjusted, false);
    assert.strictEqual(financialNavBasis(original).fund, original);
  }
  const regular = fund({ meta: { ...meta, schemeCode: 100868,
    schemeName: NAME.replace('Direct', 'Regular') } });
  assert.equal(financialNavBasis(regular).adjusted, true, 'Existing Regular-plan correction still works.');
});

test('HDFC Direct action still rejects wrong dates, factors, second jumps and malformed histories', () => {
  const rows = points();
  for (const invalid of [
    rows.filter(p => p.date !== '2015-08-28'),
    rows.filter(p => p.date !== '2015-08-30'),
    rows.map(p => ({ ...p, nav: p.date >= '2015-08-30' ? p.nav * 1.002 : p.nav })),
    rows.map(p => ({ ...p, nav: p.date >= '2015-08-30' ? p.nav * 0.998 : p.nav })),
    rows.map(p => ({ ...p, nav: p.date === '2020-01-01' ? p.nav * 2 : p.nav })),
    rows.map(p => ({ ...p, nav: p.date === '2015-08-28' ? 0 : p.nav })),
    [...rows].reverse(), [...rows, rows.at(-1)!],
  ]) {
    const original = fund({ points: invalid });
    assert.equal(financialNavBasis(original).adjusted, false);
    assert.strictEqual(financialNavBasis(original).fund, original);
  }
});

test('HDFC Direct correction preserves independent warnings and operational failures', () => {
  for (const warning of [
    'Invalid NAV observations were excluded (1); derived analytics are blocked.',
    'Conflicting NAV values occur on 1 duplicate date(s); analytics are blocked.',
    'Unresolved discontinuity: independent source discrepancy under review.',
  ]) {
    const original = fund({ warnings: [KNOWN_OVERNIGHT_WARNING, warning] });
    assert.equal(financialNavBasis(original).adjusted, false);
    assert.strictEqual(financialNavBasis(original).fund, original);
  }
  const operational = 'Refresh failed: MFAPI timeout. Showing cached history.';
  const original = fund({ warnings: [KNOWN_OVERNIGHT_WARNING, operational] });
  const basis = financialNavBasis(original);
  assert.equal(basis.adjusted, true);
  assert.deepEqual(basis.fund.warnings, [operational]);
  assert.deepEqual(original.warnings, [KNOWN_OVERNIGHT_WARNING, operational]);
});
