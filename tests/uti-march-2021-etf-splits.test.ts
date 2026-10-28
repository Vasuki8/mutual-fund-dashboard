import assert from 'node:assert/strict';
import { test } from 'node:test';
import { financialNavBasis, KNOWN_OVERNIGHT_WARNING } from '../src/lib/corporate-actions.ts';
import { absoluteReturn, cagr, trailingReturn } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';

const identities = [
  [105463, 'UTI - Gold Exchange Traded Fund - Direct Plan - Growth', 'INF789F1AUX7', 0.01],
  [141665, 'UTI - Nifty Next 50 Exchange Traded Fund - Direct Plan - Growth', 'INF789F1AUW9', 0.1],
] as const;
const evidence='https://nsearchives.nseindia.com/content/circulars/CML47721.pdf';
// Synthetic observations, not replacements for archived source prices.
function fund(index:number, overrides:Partial<FundData>={}):FundData {
  const [code,name,isin,factor]=identities[index];
  const points:NavPoint[]=[
    {date:'2018-10-26',nav:700},{date:'2020-10-26',nav:900},
    {date:'2021-03-25',nav:995},{date:'2021-03-26',nav:1000},
    {date:'2021-03-30',nav:990*factor},{date:'2021-10-26',nav:1100*factor},
    {date:'2023-10-26',nav:1300*factor},{date:'2025-10-26',nav:1500*factor},
    {date:'2026-10-26',nav:1700*factor},
  ];
  return {meta:{schemeCode:code,schemeName:name,isinGrowth:isin,
    fundHouse:'UTI Mutual Fund',schemeType:'Open Ended Schemes',schemeCategory:'Other Scheme - Other ETFs'},
    points,warnings:[KNOWN_OVERNIGHT_WARNING],source:'mfapi.in',
    fetchedAt:'2026-10-27T03:36:05.406Z',stale:false,fromCache:true,...overrides};
}

for(const [index,identity] of identities.entries()) {
  test(`UTI ETF ${identity[0]} uses only its documented split factor in a calculation copy`,()=>{
    const raw=fund(index),original=structuredClone(raw),basis=financialNavBasis(raw);
    assert.equal(basis.adjusted,true);
    assert.equal(basis.adjustment?.schemeCode,identity[0]);
    assert.equal(basis.adjustment?.factor,identity[3]);
    assert.equal(basis.adjustment?.oldNavThrough,'2021-03-26');
    assert.equal(basis.adjustment?.firstNewNavDate,'2021-03-30');
    assert.equal(basis.adjustment?.evidenceUrl,evidence);
    assert.match(basis.adjustment?.label??'',new RegExp((identity[3]===0.01?'100':'10')+'-for-1'));
    assert.equal(qualityBlocked(raw),true);
    assert.equal(qualityBlocked(basis.fund),false);
    assert.deepEqual(raw,original);
    assert.deepEqual(basis.fund.meta,raw.meta);
    assert.equal(basis.fund.fetchedAt,raw.fetchedAt);
    assert.equal(basis.fund.points.length,raw.points.length);
    for(const [i,p] of raw.points.entries()) {
      assert.equal(basis.fund.points[i].date,p.date);
      assert.equal(basis.fund.points[i].nav,p.date<'2021-03-30'?p.nav*identity[3]:p.nav);
    }
    const twice=financialNavBasis(basis.fund);
    assert.equal(twice.adjusted,false);
    assert.strictEqual(twice.fund,basis.fund);
  });
}

test('UTI split retains market movement and post-event returns without inventing intervening dates',()=>{
  for(const [index,identity] of identities.entries()) {
    const raw=fund(index),basis=financialNavBasis(raw);
    assert.equal(basis.adjusted,true);
    const p=basis.fund.points,i=p.findIndex(row=>row.date==='2021-03-30');
    assert.equal(p[i-1].date,'2021-03-26');
    assert.ok(!p.some(row=>['2021-03-27','2021-03-28','2021-03-29'].includes(row.date)));
    assert.ok(Math.abs(p[i].nav/p[i-1].nav-0.99)<1e-12,'Preserve the real 1% loss.');
    for(const years of [1,3,5])assert.equal(trailingReturn(p,years),trailingReturn(raw.points,years));
    const days=(Date.parse(p.at(-1)!.date)-Date.parse(p[0].date))/86400_000;
    assert.ok(Math.abs(absoluteReturn(p)!-(1700/700-1))<1e-12);
    assert.ok(Math.abs(cagr(p)!-((1700/700)**(365/days)-1))<1e-12);
    assert.notEqual(absoluteReturn(p),absoluteReturn(raw.points));
    assert.equal(p[0].nav,700*identity[3]);
  }
});

