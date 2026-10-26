import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cagr, selectRange, trailingReturn } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import { financialNavBasis, KNOWN_OVERNIGHT_WARNING } from '../src/lib/corporate-actions.ts';
import { localFundReturns } from '../src/lib/fund-sort.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';

const sourcePoints: NavPoint[] = [
  {date:'2021-10-25',nav:95},
  {date:'2022-08-11',nav:100.00},
  {date:'2022-08-16',nav:100.02},
  {date:'2022-08-17',nav:1000.55},
  {date:'2023-10-25',nav:1100},
  {date:'2024-10-25',nav:1200},
  {date:'2025-10-25',nav:1350},
  {date:'2026-10-25',nav:1494.1154},
];

function example(overrides: Partial<FundData> = {}): FundData {
  return {
    meta: {schemeCode:145536,schemeName:'ICICI Prudential Overnight Fund - Direct Plan - Growth',
      fundHouse:'ICICI Prudential Mutual Fund',schemeType:'Open Ended',schemeCategory:'Debt Scheme - Overnight Fund'},
    points:sourcePoints, fetchedAt:'2026-10-26T03:00:00Z',
    source:'mfapi.in',fromCache:false,stale:false,
    warnings:[KNOWN_OVERNIGHT_WARNING],...overrides,
  };
}

test('the documented ten-to-one consolidation adjusts PRE-event NAV for derived calculations only',()=>{
  const raw=example();
  const original=structuredClone(raw);
  const result=financialNavBasis(raw);
  assert.equal(result.adjusted,true);
  assert.deepEqual(raw,original,'Do not mutate source observations or original warnings.');
  assert.notEqual(result.fund,raw);
  assert.deepEqual(result.fund.points.map(p=>p.date),raw.points.map(p=>p.date));
  assert.deepEqual(result.fund.points.slice(0,3).map(p=>Number(p.nav.toFixed(4))),[950,1000,1000.2]);
  assert.equal(result.fund.points[2].date,'2022-08-16',
    'The last old-basis NAV must be adjusted despite the AMC effective date being 16 August.');
  assert.equal(result.fund.points[3].date,'2022-08-17',
    'The new unit denomination starts in the verified archive on 17 August.');
  assert.deepEqual(result.fund.points.slice(3),raw.points.slice(3));
  assert.equal(qualityBlocked(raw),true,'Raw source still needs quality review.');
  assert.equal(qualityBlocked(result.fund),false,'Only the validated action warning may be explained.');
  assert.ok((cagr(result.fund.points)??0)>0);
  assert.ok((trailingReturn(result.fund.points,5)??0)>0);
  assert.ok((trailingReturn(result.fund.points,5)??0)<1,'Tenfold jump must not become investment gain.');
  assert.equal(trailingReturn(selectRange(raw.points,'3Y'),3),trailingReturn(selectRange(result.fund.points,'3Y'),3),
    'A clean post-consolidation period must be mathematically unchanged.');
  const local=localFundReturns(result.fund);
  assert.ok(local.fiveYear!==null && local.threeYearMaxDrawdown!==null);
});

test('fail closed for other schemes, options, event dates, extra NAV jumps and bad source warnings',()=>{
  const variants=[
    example({meta:{...example().meta,schemeCode:145537}}),
    example({meta:{...example().meta,schemeName:'ICICI Prudential Overnight Fund - Direct Plan - IDCW'}}),
    example({meta:{...example().meta,schemeName:'Another Overnight Fund - Direct Growth'}}),
    example({warnings:[]}),
    example({warnings:[KNOWN_OVERNIGHT_WARNING, 'Invalid NAV observations were excluded (1); derived analytics are blocked until the data is resolved.']}),
    example({warnings:[KNOWN_OVERNIGHT_WARNING,'Conflicting NAV values occur on 1 duplicate date(s); analytics are blocked.']}),
    example({warnings:['Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.']}),
    example({points:sourcePoints.map(p=>({...p,...(p.date==='2022-08-17'?{nav:700}: {})}))}),
    example({points:sourcePoints.map(p=>({...p,...(p.date==='2022-08-16'?{date:'2022-06-12'}:{})}))}),
    example({points:sourcePoints.map(p=>({...p,...(p.date==='2022-08-16'?{date:'2022-08-15'}:{})}))}),
    example({points:sourcePoints.map(p=>({...p,...(p.date==='2022-08-17'?{date:'2022-08-18'}:{})}))}),
    example({points:sourcePoints.map(p=>({...p,...(p.date==='2024-10-25'?{nav:2300}:{})}))}),
    example({points:[...sourcePoints].reverse()}),
    example({points:sourcePoints.map(p=>({...p,...(p.date==='2022-08-16'?{nav:0}:{})}))}),
  ];
  for(const raw of variants) {
    const result=financialNavBasis(raw);
    assert.equal(result.adjusted,false,JSON.stringify(raw).slice(0,400));
    assert.equal(result.fund,raw);
  }
});

test('non-quality operational warnings can remain while known event is explained',()=>{
  const raw=example({warnings:[KNOWN_OVERNIGHT_WARNING,'Refresh failed: MFAPI timeout. Showing cached history.']});
  const adjusted=financialNavBasis(raw);
  assert.equal(adjusted.adjusted,true);
  assert.equal(qualityBlocked(adjusted.fund),false);
  assert.deepEqual(adjusted.fund.warnings,['Refresh failed: MFAPI timeout. Showing cached history.']);
  assert.deepEqual(raw.warnings,[KNOWN_OVERNIGHT_WARNING,'Refresh failed: MFAPI timeout. Showing cached history.']);
});
