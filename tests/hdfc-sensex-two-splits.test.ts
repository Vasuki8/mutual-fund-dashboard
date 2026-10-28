import assert from 'node:assert/strict';
import { test } from 'node:test';
import { financialNavBasis } from '../src/lib/corporate-actions.ts';
import type { VerifiedUnitAdjustment } from '../src/lib/corporate-actions.ts';
import { absoluteReturn, cagr, trailingReturn } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';

const warning='Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.';
// Synthetic observations; actual archive histories are checked separately.
function rows(): NavPoint[] { return [
  {date:'2015-12-09',nav:4000},{date:'2020-10-23',nav:4800},
  {date:'2021-02-18',nav:5000},{date:'2021-02-19',nav:5100},
  {date:'2021-02-22',nav:500},{date:'2021-10-22',nav:550},
  {date:'2023-10-23',nav:680},{date:'2024-02-02',nav:700},
  {date:'2024-02-05',nav:69.65},{date:'2024-10-23',nav:75},
  {date:'2025-10-23',nav:80},{date:'2026-10-23',nav:83},
]; }
function fund(overrides:Partial<FundData>={}): FundData { return {
  meta:{schemeCode:135854,schemeName:'HDFC BSE Sensex ETF - Growth Option',
    isinGrowth:'INF179KC1HX2',fundHouse:'HDFC Mutual Fund',
    schemeType:'Open Ended Schemes',schemeCategory:'Other Scheme - Other  ETFs'},
  points:rows(),warnings:[warning],source:'mfapi.in',
  fetchedAt:'2026-10-26T11:31:26.749Z',fromCache:true,stale:true,...overrides,
}; }
// Structural access keeps the test-first commit compilable on the prior interface.
function actions(basis:ReturnType<typeof financialNavBasis>): VerifiedUnitAdjustment[] {
  return (basis as typeof basis & {adjustments?:VerifiedUnitAdjustment[]}).adjustments??[];
}
function close(actual:number|null,expected:number):void {
  assert.ok(actual!==null && Math.abs(actual-expected)<=1e-10*Math.max(1,Math.abs(expected)),
    `Expected ${actual} to match ${expected}`);
}

test('both verified Sensex events are applied together with separate dated disclosures',()=>{
  const raw=fund(),original=structuredClone(raw),result=financialNavBasis(raw);
  assert.equal(result.adjusted,true);
  assert.deepEqual(raw,original);
  assert.equal(result.adjustment,undefined,'Do not collapse two different boundaries into one misleading factor.');
  assert.deepEqual(actions(result).map(a=>[a.schemeCode,a.oldNavThrough,a.firstNewNavDate,a.factor]),[
    [135854,'2021-02-19','2021-02-22',0.1],[135854,'2024-02-02','2024-02-05',0.1],
  ]);
  assert.ok(actions(result).every(a=>a.evidenceUrl.startsWith('https://')));
  for(let i=0;i<raw.points.length;i++){
    const p=raw.points[i],q=result.fund.points[i];
    assert.equal(q.date,p.date);
    close(q.nav,p.nav*(p.date<'2021-02-22'?0.01:p.date<'2024-02-05'?0.1:1));
  }
  assert.equal(qualityBlocked(raw),true);
  assert.equal(qualityBlocked(result.fund),false);
  assert.deepEqual(result.fund.meta,raw.meta);
  assert.equal(result.fund.fetchedAt,raw.fetchedAt);
  assert.equal(result.fund.stale,true);
  assert.equal(result.fund.fromCache,true);
  assert.strictEqual(financialNavBasis(result.fund).fund,result.fund);
  assert.equal(financialNavBasis(result.fund).adjusted,false);
});

test('two splits preserve both market moves and correctly change split-crossing returns',()=>{
  const raw=fund(),result=financialNavBasis(raw);assert.equal(result.adjusted,true);
  const points=result.fund.points;
  const value=(date:string)=>points.find(p=>p.date===date)!.nav;
  close(value('2021-02-22')/value('2021-02-19'),500/(5100*0.1));
  close(value('2024-02-05')/value('2024-02-02'),69.65/(700*0.1));
  assert.equal(trailingReturn(points,1),trailingReturn(raw.points,1));
  const years=(start:string)=>(Date.parse('2026-10-23')-Date.parse(start))/(86400_000*365);
  close(trailingReturn(points,3),(83/68)**(1/years('2023-10-23'))-1);
  close(trailingReturn(points,5),(83/55)**(1/years('2021-10-22'))-1);
  close(absoluteReturn(points),83/40-1);
  close(cagr(points),(83/40)**(1/years('2015-12-09'))-1);
  assert.notEqual(trailingReturn(points,3),trailingReturn(raw.points,3));
  assert.notEqual(trailingReturn(points,5),trailingReturn(raw.points,5));
});

