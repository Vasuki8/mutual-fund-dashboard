import assert from 'node:assert/strict';
import { test } from 'node:test';
import { categoryKey, categoryOptions, inCategory, pageFor, PAGE_SIZES, validateCategoryIndex } from '../src/lib/fund-directory.ts';

const catalogue = { entries: [
  { schemeCode:101, schemeName:'Equity A' },
  { schemeCode:102, schemeName:'Debt B' },
  { schemeCode:103, schemeName:'Hybrid C' },
  { schemeCode:104, schemeName:'Pending D' },
] };
const base = { version:1, source:'mfapi.in', sequence:12, catalogueFetchedAt:'2026-10-23T10:00:00.000Z',
  entries:[
    {schemeCode:101,schemeCategory:'Equity Scheme - Flexi Cap Fund'},
    {schemeCode:102,schemeCategory:'Debt Scheme - Liquid Fund'},
    {schemeCode:103,schemeCategory:'Hybrid Scheme - Aggressive Hybrid Fund'},
  ] };

test('category index retains every saved source category without guessing for pending schemes', () => {
  const categories = validateCategoryIndex(base,12,base.catalogueFetchedAt,catalogue,3);
  assert.deepEqual(categories,{101:'Equity Scheme - Flexi Cap Fund',102:'Debt Scheme - Liquid Fund',
    103:'Hybrid Scheme - Aggressive Hybrid Fund'});
  assert.equal(inCategory(104,'all',categories),true,'All categories includes pending schemes.');
  assert.equal(inCategory(104,'unclassified',categories),true);
  assert.equal(inCategory(103,'unclassified',categories),false);
  assert.equal(inCategory(102,'debt scheme - liquid fund',categories),true);
  assert.equal(inCategory(101,'debt scheme - liquid fund',categories),false);
  assert.deepEqual(categoryOptions(categories).map(x=>x.label),[
    'Debt Scheme - Liquid Fund', 'Equity Scheme - Flexi Cap Fund',
    'Hybrid Scheme - Aggressive Hybrid Fund']);
});

test('source category labels are distinct by full identity, with predictable whitespace/case normalization', () => {
  assert.equal(categoryKey('  EQUITY  Scheme -  Flexi CAP Fund  '),'equity scheme - flexi cap fund');
  assert.deepEqual(categoryOptions({
    1:'Equity Scheme - Flexi Cap Fund',
    2:'EQUITY Scheme  - Flexi Cap Fund',
    3:'Other Scheme - Index Funds',
  }).map(x=>x.label),['Equity Scheme - Flexi Cap Fund','Other Scheme - Index Funds']);
});

test('a category index may not invent identities, omit saved funds or alter a checkpoint', () => {
  const check=(value:unknown,saved=3)=>validateCategoryIndex(value,12,base.catalogueFetchedAt,catalogue,saved);
  for (const value of [
    {...base,sequence:13}, {...base,source:'unexpected'},
    {...base,entries:base.entries.slice(1)},
    {...base,entries:[base.entries[0],base.entries[0],base.entries[2]]},
    {...base,entries:[...base.entries.slice(0,2),{schemeCode:900,schemeCategory:'Equity'}]},
    {...base,entries:[...base.entries.slice(0,2),{schemeCode:103,schemeCategory:''}]},
    {...base,entries:[...base.entries.slice(0,2),{schemeCode:103,schemeCategory:'x'.repeat(501)}]},
    {...base,entries:[base.entries[1],base.entries[0],base.entries[2]]},
  ]) assert.throws(()=>check(value),/category|checkpoint/i);
  assert.throws(()=>check(base,2),/checkpoint/i);
});

test('pagination starts at twenty and clamps page changes without changing the full population', () => {
  assert.deepEqual(PAGE_SIZES,[20,50,100]);
  assert.deepEqual(pageFor(125,0,20),{pages:7,page:0,start:0,end:20});
  assert.deepEqual(pageFor(125,6,20),{pages:7,page:6,start:120,end:125});
  assert.deepEqual(pageFor(125,2,50),{pages:3,page:2,start:100,end:125});
  assert.deepEqual(pageFor(125,1,100),{pages:2,page:1,start:100,end:125});
  assert.deepEqual(pageFor(125,999,50),{pages:3,page:2,start:100,end:125});
  assert.deepEqual(pageFor(0,20,20),{pages:1,page:0,start:0,end:0});
  assert.deepEqual(pageFor(19,0,20),{pages:1,page:0,start:0,end:19});
});
