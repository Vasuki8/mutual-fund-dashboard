import assert from 'node:assert/strict';
import { test } from 'node:test';
import { returnCorrelationMatrix } from '../src/lib/return-correlation.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';

function fund(code: number, values: number[], options: {
  omittedMonth?: number; name?: string; warnings?: string[]; stale?: boolean;
} = {}): FundData {
  let nav = 100;
  const points: NavPoint[] = [{ date: '2023-01-31', nav }];
  for (let index = 0; index < values.length; index++) {
    nav *= 1 + values[index];
    const date = new Date(Date.UTC(2023, index + 2, 0)).toISOString().slice(0, 10);
    if (index !== options.omittedMonth) points.push({date, nav});
  }
  return {
    meta: { schemeCode: code, schemeName: options.name ?? ('Example ' + code + ' - Direct Plan - Growth'),
      fundHouse: 'Example AMC', schemeType: 'Open Ended Schemes', schemeCategory: 'Equity Scheme - Flexi Cap Fund' },
    points, fetchedAt: '2024-02-01T00:00:00Z', source: 'mfapi.in', fromCache: false,
    stale: options.stale ?? false, warnings: options.warnings ?? [],
  };
}
const alternating = Array.from({length: 12}, (_, i) => i % 2 === 0 ? 0.08 : -0.04);
const reverse = alternating.map(value => value === 0.08 ? -0.04 : 0.08);
const close = (actual: number | null, expected: number) => {
  assert.ok(actual !== null && Math.abs(actual - expected) < 1e-9, 'Unexpected correlation: ' + actual);
};

test('monthly Pearson matrix uses twelve paired complete months, with symmetric entries and diagonals', () => {
  const matrix = returnCorrelationMatrix([fund(100001, alternating),fund(100002, reverse)], 'MAX');
  assert.deepEqual(matrix.schemeCodes, [100001, 100002]);
  assert.equal(matrix.cells[0][1].pairedMonths, 12);
  assert.equal(matrix.cells[0][1].firstMonth, '2023-02');
  assert.equal(matrix.cells[0][1].lastMonth, '2024-01');
  assert.equal(matrix.cells[1][0].pairedMonths, 12);
  close(matrix.cells[0][0].correlation, 1);
  close(matrix.cells[1][1].correlation, 1);
  close(matrix.cells[0][1].correlation, -1);
  close(matrix.cells[1][0].correlation, -1);
});

test('missing month reduces paired observations and cannot be imputed as zero', () => {
  const matrix = returnCorrelationMatrix([
    fund(100001, alternating),
    fund(100002, reverse, { omittedMonth: 4 }),
  ], 'MAX');
  assert.equal(matrix.cells[0][1].pairedMonths, 10);
  assert.equal(matrix.cells[0][1].correlation, null);
  assert.match(matrix.cells[0][1].reason ?? '', /12 calendar months/i);
  assert.equal(matrix.cells[0][0].pairedMonths, 12);
});

test('an invalid distribution or data-quality history has no correlation cells', () => {
  const history = fund(100001, alternating);
  const idcw = fund(100002, reverse, {name: 'Example - Direct Plan - IDCW'});
  const invalid = fund(100003, reverse, {
    warnings: ['Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked.'],
  });
  const matrix = returnCorrelationMatrix([history,idcw,invalid], 'MAX');
  assert.equal(matrix.cells[0][1].correlation, null);
  assert.equal(matrix.cells[0][2].correlation, null);
  assert.match(matrix.cells[0][1].reason ?? '', /Growth/i);
  close(matrix.cells[0][0].correlation, 1);
});

test('constant NAV leaves variance zero and correlation unavailable', () => {
  const matrix = returnCorrelationMatrix([fund(100001, alternating),fund(100002, Array(12).fill(0))], 'MAX');
  assert.equal(matrix.cells[0][1].pairedMonths, 12);
  assert.equal(matrix.cells[0][1].correlation, null);
  assert.match(matrix.cells[0][1].reason ?? '', /variation/i);
  assert.equal(matrix.cells[1][1].correlation, null);
});

test('a custom end in a partial month does not include its unfinished return', () => {
  const matrix = returnCorrelationMatrix([fund(100001, alternating),fund(100002, reverse)],
    {start:'2023-01-01',end:'2023-12-15'});
  assert.equal(matrix.cells[0][1].pairedMonths, 10);
  assert.equal(matrix.cells[0][1].correlation, null);
});

test('data staleness is counted separately from eligible historical correlation', () => {
  const matrix = returnCorrelationMatrix([fund(100001, alternating, {stale:true}),fund(100002, reverse)], 'MAX');
  assert.equal(matrix.staleCount, 1);
  close(matrix.cells[0][1].correlation, -1);
});

test('a duplicate scheme code is not treated as two distinct portfolio assets', () => {
  const matrix = returnCorrelationMatrix([fund(100001,alternating),fund(100001,reverse)],'MAX');
  assert.equal(matrix.cells[0][1].correlation, null);
  assert.match(matrix.cells[0][1].reason ?? '', /distinct scheme codes/i);
});
