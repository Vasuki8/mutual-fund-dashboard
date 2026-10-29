import assert from 'node:assert/strict';
import test from 'node:test';
import { financialNavBasis } from '../src/lib/corporate-actions.ts';
import { absoluteReturn, drawdownStats } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import type { FundData, FundMeta } from '../src/lib/types.ts';
import { BOI_CASES, BOI_DISCONTINUITY, boiFixture } from './fixtures/boi-nav-review.ts';

function close(actual: number | null, expected: number) {
  assert.notEqual(actual,null);
  assert.ok(Math.abs(actual!-expected)<1e-12,`${actual} != ${expected}`);
}
function rejected(fund: FundData, why: string) {
  const original=structuredClone(fund),result=financialNavBasis(fund);
  assert.equal(result.fund,fund,why);
  assert.equal(result.adjusted,false,why);
  assert.equal(result.review,undefined,why);
  assert.equal(result.adjustment,undefined,why);
  assert.equal(result.adjustments,undefined,why);
  assert.deepEqual(fund,original,why);
}

for (const spec of BOI_CASES) {
  test(`${spec.code}: corrects exactly the published date and preserves all raw source evidence`,()=>{
    const raw=boiFixture(spec),original=structuredClone(raw);
    raw.points.forEach(Object.freeze);Object.freeze(raw.points);Object.freeze(raw.meta);
    Object.freeze(raw.warnings);Object.freeze(raw);
    const result=financialNavBasis(raw);
    assert.equal(result.adjusted,false,'economic events are not unit adjustments');
    assert.equal(result.adjustment,undefined);assert.equal(result.adjustments,undefined);
    assert.ok(result.review,'the independently documented source review must be exposed');
    assert.equal(result.review.schemeCode,spec.code);
    assert.deepEqual(result.review.correction,{date:'2022-03-31',sourceNav:spec.navs[4],verifiedNav:spec.verified,
      applied:true,evidenceUrl:'https://www.boimf.in/docs/default-source/reports/financials/annual-report-2021-224ace7e8cb8f74e8f8d11443c4b271be0.pdf?sfvrsn=32295bd6_6#page=87'});
    assert.equal(result.review.events.length,2);
    assert.deepEqual(result.review.events.map(e=>[e.previousDate,e.date]),[
      ['2020-04-23','2020-04-24'],['2022-03-30','2022-03-31']]);
    const expected=structuredClone(raw.points);expected[4].nav=spec.verified;
    assert.deepEqual(result.fund.points,expected);
    assert.notEqual(result.fund,raw);assert.notEqual(result.fund.points,raw.points);
    assert.deepEqual({...result.fund,points:raw.points,warnings:raw.warnings},raw);
    assert.deepEqual(raw,original);
    assert.equal(qualityBlocked(raw),true);assert.equal(qualityBlocked(result.fund),false);
    assert.ok(!result.fund.warnings.includes(BOI_DISCONTINUITY));
    assert.ok(result.fund.warnings.some(w=>/economic.*returns.*retained/i.test(w)));
  });

  test(`${spec.code}: retains the investment loss, recovery gain, ordinary return and drawdown`,()=>{
    const result=financialNavBasis(boiFixture(spec));
    close(absoluteReturn(result.fund.points.slice(0,2)),spec.loss);
    close(absoluteReturn(result.fund.points.slice(3,5)),spec.recovery);
    close(absoluteReturn(result.fund.points.slice(4,6)),spec.afterRecovery);
    close(absoluteReturn(result.fund.points),spec.total);
    assert.ok(drawdownStats(result.fund.points).maxDrawdown < -.5);
    assert.ok(result.fund.points[4].nav/result.fund.points[3].nav > 2.2);
  });

  test(`${spec.code}: accepts an exact source correction without replacing any NAV`,()=>{
    const raw=boiFixture(spec);raw.points[4].nav=spec.verified;
    const original=structuredClone(raw),result=financialNavBasis(raw);
    assert.ok(result.review);
    assert.equal(result.review.correction.applied,false);
    assert.equal(result.review.correction.sourceNav,spec.verified);
    assert.equal(result.review.correction.verifiedNav,spec.verified);
    assert.deepEqual(result.fund.points,raw.points);
    assert.equal(qualityBlocked(result.fund),false);
    assert.deepEqual(raw,original);
    const repeated=financialNavBasis(result.fund);
    assert.equal(repeated.fund,result.fund,'downstream analysis does not apply the correction again');
    assert.deepEqual(repeated.fund.points,original.points);
  });

  test(`${spec.code}: preserves operational warnings and permits ordinary appended observations`,()=>{
    const raw=boiFixture(spec);
    raw.warnings.push('Using the shared history after a failed source refresh.');
    raw.points.push({date:'2022-04-05',nav:spec.navs[5]*1.001});
    const result=financialNavBasis(raw);
    assert.ok(result.review);
    assert.ok(result.fund.warnings.includes('Using the shared history after a failed source refresh.'));
    assert.deepEqual(result.fund.points.at(-1),raw.points.at(-1));
  });

  test(`${spec.code}: rejects crossed identities, distribution options, type and category changes`,()=>{
    const other=BOI_CASES.find(item=>item.code!==spec.code)!;
    const changes:Partial<FundMeta>[]=[
      {schemeCode:other.code},{schemeCode:999999},{schemeName:`BANK OF INDIA CREDIT RISK FUND - ${other.plan} Plan - Growth`},
      {schemeName:boiFixture(spec).meta.schemeName+' IDCW'},{schemeName:' '+boiFixture(spec).meta.schemeName},
      {fundHouse:'Other Mutual Fund'},{isinGrowth:other.isin},{isinGrowth:null},{isinGrowth:undefined},
      {isinDivReinvestment:'INF000000000'},{schemeType:'Closed Ended Schemes'},{schemeCategory:'Debt Scheme - Liquid Fund'},
    ];
    for(const change of changes){const raw=boiFixture(spec);Object.assign(raw.meta,change);rejected(raw,JSON.stringify(change));}
  });

  test(`${spec.code}: requires every exact event value and rejects unknown source revisions`,()=>{
    for(const index of [0,1,3,4,5]){
      const raw=boiFixture(spec);raw.points[index].nav+=0.00001;
      rejected(raw,`unknown value at ${raw.points[index].date}`);
    }
  });

  test(`${spec.code}: requires exact dates and consecutive observation boundaries`,()=>{
    for(const index of [0,1,3,4,5]){
      const missing=boiFixture(spec);missing.points.splice(index,1);rejected(missing,`missing anchor ${index}`);
      const shifted=boiFixture(spec);
      shifted.points[index].date=new Date(Date.parse(shifted.points[index].date)+86400000).toISOString().slice(0,10);
      rejected(shifted,`shifted anchor ${index}`);
    }
    const inserted=boiFixture(spec);inserted.points.splice(5,0,{date:'2022-04-01',nav:spec.verified});
    rejected(inserted,'unexpected intervening observation');
  });

  test(`${spec.code}: rejects invalid rows, non-unique dates and unsorted input`,()=>{
    for(const nav of [0,-1,NaN,Infinity]){const raw=boiFixture(spec);raw.points[2].nav=nav;rejected(raw,`invalid NAV ${nav}`);}
    for(const date of ['2020-02-30','2020-4-27','not-a-date']){
      const raw=boiFixture(spec);raw.points[2].date=date;rejected(raw,`invalid date ${date}`);
    }
    const duplicate=boiFixture(spec);duplicate.points.splice(2,0,{...duplicate.points[1]});rejected(duplicate,'duplicate');
    const unsorted=boiFixture(spec);unsorted.points.reverse();rejected(unsorted,'unsorted');
  });

  test(`${spec.code}: any extra jump blocks the entire correction and preserves its warning`,()=>{
    const appended=boiFixture(spec);appended.points.push({date:'2022-04-05',nav:spec.navs[5]*3});
    rejected(appended,'additional later jump');
    const earlier=boiFixture(spec);earlier.points.unshift({date:'2020-04-22',nav:1});
    rejected(earlier,'additional earlier jump');
    const middle=boiFixture(spec);middle.points[2].nav=100;
    rejected(middle,'additional middle jumps');
  });

  test(`${spec.code}: malformed/count-mismatched warnings and independent blockers fail closed`,()=>{
    const variants=[[],[BOI_DISCONTINUITY.replace(': 2 ',': 1 ')],[BOI_DISCONTINUITY,BOI_DISCONTINUITY],
      [BOI_DISCONTINUITY.replace('single-observation','single observation')],
      [BOI_DISCONTINUITY,'Unresolved discontinuity: independent evidence is outstanding.'],
      [BOI_DISCONTINUITY,'Invalid NAV observations were excluded (1); derived analytics are blocked until the data is resolved.'],
      [BOI_DISCONTINUITY,'Conflicting NAV values occur on 1 duplicate date(s); analytics are blocked.']];
    for(const warnings of variants){const raw=boiFixture(spec);raw.warnings=warnings;rejected(raw,JSON.stringify(warnings));}
  });
}

test('unrelated fund with the same economic-shaped curve is never exempted',()=>{
  const raw=boiFixture();raw.meta.schemeCode=106873;raw.meta.schemeName='Other Regular Plan Growth';
  rejected(raw,'no generic ratio, date or name matching');
});
