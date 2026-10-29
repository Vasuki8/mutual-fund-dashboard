import assert from 'node:assert/strict';
import test from 'node:test';
import { financialNavBasis } from '../src/lib/corporate-actions.ts';
import { absoluteReturn } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import type { FundData, FundMeta } from '../src/lib/types.ts';
import { ABSL_CASES, abslFixture } from './fixtures/absl-nav-review.ts';
import { BOI_DISCONTINUITY } from './fixtures/boi-nav-review.ts';

function rejected(fund:FundData,reason:string){
  const raw=structuredClone(fund),basis=financialNavBasis(fund);
  assert.equal(basis.fund,fund,reason);assert.equal(basis.review,undefined,reason);
  assert.equal(basis.adjusted,false,reason);assert.deepEqual(fund,raw,reason);
}
for(const spec of ABSL_CASES){
  test(`${spec.code}: replaces only the exact source spike using issuer historical NAV`,()=>{
    const fund=abslFixture(spec),raw=structuredClone(fund);
    fund.points.forEach(Object.freeze);Object.freeze(fund.points);Object.freeze(fund.warnings);Object.freeze(fund);
    const basis=financialNavBasis(fund);
    assert.ok(basis.review);assert.equal(basis.adjusted,false);assert.equal(basis.adjustment,undefined);
    assert.equal(basis.review.schemeCode,spec.code);assert.equal(basis.review.correction.date,'2019-04-10');
    assert.equal(basis.review.correction.sourceNav,spec.navs[2]);assert.equal(basis.review.correction.verifiedNav,spec.verified);
    assert.equal(basis.review.correction.applied,true);assert.deepEqual(basis.review.events,[]);
    const evidence=new URL(basis.review.correction.evidenceUrl);
    assert.equal(evidence.origin,'https://mutualfund.adityabirlacapital.com');
    assert.equal(evidence.pathname,'/api/sitecore/Shared/PostHistoricalNavandDividendFile');
    assert.equal(evidence.searchParams.get('SchemeCode'),spec.internalCode);
    assert.equal(evidence.searchParams.get('FromDate'),'09-Apr-2019');
    assert.equal(evidence.searchParams.get('ToDate'),'11-Apr-2019');
    const expected=structuredClone(raw.points);expected[2].nav=spec.verified;
    assert.deepEqual(basis.fund.points,expected);assert.deepEqual(fund,raw);
    assert.deepEqual({...basis.fund,points:raw.points,warnings:raw.warnings},raw);
    assert.equal(qualityBlocked(basis.fund),false);assert.equal(qualityBlocked(fund),true);
    assert.ok(basis.fund.warnings.some(w=>w.includes('2019-04-10')&&w.includes(String(spec.verified))));
    assert.ok(basis.fund.warnings.every(w=>!w.includes('recovery')),'no invented economic-event attribution');
  });
  test(`${spec.code}: retains both independently calculated daily market returns`,()=>{
    const points=financialNavBasis(abslFixture(spec)).fund.points;
    assert.ok(Math.abs(absoluteReturn(points.slice(1,3))!-spec.firstReturn)<1e-12);
    assert.ok(Math.abs(absoluteReturn(points.slice(2,4))!-spec.secondReturn)<1e-12);
  });
  test(`${spec.code}: rejects mixed codes, plans, ISINs and unrelated categories`,()=>{
    const other=ABSL_CASES.find(item=>item.code!==spec.code)!;
    const changes:Partial<FundMeta>[]=[{schemeCode:other.code},{schemeCode:999999},
      {schemeName:abslFixture(other).meta.schemeName},{schemeName:abslFixture(spec).meta.schemeName+' IDCW'},
      {schemeName:' '+abslFixture(spec).meta.schemeName},{isinGrowth:other.isin},{isinGrowth:null},
      {isinDivReinvestment:'INF000000000'},{fundHouse:'Other Mutual Fund'},
      {schemeType:'Closed Ended Schemes'},{schemeCategory:'Other Scheme - FoF Overseas'}];
    for(const change of changes){const fund=abslFixture(spec);Object.assign(fund.meta,change);rejected(fund,JSON.stringify(change));}
  });
  test(`${spec.code}: requires exact source conflict and both consecutive neighbor values`,()=>{
    for(const index of [1,2,3]){
      const wrong=abslFixture(spec);wrong.points[index].nav+=0.00001;rejected(wrong,'unrecognized value');
      const missing=abslFixture(spec);missing.points.splice(index,1);rejected(missing,'missing anchor');
      const shifted=abslFixture(spec);shifted.points[index].date=shifted.points[index].date.replace('2019','2018');rejected(shifted,'shifted anchor');
    }
  });
  test(`${spec.code}: extra jumps and malformed series block the entire review`,()=>{
    const extra=abslFixture(spec);extra.points.push({date:'2019-04-15',nav:100});rejected(extra,'extra jump');
    for(const nav of [0,-1,NaN,Infinity]){const invalid=abslFixture(spec);invalid.points[0].nav=nav;rejected(invalid,'invalid NAV');}
    const date=abslFixture(spec);date.points[0].date='2019-02-30';rejected(date,'invalid date');
    const order=abslFixture(spec);order.points.reverse();rejected(order,'wrong order');
    const duplicate=abslFixture(spec);duplicate.points.push({...duplicate.points.at(-1)!});rejected(duplicate,'duplicate');
  });
  test(`${spec.code}: exact warning count and independent source blockers remain mandatory`,()=>{
    for(const warnings of [[],[BOI_DISCONTINUITY.replace(': 2 ',': 3 ')],[BOI_DISCONTINUITY,BOI_DISCONTINUITY],
      [BOI_DISCONTINUITY,'Invalid NAV observations were excluded (1).'],
      [BOI_DISCONTINUITY,'Conflicting NAV values occur on 1 duplicate date(s).']]){
      const fund=abslFixture(spec);fund.warnings=warnings;rejected(fund,'warning guard');
    }
  });
  test(`${spec.code}: an already-corrected clean source needs no override and stale warnings are not waived`,()=>{
    const clean=abslFixture(spec);clean.points[2].nav=spec.verified;clean.warnings=[];
    rejected(clean,'no correction necessary');assert.equal(qualityBlocked(clean),false);
    const stale=abslFixture(spec);stale.points[2].nav=spec.verified;
    rejected(stale,'unexplained stale warning');assert.equal(qualityBlocked(stale),true);
  });
  test(`${spec.code}: ordinary newer observations and independent operational warnings are retained`,()=>{
    const fund=abslFixture(spec);fund.points.push({date:'2019-04-15',nav:spec.navs[4]*1.01});
    fund.warnings.push('Using retained history after a source timeout.');
    const basis=financialNavBasis(fund);assert.ok(basis.review);
    assert.deepEqual(basis.fund.points.at(-1),fund.points.at(-1));
    assert.ok(basis.fund.warnings.includes('Using retained history after a source timeout.'));
  });
}
