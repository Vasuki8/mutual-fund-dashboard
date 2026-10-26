import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AMFI_OPEN_ENDED_CODES } from '../src/lib/amfi-open-ended-roster.ts';
import { filterCurrentlyReportingOpenEnded, isCurrentlyReportingOpenEnded,
  OFFICIAL_SCHEME_ROSTER_DATE } from '../src/lib/current-official-schemes.ts';

const asOf = Date.UTC(2026,9,26,12);
const example = (schemeCode:number,latestDate:string|null = '2026-10-23',
  current = true,nav:string|null='123.45')=>({schemeCode,latestDate,current,nav});

test('manual official roster keeps plan-specific IDs, not closed/future/unknown-launch entries',()=>{
  assert.equal(OFFICIAL_SCHEME_ROSTER_DATE,'2026-10-26');
  assert.equal(AMFI_OPEN_ENDED_CODES.length,10273);
  assert.equal(new Set(AMFI_OPEN_ENDED_CODES).size,AMFI_OPEN_ENDED_CODES.length);
  assert.ok(AMFI_OPEN_ENDED_CODES.includes(100033),'regular growth code');
  assert.ok(AMFI_OPEN_ENDED_CODES.includes(119436),'direct growth code');
  for(const excluded of [100373,105660,154875,153406])
    assert.ok(!AMFI_OPEN_ENDED_CODES.includes(excluded),'Code '+excluded+' must not appear');
});

test('current reporting requires official roster, latest membership and recent positive NAV',()=>{
  assert.equal(isCurrentlyReportingOpenEnded(example(100033),asOf),true);
  assert.equal(isCurrentlyReportingOpenEnded(example(119436),asOf),true);
  for(const invalid of [
    example(100373),example(154875),example(100033,'2026-10-18'),
    example(100033,'2026-10-27'),example(100033,null),
    example(100033,'not a date'),example(100033,'2026-10-23',false),
    example(100033,'2026-10-23',true,null),example(100033,'2026-10-23',true,'0'),
  ]) assert.equal(isCurrentlyReportingOpenEnded(invalid,asOf),false,JSON.stringify(invalid));
});

test('source delay fails closed instead of showing outdated schemes',()=>{
  const items=[example(100033),example(100373),example(119436,'2026-10-22')];
  assert.deepEqual(filterCurrentlyReportingOpenEnded(items,asOf).map(s=>s.schemeCode),[100033,119436]);
  assert.deepEqual(filterCurrentlyReportingOpenEnded(items,Date.UTC(2026,10,10)),[]);
  assert.deepEqual(filterCurrentlyReportingOpenEnded(items,Number.NaN),[]);
});
