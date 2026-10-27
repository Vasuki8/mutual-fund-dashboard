import assert from 'node:assert/strict';
import { test } from 'node:test';
import { financialNavBasis, KNOWN_OVERNIGHT_WARNING } from '../src/lib/corporate-actions.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import { isActiveRepairCandidate } from '../scripts/active-repair-scope.ts';
import type { FundData } from '../src/lib/types.ts';

// Synthetic NAV values; exact source name and action dates were observed in
// immutable checkpoint 198. Never commit a substitute provider history.
const liveName = 'Aditya Birla Sun Life Liquid Fund - Regular Plan - GROWTH';
function fixture(name = liveName, code = 100047): FundData {
  return {
    meta: { schemeCode: code, schemeName: name, fundHouse: 'Aditya Birla Sun Life Mutual Fund',
      schemeType: 'Open Ended', schemeCategory: 'Debt Scheme - Liquid Fund', isinGrowth: 'INF209K01RU9' },
    points: [
      { date: '2010-10-06', nav: 15 },
      { date: '2011-10-06', nav: 16.5 },
      { date: '2011-10-07', nav: 165.04 },
      { date: '2015-10-07', nav: 220 },
      { date: '2018-10-26', nav: 280 },
      { date: '2020-10-26', nav: 330 },
      { date: '2026-10-26', nav: 455 },
    ],
    fetchedAt: '2026-10-27T12:00:00.000Z', source: 'mfapi.in',
    fromCache: false, stale: false, warnings: [KNOWN_OVERNIGHT_WARNING],
  };
}

test('the exact checkpoint-198 Regular Plan name receives the previously verified 2011 adjustment', () => {
  const fund = fixture();
  const original = structuredClone(fund);
  assert.equal(isActiveRepairCandidate({ schemeCode: 100047, current: true,
    latestDate: '2026-10-26', nav: '455' }, Date.parse('2026-10-27T14:00:00Z')), true);
  const result = financialNavBasis(fund);
  assert.equal(result.adjusted, true, 'An explicitly verified name alias must not disable the documented unit action.');
  assert.equal(result.adjustment?.schemeCode, 100047);
  assert.equal(result.adjustment?.factor, 10);
  assert.equal(result.adjustment?.oldNavThrough, '2011-10-06');
  assert.equal(result.adjustment?.firstNewNavDate, '2011-10-07');
  assert.equal(result.fund.points[1].nav, 165);
  assert.deepEqual(result.fund.points.slice(2), fund.points.slice(2));
  assert.equal(result.fund.meta.schemeName, liveName, 'Display the actual source name, not a rewritten alias.');
  assert.equal(qualityBlocked(result.fund), false);
  assert.deepEqual(fund, original, 'Source prices, warnings and metadata remain unchanged.');
});

test('the original exact official-sheet name remains compatible', () => {
  assert.equal(financialNavBasis(fixture('Aditya Birla Sun Life Liquid Fund - Growth')).adjusted, true);
});

test('name aliases cannot widen the action to Direct, IDCW, unrelated names or other scheme codes', () => {
  for (const fund of [
    fixture(liveName, 100046), fixture(liveName, 100051), fixture(liveName, 119436),
    fixture('Aditya Birla Sun Life Liquid Fund - Direct Plan - GROWTH'),
    fixture('Aditya Birla Sun Life Liquid Fund - Regular Plan - IDCW'),
    fixture('Aditya Birla Sun Life Liquid Fund - Regular Plan - Growth Option'),
    fixture('Aditya Birla Sun Life Liquid Fund - Institutional Plan - GROWTH'),
    fixture('Aditya Birla Sun Life Money Market Fund - Regular Plan - GROWTH'),
    fixture('Another Liquid Fund - Regular Plan - GROWTH'),
  ]) {
    const result = financialNavBasis(fund);
    assert.equal(result.adjusted, false, fund.meta.schemeName + ':' + fund.meta.schemeCode);
    assert.strictEqual(result.fund, fund);
    assert.equal(qualityBlocked(result.fund), true);
  }
});

test('the verified Regular name still fails closed for wrong dates, factors and independent quality evidence', () => {
  const badDate = fixture(); badDate.points[1] = { ...badDate.points[1], date: '2011-10-05' };
  const badFactor = fixture(); badFactor.points[2] = { ...badFactor.points[2], nav: 180 };
  const extraJump = fixture(); extraJump.points[4] = { ...extraJump.points[4], nav: 800 };
  const invalid = fixture(); invalid.warnings.push('Invalid NAV observations were excluded (1); derived analytics are blocked.');
  const conflict = fixture(); conflict.warnings.push('Conflicting NAV values occur on 1 duplicate date(s); analytics are blocked.');
  for (const fund of [badDate, badFactor, extraJump, invalid, conflict]) {
    const result = financialNavBasis(fund);
    assert.equal(result.adjusted, false);
    assert.strictEqual(result.fund, fund);
    assert.equal(qualityBlocked(result.fund), true);
  }
});
