#!/usr/bin/env node
// Offline replay of all 56 distribution histories selected at checkpoint 268.
// Usage: node REPLAY.mjs ARCHIVE_DIRECTORY OUTPUT_JSON [REPOSITORY_ROOT]
// Requires Node with native TypeScript support. No network requests are made.
// Production sources pinned after the implementation owner signaled ready.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename, dirname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

assert.ok(process.argv[2] && process.argv[3], 'Usage: node REPLAY.mjs ARCHIVE_DIRECTORY OUTPUT_JSON [REPOSITORY_ROOT]');
const scriptPath = fileURLToPath(import.meta.url);
const archive = resolve(process.argv[2]);
const output = resolve(process.argv[3]);
const repo = resolve(process.argv[4] ?? resolve(dirname(scriptPath), '../..'));
assert.ok(output !== archive && !output.startsWith(archive + sep), 'Output must not overwrite the immutable input archive');
const sourceLedgerPath = resolve(repo, 'docs/evidence/2026-10-31-distribution-nav-sources.json');
assert.ok(output !== sourceLedgerPath && output !== scriptPath);
const sha = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const moduleAt = path => import(pathToFileURL(resolve(repo, path)).href);
const DAY_MS = 86400000;
const MANIFEST_SHA256 = 'd91fddfc92fb514d1e7b5050ccc9b5aca9a4b05fac0af7b9652e9ecd68da1190';
const SOURCE_LEDGER_SHA256 = '4757d415dd812ec5e91900fc842bb178769cf617b0807f70c28516b320f7079d';
const SOURCE_HASHES = {
  'scripts/active-repair-scope.ts': '1fb23e52bd92f1e7fff701307e9ebe165c7988fcd015ed97ce284dca2e9cc172',
  'scripts/archive-model.ts': '8252e6d6c2bc82ab342a3e5a94960b9f5a55af5ca7cc466981b011bfbe101025',
  'server/types.ts': '7189e930a30909641d72b920d5bdfa0af4b1a38f0a5ddb1478022cc580ad97d6',
  'server/validation.ts': '1d8b58231e21e6e3161b61bbb410f0406d5f784af063b06054832bc357484854',
  'src/lib/storage.ts': 'c5642d7c744fed709b1777e9f7b7e82387fc2f0d5ad61a795b467a2cfcb7dccd',
  'src/lib/provenance.ts': 'e475895e7534e74e02b62691a96ad49932b50eaef95f9316d7e840de131cb876',
  'src/lib/types.ts': 'a6fdfe8d7e001d1b11d602c81417702b8a7b230da10fbf2ac94132d42d61bbd1',
  'src/lib/corporate-actions.ts': 'f20a32cb87c7a7c4c416e72bad940532eebb241d969732fdf33528b4fca20a4e',
  'src/lib/verified-nav-reviews.ts': '884053210dbabfabfca70d452c71becd4cc6d0dc8a2c1d2bfdc183d3596cff3e',
  'src/lib/verified-sbi-infrastructure-history.ts': '057f0e32358adafb6df28d63950e46d41bdbb42c008c9071c70802e83b6fedad',
  'src/lib/analytics.ts': '98a93fb1002362cc705ee721b5db160574fc2aedef1ded0a0571d046dfacdebd',
  'src/lib/format.ts': '975122113ac307b08775a0202c52855269de249c47c4a90506de7f226992874e',
  'src/lib/amfi-open-ended-roster.ts': '31441bcb846eebdc75cda52c51ace505a2f731732408ebe6b4c6748d24c5489c',
  'src/lib/nav-quality-evidence.ts': '861bdd6633b58c23496eae7f5d1e5d8a24f384cb1dd387e1f2624115d60b59cc',
  'src/lib/fund-sort.ts': 'af0f42bc34111f9ff6d21a9fd0a7d87dc009ffc1d2b801973a19f66c320f4db2',
};
function verifyProductionSources() {
  assert.equal(Object.keys(SOURCE_HASHES).length, 15);
  for (const [path, expectedHash] of Object.entries(SOURCE_HASHES)) {
    assert.match(expectedHash ?? '', /^[0-9a-f]{64}$/, 'Production-ready source hash must be pinned: ' + path);
    assert.equal(sha(readFileSync(resolve(repo, path))), expectedHash, 'Pinned production source: ' + path);
    assert.notEqual(output, resolve(repo, path));
  }
}
verifyProductionSources();
const ledgerBytes = readFileSync(sourceLedgerPath);
assert.equal(sha(ledgerBytes), SOURCE_LEDGER_SHA256, 'Immutable combined source ledger');
const evidence = JSON.parse(ledgerBytes);
assert.equal(evidence.archiveManifest.sha256, MANIFEST_SHA256);
const selected = evidence.rows.map(row => row.schemeCode);
assert.equal(new Set(selected).size, 56);
assert.deepEqual(selected, [...selected].sort((a, b) => a - b));
const expectations = new Map(evidence.rows.map(row => [row.schemeCode, row]));
const frozenScopeDate = '2026-10-31';
const frozenScopeEvaluatedAt = '2026-10-31T02:11:39.297Z';
const frozenScopeMs = Date.parse(frozenScopeEvaluatedAt);
const replayStartedAt = new Date().toISOString();

