import type { FundMeta } from '../../src/lib/types.ts';

// Literal metadata and two retained observations on each side of each event,
// extracted from checkpoint 257 selected-histories (no network requests).
// Manifest SHA-256: 58e2a21009f582c2caefd1dd7ca6c6def0df934909a87d7409aa337e7e92581a.
// Expected NAVs and boundary returns were independently calculated with Python
// Decimal from the provider's NAV strings; no production adjustment code was used.
// Identity, event evidence and retained-history limits:
// docs/DISTRIBUTION_UNIT_BATCH_2026-10-30.md.
export interface DistributionUnitFixture {
  group: 'invesco-2011' | 'invesco-2013' | 'nippon-2012';
  meta: FundMeta;
  oldNavThrough: string;
  firstNewNavDate: string;
  maxFactorDeviation: number;
  dates: string[];
  navs: number[];
  expectedNavs: number[];
  expectedBoundaryReturnFraction: number;
  fetchedAt: string;
  sourceObservedAt: string;
  sourceDocumentSha256: string;
}

export const DISTRIBUTION_UNIT_FIXTURES: DistributionUnitFixture[] = [
  {
    group: "invesco-2011",
    meta: {
      "schemeCode": 104484,
      "schemeName": "Invesco India Liquid Fund - Regular Plan - Daily IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF205K01HN3"
    },
    oldNavThrough: "2011-02-25", firstNewNavDate: "2011-02-27", maxFactorDeviation: 0.1,
    dates: ["2011-02-24", "2011-02-25", "2011-02-27", "2011-02-28"],
    navs: [10.00780, 10.00780, 1000.78490, 1000.78490],
    expectedNavs: [1000.78000, 1000.78000, 1000.78490, 1000.78490],
    expectedBoundaryReturnFraction: 4.896180978836508e-06,
    fetchedAt: "2026-10-30T07:29:56.709Z", sourceObservedAt: "2026-10-30T07:29:57.787Z",
    sourceDocumentSha256: "83159354674d2feff58eb6fc64dd8cafc5a6660569ae1f0478d0a853c5a643c5",
  },
  {
    group: "invesco-2011",
    meta: {
      "schemeCode": 104725,
      "schemeName": "Invesco India Ultra Short to Short Term Fund - Regular Plan - Weekly IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short to Short Term Fund",
      "isinGrowth": "INF205K01IB6",
      "isinDivReinvestment": "INF205K01IA8"
    },
    oldNavThrough: "2011-02-25", firstNewNavDate: "2011-02-28", maxFactorDeviation: 0.1,
    dates: ["2011-02-24", "2011-02-25", "2011-02-28", "2011-03-01"],
    navs: [10.02170, 10.02400, 1003.08030, 1001.71570],
    expectedNavs: [1002.17000, 1002.40000, 1003.08030, 1001.71570],
    expectedBoundaryReturnFraction: 0.0006786711891460495,
    fetchedAt: "2026-10-30T04:20:21.067Z", sourceObservedAt: "2026-10-30T04:20:22.513Z",
    sourceDocumentSha256: "40b305e2de43fef8aacea9782b9ffb2bc31d0357ec5bf3812043a6959877a3da",
  },
  {
    group: "invesco-2011",
    meta: {
      "schemeCode": 105025,
      "schemeName": "Invesco India Ultra Short to Short Term Fund - Regular Plan - Daily IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short to Short Term Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF205K01HZ7"
    },
    oldNavThrough: "2011-02-25", firstNewNavDate: "2011-02-28", maxFactorDeviation: 0.1,
    dates: ["2011-02-24", "2011-02-25", "2011-02-28", "2011-03-01"],
    navs: [10.01710, 10.01710, 1001.71500, 1001.71500],
    expectedNavs: [1001.71000, 1001.71000, 1001.71500, 1001.71500],
    expectedBoundaryReturnFraction: 4.991464595541624e-06,
    fetchedAt: "2026-10-30T04:20:24.892Z", sourceObservedAt: "2026-10-30T04:20:25.148Z",
    sourceDocumentSha256: "c6a4dbf2c43d09db37c490c4dcefaa6e6df24b4154e02648581ac506e4144bb0",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 105190,
      "schemeName": "Invesco India Short Term Fund - Regular Plan - Weekly IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Short Term Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF205K01UV9"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.19780, 10.20750, 1021.66190, 1019.40400],
    expectedNavs: [1019.78000, 1020.75000, 1021.66190, 1019.40400],
    expectedBoundaryReturnFraction: 0.0008933627234876317,
    fetchedAt: "2026-10-30T04:20:40.148Z", sourceObservedAt: "2026-10-30T04:20:40.804Z",
    sourceDocumentSha256: "c9ba4b0273792bf0ab8b9b6491f08ba0ca0aa954b3cba8da3d39786613145218",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 105191,
      "schemeName": "Invesco India Short Term Fund - Regular Plan - Monthly IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Short Term Fund",
      "isinGrowth": "INF205K01UO4",
      "isinDivReinvestment": "INF205K01UP1"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.55130, 10.56140, 1057.08410, 1057.50320],
    expectedNavs: [1055.13000, 1056.14000, 1057.08410, 1057.50320],
    expectedBoundaryReturnFraction: 0.0008939155793739466,
    fetchedAt: "2026-10-30T04:20:40.837Z", sourceObservedAt: "2026-10-30T04:20:41.221Z",
    sourceDocumentSha256: "44afe752b4cdf16528d2a0f57feff5321d3fdcd0dc7e3fa1696e9b65be5d5e01",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 106171,
      "schemeName": "Invesco India Corporate Bond Fund - Regular Plan - Monthly IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Corporate Bond Fund",
      "isinGrowth": "INF205K01RN2",
      "isinDivReinvestment": "INF205K01RO0"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.82610, 10.83580, 1085.91910, 1087.02360],
    expectedNavs: [1082.61000, 1083.58000, 1085.91910, 1087.02360],
    expectedBoundaryReturnFraction: 0.0021586777164584064,
    fetchedAt: "2026-10-30T07:45:52.204Z", sourceObservedAt: "2026-10-30T07:45:53.794Z",
    sourceDocumentSha256: "40211c05ee7f33fd05d4d351b8d6140efda8fbfb3552a2135c88376dc57c0125",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 106172,
      "schemeName": "Invesco India Corporate Bond Fund - Regular Plan - Quarterly IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Corporate Bond Fund",
      "isinGrowth": "INF205K01RP7",
      "isinDivReinvestment": "INF205K01RQ5"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.10570, 10.11480, 1013.66620, 1014.69720],
    expectedNavs: [1010.57000, 1011.48000, 1013.66620, 1014.69720],
    expectedBoundaryReturnFraction: 0.0021613872740934075,
    fetchedAt: "2026-10-30T07:45:52.806Z", sourceObservedAt: "2026-10-30T07:45:53.687Z",
    sourceDocumentSha256: "b5c6b44f503a670fd3bb408b52c1d5c0c5d941ff445ef76f70dd190471c74c80",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 106179,
      "schemeName": "Invesco India Corporate Bond Fund - Regular Plan - Annual IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Corporate Bond Fund",
      "isinGrowth": "INF205K01QX3",
      "isinDivReinvestment": "INF205K01QY1"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [12.42030, 12.43140, 1245.82660, 1247.09380],
    expectedNavs: [1242.03000, 1243.14000, 1245.82660, 1247.09380],
    expectedBoundaryReturnFraction: 0.0021611403381759093,
    fetchedAt: "2026-10-27T03:55:01.144Z", sourceObservedAt: "2026-10-27T03:55:03.290Z",
    sourceDocumentSha256: "50c5375451a11e276d7e000a421fc261866e5e7e1ff16d4d286e1e884f99c2d6",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 107471,
      "schemeName": "Invesco India Gilt Fund - Regular Plan - Monthly IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Gilt Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF205K01SS9"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.34270, 10.35390, 1037.02980, 1038.49590],
    expectedNavs: [1034.27000, 1035.39000, 1037.02980, 1038.49590],
    expectedBoundaryReturnFraction: 0.0015837510503288615,
    fetchedAt: "2026-10-30T04:20:44.043Z", sourceObservedAt: "2026-10-30T04:20:45.667Z",
    sourceDocumentSha256: "f530bed528315d917f010cad57175efa643d1d5f61bd7b507cd19145cac276b0",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 107472,
      "schemeName": "Invesco India Gilt Fund - Regular Plan - Quarterly IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Gilt Fund",
      "isinGrowth": "INF205K01ST7",
      "isinDivReinvestment": "INF205K01SU5"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.06380, 10.07470, 1009.06300, 1010.48960],
    expectedNavs: [1006.38000, 1007.47000, 1009.06300, 1010.48960],
    expectedBoundaryReturnFraction: 0.0015811885217425828,
    fetchedAt: "2026-10-30T04:20:44.230Z", sourceObservedAt: "2026-10-30T04:20:44.486Z",
    sourceDocumentSha256: "29ce89e197bc8659d34fe7824ebb734fc00227084d8867b7405ce2292f5ef20d",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 107476,
      "schemeName": "Invesco India Gilt Fund - Regular Plan - Annual IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Gilt Fund",
      "isinGrowth": "INF205K01SJ8",
      "isinDivReinvestment": "INF205K01SK6"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [11.59530, 11.60790, 1162.62380, 1164.26750],
    expectedNavs: [1159.53000, 1160.79000, 1162.62380, 1164.26750],
    expectedBoundaryReturnFraction: 0.0015797861801014827,
    fetchedAt: "2026-10-30T04:20:44.653Z", sourceObservedAt: "2026-10-30T04:20:45.709Z",
    sourceDocumentSha256: "4997ae230b499e6fb8e3aadea65a19d69607cfe8f62d054bab7383cd55832f78",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 112125,
      "schemeName": "Invesco India Money Market Fund - Regular Plan - Monthly IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Money Market Fund",
      "isinGrowth": "INF205K01SE9",
      "isinDivReinvestment": "INF205K01SF6"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.23660, 10.23910, 1024.88190, 1025.14320],
    expectedNavs: [1023.66000, 1023.91000, 1024.88190, 1025.14320],
    expectedBoundaryReturnFraction: 0.0009492045199285094,
    fetchedAt: "2026-10-30T03:48:13.647Z", sourceObservedAt: "2026-10-30T03:48:13.914Z",
    sourceDocumentSha256: "5d3aa93ab222ab31f15025935f6cc39d22355bc402c72e0d1fbce52bd6e62006",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 114360,
      "schemeName": "Invesco India Ultra Short Term Fund - Regular Plan - Quarterly IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short Term Fund",
      "isinGrowth": "INF205K01TP3",
      "isinDivReinvestment": "INF205K01TQ1"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.33810, 10.34010, 1034.83340, 1034.99910],
    expectedNavs: [1033.81000, 1034.01000, 1034.83340, 1034.99910],
    expectedBoundaryReturnFraction: 0.0007963172503167281,
    fetchedAt: "2026-10-30T15:19:36.745Z", sourceObservedAt: "2026-10-30T15:19:50.521Z",
    sourceDocumentSha256: "5694b08e069d5e01836153e4ef48ae5f6d6af63c5247fe1b31fd947235b8c3d6",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 114361,
      "schemeName": "Invesco India Ultra Short Term Fund - Regular Plan - Annual IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short Term Fund",
      "isinGrowth": "INF205K01TD9",
      "isinDivReinvestment": "INF205K01TE7"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.45580, 10.45780, 1046.61390, 1046.78160],
    expectedNavs: [1045.58000, 1045.78000, 1046.61390, 1046.78160],
    expectedBoundaryReturnFraction: 0.0007973952456539616,
    fetchedAt: "2026-10-30T15:19:42.569Z", sourceObservedAt: "2026-10-30T15:19:42.858Z",
    sourceDocumentSha256: "d84742b45a43b15f0df0a420371a495e1d77f23faf8b4cb461cf291cd6ede3e0",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 114362,
      "schemeName": "Invesco India Ultra Short Term Fund - Regular Plan - Monthly IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short Term Fund",
      "isinGrowth": "INF205K01TN8",
      "isinDivReinvestment": "INF205K01TO6"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.18030, 10.18230, 1019.03670, 1019.20000],
    expectedNavs: [1018.03000, 1018.23000, 1019.03670, 1019.20000],
    expectedBoundaryReturnFraction: 0.0007922571521169088,
    fetchedAt: "2026-10-30T15:19:43.022Z", sourceObservedAt: "2026-10-30T15:19:43.308Z",
    sourceDocumentSha256: "1675ebeaf307055bd1e149778184867b1a63abeefa4b320ccac40ef35928aac9",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 115515,
      "schemeName": "Invesco India Money Market Fund - Regular Plan - Daily IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Money Market Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF205K01RU7"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.00290, 10.00290, 1000.29000, 1000.29000],
    expectedNavs: [1000.29000, 1000.29000, 1000.29000, 1000.29000],
    expectedBoundaryReturnFraction: 0.0,
    fetchedAt: "2026-10-30T15:35:37.385Z", sourceObservedAt: "2026-10-30T15:35:38.048Z",
    sourceDocumentSha256: "4c84f9395430901e9e2eb60e099371f541c37b6b9b9e364ef76a141201be853d",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 116110,
      "schemeName": "Invesco India Short Term Fund - Regular Plan - Discretionary IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Short Term Fund",
      "isinGrowth": "INF205K01UL0",
      "isinDivReinvestment": "INF205K01UM8"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.39650, 10.40640, 1041.57200, 1041.98400],
    expectedNavs: [1039.65000, 1040.64000, 1041.57200, 1041.98400],
    expectedBoundaryReturnFraction: 0.0008956027060270603,
    fetchedAt: "2026-10-26T00:42:29.220Z", sourceObservedAt: "2026-10-26T00:42:29.475Z",
    sourceDocumentSha256: "ed9cc626e6b518f41383be0a17e88b5b0cc3bd43c433acf17a6e3dd6c17212cf",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 117973,
      "schemeName": "Invesco India Short Term Fund - Regular Plan - Daily IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Short Term Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF205K01UD7"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.01000, 10.01360, 1001.41770, 1001.60620],
    expectedNavs: [1001.00000, 1001.36000, 1001.41770, 1001.60620],
    expectedBoundaryReturnFraction: 5.7621634576975313e-05,
    fetchedAt: "2026-10-30T15:53:10.904Z", sourceObservedAt: "2026-10-30T15:53:11.159Z",
    sourceDocumentSha256: "7cd6ae181cd595e384fb0b09b51e236179f11457e7b44635f5ce0ea990644b4b",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 120496,
      "schemeName": "Invesco India Corporate Bond Fund - Direct Plan - Monthly IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Corporate Bond Fund",
      "isinGrowth": "INF205K01RG6",
      "isinDivReinvestment": "INF205K01RH4"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.91180, 10.92170, 1094.58610, 1095.71300],
    expectedNavs: [1091.18000, 1092.17000, 1094.58610, 1095.71300],
    expectedBoundaryReturnFraction: 0.002212201397218382,
    fetchedAt: "2026-10-30T23:03:41.124Z", sourceObservedAt: "2026-10-30T23:03:41.963Z",
    sourceDocumentSha256: "33dfbc299dba273fa928fc7fdd6161bc97364ed4c131242fefb001a71ce21dbc",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 120499,
      "schemeName": "Invesco India Corporate Bond Fund - Direct Plan - Discretionary IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Corporate Bond Fund",
      "isinGrowth": "INF205K01RD3",
      "isinDivReinvestment": "INF205K01RE1"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.45730, 10.46680, 1048.99960, 1050.07950],
    expectedNavs: [1045.73000, 1046.68000, 1048.99960, 1050.07950],
    expectedBoundaryReturnFraction: 0.0022161501127374176,
    fetchedAt: "2026-10-30T23:03:42.099Z", sourceObservedAt: "2026-10-30T23:03:42.347Z",
    sourceDocumentSha256: "8f4b1e178dffe1b7981c58095e42a0ab71b60f365fca80a29732d62561a9d1c1",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 120501,
      "schemeName": "Invesco India Corporate Bond Fund - Direct Plan - Quarterly IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Corporate Bond Fund",
      "isinGrowth": "INF205K01RI2",
      "isinDivReinvestment": "INF205K01RJ0"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.25230, 10.26170, 1028.43710, 1029.49570],
    expectedNavs: [1025.23000, 1026.17000, 1028.43710, 1029.49570],
    expectedBoundaryReturnFraction: 0.002209283062260639,
    fetchedAt: "2026-10-30T23:03:42.507Z", sourceObservedAt: "2026-10-30T23:03:42.968Z",
    sourceDocumentSha256: "e26815402ae18c3ecfa54cd723c6055ac7bca31c7d40fef719e58532f7b15d99",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 120506,
      "schemeName": "Invesco India Money Market Fund - Direct Plan - Daily IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Money Market Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF205K01RV5"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.00290, 10.00290, 1000.29000, 1000.29000],
    expectedNavs: [1000.29000, 1000.29000, 1000.29000, 1000.29000],
    expectedBoundaryReturnFraction: 0.0,
    fetchedAt: "2026-10-30T23:03:43.886Z", sourceObservedAt: "2026-10-30T23:03:44.453Z",
    sourceDocumentSha256: "df0e28b7018c2b8f8cd8dd254f9b631c4e5914188f7d7b5f80f7babb17a644be",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 120508,
      "schemeName": "Invesco India Money Market Fund - Direct Plan - Discretionary IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Money Market Fund",
      "isinGrowth": "INF205K01RW3",
      "isinDivReinvestment": "INF205K01RX1"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.30100, 10.30360, 1031.36060, 1031.63150],
    expectedNavs: [1030.10000, 1030.36000, 1031.36060, 1031.63150],
    expectedBoundaryReturnFraction: 0.0009711168911836639,
    fetchedAt: "2026-10-30T23:03:44.615Z", sourceObservedAt: "2026-10-30T23:03:45.055Z",
    sourceDocumentSha256: "b1ac106e346fe6235a39a03d5c0880b3b6d6855c0606ea7ed423b5930eca6ab9",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 120509,
      "schemeName": "Invesco India Money Market Fund - Direct Plan - Monthly IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Money Market Fund",
      "isinGrowth": "INF205K01RZ6",
      "isinDivReinvestment": "INF205K01SA7"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.23790, 10.24050, 1025.04680, 1025.31520],
    expectedNavs: [1023.79000, 1024.05000, 1025.04680, 1025.31520],
    expectedBoundaryReturnFraction: 0.0009733899711928129,
    fetchedAt: "2026-10-30T23:03:44.821Z", sourceObservedAt: "2026-10-30T23:03:45.281Z",
    sourceDocumentSha256: "57f2b418540ec3845f72d52392a317c7491ed1028b4b88e1c343b178bebc5074",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 120519,
      "schemeName": "Invesco India Gilt Fund - Direct Plan - Annual IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Gilt Fund",
      "isinGrowth": "INF205K01SL4",
      "isinDivReinvestment": "INF205K01SM2"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [11.37180, 11.38450, 1140.41840, 1142.07270],
    expectedNavs: [1137.18000, 1138.45000, 1140.41840, 1142.07270],
    expectedBoundaryReturnFraction: 0.001729017523826255,
    fetchedAt: "2026-10-30T23:03:27.461Z", sourceObservedAt: "2026-10-30T23:03:28.377Z",
    sourceDocumentSha256: "338973377371e7135a50702de9908dfe32010bdd6bf18c1b7524050bc2f8cac3",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 120521,
      "schemeName": "Invesco India Gilt Fund - Direct Plan - Monthly IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Gilt Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF205K01SO8"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.26350, 10.27490, 1029.27030, 1030.76340],
    expectedNavs: [1026.35000, 1027.49000, 1029.27030, 1030.76340],
    expectedBoundaryReturnFraction: 0.0017326689310844874,
    fetchedAt: "2026-10-30T23:03:28.538Z", sourceObservedAt: "2026-10-30T23:03:29.042Z",
    sourceDocumentSha256: "b09ab01c7fae763d8eedf50630d4dde34b143894a161e068ab44ddd77fcdc385",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 120522,
      "schemeName": "Invesco India Gilt Fund - Direct Plan - Quarterly IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Gilt Fund",
      "isinGrowth": "INF205K01SP5",
      "isinDivReinvestment": "INF205K01SQ3"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.26630, 10.27780, 1029.55460, 1031.04810],
    expectedNavs: [1026.63000, 1027.78000, 1029.55460, 1031.04810],
    expectedBoundaryReturnFraction: 0.001726634104574909,
    fetchedAt: "2026-10-30T23:03:28.598Z", sourceObservedAt: "2026-10-30T23:03:29.091Z",
    sourceDocumentSha256: "6f9e1d59ad9dc2f4acccbb7300790286ac1019d4794fb1844568a37aa8c2e368",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 120542,
      "schemeName": "Invesco India Ultra Short Term Fund - Direct Plan - Monthly IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short Term Fund",
      "isinGrowth": "INF205K01TI8",
      "isinDivReinvestment": "INF205K01TJ6"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.18770, 10.19000, 1019.94440, 1020.14100],
    expectedNavs: [1018.77000, 1019.00000, 1019.94440, 1020.14100],
    expectedBoundaryReturnFraction: 0.0009267909715407262,
    fetchedAt: "2026-10-30T23:03:30.378Z", sourceObservedAt: "2026-10-30T23:03:31.331Z",
    sourceDocumentSha256: "75e6d3afb63c6078bafdf3b4658b8246a57c3b486347f7156d6e3c20567f4430",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 120543,
      "schemeName": "Invesco India Ultra Short Term Fund - Direct Plan - Annual IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short Term Fund",
      "isinGrowth": "INF205K01TF4",
      "isinDivReinvestment": "INF205K01TG2"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [11.09000, 11.09250, 1110.27660, 1110.49060],
    expectedNavs: [1109.00000, 1109.25000, 1110.27660, 1110.49060],
    expectedBoundaryReturnFraction: 0.0009254901960784313,
    fetchedAt: "2026-10-30T23:03:31.473Z", sourceObservedAt: "2026-10-30T23:03:31.936Z",
    sourceDocumentSha256: "43ef5d6506c155a6ab567570a09d9c27eb59194c910ab114c2fe03e7e7139262",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 120544,
      "schemeName": "Invesco India Ultra Short Term Fund - Direct Plan - Quarterly IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short Term Fund",
      "isinGrowth": "INF205K01TK4",
      "isinDivReinvestment": "INF205K01TL2"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.37560, 10.37800, 1038.75830, 1038.95850],
    expectedNavs: [1037.56000, 1037.80000, 1038.75830, 1038.95850],
    expectedBoundaryReturnFraction: 0.0009233956446328773,
    fetchedAt: "2026-10-30T23:03:31.492Z", sourceObservedAt: "2026-10-30T23:03:31.953Z",
    sourceDocumentSha256: "b2eaefb2a79dbdcf26e0a8f513b8a926223c37403421dc52998dfaf26abd5c71",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 120559,
      "schemeName": "Invesco India Short Term Fund - Direct Plan - Daily IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Short Term Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF205K01UE5"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.01000, 10.01360, 1001.42480, 1001.61330],
    expectedNavs: [1001.00000, 1001.36000, 1001.42480, 1001.61330],
    expectedBoundaryReturnFraction: 6.471199169129984e-05,
    fetchedAt: "2026-10-30T23:03:32.096Z", sourceObservedAt: "2026-10-30T23:03:32.672Z",
    sourceDocumentSha256: "b4d0acc8bcc9ea5ebe42032af91a51c73922639a58a89ee629b27b8ea509f1a0",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 120562,
      "schemeName": "Invesco India Short Term Fund - Direct Plan - Weekly IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Short Term Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF205K01UK2"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.22040, 10.23030, 1024.01050, 1019.41970],
    expectedNavs: [1022.04000, 1023.03000, 1024.01050, 1019.41970],
    expectedBoundaryReturnFraction: 0.0009584274165957987,
    fetchedAt: "2026-10-30T23:03:33.042Z", sourceObservedAt: "2026-10-30T23:03:33.503Z",
    sourceDocumentSha256: "10a67795582e259a889f0b314687c60802475b6653602a01c504ba75854ad391",
  },
  {
    group: "invesco-2013",
    meta: {
      "schemeCode": 120563,
      "schemeName": "Invesco India Short Term Fund - Direct Plan - Discretionary IDCW",
      "fundHouse": "Invesco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Short Term Fund",
      "isinGrowth": "INF205K01UF2",
      "isinDivReinvestment": "INF205K01UG0"
    },
    oldNavThrough: "2013-04-18", firstNewNavDate: "2013-04-22", maxFactorDeviation: 0.5,
    dates: ["2013-04-17", "2013-04-18", "2013-04-22", "2013-04-23"],
    navs: [10.41150, 10.42150, 1043.15210, 1043.58220],
    expectedNavs: [1041.15000, 1042.15000, 1043.15210, 1043.58220],
    expectedBoundaryReturnFraction: 0.0009615698315981385,
    fetchedAt: "2026-10-30T23:03:33.456Z", sourceObservedAt: "2026-10-30T23:03:33.692Z",
    sourceDocumentSha256: "99334b0cdce17a33cf0f1933a0200df2549f9652ab0abefefe23ab89308b7ab6",
  },
  {
    group: "nippon-2012",
    meta: {
      "schemeCode": 100838,
      "schemeName": "Nippon India Liquid Fund - Regular Plan - RETAIL Plan - WEEKLY IDCW OPTION",
      "fundHouse": "Nippon India Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF204K01UK5"
    },
    oldNavThrough: "2012-08-03", firstNewNavDate: "2012-08-05", maxFactorDeviation: 0.1,
    dates: ["2012-08-02", "2012-08-03", "2012-08-05", "2012-08-06"],
    navs: [10.35630, 10.34170, 1034.64700, 1034.89050],
    expectedNavs: [1035.63000, 1034.17000, 1034.64700, 1034.89050],
    expectedBoundaryReturnFraction: 0.00046123944805979674,
    fetchedAt: "2026-10-30T06:05:39.979Z", sourceObservedAt: "2026-10-30T06:05:41.014Z",
    sourceDocumentSha256: "b07ae2e24cfd49e6d285d2db806bc2e600df910336bab1acffef2815eaa900f7",
  },
  {
    group: "nippon-2012",
    meta: {
      "schemeCode": 100842,
      "schemeName": "Nippon India Liquid Fund - Regular Plan - RETAIL Plan - DAILY IDCW OPTION",
      "fundHouse": "Nippon India Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF204K01UJ7"
    },
    oldNavThrough: "2012-08-03", firstNewNavDate: "2012-08-05", maxFactorDeviation: 0.1,
    dates: ["2012-08-02", "2012-08-03", "2012-08-05", "2012-08-06"],
    navs: [15.24280, 15.24280, 1524.28000, 1524.28000],
    expectedNavs: [1524.28000, 1524.28000, 1524.28000, 1524.28000],
    expectedBoundaryReturnFraction: 0.0,
    fetchedAt: "2026-10-30T06:05:41.187Z", sourceObservedAt: "2026-10-30T06:05:41.503Z",
    sourceDocumentSha256: "21a7b56259d454f9c187830b65a1fe2e3742f893b436d9966b8b60891023e4be",
  },
  {
    group: "nippon-2012",
    meta: {
      "schemeCode": 100843,
      "schemeName": "Nippon India Liquid Fund - Regular Plan - RETAIL plan - MONTHLY IDCW OPTION",
      "fundHouse": "Nippon India Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF204K01UT6",
      "isinDivReinvestment": "INF204K01UU4"
    },
    oldNavThrough: "2012-08-03", firstNewNavDate: "2012-08-05", maxFactorDeviation: 0.1,
    dates: ["2012-08-02", "2012-08-03", "2012-08-05", "2012-08-06"],
    navs: [13.33520, 13.33840, 1334.44600, 1334.76000],
    expectedNavs: [1333.52000, 1333.84000, 1334.44600, 1334.76000],
    expectedBoundaryReturnFraction: 0.0004543273556048701,
    fetchedAt: "2026-10-30T06:05:41.261Z", sourceObservedAt: "2026-10-30T06:05:41.849Z",
    sourceDocumentSha256: "f9923c82a0b34507446ffc795f3fd2bfc3b5585265091c1d3bc6a776e58df20f",
  },
  {
    group: "nippon-2012",
    meta: {
      "schemeCode": 100844,
      "schemeName": "Nippon India Liquid Fund - Regular Plan - RETAIL Plan - QUARTERLY IDCW OPTION",
      "fundHouse": "Nippon India Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF204K01UV2",
      "isinDivReinvestment": "INF204K01UW0"
    },
    oldNavThrough: "2012-08-03", firstNewNavDate: "2012-08-05", maxFactorDeviation: 0.1,
    dates: ["2012-08-02", "2012-08-03", "2012-08-05", "2012-08-06"],
    navs: [12.28440, 12.28720, 1229.28610, 1229.57540],
    expectedNavs: [1228.44000, 1228.72000, 1229.28610, 1229.57540],
    expectedBoundaryReturnFraction: 0.0004607233543850511,
    fetchedAt: "2026-10-30T06:05:41.675Z", sourceObservedAt: "2026-10-30T06:05:42.392Z",
    sourceDocumentSha256: "cf43200d260abc280a4e56f66392edbb621f852148e840b4a5061076181d85f3",
  },
  {
    group: "nippon-2012",
    meta: {
      "schemeCode": 100852,
      "schemeName": "Nippon India Liquid Fund - Regular Plan - DAILY IDCW OPTION",
      "fundHouse": "Nippon India Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF204K01UM1"
    },
    oldNavThrough: "2012-08-03", firstNewNavDate: "2012-08-05", maxFactorDeviation: 0.1,
    dates: ["2012-08-02", "2012-08-03", "2012-08-05", "2012-08-06"],
    navs: [15.28740, 15.28740, 1528.74000, 1528.74000],
    expectedNavs: [1528.74000, 1528.74000, 1528.74000, 1528.74000],
    expectedBoundaryReturnFraction: 0.0,
    fetchedAt: "2026-10-30T06:05:42.439Z", sourceObservedAt: "2026-10-30T06:05:42.682Z",
    sourceDocumentSha256: "127cc34b7f7a7fef6a70f87904ecb84b0088f566fd4832dd5a866ac923e4b162",
  },
  {
    group: "nippon-2012",
    meta: {
      "schemeCode": 100853,
      "schemeName": "Nippon India Liquid Fund - Regular Plan - WEEKLY IDCW OPTION",
      "fundHouse": "Nippon India Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF204KC1FM8",
      "isinDivReinvestment": "INF204K01US8"
    },
    oldNavThrough: "2012-08-03", firstNewNavDate: "2012-08-05", maxFactorDeviation: 0.1,
    dates: ["2012-08-02", "2012-08-03", "2012-08-05", "2012-08-06"],
    navs: [15.32610, 15.30300, 1531.05460, 1531.44210],
    expectedNavs: [1532.61000, 1530.30000, 1531.05460, 1531.44210],
    expectedBoundaryReturnFraction: 0.0004931059269424296,
    fetchedAt: "2026-10-30T06:05:42.564Z", sourceObservedAt: "2026-10-30T06:05:43.022Z",
    sourceDocumentSha256: "7372f6f55373a09586d16f998df8e9d92dd15599ee5050f3671a164dcd15804d",
  },
  {
    group: "nippon-2012",
    meta: {
      "schemeCode": 103050,
      "schemeName": "Nippon India Money Market Fund - Regular Plan - DAILY IDCW Option",
      "fundHouse": "Nippon India Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Money Market Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF204K01UY6"
    },
    oldNavThrough: "2012-08-03", firstNewNavDate: "2012-08-05", maxFactorDeviation: 0.1,
    dates: ["2012-08-02", "2012-08-03", "2012-08-05", "2012-08-06"],
    navs: [10.00510, 10.00510, 1000.51000, 1000.51000],
    expectedNavs: [1000.51000, 1000.51000, 1000.51000, 1000.51000],
    expectedBoundaryReturnFraction: 0.0,
    fetchedAt: "2026-10-30T06:56:41.530Z", sourceObservedAt: "2026-10-30T06:56:41.771Z",
    sourceDocumentSha256: "ad32dd72312e5bc624b8caef3d43427c49ba4902f05f740db36d845c20773f84",
  },
  {
    group: "nippon-2012",
    meta: {
      "schemeCode": 103051,
      "schemeName": "Nippon India Money Market Fund - Regular Plan - WEEKLY IDCW Option",
      "fundHouse": "Nippon India Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Money Market Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF204K01UZ3"
    },
    oldNavThrough: "2012-08-03", firstNewNavDate: "2012-08-05", maxFactorDeviation: 0.1,
    dates: ["2012-08-02", "2012-08-03", "2012-08-05", "2012-08-06"],
    navs: [10.01860, 10.00350, 1000.83750, 1001.10360],
    expectedNavs: [1001.86000, 1000.35000, 1000.83750, 1001.10360],
    expectedBoundaryReturnFraction: 0.0004873294346978557,
    fetchedAt: "2026-10-30T06:56:41.566Z", sourceObservedAt: "2026-10-30T06:56:51.405Z",
    sourceDocumentSha256: "c25eec6c409c53fb4ac737d3f6f0d46e152dca89158784221474d8d36b2707b5",
  },
];

