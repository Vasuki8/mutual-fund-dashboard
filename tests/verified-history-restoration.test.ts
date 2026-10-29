import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { financialNavBasis } from '../src/lib/corporate-actions.ts';
import { qualityBlocked, navReviewSummary } from '../src/lib/format.ts';
import type { FundData } from '../src/lib/types.ts';
import { sbiHistoryFixture, SBI_GAP_WARNING } from './fixtures/sbi-history-review.ts';

function rejected(fund:FundData) {
  const raw=structuredClone(fund),basis=financialNavBasis(fund);
  assert.equal(basis.fund,fund);assert.equal(basis.review,undefined);
  assert.equal(basis.adjusted,false);assert.deepEqual(fund,raw);
}

test('restores all 303 original issuer observations without changing seven source anchors',()=>{
  const fund=sbiHistoryFixture(),raw=structuredClone(fund);
  fund.points.forEach(Object.freeze);Object.freeze(fund.points);Object.freeze(fund.warnings);Object.freeze(fund);
  const basis=financialNavBasis(fund);
  assert.ok(basis.review,'the documented history gap must have a reviewed calculation basis');
  assert.equal(basis.adjusted,false);assert.equal(basis.adjustment,undefined);
  assert.equal(basis.fund.points.length,310);assert.equal(qualityBlocked(basis.fund),false);
  assert.equal(qualityBlocked(fund),true);assert.deepEqual(fund,raw);
  assert.equal(basis.review.correction,undefined);
  assert.equal(basis.review.restoration.addedObservations,303);
  assert.equal(basis.review.restoration.fromDate,'2009-04-06');
  assert.equal(basis.review.restoration.throughDate,'2010-07-08');
  for(const point of raw.points)assert.deepEqual(basis.fund.points.find(p=>p.date===point.date),point);
  // Digest derived independently from every row of the issuer's PDF/JSON window.
  const canonical=basis.fund.points.map(p=>`${p.date},${p.nav.toFixed(5)}\n`).join('');
  assert.equal(createHash('sha256').update(canonical).digest('hex'),'a02c6a3cc5a94bb1b3df443c9160ccfd90e9d6f66913a115be9450b33784fa91');
  const summary=navReviewSummary(basis.review);
  assert.match(summary,/303/);assert.match(summary,/2009-04-06/);assert.match(summary,/2010-07-08/);
  assert.match(summary,/issuer/i);assert.match(summary,/Raw source observations and warnings remain unchanged/);
});

test('preserves observations and notices outside the verified restoration window',()=>{
  const fund=sbiHistoryFixture();fund.points.unshift({date:'2009-03-31',nav:5.65});
  fund.points.push({date:'2010-07-16',nav:10.33});fund.warnings.push('Saved history is available while a live refresh is pending.');
  const basis=financialNavBasis(fund);assert.ok(basis.review);assert.equal(basis.fund.points.length,312);
  assert.deepEqual(basis.fund.points[0],fund.points[0]);assert.deepEqual(basis.fund.points.at(-1),fund.points.at(-1));
  assert.ok(basis.fund.warnings.includes(fund.warnings[1]));
});

for(const [field,value] of [
  ['schemeCode',119700],['schemeName','SBI INFRASTRUCTURE FUND - Direct Plan - Growth'],
  ['fundHouse','Another Mutual Fund'],['schemeType','Closed Ended Schemes'],
  ['schemeCategory','Equity Scheme - Large Cap Fund'],['isinGrowth','INF200K01RS2'],
  ['isinDivReinvestment','INF200K01CV8'],
] as const)test(`refuses an unrelated restoration identity: ${field}`,()=>{
  const fund=sbiHistoryFixture();(fund.meta as any)[field]=value;rejected(fund);
});

for(const warning of [
  'Invalid NAV observations: 1 observation(s) were rejected.',
  'Conflicting NAV values: 1 date(s) have conflicting values.',
  'Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.',
])test(`retains an independent blocker: ${warning.split(':')[0]} ${warning.includes('2 single')?'extra jump':''}`,()=>{
  const fund=sbiHistoryFixture();fund.warnings.push(warning);rejected(fund);
});

test('requires the exact generated gap warning and a unique warning',()=>{
  for(const warnings of [[],[SBI_GAP_WARNING,SBI_GAP_WARNING],[SBI_GAP_WARNING.replace('40%','41%')]]){
    const fund=sbiHistoryFixture();fund.warnings=warnings;rejected(fund);
  }
});

test('rejects changed or missing issuer overlap anchors',()=>{
  for(let i=0;i<7;i++){
    const changed=sbiHistoryFixture();changed.points[i].nav+=0.01;rejected(changed);
    const missing=sbiHistoryFixture();missing.points.splice(i,1);rejected(missing);
  }
});

test('does not override a partial or conflicting history inside the formerly empty gap',()=>{
  for(const nav of [6.1,6.2]){
    const fund=sbiHistoryFixture();fund.points.splice(2,0,{date:'2009-04-06',nav});rejected(fund);
  }
});

test('rejects an extra defect outside the verified interval',()=>{
  const fund=sbiHistoryFixture();fund.points.push({date:'2010-07-16',nav:50});rejected(fund);
});

test('rejects invalid, duplicate, unordered or misattributed series',()=>{
  const changes=[
    (f:FundData)=>{f.points[0].date='2009-02-30';},
    (f:FundData)=>{f.points[0].nav=0;},
    (f:FundData)=>{f.points[0].nav=Number.NaN;},
    (f:FundData)=>{f.points.splice(1,0,{...f.points[0]});},
    (f:FundData)=>{f.points.reverse();},
    (f:FundData)=>{(f as any).source='unverified';},
  ];for(const change of changes){const fund=sbiHistoryFixture();change(fund);rejected(fund);}
});