const { validateCatalogue, validateHistoryShard } = await moduleAt('scripts/archive-model.ts');
const { isActiveRepairCandidate, REPAIR_ROSTER_DATE } = await moduleAt('scripts/active-repair-scope.ts');
const { normalizeNavRecords } = await moduleAt('src/lib/storage.ts');
const { financialNavBasis } = await moduleAt('src/lib/corporate-actions.ts');
const { navReviewSummary } = await moduleAt('src/lib/verified-nav-reviews.ts');
const { qualityBlocked } = await moduleAt('src/lib/format.ts');
const { isGrowthScheme } = await moduleAt('src/lib/analytics.ts');
const { localFundReturns, archivedFundReturns } = await moduleAt('src/lib/fund-sort.ts');

const manifestBytes = readFileSync(resolve(archive, 'manifest.json'));
assert.equal(sha(manifestBytes), MANIFEST_SHA256);
assert.equal(manifestBytes.length, evidence.archiveManifest.bytes);
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.sequence, 268);
assert.equal(manifest.checkpointAt, '2026-10-31T02:05:36.558Z');
assert.equal(manifest.catalogueFetchedAt, '2026-10-30T19:58:19.963Z');
const pinnedRefs = new Map(evidence.archiveAssets.map(ref => [ref.path, ref]));
assert.equal(pinnedRefs.size, 31);
const verifiedRefs = [];
function readRef(ref) {
  assert.deepEqual(ref, pinnedRefs.get(ref.path), 'Pinned archive asset reference: ' + ref.path);
  const bytes = readFileSync(resolve(archive, basename(ref.path)));
  assert.equal(sha(bytes), ref.sha256, 'Original compressed bytes: ' + ref.path);
  assert.equal(bytes.length, ref.bytes);
  const expanded = gunzipSync(bytes);
  assert.equal(expanded.length, ref.expandedBytes);
  verifiedRefs.push({ ...ref });
  return JSON.parse(expanded);
}
const rawCatalogue = readRef(manifest.catalogue), rawCatalogueHash = sha(rawCatalogue);
const catalogue = validateCatalogue(rawCatalogue);
assert.equal(sha(rawCatalogue), rawCatalogueHash, 'Catalogue validator preserves its input');
assert.equal(catalogue.fetchedAt, manifest.catalogueFetchedAt);
assert.deepEqual(catalogue.membership, {
  source: 'mf-list', verifiedAt: '2026-10-30T19:58:19.963Z',
  listedSchemes: 38026, bulkNavSchemes: 38026, missingBulkNav: 0,
});
assert.equal(REPAIR_ROSTER_DATE, '2026-10-26');
const entries = new Map(catalogue.entries.map(entry => [entry.schemeCode, entry]));
const records = new Map(), shardRefs = new Map();
const buckets = [...new Set(selected.map(code => String(Math.floor(code / 32))))].sort((a, b) => Number(a) - Number(b));
assert.equal(buckets.length, 30);
for (const bucket of buckets) {
  const ref = manifest.shards[bucket];
  assert.ok(ref, 'Selected history shard exists: ' + bucket);
  const raw = readRef(ref), rawHash = sha(raw);
  const shard = validateHistoryShard(raw, bucket);
  assert.equal(sha(raw), rawHash, 'History validator preserves its input: ' + bucket);
  for (const doc of shard.records) { records.set(doc.schemeCode, doc); shardRefs.set(doc.schemeCode, ref); }
}
assert.equal(verifiedRefs.length, 31);
assert.equal(new Set(verifiedRefs.map(ref => ref.path)).size, 31);

