import assert from 'node:assert/strict';
import { test } from 'node:test';
import { financialNavBasis, KNOWN_OVERNIGHT_WARNING } from '../src/lib/corporate-actions.ts';
import { absoluteReturn, cagr, trailingReturn } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';

const identities = [
  [150476, 'HDFC NIFTY 100 ETF - Growth Option', 'INF179KC1HR4'],
  [150477, 'HDFC NIFTY NEXT 50 ETF - Growth Option', 'INF179KC1HS2'],
  [150657, 'HDFC NIFTY200 MOMENTUM 30 ETF - Growth Option', 'INF179KC1HV6'],
  [150658, 'HDFC NIFTY100 Low Volatility 30 ETF - Growth Option', 'INF179KC1HU8'],
  [151374, 'HDFC NIFTY Midcap 150 ETF - Growth Option', 'INF179KC1HT0'],
] as const;

// Synthetic observations only. The complete saved histories are validated separately.
function observations(): NavPoint[] {
  return [
    {date:'2022-08-05',nav:200}, {date:'2023-10-19',nav:210},
    {date:'2023-10-20',nav:212}, {date:'2023-10-23',nav:20.75},
    {date:'2023-10-26',nav:21}, {date:'2024-10-25',nav:23},
    {date:'2025-10-24',nav:24}, {date:'2026-10-26',nav:25},
  ];
}
function fund(index: number, overrides: Partial<FundData> = {}): FundData {
  const [code,name,isin]=identities[index];
  return {meta:{schemeCode:code,schemeName:name,isinGrowth:isin,
    fundHouse:'HDFC Mutual Fund',schemeType:'Open Ended Schemes',schemeCategory:'Other Scheme - Other  ETFs'},
    points:observations(),warnings:[KNOWN_OVERNIGHT_WARNING],source:'mfapi.in',
    fetchedAt:'2026-10-28T06:00:00.000Z',stale:false,fromCache:true,...overrides};
}

for(const [index,identity] of identities.entries()) {
  test(`verified October 2023 HDFC ETF ${identity[0]} adjusts the calculation copy only`,()=>{
    const raw=fund(index),original=structuredClone(raw),basis=financialNavBasis(raw);
    assert.equal(basis.adjusted,true);
    assert.equal(basis.adjustment?.schemeCode,identity[0]);
    assert.equal(basis.adjustment?.factor,0.1);
    assert.equal(basis.adjustment?.oldNavThrough,'2023-10-20');
    assert.equal(basis.adjustment?.firstNewNavDate,'2023-10-23');
    assert.match(basis.adjustment?.label??'',/10-for-1/);
    assert.match(basis.adjustment?.label??'',/20 October 2023/);
    assert.equal(basis.adjustment?.evidenceUrl,'https://nsearchives.nseindia.com/content/circulars/CML58972.pdf');
    assert.equal(qualityBlocked(raw),true);
    assert.equal(qualityBlocked(basis.fund),false);
    assert.deepEqual(raw,original);
    assert.deepEqual(basis.fund.meta,raw.meta);
    assert.equal(basis.fund.fetchedAt,raw.fetchedAt);
    assert.equal(basis.fund.points.length,raw.points.length);
    raw.points.forEach((p,i)=>{
      assert.equal(basis.fund.points[i].date,p.date);
      assert.equal(basis.fund.points[i].nav,p.date<'2023-10-23'?p.nav*0.1:p.nav);
    });
    assert.equal(financialNavBasis(basis.fund).adjusted,false);
    assert.strictEqual(financialNavBasis(basis.fund).fund,basis.fund);
  });
}

test('the split removes denomination loss but preserves market loss and post-event returns',()=>{
  for(const [index] of identities.entries()) {
    const raw=fund(index),basis=financialNavBasis(raw);
    assert.equal(basis.adjusted,true);
    const points=basis.fund.points,split=points.findIndex(p=>p.date==='2023-10-23');
    const expected=20.75/(212*0.1)-1;
    assert.ok(expected<0 && expected>-0.05);
    assert.ok(Math.abs(absoluteReturn(points.slice(split-1,split+1))!-expected)<1e-12);
    assert.notEqual(expected,0,'Do not force an actual market move to zero.');
    assert.equal(points[split-1].date,'2023-10-20','The stored record-date NAV is still old-unit NAV.');
    for(const year of [1,3,5]) assert.equal(trailingReturn(points,year),trailingReturn(raw.points,year));
    assert.equal(trailingReturn(points,5),null,'A split cannot create five years of history.');
    const first=points[0],last=points.at(-1)!;
    const days=(Date.parse(last.date)-Date.parse(first.date))/86400_000;
    assert.ok(Math.abs(cagr(points)!-((last.nav/first.nav)**(365/days)-1))<1e-12);
  }
});

