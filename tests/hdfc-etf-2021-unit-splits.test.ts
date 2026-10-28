import assert from 'node:assert/strict';
import { test } from 'node:test';
import { financialNavBasis, KNOWN_OVERNIGHT_WARNING } from '../src/lib/corporate-actions.ts';
import { cagr, trailingReturn } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';

const identities = [
  { code:113049, name:'HDFC Gold ETF - Growth Option', isin:'INF179KC1981', factor:0.01, units:100, marketMove:1.008 },
  { code:135853, name:'HDFC NIFTY 50 ETF - Growth Option', isin:'INF179KC1965', factor:0.1, units:10, marketMove:0.98 },
] as const;

// Synthetic observations. Real identities and source boundaries are separately
// verified against checkpoint 208 and the original exchange/issuer documents.
function observations(index:number):NavPoint[] {
  const {factor,marketMove}=identities[index];
  const start=Date.parse('2016-01-01T00:00:00Z'),end=Date.parse('2026-10-26T00:00:00Z');
  const rows:NavPoint[]=[];
  for(let at=start;at<=end;at+=86_400_000){
    const date=new Date(at).toISOString().slice(0,10);
    if(date==='2021-02-20'||date==='2021-02-21')continue;
    const value=100*Math.exp((at-start)/86_400_000*0.00012);
    rows.push({date,nav:date<'2021-02-22'?value/factor:value*marketMove});
  }
  return rows;
}
function fund(index:number,overrides:Partial<FundData>={}):FundData {
  const item=identities[index];
  return {meta:{schemeCode:item.code,schemeName:item.name,isinGrowth:item.isin,
    fundHouse:'HDFC Mutual Fund',schemeType:'Open Ended',schemeCategory:'Other Scheme - Other ETFs'},
    points:observations(index),warnings:[KNOWN_OVERNIGHT_WARNING],
    fetchedAt:'2026-10-28T03:52:12.157Z',source:'mfapi.in',stale:false,fromCache:true,...overrides};
}

for(const [index,item] of identities.entries()) {
  test(`verified ETF ${item.code} normalizes old unit prices without mutating original NAV evidence`,()=>{
    const raw=fund(index),untouched=structuredClone(raw),basis=financialNavBasis(raw);
    assert.equal(basis.adjusted,true);
    assert.equal(basis.adjustment?.schemeCode,item.code);
    assert.equal(basis.adjustment?.factor,item.factor);
    assert.equal(basis.adjustment?.oldNavThrough,'2021-02-19');
    assert.equal(basis.adjustment?.firstNewNavDate,'2021-02-22');
    assert.match(basis.adjustment?.label??'',/unit split/);
    assert.match(basis.adjustment?.label??'',new RegExp(String(item.units)+'-for-1'));
    assert.ok(basis.adjustment?.evidenceUrl.startsWith('https://www.msei.in/'));
    assert.equal(qualityBlocked(raw),true);
    assert.equal(qualityBlocked(basis.fund),false);
    assert.deepEqual(raw,untouched);
    assert.equal(basis.fund.points.length,raw.points.length);
    for(let i=0;i<raw.points.length;i++){
      const p=raw.points[i],adjusted=basis.fund.points[i];
      assert.equal(adjusted.date,p.date);
      assert.equal(adjusted.nav,p.date<'2021-02-22'?p.nav*item.factor:p.nav);
    }
    assert.equal(financialNavBasis(basis.fund).adjusted,false);
    assert.strictEqual(financialNavBasis(basis.fund).fund,basis.fund);
  });
}

test('split factors preserve the actual gain or loss around the event and post-event returns',()=>{
  for(const [index,item] of identities.entries()){
    const raw=fund(index),basis=financialNavBasis(raw);
    assert.equal(basis.adjusted,true);
    const i=raw.points.findIndex(p=>p.date==='2021-02-22');
    const sourceRatio=raw.points[i].nav/raw.points[i-1].nav;
    const resultRatio=basis.fund.points[i].nav/basis.fund.points[i-1].nav;
    assert.ok(Math.abs(resultRatio-sourceRatio/item.factor)<1e-12);
    assert.ok(Math.abs(resultRatio-Math.exp(3*0.00012)*item.marketMove)<1e-12);
    assert.notEqual(resultRatio,1,'Do not flatten the residual market move into a zero return.');
    for(const years of [1,3,5])assert.equal(trailingReturn(basis.fund.points,years),trailingReturn(raw.points,years));
    const first=basis.fund.points[0],last=basis.fund.points.at(-1)!;
    const years=(Date.parse(last.date)-Date.parse(first.date))/(86_400_000*365);
    assert.ok(Math.abs(cagr(basis.fund.points)!-((last.nav/first.nav)**(1/years)-1))<1e-12);
  }
});

