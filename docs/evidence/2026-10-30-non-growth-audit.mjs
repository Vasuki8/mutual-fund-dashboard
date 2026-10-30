#!/usr/bin/env node
/** Read-only, network-free replay of immutable checkpoint 255. Run from audit-work.
 * node non-growth-audit.mjs ARCHIVE_DIRECTORY OUTPUT_DIRECTORY REPOSITORY_ROOT
 * Historical eligibility snapshot: 2026-10-30 UTC. Replay later does not select a current repair queue.
 * No production files, archive bytes, warning state, or source inputs are written.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
const root=resolve(process.argv[2]??'');
const out=resolve(process.argv[3]??'');
const repoRoot=resolve(process.argv[4]??process.cwd());
if(!process.argv[2]||!process.argv[3])throw new Error('Specify immutable extracted archive directory and a separate explicit output directory.');
if(out===root||out.startsWith(root+'/'))throw new Error('Output directory must not be the immutable archive or a descendant.');
const moduleAt=(path       )=>import(pathToFileURL(resolve(repoRoot,path)).href);
const {isActiveRepairCandidate,REPAIR_ROSTER_DATE}=await moduleAt('scripts/active-repair-scope.ts');
const {validateCatalogue,validateHistoryShard,isQualityWarning}=await moduleAt('scripts/archive-model.ts');
const {normalizeNavRecords}=await moduleAt('src/lib/storage.ts');
const {financialNavBasis}=await moduleAt('src/lib/corporate-actions.ts');
const {isGrowthScheme,cagr,absoluteReturn,drawdownStats,trailingReturn}=await moduleAt('src/lib/analytics.ts');
const {qualityBlocked}=await moduleAt('src/lib/format.ts');
const asOfDate='2026-10-30',asOf=Date.parse(asOfDate+'T00:00:00Z');
// Always replay the explicitly labelled historical date, even on a later runner day.
const replayedAt=new Date().toISOString();
const sha=(x    )=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const manifestBytes=readFileSync(resolve(root,'manifest.json'));
if(sha(manifestBytes)!=='b95a30a2bdfc90f0f47d5f76f7364b41b025215cda6f00b70954891eebab6054')throw new Error('pinned manifest SHA256 mismatch');
const manifest=JSON.parse(manifestBytes.toString());
if(manifest.sequence!==255)throw new Error('checkpoint mismatch');
const refs      =[], rows      =[], allEligible      =[], seen=new Set        ();
function readRef(ref    ,label       ){
 const file=resolve(root,basename(ref.path)),bytes=readFileSync(file);
 if(bytes.length!==ref.bytes||sha(bytes)!==ref.sha256)throw new Error('compressed hash/length mismatch '+label);
 const expanded=gunzipSync(bytes);
 if(expanded.length!==ref.expandedBytes)throw new Error('expanded length mismatch '+label);
 refs.push({label,path:ref.path,sha256:ref.sha256,bytes:bytes.length,expandedBytes:expanded.length});
 return JSON.parse(expanded.toString());
}
const catalogue=validateCatalogue(readRef(manifest.catalogue,'catalogue'));
const eligible=new Map(catalogue.entries.filter(e=>isActiveRepairCandidate(e,asOf)).map(e=>[e.schemeCode,e]));
const counts    ={catalogue:catalogue.entries.length,eligible:eligible.size,excluded:catalogue.entries.length-eligible.size,saved:0,rawFlagged:0,rawFlaggedFullArchive:0};
function moves(points      ){const r      =[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],ratio=b.nav/a.nav;if(ratio>1.4+1e-12||ratio<0.6-1e-12)r.push({beforeDate:a.date,beforeNav:a.nav,afterDate:b.date,afterNav:b.nav,ratio,changePercent:(ratio-1)*100,gapDays:(Date.parse(b.date)-Date.parse(a.date))/86400000});}return r;}
function classify(name       ,category       ){return isGrowthScheme(name)?'literalGrowth':/\b(?:idcw|dividend)\b|income\s+distribution|capital\s+withdrawal/i.test(name)?'distribution':/\betf\b|exchange\s+traded/i.test(name+' '+category)?'ETF':'otherNonGrowth';}
function qualityGroup(w         ){const inv=w.some(v=>/^(?:Invalid NAV|Conflicting NAV)/i.test(v)),jump=w.some(v=>/^Unresolved discontinuity/i.test(v));return inv&&jump?'both':inv?'invalidOnly':jump?'discontinuityOnly':'other';}
for(const [bucket,ref] of Object.entries(manifest.shards)){
 const raw=readRef(ref,'history-'+bucket);
 const original=sha(raw);
 const shard=validateHistoryShard(raw,bucket);
 for(const doc of shard.records){
  if(seen.has(doc.schemeCode))throw new Error('duplicate global scheme code');seen.add(doc.schemeCode);
  if(doc.unresolved||doc.warnings.some(isQualityWarning))counts.rawFlaggedFullArchive++;
  const entry=eligible.get(doc.schemeCode); if(!entry)continue;
  counts.saved++;
  const normalized=normalizeNavRecords(doc.payload.data,'mfapi',true);
  const warnings=[...new Set([...doc.warnings,...normalized.warnings])];
  const flagged=doc.unresolved||warnings.some(isQualityWarning);
  allEligible.push({schemeCode:doc.schemeCode,name:entry.schemeName,rawFlagged:flagged,latestDate:entry.latestDate,coverageEnd:doc.coverageEnd,historyBehindCatalogue:doc.coverageEnd<entry.latestDate ,observations:doc.payload.data.length,cohort:classify(doc.payload.meta.scheme_name,doc.payload.meta.scheme_category)});
  if(!flagged)continue;
  counts.rawFlagged++;
  const meta=doc.payload.meta;
  const fund    ={meta:{schemeCode:doc.schemeCode,schemeName:meta.scheme_name,isinGrowth:meta.isin_growth,isinDivReinvestment:meta.isin_div_reinvestment,fundHouse:meta.fund_house,schemeType:meta.scheme_type,schemeCategory:meta.scheme_category},points:normalized.points,fetchedAt:doc.fetchedAt,sourceObservedAt:doc.archivedAt,source:'mfapi.in',fromCache:false,stale:false,warnings,...(doc.rejectedZeroNavDates?{rejectedZeroNavDates:doc.rejectedZeroNavDates}:{})};
  const docHash=sha(doc),fundHash=sha(fund);
  const basis=financialNavBasis(fund);
  if(sha(doc)!==docHash||sha(fund)!==fundHash)throw new Error('production replay mutated input '+doc.schemeCode);
  const rawMoves=moves(fund.points),remainingMoves=moves(basis.fund.points);
  const unexplainedMoves=remainingMoves.filter(m=>!basis.review?.events.some(e=>e.previousDate===m.beforeDate&&e.date===m.afterDate));
  const blocked=qualityBlocked(basis.fund);
  const adjustments=basis.adjustments??(basis.adjustment?[basis.adjustment]:[]);
  const cohort=classify(meta.scheme_name,meta.scheme_category);
  const numeric=blocked||cohort!=='literalGrowth'?null:{absoluteReturn:absoluteReturn(basis.fund.points),cagr:cagr(basis.fund.points),oneYear:trailingReturn(basis.fund.points,1),threeYear:trailingReturn(basis.fund.points,3),fiveYear:trailingReturn(basis.fund.points,5),drawdown:drawdownStats(basis.fund.points)};
  rows.push({schemeCode:doc.schemeCode,name:meta.scheme_name,catalogueName:entry.schemeName,cohort,literalGrowthEligible:isGrowthScheme(meta.scheme_name),catalogueLiteralGrowth:isGrowthScheme(entry.schemeName),fundHouse:meta.fund_house,category:meta.scheme_category,isinGrowth:meta.isin_growth??null,isinDivReinvestment:meta.isin_div_reinvestment??null,latestDate:entry.latestDate,catalogueNav:entry.nav,coverageStart:doc.coverageStart,coverageEnd:doc.coverageEnd,historyBehindCatalogue:doc.coverageEnd<entry.latestDate ,observations:fund.points.length,rawUnresolved:doc.unresolved,rawWarnings:warnings,qualityGroup:qualityGroup(warnings),rejectedZeroNavDates:doc.rejectedZeroNavDates??null,rawMoves,rawMoveCount:rawMoves.length,calculationBasis:basis.review?'existingVerifiedReview':basis.adjusted?'existingUnitAdjustment':'unchanged',adjustments,review:basis.review??null,remainingWarnings:basis.fund.warnings,remainingMoves,remainingMoveCount:remainingMoves.length,unexplainedMoves,unexplainedMoveCount:unexplainedMoves.length,qualityBlocked:blocked,calculationPassesQualityGate:!blocked,literalGrowthCalculationEligible:!blocked&&cohort==='literalGrowth',distributionAdjustedTotalReturnEstablished:false,diagnosticNavOnlyMetrics:numeric,rawInputUnchanged:true,rawDocumentSha256:docHash,rawFundSha256:fundHash,calculationPointsSha256:sha(basis.fund.points),calculationPointsChanged:!isDeepStrictEqual(fund.points,basis.fund.points),calculationObservations:basis.fund.points.length,shardPath:(ref       ).path,shardSha256:(ref       ).sha256});
 }
 if(sha(raw)!==original)throw new Error('shard mutation');
 if(refs.length%250===0)console.log(JSON.stringify({verifiedRefs:refs.length,eligibleSaved:counts.saved,eligibleFlagged:counts.rawFlagged}));
}
rows.sort((a,b)=>a.schemeCode-b.schemeCode); allEligible.sort((a,b)=>a.schemeCode-b.schemeCode);
const missing=[...eligible.values()].filter(e=>!seen.has(e.schemeCode)).map(e=>({schemeCode:e.schemeCode,name:e.schemeName,latestDate:e.latestDate}));
function tally(data      ,field       ){const g    ={};for(const r of data){const k=String(r[field]);g[k]=(g[k]??0)+1;}return g;}
const byCohort    ={};for(const cohort of ['literalGrowth','distribution','ETF','otherNonGrowth']){const set=rows.filter(r=>r.cohort===cohort);byCohort[cohort]={rawFlagged:set.length,quality:tally(set,'qualityGroup'),basis:tally(set,'calculationBasis'),qualityBlocked:set.filter(r=>r.qualityBlocked).length,passesQualityGate:set.filter(r=>!r.qualityBlocked).length,unexplainedJumps:set.filter(r=>r.unexplainedMoveCount).length,remainingJumpCount:set.reduce((s,r)=>s+r.remainingMoveCount,0),invalidOrConflictWarning:set.filter(r=>r.remainingWarnings.some((w       )=>/^(Invalid NAV|Conflicting NAV)/i.test(w))).length,rejectedZeroEvidence:set.filter(r=>r.rejectedZeroNavDates).length,rawObservations:set.reduce((s,r)=>s+r.observations,0),codes:set.map(r=>r.schemeCode)};}
const nonGrowth=rows.filter(r=>r.cohort!=='literalGrowth');
const grouped    ={};for(const r of nonGrowth.filter(r=>r.qualityBlocked)){const key=[r.fundHouse,r.cohort,r.qualityGroup].join(' | ');const g=grouped[key]??={fundHouse:r.fundHouse,cohort:r.cohort,qualityGroup:r.qualityGroup,count:0,codes:[],jumpEvents:0};g.count++;g.codes.push(r.schemeCode);g.jumpEvents+=r.remainingMoveCount;}
const sourceTree={"commit":"55ff6ad03be436189cd77dd9f627c5f756032d8b","files":[{"path":"scripts/active-repair-scope.ts","sha":"434f6bcc8f49876666326fcd37255dd3c992b2ed","size":1495},{"path":"scripts/archive-model.ts","sha":"c0faaa0e095780df5f343a60dee3a578a0b25f86","size":15462},{"path":"server/types.ts","sha":"d981b816982e1ba1d5e9b0b923a4dbc481780fd4","size":3111},{"path":"server/validation.ts","sha":"7d2d328ede38361af7a0a20a6a0c173f75777f83","size":16113},{"path":"src/lib/amfi-open-ended-roster.ts","sha":"1cceee82eec48d9fd26b48268f9b1b9648912b90","size":74226},{"path":"src/lib/analytics.ts","sha":"9b7fddbf0e7d698bafd22e80fa73a3cbde0ee4dd","size":19297},{"path":"src/lib/corporate-actions.ts","sha":"6a263a5cf18ad1023ae373564435e4d1e9fc1c77","size":66083},{"path":"src/lib/format.ts","sha":"5da2d0c61dce2b5246a0a6e48a0aeaf6eb0c32a1","size":3260},{"path":"src/lib/nav-quality-evidence.ts","sha":"cc128c5a6e429fae10d11a33189fb1cbdecdddf6","size":1316},{"path":"src/lib/provenance.ts","sha":"961307b652f98eb992e2f8799a4b6dc48b6a9736","size":1924},{"path":"src/lib/storage.ts","sha":"4ae6f86a5f63608dfefb655bfcf4b94f50418ba9","size":31819},{"path":"src/lib/types.ts","sha":"ac9e0b5eaf60bb29daf5fe1e94978d0e7094da7e","size":1378},{"path":"src/lib/verified-nav-reviews.ts","sha":"acbc3196eb7d3cc11437f5d3edf1f2d6fafa0c81","size":22099},{"path":"src/lib/verified-sbi-infrastructure-history.ts","sha":"75f8f6d068e1b3d590c58dba685ec076e40dc851","size":10444}]};
const sources=['scripts/active-repair-scope.ts','scripts/archive-model.ts','server/types.ts','server/validation.ts','src/lib/storage.ts','src/lib/provenance.ts','src/lib/types.ts','src/lib/corporate-actions.ts','src/lib/verified-nav-reviews.ts','src/lib/verified-sbi-infrastructure-history.ts','src/lib/analytics.ts','src/lib/format.ts','src/lib/amfi-open-ended-roster.ts','src/lib/nav-quality-evidence.ts'].map(path=>{
 const bytes=readFileSync(resolve(repoRoot,path));
 const gitBlobSha1=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
 const pinned=sourceTree.files.find((f    )=>f.path===path);
 if(!pinned||pinned.sha!==gitBlobSha1||sourceTree.commit!=='55ff6ad03be436189cd77dd9f627c5f756032d8b')throw new Error('pinned source git blob mismatch '+path);
 return {path,sha256:sha(bytes),gitBlobSha1,bytes:bytes.length,verifiedPinnedGitBlob:true};
});
const summary={version:1,auditType:'read-only offline full-history replay',historicalEligibilitySnapshot:true,replayedAt,asOfDate,asOfUtc:asOfDate+'T00:00:00Z',repository:'Vasuki8/mutual-fund-dashboard',sourceCommit:'55ff6ad03be436189cd77dd9f627c5f756032d8b',artifact:{runId:41088053495,artifactId:12993856840,zipSha256:'2e276f02939f78f79c23db3304448dd73a23e3c97680cd7fa4984e005fc4720a'},checkpoint:manifest.sequence,checkpointAt:manifest.checkpointAt,generatedAt:manifest.generatedAt,manifestSha256:sha(manifestBytes),catalogueFetchedAt:catalogue.fetchedAt,catalogueMembership:catalogue.membership,officialRosterDate:REPAIR_ROSTER_DATE,scope:'exact production isActiveRepairCandidate; finite positive NAV; official code roster; current catalogue; 2026-09-30 through 2026-10-30 inclusive; full saved histories',counts:{...counts,missingEligibleSavedHistory:missing.length,eligibleClean:counts.saved-counts.rawFlagged,nonGrowthFlagged:nonGrowth.length},byCohort,eligibleCoverage:{behindCatalogue:allEligible.filter(r=>r.historyBehindCatalogue).length,cohorts:tally(allEligible,'cohort')},inputChecks:{catalogueAndAll1615HistoryRefsVerified:refs.length===1616,refsVerified:refs.length,compressedBytesVerified:refs.reduce((s,r)=>s+r.bytes,0),expandedBytesVerified:refs.reduce((s,r)=>s+r.expandedBytes,0),productionValidateHistoryShardPassedAll:true,allSavedRawDatesUniqueFinitePositive:true,allRawInputUnchangedAfterReplay:true,globalSavedIdentities:seen.size},unresolvedNonGrowthGroups:Object.values(grouped).sort((a    ,b    )=>b.count-a.count),missingEligibleHistories:missing,sourceFiles:sources,limitations:['The artifact contains already-normalized retained valid observations. Invalid/zero source rows previously rejected cannot be reconstructed when dated rejection evidence is absent.','Quality gate success for a distribution history does not establish distribution-adjusted total return. Diagnostic NAV-only financial metrics are suppressed for every non-Growth cohort.','No new issuer/exchange evidence has been fetched, no source-quality warnings resolved, and no unit adjustment is proposed by this audit.','The official roster and catalogue determine repair scope; recent NAV is not purchase eligibility.','Full-archive counts remain separate from eligible active repair counts.']};
mkdirSync(out,{recursive:true});
writeFileSync(resolve(out,'cohort-summary.json'),JSON.stringify(summary,null,2)+'\n');
writeFileSync(resolve(out,'cohort-rows.json'),JSON.stringify(rows,null,2)+'\n');
writeFileSync(resolve(out,'eligible-coverage.json'),JSON.stringify(allEligible,null,2)+'\n');
writeFileSync(resolve(out,'verified-inputs.json'),JSON.stringify(refs,null,2)+'\n');
const columns=['schemeCode','name','cohort','fundHouse','category','isinGrowth','isinDivReinvestment','latestDate','coverageStart','coverageEnd','observations','qualityGroup','rawMoveCount','calculationBasis','qualityBlocked','literalGrowthCalculationEligible','remainingMoveCount','rawInputUnchanged','shardSha256'];
const esc=(v    )=>'"'+String(v??'').replaceAll('"','""')+'"';
writeFileSync(resolve(out,'cohort-rows.csv'),columns.join(',')+'\n'+rows.map(r=>columns.map(k=>esc(r[k])).join(',')).join('\n')+'\n');
console.log(JSON.stringify({counts:summary.counts,byCohort,files:['cohort-summary.json','cohort-rows.json','cohort-rows.csv','eligible-coverage.json','verified-inputs.json']},null,2));
