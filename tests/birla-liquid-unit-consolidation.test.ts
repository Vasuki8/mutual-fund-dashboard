import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cagr, trailingReturn } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import { financialNavBasis, BIRLA_LIQUID_GROWTH_CODE,
  BIRLA_FIRST_NEW_NAV_DATE, KNOWN_OVERNIGHT_WARNING } from '../src/lib/corporate-actions.ts';
import { localFundReturns } from '../src/lib/fund-sort.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';

const points:NavPoint[]=[
  {date:'2006-04-02',nav:10},
  {date:'2009-10-07',nav:13},
  {date:'2011-10-06',nav:16.5},
  {date:'2011-10-07',nav:165.0399},
  {date:'2015-10-07',nav:220},
  {date:'2018-10-07',nav:280},
  {date:'2020-10-26',nav:330},
  {date:'2021-10-26',nav:350},
  {date:'2022-10-26',nav:370},
  {date:'2023-10-26',nav:400},
  {date:'2024-10-26',nav:420},
  {date:'2025-10-26',nav:440},
  {date:'2026-10-26',nav:455.51},
];

function makeFund(overrides:Partial<FundData>={}):FundData {
  return {
    meta:{schemeCode:BIRLA_LIQUID_GROWTH_CODE,
      schemeName:'Aditya Birla Sun Life Liquid Fund - Growth',
      fundHouse:'Aditya Birla Sun Life Mutual Fund',schemeCategory:'Debt Scheme - Liquid Fund',
      schemeType:'Open Ended'},
    points,fetchedAt:'2026-10-26T10:00:00.000Z',source:'mfapi.in',
    stale:false,fromCache:false,warnings:[KNOWN_OVERNIGHT_WARNING],...overrides,
  };
}

test('October 2011 Cash Plus action adjusts only pre-event NAV of the exact Growth scheme',()=>{
  const raw=makeFund();
  const original=structuredClone(raw);
  const basis=financialNavBasis(raw);
  assert.equal(basis.adjusted,true);
  assert.equal(basis.adjustment?.schemeCode,100047);
  assert.equal(basis.adjustment?.oldNavThrough,'2011-10-06');
  assert.equal(basis.adjustment?.firstNewNavDate,BIRLA_FIRST_NEW_NAV_DATE);
  assert.equal(basis.adjustment?.factor,10);
  assert.deepEqual(raw,original,'Raw NAV observations and original warnings cannot be mutated.');
  assert.deepEqual(basis.fund.points.map(p=>p.date),raw.points.map(p=>p.date));
  assert.deepEqual(basis.fund.points.slice(0,3).map(p=>p.nav),[100,130,165]);
  assert.deepEqual(basis.fund.points.slice(3),raw.points.slice(3),
    'Reported NAV from 7 October 2011 onward remains unchanged.');
  assert.equal(qualityBlocked(raw),true);
  assert.equal(qualityBlocked(basis.fund),false);
  assert.ok((cagr(basis.fund.points)??0) > 0 && (cagr(basis.fund.points)??1)<0.2);
  assert.ok((trailingReturn(basis.fund.points,5)??0) > 0);
  assert.ok((trailingReturn(basis.fund.points,5)??1)<1);
  assert.notEqual(localFundReturns(basis.fund).fiveYear,null);
});

test('unit changes never imply dividend total return or adjustment of other plans',()=>{
  for(const meta of [
    {...makeFund().meta,schemeCode:100046,schemeName:'Aditya Birla Sun Life Liquid Fund -Daily IDCW'},
    {...makeFund().meta,schemeCode:100051,schemeName:'Aditya Birla Sun Life Liquid Fund -weekly IDCW'},
    {...makeFund().meta,schemeCode:100048,schemeName:'Aditya Birla Sun Life Liquid Fund - Growth'},
    {...makeFund().meta,schemeCode:100047,schemeName:'Aditya Birla Sun Life Liquid Fund - IDCW'},
    {...makeFund().meta,schemeCode:100047,schemeName:'Another Liquid Fund - Growth'},
  ]) {
    const raw=makeFund({meta});
    assert.equal(financialNavBasis(raw).adjusted,false,meta.schemeName);
    assert.equal(qualityBlocked(financialNavBasis(raw).fund),true);
  }
});

test('other jumps, ambiguous dates, duplicate dates and source errors remain blocked',()=>{
  const variants=[
    makeFund({warnings:[]}),
    makeFund({warnings:[KNOWN_OVERNIGHT_WARNING,'Invalid NAV observations were excluded (1); derived analytics are blocked.']}),
    makeFund({warnings:['Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.']}),
    makeFund({points:points.map(p=>({...p,...(p.date==='2011-10-07'?{nav:130}:{})}))}),
    makeFund({points:points.map(p=>({...p,...(p.date==='2011-10-07'?{nav:180}:{})}))}),
    makeFund({points:points.map(p=>({...p,...(p.date==='2011-10-06'?{date:'2011-10-05'}:{})}))}),
    makeFund({points:points.map(p=>({...p,...(p.date==='2011-10-07'?{date:'2011-10-10'}:{})}))}),
    makeFund({points:points.map(p=>({...p,...(p.date==='2023-10-26'?{nav:900}:{})}))}),
    makeFund({points:points.map(p=>({...p,...(p.date==='2011-10-06'?{nav:0}:{})}))}),
    makeFund({points:[...points].reverse()}),
  ];
  for(const raw of variants){
    const result=financialNavBasis(raw);
    assert.equal(result.adjusted,false,JSON.stringify(raw).slice(0,320));
    assert.strictEqual(result.fund,raw,'Unverified adjustment cannot silently replace raw data.');
  }
});
