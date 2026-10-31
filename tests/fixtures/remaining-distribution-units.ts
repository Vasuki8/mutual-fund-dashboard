import type { FundMeta } from '../../src/lib/types.ts';

// Literal checkpoint-274 source observations and exact identities. Manifest:
// 6060d56e5dfa60a08a8591b99464fcec1e44093480e81ddcb9c9fae0e0e1dd9e.
// Python Decimal (precision60) independently calculated every expected NAV
// and boundary return directly from original source strings. Source document
// SHA values use compact insertion-order JSON, not pretty-printed file bytes.
// Evidence, source limits and all exclusions are in
// docs/REMAINING_DISTRIBUTION_REVIEW_2026-10-31.md.
export interface RemainingDistributionUnitFixture {
  meta: FundMeta;
  factor: number;
  oldNavThrough: string;
  firstNewNavDate: string;
  maxFactorDeviation: number;
  dates: string[];
  navs: number[];
  expectedNavs: number[];
  expectedBoundaryReturnFraction: number;
  retainedPreEventObservations: number;
  fetchedAt: string;
  sourceObservedAt: string;
  sourceDocumentSha256: string;
  gapProbe?: {
    dates: string[];
    navs: number[];
    expectedNavs: number[];
    gaps: { beforeDate: string; afterDate: string; calendarDays: number }[];
  };
}

export interface ExcludedRemainingDistributionFixture {
  meta: FundMeta;
  dates: string[];
  navs: number[];
  warnings: string[];
  rawLargeMoves: number;
  reason: string;
  fetchedAt: string;
  sourceObservedAt: string;
  sourceDocumentSha256: string;
}

