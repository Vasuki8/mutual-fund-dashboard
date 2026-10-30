#!/usr/bin/env node
// Portable offline replay of all 89 screened distribution histories in checkpoint 257.
// Primary identity/event review: docs/DISTRIBUTION_UNIT_BATCH_2026-10-30.md.
// This verifies retained observations, not complete source coverage or IDCW total returns.
// Usage: node REPLAY.mjs ARCHIVE_DIR OUTPUT_JSON [REPOSITORY_ROOT]
// Requires Node's TypeScript support. No network requests are made.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename, dirname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

if (!process.argv[2] || !process.argv[3]) throw new Error('Usage: node REPLAY.mjs ARCHIVE_DIR OUTPUT_JSON [REPOSITORY_ROOT]');
const archive = resolve(process.argv[2]), output = resolve(process.argv[3]);
const repo = resolve(process.argv[4] ?? resolve(dirname(fileURLToPath(import.meta.url)), '../..'));
if (output === archive || output.startsWith(archive + sep)) throw new Error('Output must be outside the immutable input archive.');
const sha = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const moduleAt = path => import(pathToFileURL(resolve(repo, path)).href);
const DAY_MS = 86_400_000;
const MANIFEST_SHA256 = '58e2a21009f582c2caefd1dd7ca6c6def0df934909a87d7409aa337e7e92581a';
const SOURCE_HASHES = {
  "scripts/active-repair-scope.ts": "1fb23e52bd92f1e7fff701307e9ebe165c7988fcd015ed97ce284dca2e9cc172",
  "scripts/archive-model.ts": "8252e6d6c2bc82ab342a3e5a94960b9f5a55af5ca7cc466981b011bfbe101025",
  "server/types.ts": "7189e930a30909641d72b920d5bdfa0af4b1a38f0a5ddb1478022cc580ad97d6",
  "server/validation.ts": "1d8b58231e21e6e3161b61bbb410f0406d5f784af063b06054832bc357484854",
  "src/lib/storage.ts": "c5642d7c744fed709b1777e9f7b7e82387fc2f0d5ad61a795b467a2cfcb7dccd",
  "src/lib/provenance.ts": "e475895e7534e74e02b62691a96ad49932b50eaef95f9316d7e840de131cb876",
  "src/lib/types.ts": "a6fdfe8d7e001d1b11d602c81417702b8a7b230da10fbf2ac94132d42d61bbd1",
  "src/lib/corporate-actions.ts": "b1e83f76468f42053e1a57b33548c275024c429eec8bfaff155a9565713460ef",
  "src/lib/verified-nav-reviews.ts": "1bb2effd7f249cf2a46fc805002632eb09a256408abca550f3e07612aa1f1843",
  "src/lib/verified-sbi-infrastructure-history.ts": "057f0e32358adafb6df28d63950e46d41bdbb42c008c9071c70802e83b6fedad",
  "src/lib/analytics.ts": "98a93fb1002362cc705ee721b5db160574fc2aedef1ded0a0571d046dfacdebd",
  "src/lib/format.ts": "975122113ac307b08775a0202c52855269de249c47c4a90506de7f226992874e",
  "src/lib/amfi-open-ended-roster.ts": "31441bcb846eebdc75cda52c51ace505a2f731732408ebe6b4c6748d24c5489c",
  "src/lib/nav-quality-evidence.ts": "861bdd6633b58c23496eae7f5d1e5d8a24f384cb1dd387e1f2624115d60b59cc",
  "src/lib/fund-sort.ts": "af0f42bc34111f9ff6d21a9fd0a7d87dc009ffc1d2b801973a19f66c320f4db2"
};
const ASSET_REFS = {
  "catalogue": {
    "path": "archive/catalogue-baa9c5ff7a7a99f277bcab9d26fa58def85caf2bf519bfa6795ebad7b73e531e.json.gz",
    "sha256": "baa9c5ff7a7a99f277bcab9d26fa58def85caf2bf519bfa6795ebad7b73e531e",
    "bytes": 636915,
    "expandedBytes": 7960106
  },
  "3136": {
    "path": "archive/history-3136-6d5d039d3cdd8da671f357cf12a09b81561e727e78c39e78f3c60f418f0a962c.json.gz",
    "sha256": "6d5d039d3cdd8da671f357cf12a09b81561e727e78c39e78f3c60f418f0a962c",
    "bytes": 649049,
    "expandedBytes": 4646036
  },
  "3151": {
    "path": "archive/history-3151-e35a6610af502c86e3e985d19bcd62917c9d0704293cc76776143639852dbc81.json.gz",
    "sha256": "e35a6610af502c86e3e985d19bcd62917c9d0704293cc76776143639852dbc81",
    "bytes": 546377,
    "expandedBytes": 4339376
  },
  "3161": {
    "path": "archive/history-3161-32514f72f0c1038dc7263b484c97bb4695d959358a00a4ec3bbdb63e5154ea00.json.gz",
    "sha256": "32514f72f0c1038dc7263b484c97bb4695d959358a00a4ec3bbdb63e5154ea00",
    "bytes": 244463,
    "expandedBytes": 1714888
  },
  "3164": {
    "path": "archive/history-3164-95fb4ba6dc1885909f9891ecb80f65137cc16d885255657b49f37e272564efdc.json.gz",
    "sha256": "95fb4ba6dc1885909f9891ecb80f65137cc16d885255657b49f37e272564efdc",
    "bytes": 173435,
    "expandedBytes": 1169348
  },
  "3183": {
    "path": "archive/history-3183-15497438e7a334cb1b394610e1e39d16453d2d572f00d0a58030bcd03f961594.json.gz",
    "sha256": "15497438e7a334cb1b394610e1e39d16453d2d572f00d0a58030bcd03f961594",
    "bytes": 428216,
    "expandedBytes": 2966677
  },
  "3201": {
    "path": "archive/history-3201-a7d6acc56408a764af690e6a48148df363ea6a0c68c7d1a04fc77c8bf8231db7.json.gz",
    "sha256": "a7d6acc56408a764af690e6a48148df363ea6a0c68c7d1a04fc77c8bf8231db7",
    "bytes": 352612,
    "expandedBytes": 2601630
  },
  "3211": {
    "path": "archive/history-3211-427a7a1b127f5bcaa56ad256995806350ea6534eb7d77681af435381bdf715c3.json.gz",
    "sha256": "427a7a1b127f5bcaa56ad256995806350ea6534eb7d77681af435381bdf715c3",
    "bytes": 239127,
    "expandedBytes": 1652511
  },
  "3214": {
    "path": "archive/history-3214-e126d37072e1a2df3c96a92fa247bb8700996af532d642116a09c87db61c9ad7.json.gz",
    "sha256": "e126d37072e1a2df3c96a92fa247bb8700996af532d642116a09c87db61c9ad7",
    "bytes": 245474,
    "expandedBytes": 1789157
  },
  "3220": {
    "path": "archive/history-3220-d8327e01757073ae2279be757a35259ab75f52db1a0f626b1cd61c6f41a63f5a.json.gz",
    "sha256": "d8327e01757073ae2279be757a35259ab75f52db1a0f626b1cd61c6f41a63f5a",
    "bytes": 245042,
    "expandedBytes": 1861204
  },
  "3221": {
    "path": "archive/history-3221-daed876bfd494d565710825aecc26af4aecc4b81c7f03eb639114fa78dda5775.json.gz",
    "sha256": "daed876bfd494d565710825aecc26af4aecc4b81c7f03eb639114fa78dda5775",
    "bytes": 167489,
    "expandedBytes": 1211968
  },
  "3224": {
    "path": "archive/history-3224-a2cc50c05586e022b0f7caf34658a855f3bc8fe79fc4ba857690b73eac12f4ca.json.gz",
    "sha256": "a2cc50c05586e022b0f7caf34658a855f3bc8fe79fc4ba857690b73eac12f4ca",
    "bytes": 518137,
    "expandedBytes": 3848960
  },
  "3265": {
    "path": "archive/history-3265-d5a83165afc61b5e09c3337d34e3ec5b3a957c959820d044d4a46f4f78eee333.json.gz",
    "sha256": "d5a83165afc61b5e09c3337d34e3ec5b3a957c959820d044d4a46f4f78eee333",
    "bytes": 319527,
    "expandedBytes": 2533600
  },
  "3269": {
    "path": "archive/history-3269-74c149ef553faa7487a80d265d6689f7b306cfd21badbcf443856889b0519971.json.gz",
    "sha256": "74c149ef553faa7487a80d265d6689f7b306cfd21badbcf443856889b0519971",
    "bytes": 125934,
    "expandedBytes": 953836
  },
  "3272": {
    "path": "archive/history-3272-12dbcef25b0e8f508c4d502a39c0a65b53fe947e737a0ff13cdd0ebb4a9efc9b.json.gz",
    "sha256": "12dbcef25b0e8f508c4d502a39c0a65b53fe947e737a0ff13cdd0ebb4a9efc9b",
    "bytes": 270134,
    "expandedBytes": 1858599
  },
  "3282": {
    "path": "archive/history-3282-637ad5c78144c19c9dfe6abab4665e76f445e857b070f30566339e262f26e5e7.json.gz",
    "sha256": "637ad5c78144c19c9dfe6abab4665e76f445e857b070f30566339e262f26e5e7",
    "bytes": 68671,
    "expandedBytes": 621158
  },
  "3287": {
    "path": "archive/history-3287-ef0f1767f82a06d491a5d8c9709d40fffb5f328c59dcf30a656aadb388b4cb4a.json.gz",
    "sha256": "ef0f1767f82a06d491a5d8c9709d40fffb5f328c59dcf30a656aadb388b4cb4a",
    "bytes": 274763,
    "expandedBytes": 2092052
  },
  "3316": {
    "path": "archive/history-3316-e0e7a8d351396a0d15d1f6c5025478090a59a9a461bc85a23eb919212ac0be8c.json.gz",
    "sha256": "e0e7a8d351396a0d15d1f6c5025478090a59a9a461bc85a23eb919212ac0be8c",
    "bytes": 182511,
    "expandedBytes": 1363619
  },
  "3317": {
    "path": "archive/history-3317-c2ffaeaf106fa94b4be1f4d06e384d4430b42824a4026d9082a8bbadf166c63b.json.gz",
    "sha256": "c2ffaeaf106fa94b4be1f4d06e384d4430b42824a4026d9082a8bbadf166c63b",
    "bytes": 308733,
    "expandedBytes": 2186136
  },
  "3318": {
    "path": "archive/history-3318-8e288306a7a0197097c1880758429d3c5cae2840e0308b4d0c664e728dd816bb.json.gz",
    "sha256": "8e288306a7a0197097c1880758429d3c5cae2840e0308b4d0c664e728dd816bb",
    "bytes": 186772,
    "expandedBytes": 1313212
  },
  "3319": {
    "path": "archive/history-3319-f4a0b07c0f6b7892d49c872bf2dadee2e34391f9174ee183f3d1eebc2126d33e.json.gz",
    "sha256": "f4a0b07c0f6b7892d49c872bf2dadee2e34391f9174ee183f3d1eebc2126d33e",
    "bytes": 492884,
    "expandedBytes": 3561723
  },
  "3358": {
    "path": "archive/history-3358-3e5e30203bccf05befe0222e656731c0659d6d9c745fd883bc420cf86ea6f513.json.gz",
    "sha256": "3e5e30203bccf05befe0222e656731c0659d6d9c745fd883bc420cf86ea6f513",
    "bytes": 170379,
    "expandedBytes": 1155235
  },
  "3503": {
    "path": "archive/history-3503-7fa2fba6fcae4945ca68aea1debb14a5dff3545ae108ef90fc66cf4d09b4ccfe.json.gz",
    "sha256": "7fa2fba6fcae4945ca68aea1debb14a5dff3545ae108ef90fc66cf4d09b4ccfe",
    "bytes": 376965,
    "expandedBytes": 2815879
  },
  "3510": {
    "path": "archive/history-3510-7114759faffa60cef4cc066f0f05435e48508d716164e954a231bfbd48a69cf8.json.gz",
    "sha256": "7114759faffa60cef4cc066f0f05435e48508d716164e954a231bfbd48a69cf8",
    "bytes": 369020,
    "expandedBytes": 2592002
  },
  "3529": {
    "path": "archive/history-3529-62432e4e2352490555c20c9ff808b75f40fb447fe7c6b69bfeb86b57a6248652.json.gz",
    "sha256": "62432e4e2352490555c20c9ff808b75f40fb447fe7c6b69bfeb86b57a6248652",
    "bytes": 348820,
    "expandedBytes": 2513230
  },
  "3536": {
    "path": "archive/history-3536-06ed781713df3438d3c6c116e150a25c843df720c14d92783a0bad5d1a5a63de.json.gz",
    "sha256": "06ed781713df3438d3c6c116e150a25c843df720c14d92783a0bad5d1a5a63de",
    "bytes": 162248,
    "expandedBytes": 1142909
  },
  "3542": {
    "path": "archive/history-3542-7821473590436ad5f6f8f039f14a1955838e08a8c34ca237e67cab9df6f4c384.json.gz",
    "sha256": "7821473590436ad5f6f8f039f14a1955838e08a8c34ca237e67cab9df6f4c384",
    "bytes": 134129,
    "expandedBytes": 1034183
  },
  "3573": {
    "path": "archive/history-3573-90683243b17cb98f84b73d21a1427f1465ac57aa301cd7c9083a7dec8425b497.json.gz",
    "sha256": "90683243b17cb98f84b73d21a1427f1465ac57aa301cd7c9083a7dec8425b497",
    "bytes": 120018,
    "expandedBytes": 882038
  },
  "3608": {
    "path": "archive/history-3608-e811c26a186b54fb8f0ade042dfafd9a7e4eec0da7416658f57d17ead053ef7f.json.gz",
    "sha256": "e811c26a186b54fb8f0ade042dfafd9a7e4eec0da7416658f57d17ead053ef7f",
    "bytes": 104306,
    "expandedBytes": 741762
  },
  "3609": {
    "path": "archive/history-3609-863f49dce896cb5b3ea1310af5e490894d781316bc903d83cba5ab1f76f50c78.json.gz",
    "sha256": "863f49dce896cb5b3ea1310af5e490894d781316bc903d83cba5ab1f76f50c78",
    "bytes": 134374,
    "expandedBytes": 1040742
  },
  "3627": {
    "path": "archive/history-3627-183a995241b554e44471accddd3dcc616cc315f5e24f21477daf93e1d598a005.json.gz",
    "sha256": "183a995241b554e44471accddd3dcc616cc315f5e24f21477daf93e1d598a005",
    "bytes": 66494,
    "expandedBytes": 533751
  },
  "3628": {
    "path": "archive/history-3628-7031fcb9ff349ce6ad9077334e7cf31afe87bd4b649df9c1cdc07ce451038420.json.gz",
    "sha256": "7031fcb9ff349ce6ad9077334e7cf31afe87bd4b649df9c1cdc07ce451038420",
    "bytes": 54141,
    "expandedBytes": 445235
  },
  "3640": {
    "path": "archive/history-3640-47f0318a47a9b95c1d7307e21023344b70aed7d13f99a4841a0eb11a27d4b7c9.json.gz",
    "sha256": "47f0318a47a9b95c1d7307e21023344b70aed7d13f99a4841a0eb11a27d4b7c9",
    "bytes": 103612,
    "expandedBytes": 802000
  },
  "3645": {
    "path": "archive/history-3645-376d74a27b7bcfba7bd80c45899447a62d28c04f2fdf6ca8b351daf0bc7a64b0.json.gz",
    "sha256": "376d74a27b7bcfba7bd80c45899447a62d28c04f2fdf6ca8b351daf0bc7a64b0",
    "bytes": 46444,
    "expandedBytes": 424068
  },
  "3686": {
    "path": "archive/history-3686-0b1a7b39268c9c1130d35a18b60871b0bc1b7ca9461665a755682323d5ac4acf.json.gz",
    "sha256": "0b1a7b39268c9c1130d35a18b60871b0bc1b7ca9461665a755682323d5ac4acf",
    "bytes": 251343,
    "expandedBytes": 1931993
  },
  "3763": {
    "path": "archive/history-3763-33d012756ca8bb5a959cc00af700b07886b8c127802ffbea0b9d9f7cd5cb8966.json.gz",
    "sha256": "33d012756ca8bb5a959cc00af700b07886b8c127802ffbea0b9d9f7cd5cb8966",
    "bytes": 440301,
    "expandedBytes": 3180436
  },
  "3765": {
    "path": "archive/history-3765-9a8c295ee830595168822d46e03efba49403e1dadcd9c415a46d677974d1d407.json.gz",
    "sha256": "9a8c295ee830595168822d46e03efba49403e1dadcd9c415a46d677974d1d407",
    "bytes": 601012,
    "expandedBytes": 4037879
  },
  "3766": {
    "path": "archive/history-3766-a01fec3b2b5436524e9eb85930677a1ffb89377415020a5943edf64c7fcfee21.json.gz",
    "sha256": "a01fec3b2b5436524e9eb85930677a1ffb89377415020a5943edf64c7fcfee21",
    "bytes": 528297,
    "expandedBytes": 3650116
  },
  "3767": {
    "path": "archive/history-3767-edac1b68d1f5514fd8ec5c2c13944f26cf1d98552035f96eb93078673a20bc1d.json.gz",
    "sha256": "edac1b68d1f5514fd8ec5c2c13944f26cf1d98552035f96eb93078673a20bc1d",
    "bytes": 449130,
    "expandedBytes": 3058214
  },
  "3836": {
    "path": "archive/history-3836-36a2448b2de8a8c9b798f986488681ea345cc175ccf250efaf45a2586471855e.json.gz",
    "sha256": "36a2448b2de8a8c9b798f986488681ea345cc175ccf250efaf45a2586471855e",
    "bytes": 52177,
    "expandedBytes": 428489
  },
  "4025": {
    "path": "archive/history-4025-cfe9e491c03f626948c0d20938abbc61d67d3a6e21edfc0cab8302b6c2f44c3f.json.gz",
    "sha256": "cfe9e491c03f626948c0d20938abbc61d67d3a6e21edfc0cab8302b6c2f44c3f",
    "bytes": 87013,
    "expandedBytes": 719120
  },
  "4173": {
    "path": "archive/history-4173-43778e69913f13a155af3b581506f8ee9636e6c2d9ca328a62b7a921fb86b056.json.gz",
    "sha256": "43778e69913f13a155af3b581506f8ee9636e6c2d9ca328a62b7a921fb86b056",
    "bytes": 142345,
    "expandedBytes": 1010052
  },
  "4183": {
    "path": "archive/history-4183-275cdd66ef3082d052aead82e9babb7dfeede914a28804f81e32ce64787e0fea.json.gz",
    "sha256": "275cdd66ef3082d052aead82e9babb7dfeede914a28804f81e32ce64787e0fea",
    "bytes": 217755,
    "expandedBytes": 1600430
  },
  "4206": {
    "path": "archive/history-4206-f02523e0a1556276cbd572a4559ad13d10c01bfa405c7dd1577229dbd5de0da4.json.gz",
    "sha256": "f02523e0a1556276cbd572a4559ad13d10c01bfa405c7dd1577229dbd5de0da4",
    "bytes": 202964,
    "expandedBytes": 1495593
  },
  "4365": {
    "path": "archive/history-4365-cfd6b6d3cef1e08f47ffe1e827aa2d0615c9379995b6ee794364fd26280d922e.json.gz",
    "sha256": "cfd6b6d3cef1e08f47ffe1e827aa2d0615c9379995b6ee794364fd26280d922e",
    "bytes": 114100,
    "expandedBytes": 855086
  },
  "4647": {
    "path": "archive/history-4647-763fd1f51f9b720b29fa96742a834fd1a7157fd68eeded245ed805bfe67a8ee6.json.gz",
    "sha256": "763fd1f51f9b720b29fa96742a834fd1a7157fd68eeded245ed805bfe67a8ee6",
    "bytes": 239679,
    "expandedBytes": 1704664
  },
  "4659": {
    "path": "archive/history-4659-37c4819b9e193d2da352dc684946c44712c0ddf4028bd2f6341936cdf1e1a737.json.gz",
    "sha256": "37c4819b9e193d2da352dc684946c44712c0ddf4028bd2f6341936cdf1e1a737",
    "bytes": 227875,
    "expandedBytes": 1546372
  },
  "4802": {
    "path": "archive/history-4802-d574c2b759a9241f34721f4573333af7cc6d5b2a305f60c7dbf221b9ba8daf19.json.gz",
    "sha256": "d574c2b759a9241f34721f4573333af7cc6d5b2a305f60c7dbf221b9ba8daf19",
    "bytes": 40341,
    "expandedBytes": 365611
  }
};
function verifyProductionSources() {
  assert.equal(Object.keys(SOURCE_HASHES).length, 15);
  for (const [path, expected] of Object.entries(SOURCE_HASHES)) {
    assert.equal(sha(readFileSync(resolve(repo, path))), expected, 'Production source pin: ' + path);
  }
}
verifyProductionSources();
const { validateCatalogue, validateHistoryShard } = await moduleAt('scripts/archive-model.ts');
const { isActiveRepairCandidate, REPAIR_ROSTER_DATE } = await moduleAt('scripts/active-repair-scope.ts');
const { normalizeNavRecords } = await moduleAt('src/lib/storage.ts');
const { financialNavBasis } = await moduleAt('src/lib/corporate-actions.ts');
const { qualityBlocked } = await moduleAt('src/lib/format.ts');
const { isGrowthScheme } = await moduleAt('src/lib/analytics.ts');
const { localFundReturns, archivedFundReturns } = await moduleAt('src/lib/fund-sort.ts');