test('an incomplete, already-partly-adjusted or extra-event Sensex history never receives a partial repair',()=>{
  const source=rows();
  const variants=[
    ...['2021-02-19','2021-02-22','2024-02-02','2024-02-05'].map(date=>source.filter(p=>p.date!==date)),
    source.filter(p=>p.date>='2021-02-22'),source.filter(p=>p.date<'2024-02-05'),
    source.map(p=>({...p,nav:p.date<'2021-02-22'?p.nav*0.1:p.nav})),
    source.map(p=>({...p,nav:p.date<'2024-02-05'?p.nav*0.1:p.nav})),
    source.map(p=>({...p,nav:p.date==='2025-10-23'?150:p.nav})),
    source.map(p=>({...p,date:p.date==='2021-02-22'?'2021-02-23':p.date})),
    source.map(p=>({...p,date:p.date==='2024-02-05'?'2024-02-06':p.date})),
    source.map(p=>({...p,nav:p.date==='2021-02-19'?p.nav*1.2:p.nav})),
    source.map(p=>({...p,nav:p.date==='2024-02-05'?p.nav*0.8:p.nav})),
  ];
  for(const points of variants){
    const raw=fund({points}),original=structuredClone(raw),result=financialNavBasis(raw);
    assert.equal(result.adjusted,false);assert.strictEqual(result.fund,raw);assert.deepEqual(raw,original);
  }
});

test('Sensex events require the exact identity and do not authorize another plan or scheme',()=>{
  const original=fund();
  for(const meta of [
    {...original.meta,schemeCode:135853},{...original.meta,schemeName:'HDFC BSE Sensex ETF - IDCW Option'},
    {...original.meta,schemeName:original.meta.schemeName+' - Direct Plan'},
    {...original.meta,isinGrowth:'INF179KC1973'},{...original.meta,isinGrowth:null},
    {...original.meta,fundHouse:'Another Mutual Fund'},
  ]){
    const raw=fund({meta});assert.equal(financialNavBasis(raw).adjusted,false);
    assert.strictEqual(financialNavBasis(raw).fund,raw);
  }
});

test('invalid, duplicate, reordered or missing observations and independent warnings stay blocked',()=>{
  const source=rows();
  for(const points of [
    [...source].reverse(),[...source.slice(0,3),source[2],...source.slice(3)],
    source.map(p=>({...p,nav:p.date==='2021-02-19'?0:p.nav})),
    source.map(p=>({...p,nav:p.date==='2024-02-02'?Infinity:p.nav})),
    source.map(p=>({...p,date:p.date==='2024-02-02'?'2024-02-30':p.date})),
  ])assert.equal(financialNavBasis(fund({points})).adjusted,false);
  for(const warnings of [[],
    ['Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked.'],
    ['Unresolved discontinuity: 3 single-observation move(s) exceed 40%; derived analytics are blocked.'],
    [warning,warning],[warning,'Unresolved discontinuity: independent review remains unresolved.'],
    [warning,'Invalid NAV observations were excluded (1); derived analytics are blocked.'],
    [warning,'Conflicting NAV values occur on 1 duplicate date(s); analytics are blocked.'],
  ]){
    const raw=fund({warnings});assert.equal(financialNavBasis(raw).adjusted,false);
    assert.strictEqual(financialNavBasis(raw).fund,raw);assert.deepEqual(raw.warnings,warnings);
  }
});

test('a verified two-event correction preserves operational failure warnings and source freshness',()=>{
  const message='Refresh failed: MFAPI timeout. Showing cached history.';
  const raw=fund({warnings:[warning,message]}),result=financialNavBasis(raw);
  assert.equal(result.adjusted,true);assert.deepEqual(result.fund.warnings,[message]);
  assert.deepEqual(raw.warnings,[warning,message]);assert.equal(result.fund.stale,true);
  assert.equal(result.fund.fetchedAt,raw.fetchedAt);
});