export const REMAINING_DISTRIBUTION_UNIT_FIXTURES: RemainingDistributionUnitFixture[] = [
  {
    "meta": {
      "schemeCode": 100833,
      "schemeName": "Kotak Liquid Fund - Regular Plan - Daily Reinvestment of Income Distribution cum capital withdrawal option",
      "fundHouse": "Kotak Mahindra Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF174K01NL3"
    },
    "dates": [
      "2013-01-16",
      "2013-01-17",
      "2013-01-18",
      "2013-01-20",
      "2013-01-21",
      "2013-01-22"
    ],
    "navs": [
      12.2281,
      12.2281,
      12.2281,
      1222.81,
      1222.81,
      1222.81
    ],
    "fetchedAt": "2026-10-30T06:05:38.773Z",
    "sourceObservedAt": "2026-10-30T06:05:39.017Z",
    "sourceDocumentSha256": "1c9974934a07b8c64cccce6ce15b108277c0c8dde035707d2ba39a21b2a774af",
    "factor": 100,
    "oldNavThrough": "2013-01-18",
    "firstNewNavDate": "2013-01-20",
    "maxFactorDeviation": 0.1,
    "expectedNavs": [
      1222.81,
      1222.81,
      1222.81,
      1222.81,
      1222.81,
      1222.81
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 2071
  },
  {
    "meta": {
      "schemeCode": 101714,
      "schemeName": "Tata Liquid Fund - Regular Plan - Daily Reinvestment of IDCW Option",
      "fundHouse": "Tata Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF277K011D4"
    },
    "dates": [
      "2014-01-29",
      "2014-01-30",
      "2014-01-31",
      "2014-02-02",
      "2014-02-03",
      "2014-02-04"
    ],
    "navs": [
      10.0152,
      10.0152,
      10.0152,
      1001.5157,
      1001.5157,
      1001.5157
    ],
    "fetchedAt": "2026-10-30T06:22:00.060Z",
    "sourceObservedAt": "2026-10-30T06:22:01.767Z",
    "sourceDocumentSha256": "c0db8c08b89bdfb7a85d1bf79b15cb5fab24d0499f99ab60f82a145621765c9c",
    "factor": 100,
    "oldNavThrough": "2014-01-31",
    "firstNewNavDate": "2014-02-02",
    "maxFactorDeviation": 0.1,
    "expectedNavs": [
      1001.52,
      1001.52,
      1001.52,
      1001.5157,
      1001.5157,
      1001.5157
    ],
    "expectedBoundaryReturnFraction": -4.293473919642144e-06,
    "retainedPreEventObservations": 2304
  },
  {
    "meta": {
      "schemeCode": 101892,
      "schemeName": "Kotak Money Market Fund - Regular Plan - (Monthly Payout of Income Distribution cum capital withdrawal option)",
      "fundHouse": "Kotak Mahindra Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Money Market Fund",
      "isinGrowth": "INF174K018O0",
      "isinDivReinvestment": "INF174K01NB4"
    },
    "dates": [
      "2013-01-16",
      "2013-01-17",
      "2013-01-18",
      "2013-01-20",
      "2013-01-21",
      "2013-01-22"
    ],
    "navs": [
      10.0182,
      10.0205,
      10.0228,
      1002.7377,
      1002.9706,
      1003.2
    ],
    "fetchedAt": "2026-10-30T04:20:13.706Z",
    "sourceObservedAt": "2026-10-30T04:20:14.201Z",
    "sourceDocumentSha256": "9b82d70cdd0d14aba49c52e8033b75a8ed7e9a43faebba3c91715cdb1e5eb515",
    "factor": 100,
    "oldNavThrough": "2013-01-18",
    "firstNewNavDate": "2013-01-20",
    "maxFactorDeviation": 0.1,
    "expectedNavs": [
      1001.82,
      1002.05,
      1002.28,
      1002.7377,
      1002.9706,
      1003.2
    ],
    "expectedBoundaryReturnFraction": 0.000456658817895199,
    "retainedPreEventObservations": 2071
  },
  {
    "meta": {
      "schemeCode": 109349,
      "schemeName": "Canara Robeco Liquid Fund - Regular Plan - DAILY IDCW (Reinvestment)",
      "fundHouse": "Canara Robeco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF760K01CU3"
    },
    "dates": [
      "2011-08-18",
      "2011-08-19",
      "2011-08-20",
      "2011-08-21",
      "2011-08-22",
      "2011-08-23"
    ],
    "navs": [
      10.055,
      10.055,
      10.055,
      1005.5,
      1005.5,
      1005.5
    ],
    "fetchedAt": "2026-10-30T08:18:22.835Z",
    "sourceObservedAt": "2026-10-30T08:18:23.270Z",
    "sourceDocumentSha256": "4cb048d760deeca3e1abc50dad57be3f1dd36c6c1178d5b685c1d55a68467899",
    "factor": 100,
    "oldNavThrough": "2011-08-20",
    "firstNewNavDate": "2011-08-21",
    "maxFactorDeviation": 0.1,
    "expectedNavs": [
      1005.5,
      1005.5,
      1005.5,
      1005.5,
      1005.5,
      1005.5
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 1133
  },
  {
    "meta": {
      "schemeCode": 109350,
      "schemeName": "Canara Robeco Liquid Fund - Regular Plan - WEEKLY IDCW (Payout/Reinvestment)",
      "fundHouse": "Canara Robeco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": "INF760K01BZ4",
      "isinDivReinvestment": "INF760K01CZ2"
    },
    "dates": [
      "2011-08-18",
      "2011-08-19",
      "2011-08-20",
      "2011-08-21",
      "2011-08-22",
      "2011-08-23"
    ],
    "navs": [
      10.0,
      10.0,
      10.0,
      1000.0,
      1000.0,
      1000.0
    ],
    "fetchedAt": "2026-10-30T08:18:23.109Z",
    "sourceObservedAt": "2026-10-30T08:18:23.668Z",
    "sourceDocumentSha256": "e30a7566f8491601d0dc7b1761add8d50b480900bf496168ab2126065b245ec1",
    "factor": 100,
    "oldNavThrough": "2011-08-20",
    "firstNewNavDate": "2011-08-21",
    "maxFactorDeviation": 0.1,
    "expectedNavs": [
      1000.0,
      1000.0,
      1000.0,
      1000.0,
      1000.0,
      1000.0
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 1037
  },
  {
    "meta": {
      "schemeCode": 109366,
      "schemeName": "Canara Robeco Ultra Short Term Fund - Regular Plan - WEEKLY IDCW (Payout/Reinvestment)",
      "fundHouse": "Canara Robeco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short Term Fund",
      "isinGrowth": "INF760K01DE5",
      "isinDivReinvestment": "INF760K01DF2"
    },
    "dates": [
      "2011-08-17",
      "2011-08-18",
      "2011-08-19",
      "2011-08-22",
      "2011-08-23",
      "2011-08-24"
    ],
    "navs": [
      12.4071,
      12.4102,
      12.413,
      1242.2054,
      1242.5139,
      1240.71
    ],
    "fetchedAt": "2026-10-30T08:18:24.123Z",
    "sourceObservedAt": "2026-10-30T08:18:24.666Z",
    "sourceDocumentSha256": "243200e50c20119aba0dbe0b6c9260f02a7ca328f25bf07371a97d7f054547d6",
    "factor": 100,
    "oldNavThrough": "2011-08-19",
    "firstNewNavDate": "2011-08-22",
    "maxFactorDeviation": 0.1,
    "expectedNavs": [
      1240.71,
      1241.02,
      1241.3,
      1242.2054,
      1242.5139,
      1240.71
    ],
    "expectedBoundaryReturnFraction": 0.000729396600338355,
    "retainedPreEventObservations": 708
  },
  {
    "meta": {
      "schemeCode": 109372,
      "schemeName": "Canara Robeco Ultra Short Term Fund - Regular Plan - DAILY IDCW (Reinvestment)",
      "fundHouse": "Canara Robeco Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short Term Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF760K01DA3"
    },
    "dates": [
      "2011-08-17",
      "2011-08-18",
      "2011-08-19",
      "2011-08-22",
      "2011-08-23",
      "2011-08-24"
    ],
    "navs": [
      12.4071,
      12.4071,
      12.4071,
      1240.71,
      1240.71,
      1240.71
    ],
    "fetchedAt": "2026-10-30T08:18:24.827Z",
    "sourceObservedAt": "2026-10-30T08:18:25.123Z",
    "sourceDocumentSha256": "8767cac51eb639934c5bf90b8df8ef15dd72fe6292a5653012fa2c7f3d9ce440",
    "factor": 100,
    "oldNavThrough": "2011-08-19",
    "firstNewNavDate": "2011-08-22",
    "maxFactorDeviation": 0.1,
    "expectedNavs": [
      1240.71,
      1240.71,
      1240.71,
      1240.71,
      1240.71,
      1240.71
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 764
  },
  {
    "meta": {
      "schemeCode": 115400,
      "schemeName": "Union Liquid Fund - Regular Plan - Monthly IDCW Option",
      "fundHouse": "Union Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF582M01070",
      "isinDivReinvestment": "INF582M01054"
    },
    "dates": [
      "2011-09-27",
      "2011-09-28",
      "2011-09-29",
      "2011-10-02",
      "2011-10-03",
      "2011-10-04"
    ],
    "navs": [
      10.0018,
      10.0042,
      10.0067,
      1001.4144,
      1001.6508,
      1001.8917
    ],
    "fetchedAt": "2026-10-30T03:47:25.403Z",
    "sourceObservedAt": "2026-10-30T03:47:26.454Z",
    "sourceDocumentSha256": "e7f61ccf570776a7485b1a8caff0468c67b5c61b70677fff898981a66264fbbe",
    "factor": 100,
    "oldNavThrough": "2011-09-29",
    "firstNewNavDate": "2011-10-02",
    "maxFactorDeviation": 0.1,
    "expectedNavs": [
      1000.18,
      1000.42,
      1000.67,
      1001.4144,
      1001.6508,
      1001.8917
    ],
    "expectedBoundaryReturnFraction": 0.0007439015859374219,
    "retainedPreEventObservations": 88
  },
  {
    "meta": {
      "schemeCode": 115401,
      "schemeName": "Union Liquid Fund - Regular Plan - Daily IDCW Option",
      "fundHouse": "Union Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF582M01021"
    },
    "dates": [
      "2011-09-27",
      "2011-09-28",
      "2011-09-29",
      "2011-10-02",
      "2011-10-03",
      "2011-10-04"
    ],
    "navs": [
      10.0018,
      10.0018,
      10.0018,
      1000.18,
      1000.18,
      1000.18
    ],
    "fetchedAt": "2026-10-30T03:47:26.624Z",
    "sourceObservedAt": "2026-10-30T03:47:27.066Z",
    "sourceDocumentSha256": "6e04acc7957aa095da971a8687b66dad148f8de5e89e77832523d5cf155c0c68",
    "factor": 100,
    "oldNavThrough": "2011-09-29",
    "firstNewNavDate": "2011-10-02",
    "maxFactorDeviation": 0.1,
    "expectedNavs": [
      1000.18,
      1000.18,
      1000.18,
      1000.18,
      1000.18,
      1000.18
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 88
  },
  {
    "meta": {
      "schemeCode": 115402,
      "schemeName": "Union Liquid Fund - Regular Plan - Weekly IDCW Option",
      "fundHouse": "Union Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF582M01039"
    },
    "dates": [
      "2011-09-27",
      "2011-09-28",
      "2011-09-29",
      "2011-10-02",
      "2011-10-03",
      "2011-10-04"
    ],
    "navs": [
      10.0018,
      10.0042,
      10.0067,
      1001.4144,
      1001.6507,
      1000.18
    ],
    "fetchedAt": "2026-10-30T03:47:27.234Z",
    "sourceObservedAt": "2026-10-30T03:47:27.832Z",
    "sourceDocumentSha256": "24c589643dc20180ab385f9023bb8f98ab1e7f9b9ea535775d33425266deb9d5",
    "factor": 100,
    "oldNavThrough": "2011-09-29",
    "firstNewNavDate": "2011-10-02",
    "maxFactorDeviation": 0.1,
    "expectedNavs": [
      1000.18,
      1000.42,
      1000.67,
      1001.4144,
      1001.6507,
      1000.18
    ],
    "expectedBoundaryReturnFraction": 0.0007439015859374219,
    "retainedPreEventObservations": 88
  },
  {
    "meta": {
      "schemeCode": 119747,
      "schemeName": "Kotak Money Market Fund - Direct Plan - (Monthly Payout of Income Distribution cum capital withdrawal option)",
      "fundHouse": "Kotak Mahindra Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Money Market Fund",
      "isinGrowth": "INF174K019O8",
      "isinDivReinvestment": "INF174K01MX0"
    },
    "dates": [
      "2013-01-16",
      "2013-01-17",
      "2013-01-18",
      "2013-01-20",
      "2013-01-21",
      "2013-01-22"
    ],
    "navs": [
      10.064,
      10.0663,
      10.0687,
      1007.3341,
      1007.5687,
      1007.801
    ],
    "fetchedAt": "2026-10-30T20:01:14.113Z",
    "sourceObservedAt": "2026-10-30T20:01:14.518Z",
    "sourceDocumentSha256": "23e74678dcc626825afd7c22e57e551239c3ab620f2256efaf07d983a6692911",
    "factor": 100,
    "oldNavThrough": "2013-01-18",
    "firstNewNavDate": "2013-01-20",
    "maxFactorDeviation": 0.1,
    "expectedNavs": [
      1006.4,
      1006.63,
      1006.87,
      1007.3341,
      1007.5687,
      1007.801
    ],
    "expectedBoundaryReturnFraction": 0.0004609333876270025,
    "retainedPreEventObservations": 16,
    "gapProbe": {
      "dates": [
        "2013-01-16",
        "2013-01-17",
        "2013-01-18",
        "2013-01-20",
        "2013-01-21",
        "2013-01-22",
        "2013-03-21",
        "2013-03-22",
        "2013-04-22",
        "2013-04-23",
        "2013-06-11",
        "2013-06-12",
        "2013-08-12",
        "2013-08-13"
      ],
      "navs": [
        10.064,
        10.0663,
        10.0687,
        1007.3341,
        1007.5687,
        1007.801,
        1008.0039,
        1008.2543,
        1003.6831,
        1003.9189,
        1010.1022,
        1010.3266,
        1006.9386,
        1006.93
      ],
      "expectedNavs": [
        1006.4,
        1006.63,
        1006.87,
        1007.3341,
        1007.5687,
        1007.801,
        1008.0039,
        1008.2543,
        1003.6831,
        1003.9189,
        1010.1022,
        1010.3266,
        1006.9386,
        1006.93
      ],
      "gaps": [
        {
          "beforeDate": "2013-03-22",
          "afterDate": "2013-04-22",
          "calendarDays": 31
        },
        {
          "beforeDate": "2013-06-12",
          "afterDate": "2013-08-12",
          "calendarDays": 61
        }
      ]
    }
  },
  {
    "meta": {
      "schemeCode": 119764,
      "schemeName": "Kotak Liquid Fund - Direct Plan - Daily Reinvestment of Income Distribution cum capital withdrawal option",
      "fundHouse": "Kotak Mahindra Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF174K01NH1"
    },
    "dates": [
      "2013-01-16",
      "2013-01-17",
      "2013-01-18",
      "2013-01-20",
      "2013-01-21",
      "2013-01-22"
    ],
    "navs": [
      12.2281,
      12.2281,
      12.2281,
      1222.81,
      1222.81,
      1222.81
    ],
    "fetchedAt": "2026-10-30T20:01:12.718Z",
    "sourceObservedAt": "2026-10-30T20:01:13.545Z",
    "sourceDocumentSha256": "69ea3b209016cb714c8249d4560ac7e81fc94e858ea1cd812fc983c76b944258",
    "factor": 100,
    "oldNavThrough": "2013-01-18",
    "firstNewNavDate": "2013-01-20",
    "maxFactorDeviation": 0.1,
    "expectedNavs": [
      1222.81,
      1222.81,
      1222.81,
      1222.81,
      1222.81,
      1222.81
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 16
  },
  {
    "meta": {
      "schemeCode": 119862,
      "schemeName": "Tata Liquid Fund - Direct Plan - Daily Reinvestment of IDCW Option",
      "fundHouse": "Tata Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF277K012D2"
    },
    "dates": [
      "2014-01-29",
      "2014-01-30",
      "2014-01-31",
      "2014-02-02",
      "2014-02-03",
      "2014-02-04"
    ],
    "navs": [
      10.0152,
      10.0152,
      10.0152,
      1001.5187,
      1001.5187,
      1001.5187
    ],
    "fetchedAt": "2026-10-30T20:01:13.569Z",
    "sourceObservedAt": "2026-10-30T20:01:14.349Z",
    "sourceDocumentSha256": "e137524baaa23261d705e2432cf978feed94c8115e1092bae8efefdb7a9d4348",
    "factor": 100,
    "oldNavThrough": "2014-01-31",
    "firstNewNavDate": "2014-02-02",
    "maxFactorDeviation": 0.1,
    "expectedNavs": [
      1001.52,
      1001.52,
      1001.52,
      1001.5187,
      1001.5187,
      1001.5187
    ],
    "expectedBoundaryReturnFraction": -1.2980269989615785e-06,
    "retainedPreEventObservations": 333
  },
  {
    "meta": {
      "schemeCode": 120248,
      "schemeName": "LIC MF Liquid Fund - Direct Plan - Daily IDCW",
      "fundHouse": "LIC Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF767K01DL5",
      "isinDivReinvestment": "INF767K01DM3"
    },
    "dates": [
      "2013-01-18",
      "2013-01-19",
      "2013-01-20",
      "2013-01-21",
      "2013-01-22",
      "2013-01-23"
    ],
    "navs": [
      10.98,
      10.98,
      10.98,
      1098.0,
      1098.0,
      1098.0
    ],
    "fetchedAt": "2026-10-30T23:03:23.786Z",
    "sourceObservedAt": "2026-10-30T23:03:24.882Z",
    "sourceDocumentSha256": "c23a0b57c579b654be0a6682b1f67c147849e64b4b53d96b86c1486947b571a7",
    "factor": 100,
    "oldNavThrough": "2013-01-20",
    "firstNewNavDate": "2013-01-21",
    "maxFactorDeviation": 0.1,
    "expectedNavs": [
      1098.0,
      1098.0,
      1098.0,
      1098.0,
      1098.0,
      1098.0
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 20
  },
  {
    "meta": {
      "schemeCode": 140181,
      "schemeName": "Edelweiss Liquid Fund - Regular Plan - IDCW",
      "fundHouse": "Edelweiss Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF754K01HA7"
    },
    "dates": [
      "2017-06-28",
      "2017-06-29",
      "2017-06-30",
      "2017-07-02",
      "2017-07-03",
      "2017-07-04"
    ],
    "navs": [
      10.0279,
      10.0279,
      10.0279,
      1002.79,
      1002.79,
      1002.79
    ],
    "fetchedAt": "2026-10-31T02:21:10.325Z",
    "sourceObservedAt": "2026-10-31T02:21:10.679Z",
    "sourceDocumentSha256": "15f98c452c7e57d392928701e2bba8feb0ed5b2843987b9d731518cc8906c1f9",
    "factor": 100,
    "oldNavThrough": "2017-06-30",
    "firstNewNavDate": "2017-07-02",
    "maxFactorDeviation": 0.1,
    "expectedNavs": [
      1002.79,
      1002.79,
      1002.79,
      1002.79,
      1002.79,
      1002.79
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 180
  },
  {
    "meta": {
      "schemeCode": 140183,
      "schemeName": "Edelweiss Liquid Fund - Regular Plan - Monthly IDCW",
      "fundHouse": "Edelweiss Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF754K01HL4",
      "isinDivReinvestment": "INF754K01HD1"
    },
    "dates": [
      "2017-06-28",
      "2017-06-29",
      "2017-06-30",
      "2017-07-02",
      "2017-07-03",
      "2017-07-04"
    ],
    "navs": [
      10.0344,
      10.0361,
      10.0379,
      1004.1456,
      1004.327,
      1004.5072
    ],
    "fetchedAt": "2026-10-31T02:21:10.836Z",
    "sourceObservedAt": "2026-10-31T02:21:11.115Z",
    "sourceDocumentSha256": "c71112530b1a075db16881c95ee67c0c829997967f4859bd9584236c1cdd6e12",
    "factor": 100,
    "oldNavThrough": "2017-06-30",
    "firstNewNavDate": "2017-07-02",
    "maxFactorDeviation": 0.1,
    "expectedNavs": [
      1003.44,
      1003.61,
      1003.79,
      1004.1456,
      1004.327,
      1004.5072
    ],
    "expectedBoundaryReturnFraction": 0.00035425736458821066,
    "retainedPreEventObservations": 180
  },
  {
    "meta": {
      "schemeCode": 140185,
      "schemeName": "Edelweiss Liquid Fund - Regular Plan - Weekly IDCW",
      "fundHouse": "Edelweiss Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF754K01HJ8",
      "isinDivReinvestment": "INF754K01HB5"
    },
    "dates": [
      "2017-06-28",
      "2017-06-29",
      "2017-06-30",
      "2017-07-02",
      "2017-07-03",
      "2017-07-04"
    ],
    "navs": [
      10.18,
      10.1817,
      10.1835,
      1018.7143,
      1018.8983,
      1019.0811
    ],
    "fetchedAt": "2026-10-31T02:21:11.273Z",
    "sourceObservedAt": "2026-10-31T02:21:11.607Z",
    "sourceDocumentSha256": "0509f431c103ef09c2c3bcf5441351e3173a7f8d284a61498251c40e8fa82230",
    "factor": 100,
    "oldNavThrough": "2017-06-30",
    "firstNewNavDate": "2017-07-02",
    "maxFactorDeviation": 0.1,
    "expectedNavs": [
      1018.0,
      1018.17,
      1018.35,
      1018.7143,
      1018.8983,
      1019.0811
    ],
    "expectedBoundaryReturnFraction": 0.0003577355526096136,
    "retainedPreEventObservations": 180
  },
  {
    "meta": {
      "schemeCode": 140188,
      "schemeName": "Edelweiss Liquid Fund - Regular Plan - Annual IDCW",
      "fundHouse": "Edelweiss Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF754K01HQ3",
      "isinDivReinvestment": "INF754K01HP5"
    },
    "dates": [
      "2017-06-28",
      "2017-06-29",
      "2017-06-30",
      "2017-07-02",
      "2017-07-03",
      "2017-07-04"
    ],
    "navs": [
      14.6226,
      14.6251,
      14.6277,
      1463.2855,
      1463.5498,
      1463.8124
    ],
    "fetchedAt": "2026-10-31T02:21:11.748Z",
    "sourceObservedAt": "2026-10-31T02:21:12.262Z",
    "sourceDocumentSha256": "4e3b98dcc982059c700e2b79fbc49488b72c280e5942e6147c51da63d8a9cea9",
    "factor": 100,
    "oldNavThrough": "2017-06-30",
    "firstNewNavDate": "2017-07-02",
    "maxFactorDeviation": 0.1,
    "expectedNavs": [
      1462.26,
      1462.51,
      1462.77,
      1463.2855,
      1463.5498,
      1463.8124
    ],
    "expectedBoundaryReturnFraction": 0.0003524135715115842,
    "retainedPreEventObservations": 180
  },
  {
    "meta": {
      "schemeCode": 140193,
      "schemeName": "Edelweiss Liquid Fund - Direct Plan - Daily IDCW",
      "fundHouse": "Edelweiss Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF754K01GP7"
    },
    "dates": [
      "2017-06-28",
      "2017-06-29",
      "2017-06-30",
      "2017-07-02",
      "2017-07-03",
      "2017-07-04"
    ],
    "navs": [
      10.0101,
      10.0101,
      10.0101,
      1001.01,
      1001.01,
      1001.01
    ],
    "fetchedAt": "2026-10-30T04:03:56.680Z",
    "sourceObservedAt": "2026-10-30T04:03:56.932Z",
    "sourceDocumentSha256": "f388c183ae1a74749b07502e04df55c5ecedb87a9296dee56ebcc98896fce048",
    "factor": 100,
    "oldNavThrough": "2017-06-30",
    "firstNewNavDate": "2017-07-02",
    "maxFactorDeviation": 0.1,
    "expectedNavs": [
      1001.01,
      1001.01,
      1001.01,
      1001.01,
      1001.01,
      1001.01
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 180
  },
  {
    "meta": {
      "schemeCode": 140197,
      "schemeName": "Edelweiss Liquid Fund - Direct Plan - Monthly IDCW",
      "fundHouse": "Edelweiss Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF754K01GW3",
      "isinDivReinvestment": "INF754K01GS1"
    },
    "dates": [
      "2017-06-28",
      "2017-06-29",
      "2017-06-30",
      "2017-07-02",
      "2017-07-03",
      "2017-07-04"
    ],
    "navs": [
      10.0344,
      10.0362,
      10.038,
      1004.1599,
      1004.3442,
      1004.5273
    ],
    "fetchedAt": "2026-10-30T04:03:58.479Z",
    "sourceObservedAt": "2026-10-30T04:03:58.766Z",
    "sourceDocumentSha256": "72e0102b04d33d56f1b198804861f760b6d841aff22e925b9ea882a41c404eff",
    "factor": 100,
    "oldNavThrough": "2017-06-30",
    "firstNewNavDate": "2017-07-02",
    "maxFactorDeviation": 0.1,
    "expectedNavs": [
      1003.44,
      1003.62,
      1003.8,
      1004.1599,
      1004.3442,
      1004.5273
    ],
    "expectedBoundaryReturnFraction": 0.00035853755728232714,
    "retainedPreEventObservations": 180
  }
];

export const EXCLUDED_REMAINING_DISTRIBUTION_FIXTURES: ExcludedRemainingDistributionFixture[] = [
  {
    "meta": {
      "schemeCode": 100176,
      "schemeName": "Quant Small Cap Fund - Regular Plan - IDCW Option",
      "fundHouse": "quant Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Equity Scheme - Small Cap Fund",
      "isinGrowth": "INF206A01022",
      "isinDivReinvestment": "INF966L01044"
    },
    "dates": [
      "2015-05-22",
      "2015-05-25",
      "2015-05-26",
      "2015-05-27",
      "2015-05-28",
      "2015-05-29",
      "2015-06-01"
    ],
    "navs": [
      36.3952,
      36.4178,
      36.4281,
      12.0574,
      36.4415,
      36.4569,
      36.4912
    ],
    "fetchedAt": "2026-10-30T06:05:31.096Z",
    "sourceObservedAt": "2026-10-30T06:05:31.332Z",
    "sourceDocumentSha256": "85667e17178f730379f9279d20f31afb77317f281b8167d9a693e5ee2dde5001",
    "warnings": [
      "Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 2,
    "reason": "The issuer interface uses current option names and returns no code/ISIN; full dated historical identity bridge remains incomplete.; Missing 27 May 2015 on Small Cap does not authorize deleting the stored point.; Large & Mid Cap repeats 36.7479 on 27 May 2015; that cannot serve as a replacement or explain the spike.; No interpolated or sibling NAV is proposed."
  },
  {
    "meta": {
      "schemeCode": 100220,
      "schemeName": "JM Aggressive Hybrid Fund - Regular Plan - IDCW Option",
      "fundHouse": "JM Financial Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Hybrid Schemes - Aggressive Hybrid Fund",
      "isinGrowth": "INF192K01528",
      "isinDivReinvestment": "INF192K01536"
    },
    "dates": [
      "2015-03-20",
      "2015-03-23",
      "2015-03-24",
      "2015-03-25",
      "2015-03-26",
      "2015-03-27"
    ],
    "navs": [
      22.0243,
      21.9877,
      22.0305,
      13.151,
      13.06,
      13.0701
    ],
    "fetchedAt": "2026-10-30T06:05:33.030Z",
    "sourceObservedAt": "2026-10-30T06:05:33.797Z",
    "sourceDocumentSha256": "a2761bbf7d22887f48e7c2141c4e36a965645f4e7607711a6ff0e27667307d4f",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Distribution table is primary web-reader text; original GET 406 and visual screenshot failed.; Exact surrounding prior-day issuer NAV not independently retrieved; only the ex-NAV is explicitly published.; VerifiedNavReview currently requires a correction or restoration. No fabricated correction/restoration or new event waiver is proposed.; All raw observations and existing quality warnings remain. No distribution-adjusted total return established."
  },
  {
    "meta": {
      "schemeCode": 100549,
      "schemeName": "Franklin India Aggressive Hybrid Fund - Regular Plan - IDCW",
      "fundHouse": "Franklin Templeton Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Hybrid Scheme - Aggressive Hybrid Fund",
      "isinGrowth": "INF090I01825",
      "isinDivReinvestment": "INF090I01833"
    },
    "dates": [
      "2006-06-29",
      "2006-06-30",
      "2006-07-03",
      "2006-07-04",
      "2006-07-05",
      "2006-07-06",
      "2006-07-07"
    ],
    "navs": [
      17.902,
      18.4026,
      18.49,
      10.0725,
      18.7212,
      18.5991,
      18.3273
    ],
    "fetchedAt": "2026-10-30T03:13:07.556Z",
    "sourceObservedAt": "2026-10-30T03:13:08.054Z",
    "sourceDocumentSha256": "32ac3fdd300b81424a8234588398a95fedada84ff7ecc95574085e73938b7eba",
    "warnings": [
      "Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 2,
    "reason": "No exact original 4 July 2006 NAV or economic event explanation recovered.; Issuer page download returned 403; identity roster is current and full dated option chain remains incomplete.; Surrounding prices do not authorize interpolation or a fitted factor."
  },
  {
    "meta": {
      "schemeCode": 101407,
      "schemeName": "BARODA BNP PARIBAS LIQUID FUND - IDCW Option",
      "fundHouse": "Baroda BNP Paribas Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": "INF955L01559",
      "isinDivReinvestment": "INF955L01567"
    },
    "dates": [
      "2011-02-02",
      "2011-02-03",
      "2011-02-04",
      "2011-02-06",
      "2011-02-07",
      "2011-02-08"
    ],
    "navs": [
      14.3986,
      14.4016,
      14.4046,
      1441.059,
      1441.3614,
      1441.6674
    ],
    "fetchedAt": "2026-10-30T03:13:11.407Z",
    "sourceObservedAt": "2026-10-30T03:13:12.201Z",
    "sourceDocumentSha256": "c4b64feb2aac344b95afce2af830410f3ebd254df52dae2668eacd49a5c5713e",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "A 100x scale hypothesis matches the observed February 2011 boundary, but no original primary 2011 issuer/exchange/clearing conversion notice was located. A secondary report and similar arithmetic do not authorize an exact-code action.; Original primary 2011 conversion terms with precise legal/observed date and scope.; Primary historical rename/plan chain and literal dated option NAV anchors for this exact captured series.; Primary numeric-code and complete both-ISIN mapping for the generic legacy IDCW code 101407 was not located in the consulted current documents."
  },
  {
    "meta": {
      "schemeCode": 108692,
      "schemeName": "BANDHAN LIQUID Fund - Regular Plan - Daily IDCW",
      "fundHouse": "Bandhan Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF194K01VZ4",
      "isinDivReinvestment": "INF194K01VY7"
    },
    "dates": [
      "2011-11-02",
      "2011-11-03",
      "2011-11-04",
      "2011-11-05",
      "2011-11-06",
      "2011-11-07"
    ],
    "navs": [
      10.0025,
      10.0025,
      10.0025,
      1000.25,
      1000.25,
      1000.25
    ],
    "fetchedAt": "2026-10-30T08:18:22.366Z",
    "sourceObservedAt": "2026-10-30T08:18:22.668Z",
    "sourceDocumentSha256": "e0c4cec0d6c74a1164f4339c6e0dd1a05696ce6331d5a6a01b5a88df2907a26a",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Exact currentcode/option/ISINs found, but original primary5November2011 consolidation legal terms and dated option NAV anchors were not recovered.100x diagnostic scenario is a secondary discovery lead only. Preserveallrawdata and gaps."
  },
  {
    "meta": {
      "schemeCode": 108766,
      "schemeName": "Bandhan Medium to Long Term Fund - Regular Plan - Annual IDCW",
      "fundHouse": "Bandhan Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Medium to Long Term Fund",
      "isinGrowth": "INF194K01IN7",
      "isinDivReinvestment": "INF194K01IM9"
    },
    "dates": [
      "2016-03-15",
      "2016-03-16",
      "2016-03-17",
      "2016-03-18",
      "2016-03-21",
      "2016-03-22"
    ],
    "navs": [
      18.4997,
      18.5093,
      18.5321,
      11.0275,
      11.0428,
      11.0476
    ],
    "fetchedAt": "2026-10-30T08:18:24.955Z",
    "sourceObservedAt": "2026-10-30T08:18:25.254Z",
    "sourceDocumentSha256": "ac891ed67ba7f09c52e69513fcf9ca69bf88465ce0944c3b3e9168808405aaa2",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "2016-03-17→2016-03-18 drop is a nonunit anomaly. No primary exact dated distribution or reinvestment chain or corrected option NAV was recovered; the current SSD omits stored reinvestment ISIN INF194K01IM9 and uses Medium to Long Duration name. No inferred unit factor."
  },
  {
    "meta": {
      "schemeCode": 111707,
      "schemeName": "BARODA BNP PARIBAS LIQUID FUND - Regular Plan - Daily IDCW Option",
      "fundHouse": "Baroda BNP Paribas Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": "INF955L01468",
      "isinDivReinvestment": "INF955L01476"
    },
    "dates": [
      "2011-02-02",
      "2011-02-03",
      "2011-02-04",
      "2011-02-06",
      "2011-02-07",
      "2011-02-08"
    ],
    "navs": [
      10.0063,
      10.0063,
      10.0063,
      1000.63,
      1000.63,
      1000.63
    ],
    "fetchedAt": "2026-10-30T08:34:37.704Z",
    "sourceObservedAt": "2026-10-30T08:34:38.036Z",
    "sourceDocumentSha256": "681d87284e8517dd12de1a6d835c2a802c982e5cc083e37235d0892771a0a4d6",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "A 100x scale hypothesis matches the observed February 2011 boundary, but no original primary 2011 issuer/exchange/clearing conversion notice was located. A secondary report and similar arithmetic do not authorize an exact-code action.; Original primary 2011 conversion terms with precise legal/observed date and scope.; Primary historical rename/plan chain and literal dated option NAV anchors for this exact captured series."
  },
  {
    "meta": {
      "schemeCode": 112645,
      "schemeName": "Navi Liquid Fund - Regular Plan - Daily IDCW",
      "fundHouse": "Navi Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF959L01GM7"
    },
    "dates": [
      "2014-09-17",
      "2014-09-18",
      "2014-09-19",
      "2014-09-21",
      "2014-09-22",
      "2014-09-23",
      "2022-11-23",
      "2022-11-24",
      "2022-11-25",
      "2022-11-27",
      "2022-11-28",
      "2022-11-29"
    ],
    "navs": [
      10.0129,
      10.0129,
      10.0129,
      1001.29,
      1001.29,
      1001.29,
      1001.2902,
      1001.2902,
      1001.4629,
      10.0129,
      10.0129,
      10.0129
    ],
    "fetchedAt": "2026-10-30T03:47:06.350Z",
    "sourceObservedAt": "2026-10-30T03:47:07.176Z",
    "sourceDocumentSha256": "e9a2631b0185265cd420843650d9f8394a6715de6301daa50ed0d74f57aa9928",
    "warnings": [
      "Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 2,
    "reason": "Both legal denomination events and option NAV anchors are proved, but primary binding to the complete current stored ISIN tuple is missing. No partial or combined net factor of 1 adjustment is authorized. Both 2014 and 2022 events remain explicit in diagnostics."
  },
  {
    "meta": {
      "schemeCode": 112646,
      "schemeName": "Navi Liquid Fund - Regular Plan - Weekly IDCW",
      "fundHouse": "Navi Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF959L01GP0",
      "isinDivReinvestment": "INF959L01GQ8"
    },
    "dates": [
      "2014-09-17",
      "2014-09-18",
      "2014-09-19",
      "2014-09-21",
      "2014-09-22",
      "2014-09-23",
      "2022-11-23",
      "2022-11-24",
      "2022-11-25",
      "2022-11-27",
      "2022-11-28",
      "2022-11-29"
    ],
    "navs": [
      10.0093,
      10.0117,
      10.014,
      1001.8784,
      1002.1145,
      1000.6946,
      1000.8065,
      1000.9781,
      1001.1511,
      10.0149,
      10.0162,
      10.0064
    ],
    "fetchedAt": "2026-10-30T03:47:06.480Z",
    "sourceObservedAt": "2026-10-30T03:47:07.452Z",
    "sourceDocumentSha256": "7c4c7198d44f35d31b24a0099614bee80c8c083da2edd57e32704304ce8c59fe",
    "warnings": [
      "Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 2,
    "reason": "Both legal denomination events and option NAV anchors are proved, but primary binding to the complete current stored ISIN tuple is missing. No partial or combined net factor of 1 adjustment is authorized. Both 2014 and 2022 events remain explicit in diagnostics."
  },
  {
    "meta": {
      "schemeCode": 112647,
      "schemeName": "Navi Liquid Fund - Regular Plan - Monthly IDCW",
      "fundHouse": "Navi Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF959L01GN5",
      "isinDivReinvestment": "INF959L01GO3"
    },
    "dates": [
      "2014-09-17",
      "2014-09-18",
      "2014-09-19",
      "2014-09-21",
      "2014-09-22",
      "2014-09-23",
      "2022-11-23",
      "2022-11-24",
      "2022-11-25",
      "2022-11-27",
      "2022-11-28",
      "2022-11-29"
    ],
    "navs": [
      10.0741,
      10.0764,
      10.0788,
      1008.3603,
      1008.5979,
      1008.8342,
      1005.8085,
      1005.9793,
      1006.1532,
      10.065,
      10.0139,
      10.0157
    ],
    "fetchedAt": "2026-10-30T03:47:07.346Z",
    "sourceObservedAt": "2026-10-30T03:47:07.647Z",
    "sourceDocumentSha256": "4ee9dde37d39ea81047648f75500e184ba0248c3d5b39ba5031ceee9573f1542",
    "warnings": [
      "Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 2,
    "reason": "Both legal denomination events and option NAV anchors are proved, but primary binding to the complete current stored ISIN tuple is missing. No partial or combined net factor of 1 adjustment is authorized. Both 2014 and 2022 events remain explicit in diagnostics."
  },
  {
    "meta": {
      "schemeCode": 115399,
      "schemeName": "Union Liquid Fund - Regular Plan - Fortnightly IDCW Option",
      "fundHouse": "Union Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF582M01062",
      "isinDivReinvestment": "INF582M01047"
    },
    "dates": [
      "2011-07-08",
      "2011-07-10",
      "2011-07-11",
      "2011-10-18",
      "2011-10-19",
      "2011-10-20"
    ],
    "navs": [
      10.0096,
      10.0143,
      10.0018,
      1000.4272,
      1000.6714,
      1000.9151
    ],
    "fetchedAt": "2026-10-25T11:06:03.011Z",
    "sourceObservedAt": "2026-10-25T11:06:04.126Z",
    "sourceDocumentSha256": "0a0162be46a7d603f76d25d4ae970f49f1f1db0015808d9f6386d9604d40bde8",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Observed eventpair2011-07-11→2011-10-18 spans99days. Legal effective 2 October 2011 is inside the unobserved interval. Do not invent29September/2October observations or stretch short-boundary evidence to this gap. Separate41daygap also retained."
  },
  {
    "meta": {
      "schemeCode": 115489,
      "schemeName": "BANDHAN LIQUID Fund - Regular Plan - Periodic IDCW",
      "fundHouse": "Bandhan Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF194K01WC1",
      "isinDivReinvestment": "INF194K01WB3"
    },
    "dates": [
      "2011-11-02",
      "2011-11-03",
      "2011-11-04",
      "2011-11-05",
      "2011-11-06",
      "2011-11-07"
    ],
    "navs": [
      10.0663,
      10.0688,
      10.0712,
      1007.3679,
      1007.6118,
      1007.8557
    ],
    "fetchedAt": "2026-10-30T15:35:36.235Z",
    "sourceObservedAt": "2026-10-30T15:35:37.255Z",
    "sourceDocumentSha256": "82bd7771431fae236774fc1c5689379d68996783b37be738ac6c7a4721f5cc6e",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Exact currentcode/option/ISINs found, but original primary5November2011 consolidation legal terms and dated option NAV anchors were not recovered.100x diagnostic scenario is a secondary discovery lead only. Preserveallrawdata and gaps."
  },
  {
    "meta": {
      "schemeCode": 119161,
      "schemeName": "Navi Liquid Fund - Direct Plan - Monthly IDCW - Payout",
      "fundHouse": "Navi Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF959L01GG9",
      "isinDivReinvestment": "INF959L01GH7"
    },
    "dates": [
      "2014-09-17",
      "2014-09-18",
      "2014-09-19",
      "2014-09-21",
      "2014-09-22",
      "2014-09-23",
      "2022-11-23",
      "2022-11-24",
      "2022-11-25",
      "2022-11-27",
      "2022-11-28",
      "2022-11-29"
    ],
    "navs": [
      10.0755,
      10.0779,
      10.0804,
      1008.6188,
      1008.861,
      1009.1031,
      1005.8431,
      1006.0153,
      1006.1906,
      10.0654,
      10.0139,
      10.0157
    ],
    "fetchedAt": "2026-10-30T16:26:54.103Z",
    "sourceObservedAt": "2026-10-30T16:26:54.368Z",
    "sourceDocumentSha256": "1d5e00e0bd59b423b2856535e04c76db2fd93f895e15afe511f4660507bfeaa2",
    "warnings": [
      "Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 2,
    "reason": "Both legal denomination events and option NAV anchors are proved, but primary binding to the complete current stored ISIN tuple is missing. No partial or combined net factor of 1 adjustment is authorized. Both 2014 and 2022 events remain explicit in diagnostics."
  },
  {
    "meta": {
      "schemeCode": 119162,
      "schemeName": "Navi Liquid Fund - Direct Plan - Weekly IDCW - Payout",
      "fundHouse": "Navi Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF959L01GI5",
      "isinDivReinvestment": "INF959L01GJ3"
    },
    "dates": [
      "2014-09-17",
      "2014-09-18",
      "2014-09-19",
      "2014-09-21",
      "2014-09-22",
      "2014-09-23",
      "2022-11-23",
      "2022-11-24",
      "2022-11-25",
      "2022-11-27",
      "2022-11-28",
      "2022-11-29"
    ],
    "navs": [
      10.026,
      10.0284,
      10.0309,
      1003.3363,
      1003.5785,
      1000.2326,
      1000.7669,
      1000.9382,
      1001.1125,
      10.0146,
      10.0159,
      10.0061
    ],
    "fetchedAt": "2026-10-30T16:26:54.116Z",
    "sourceObservedAt": "2026-10-30T16:26:54.352Z",
    "sourceDocumentSha256": "59d8107ec2b5d206bd2ffd44442f585d7a28166bec33570330434ef688fc2264",
    "warnings": [
      "Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 2,
    "reason": "Both legal denomination events and option NAV anchors are proved, but primary binding to the complete current stored ISIN tuple is missing. No partial or combined net factor of 1 adjustment is authorized. Both 2014 and 2022 events remain explicit in diagnostics."
  },
  {
    "meta": {
      "schemeCode": 119163,
      "schemeName": "Navi Liquid Fund - Direct Plan - Daily IDCW - ReInvestment",
      "fundHouse": "Navi Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF959L01GK1"
    },
    "dates": [
      "2014-09-17",
      "2014-09-18",
      "2014-09-19",
      "2014-09-21",
      "2014-09-22",
      "2014-09-23",
      "2022-11-23",
      "2022-11-24",
      "2022-11-25",
      "2022-11-27",
      "2022-11-28",
      "2022-11-29"
    ],
    "navs": [
      10.0129,
      10.0129,
      10.0129,
      1001.29,
      1001.29,
      1001.29,
      1001.29,
      1001.29,
      1001.4662,
      10.0129,
      10.0129,
      10.0129
    ],
    "fetchedAt": "2026-10-30T16:26:54.510Z",
    "sourceObservedAt": "2026-10-30T16:26:54.772Z",
    "sourceDocumentSha256": "cbcd9dcdfe84523e7efbf5919321504dfcedce9b3d2c907424103519f7175a45",
    "warnings": [
      "Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 2,
    "reason": "Both legal denomination events and option NAV anchors are proved, but primary binding to the complete current stored ISIN tuple is missing. No partial or combined net factor of 1 adjustment is authorized. Both 2014 and 2022 events remain explicit in diagnostics."
  },
  {
    "meta": {
      "schemeCode": 120825,
      "schemeName": "Quant Large & Mid Cap Fund - Direct Plan - IDCW Option",
      "fundHouse": "quant Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Equity Scheme - Large & Mid Cap Fund",
      "isinGrowth": "INF966L01622",
      "isinDivReinvestment": "INF966L01630"
    },
    "dates": [
      "2015-05-22",
      "2015-05-25",
      "2015-05-26",
      "2015-05-27",
      "2015-05-28",
      "2015-05-29",
      "2015-06-01"
    ],
    "navs": [
      15.7034,
      15.6831,
      15.6784,
      36.7479,
      15.6339,
      15.8037,
      15.8377
    ],
    "fetchedAt": "2026-10-30T23:21:06.636Z",
    "sourceObservedAt": "2026-10-30T23:21:07.242Z",
    "sourceDocumentSha256": "8d3f251b6eecb730db06e5272eb7a59a2cff68f1afa875dc9825d54643f1dabf",
    "warnings": [
      "Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 2,
    "reason": "The issuer interface uses current option names and returns no code/ISIN; full dated historical identity bridge remains incomplete.; Missing 27 May 2015 on Small Cap does not authorize deleting the stored point.; Large & Mid Cap repeats 36.7479 on 27 May 2015; that cannot serve as a replacement or explain the spike.; No interpolated or sibling NAV is proposed."
  },
  {
    "meta": {
      "schemeCode": 120827,
      "schemeName": "Quant Small Cap Fund - Direct Plan - IDCW Option",
      "fundHouse": "quant Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Equity Scheme - Small Cap Fund",
      "isinGrowth": "INF966L01663",
      "isinDivReinvestment": "INF966L01671"
    },
    "dates": [
      "2015-05-22",
      "2015-05-25",
      "2015-05-26",
      "2015-05-27",
      "2015-05-28",
      "2015-05-29",
      "2015-06-01"
    ],
    "navs": [
      36.7165,
      36.7393,
      36.7497,
      12.2092,
      36.7632,
      36.7788,
      36.8134
    ],
    "fetchedAt": "2026-10-30T23:21:07.089Z",
    "sourceObservedAt": "2026-10-30T23:21:07.623Z",
    "sourceDocumentSha256": "c7330fc9d58f15bc50212175e7c5ac94a6609d1add172a85db34afa838b6ed2f",
    "warnings": [
      "Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 2,
    "reason": "The issuer interface uses current option names and returns no code/ISIN; full dated historical identity bridge remains incomplete.; Missing 27 May 2015 on Small Cap does not authorize deleting the stored point.; Large & Mid Cap repeats 36.7479 on 27 May 2015; that cannot serve as a replacement or explain the spike.; No interpolated or sibling NAV is proposed."
  },
  {
    "meta": {
      "schemeCode": 131388,
      "schemeName": "Bandhan Money  Market Fund - Direct Plan - Periodic IDCW",
      "fundHouse": "Bandhan Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Money Market Fund",
      "isinGrowth": "INF194KA1TJ9",
      "isinDivReinvestment": "INF194KA1TK7"
    },
    "dates": [
      "2016-03-18",
      "2016-03-21",
      "2016-03-22",
      "2016-03-23",
      "2016-03-28",
      "2016-03-29",
      "2016-03-30"
    ],
    "navs": [
      11.3666,
      11.3803,
      11.3818,
      30.4936,
      11.4154,
      11.4183,
      11.4237
    ],
    "fetchedAt": "2026-10-31T00:42:39.746Z",
    "sourceObservedAt": "2026-10-31T00:42:40.255Z",
    "sourceDocumentSha256": "0bfceb0c4f42c6bb8a92bc298a6df361bd0bc5bab9b51297a6e968497bc11faf",
    "warnings": [
      "Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 2,
    "reason": "Both the 2016-03-22 to 2016-03-23 rise and the 2016-03-23 to 2016-03-28 reversal are retained. No primary corrected 23 March 2016 option NAV or lawful unit event was recovered. The current SSD omits stored reinvestment ISIN INF194KA1TK7. Preserve the 240-day gap; no spike deletion."
  },
  {
    "meta": {
      "schemeCode": 131396,
      "schemeName": "BANDHAN Dynamic Term Fund - Direct Plan - Periodic IDCW",
      "fundHouse": "Bandhan Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Dynamic Term Fund",
      "isinGrowth": "INF194KA1TP6",
      "isinDivReinvestment": "INF194KA1TQ4"
    },
    "dates": [
      "2020-03-20",
      "2020-03-23",
      "2020-03-24",
      "2020-03-26",
      "2020-03-27",
      "2020-03-30"
    ],
    "navs": [
      17.0477,
      16.9206,
      16.9605,
      10.053,
      10.1615,
      10.1294
    ],
    "fetchedAt": "2026-10-31T00:42:40.003Z",
    "sourceObservedAt": "2026-10-31T00:42:40.882Z",
    "sourceDocumentSha256": "6b22dff441db9608a3153407b2ef2fe90e5cb4c388c6821a40ad5077bcb1d3e3",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "The nonunit drop from 2020-03-24 to 2020-03-26 lacks a primary exact dated distribution, reinvestment or corrected NAV chain. The current SSD omits stored reinvestment ISIN INF194KA1TQ4 and uses the Dynamic Bond name, while the current stored name is Dynamic Term. No inferred unit factor."
  },
  {
    "meta": {
      "schemeCode": 131476,
      "schemeName": "JM Aggressive Hybrid Fund - Regular Plan - Annual IDCW Option",
      "fundHouse": "JM Financial Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Hybrid Schemes - Aggressive Hybrid Fund",
      "isinGrowth": "INF192K01HF9",
      "isinDivReinvestment": "INF192K01HG7"
    },
    "dates": [
      "2018-03-19",
      "2018-03-20",
      "2018-03-21",
      "2018-03-22",
      "2018-03-23",
      "2018-03-26"
    ],
    "navs": [
      32.0313,
      32.0863,
      32.134,
      19.0713,
      18.9754,
      19.0415
    ],
    "fetchedAt": "2026-10-31T00:42:40.415Z",
    "sourceObservedAt": "2026-10-31T00:42:41.339Z",
    "sourceDocumentSha256": "7bd8f8a02edf3dfd050511dde7e63a14c9e838983d56a3230d977456231750a9",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Distribution table is primary web-reader text; original GET 406 and visual screenshot failed.; Exact surrounding prior-day issuer NAV not independently retrieved; only the ex-NAV is explicitly published.; VerifiedNavReview currently requires a correction or restoration. No fabricated correction/restoration or new event waiver is proposed.; All raw observations and existing quality warnings remain. No distribution-adjusted total return established."
  },
  {
    "meta": {
      "schemeCode": 134959,
      "schemeName": "JM Large Cap Fund - Regular Plan - Monthly IDCW Option",
      "fundHouse": "JM Financial Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Equity Schemes - Large Cap Fund",
      "isinGrowth": "INF192K01JH1",
      "isinDivReinvestment": "INF192K01JI9"
    },
    "dates": [
      "2018-03-19",
      "2018-03-20",
      "2018-03-21",
      "2018-03-22",
      "2018-03-23",
      "2018-03-26"
    ],
    "navs": [
      20.9234,
      20.968,
      20.998,
      11.9538,
      11.8961,
      11.9476
    ],
    "fetchedAt": "2026-10-31T01:32:24.370Z",
    "sourceObservedAt": "2026-10-31T01:32:24.937Z",
    "sourceDocumentSha256": "5471244045e0d4eecd13a61c1d0d6bbf599897647e8222c9647032fbe7bc8861",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Distribution table is primary web-reader text; original GET 406 and visual screenshot failed.; Exact surrounding prior-day issuer NAV not independently retrieved; only the ex-NAV is explicitly published.; VerifiedNavReview currently requires a correction or restoration. No fabricated correction/restoration or new event waiver is proposed.; All raw observations and existing quality warnings remain. No distribution-adjusted total return established."
  },
  {
    "meta": {
      "schemeCode": 134961,
      "schemeName": "JM Large Cap Fund - Regular Plan - Annual IDCW Option",
      "fundHouse": "JM Financial Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Equity Schemes - Large Cap Fund",
      "isinGrowth": "INF192K01JS8",
      "isinDivReinvestment": "INF192K01JT6"
    },
    "dates": [
      "2019-03-15",
      "2019-03-18",
      "2019-03-19",
      "2019-03-20",
      "2019-03-22",
      "2019-03-25"
    ],
    "navs": [
      27.55,
      27.5835,
      27.66,
      15.3962,
      15.3523,
      15.2877
    ],
    "fetchedAt": "2026-10-31T01:32:24.440Z",
    "sourceObservedAt": "2026-10-31T01:32:25.402Z",
    "sourceDocumentSha256": "6bdc8f8bbe0719162abb20dc981ea466aba82ea2841a7a6aade6cfc94bd01e52",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Distribution table is primary web-reader text; original GET 406 and visual screenshot failed.; Exact surrounding prior-day issuer NAV not independently retrieved; only the ex-NAV is explicitly published.; VerifiedNavReview currently requires a correction or restoration. No fabricated correction/restoration or new event waiver is proposed.; All raw observations and existing quality warnings remain. No distribution-adjusted total return established."
  },
  {
    "meta": {
      "schemeCode": 138341,
      "schemeName": "PGIM India Ultra Short Term Fund - Regular Plan - Regular IDCW",
      "fundHouse": "PGIM India Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short Term Fund",
      "isinGrowth": "INF223J01FO0",
      "isinDivReinvestment": "INF223J01FP7"
    },
    "dates": [
      "2019-09-24",
      "2019-09-25",
      "2019-09-26",
      "2019-09-27",
      "2019-09-30",
      "2019-10-01"
    ],
    "navs": [
      7.0886,
      7.0899,
      7.0912,
      10.2252,
      10.0794,
      10.0813
    ],
    "fetchedAt": "2026-10-26T17:38:15.992Z",
    "sourceObservedAt": "2026-10-26T17:38:16.897Z",
    "sourceDocumentSha256": "d01d65a4b1c80abefe789258af5a01d7c39abe96727cc14a7b34c01108b8b22b",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Secondary report links September 2019 rise to debt recovery; no original issuer event or exact option NAV confirmation found.; Original PGIM annual report returned 503; current fund page returned 403.; Do not fit a factor, remove dates, substitute sibling data, or add a warning exemption."
  },
  {
    "meta": {
      "schemeCode": 138342,
      "schemeName": "PGIM India Ultra Short Term Fund - Regular Plan - Regular IDCW",
      "fundHouse": "PGIM India Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short Term Fund",
      "isinGrowth": "INF223J01FH4",
      "isinDivReinvestment": null
    },
    "dates": [
      "2019-09-24",
      "2019-09-25",
      "2019-09-26",
      "2019-09-27",
      "2019-09-30",
      "2019-10-01"
    ],
    "navs": [
      7.0085,
      7.0098,
      7.011,
      10.0203,
      10.0203,
      10.0203
    ],
    "fetchedAt": "2026-10-26T17:38:15.993Z",
    "sourceObservedAt": "2026-10-26T17:38:16.726Z",
    "sourceDocumentSha256": "f97a2bec16883ad33176fea4a9fd91d84ce94c8baa59f9e39e9ad6b8fec7956d",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Secondary report links September 2019 rise to debt recovery; no original issuer event or exact option NAV confirmation found.; Original PGIM annual report returned 503; current fund page returned 403.; Do not fit a factor, remove dates, substitute sibling data, or add a warning exemption."
  },
  {
    "meta": {
      "schemeCode": 138344,
      "schemeName": "PGIM India Ultra Short Term Fund - Regular Plan - Regular IDCW",
      "fundHouse": "PGIM India Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short Term Fund",
      "isinGrowth": "INF223J01FL6",
      "isinDivReinvestment": "INF223J01FM4"
    },
    "dates": [
      "2019-09-24",
      "2019-09-25",
      "2019-09-26",
      "2019-09-27",
      "2019-09-30",
      "2019-10-01"
    ],
    "navs": [
      8.71,
      8.7116,
      8.7131,
      12.564,
      12.5672,
      12.5695
    ],
    "fetchedAt": "2026-10-26T17:38:17.060Z",
    "sourceObservedAt": "2026-10-26T17:38:17.319Z",
    "sourceDocumentSha256": "dc32c56389bdf503663cffaa6b8b8477ff6774df2cbfa82c3015680e243aeaad",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Secondary report links September 2019 rise to debt recovery; no original issuer event or exact option NAV confirmation found.; Original PGIM annual report returned 503; current fund page returned 403.; Do not fit a factor, remove dates, substitute sibling data, or add a warning exemption."
  },
  {
    "meta": {
      "schemeCode": 138359,
      "schemeName": "PGIM India Ultra Short Term Fund - Direct Plan - Direct IDCW",
      "fundHouse": "PGIM India Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short Term Fund",
      "isinGrowth": "INF223J01QP4",
      "isinDivReinvestment": null
    },
    "dates": [
      "2019-09-24",
      "2019-09-25",
      "2019-09-26",
      "2019-09-27",
      "2019-09-30",
      "2019-10-01"
    ],
    "navs": [
      8.2509,
      8.2525,
      8.254,
      11.902,
      11.9053,
      11.9075
    ],
    "fetchedAt": "2026-10-26T17:38:17.479Z",
    "sourceObservedAt": "2026-10-26T17:38:17.739Z",
    "sourceDocumentSha256": "f9c81ee4d44a69514edccbcc8eabcef961329cbb545d1c5073cd3f87758c66be",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Secondary report links September 2019 rise to debt recovery; no original issuer event or exact option NAV confirmation found.; Original PGIM annual report returned 503; current fund page returned 403.; Do not fit a factor, remove dates, substitute sibling data, or add a warning exemption."
  },
  {
    "meta": {
      "schemeCode": 138361,
      "schemeName": "PGIM India Ultra Short Term Fund - Direct Plan - Direct IDCW",
      "fundHouse": "PGIM India Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short Term Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF223J01QL3"
    },
    "dates": [
      "2019-09-24",
      "2019-09-25",
      "2019-09-26",
      "2019-09-27",
      "2019-09-30",
      "2019-10-01"
    ],
    "navs": [
      7.0073,
      7.0086,
      7.0099,
      10.0179,
      10.0179,
      10.0179
    ],
    "fetchedAt": "2026-10-26T17:38:17.727Z",
    "sourceObservedAt": "2026-10-26T17:38:17.982Z",
    "sourceDocumentSha256": "1b727da0f1e523ef1bc051470bfe046a4a8bf1be27b158e63b0252d9d6330603",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Secondary report links September 2019 rise to debt recovery; no original issuer event or exact option NAV confirmation found.; Original PGIM annual report returned 503; current fund page returned 403.; Do not fit a factor, remove dates, substitute sibling data, or add a warning exemption."
  },
  {
    "meta": {
      "schemeCode": 138362,
      "schemeName": "PGIM India Ultra Short Term Fund - Direct Plan - Direct IDCW",
      "fundHouse": "PGIM India Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short Term Fund",
      "isinGrowth": "INF223J01QR0",
      "isinDivReinvestment": "INF223J01QS8"
    },
    "dates": [
      "2019-09-24",
      "2019-09-25",
      "2019-09-26",
      "2019-09-27",
      "2019-09-30",
      "2019-10-01"
    ],
    "navs": [
      7.2213,
      7.2226,
      7.224,
      10.4167,
      10.2672,
      10.2691
    ],
    "fetchedAt": "2026-10-26T17:38:17.901Z",
    "sourceObservedAt": "2026-10-26T17:38:18.160Z",
    "sourceDocumentSha256": "985e2f39f2ea1774b3611707d0bd993f8e55de133e9a1c277be1aa3fc902f9ae",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Secondary report links September 2019 rise to debt recovery; no original issuer event or exact option NAV confirmation found.; Original PGIM annual report returned 503; current fund page returned 403.; Do not fit a factor, remove dates, substitute sibling data, or add a warning exemption."
  },
  {
    "meta": {
      "schemeCode": 139386,
      "schemeName": "Navi Liquid Fund - Regular Plan - Unclaimed Redemption and Dividend Plan less than 3 years",
      "fundHouse": "Navi Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF959L01CN4",
      "isinDivReinvestment": null
    },
    "dates": [
      "2022-11-23",
      "2022-11-24",
      "2022-11-25",
      "2022-11-27",
      "2022-11-28",
      "2022-11-29"
    ],
    "navs": [
      2396.7345,
      2397.1415,
      2397.5511,
      23.9837,
      23.9868,
      23.9912
    ],
    "fetchedAt": "2026-10-30T03:47:56.907Z",
    "sourceObservedAt": "2026-10-30T03:47:57.659Z",
    "sourceDocumentSha256": "f30479fc7982d2b785e54fa47af2bb6eeb953b0ebf56710c0767d6234cceb52f",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "A primary current ISIN bridge and exact unclaimed option plan binding are absent."
  },
  {
    "meta": {
      "schemeCode": 140184,
      "schemeName": "Edelweiss Liquid Fund - Regular Plan - Fortnightly IDCW",
      "fundHouse": "Edelweiss Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF754K01HK6",
      "isinDivReinvestment": "INF754K01HC3"
    },
    "dates": [
      "2017-09-14",
      "2017-09-15",
      "2017-09-17",
      "2017-09-18",
      "2017-10-11",
      "2017-10-12",
      "2017-10-13"
    ],
    "navs": [
      1949.1042,
      1018.0,
      1018.3653,
      1018.5418,
      2153.0912,
      2153.4776,
      2153.8607
    ],
    "fetchedAt": "2026-10-31T02:21:11.257Z",
    "sourceObservedAt": "2026-10-31T02:21:11.591Z",
    "sourceDocumentSha256": "6f541eb69c148bc646be1b44c16ce9cc62097ed1ac00bb792f69cc351a4d2b18",
    "warnings": [
      "Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 2,
    "reason": "The retained series begins 14 September 2017, after the July 2017 documented unit event. Its two flagged moves in September/October are nonunit anomalies; no primary event terms or exact historical option observations explain them. Do not fit a factor or delete the interval.; Exact contemporaneous Fortnightly option NAV/correction or documented corporate event explaining the 14→15 September drop and 18 September→11 October jump."
  },
  {
    "meta": {
      "schemeCode": 140437,
      "schemeName": "Navi Liquid Fund - Direct Plan - Unclaimed Redemption and Dividend Plan less than 3 years",
      "fundHouse": "Navi Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF959L01CO2",
      "isinDivReinvestment": null
    },
    "dates": [
      "2022-11-23",
      "2022-11-24",
      "2022-11-25",
      "2022-11-27",
      "2022-11-28",
      "2022-11-29"
    ],
    "navs": [
      1000.0,
      1000.0,
      1000.0,
      10.0,
      10.0,
      10.0
    ],
    "fetchedAt": "2026-10-31T02:38:10.804Z",
    "sourceObservedAt": "2026-10-31T02:38:13.017Z",
    "sourceDocumentSha256": "783b71ffe1b16a0c15ad6eabddf3c61a7a111d9bf8f8dd6efbb215863f9630fe",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Material issuer versus stored identity conflict: the official 29 October 2026 NAV workbook Sheet1 row 35 binds code 140437 to UNCLAIMED REDEM DIV GRTR THAN 3YRS, while the stored name says Direct Plan and less than 3 years. An exact NAV match does not resolve that identity conflict. The current ISIN bridge is also missing."
  },
  {
    "meta": {
      "schemeCode": 147605,
      "schemeName": "PGIM India Overnight Fund - Direct Plan - Direct IDCW",
      "fundHouse": "PGIM India Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Overnight Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF663L01T35"
    },
    "dates": [
      "2019-09-04",
      "2019-09-05",
      "2019-09-06",
      "2019-09-07",
      "2019-09-08",
      "2019-09-09"
    ],
    "navs": [
      10.0,
      10.0,
      10.0,
      1000.0,
      1000.0,
      1000.0
    ],
    "fetchedAt": "2026-10-29T20:48:46.151Z",
    "sourceObservedAt": "2026-10-29T20:48:46.390Z",
    "sourceDocumentSha256": "1f45b4b41660ded26ade108d4cd28f867a97cd5ce2311b902be9c6e09e052fee",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "No original issuer terms establishing 7 September 2019 conversion for these exact options.; Current face value 1000 and apparent 100 ratio are not enough to accept a historical adjustment.; Both stored ISIN fields, including nulls, are preserved; exact primary option pairing still required."
  },
  {
    "meta": {
      "schemeCode": 147607,
      "schemeName": "PGIM India Overnight Fund - Regular Plan - Regular IDCW",
      "fundHouse": "PGIM India Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Overnight Fund",
      "isinGrowth": "INF663L01T50",
      "isinDivReinvestment": "INF663L01T68"
    },
    "dates": [
      "2019-09-04",
      "2019-09-05",
      "2019-09-06",
      "2019-09-07",
      "2019-09-08",
      "2019-09-09"
    ],
    "navs": [
      10.0071,
      10.0085,
      10.0099,
      1000.144,
      1000.2879,
      1000.4289
    ],
    "fetchedAt": "2026-10-29T20:48:46.718Z",
    "sourceObservedAt": "2026-10-29T20:48:46.948Z",
    "sourceDocumentSha256": "d8098c9a6c5d44046cf5d5cd103611267f4db14229b5c48d5ef2fe19d77702b9",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "No original issuer terms establishing 7 September 2019 conversion for these exact options.; Current face value 1000 and apparent 100 ratio are not enough to accept a historical adjustment.; Both stored ISIN fields, including nulls, are preserved; exact primary option pairing still required."
  },
  {
    "meta": {
      "schemeCode": 147608,
      "schemeName": "PGIM India Overnight Fund - Direct Plan - Direct IDCW",
      "fundHouse": "PGIM India Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Overnight Fund",
      "isinGrowth": "INF663L01T19",
      "isinDivReinvestment": "INF663L01T27"
    },
    "dates": [
      "2019-09-04",
      "2019-09-05",
      "2019-09-06",
      "2019-09-07",
      "2019-09-08",
      "2019-09-09"
    ],
    "navs": [
      10.007,
      10.0085,
      10.0099,
      1000.1896,
      1000.3374,
      1000.483
    ],
    "fetchedAt": "2026-10-29T20:48:46.958Z",
    "sourceObservedAt": "2026-10-29T20:48:47.190Z",
    "sourceDocumentSha256": "924dd92057d24932351ecc306e362b86a6cf62ea007cf608475139e02f757aa3",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "No original issuer terms establishing 7 September 2019 conversion for these exact options.; Current face value 1000 and apparent 100 ratio are not enough to accept a historical adjustment.; Both stored ISIN fields, including nulls, are preserved; exact primary option pairing still required."
  },
  {
    "meta": {
      "schemeCode": 147609,
      "schemeName": "PGIM India Overnight Fund - Regular Plan - Regular IDCW",
      "fundHouse": "PGIM India Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Overnight Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF663L01T76"
    },
    "dates": [
      "2019-09-04",
      "2019-09-05",
      "2019-09-06",
      "2019-09-07",
      "2019-09-08",
      "2019-09-09"
    ],
    "navs": [
      10.0,
      10.0,
      10.0,
      1000.0,
      1000.0,
      1000.0
    ],
    "fetchedAt": "2026-10-29T20:48:47.107Z",
    "sourceObservedAt": "2026-10-29T20:48:47.326Z",
    "sourceDocumentSha256": "9c105fa0c3b0668d4dedaa9f5afaf79eea2da66c6a8a0c6e0d83c8cf72132e31",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "No original issuer terms establishing 7 September 2019 conversion for these exact options.; Current face value 1000 and apparent 100 ratio are not enough to accept a historical adjustment.; Both stored ISIN fields, including nulls, are preserved; exact primary option pairing still required."
  },
  {
    "meta": {
      "schemeCode": 147834,
      "schemeName": "JM Overnight Fund - Regular Plan - Weekly IDCW Option",
      "fundHouse": "JM Financial Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Overnight Fund",
      "isinGrowth": "INF192K01LV8",
      "isinDivReinvestment": "INF192K01LW6"
    },
    "dates": [
      "2019-12-10",
      "2019-12-11",
      "2019-12-12",
      "2019-12-13",
      "2019-12-15",
      "2019-12-16"
    ],
    "navs": [
      10.0,
      10.0013,
      10.0025,
      1000.3757,
      1000.7076,
      1000.8375
    ],
    "fetchedAt": "2026-10-29T21:05:48.897Z",
    "sourceObservedAt": "2026-10-29T21:05:49.248Z",
    "sourceDocumentSha256": "daebee8dcbc47cb95e3da29effa3b6a06b8c422605d7834e7019b90349b6bd42",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Dated original conversion notice and exact option boundary NAVs are needed to reconcile 13 versus 14 December.; Current face value and an apparent factor 100 cannot resolve the date conflict.; Annual evidence remains web-reader text, with no original bytes or successful visual verification."
  },
  {
    "meta": {
      "schemeCode": 147835,
      "schemeName": "JM Overnight Fund - Direct Plan - Weekly IDCW Option",
      "fundHouse": "JM Financial Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Overnight Fund",
      "isinGrowth": "INF192K01LZ9",
      "isinDivReinvestment": "INF192K01MA0"
    },
    "dates": [
      "2019-12-10",
      "2019-12-11",
      "2019-12-12",
      "2019-12-13",
      "2019-12-15",
      "2019-12-16"
    ],
    "navs": [
      10.0,
      10.0013,
      10.0025,
      1000.3789,
      1000.7109,
      1000.8418
    ],
    "fetchedAt": "2026-10-29T21:05:49.406Z",
    "sourceObservedAt": "2026-10-29T21:05:49.630Z",
    "sourceDocumentSha256": "47399bc5ed773335408d30e5589f7add37a450e2518a788630933ec87464641c",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Dated original conversion notice and exact option boundary NAVs are needed to reconcile 13 versus 14 December.; Current face value and an apparent factor 100 cannot resolve the date conflict.; Annual evidence remains web-reader text, with no original bytes or successful visual verification."
  },
  {
    "meta": {
      "schemeCode": 147838,
      "schemeName": "JM Overnight Fund - Direct Plan - Daily IDCW Option",
      "fundHouse": "JM Financial Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Overnight Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF192K01LY2"
    },
    "dates": [
      "2019-12-10",
      "2019-12-11",
      "2019-12-12",
      "2019-12-13",
      "2019-12-15",
      "2019-12-16"
    ],
    "navs": [
      10.0,
      10.0,
      10.0,
      1000.0,
      1000.0,
      1000.0
    ],
    "fetchedAt": "2026-10-29T21:05:50.551Z",
    "sourceObservedAt": "2026-10-29T21:05:50.773Z",
    "sourceDocumentSha256": "efd001ef91dad39fb91a1bd9a4080eba9a7079ba993e280406b4f79a5e7f5ea9",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Dated original conversion notice and exact option boundary NAVs are needed to reconcile 13 versus 14 December.; Current face value and an apparent factor 100 cannot resolve the date conflict.; Annual evidence remains web-reader text, with no original bytes or successful visual verification."
  },
  {
    "meta": {
      "schemeCode": 147839,
      "schemeName": "JM Overnight Fund - Regular Plan - Daily IDCW Option",
      "fundHouse": "JM Financial Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Overnight Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF192K01LU0"
    },
    "dates": [
      "2019-12-10",
      "2019-12-11",
      "2019-12-12",
      "2019-12-13",
      "2019-12-15",
      "2019-12-16"
    ],
    "navs": [
      10.0,
      10.0,
      10.0,
      1000.0,
      1000.0,
      1000.0
    ],
    "fetchedAt": "2026-10-29T21:05:50.930Z",
    "sourceObservedAt": "2026-10-29T21:05:51.155Z",
    "sourceDocumentSha256": "5065c52dcacba9111019e02f874e1b64fc8839c6dca21429b100cf29bba4d7db",
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Dated original conversion notice and exact option boundary NAVs are needed to reconcile 13 versus 14 December.; Current face value and an apparent factor 100 cannot resolve the date conflict.; Annual evidence remains web-reader text, with no original bytes or successful visual verification."
  }
];