const EVENT_GROUPS = [
  { id: 'invesco-2011', codes: [104484, 104725, 105025],
    oldNavThrough: '2011-02-25', firstNewNavDate: '2011-02-28',
    firstNewNavDateByCode: { 104484: '2011-02-27' }, factor: 100, maxFactorDeviation: 0.1,
    evidenceUrl: 'https://www.invescomutualfund.com/docs/default-source/Fact-Sheet/factsheet_october_2013.pdf?sfvrsn=2502afc2_0#page=5' },
  { id: 'invesco-2013', codes: [105190,105191,106171,106172,106179,107471,107472,107476,112125,114360,114361,114362,115515,116110,117973,120496,120499,120501,120506,120508,120509,120519,120521,120522,120542,120543,120544,120559,120562,120563],
    oldNavThrough: '2013-04-18', firstNewNavDate: '2013-04-22', factor: 100, maxFactorDeviation: 0.5,
    evidenceUrl: 'https://www.invescomutualfund.com/docs/default-source/Fact-Sheet/factsheet_may_2013.pdf?sfvrsn=0#page=5' },
  { id: 'nippon-2012', codes: [100838,100842,100843,100844,100852,100853,103050,103051],
    oldNavThrough: '2012-08-03', firstNewNavDate: '2012-08-05', factor: 100, maxFactorDeviation: 0.1,
    evidenceUrl: 'https://mf.nipponindiaim.com/InvestorServices/AnnualHalfYearlyReportsFY20122013/Half_Yearly_Portfolio_-_Financials_-_Oct-_2012_-_for_Website_upload.pdf#page=34' },
];
const approved = EVENT_GROUPS.flatMap(group => group.codes).sort((a, b) => a - b);
const excluded = [100375,100378,101163,101264,101864,102433,102753,102848,103052,103086,103197,104485,104489,104638,104722,104723,105024,105187,105192,106143,106236,112122,112340,112341,112937,113179,113346,115458,116075,116109,116488,116653,120443,120500,120530,120561,120567,122765,128820,133567,133866,134596,134598,134600,139680,148720,149096,153692];
const selected = [...approved, ...excluded].sort((a, b) => a - b);
assert.equal(approved.length, 41); assert.equal(excluded.length, 48); assert.equal(new Set(selected).size, 89);
const expectations = new Map(EVENT_GROUPS.flatMap(group => group.codes.map(code => [code, {
  group: group.id, schemeCode: code, oldNavThrough: group.oldNavThrough,
  firstNewNavDate: group.firstNewNavDateByCode?.[code] ?? group.firstNewNavDate,
  factor: group.factor, maxFactorDeviation: group.maxFactorDeviation, evidenceUrl: group.evidenceUrl,
}])));
const historicalScopeDate = '2026-10-30';
const historicalScopeMs = Date.parse(historicalScopeDate + 'T00:00:00Z');
const replayStartedAt = new Date().toISOString();
const manifestBytes = readFileSync(resolve(archive, 'manifest.json'));
assert.equal(sha(manifestBytes), MANIFEST_SHA256, 'Immutable checkpoint manifest');
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.sequence, 257);
assert.equal(manifest.checkpointAt, '2026-10-30T23:04:15.628Z');
assert.equal(manifest.catalogueFetchedAt, '2026-10-30T19:58:19.963Z');
const refs = [];
function readRef(ref, key) {
  assert.deepEqual(ref, ASSET_REFS[key], 'Pinned asset reference: ' + key);
  const bytes = readFileSync(resolve(archive, basename(ref.path)));
  assert.equal(sha(bytes), ref.sha256, 'Asset digest: ' + ref.path);
  assert.equal(bytes.length, ref.bytes, 'Compressed size: ' + ref.path);
  const expanded = gunzipSync(bytes);
  assert.equal(expanded.length, ref.expandedBytes, 'Expanded size: ' + ref.path);
  refs.push({ ...ref });
  return JSON.parse(expanded);
}
const rawCatalogue = readRef(manifest.catalogue, 'catalogue'), rawCatalogueHash = sha(rawCatalogue);
const catalogue = validateCatalogue(rawCatalogue);
assert.equal(sha(rawCatalogue), rawCatalogueHash, 'Catalogue validator preserves input');
assert.equal(catalogue.fetchedAt, manifest.catalogueFetchedAt);
assert.deepEqual(catalogue.membership, {
  source: 'mf-list', verifiedAt: '2026-10-30T19:58:19.963Z',
  listedSchemes: 38026, bulkNavSchemes: 38026, missingBulkNav: 0,
}, 'Independent current catalogue membership, distinct from latest NAV observation dates');
assert.equal(REPAIR_ROSTER_DATE, '2026-10-26');
const entries = new Map(catalogue.entries.map(entry => [entry.schemeCode, entry]));
const records = new Map(), shardRefs = new Map();
const buckets = [...new Set(selected.map(code => String(Math.floor(code / 32))))].sort((a, b) => Number(a) - Number(b));
assert.equal(buckets.length, 47);
assert.deepEqual(Object.keys(ASSET_REFS).sort(), ['catalogue', ...buckets].sort());
for (const bucket of buckets) {
  const ref = manifest.shards[bucket]; assert.ok(ref, 'Selected shard exists: ' + bucket);
  const raw = readRef(ref, bucket), originalHash = sha(raw);
  const shard = validateHistoryShard(raw, bucket);
  for (const doc of shard.records) { records.set(doc.schemeCode, doc); shardRefs.set(doc.schemeCode, ref); }
  assert.equal(sha(raw), originalHash, 'History validator preserves input: ' + bucket);
}
assert.equal(refs.length, 48);

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
    if (ratio > 1.4 + 1e-12 || ratio < 0.6 - 1e-12) {
      moves.push({ beforeDate: a.date, beforeNav: a.nav, afterDate: b.date, afterNav: b.nav, ratio, gapDays });
    }
    if (gapDays > 30) gaps.push({ beforeDate: a.date, afterDate: b.date, gapDays });
  }
  return { moves, gaps, maxGapDays };
}
// Independent decimal arithmetic: move the source string's decimal point two
// places. Do not multiply the normalized Number or reuse adjustment code.
function decimalTimes100(source) {
  assert.match(source, /^\d+(?:\.\d+)?$/);
  const [whole, fraction = ''] = source.split('.');
  const digits = fraction.padEnd(2, '0');
  return Number(whole + digits.slice(0, 2) + (digits.length > 2 ? '.' + digits.slice(2) : ''));
}
const rows = [];
for (const code of selected) {
  const doc = records.get(code), entry = entries.get(code), expected = expectations.get(code);
  assert.ok(doc, 'Retained document: ' + code); assert.ok(entry, 'Current catalogue identity: ' + code);
  assert.equal(isActiveRepairCandidate(entry, historicalScopeMs), true, 'Historical strict active scope: ' + code);
  const docHash = sha(doc), rawDataHash = sha(doc.payload.data), m = doc.payload.meta;
  assert.equal(m.scheme_code, code);
  for (const [sourceKey, catalogueKey] of [['scheme_name', 'schemeName'], ['isin_growth', 'isinGrowth'], ['isin_div_reinvestment', 'isinDivReinvestment']]) {
    assert.equal(m[sourceKey], entry[catalogueKey], 'Exact current identity field ' + catalogueKey + ': ' + code);
  }
  const normalized = normalizeNavRecords(doc.payload.data, 'mfapi', true);
  assert.equal(normalized.points.length, doc.payload.data.length, 'Every retained observation is replayed: ' + code);
  const sourceNavs = new Map(doc.payload.data.map(point => [isoDate(point.date), point.nav]));
  assert.equal(sourceNavs.size, normalized.points.length);
  const fund = { meta: { schemeCode: code, schemeName: m.scheme_name, fundHouse: m.fund_house,
    schemeType: m.scheme_type, schemeCategory: m.scheme_category, isinGrowth: m.isin_growth, isinDivReinvestment: m.isin_div_reinvestment },
    points: normalized.points, fetchedAt: doc.fetchedAt, sourceObservedAt: doc.archivedAt,
    source: 'mfapi.in', fromCache: true, stale: false, warnings: [...new Set([...doc.warnings, ...normalized.warnings])],
    ...(doc.rejectedZeroNavDates ? { rejectedZeroNavDates: doc.rejectedZeroNavDates } : {}) };
  assert.equal(fund.points[0].date, doc.coverageStart); assert.equal(fund.points.at(-1).date, doc.coverageEnd);
  assert.equal(doc.unresolved, true); assert.equal(qualityBlocked(fund), true);
  assert.equal(isGrowthScheme(fund.meta.schemeName), false); assert.equal(isGrowthScheme(entry.schemeName), false);
  const fundHash = sha(fund), rawPointsHash = sha(fund.points), rawInspection = inspectSeries(fund.points);
  assert.ok(rawInspection.moves.length > 0);
  assert.deepEqual(doc.warnings, [moveWarning(rawInspection.moves.length)], 'Pinned raw warning matches all retained moves: ' + code);
  assert.deepEqual(normalized.warnings, doc.warnings);
  assert.deepEqual(fund.warnings, doc.warnings);
  assert.equal(doc.rejectedZeroNavDates, undefined); assert.equal(normalized.rejectedZeroNavDates, undefined);
  const basis = financialNavBasis(fund), included = Boolean(expected);
  assert.equal(basis.adjusted, included, 'Only the exact approved identities adjust: ' + code);
  assert.equal(basis.review, undefined, 'No economic/source-correction review substituted for a unit action');
  assert.equal(qualityBlocked(basis.fund), !included);
  assert.equal(basis.fund.points.length, fund.points.length);
  assert.deepEqual(basis.fund.meta, fund.meta);
  for (const field of ['fetchedAt', 'sourceObservedAt', 'source', 'fromCache', 'stale']) assert.equal(basis.fund[field], fund[field]);
  const calculationInspection = inspectSeries(basis.fund.points);
  assert.deepEqual(calculationInspection.gaps, rawInspection.gaps, 'Retained gaps remain visible: ' + code);
  let normalizedRows = 0, unchangedRows = 0, maxIndependentNavError = 0;
  if (included) {
    assert.equal(rawInspection.moves.length, 1); assert.equal(calculationInspection.moves.length, 0);
    assert.equal(basis.adjustments, undefined);
    assert.ok(basis.adjustment);
    for (const key of ['schemeCode', 'oldNavThrough', 'firstNewNavDate', 'factor', 'evidenceUrl']) {
      assert.equal(basis.adjustment[key], expected[key], 'Exact approved action ' + key + ': ' + code);
    }
    const move = rawInspection.moves[0];
    assert.equal(move.beforeDate, expected.oldNavThrough); assert.equal(move.afterDate, expected.firstNewNavDate);
    assert.ok(Math.abs(move.ratio - expected.factor) <= expected.maxFactorDeviation);
    assert.deepEqual(basis.fund.warnings, []);
    for (let i = 0; i < fund.points.length; i++) {
      const raw = fund.points[i], calculated = basis.fund.points[i], sourceNav = sourceNavs.get(raw.date);
      assert.equal(raw.nav, Number(sourceNav)); assert.equal(calculated.date, raw.date);
      assert.ok(raw.date <= expected.oldNavThrough || raw.date >= expected.firstNewNavDate);
      if (raw.date <= expected.oldNavThrough) {
        const independent = decimalTimes100(sourceNav), difference = Math.abs(calculated.nav - independent);
        assert.ok(difference < 1e-9, 'Independent source-decimal x100 at ' + code + '/' + raw.date);
        maxIndependentNavError = Math.max(maxIndependentNavError, difference); normalizedRows++;
      } else { assert.equal(calculated.nav, raw.nav); unchangedRows++; }
    }
    assert.ok(normalizedRows > 0 && unchangedRows > 0);
    const repeat = financialNavBasis(basis.fund);
    assert.equal(repeat.adjusted, false, 'Repeat adjustment refused: ' + code);
    assert.equal(repeat.fund, basis.fund);
  } else {
    assert.equal(basis.fund, fund, 'Excluded history remains the original object: ' + code);
    assert.equal(basis.adjustment, undefined); assert.equal(basis.adjustments, undefined);
    assert.deepEqual(calculationInspection.moves, rawInspection.moves);
    assert.deepEqual(basis.fund.warnings, doc.warnings);
    assert.equal(sha(basis.fund.points), rawPointsHash);
    unchangedRows = fund.points.length;
  }
  const rankings = localFundReturns(basis.fund), rawRankings = localFundReturns(fund);
  for (const key of ['oneYear', 'threeYear', 'fiveYear', 'threeYearMaxDrawdown']) {
    assert.equal(rankings[key], null, 'Distribution local consumer exclusion: ' + code + '/' + key);
    assert.equal(rawRankings[key], null);
  }
  assert.equal(archivedFundReturns(doc), null, 'Distribution archive consumer exclusion: ' + code);
  assert.equal(sha(doc), docHash); assert.equal(sha(doc.payload.data), rawDataHash); assert.equal(sha(fund), fundHash);
  const boundaryPoints = expected ? fund.points.filter(point => point.date === expected.oldNavThrough || point.date === expected.firstNewNavDate)
    .map(point => ({ date: point.date, sourceNav: sourceNavs.get(point.date), rawNav: point.nav,
      expectedCalculationNav: point.date === expected.oldNavThrough ? decimalTimes100(sourceNavs.get(point.date)) : point.nav,
      calculationNav: basis.fund.points[fund.points.indexOf(point)].nav })) : [];
  rows.push({ schemeCode: code, name: m.scheme_name, included, eventGroup: expected?.group ?? null,
    meta: fund.meta, catalogue: entry, historicalActiveRepairEligible: true,
    observationCount: fund.points.length, coverageStart: doc.coverageStart, coverageEnd: doc.coverageEnd,
    fetchedAt: doc.fetchedAt, sourceObservedAt: doc.archivedAt,
    savedHistoryBehindCatalogue: doc.coverageEnd < entry.latestDate,
    rawUnresolved: doc.unresolved, rawDocumentWarnings: doc.warnings, rawWarnings: fund.warnings,
    rawRejectedZeroNavDates: doc.rejectedZeroNavDates ?? null,
    independentQualityWarnings: fund.warnings.filter(warning => /^(?:Invalid NAV observations|Conflicting NAV values)\b/i.test(warning)),
    rawMoves: rawInspection.moves, calculationWarnings: basis.fund.warnings, remainingMoves: calculationInspection.moves,
    calculationQualityPass: !qualityBlocked(basis.fund), adjustment: basis.adjustment ?? null,
    expectedAction: expected ?? null, normalizedRows, unchangedRows, maxIndependentNavError,
    boundaryPoints, retainedGapsOver30CalendarDays: rawInspection.gaps, maxRetainedGapCalendarDays: rawInspection.maxGapDays,
    rawDocumentSha256: docHash, rawSourceObservationsSha256: rawDataHash, rawFundSha256: fundHash,
    rawPointsSha256: rawPointsHash, calculationPointsSha256: sha(basis.fund.points),
    rawInputUnchanged: true, rawArchiveUnresolvedPreserved: true,
    repeatAdjustmentRefused: included ? true : null, literalGrowthEligible: false,
    sourceHistoryCompletenessEstablished: false, distributionAdjustedTotalReturnEstablished: false,
    rawConsumerRanking: rawRankings, consumerRanking: rankings, archivedRanking: null, shard: shardRefs.get(code) });
}
// Evaluate runtime eligibility independently from the historical selection date.
// Report the actual date independently so later historical replays remain
// reproducible without presenting the frozen selection as current approval.
const actualScopeEvaluatedAt = new Date().toISOString(), actualScopeDate = actualScopeEvaluatedAt.slice(0, 10);
const actualScopeMs = Date.parse(actualScopeEvaluatedAt);
for (const row of rows) {
  row.actualActiveRepairEligible = isActiveRepairCandidate(row.catalogue, actualScopeMs);
  row.actualLatestNavAgeDays = daysBetween(row.catalogue.latestDate, actualScopeDate);
}
const sum = (items, key) => items.reduce((total, row) => total + row[key], 0);
const includedRows = rows.filter(row => row.included), excludedRows = rows.filter(row => !row.included);
const counts = {
  screenedHistories: rows.length, screenedObservations: sum(rows, 'observationCount'),
  historicalEligibleHistories: rows.filter(row => row.historicalActiveRepairEligible).length,
  actualEligibleHistories: rows.filter(row => row.actualActiveRepairEligible).length,
  approvedHistories: includedRows.length, approvedObservations: sum(includedRows, 'observationCount'),
  excludedHistories: excludedRows.length, excludedObservations: sum(excludedRows, 'observationCount'),
  normalizedObservations: sum(rows, 'normalizedRows'), unchangedCalculationObservations: sum(rows, 'unchangedRows'),
  rawLargeMoves: rows.reduce((total, row) => total + row.rawMoves.length, 0),
  remainingLargeMoves: rows.reduce((total, row) => total + row.remainingMoves.length, 0),
  newlyContinuousCalculationCopies: includedRows.filter(row => row.calculationQualityPass).length,
  excludedQualityBlockedHistories: excludedRows.filter(row => !row.calculationQualityPass).length,
  excludedHistoriesWithOneMove: excludedRows.filter(row => row.rawMoves.length === 1).length,
  excludedHistoriesWithTwoMoves: excludedRows.filter(row => row.rawMoves.length === 2).length,
  historiesWithRetainedGapsOver30Days: rows.filter(row => row.retainedGapsOver30CalendarDays.length > 0).length,
  approvedHistoriesWithRetainedGapsOver30Days: includedRows.filter(row => row.retainedGapsOver30CalendarDays.length > 0).length,
  retainedGapsOver30Days: rows.reduce((total, row) => total + row.retainedGapsOver30CalendarDays.length, 0),
  rawArchiveUnresolvedFlagsPreserved: rows.filter(row => row.rawUnresolved).length,
  rawArchiveFlagsCleared: 0, consumerReturnEligibilityAdded: 0,
};
for (const [key, expected] of Object.entries({ screenedHistories: 89, screenedObservations: 362985,
  historicalEligibleHistories: 89,
  approvedHistories: 41, approvedObservations: 176110, excludedHistories: 48, excludedObservations: 186875,
  rawLargeMoves: 107, remainingLargeMoves: 66, newlyContinuousCalculationCopies: 41,
  excludedQualityBlockedHistories: 48, excludedHistoriesWithOneMove: 30, excludedHistoriesWithTwoMoves: 18,
  rawArchiveUnresolvedFlagsPreserved: 89 })) assert.equal(counts[key], expected, 'Full retained-history accounting: ' + key);
