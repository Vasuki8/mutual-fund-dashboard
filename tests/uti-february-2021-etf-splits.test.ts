import assert from 'node:assert/strict';
import { test } from 'node:test';
import { financialNavBasis, KNOWN_OVERNIGHT_WARNING } from '../src/lib/corporate-actions.ts';
import { absoluteReturn, cagr, trailingReturn } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';

const identities = [
  [148173, 'UTI Nifty Bank ETF - Direct Plan - Growth', 'INF789F1AUV1'],
  [146388, 'UTI - BSE Sensex Next 50 Exchange Traded Fund - Direct Plan - Growth', 'INF789F1AUU3'],
] as const;
const evidence='https://bsmedia.business-standard.com/_media/bs/data/announcements/bse/05022021/aca4ac2d-ea8f-4dda-b674-03275fb1dec6.pdf';
// Synthetic observations exercise behavior; they never replace source records.
function fund(index:number, overrides:Partial<FundData>={}):FundData {
  const [code,name,isin]=identities[index];
  const points:NavPoint[]=[
    {date:'2020-09-03',nav:300},{date:'2021-02-18',nav:395},
    {date:'2021-02-19',nav:400},{date:'2021-02-22',nav:39.2},
    {date:'2021-10-26',nav:44},{date:'2023-10-26',nav:52},
    {date:'2025-10-26',nav:60},{date:'2026-10-26',nav:68},
  ];
  return {meta:{schemeCode:code,schemeName:name,isinGrowth:isin,
    fundHouse:'UTI Mutual Fund',schemeType:'Open Ended Schemes',schemeCategory:'Exchange Traded Funds (ETFs) - Equity ETF'},
    points,warnings:[KNOWN_OVERNIGHT_WARNING],source:'mfapi.in',
    fetchedAt:'2026-10-26T11:31:26.749Z',stale:false,fromCache:true,...overrides};
}

for(const [index,identity] of identities.entries()) {
  test(`UTI February ETF ${identity[0]} changes only its temporary calculation unit basis`,()=>{
    const raw=fund(index),original=structuredClone(raw),basis=financialNavBasis(raw);
    assert.equal(basis.adjusted,true);
    assert.equal(basis.adjustment?.schemeCode,identity[0]);
    assert.equal(basis.adjustment?.factor,0.1);
    assert.equal(basis.adjustment?.oldNavThrough,'2021-02-19');
    assert.equal(basis.adjustment?.firstNewNavDate,'2021-02-22');
    assert.equal(basis.adjustment?.evidenceUrl,evidence);
    assert.match(basis.adjustment?.label??'',/10-for-1.*19 February 2021/);
    assert.equal(qualityBlocked(raw),true);
    assert.equal(qualityBlocked(basis.fund),false);
    assert.deepEqual(raw,original);
    assert.deepEqual(basis.fund.meta,raw.meta);
    assert.equal(basis.fund.fetchedAt,raw.fetchedAt);
    assert.equal(basis.fund.points.length,raw.points.length);
    raw.points.forEach((point,i)=>{
      assert.equal(basis.fund.points[i].date,point.date);
      assert.equal(basis.fund.points[i].nav,point.date<'2021-02-22'?point.nav*0.1:point.nav);
    });
    const twice=financialNavBasis(basis.fund);
    assert.equal(twice.adjusted,false);
    assert.strictEqual(twice.fund,basis.fund);
  });
}

test('February UTI splits preserve ordinary market losses, full-history arithmetic and post-event returns',()=>{
  for(const index of [0,1]) {
    const raw=fund(index),basis=financialNavBasis(raw);
    assert.equal(basis.adjusted,true);
    const p=basis.fund.points;
    assert.ok(Math.abs(p[3].nav/p[2].nav-0.98)<1e-12,'Preserve the 2% loss, not a 90% denomination loss.');
    assert.ok(!p.some(row=>['2021-02-20','2021-02-21'].includes(row.date)));
    for(const years of [1,3,5]) assert.equal(trailingReturn(p,years),trailingReturn(raw.points,years));
    const days=(Date.parse(p.at(-1)!.date)-Date.parse(p[0].date))/86400_000;
    assert.ok(Math.abs(absoluteReturn(p)!-(68/30-1))<1e-12);
    assert.ok(Math.abs(cagr(p)!-((68/30)**(365/days)-1))<1e-12);
    assert.notEqual(absoluteReturn(p),absoluteReturn(raw.points));
  }
});

test('February UTI actions require exact code, name, ISIN and fund-house identity',()=>{
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

test('wrong February UTI dates, factors, missing events and additional jumps fail closed',()=>{
  for(const index of [0,1]) {
    const raw=fund(index),rows=raw.points;
    for(const points of [
      rows.filter(p=>p.date!=='2021-02-19'),rows.filter(p=>p.date!=='2021-02-22'),
      rows.map(p=>({...p,date:p.date==='2021-02-22'?'2021-02-23':p.date})),
      rows.map(p=>({...p,nav:p.date>='2021-02-22'?p.nav*0.1:p.nav})),
      rows.map(p=>({...p,nav:p.date>='2021-02-22'?p.nav*1.2:p.nav})),
      rows.map(p=>({...p,nav:p.date==='2025-10-26'?p.nav*3:p.nav})),
      rows.map(p=>({...p,nav:p.date==='2021-02-19'?0:p.nav})),
      rows.map(p=>({...p,nav:p.date==='2021-02-19'?Infinity:p.nav})),
      rows.map(p=>({...p,date:p.date==='2021-02-19'?'2021-02-30':p.date})),
      [...rows].reverse(),[...rows.slice(0,2),rows[1],...rows.slice(2)],
    ]) {
      const input={...raw,points};
      assert.equal(financialNavBasis(input).adjusted,false);
      assert.strictEqual(financialNavBasis(input).fund,input);
    }
  }
});

test('independent invalid/conflicting evidence and unknown warnings block both February UTI actions',()=>{
  for(const index of [0,1])for(const warnings of [
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

test('a verified February UTI split retains failed-refresh messages and original freshness',()=>{
  for(const index of [0,1]) {
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

test('February source dates cannot authorize the separate UTI March split identities',()=>{
  for(const [code,name,isin] of [
    [105463,'UTI - Gold Exchange Traded Fund - Direct Plan - Growth','INF789F1AUX7'],
    [141665,'UTI - Nifty Next 50 Exchange Traded Fund - Direct Plan - Growth','INF789F1AUW9'],
  ] as const) {
    const raw=fund(0,{meta:{...fund(0).meta,schemeCode:code,schemeName:name,isinGrowth:isin}});
    assert.equal(financialNavBasis(raw).adjusted,false);
    assert.strictEqual(financialNavBasis(raw).fund,raw);
  }
});