test('each ETF requires its own exact code, name, ISIN and fund-house identity',()=>{
  for(const [index,item] of identities.entries()) {
    const raw=fund(index),other=identities[(index+1)%identities.length];
    for(const meta of [
      {...raw.meta,schemeCode:999999}, {...raw.meta,schemeName:other[1]},
      {...raw.meta,schemeName:item[1].replace('Growth','IDCW')},
      {...raw.meta,schemeName:item[1]+' - Direct Plan'},
      {...raw.meta,isinGrowth:other[2]}, {...raw.meta,isinGrowth:null},
      {...raw.meta,fundHouse:'Another Mutual Fund'},
    ]) {
      const input={...raw,meta};
      assert.equal(financialNavBasis(input).adjusted,false);
      assert.strictEqual(financialNavBasis(input).fund,input);
    }
  }
});

test('wrong boundaries, unexplained ratios and any second jump still reject these splits',()=>{
  for(const [index] of identities.entries()) {
    const rows=observations();
    const invalid=[
      rows.filter(p=>p.date!=='2023-10-20'), rows.filter(p=>p.date!=='2023-10-23'),
      rows.map(p=>({...p,date:p.date==='2023-10-23'?'2023-10-21':p.date})),
      rows.map(p=>({...p,nav:p.date>='2023-10-23'?p.nav*1.2:p.nav})),
      rows.map(p=>({...p,nav:p.date>='2023-10-23'?p.nav*0.8:p.nav})),
      rows.map(p=>({...p,nav:p.date==='2024-10-25'?90:p.nav})),
      rows.map(p=>({...p,nav:p.date==='2023-10-20'?0:p.nav})),
      rows.map(p=>({...p,nav:p.date==='2023-10-20'?Infinity:p.nav})),
      rows.map(p=>({...p,date:p.date==='2023-10-20'?'2023-10-32':p.date})),
      [...rows].reverse(),[...rows.slice(0,2),rows[1],...rows.slice(2)],
    ];
    for(const points of invalid) {
      const input=fund(index,{points});
      assert.equal(financialNavBasis(input).adjusted,false);
      assert.strictEqual(financialNavBasis(input).fund,input);
    }
  }
});

test('independent invalid, conflict and unknown discontinuity warnings remain blocking',()=>{
  for(const [index] of identities.entries())for(const warnings of [
    [],['Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.'],
    [KNOWN_OVERNIGHT_WARNING,'Invalid NAV observations were excluded (1); derived analytics are blocked.'],
    [KNOWN_OVERNIGHT_WARNING,'Conflicting NAV values occur on 1 duplicate date(s); analytics are blocked.'],
    [KNOWN_OVERNIGHT_WARNING,'Unresolved discontinuity: unresolved source review.'],
  ]) {
    const input=fund(index,{warnings});
    assert.equal(financialNavBasis(input).adjusted,false);
    assert.strictEqual(financialNavBasis(input).fund,input);
    assert.deepEqual(input.warnings,warnings);
  }
});

test('the calculation adjustment cannot hide refresh failure or claim fresh source data',()=>{
  for(const [index] of identities.entries()) {
    const message='Refresh failed: MFAPI timeout. Showing cached history.';
    const input=fund(index,{warnings:[KNOWN_OVERNIGHT_WARNING,message],stale:true});
    const original=structuredClone(input),basis=financialNavBasis(input);
    assert.equal(basis.adjusted,true);
    assert.deepEqual(input,original);
    assert.equal(basis.fund.stale,true);
    assert.equal(basis.fund.fromCache,true);
    assert.equal(basis.fund.fetchedAt,input.fetchedAt);
    assert.deepEqual(basis.fund.warnings,[message]);
  }
});

test('October 2023 registry cannot authorize the separate Sensex, Bank or IT split events',()=>{
  for(const code of [135854,148461,150801,150802]) {
    const input=fund(0,{meta:{...fund(0).meta,schemeCode:code}});
    assert.equal(financialNavBasis(input).adjusted,false);
    assert.strictEqual(financialNavBasis(input).fund,input);
  }
});
