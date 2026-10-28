import assert from 'node:assert/strict';
import { test } from 'node:test';
import { financialNavBasis, KNOWN_OVERNIGHT_WARNING } from '../src/lib/corporate-actions.ts';
import { cagr, trailingReturn } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';

const identities = [
  [101993, 'HDFC Money Market Fund - Regular Plan - Growth Option', 'Savings Plan'],
  [101996, 'HDFC Overnight Fund - Regular Plan - Growth Option', 'Call Plan'],
  [119092, 'HDFC Money Market Fund - Direct Plan - Growth Option', 'Savings Plan'],
  [119110, 'HDFC Overnight Fund - Direct Plan - Growth Option', 'Call Plan'],
] as const;
// Synthetic NAVs, not source prices. Exact identity/date/factor evidence is
// independently recorded in the read-only archive audit and official notices.
function observations(): NavPoint[] {
  const start = Date.parse('2013-01-01T00:00:00Z');
  const end = Date.parse('2026-10-26T00:00:00Z');
  const rows: NavPoint[] = [];
  for (let at = start; at <= end; at += 86_400_000) {
    const date = new Date(at).toISOString().slice(0, 10);
    if (date === '2015-08-29') continue;
    const normalized = 1000 * Math.exp((at - start) / 86_400_000 * 0.00016);
    rows.push({ date, nav: date < '2015-08-30' ? normalized / 100 : normalized });
  }
  return rows;
}
function fund(index: number, overrides: Partial<FundData> = {}): FundData {
  const [schemeCode, schemeName] = identities[index];
  return { meta: { schemeCode, schemeName, fundHouse: 'HDFC Mutual Fund',
    schemeType: 'Open Ended', schemeCategory: 'Debt Scheme - ' + (schemeName.includes('Overnight') ? 'Overnight Fund' : 'Money Market Fund') },
    points: observations(), warnings: [KNOWN_OVERNIGHT_WARNING],
    fetchedAt: '2026-10-28T00:00:00.000Z', source: 'mfapi.in', stale: false, fromCache: true, ...overrides };
}

for (const [index, [code, name, formerPlan]] of identities.entries()) {
  test(`verified cash-management successor ${code} uses calculation-only 100:1 normalization`, () => {
    const raw = fund(index), untouched = structuredClone(raw);
    const basis = financialNavBasis(raw);
    assert.equal(basis.adjusted, true, name);
    assert.equal(basis.adjustment?.schemeCode, code);
    assert.equal(basis.adjustment?.factor, 100);
    assert.equal(basis.adjustment?.oldNavThrough, '2015-08-28');
    assert.equal(basis.adjustment?.firstNewNavDate, '2015-08-30');
    assert.ok(basis.adjustment?.label.includes(formerPlan), 'Disclose the historic plan identity.');
    assert.ok(basis.adjustment?.evidenceUrl.startsWith('https://files.hdfcfund.com/'));
    assert.equal(qualityBlocked(raw), true);
    assert.equal(qualityBlocked(basis.fund), false);
    assert.equal(basis.fund.points.length, raw.points.length);
    for (let i = 0; i < raw.points.length; i++) {
      const before = raw.points[i], after = basis.fund.points[i];
      assert.equal(after.date, before.date);
      assert.equal(after.nav, before.date < '2015-08-30' ? before.nav * 100 : before.nav);
    }
    assert.deepEqual(raw, untouched, 'Source NAVs, timestamps, identity and warning evidence are immutable.');
    assert.ok(Math.abs(cagr(basis.fund.points)! - (Math.exp(0.00016 * 365) - 1)) < 1e-10);
    for (const years of [1, 3, 5]) assert.equal(trailingReturn(basis.fund.points, years), trailingReturn(raw.points, years));
    assert.strictEqual(financialNavBasis(basis.fund).fund, basis.fund);
    assert.equal(financialNavBasis(basis.fund).adjusted, false, 'The normalized copy cannot be adjusted twice.');
  });
}

test('cash-management actions reject exchanged names, unknown codes, distributions and wrong fund houses', () => {
  for (let index = 0; index < identities.length; index++) {
    const raw = fund(index), meta = raw.meta;
    const mismatches = [
      ...identities.filter(([code]) => code !== meta.schemeCode).map(([, schemeName]) => ({ ...meta, schemeName })),
      { ...meta, schemeCode: 999999 }, { ...meta, schemeName: meta.schemeName.replace('Growth', 'IDCW') },
      { ...meta, schemeName: meta.schemeName + ' Bonus' }, { ...meta, fundHouse: 'Another Mutual Fund' },
    ];
    for (const wrong of mismatches) {
      const input = { ...raw, meta: wrong };
      assert.equal(financialNavBasis(input).adjusted, false);
      assert.strictEqual(financialNavBasis(input).fund, input);
    }
  }
});

test('each new cash-management identity retains exact boundary, factor and complete-series guards', () => {
  const rows = observations();
  const invalid = [
    rows.filter(p => p.date !== '2015-08-28'), rows.filter(p => p.date !== '2015-08-30'),
    rows.map(p => ({ ...p, nav: p.date >= '2015-08-30' ? p.nav * 1.002 : p.nav })),
    rows.map(p => ({ ...p, nav: p.date >= '2015-08-30' ? p.nav * 0.998 : p.nav })),
    rows.map(p => ({ ...p, nav: p.date === '2020-01-01' ? p.nav * 2 : p.nav })),
    rows.map(p => ({ ...p, nav: p.date === '2015-08-28' ? 0 : p.nav })),
    rows.map(p => ({ ...p, nav: p.date === '2015-08-28' ? Infinity : p.nav })),
    rows.map(p => ({ ...p, date: p.date === '2015-08-28' ? '2015-02-30' : p.date })),
    [...rows].reverse(), [...rows, rows.at(-1)!], [],
  ];
  for (let index = 0; index < identities.length; index++) {
    for (const points of invalid) {
      const raw = fund(index, { points });
      assert.equal(financialNavBasis(raw).adjusted, false);
      assert.strictEqual(financialNavBasis(raw).fund, raw);
    }
  }
});

test('all four successor plans retain independent quality evidence and operational warnings', () => {
  for (let index = 0; index < identities.length; index++) {
    for (const warning of [
      'Invalid NAV observations were excluded (1); derived analytics are blocked.',
      'Conflicting NAV values occur on 1 duplicate date(s); analytics are blocked.',
      'Unresolved discontinuity: independently reported discrepancy under review.',
    ]) {
      const raw = fund(index, { warnings: [KNOWN_OVERNIGHT_WARNING, warning] });
      assert.equal(financialNavBasis(raw).adjusted, false);
      assert.strictEqual(financialNavBasis(raw).fund, raw);
    }
    const noWarning = fund(index, { warnings: [] });
    assert.equal(financialNavBasis(noWarning).adjusted, false);
    const operational = 'Refresh failed: MFAPI timeout. Showing cached history.';
    const raw = fund(index, { warnings: [KNOWN_OVERNIGHT_WARNING, operational] });
    const basis = financialNavBasis(raw);
    assert.equal(basis.adjusted, true);
    assert.deepEqual(basis.fund.warnings, [operational]);
    assert.deepEqual(raw.warnings, [KNOWN_OVERNIGHT_WARNING, operational]);
  }
});