const isoDate = date => date.slice(6, 10) + '-' + date.slice(3, 5) + '-' + date.slice(0, 2);
const daysBetween = (before, after) => (Date.parse(after + 'T00:00:00Z') - Date.parse(before + 'T00:00:00Z')) / DAY_MS;
const moveWarning = count => `Unresolved discontinuity: ${count} single-observation move(s) exceed 40%; derived analytics are blocked.`;
function inspectSeries(points) {
  const moves = [], gaps = [];
  let maxGapDays = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], ratio = b.nav / a.nav, gapDays = daysBetween(a.date, b.date);
    assert.ok(Number.isSafeInteger(gapDays) && gapDays > 0, 'Strictly increasing retained dates');
    maxGapDays = Math.max(maxGapDays, gapDays);
    if (ratio > 1.4 + 1e-12 || ratio < 0.6 - 1e-12)
      moves.push({ beforeDate: a.date, beforeNav: a.nav, afterDate: b.date, afterNav: b.nav, ratio, gapCalendarDays: gapDays });
    if (gapDays > 1) gaps.push([a.date, b.date, gapDays]);
  }
  return { moves, gaps, maxGapDays };
}
// Independent arithmetic uses the original NAV string. The factor determines
// how many digits move across the decimal point; no source Number is multiplied.
function shiftedDecimal(source, factor) {
  assert.match(source, /^\d+(?:\.\d+)?$/);
  assert.ok(factor === 10 || factor === 100);
  const places = factor === 10 ? 1 : 2;
  const [whole, fraction = ''] = source.split('.');
  const digits = fraction.padEnd(places, '0');
  return whole + digits.slice(0, places) + (digits.length > places ? '.' + digits.slice(places) : '');
}
const nonCalculationFields = ({ points, warnings, ...rest }) => rest;
const rows = [];
for (const code of selected) {
  const expected = expectations.get(code), doc = records.get(code), entry = entries.get(code);
  assert.ok(doc); assert.ok(entry);
  assert.equal(isActiveRepairCandidate(entry, frozenScopeMs), true, 'Frozen strict active scope: ' + code);
  assert.deepEqual(entry, expected.currentCatalogue);
  const docHash = sha(doc), rawDataHash = sha(doc.payload.data), meta = doc.payload.meta;
  assert.equal(docHash, expected.archiveSource.canonicalDocumentSha256);
  assert.equal(rawDataHash, expected.archiveSource.sourceObservationsSha256);
  assert.deepEqual(meta, expected.exactStoredMetadata);
  assert.equal(meta.scheme_code, code);
  for (const [sourceKey, catalogueKey] of [['scheme_name', 'schemeName'], ['isin_growth', 'isinGrowth'], ['isin_div_reinvestment', 'isinDivReinvestment']]) {
    assert.ok(Object.hasOwn(meta, sourceKey), 'Identity field must be explicitly present: ' + code + '/' + sourceKey);
    assert.equal(meta[sourceKey], entry[catalogueKey], 'Exact catalogue identity: ' + code + '/' + catalogueKey);
  }
  const normalized = normalizeNavRecords(doc.payload.data, 'mfapi', true);
  assert.equal(normalized.points.length, doc.payload.data.length);
  assert.equal(normalized.points.length, expected.observationCount);
  const sourceNavs = new Map(doc.payload.data.map(point => [isoDate(point.date), point.nav]));
  assert.equal(sourceNavs.size, normalized.points.length);
  const fund = {
    meta: { schemeCode: code, schemeName: meta.scheme_name, fundHouse: meta.fund_house,
      schemeType: meta.scheme_type, schemeCategory: meta.scheme_category,
      isinGrowth: meta.isin_growth, isinDivReinvestment: meta.isin_div_reinvestment },
    points: normalized.points, fetchedAt: doc.fetchedAt, sourceObservedAt: doc.archivedAt,
    source: 'mfapi.in', fromCache: true, stale: false,
    warnings: [...new Set([...doc.warnings, ...normalized.warnings])],
    ...(doc.rejectedZeroNavDates ? { rejectedZeroNavDates: doc.rejectedZeroNavDates } : {}),
  };
  for (const [key,value] of Object.entries(expected.requiredIdentityMatch)) assert.equal(fund.meta[key], value);
  assert.equal(fund.points[0].date, doc.coverageStart);
  assert.equal(fund.points.at(-1).date, doc.coverageEnd);
  assert.equal(doc.unresolved, true); assert.equal(qualityBlocked(fund), true);
  assert.equal(isGrowthScheme(fund.meta.schemeName), false); assert.equal(isGrowthScheme(entry.schemeName), false);
  const fundHash = sha(fund), rawPointsHash = sha(fund.points), rawInspection = inspectSeries(fund.points);
  assert.equal(rawInspection.moves.length, expected.rawMoves.length);
  assert.deepEqual(doc.warnings, [moveWarning(rawInspection.moves.length)]);
  assert.deepEqual(doc.warnings, expected.rawWarnings);
  assert.deepEqual(normalized.warnings, doc.warnings); assert.deepEqual(fund.warnings, doc.warnings);
  assert.equal(doc.rejectedZeroNavDates, undefined); assert.equal(normalized.rejectedZeroNavDates, undefined);
  assert.equal(sha(rawInspection.gaps), expected.retainedGapSummary.allGapTuplesSha256);
  assert.equal(rawInspection.gaps.length, expected.retainedGapSummary.allGapsAboveOneCalendarDay);
  assert.equal(rawInspection.maxGapDays, expected.retainedGapSummary.maxCalendarDays);
  for (const [i,move] of rawInspection.moves.entries()) {
    const pinned = expected.rawMoves[i];
    assert.equal(move.beforeDate, pinned.beforeDate); assert.equal(move.afterDate, pinned.afterDate);
    assert.equal(sourceNavs.get(move.beforeDate), pinned.beforeSourceNav);
    assert.equal(sourceNavs.get(move.afterDate), pinned.afterSourceNav);
    assert.equal(move.gapCalendarDays, pinned.gapCalendarDays);
  }
  const basis = financialNavBasis(fund), approved = expected.disposition !== 'excluded';
  assert.equal(qualityBlocked(basis.fund), !approved);
  assert.equal(basis.fund.points.length, fund.points.length);
  assert.deepEqual(nonCalculationFields(basis.fund), nonCalculationFields(fund));
  const calculationInspection = inspectSeries(basis.fund.points);
  assert.deepEqual(calculationInspection.gaps, rawInspection.gaps, 'Every retained calendar gap survives: ' + code);
  let unitScaledRows = 0, correctedRows = 0, unchangedRows = 0, maxIndependentNavError = 0;
  const changedDates = [];
  for (let i = 0; i < fund.points.length; i++) {
    const raw = fund.points[i], calculated = basis.fund.points[i], sourceNav = sourceNavs.get(raw.date);
    assert.equal(raw.nav, Number(sourceNav)); assert.equal(calculated.date, raw.date);
    if (expected.unitAction && raw.date <= expected.unitAction.oldNavThrough) {
      const independent = Number(shiftedDecimal(sourceNav, expected.unitAction.factor));
      const difference = Math.abs(calculated.nav - independent);
      assert.ok(difference < 1e-9, 'Independent source-decimal unit arithmetic: ' + code + '/' + raw.date);
      maxIndependentNavError = Math.max(maxIndependentNavError, difference); unitScaledRows++;
    } else if (expected.sourceCorrection && raw.date === expected.sourceCorrection.date) {
      assert.equal(sourceNav, expected.sourceCorrection.sourceNav);
      assert.equal(calculated.nav, Number(expected.sourceCorrection.verifiedNav));
      assert.notEqual(calculated.nav, raw.nav);
      correctedRows++; changedDates.push(raw.date);
    } else {
      assert.equal(calculated.nav, raw.nav, 'Every other retained NAV remains exact: ' + code + '/' + raw.date);
      unchangedRows++;
    }
    if (expected.unitAction) assert.ok(raw.date <= expected.unitAction.oldNavThrough || raw.date >= expected.unitAction.firstNewNavDate);
  }
  if (expected.unitAction) {
    const action = expected.unitAction;
    assert.equal(expected.disposition, 'unit-conversion'); assert.equal(basis.adjusted, true);
    assert.equal(basis.review, undefined); assert.equal(basis.adjustments, undefined); assert.ok(basis.adjustment);
    for (const key of ['schemeCode','oldNavThrough','firstNewNavDate','factor','evidenceUrl']) assert.equal(basis.adjustment[key], action[key]);
    assert.equal(rawInspection.moves.length, 1); assert.equal(calculationInspection.moves.length, 0);
    assert.equal(rawInspection.moves[0].beforeDate, action.oldNavThrough);
    assert.equal(rawInspection.moves[0].afterDate, action.firstNewNavDate);
    assert.ok(Math.abs(rawInspection.moves[0].ratio - action.factor) <= action.maxFactorDeviation);
    assert.deepEqual(basis.fund.warnings, []);
    assert.ok(unitScaledRows > 0 && unchangedRows > 0); assert.equal(correctedRows, 0);
  } else if (expected.sourceCorrection) {
    const correction = expected.sourceCorrection;
    assert.equal(expected.disposition, 'source-correction'); assert.equal(basis.adjusted, false);
    assert.equal(basis.adjustment, undefined); assert.equal(basis.adjustments, undefined);
    assert.ok(basis.review?.correction); assert.equal(basis.review.schemeCode, code);
    assert.deepEqual(basis.review.events, []); assert.equal(basis.review.corrections, undefined);
    assert.deepEqual(basis.review.correction, {
      date: correction.date, sourceNav: Number(correction.sourceNav), verifiedNav: Number(correction.verifiedNav),
      applied: true, evidenceUrl: correction.evidenceUrl,
    });
    const index = fund.points.findIndex(point => point.date === correction.date);
    assert.ok(index > 0 && index + 1 < fund.points.length);
    for (const [at,anchor] of [[index-1,correction.expectedPrevious],[index+1,correction.expectedNext]]) {
      assert.equal(fund.points[at].date, anchor.date); assert.equal(sourceNavs.get(anchor.date), anchor.nav);
    }
    assert.equal(rawInspection.moves.length, 2); assert.equal(calculationInspection.moves.length, 0);
    assert.equal(correctedRows, 1); assert.equal(unitScaledRows, 0);
    assert.deepEqual(changedDates, [correction.date]);
    assert.deepEqual(basis.fund.warnings, [navReviewSummary(basis.review)]);
  } else {
    assert.equal(expected.disposition, 'excluded'); assert.equal(basis.adjusted, false);
    assert.equal(basis.fund, fund, 'Excluded identity retains the original object: ' + code);
    assert.equal(basis.review, undefined); assert.equal(basis.adjustment, undefined); assert.equal(basis.adjustments, undefined);
    assert.deepEqual(calculationInspection.moves, rawInspection.moves);
    assert.deepEqual(basis.fund.warnings, doc.warnings); assert.equal(sha(basis.fund.points), rawPointsHash);
    assert.equal(unchangedRows, fund.points.length);
  }
  const repeat = financialNavBasis(basis.fund);
  assert.equal(repeat.adjusted, false); assert.equal(repeat.review, undefined);
  assert.equal(repeat.fund, basis.fund, 'Repeat unit adjustment or source correction is refused: ' + code);
  const rankings = localFundReturns(basis.fund), rawRankings = localFundReturns(fund);
  for (const key of ['oneYear','threeYear','fiveYear','threeYearMaxDrawdown']) {
    assert.equal(rankings[key], null, 'Distribution local consumer exclusion: ' + code + '/' + key);
    assert.equal(rawRankings[key], null);
  }
  assert.equal(archivedFundReturns(doc), null);
  // Also prove that the archive consumer's distribution filter remains in force
  // independently of its raw unresolved flag, without editing the source record.
  assert.equal(archivedFundReturns({ ...doc, unresolved: false }), null);
  assert.equal(sha(doc), docHash); assert.equal(sha(doc.payload.data), rawDataHash); assert.equal(sha(fund), fundHash);
  const boundaryDates = expected.unitAction ? [expected.unitAction.oldNavThrough, expected.unitAction.firstNewNavDate]
    : expected.sourceCorrection ? [expected.sourceCorrection.expectedPrevious.date, expected.sourceCorrection.date, expected.sourceCorrection.expectedNext.date] : [];
  const boundaryPoints = boundaryDates.map(date => {
    const index = fund.points.findIndex(point => point.date === date);
    assert.ok(index >= 0);
    return { date, sourceNav: sourceNavs.get(date), rawNav: fund.points[index].nav, calculationNav: basis.fund.points[index].nav };
  });
  rows.push({
    schemeCode: code, disposition: expected.disposition, approved, meta: fund.meta, catalogue: entry,
    frozenActiveRepairEligible: true, observationCount: fund.points.length,
    coverageStart: doc.coverageStart, coverageEnd: doc.coverageEnd,
    fetchedAt: doc.fetchedAt, sourceObservedAt: doc.archivedAt, savedHistoryBehindCatalogue: doc.coverageEnd < entry.latestDate,
    rawUnresolved: doc.unresolved, rawDocumentWarnings: doc.warnings, rawWarnings: fund.warnings,
    rawRejectedZeroNavDates: doc.rejectedZeroNavDates ?? null,
    rawMoves: rawInspection.moves, calculationWarnings: basis.fund.warnings, remainingMoves: calculationInspection.moves,
    calculationQualityPass: !qualityBlocked(basis.fund),
    expectedUnitAction: expected.unitAction, expectedSourceCorrection: expected.sourceCorrection,
    adjustment: basis.adjustment ?? null, review: basis.review ?? null,
    unitScaledRows, correctedRows, unchangedRows, changedCorrectionDates: changedDates, maxIndependentNavError, boundaryPoints,
    retainedCalendarGaps: rawInspection.gaps, maxRetainedGapCalendarDays: rawInspection.maxGapDays,
    retainedGapsOver30CalendarDays: rawInspection.gaps.filter(gap => gap[2] > 30),
    rawDocumentSha256: docHash, rawSourceObservationsSha256: rawDataHash,
    selectionRawFundSha256: expected.archiveSource.rawFundSha256, replayRawFundSha256: fundHash,
    rawPointsSha256: rawPointsHash, calculationPointsSha256: sha(basis.fund.points),
    rawInputUnchanged: true, rawArchiveUnresolvedPreserved: true,
    repeatUnitAdjustmentRefused: expected.unitAction ? true : null,
    repeatSourceCorrectionRefused: expected.sourceCorrection ? true : null,
    excludedIdentityUnchanged: approved ? null : true,
    literalGrowthEligible: false, sourceHistoryCompletenessEstablished: false,
    distributionAdjustedTotalReturnEstablished: false,
    rawConsumerRanking: rawRankings, consumerRanking: rankings, archivedRanking: null,
    archiveDistributionFilterIndependentlyVerified: true, shard: shardRefs.get(code),
  });
}
// The frozen selection is reproducible. Runtime eligibility is separately
// evaluated with the runner's actual UTC date and can change on a later replay.
const actualScopeEvaluatedAt = new Date().toISOString(), actualScopeDate = actualScopeEvaluatedAt.slice(0, 10);
for (const row of rows) {
  row.actualActiveRepairEligible = isActiveRepairCandidate(row.catalogue, Date.parse(actualScopeEvaluatedAt));
  row.actualLatestNavAgeDays = daysBetween(row.catalogue.latestDate, actualScopeDate);
}
const sum = (items, key) => items.reduce((total, row) => total + row[key], 0);
const units = rows.filter(row => row.disposition === 'unit-conversion');
const corrections = rows.filter(row => row.disposition === 'source-correction');
const approved = rows.filter(row => row.approved), excluded = rows.filter(row => !row.approved);
const counts = {
  screenedHistories: rows.length, screenedObservations: sum(rows, 'observationCount'),
  frozenEligibleHistories: rows.filter(row => row.frozenActiveRepairEligible).length,
  actualEligibleHistories: rows.filter(row => row.actualActiveRepairEligible).length,
  unitHistories: units.length, unitObservations: sum(units, 'observationCount'),
  sourceCorrectionHistories: corrections.length, sourceCorrectionObservations: sum(corrections, 'observationCount'),
  approvedHistories: approved.length, approvedObservations: sum(approved, 'observationCount'),
  excludedHistories: excluded.length, excludedObservations: sum(excluded, 'observationCount'),
  unitScaledObservations: sum(rows, 'unitScaledRows'), sourceCorrectedObservations: sum(rows, 'correctedRows'),
  unchangedCalculationObservations: sum(rows, 'unchangedRows'),
  rawLargeMoves: rows.reduce((total, row) => total + row.rawMoves.length, 0),
  remainingLargeMoves: rows.reduce((total, row) => total + row.remainingMoves.length, 0),
  newlyContinuousCalculationCopies: approved.filter(row => row.calculationQualityPass).length,
  excludedQualityBlockedHistories: excluded.filter(row => !row.calculationQualityPass).length,
  retainedCalendarGaps: rows.reduce((total, row) => total + row.retainedCalendarGaps.length, 0),
  historiesWithRetainedGapsOver30Days: rows.filter(row => row.retainedGapsOver30CalendarDays.length > 0).length,
  retainedGapsOver30Days: rows.reduce((total, row) => total + row.retainedGapsOver30CalendarDays.length, 0),
  rawArchiveUnresolvedFlagsPreserved: rows.filter(row => row.rawUnresolved).length,
  repeatUnitAdjustmentsRefused: units.filter(row => row.repeatUnitAdjustmentRefused).length,
  repeatSourceCorrectionsRefused: corrections.filter(row => row.repeatSourceCorrectionRefused).length,
  rawArchiveFlagsCleared: 0, consumerReturnEligibilityAdded: 0,
};
for (const [key,expected] of Object.entries(evidence.expectedCounts)) assert.equal(counts[key], expected, 'Full retained-history accounting: ' + key);
assert.equal(counts.frozenEligibleHistories, 56);
assert.equal(counts.newlyContinuousCalculationCopies, 36);
assert.equal(counts.excludedQualityBlockedHistories, 20);
assert.equal(counts.rawArchiveUnresolvedFlagsPreserved, 56);
assert.equal(counts.repeatUnitAdjustmentsRefused, 34); assert.equal(counts.repeatSourceCorrectionsRefused, 2);
assert.equal(counts.unitScaledObservations + counts.sourceCorrectedObservations + counts.unchangedCalculationObservations, counts.screenedObservations);