assert.equal(counts.normalizedObservations + counts.unchangedCalculationObservations, counts.screenedObservations);
assert.ok(rows.find(row => row.schemeCode === 103051).retainedGapsOver30CalendarDays.some(gap =>
  gap.beforeDate === '2012-01-15' && gap.afterDate === '2012-05-04' && gap.gapDays === 110));
// Re-read every source asset and production module after evaluation to establish
// byte preservation, not only preservation of the parsed objects used above.
assert.equal(sha(readFileSync(resolve(archive, 'manifest.json'))), MANIFEST_SHA256);
for (const ref of refs) {
  const bytes = readFileSync(resolve(archive, basename(ref.path)));
  assert.equal(sha(bytes), ref.sha256); assert.equal(bytes.length, ref.bytes);
}
verifyProductionSources();
const result = {
  version: 1, replayStartedAt, replayedAt: new Date().toISOString(), offline: true,
  historicalEligibilitySnapshot: true, asOfDate: historicalScopeDate,
  actualScopeEvaluatedAt, actualScopeDate, historicalScopeDateMatchesRuntimeDate: actualScopeDate === historicalScopeDate,
  runtimeEligibilityIndependentlyEvaluated: true, repositoryBase: '8bdc157c8ba985772dd7723c118f77ffcdf936ec',
  replayScriptSha256: sha(readFileSync(fileURLToPath(import.meta.url))), productionSourceSha256: SOURCE_HASHES,
  checkpoint: manifest.sequence, checkpointAt: manifest.checkpointAt, manifestGeneratedAt: manifest.generatedAt,
  manifestSha256: MANIFEST_SHA256,
  inputCapture: { source: 'https://vasuki8.github.io/mutual-fund-dashboard/', capturedAt: '2026-10-30T23:20:51.380408+00:00',
    candidateSelectionSource: 'Checkpoint-255 distribution/discontinuity-only inventory; this replay uses checkpoint 257 and rechecks actual runtime UTC eligibility.' },
  catalogueFetchedAt: catalogue.fetchedAt, catalogueMembership: catalogue.membership, officialRosterDate: REPAIR_ROSTER_DATE,
  pointArithmetic: 'Independent decimal-string shift by two places for every pre-event source NAV; absolute error <1e-9; every post-event NAV exactly equal.',
  hashSemantics: 'File hashes cover exact bytes; object and point hashes cover UTF-8 JSON.stringify(value), with normalized points in ascending date order.',
  coverageLimit: 'All retained observations are replayed. Gaps above 30 calendar days are listed without filling dates; saved histories do not establish complete source coverage.',
  primaryEvidenceReport: 'docs/DISTRIBUTION_UNIT_BATCH_2026-10-30.md',
  eventGroups: EVENT_GROUPS, approvedCodes: approved, excludedCodes: excluded, verifiedReferences: refs,
  verifiedAssetCount: refs.length, inputAssetBytesUnchanged: true, productionSourceBytesUnchanged: true,
  maxIndependentNavError: Math.max(...rows.map(row => row.maxIndependentNavError)), counts, rows,
};
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ checkpoint: result.checkpoint, actualScopeEvaluatedAt, ...counts,
  maxIndependentNavError: result.maxIndependentNavError, output }));