// Exact current identities of the 48 screened but unsupported histories.
// Tests pair these identities with otherwise valid event windows as synthetic
// rejection controls; those windows are not claimed to be these funds' NAVs.
// Their actual full retained series are covered by the separate production replay.
export const EXCLUDED_DISTRIBUTION_IDENTITIES: FundMeta[] = [
  {
    "schemeCode": 100375,
    "schemeName": "Nippon India Growth Mid Cap Fund - Regular Plan - IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Equity Scheme - Mid Cap Fund",
    "isinGrowth": "INF204K01299",
    "isinDivReinvestment": "INF204K01307"
  },
  {
    "schemeCode": 100378,
    "schemeName": "Nippon India Vision Large & Mid Cap Fund - Regular Plan - IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Equity Scheme - Large & Mid Cap Fund",
    "isinGrowth": "INF204K01372",
    "isinDivReinvestment": "INF204K01380"
  },
  {
    "schemeCode": 101163,
    "schemeName": "Nippon India Multi Cap Fund - Regular Plan - IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Equity Schemes - Multi Cap Fund",
    "isinGrowth": "INF204K01455",
    "isinDivReinvestment": "INF204K01463"
  },
  {
    "schemeCode": 101264,
    "schemeName": "Nippon India Power & Infra Fund - Regular Plan - IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Equity Schemes - Sectoral Fund",
    "isinGrowth": "INF204K01AB6",
    "isinDivReinvestment": "INF204K01AC4"
  },
  {
    "schemeCode": 101864,
    "schemeName": "Nippon India Banking & Financial Services Fund - Regular Plan - IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Equity Schemes - Sectoral Fund",
    "isinGrowth": "INF204K01893",
    "isinDivReinvestment": "INF204K01901"
  },
  {
    "schemeCode": 102433,
    "schemeName": "Nippon India Pharma Fund - Regular Plan - IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Equity Schemes - Sectoral Fund",
    "isinGrowth": "INF204K01935",
    "isinDivReinvestment": "INF204K01943"
  },
  {
    "schemeCode": 102753,
    "schemeName": "Nippon India Consumption Fund - Regular Plan - IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Equity Schemes - Thematic Fund",
    "isinGrowth": "INF204K01AN1",
    "isinDivReinvestment": "INF204K01AO9"
  },
  {
    "schemeCode": 102848,
    "schemeName": "Nippon India Balanced Advantage Fund - Regular Plan - IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Hybrid Schemes - Balanced Advantage Fund/ Dynamic Asset Allocation",
    "isinGrowth": "INF204K01570",
    "isinDivReinvestment": "INF204K01588"
  },
  {
    "schemeCode": 103052,
    "schemeName": "Nippon India Money Market Fund - Regular Plan - MONTHLY IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Debt Scheme - Money Market Fund",
    "isinGrowth": "INF204K01VB2",
    "isinDivReinvestment": "INF204K01VC0"
  },
  {
    "schemeCode": 103086,
    "schemeName": "Nippon India Value Fund - Regular Plan - IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Equity Scheme - Value Fund",
    "isinGrowth": "INF204K01GC1",
    "isinDivReinvestment": "INF204K01GD9"
  },
  {
    "schemeCode": 103197,
    "schemeName": "Nippon India ELSS Tax Saver Fund - Regular Plan - IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Equity Schemes - ELSS- Tax Saver Fund",
    "isinGrowth": "INF204K01GL2",
    "isinDivReinvestment": "INF204K01GM0"
  },
  {
    "schemeCode": 104485,
    "schemeName": "Invesco India Liquid Fund - Regular Plan - Weekly IDCW",
    "fundHouse": "Invesco Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
    "isinGrowth": "INF205KA1BD7",
    "isinDivReinvestment": "INF205K01HO1"
  },
  {
    "schemeCode": 104489,
    "schemeName": "Invesco India Liquid Fund - Regular Plan - Weekly IDCW",
    "fundHouse": "Invesco Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
    "isinGrowth": null,
    "isinDivReinvestment": "INF205K01HH5"
  },
  {
    "schemeCode": 104638,
    "schemeName": "Nippon India Focused Fund - Regular Plan - IDCW OPTION",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Equity Scheme - Focused Fund",
    "isinGrowth": "INF204K01GF4",
    "isinDivReinvestment": "INF204K01GG2"
  },
  {
    "schemeCode": 104722,
    "schemeName": "Invesco India Ultra Short to Short Term Fund - Regular Plan - Weekly IDCW",
    "fundHouse": "Invesco Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short to Short Term Fund",
    "isinGrowth": null,
    "isinDivReinvestment": "INF205K01HV6"
  },
  {
    "schemeCode": 104723,
    "schemeName": "Invesco India Ultra Short to Short Term Fund - Regular Plan - Monthly IDCW",
    "fundHouse": "Invesco Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short to Short Term Fund",
    "isinGrowth": null,
    "isinDivReinvestment": "INF205K01HW4"
  },
  {
    "schemeCode": 105024,
    "schemeName": "Invesco India Ultra Short to Short Term Fund - Regular Plan - Daily IDCW",
    "fundHouse": "Invesco Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short to Short Term Fund",
    "isinGrowth": null,
    "isinDivReinvestment": "INF205K01HU8"
  },
  {
    "schemeCode": 105187,
    "schemeName": "Invesco India Short Term Fund - Regular Plan - Monthly IDCW",
    "fundHouse": "Invesco Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Income/Debt Oriented Schemes - Short Term Fund",
    "isinGrowth": "INF205K01US5",
    "isinDivReinvestment": "INF205K01UT3"
  },
  {
    "schemeCode": 105192,
    "schemeName": "Invesco India Short Term Fund - Regular Plan - Weekly IDCW",
    "fundHouse": "Invesco Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Income/Debt Oriented Schemes - Short Term Fund",
    "isinGrowth": null,
    "isinDivReinvestment": "INF205K01UU1"
  },
  {
    "schemeCode": 106143,
    "schemeName": "Invesco India Large & Mid Cap Fund - Regular Plan - IDCW",
    "fundHouse": "Invesco Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Equity Schemes - Large & Mid Cap Fund",
    "isinGrowth": "INF205K01262",
    "isinDivReinvestment": "INF205K01254"
  },
  {
    "schemeCode": 106236,
    "schemeName": "Nippon India Large Cap Fund - Regular Plan - IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Equity Scheme - Large Cap Fund",
    "isinGrowth": "INF204K01539",
    "isinDivReinvestment": "INF204K01547"
  },
  {
    "schemeCode": 112122,
    "schemeName": "Invesco India Money Market Fund - Regular Plan - Monthly IDCW",
    "fundHouse": "Invesco Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Income/Debt Oriented Schemes - Money Market Fund",
    "isinGrowth": "INF205K01SH2",
    "isinDivReinvestment": "INF205K01SI0"
  },
  {
    "schemeCode": 112340,
    "schemeName": "Nippon India Liquid Fund - Regular Plan - QUARTERLY IDCW OPTION",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Debt Scheme - Liquid Fund",
    "isinGrowth": "INF204K01UQ2",
    "isinDivReinvestment": "INF204K01UR0"
  },
  {
    "schemeCode": 112341,
    "schemeName": "Nippon India Money Market Fund - Regular Plan - QUARTERLY IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Debt Scheme - Money Market Fund",
    "isinGrowth": "INF204K01VD8",
    "isinDivReinvestment": "INF204K01VE6"
  },
  {
    "schemeCode": 112937,
    "schemeName": "Nippon India Aggressive Hybrid Fund (Existing Number of Segregated Portfolios - 2) - Regular Plan - IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Hybrid Schemes - Aggressive Hybrid Fund",
    "isinGrowth": "INF204K01FX9",
    "isinDivReinvestment": "INF204K01FY7"
  },
  {
    "schemeCode": 113179,
    "schemeName": "Nippon India Small Cap Fund - Regular Plan - IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Equity Scheme - Small Cap Fund",
    "isinGrowth": "INF204K01IA1",
    "isinDivReinvestment": "INF204K01IB9"
  },
  {
    "schemeCode": 113346,
    "schemeName": "Nippon India Arbitrage Fund - Regular Plan - IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Hybrid Scheme - Arbitrage Fund",
    "isinGrowth": "INF204K01IZ8",
    "isinDivReinvestment": "INF204K01JA9"
  },
  {
    "schemeCode": 115458,
    "schemeName": "Invesco India Ultra Short to Short Term Fund - Regular Plan - Discretionary IDCW",
    "fundHouse": "Invesco Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short to Short Term Fund",
    "isinGrowth": "INF205K01IG5",
    "isinDivReinvestment": "INF205K01IF7"
  },
  {
    "schemeCode": 116075,
    "schemeName": "Invesco India Gold ETF Fund of Fund - Regular Plan - IDCW",
    "fundHouse": "Invesco Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Fund of Funds Scheme (Domestic) - Fund of Funds Scheme (Domestic)",
    "isinGrowth": "INF205K01FB2",
    "isinDivReinvestment": "INF205K01FC0"
  },
  {
    "schemeCode": 116109,
    "schemeName": "Invesco India Corporate Bond Fund - Regular Plan - Discretionary IDCW",
    "fundHouse": "Invesco Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Income/Debt Oriented Schemes - Corporate Bond Fund",
    "isinGrowth": "INF205K01RK8",
    "isinDivReinvestment": "INF205K01RL6"
  },
  {
    "schemeCode": 116488,
    "schemeName": "Invesco India Money Market Fund - Regular Plan - Daily IDCW",
    "fundHouse": "Invesco Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Income/Debt Oriented Schemes - Money Market Fund",
    "isinGrowth": null,
    "isinDivReinvestment": "INF205K01UW7"
  },
  {
    "schemeCode": 116653,
    "schemeName": "Invesco India Money Market Fund - Regular Plan - Discretionary IDCW",
    "fundHouse": "Invesco Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Income/Debt Oriented Schemes - Money Market Fund",
    "isinGrowth": "INF205K01SB5",
    "isinDivReinvestment": "INF205K01SC3"
  },
  {
    "schemeCode": 120443,
    "schemeName": "Invesco India Banking and PSU Debt Fund - Direct Plan - Daily IDCW",
    "fundHouse": "Invesco Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Income/Debt Oriented Schemes - Banking and PSU Debt Fund",
    "isinGrowth": null,
    "isinDivReinvestment": "INF205K01KS6"
  },
  {
    "schemeCode": 120500,
    "schemeName": "Invesco India Corporate Bond Fund - Direct Plan - Annual IDCW",
    "fundHouse": "Invesco Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Income/Debt Oriented Schemes - Corporate Bond Fund",
    "isinGrowth": "INF205K01RA9",
    "isinDivReinvestment": "INF205K01RB7"
  },
  {
    "schemeCode": 120530,
    "schemeName": "Invesco India Gold ETF Fund of Fund - Direct Plan - IDCW",
    "fundHouse": "Invesco Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Fund of Funds Scheme (Domestic) - Fund of Funds Scheme (Domestic)",
    "isinGrowth": "INF205K01NH3",
    "isinDivReinvestment": "INF205K01NI1"
  },
  {
    "schemeCode": 120561,
    "schemeName": "Invesco India Short Term Fund - Direct Plan - Monthly IDCW",
    "fundHouse": "Invesco Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Income/Debt Oriented Schemes - Short Term Fund",
    "isinGrowth": "INF205K01UI6",
    "isinDivReinvestment": "INF205K01UJ4"
  },
  {
    "schemeCode": 120567,
    "schemeName": "Invesco India Ultra Short to Short Term Fund - Direct Plan - Discretionary IDCW",
    "fundHouse": "Invesco Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short to Short Term Fund",
    "isinGrowth": "INF205K01NW2",
    "isinDivReinvestment": "INF205K01NX0"
  },
  {
    "schemeCode": 122765,
    "schemeName": "Nippon India Aggressive Hybrid Fund (Existing Number of Segregated Portfolios - 2) - Regular Plan - QUARTERLY IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Hybrid Schemes - Aggressive Hybrid Fund",
    "isinGrowth": "INF204K013R8",
    "isinDivReinvestment": "INF204K014R6"
  },
  {
    "schemeCode": 128820,
    "schemeName": "Nippon India Arbitrage Fund - Regular Plan - MONTHLY IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Hybrid Scheme - Arbitrage Fund",
    "isinGrowth": "INF204KA1MT1",
    "isinDivReinvestment": "INF204KA1MU9"
  },
  {
    "schemeCode": 133567,
    "schemeName": "Nippon India Retirement Fund- Wealth Creation Scheme - Regular Plan - IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Solution Oriented Scheme - Retirement Fund",
    "isinGrowth": "INF204KA1C06",
    "isinDivReinvestment": null
  },
  {
    "schemeCode": 133866,
    "schemeName": "Nippon India ELSS Tax Saver Fund - Regular Plan - ANNUAL IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Equity Schemes - ELSS- Tax Saver Fund",
    "isinGrowth": "INF204KA1E04",
    "isinDivReinvestment": null
  },
  {
    "schemeCode": 134596,
    "schemeName": "Nippon India Equity Savings Fund (Existing number of Segregated Portfolios - 2) - Regular Plan - IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Hybrid Scheme - Equity Savings",
    "isinGrowth": "INF204KA1W10",
    "isinDivReinvestment": "INF204KA1W28"
  },
  {
    "schemeCode": 134598,
    "schemeName": "Nippon India Equity Savings Fund (Existing number of Segregated Portfolios - 2) - Regular Plan - MONTHLY IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Hybrid Scheme - Equity Savings",
    "isinGrowth": "INF204KA1W51",
    "isinDivReinvestment": "INF204KA1W69"
  },
  {
    "schemeCode": 134600,
    "schemeName": "Nippon India Equity Savings Fund (Existing number of Segregated Portfolios - 2) - Regular Plan - QUARTERLY IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Hybrid Scheme - Equity Savings",
    "isinGrowth": "INF204KA1W36",
    "isinDivReinvestment": "INF204KA1W44"
  },
  {
    "schemeCode": 139680,
    "schemeName": "Nippon India Aggressive Hybrid Fund (Existing Number of Segregated Portfolios - 2) - Regular Plan - IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Hybrid Schemes - Aggressive Hybrid Fund",
    "isinGrowth": "INF204KB1BF2",
    "isinDivReinvestment": "INF204KB1BG0"
  },
  {
    "schemeCode": 148720,
    "schemeName": "Nippon India Nifty 50 Value 20 Index Fund - Regular Plan - IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Other Scheme - Index Funds",
    "isinGrowth": "INF204KB10Z4",
    "isinDivReinvestment": "INF204KB11Z2"
  },
  {
    "schemeCode": 149096,
    "schemeName": "Nippon India Flexi Cap Fund - Regular Plan - IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Equity Scheme - Flexi Cap Fund",
    "isinGrowth": "INF204KC1105",
    "isinDivReinvestment": "INF204KC1113"
  },
  {
    "schemeCode": 153692,
    "schemeName": "Nippon India MNC Fund - Regular Plan - IDCW Option",
    "fundHouse": "Nippon India Mutual Fund",
    "schemeType": "Open Ended Schemes",
    "schemeCategory": "Equity Schemes - Thematic Fund",
    "isinGrowth": "INF204KC1FP1",
    "isinDivReinvestment": "INF204KC1FQ9"
  }
];
