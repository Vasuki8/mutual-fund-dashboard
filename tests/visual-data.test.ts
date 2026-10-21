import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FundData } from '../src/lib/types.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import { rollingChartData } from '../src/lib/chart-data.ts';

const fixture:FundData={meta:{schemeCode:1,schemeName:'Test Direct Growth',fundHouse:'Test',schemeType:'Open Ended',schemeCategory:'Equity'},points:[{date:'2024-01-01',nav:100},{date:'2024-01-02',nav:101}],fetchedAt:'2024-01-02T12:00:00Z',source:'mfapi.in',fromCache:true,stale:true,warnings:[]};
test('a malformed refresh does not disable validated cached analytics',()=>{
  assert.equal(qualityBlocked({...fixture,warnings:['Refresh failed: MFAPI returned invalid JSON. Showing the saved history.']}),false);
  assert.equal(qualityBlocked({...fixture,warnings:['Refresh failed: Invalid MFAPI fund response. Showing the saved history.']}),false);
});
test('actual source quality problems continue to block derived metrics',()=>{
  for(const warning of ['Invalid NAV observations were excluded (1); derived analytics are blocked until the data is resolved.','Conflicting NAV values occur on 1 duplicate date(s); the lowest value is retained deterministically and analytics are blocked.','Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked.']) assert.equal(qualityBlocked({...fixture,warnings:[warning]}),true);
});
test('different rolling windows with the same endpoint retain both chart outcomes',()=>{
  const windows=[{start:'2023-01-05',end:'2024-01-05',value:.21},{start:'2023-01-06',end:'2024-01-05',value:.10}];
  const data=rollingChartData(windows);
  const visibleByDate=new Map(data.map(p=>[p.date,p.value]));
  assert.equal(visibleByDate.size,2);
  assert.deepEqual([...visibleByDate.values()],[.21,.10]);
  assert.deepEqual(data.map(p=>p.date),['2023-01-05','2023-01-06']);
  assert.equal(data[1].detail,'Window: 2023-01-06 to 2024-01-05');
});