test('UTI split recognition requires its exact code, source name, ISIN and fund house',()=>{
  for(const [index,identity] of identities.entries()) {
    const raw=fund(index),other=identities[1-index];
    for(const meta of [
      {...raw.meta,schemeCode:999999},{...raw.meta,schemeName:other[1]},
      {...raw.meta,schemeName:identity[1].replace('Growth','IDCW')},
      {...raw.meta,schemeName:identity[1].replace('Direct','Regular')},
      {...raw.meta,isinGrowth:other[2]},{...raw.meta,isinGrowth:null},
      {...raw.meta,fundHouse:'Another Mutual Fund'},
    ]) {
      const input={...raw,meta};
      assert.equal(financialNavBasis(input).adjusted,false);
      assert.strictEqual(financialNavBasis(input).fund,input);
    }
  }
});

test('wrong UTI event boundaries, swapped ratios, extra jumps and invalid series remain blocked',()=>{
  for(const [index] of identities.entries()) {
    const raw=fund(index),rows=raw.points;
    for(const points of [
      rows.filter(p=>p.date!=='2021-03-26'),rows.filter(p=>p.date!=='2021-03-30'),
      rows.map(p=>({...p,date:p.date==='2021-03-30'?'2021-03-29':p.date})),
      rows.map(p=>({...p,nav:p.date>='2021-03-30'?p.nav*(index===0?10:0.1):p.nav})),
      rows.map(p=>({...p,nav:p.date>='2021-03-30'?p.nav*1.2:p.nav})),
      rows.map(p=>({...p,nav:p.date==='2025-10-26'?p.nav*3:p.nav})),
      rows.map(p=>({...p,nav:p.date==='2021-03-26'?0:p.nav})),
      rows.map(p=>({...p,nav:p.date==='2021-03-26'?Infinity:p.nav})),
      rows.map(p=>({...p,date:p.date==='2021-03-26'?'2021-02-30':p.date})),
      [...rows].reverse(),[...rows.slice(0,3),rows[2],...rows.slice(3)],
    ]) {
      const input={...raw,points};
      assert.equal(financialNavBasis(input).adjusted,false);
      assert.strictEqual(financialNavBasis(input).fund,input);
    }
  }
});

test('independent quality evidence and mismatched jump counts still block UTI calculations',()=>{
  for(const [index] of identities.entries())for(const warnings of [
    [],['Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.'],
    [KNOWN_OVERNIGHT_WARNING,'Invalid NAV observations were excluded (1); derived analytics are blocked.'],
    [KNOWN_OVERNIGHT_WARNING,'Conflicting NAV values occur on 1 duplicate date(s); analytics are blocked.'],
    [KNOWN_OVERNIGHT_WARNING,'Unresolved discontinuity: independent review remains open.'],
  ]) {
    const raw=fund(index,{warnings});
    assert.equal(financialNavBasis(raw).adjusted,false);
    assert.strictEqual(financialNavBasis(raw).fund,raw);
    assert.deepEqual(raw.warnings,warnings);
  }
});

test('a recognized UTI split cannot hide stale history or a failed refresh',()=>{
  for(const [index] of identities.entries()) {
    const message='Refresh failed: MFAPI timeout. Showing cached history.';
    const raw=fund(index,{stale:true,warnings:[KNOWN_OVERNIGHT_WARNING,message]});
    const original=structuredClone(raw),basis=financialNavBasis(raw);
    assert.equal(basis.adjusted,true);
    assert.equal(basis.fund.stale,true);
    assert.equal(basis.fund.fetchedAt,raw.fetchedAt);
    assert.deepEqual(basis.fund.warnings,[message]);
    assert.deepEqual(raw,original);
  }
});

test('March events do not authorize different UTI ETFs or similarly named index funds',()=>{
  for(const [code,name,isin] of [
    [148173,'UTI Nifty Bank ETF - Direct Plan - Growth','INF789F1AUV1'],
    [146388,'UTI - BSE Sensex Next 50 Exchange Traded Fund - Direct Plan - Growth','INF789F1AUU3'],
    [143341,'UTI - Nifty Next 50 Index Fund - Direct Plan - Growth','INF789F1ANZ4'],
  ] as const) {
    const raw=fund(1,{meta:{...fund(1).meta,schemeCode:code,schemeName:name,isinGrowth:isin}});
    assert.equal(financialNavBasis(raw).adjusted,false);
    assert.strictEqual(financialNavBasis(raw).fund,raw);
  }
});
