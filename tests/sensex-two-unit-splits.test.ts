import assert from 'node:assert/strict';
import { test } from 'node:test';
import { financialNavBasis } from '../src/lib/corporate-actions.ts';
import { trailingReturn, cagr } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';

const warning='Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.';
function rows(): NavPoint[] { return [
  {date:'2015-12-09',nav:2500},{date:'2016-10-21',nav:2800},
  {date:'2018-10-23',nav:3200},{date:'2020-10-23',nav:4000},
  {date:'2021-02-19',nav:5000},{date:'2021-02-22',nav:490},
  {date:'2021-10-22',nav:520},{date:'2023-10-23',nav:630},
  {date:'2024-02-02',nav:700},{date:'2024-02-05',nav:69.65},
  {date:'2025-10-23',nav:75},{date:'2026-10-23',nav:80.5},
]; }
function fund(overrides:Partial<FundData>={}):FundData { return {
  meta:{schemeCode:135854,schemeName:'HDFC BSE Sensex ETF - Growth Option',
    isinGrowth:'INF179KC1HX2',fundHouse:'HDFC Mutual Fund',
    schemeType:'Open Ended Schemes',schemeCategory:'Other Scheme - Other  ETFs'},
  points:rows(),warnings:[warning],fetchedAt:'2026-10-26T11:31:26.749Z',
  source:'mfapi.in',stale:false,fromCache:true,...overrides,
}; }
function close(actual:number,expected:number) {
  assert.ok(Math.abs(actual-expected)<1e-11*Math.max(1,Math.abs(expected)),`${actual} versus ${expected}`);
}

test('Sensex validates both known events together and gives each NAV era the correct cumulative basis',()=>{
  const raw=fund(),original=structuredClone(raw),basis=financialNavBasis(raw);
  assert.equal(basis.adjusted,true);
  assert.equal(qualityBlocked(basis.fund),false);
  assert.equal(qualityBlocked(raw),true);
  assert.deepEqual(raw,original);
  assert.equal(basis.fund.points.length,raw.points.length);
  for(let i=0;i<raw.points.length;i++) {
    const point=raw.points[i],expected=point.nav*(point.date<'2021-02-22'?0.01:point.date<'2024-02-05'?0.1:1);
    close(basis.fund.points[i].nav,expected);
    assert.equal(basis.fund.points[i].date,point.date);
    if(point.date>='2024-02-05')assert.equal(basis.fund.points[i].nav,point.nav);
  }
  assert.deepEqual(basis.fund.meta,raw.meta);
  assert.equal(basis.fund.fetchedAt,raw.fetchedAt);
});

test('both ordinary event-period losses survive the denomination corrections',()=>{
  const basis=financialNavBasis(fund());assert.equal(basis.adjusted,true);
  const data=basis.fund.points;
  for(const [date,expected] of [['2021-02-22',-0.02],['2024-02-05',-0.005]] as const) {
    const i=data.findIndex(p=>p.date===date);
    close(data[i].nav/data[i-1].nav-1,expected);
  }
  assert.ok(!data.some(p=>p.date==='2021-02-20'||p.date==='2024-02-03'));
});

test('one-year returns stay identical while longer windows correctly cross one or both splits',()=>{
  const raw=fund(),basis=financialNavBasis(raw);assert.equal(basis.adjusted,true);
  assert.equal(trailingReturn(basis.fund.points,1),trailingReturn(raw.points,1));
  for(const [years,start,value] of [[3,'2023-10-23',63],[5,'2021-10-22',52],[10,'2016-10-21',28]] as const) {
    const days=(Date.parse('2026-10-23')-Date.parse(start))/86400_000;
    close(trailingReturn(basis.fund.points,years)!,Math.pow(80.5/value,365/days)-1);
    assert.notEqual(trailingReturn(basis.fund.points,years),trailingReturn(raw.points,years));
  }
  const days=(Date.parse('2026-10-23')-Date.parse('2015-12-09'))/86400_000;
  close(cagr(basis.fund.points)!,Math.pow(80.5/25,365/days)-1);
});

