import assert from 'node:assert/strict';
import test from 'node:test';
import { validateFundResponse } from '../src/lib/api.ts';
import { financialNavBasis } from '../src/lib/corporate-actions.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import { navReviewSummary } from '../src/lib/verified-nav-reviews.ts';
import type { FundData, FundMeta } from '../src/lib/types.ts';
import { SUNDARAM_CODES, ZERO_DATES, ZERO_WARNING, sundaramFixture, sundaramPayload } from './fixtures/sundaram-nav-review.ts';

function blocked(fund:FundData, reason:string) {
  const original=structuredClone(fund), result=financialNavBasis(fund);
  assert.equal(result.fund,fund,reason);
  assert.equal(result.review,undefined,reason);
  assert.equal(result.adjusted,false,reason);
  assert.deepEqual(fund,original);
}

for (const code of SUNDARAM_CODES) {
  test(`${code}: exact primary rows restore calculations while all raw evidence remains unchanged`,()=>{
    const raw=sundaramFixture(code), original=structuredClone(raw);
    raw.points.forEach(Object.freeze);Object.freeze(raw.points);Object.freeze(raw.meta);
    Object.freeze(raw.warnings);Object.freeze(raw.rejectedZeroNavDates);Object.freeze(raw);
    const result=financialNavBasis(raw);
    assert.ok(result.review);assert.equal(result.adjusted,false);
    assert.equal(result.review.schemeCode,code);
    assert.equal(result.review.restoration?.addedObservations,3);
    assert.equal(qualityBlocked(raw),true);assert.equal(qualityBlocked(result.fund),false);
    assert.deepEqual(result.fund.points.slice(0,3),code===119566 ? [
      {date:'2013-01-03',nav:15.3408},{date:'2013-01-04',nav:15.2991},{date:'2013-01-07',nav:15.3408},
    ] : [{date:'2013-01-03',nav:11.9501},{date:'2013-01-04',nav:12.0196},{date:'2013-01-07',nav:12.0196}]);
    assert.equal(result.fund.points.length,raw.points.length+3);
    for (const point of raw.points) assert.equal(result.fund.points.find(p=>p.date===point.date)?.nav,
      code===119635 && point.date==='2018-09-26' ? 19.4292 : point.nav);
    const summary=navReviewSummary(result.review);
    assert.match(summary,/Added 3 issuer-verified NAV observations/);
    assert.match(summary,/Raw source observations and warnings remain unchanged/);
    if(code===119635) assert.match(summary,/2018-09-26.*19\.4293.*19\.4292/);
    assert.deepEqual(raw,original);
    assert.equal(financialNavBasis(result.fund).review,undefined,'no second application');
  });

  test(`${code}: same invalid count with different or unknown rejected rows cannot authorize a repair`,()=>{
    const payload=sundaramPayload(code);
    payload.data.find(row=>row.date==='03-01-2013')!.date='02-01-2013';
    blocked(validateFundResponse(payload,code),'different rejected date');
    const legacy=sundaramFixture(code);delete legacy.rejectedZeroNavDates;
    blocked(legacy,'legacy count-only history');
    const unknown=sundaramPayload(code);unknown.data.find(row=>row.date==='03-01-2013')!.nav='-1';
    blocked(validateFundResponse(unknown,code),'negative is not a reviewed zero');
    const duplicate=sundaramPayload(code);duplicate.data.push({date:'03-01-2013',nav:'0.00000'});
    blocked(validateFundResponse(duplicate,code),'repeated rejection');
  });

  test(`${code}: identity, warning, evidence-date and anchor mutations fail closed`,()=>{
    const changes:Partial<FundMeta>[]=[{schemeCode:119566===code?119635:119566},{schemeCode:999999},
      {schemeName:sundaramFixture(code).meta.schemeName.replace('Direct','Regular')},
      {isinGrowth:null},{isinGrowth:'INF903J01HB0'},{isinDivReinvestment:'INF903J01HC8'},
      {fundHouse:'Other Mutual Fund'},{schemeType:'Closed Ended Schemes'},{schemeCategory:'Other'}];
    for(const change of changes){const fund=sundaramFixture(code);Object.assign(fund.meta,change);blocked(fund,JSON.stringify(change));}
    const dates=[[],[...ZERO_DATES].reverse(),[ZERO_DATES[0],ZERO_DATES[0],ZERO_DATES[2]],
      ['2013-01-02',...ZERO_DATES],['2013-02-30',ZERO_DATES[1],ZERO_DATES[2]]];
    for(const evidence of dates){const fund=sundaramFixture(code);fund.rejectedZeroNavDates=evidence;blocked(fund,JSON.stringify(evidence));}
    for(const warnings of [[],[ZERO_WARNING.replace('(3)','(2)')],[ZERO_WARNING,ZERO_WARNING],
      [ZERO_WARNING,'Conflicting NAV values occur on 1 duplicate date(s); analytics are blocked.'],
      [ZERO_WARNING,'Unresolved discontinuity: independent source evidence remains.']]){
      const fund=sundaramFixture(code);fund.warnings=warnings;blocked(fund,JSON.stringify(warnings));
    }
    const changed=sundaramFixture(code);changed.points[1].nav+=0.0001;blocked(changed,'changed early anchor');
    const missing=sundaramFixture(code);missing.points.splice(1,1);blocked(missing,'missing early anchor');
    const earlier=sundaramFixture(code);earlier.points.unshift({date:'2013-01-02',nav:earlier.points[0].nav});blocked(earlier,'new earlier source boundary');
  });

  test(`${code}: full-series integrity is checked and ordinary appended values remain usable`,()=>{
    for(const nav of [0,-1,NaN,Infinity]){const fund=sundaramFixture(code);fund.points[4].nav=nav;blocked(fund,`bad NAV ${nav}`);}
    const jump=sundaramFixture(code);jump.points.at(-1)!.nav*=2;blocked(jump,'unreported additional jump');
    const unsorted=sundaramFixture(code);unsorted.points.reverse();blocked(unsorted,'unsorted');
    const duplicate=sundaramFixture(code);duplicate.points.splice(2,0,{...duplicate.points[1]});blocked(duplicate,'duplicate');
    const raw=sundaramFixture(code);raw.warnings.push('Using saved data after a connection failure.');
    const previous=raw.points.at(-1)!;
    const date=new Date(Date.parse(previous.date)+86400000).toISOString().slice(0,10);
    raw.points.push({date,nav:previous.nav*1.001});
    const reviewed=financialNavBasis(raw);
    assert.ok(reviewed.review);assert.ok(reviewed.fund.warnings.includes('Using saved data after a connection failure.'));
    assert.deepEqual(reviewed.fund.points.at(-1),raw.points.at(-1));
  });
}

