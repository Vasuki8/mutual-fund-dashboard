import assert from 'node:assert/strict';
import { test } from 'node:test';
import { financialNavBasis, KNOWN_OVERNIGHT_WARNING } from '../src/lib/corporate-actions.ts';
import { absoluteReturn, cagr, trailingReturn } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import type { FundData, NavPoint } from '../src/lib/types.ts';

const identities = [
  [148461, 'HDFC NIFTY BANK ETF - Growth Option', 'INF179KC1HY0'],
  [150801, 'HDFC NIFTY IT ETF - Growth Option', 'INF179KC1IA8'],
  [150802, 'HDFC NIFTY Private Bank ETF - Growth Option', 'INF179KC1HZ7'],
] as const;

// Synthetic fixtures, never replacements for archived observations.
function observations(): NavPoint[] {
  return [
    {date:'2022-11-16',nav:200}, {date:'2023-10-23',nav:230},
    {date:'2024-02-01',nav:239}, {date:'2024-02-02',nav:240},
    {date:'2024-02-05',nav:23.928}, {date:'2024-10-23',nav:24.1},
    {date:'2025-10-23',nav:25}, {date:'2026-10-23',nav:26},
  ];
}
function fund(index: number, overrides: Partial<FundData> = {}): FundData {
  const [code,name,isin]=identities[index];
  return {meta:{schemeCode:code,schemeName:name,isinGrowth:isin,
    fundHouse:'HDFC Mutual Fund',schemeType:'Open Ended Schemes',schemeCategory:'Other Scheme - Other  ETFs'},
    points:observations(),warnings:[KNOWN_OVERNIGHT_WARNING],source:'mfapi.in',
    fetchedAt:'2026-10-28T01:44:51.690Z',stale:false,fromCache:true,...overrides};
}

for(const [index,item] of identities.entries()) {
  test(`verified February 2024 ETF ${item[0]} changes only the calculation-copy unit basis`,()=>{
    const raw=fund(index),original=structuredClone(raw),basis=financialNavBasis(raw);
    assert.equal(basis.adjusted,true);
    assert.equal(basis.adjustment?.schemeCode,item[0]);
    assert.equal(basis.adjustment?.factor,0.1);
    assert.equal(basis.adjustment?.oldNavThrough,'2024-02-02');
    assert.equal(basis.adjustment?.firstNewNavDate,'2024-02-05');
    assert.match(basis.adjustment?.label??'',/10-for-1/);
    assert.match(basis.adjustment?.label??'',/2 February 2024/);
    assert.equal(basis.adjustment?.evidenceUrl,'https://nsearchives.nseindia.com/content/circulars/CML60421.pdf');
    assert.equal(qualityBlocked(raw),true);
    assert.equal(qualityBlocked(basis.fund),false);
    assert.deepEqual(raw,original);
    assert.deepEqual(basis.fund.meta,raw.meta);
    assert.equal(basis.fund.fetchedAt,raw.fetchedAt);
    assert.equal(basis.fund.points.length,raw.points.length);
    for(let i=0;i<raw.points.length;i++) {
      const source=raw.points[i],adjusted=basis.fund.points[i];
      assert.equal(adjusted.date,source.date);
      assert.equal(adjusted.nav,source.date<'2024-02-05'?source.nav*0.1:source.nav);
    }
    assert.equal(financialNavBasis(basis.fund).adjusted,false);
    assert.strictEqual(financialNavBasis(basis.fund).fund,basis.fund);
  });
}