test('the exact ETF identity is required; index funds and distribution options remain excluded',()=>{
  for(const meta of [
    {...fund().meta,schemeCode:101281},{...fund().meta,schemeCode:119065},
    {...fund().meta,schemeCode:135853},{...fund().meta,schemeName:'HDFC BSE Sensex Index Fund - Growth'},
    {...fund().meta,schemeName:'HDFC BSE Sensex ETF - IDCW Option'},
    {...fund().meta,isinGrowth:'INF179KC1973'},{...fund().meta,isinGrowth:null},
    {...fund().meta,fundHouse:'Another Mutual Fund'},
  ]) {
    const input=fund({meta});assert.strictEqual(financialNavBasis(input).fund,input);
    assert.equal(financialNavBasis(input).adjusted,false);
  }
});

test('a missing event or boundary cannot authorize a partial Sensex correction',()=>{
  for(const points of [
    rows().filter(p=>p.date>='2021-02-22'),rows().filter(p=>p.date<='2024-02-02'),
    ...['2021-02-19','2021-02-22','2024-02-02','2024-02-05'].map(date=>rows().filter(p=>p.date!==date)),
  ]) {
    const input=fund({points}),original=structuredClone(input);
    assert.equal(financialNavBasis(input).adjusted,false);
    assert.strictEqual(financialNavBasis(input).fund,input);
    assert.deepEqual(input,original);
  }
});

test('wrong event ratios, shifted dates and a third unexplained jump fail without any correction',()=>{
  const variants=[
    rows().map(p=>({...p,nav:p.date<'2021-02-22'?p.nav*1.2:p.nav})),
    rows().map(p=>({...p,nav:p.date>='2024-02-05'?p.nav*0.8:p.nav})),
    rows().map(p=>({...p,date:p.date==='2021-02-22'?'2021-02-21':p.date})),
    rows().map(p=>({...p,date:p.date==='2024-02-05'?'2024-02-04':p.date})),
    rows().map(p=>({...p,nav:p.date==='2025-10-23'?300:p.nav})),
  ];
  for(const points of variants){const input=fund({points});assert.equal(financialNavBasis(input).adjusted,false);assert.strictEqual(financialNavBasis(input).fund,input);}
});

test('invalid, conflicting and unrecognized quality evidence cannot be cleared by two known actions',()=>{
  for(const warnings of [[],[warning.replace(': 2 ',': 1 ')],[warning.replace(': 2 ',': 3 ')],
    [warning,warning],[warning,'Unresolved discontinuity: independent review outstanding.'],
    [warning,'Invalid NAV observations were excluded (1); derived analytics are blocked.'],
    [warning,'Conflicting NAV values occur on 1 duplicate date(s); analytics are blocked.'],
  ]) {
    const input=fund({warnings});assert.equal(financialNavBasis(input).adjusted,false);
    assert.strictEqual(financialNavBasis(input).fund,input);assert.deepEqual(input.warnings,warnings);
  }
});

test('malformed, reordered, duplicate and nonpositive source observations fail closed',()=>{
  for(const points of [rows().reverse(),[...rows(),rows().at(-1)!],
    ...[0,-1,Infinity,NaN].map(nav=>rows().map(p=>p.date==='2021-02-19'?{...p,nav}:p)),
    rows().map(p=>p.date==='2024-02-02'?{...p,date:'2024-02-30'}:p),
  ]) {const input=fund({points});assert.equal(financialNavBasis(input).adjusted,false);assert.strictEqual(financialNavBasis(input).fund,input);}
});

test('normalization is idempotent and preserves stale state and operational warnings',()=>{
  const message='Refresh failed: MFAPI timeout. Showing cached history.';
  const raw=fund({stale:true,warnings:[warning,message]});
  Object.freeze(raw.meta);raw.points.forEach(Object.freeze);Object.freeze(raw.points);Object.freeze(raw.warnings);Object.freeze(raw);
  const basis=financialNavBasis(raw);assert.equal(basis.adjusted,true);
  assert.equal(basis.fund.stale,true);assert.equal(basis.fund.fromCache,true);
  assert.equal(basis.fund.fetchedAt,raw.fetchedAt);assert.deepEqual(basis.fund.warnings,[message]);
  assert.equal(financialNavBasis(basis.fund).adjusted,false);
  assert.strictEqual(financialNavBasis(basis.fund).fund,basis.fund);
});
