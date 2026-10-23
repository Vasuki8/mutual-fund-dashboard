import assert from 'node:assert/strict';
import { test } from 'node:test';
import { archivedFundReturns, localFundReturns, returnValue, sortFundSchemes, validateReturnIndex } from '../src/lib/fund-sort.ts';
import type { Scheme, FundData } from '../src/lib/types.ts';
import type { HistoryDocument } from '../server/types.ts';

const schemes: Scheme[] = Array.from({ length: 23 }, (_, i) => {
  const code = i + 1;
  return { schemeCode: code, schemeName: `Scheme ${String(24 - code).padStart(2, '0')} Direct Growth` };
});
const entries = Object.fromEntries(schemes.slice(0, 19).map((scheme, i) => [scheme.schemeCode, {
  schemeCode: scheme.schemeCode, navDate: '2026-10-21',
  oneYear: (i % 5) / 10, threeYear: (20 - i) / 100, fiveYear: i / 100,
}]));
const date=(yyyy:number,mm:number,dd:number)=>`${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;

test('fund name sorting occurs across all matching pages, with a stable code tie-breaker', () => {
  const originals = structuredClone(schemes);
  const ascending = sortFundSchemes(schemes, { key: 'name', desc: false }, entries);
  assert.deepEqual(ascending.slice(0, 8).map(s=>s.schemeCode), [23,22,21,20,19,18,17,16]);
  assert.deepEqual(ascending.slice(8,16).map(s=>s.schemeCode), [15,14,13,12,11,10,9,8]);
  assert.deepEqual(sortFundSchemes(schemes, { key: 'name', desc: true }, entries).slice(0,8).map(s=>s.schemeCode),
    [1,2,3,4,5,6,7,8]);
  assert.deepEqual(schemes, originals, 'Sorting must never mutate the catalogue or watchlist.');
});

test('return sorting ranks the whole set before pagination in both directions', () => {
  const highest = sortFundSchemes(schemes, { key: '3', desc: true }, entries);
  assert.deepEqual(highest.slice(0, 8).map(s=>s.schemeCode), [1,2,3,4,5,6,7,8]);
  assert.deepEqual(highest.slice(8, 16).map(s=>s.schemeCode), [9,10,11,12,13,14,15,16]);
  assert.deepEqual(highest.slice(16).map(s=>s.schemeCode), [17,18,19,23,22,21,20]);
  const lowest = sortFundSchemes(schemes, { key: '3', desc: false }, entries);
  assert.deepEqual(lowest.slice(0,8).map(s=>s.schemeCode), [19,18,17,16,15,14,13,12]);
  assert.deepEqual(lowest.slice(-4).map(s=>s.schemeCode), [23,22,21,20],
    'Missing histories must rank last, not lead the ascending list.');
  assert.equal(returnValue(entries[1], '3'), .2);
  assert.equal(returnValue(entries[22], '3'), null);
});

test('tied return ranks use scheme name, and not the original or previous page', () => {
  const sorted = sortFundSchemes(schemes, { key: '1', desc: true }, entries);
  const top = sorted.slice(0,3).map(s=>s.schemeCode);
  assert.deepEqual(top, [15,10,5],
    'Equal 0.4 returns are tied and sorted by full name.');
  assert.equal(sorted.at(-1)?.schemeCode, 20);
});

const raw = (date:string,nav:number)=>({ date: date.slice(8,10)+'-'+date.slice(5,7)+'-'+date.slice(0,4), nav:String(nav) });
function history(code=111001, option='Example Fund - Direct Plan - Growth', unresolved=false): HistoryDocument {
  const year1 = Array.from({length: 7}, (_,i) => raw(date(2021+i,1,1), 100*Math.pow(1.1,i)));
  const data=[...year1].reverse();
  return { version:1, schemeCode:code, fetchedAt:'2026-10-22T10:00:00.000Z',
    archivedAt:'2026-10-22T11:00:00.000Z', coverageStart:'2021-01-01', coverageEnd:'2027-01-01',
    unresolved, warnings:[], payload:{ status:'SUCCESS', meta: {
      scheme_code:code, scheme_name:option, scheme_type:'Open Ended',scheme_category:'Equity',fund_house:'Test'
    }, data } };
}

test('published 1Y absolute and 3Y/5Y CAGR use the same trailing-return methods as fund detail', () => {
  const h=history();
  const indexed=archivedFundReturns(h);
  assert.ok(indexed);
  const points=h.payload.data.map(x=>({date:x.date.slice(6,10)+'-'+x.date.slice(3,5)+'-'+x.date.slice(0,2),nav:Number(x.nav)})).reverse();
  const local:FundData={meta:{schemeCode:h.schemeCode,schemeName:h.payload.meta.scheme_name,
    fundHouse:'Test',schemeCategory:'Equity',schemeType:'Open Ended'},points,fetchedAt:h.fetchedAt,
    source:'mfapi.in',fromCache:false,stale:false,warnings:[]};
  const expected=localFundReturns(local);
  for(const key of ['oneYear','threeYear','fiveYear'] as const) {
    assert.ok(indexed![key]!==null);
    assert.ok(Math.abs(indexed![key]!-expected[key]!)<1e-12, key);
  }
  assert.equal(archivedFundReturns(history(111002,'Example Direct IDCW')),null);
  assert.equal(archivedFundReturns(history(111003,'Example Direct Growth',true)),null);
});

test('index validator rejects missing, unverified, duplicate or cross-checkpoint return rows', () => {
  const row={schemeCode:111001,navDate:'2026-10-20',oneYear: .10,threeYear:.12,fiveYear:null};
  const base={version:1,source:'mfapi.in',sequence:41,catalogueFetchedAt:'2026-10-22T10:00:00.000Z',entries:[row]};
  const validate=(value:unknown,clean=2)=>validateReturnIndex(value,41,base.catalogueFetchedAt,new Set([111001,111002]),clean);
  assert.deepEqual(validate(base),{111001:row});
  for(const damaged of [
    {...base,sequence:42},
    {...base,source:'unknown'},
    {...base,entries:[row,row]},
    {...base,entries:[{...row,schemeCode:999999}]},
    {...base,entries:[{...row,navDate:'invalid-date'}]},
    {...base,entries:[{...row,navDate:'2026-02-30'}]},
    {...base,entries:[{...row,oneYear:Infinity}]},
    {...base,entries:[{...row,oneYear:-1.5}]},
  ]) assert.throws(()=>validate(damaged),/return/i);
  assert.throws(()=>validate(base,0),/checkpoint/i);
  assert.deepEqual(validate({...base,entries:[]}),{});
});

test('a missing return is never converted to zero for sorting', () => {
  const small=history();
  small.payload.data=[raw('2026-10-20',120)];
  small.coverageStart='2026-10-20';small.coverageEnd='2026-10-20';
  assert.deepEqual(archivedFundReturns(small),{schemeCode:small.schemeCode,navDate:'2026-10-20',
    oneYear:null,threeYear:null,fiveYear:null});
});