// Re-read bytes after evaluation; object immutability alone is insufficient.
assert.equal(sha(readFileSync(resolve(archive, 'manifest.json'))), MANIFEST_SHA256);
assert.equal(sha(readFileSync(sourceLedgerPath)), SOURCE_LEDGER_SHA256);
for (const ref of verifiedRefs) {
  const bytes = readFileSync(resolve(archive, basename(ref.path)));
  assert.equal(sha(bytes), ref.sha256); assert.equal(bytes.length, ref.bytes);
}
verifyProductionSources();
const result = {
  version: 1, replayStartedAt, replayedAt: new Date().toISOString(), offline: true,
  repositoryBase: '1ae8021083b4c3e3c6df6a61c500d13fafb6c4a8',
  frozenScopeDate, frozenScopeEvaluatedAt, actualScopeEvaluatedAt, actualScopeDate,
  frozenScopeDateMatchesRuntimeDate: actualScopeDate === frozenScopeDate,
  runtimeEligibilityIndependentlyEvaluated: true,
  replayScriptSha256: sha(readFileSync(scriptPath)), sourceLedgerSha256: SOURCE_LEDGER_SHA256,
  productionSourceSha256: SOURCE_HASHES, checkpoint: manifest.sequence, checkpointAt: manifest.checkpointAt,
  manifestGeneratedAt: manifest.generatedAt, manifestSha256: MANIFEST_SHA256,
  inputCapture: evidence.currentCapture, researchInputBundles: evidence.researchInputBundles,
  catalogueFetchedAt: catalogue.fetchedAt, catalogueMembership: catalogue.membership, officialRosterDate: REPAIR_ROSTER_DATE,
  pointArithmetic: 'Every retained NAV checked. Pre-event unit NAVs use an independent decimal-string shift by one or two places; absolute Number error <1e-9. A source correction changes exactly its one verified date; every other NAV is exactly equal.',
  gapTupleEncoding: '[previous retained ISO date, next retained ISO date, elapsed calendar days]; every adjacent gap above one calendar day is listed, including weekends and holidays. A calendar gap alone does not establish a missing expected publication.',
  hashSemantics: 'File hashes cover exact bytes. Object, observation and point hashes cover UTF-8 JSON.stringify(value). Retained gap hashes cover the same compact tuple encoding used by the independent Python evidence pass.',
  coverageLimit: 'All saved observations are replayed without filling gaps. This does not establish complete source history or reinvested distribution total return.',
  sourceEvidence: 'docs/evidence/2026-10-31-distribution-nav-sources.json',
  unitCodes: units.map(row => row.schemeCode), sourceCorrectionCodes: corrections.map(row => row.schemeCode), excludedCodes: excluded.map(row => row.schemeCode),
  verifiedReferences: verifiedRefs, verifiedAssetCount: verifiedRefs.length,
  inputAssetBytesUnchanged: true, productionSourceBytesUnchanged: true,
  maxIndependentNavError: Math.max(...rows.map(row => row.maxIndependentNavError)), counts, rows,
};
writeFileSync(output, JSON.stringify(result) + '\n');
console.log(JSON.stringify({ checkpoint: result.checkpoint, actualScopeEvaluatedAt, ...counts,
  maxIndependentNavError: result.maxIndependentNavError, output }));