test('119635 exact positive correction requires both adjacent anchors and rejects unknown revisions',()=>{
  for(const date of ['2018-09-25','2018-09-26','2018-09-27']){
    const changed=sundaramFixture(119635);changed.points.find(p=>p.date===date)!.nav+=0.00001;
    blocked(changed,`unknown positive revision ${date}`);
    const missing=sundaramFixture(119635);missing.points=missing.points.filter(p=>p.date!==date);
    blocked(missing,`missing positive correction anchor ${date}`);
  }
  const corrected=sundaramFixture(119635);corrected.points.find(p=>p.date==='2018-09-26')!.nav=19.4292;
  const result=financialNavBasis(corrected);assert.ok(result.review);
  assert.equal(result.fund.points.find(p=>p.date==='2018-09-26')!.nav,19.4292);
  assert.match(navReviewSummary(result.review),/already matches issuer-verified/);
});

test('119635 independent September correction survives source repair of all January zeros',()=>{
  const payload=sundaramPayload(119635);
  const fixes=new Map([['03-01-2013','11.95010'],['04-01-2013','12.01960'],['07-01-2013','12.01960']]);
  for(const row of payload.data)if(fixes.has(row.date))row.nav=fixes.get(row.date)!;
  const raw=validateFundResponse(payload,119635),original=structuredClone(raw);
  assert.deepEqual(raw.warnings,[]);assert.equal(raw.rejectedZeroNavDates,undefined);
  const result=financialNavBasis(raw);
  assert.ok(result.review?.correction);
  assert.equal(result.review.restoration,undefined);
  assert.equal(result.review.correction.date,'2018-09-26');
  assert.equal(result.fund.points.find(p=>p.date==='2018-09-26')!.nav,19.4292);
  assert.equal(result.fund.points.length,raw.points.length);
  assert.deepEqual(raw,original);
  const unknown=structuredClone(raw);unknown.points.find(p=>p.date==='2018-09-26')!.nav=19.4294;
  blocked(unknown,'unknown positive revision is not substituted');
  const independent=structuredClone(raw);independent.warnings.push('Invalid NAV observations were excluded (1); derived analytics are blocked until the data is resolved.');
  blocked(independent,'independent quality issue survives provider January repair');
});
