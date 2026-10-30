#!/usr/bin/env node
// Offline historical replay. Inputs are immutable checkpoint-256 archive files; no network requests.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

if (!process.argv[2] || !process.argv[3]) throw new Error('Usage: node REPLAY.mjs ARCHIVE_DIR OUTPUT_JSON [REPOSITORY_ROOT]');
const archive = resolve(process.argv[2]), output = resolve(process.argv[3]);
const repo = resolve(process.argv[4] ?? resolve(dirname(fileURLToPath(import.meta.url)), '../..'));
if (output === archive || output.startsWith(archive + '/')) throw new Error('Output must be outside the immutable input archive.');
const sha = bytes => createHash('sha256').update(typeof bytes === 'string' || Buffer.isBuffer(bytes) ? bytes : JSON.stringify(bytes)).digest('hex');
const moduleAt = path => import(pathToFileURL(resolve(repo, path)).href);
const SOURCE_HASHES = {
  "scripts/active-repair-scope.ts": "1fb23e52bd92f1e7fff701307e9ebe165c7988fcd015ed97ce284dca2e9cc172",
  "scripts/archive-model.ts": "8252e6d6c2bc82ab342a3e5a94960b9f5a55af5ca7cc466981b011bfbe101025",
  "server/types.ts": "7189e930a30909641d72b920d5bdfa0af4b1a38f0a5ddb1478022cc580ad97d6",
  "server/validation.ts": "1d8b58231e21e6e3161b61bbb410f0406d5f784af063b06054832bc357484854",
  "src/lib/storage.ts": "c5642d7c744fed709b1777e9f7b7e82387fc2f0d5ad61a795b467a2cfcb7dccd",
  "src/lib/provenance.ts": "e475895e7534e74e02b62691a96ad49932b50eaef95f9316d7e840de131cb876",
  "src/lib/types.ts": "a6fdfe8d7e001d1b11d602c81417702b8a7b230da10fbf2ac94132d42d61bbd1",
  "src/lib/corporate-actions.ts": "41e7575981db77d5f58bf529e847805a6dc64efa6d1181eec61836bcdbb1ef59",
  "src/lib/verified-nav-reviews.ts": "1bb2effd7f249cf2a46fc805002632eb09a256408abca550f3e07612aa1f1843",
  "src/lib/verified-sbi-infrastructure-history.ts": "057f0e32358adafb6df28d63950e46d41bdbb42c008c9071c70802e83b6fedad",
  "src/lib/analytics.ts": "98a93fb1002362cc705ee721b5db160574fc2aedef1ded0a0571d046dfacdebd",
  "src/lib/format.ts": "975122113ac307b08775a0202c52855269de249c47c4a90506de7f226992874e",
  "src/lib/amfi-open-ended-roster.ts": "31441bcb846eebdc75cda52c51ace505a2f731732408ebe6b4c6748d24c5489c",
  "src/lib/nav-quality-evidence.ts": "861bdd6633b58c23496eae7f5d1e5d8a24f384cb1dd387e1f2624115d60b59cc",
  "src/lib/fund-sort.ts": "af0f42bc34111f9ff6d21a9fd0a7d87dc009ffc1d2b801973a19f66c320f4db2"
};
for (const [path, expected] of Object.entries(SOURCE_HASHES)) {
  assert.equal(sha(readFileSync(resolve(repo, path))), expected, 'Production source pin: ' + path);
}
const { validateCatalogue, validateHistoryShard } = await moduleAt('scripts/archive-model.ts');
const { isActiveRepairCandidate, REPAIR_ROSTER_DATE } = await moduleAt('scripts/active-repair-scope.ts');
const { normalizeNavRecords } = await moduleAt('src/lib/storage.ts');
const { financialNavBasis } = await moduleAt('src/lib/corporate-actions.ts');
const { qualityBlocked } = await moduleAt('src/lib/format.ts');
const { isGrowthScheme } = await moduleAt('src/lib/analytics.ts');
const { localFundReturns, archivedFundReturns } = await moduleAt('src/lib/fund-sort.ts');
const approved = [102010,102011,120558,120794,133973,134427,135721,139838,140024,140504,140517,140913,141768,144475];
const excluded = [102007,102008,102013,120777];
const asOfDate = '2026-10-30', asOf = Date.parse(asOfDate + 'T00:00:00Z');
const replayedAt = new Date().toISOString();
const manifestBytes = readFileSync(resolve(archive, 'manifest.json'));
assert.equal(sha(manifestBytes), '0cea4ec864490977b8914f4b50293f98f82c3327f9a3c1951a1aa1a28ab38bd2');
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.sequence, 256);
const refs = [];
function readRef(ref) {
  const bytes = readFileSync(resolve(archive, basename(ref.path)));
  assert.equal(sha(bytes), ref.sha256); assert.equal(bytes.length, ref.bytes);
  const expanded = gunzipSync(bytes); assert.equal(expanded.length, ref.expandedBytes);
  refs.push({ path: ref.path, sha256: ref.sha256, bytes: ref.bytes, expandedBytes: ref.expandedBytes });
  return JSON.parse(expanded);
}
const catalogue = validateCatalogue(readRef(manifest.catalogue));
const entries = new Map(catalogue.entries.map(entry => [entry.schemeCode, entry]));
const records = new Map(), shardRefs = new Map();
for (const bucket of new Set([...approved, ...excluded].map(code => String(Math.floor(code / 32))))) {
  const ref = manifest.shards[bucket]; assert.ok(ref);
  const raw = readRef(ref), original = sha(raw);
  const shard = validateHistoryShard(raw, bucket);
  for (const doc of shard.records) { records.set(doc.schemeCode, doc); shardRefs.set(doc.schemeCode, ref); }
  assert.equal(sha(raw), original, 'Validator must not mutate a source shard');
}
function largeMoves(points) {
  const result = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], ratio = b.nav / a.nav;
    if (ratio > 1.4 + 1e-12 || ratio < 0.6 - 1e-12) result.push({ beforeDate: a.date, beforeNav: a.nav, afterDate: b.date, afterNav: b.nav, ratio });
  }
  return result;
}
const rows = [];
for (const code of [...approved, ...excluded]) {
  const doc = records.get(code), entry = entries.get(code); assert.ok(doc); assert.ok(entry);
  assert.equal(isActiveRepairCandidate(entry, asOf), true, 'Historical strict active scope: ' + code);
  const normalized = normalizeNavRecords(doc.payload.data, 'mfapi', true), m = doc.payload.meta;
  const fund = { meta: { schemeCode: code, schemeName: m.scheme_name, fundHouse: m.fund_house,
    schemeType: m.scheme_type, schemeCategory: m.scheme_category, isinGrowth: m.isin_growth, isinDivReinvestment: m.isin_div_reinvestment },
    points: normalized.points, fetchedAt: doc.fetchedAt, sourceObservedAt: doc.archivedAt,
    source: 'mfapi.in', fromCache: true, stale: false, warnings: [...new Set([...doc.warnings, ...normalized.warnings])] };
  const docHash = sha(doc), fundHash = sha(fund), basis = financialNavBasis(fund), included = approved.includes(code);
  assert.equal(basis.adjusted, included); assert.equal(sha(doc), docHash); assert.equal(sha(fund), fundHash);
  assert.equal(isGrowthScheme(fund.meta.schemeName), false); assert.equal(isGrowthScheme(entry.schemeName), false);
  assert.equal(qualityBlocked(fund), true);
  const rawMoves = largeMoves(fund.points), remainingMoves = largeMoves(basis.fund.points);
  assert.equal(rawMoves.length, 1); assert.equal(remainingMoves.length, included ? 0 : 1);
  assert.equal(qualityBlocked(basis.fund), !included); assert.equal(basis.fund.points.length, fund.points.length);
  const rankings = localFundReturns(basis.fund);
  for (const key of ['oneYear', 'threeYear', 'fiveYear', 'threeYearMaxDrawdown']) assert.equal(rankings[key], null);
  assert.equal(archivedFundReturns(doc), null);
  let normalizedRows = 0;
  if (included) {
    assert.equal(basis.adjustment.factor, 0.1);
    assert.equal(basis.adjustment.oldNavThrough, '2026-06-19'); assert.equal(basis.adjustment.firstNewNavDate, '2026-06-20');
    for (let i = 0; i < fund.points.length; i++) {
      const raw = fund.points[i], calculated = basis.fund.points[i];
      assert.equal(calculated.date, raw.date);
      const old = raw.date <= '2026-06-19';
      // Division is an independent arithmetic expression of the issuer's 1000 -> 100 denomination.
      const expected = old ? raw.nav / 10 : raw.nav;
      assert.ok(Math.abs(calculated.nav - expected) < 1e-9);
      if (old) normalizedRows++;
    }
    assert.equal(financialNavBasis(basis.fund).adjusted, false, 'Never normalize the same copy twice');
  } else assert.equal(basis.fund, fund);
  rows.push({ schemeCode: code, name: m.scheme_name, included, catalogue: entry,
    activeRepairEligible: true, observationCount: fund.points.length, coverageStart: doc.coverageStart, coverageEnd: doc.coverageEnd,
    savedHistoryBehindCatalogue: doc.coverageEnd < entry.latestDate, rawUnresolved: doc.unresolved,
    rawWarnings: fund.warnings, rawMoves, calculationWarnings: basis.fund.warnings, remainingMoves,
    calculationQualityPass: !qualityBlocked(basis.fund), adjustment: basis.adjustment ?? null, normalizedRows,
    rawDocumentSha256: docHash, rawFundSha256: fundHash, calculationPointsSha256: sha(basis.fund.points),
    rawInputUnchanged: true, literalGrowthEligible: false, distributionAdjustedTotalReturnEstablished: false,
    consumerRanking: rankings, archivedRanking: null, shard: shardRefs.get(code) });
}
const result = { version: 1, replayedAt, historicalEligibilitySnapshot: true, asOfDate,
  evaluatedOnActualScopeDate: replayedAt.slice(0, 10) === asOfDate, repositoryBase: 'a951c2f33b623d23bb38badd192c041ef6529942',
  productionSourceSha256: SOURCE_HASHES, checkpoint: manifest.sequence, checkpointAt: manifest.checkpointAt,
  manifestSha256: sha(manifestBytes), artifactId: 13008571816,
  artifactZipSha256: 'c0720aa4212ba3efe41c4336fcb37f837fe73c5037d0c9ac0fdc47d554a671a1',
  catalogueFetchedAt: catalogue.fetchedAt, catalogueMembership: catalogue.membership, officialRosterDate: REPAIR_ROSTER_DATE,
  approvedCodes: approved, excludedCodes: excluded, verifiedReferences: refs,
  counts: { approvedHistories: approved.length, approvedObservations: rows.filter(r => r.included).reduce((n, r) => n + r.observationCount, 0),
    excludedHistories: excluded.length, excludedObservations: rows.filter(r => !r.included).reduce((n, r) => n + r.observationCount, 0),
    newlyContinuousCalculationCopies: rows.filter(r => r.included && r.calculationQualityPass).length,
    rawArchiveFlagsCleared: 0, consumerReturnEligibilityAdded: 0 }, rows };
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ checkpoint: result.checkpoint, ...result.counts, output }));
