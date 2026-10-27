import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeHistory, validateHistory } from '../server/validation.ts';
import type { HistoryDocument, RawNav } from '../server/types.ts';

const CODE = 100177;
const FIRST = '2026-10-26T10:00:00.000Z';
const NEXT = '2026-10-26T11:00:00.000Z';
const jumpWarnings = (warnings: string[]) => warnings.filter(w => /^Unresolved discontinuity:/.test(w));
const row = (day: number, nav: number): RawNav => ({ date: `${day}-10-2026`, nav: String(nav) });
function source(data: RawNav[]) {
  return validateHistory({ status: 'SUCCESS', meta: {
    scheme_code: CODE, scheme_name: 'Synthetic Growth', fund_house: 'Synthetic AMC',
    scheme_type: 'Open Ended', scheme_category: 'Equity',
  }, data }, CODE);
}
function document(data: RawNav[]): HistoryDocument {
  return mergeHistory(source(data), null, FIRST, FIRST);
}

test('a shorter source response cannot leave a jump warning absent from the retained merged history', () => {
  const previous = document([row(21, 20), row(20, 16), row(19, 13), row(18, 10)]);
  const incoming = source([row(21, 20), row(18, 10)]);
  const untouched = structuredClone({ previous, incoming });
  assert.equal(jumpWarnings(incoming.warnings).length, 1, 'Sparse input has a single apparent 100% step.');
  const merged = mergeHistory(incoming, previous, NEXT, NEXT);
  assert.deepEqual(merged.payload.data, previous.payload.data, 'All source observations must remain unchanged.');
  assert.deepEqual(jumpWarnings(merged.warnings), [], 'Retained intervening observations remove the apparent jump.');
  assert.equal(merged.unresolved, false);
  assert.ok(merged.warnings.some(w => /archived observation\(s\).*retained/.test(w)));
  assert.deepEqual({ previous, incoming }, untouched);
});

test('the final union has one authoritative jump count, not separate input and merged counts', () => {
  const previous = document([row(21, 30), row(20, 30), row(19, 10), row(18, 10)]);
  const incoming = source([row(22, 10), row(21, 30)]);
  const merged = mergeHistory(incoming, previous, NEXT, NEXT);
  const reparsed = validateHistory(merged.payload, CODE);
  assert.equal(jumpWarnings(reparsed.warnings).length, 1);
  assert.match(jumpWarnings(reparsed.warnings)[0], /: 2 single-observation/);
  assert.deepEqual(jumpWarnings(merged.warnings), jumpWarnings(reparsed.warnings));
  assert.equal(merged.unresolved, true, 'Both real discontinuities still block analytics.');
  assert.equal(merged.payload.data.length, 5);
});

test('an older response cannot keep a jump warning from overlapping values that were not selected', () => {
  const previous = document([row(22, 10.4), row(21, 10.3), row(20, 10.2), row(19, 10.1)]);
  const incoming = source([row(21, 10.3), row(20, 30), row(19, 10.1), row(18, 10)]);
  const merged = mergeHistory(incoming, previous, NEXT, NEXT, '2026-10-22');
  assert.deepEqual(jumpWarnings(merged.warnings), []);
  assert.equal(merged.payload.data.find(p => p.date === '20-10-2026')?.nav, '10.2');
  assert.equal(merged.unresolved, true, 'The independent older-response condition must remain unresolved.');
  assert.ok(merged.warnings.some(w => /older latest observation/.test(w)));
});

test('recomputed jump counts cannot clear invalid NAV or conflicting duplicate warnings', () => {
  const previous = document([row(21, 20), row(20, 16), row(19, 13), row(18, 10)]);
  for (const invalid of [
    [row(21, 20), row(18, 10), row(17, 0)],
    [row(21, 20), row(21, 21), row(18, 10)],
  ]) {
    const merged = mergeHistory(source(invalid), previous, NEXT, NEXT);
    assert.deepEqual(jumpWarnings(merged.warnings), []);
    assert.ok(merged.warnings.some(w => /^(Invalid NAV|Conflicting NAV)/.test(w)));
    assert.equal(merged.unresolved, true);
  }
});

test('unrecognized discontinuity messages are retained instead of treated as recomputable counters', () => {
  const incoming = source([row(21, 10.1), row(20, 10)]);
  incoming.warnings.push('Unresolved discontinuity: independent source discrepancy still under review.');
  const merged = mergeHistory(incoming, null, FIRST, FIRST);
  assert.ok(merged.warnings.includes('Unresolved discontinuity: independent source discrepancy still under review.'));
});
