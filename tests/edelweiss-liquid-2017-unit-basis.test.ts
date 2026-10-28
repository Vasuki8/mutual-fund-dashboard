import assert from 'node:assert/strict';
import { test } from 'node:test';
import { financialNavBasis, KNOWN_OVERNIGHT_WARNING } from '../src/lib/corporate-actions.ts';
import { cagr, trailingReturn } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';

const identities = [
  {code:140182,name:'Edelweiss Liquid Fund - Regular Plan - Growth',isin:'INF754K01GZ6'},
  {code:140196,name:'Edelweiss Liquid Fund - Direct Plan - Growth',isin:'INF754K01GM4'},
] as const;

// Synthetic source observations; complete immutable real histories and issuer
// evidence are independently checked before release. No real NAV is invented.
function observations():NavPoint[] {
  const start=Date.parse('2016-11-27T00:00:00Z'),end=Date.parse('2026-10-25T00:00:00Z');
  const rows:NavPoint[]=[];
  for(let at=start;at<=end;at+=86_400_000){
    const date=new Date(at).toISOString().slice(0,10);
    if(date==='2017-07-01')continue;
    const oldUnitValue=10*Math.exp((at-start)/86_400_000*0.00017);
    rows.push({date,nav:oldUnitValue*(date<'2017-07-02'?1:100)});
  }
  return rows;
}
function fund(index:number,overrides:Partial<FundData>={}):FundData {
  const item=identities[index];
  return {meta:{schemeCode:item.code,schemeName:item.name,isinGrowth:item.isin,
    fundHouse:'Edelweiss Mutual Fund',schemeType:'Open Ended',schemeCategory:'Debt Scheme - Liquid Fund'},
    points:observations(),warnings:[KNOWN_OVERNIGHT_WARNING],source:'mfapi.in',
    fetchedAt:'2026-10-28T05:07:02.560Z',stale:false,fromCache:true,...overrides};
}

for(const [index,item] of identities.entries()){
  test(`verified Edelweiss Liquid Growth ${item.code} receives only a calculation-copy unit adjustment`,()=>{
    const raw=fund(index),original=structuredClone(raw),basis=financialNavBasis(raw);
    assert.equal(basis.adjusted,true);
    assert.equal(basis.adjustment?.schemeCode,item.code);
    assert.equal(basis.adjustment?.factor,100);
    assert.equal(basis.adjustment?.oldNavThrough,'2017-06-30');
    assert.equal(basis.adjustment?.firstNewNavDate,'2017-07-02');
    assert.match(basis.adjustment?.label??'',/100-to-1 Edelweiss Liquid Fund/);
    assert.match(basis.adjustment?.label??'',/1 July 2017/);
    assert.ok(basis.adjustment?.evidenceUrl.startsWith('https://www.edelweissmf.com/'));
    assert.equal(qualityBlocked(raw),true);
    assert.equal(qualityBlocked(basis.fund),false);
    assert.deepEqual(raw,original);
    assert.deepEqual(basis.fund.meta,raw.meta);
    assert.equal(basis.fund.fetchedAt,raw.fetchedAt);
    assert.equal(basis.fund.points.length,raw.points.length);
    for(let i=0;i<raw.points.length;i++){
      const source=raw.points[i],adjusted=basis.fund.points[i];
      assert.equal(adjusted.date,source.date);
      assert.equal(adjusted.nav,source.date<'2017-07-02'?source.nav*100:source.nav);
    }
    assert.equal(financialNavBasis(basis.fund).adjusted,false);
    assert.strictEqual(financialNavBasis(basis.fund).fund,basis.fund);
  });
}

test('the legal effective date does not move the observed NAV boundary or erase its ordinary return',()=>{
  for(const [index] of identities.entries()){
    const raw=fund(index),basis=financialNavBasis(raw);
    assert.equal(basis.adjusted,true);
    const i=raw.points.findIndex(p=>p.date==='2017-07-02');
    assert.equal(raw.points[i-1].date,'2017-06-30');
    assert.ok(!basis.fund.points.some(p=>p.date==='2017-07-01'),'Never fabricate a missing effective-date NAV.');
    const sourceRatio=raw.points[i].nav/raw.points[i-1].nav;
    const ratio=basis.fund.points[i].nav/basis.fund.points[i-1].nav;
    assert.ok(Math.abs(ratio-sourceRatio/100)<1e-12);
    assert.ok(Math.abs(ratio-Math.exp(2*0.00017))<1e-12);
    assert.notEqual(ratio,1,'An economic return remains after changing unit denomination.');
    for(const years of [1,3,5])assert.equal(trailingReturn(basis.fund.points,years),trailingReturn(raw.points,years));
    const first=basis.fund.points[0],last=basis.fund.points.at(-1)!;
    const years=(Date.parse(last.date)-Date.parse(first.date))/(86_400_000*365);
    assert.ok(Math.abs(cagr(basis.fund.points)!-((last.nav/first.nav)**(1/years)-1))<1e-12);
  }
});