test('February split preserves market loss and 1Y return, but correctly changes the split-crossing 3Y return',()=>{
  for(const [index] of identities.entries()) {
    const raw=fund(index),basis=financialNavBasis(raw);
    assert.equal(basis.adjusted,true);
    const points=basis.fund.points,i=points.findIndex(p=>p.date==='2024-02-05');
    assert.equal(points[i-1].date,'2024-02-02');
    assert.ok(!points.some(p=>p.date==='2024-02-03'||p.date==='2024-02-04'));
    const ratio=points[i].nav/points[i-1].nav;
    assert.ok(Math.abs(ratio-0.997)<1e-12,'Retain the ordinary 0.3% decline, not zero.');
    assert.equal(trailingReturn(points,1),trailingReturn(raw.points,1));
    assert.ok(Math.abs(trailingReturn(points,1)!-(26/25-1))<1e-12);
    const years=(Date.parse('2026-10-23')-Date.parse('2023-10-23'))/(86400_000*365);
    const expected=(26/(230*0.1))**(1/years)-1;
    assert.ok(Math.abs(trailingReturn(points,3)!-expected)<1e-12);
    assert.notEqual(trailingReturn(points,3),trailingReturn(raw.points,3));
    assert.equal(trailingReturn(points,5),null,'A split cannot supply unavailable history.');
    const first=points[0],last=points.at(-1)!;
    const days=(Date.parse(last.date)-Date.parse(first.date))/86400_000;
    assert.ok(Math.abs(cagr(points)!-((last.nav/first.nav)**(365/days)-1))<1e-12);
    assert.ok(Math.abs(absoluteReturn(points)!-(26/20-1))<1e-12);
  }
});

test('February ETF action needs its own exact scheme code, name, ISIN and HDFC identity',()=>{
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

test('February ETF adjustment rejects shifted dates, wrong ratios, second jumps and malformed observations',()=>{
  for(const [index] of identities.entries()) {
    const rows=observations();
    const invalid=[
      rows.filter(p=>p.date!=='2024-02-02'),rows.filter(p=>p.date!=='2024-02-05'),
      rows.map(p=>({...p,date:p.date==='2024-02-05'?'2024-02-03':p.date})),
      rows.map(p=>({...p,nav:p.date>='2024-02-05'?p.nav*1.2:p.nav})),
      rows.map(p=>({...p,nav:p.date>='2024-02-05'?p.nav*0.8:p.nav})),
      rows.map(p=>({...p,nav:p.date==='2025-10-23'?90:p.nav})),
      rows.map(p=>({...p,nav:p.date==='2024-02-02'?0:p.nav})),
      rows.map(p=>({...p,nav:p.date==='2024-02-02'?Infinity:p.nav})),
      rows.map(p=>({...p,date:p.date==='2024-02-02'?'2024-02-30':p.date})),
      [...rows].reverse(),[...rows.slice(0,3),rows[2],...rows.slice(3)],
    ];
    for(const points of invalid) {
      const input=fund(index,{points});
      assert.equal(financialNavBasis(input).adjusted,false);
      assert.strictEqual(financialNavBasis(input).fund,input);
    }
  }
});

test('independent NAV conflicts and unknown discontinuity evidence still block all February targets',()=>{
  for(const [index] of identities.entries())for(const warnings of [
    [],['Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.'],
    [KNOWN_OVERNIGHT_WARNING,'Invalid NAV observations were excluded (1); derived analytics are blocked.'],
    [KNOWN_OVERNIGHT_WARNING,'Conflicting NAV values occur on 1 duplicate date(s); analytics are blocked.'],
    [KNOWN_OVERNIGHT_WARNING,'Unresolved discontinuity: independent unresolved source review.'],
  ]) {
    const input=fund(index,{warnings});
    assert.equal(financialNavBasis(input).adjusted,false);
    assert.strictEqual(financialNavBasis(input).fund,input);
    assert.deepEqual(input.warnings,warnings);
  }
});

test('a February unit-basis adjustment cannot hide stale history or a failed source refresh',()=>{
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

test('the separate two-split Sensex history cannot use a single February correction',()=>{
  const input=fund(0,{meta:{...fund(0).meta,schemeCode:135854,
    schemeName:'HDFC BSE Sensex ETF - Growth Option',isinGrowth:'INF179KC1HX2'}});
  assert.equal(financialNavBasis(input).adjusted,false);
  assert.strictEqual(financialNavBasis(input).fund,input);
});