test('ETF adjustment requires the exact code, name, current ISIN and fund house',()=>{
  for(const [index,item] of identities.entries()){
    const raw=fund(index);
    for(const meta of [
      {...raw.meta,schemeCode:999999},
      {...raw.meta,schemeName:identities[1-index].name},
      {...raw.meta,schemeName:item.name.replace('Growth','IDCW')},
      {...raw.meta,isinGrowth:identities[1-index].isin},
      {...raw.meta,isinGrowth:null}, {...raw.meta,isinGrowth:undefined},
      {...raw.meta,fundHouse:'Another Mutual Fund'},
    ]){
      const input={...raw,meta};
      assert.equal(financialNavBasis(input).adjusted,false);
      assert.strictEqual(financialNavBasis(input).fund,input);
    }
  }
});

test('ETF split correction fails closed for wrong source dates, factors or additional price problems',()=>{
  for(const [index] of identities.entries()){
    const rows=observations(index);
    const bad=[
      rows.filter(p=>p.date!=='2021-02-19'), rows.filter(p=>p.date!=='2021-02-22'),
      rows.map(p=>({...p,nav:p.date>='2021-02-22'?p.nav*1.1:p.nav})),
      rows.map(p=>({...p,nav:p.date>='2021-02-22'?p.nav*0.9:p.nav})),
      rows.map(p=>({...p,nav:p.date==='2023-01-01'?p.nav*2:p.nav})),
      rows.map(p=>({...p,nav:p.date==='2021-02-19'?0:p.nav})),
      rows.map(p=>({...p,nav:p.date==='2021-02-19'?Infinity:p.nav})),
      rows.map(p=>({...p,date:p.date==='2021-02-19'?'2021-02-30':p.date})),
      [...rows].reverse(),[...rows,rows.at(-1)!],[],
    ];
    for(const points of bad){
      const raw=fund(index,{points});
      assert.equal(financialNavBasis(raw).adjusted,false);
      assert.strictEqual(financialNavBasis(raw).fund,raw);
    }
  }
});

test('ETF correction preserves independent warning evidence and operational refresh failures',()=>{
  for(const [index] of identities.entries()){
    for(const warning of [
      'Invalid NAV observations were excluded (1); derived analytics are blocked.',
      'Conflicting NAV values occur on 1 duplicate date(s); analytics are blocked.',
      'Unresolved discontinuity: separate source correction awaits review.',
    ]){
      const raw=fund(index,{warnings:[KNOWN_OVERNIGHT_WARNING,warning]});
      assert.equal(financialNavBasis(raw).adjusted,false);
      assert.strictEqual(financialNavBasis(raw).fund,raw);
    }
    for(const warnings of [[],['Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.']]){
      assert.equal(financialNavBasis(fund(index,{warnings})).adjusted,false);
    }
    const operational='Refresh failed: cached NAV remains available.';
    const raw=fund(index,{warnings:[KNOWN_OVERNIGHT_WARNING,operational]});
    const basis=financialNavBasis(raw);
    assert.equal(basis.adjusted,true);
    assert.deepEqual(basis.fund.warnings,[operational]);
    assert.deepEqual(raw.warnings,[KNOWN_OVERNIGHT_WARNING,operational]);
  }
});

test('the two verified ETF entries do not authorize the separate two-split Sensex ETF history',()=>{
  const gold=fund(0);
  const sensex={...gold,meta:{...gold.meta,schemeCode:135854,
    schemeName:'HDFC BSE Sensex ETF - Growth Option',isinGrowth:'INF179KC1973'}};
  assert.equal(financialNavBasis(sensex).adjusted,false);
  assert.strictEqual(financialNavBasis(sensex).fund,sensex);
});