test('Edelweiss code/name pairs cannot authorize another plan, option, fund house or scheme',()=>{
  for(const [index,item] of identities.entries()){
    const raw=fund(index);
    for(const meta of [
      {...raw.meta,schemeCode:999999},
      {...raw.meta,schemeName:identities[1-index].name},
      {...raw.meta,schemeName:item.name.replace('Growth','IDCW')},
      {...raw.meta,schemeName:item.name.replace('Liquid','Treasury')},
      {...raw.meta,schemeName:item.name+' - Retail'},
      {...raw.meta,fundHouse:'Another Mutual Fund'},
    ]){
      const input={...raw,meta};
      assert.equal(financialNavBasis(input).adjusted,false);
      assert.strictEqual(financialNavBasis(input).fund,input);
    }
  }
});

test('Edelweiss actions require the exact source dates, near-100 factor and full valid series',()=>{
  const rows=observations();
  const invalidSeries=[
    rows.filter(p=>p.date!=='2017-06-30'),rows.filter(p=>p.date!=='2017-07-02'),
    rows.map(p=>({...p,...(p.date==='2017-07-02'?{date:'2017-07-01'}:{})})),
    rows.map(p=>({...p,nav:p.date>='2017-07-02'?p.nav*1.01:p.nav})),
    rows.map(p=>({...p,nav:p.date>='2017-07-02'?p.nav*0.99:p.nav})),
    rows.map(p=>({...p,nav:p.date==='2020-02-10'?p.nav*2:p.nav})),
    rows.map(p=>({...p,nav:p.date==='2017-06-30'?0:p.nav})),
    rows.map(p=>({...p,nav:p.date==='2017-06-30'?Number.NaN:p.nav})),
    rows.map(p=>({...p,date:p.date==='2017-06-30'?'2017-06-31':p.date})),
    [...rows].reverse(),[...rows.slice(0,10),rows[9],...rows.slice(10)],
  ];
  for(const [index] of identities.entries())for(const points of invalidSeries){
    const input=fund(index,{points});
    assert.equal(financialNavBasis(input).adjusted,false);
    assert.strictEqual(financialNavBasis(input).fund,input);
  }
});

test('independent NAV and unrecognized discontinuity evidence still blocks either Edelweiss plan',()=>{
  for(const [index] of identities.entries())for(const warnings of [
    [],['Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.'],
    [KNOWN_OVERNIGHT_WARNING,'Invalid NAV observations were excluded (1); derived analytics are blocked.'],
    [KNOWN_OVERNIGHT_WARNING,'Conflicting NAV values occur on 1 duplicate date(s); analytics are blocked.'],
    [KNOWN_OVERNIGHT_WARNING,'Unresolved discontinuity: independent source concern.'],
  ]){
    const input=fund(index,{warnings});
    assert.equal(financialNavBasis(input).adjusted,false);
    assert.strictEqual(financialNavBasis(input).fund,input);
    assert.deepEqual(input.warnings,warnings);
  }
});

test('a valid Edelweiss action does not conceal a failed refresh or relabel source freshness',()=>{
  for(const [index] of identities.entries()){
    const message='Refresh failed: MFAPI timeout. Showing cached history.';
    const input=fund(index,{warnings:[KNOWN_OVERNIGHT_WARNING,message],stale:true});
    const original=structuredClone(input),basis=financialNavBasis(input);
    assert.equal(basis.adjusted,true);
    assert.equal(basis.fund.stale,true);
    assert.equal(basis.fund.fromCache,true);
    assert.equal(basis.fund.fetchedAt,input.fetchedAt);
    assert.deepEqual(basis.fund.warnings,[message]);
    assert.deepEqual(input,original);
  }
});
