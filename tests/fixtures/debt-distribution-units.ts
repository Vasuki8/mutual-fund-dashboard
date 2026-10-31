import type { FundMeta } from '../../src/lib/types.ts';

// Literal retained metadata and real event observations from checkpoint 268.
// Manifest SHA-256: d91fddfc92fb514d1e7b5050ccc9b5aca9a4b05fac0af7b9652e9ecd68da1190.
// Python Decimal (precision 60) independently produced expected NAVs and returns;
// no production adjustment functions were used to derive these expectations.
// Four Birla Overnight histories retain only ONE pre-event observation. Missing
// observations must not be synthesized to force an event index of two.
// Scope, primary evidence, exclusions and source gaps:
// docs/DISTRIBUTION_NAV_BATCH_2026-10-31.md.
export interface DebtDistributionUnitFixture {
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

export interface ExcludedDebtDistributionFixture {
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

export const DEBT_DISTRIBUTION_UNIT_FIXTURES: DebtDistributionUnitFixture[] = [
  {
    "meta": {
      "schemeCode": 100046,
      "schemeName": "Aditya Birla Sun Life Liquid Fund - Regular Plan - Daily IDCW",
      "fundHouse": "Aditya Birla Sun Life Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": "INF209K01KQ2",
      "isinDivReinvestment": "INF209K01SQ5"
    },
    "factor": 10,
    "oldNavThrough": "2011-10-06",
    "firstNewNavDate": "2011-10-07",
    "maxFactorDeviation": 0.05,
    "dates": [
      "2011-10-05",
      "2011-10-06",
      "2011-10-07",
      "2011-10-09"
    ],
    "navs": [
      10.0195,
      10.0195,
      100.195,
      100.195
    ],
    "expectedNavs": [
      100.195,
      100.195,
      100.195,
      100.195
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 1681,
    "fetchedAt": "2026-10-30T02:57:12.751Z",
    "sourceObservedAt": "2026-10-30T02:57:13.892Z",
    "sourceDocumentSha256": "80ce92c3fa5282dcec6914d9b6954ebc3975fa16825b21e912d7e1920117c200"
  },
  {
    "meta": {
      "schemeCode": 100051,
      "schemeName": "Aditya Birla Sun Life Liquid Fund - Regular Plan - Weekly IDCW",
      "fundHouse": "Aditya Birla Sun Life Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": "INF209K01KU4",
      "isinDivReinvestment": "INF209KA1LJ9"
    },
    "factor": 10,
    "oldNavThrough": "2011-10-06",
    "firstNewNavDate": "2011-10-07",
    "maxFactorDeviation": 0.05,
    "dates": [
      "2011-10-05",
      "2011-10-06",
      "2011-10-07",
      "2011-10-09"
    ],
    "navs": [
      10.0273,
      10.0296,
      100.225,
      100.2734
    ],
    "expectedNavs": [
      100.273,
      100.296,
      100.225,
      100.2734
    ],
    "expectedBoundaryReturnFraction": -0.0007079046023769641,
    "retainedPreEventObservations": 1681,
    "fetchedAt": "2026-10-30T02:57:14.027Z",
    "sourceObservedAt": "2026-10-30T02:57:14.790Z",
    "sourceDocumentSha256": "1ca6f554176118b4ed0f4f00347a5b07df63207be0e61e6ee195e4a1fdc83165"
  },
  {
    "meta": {
      "schemeCode": 100874,
      "schemeName": "HDFC Liquid Fund - Regular Plan - IDCW Plan Weekly",
      "fundHouse": "HDFC Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF179KB1ID3",
      "isinDivReinvestment": null
    },
    "factor": 100,
    "oldNavThrough": "2015-08-28",
    "firstNewNavDate": "2015-08-30",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2015-08-27",
      "2015-08-28",
      "2015-08-30",
      "2015-08-31"
    ],
    "navs": [
      10.3166,
      10.3188,
      1032.32,
      1032.5288
    ],
    "expectedNavs": [
      1031.66,
      1031.88,
      1032.32,
      1032.5288
    ],
    "expectedBoundaryReturnFraction": 0.00042640617126022404,
    "retainedPreEventObservations": 2813,
    "fetchedAt": "2026-10-30T03:13:04.766Z",
    "sourceObservedAt": "2026-10-30T03:13:05.292Z",
    "sourceDocumentSha256": "010c0550f2accda7c830a8e0d0e3371c6762b40e7a137965bb9a0b61051005bc",
    "gapProbe": {
      "dates": [
        "2006-05-01",
        "2006-06-04",
        "2006-06-18",
        "2015-08-27",
        "2015-08-28",
        "2015-08-30",
        "2015-08-31"
      ],
      "navs": [
        10.2812,
        10.3,
        10.3082,
        10.3166,
        10.3188,
        1032.32,
        1032.5288
      ],
      "expectedNavs": [
        1028.12,
        1030.0,
        1030.82,
        1031.66,
        1031.88,
        1032.32,
        1032.5288
      ],
      "gaps": [
        {
          "beforeDate": "2006-05-01",
          "afterDate": "2006-06-04",
          "calendarDays": 34
        },
        {
          "beforeDate": "2006-06-04",
          "afterDate": "2006-06-18",
          "calendarDays": 14
        }
      ]
    }
  },
  {
    "meta": {
      "schemeCode": 100875,
      "schemeName": "HDFC Liquid Fund - Regular Plan - IDCW Daily",
      "fundHouse": "HDFC Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF179KB1IC5"
    },
    "factor": 100,
    "oldNavThrough": "2015-08-28",
    "firstNewNavDate": "2015-08-30",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2015-08-27",
      "2015-08-28",
      "2015-08-30",
      "2015-08-31"
    ],
    "navs": [
      10.1982,
      10.1982,
      1019.82,
      1019.82
    ],
    "expectedNavs": [
      1019.82,
      1019.82,
      1019.82,
      1019.82
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 2875,
    "fetchedAt": "2026-10-30T03:13:05.469Z",
    "sourceObservedAt": "2026-10-30T03:13:05.793Z",
    "sourceDocumentSha256": "35bc278bcf12a717aebbddbf01c7f61a118bcac877ee68f8063c71b60b4ce958"
  },
  {
    "meta": {
      "schemeCode": 100876,
      "schemeName": "HDFC Liquid Fund - Regular Plan - IDCW Monthly",
      "fundHouse": "HDFC Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF179KB1HM6",
      "isinDivReinvestment": "INF179KB1HL8"
    },
    "factor": 100,
    "oldNavThrough": "2015-08-28",
    "firstNewNavDate": "2015-08-30",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2015-08-27",
      "2015-08-28",
      "2015-08-30",
      "2015-08-31"
    ],
    "navs": [
      10.3307,
      10.3329,
      1033.73,
      1033.9378
    ],
    "expectedNavs": [
      1033.07,
      1033.29,
      1033.73,
      1033.9378
    ],
    "expectedBoundaryReturnFraction": 0.0004258243087613352,
    "retainedPreEventObservations": 2875,
    "fetchedAt": "2026-10-30T03:13:05.970Z",
    "sourceObservedAt": "2026-10-30T03:13:06.524Z",
    "sourceDocumentSha256": "fd4f07056f567e5a50f8ce6a61b2694214e887f546abba8ce88788beee7f5dbe"
  },
  {
    "meta": {
      "schemeCode": 101973,
      "schemeName": "Aditya Birla Sun Life Money Market Fund - Regular Plan - Daily IDCW",
      "fundHouse": "Aditya Birla Sun Life Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Money Market Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF209K01SZ6"
    },
    "factor": 10,
    "oldNavThrough": "2011-10-06",
    "firstNewNavDate": "2011-10-07",
    "maxFactorDeviation": 0.01,
    "dates": [
      "2011-10-05",
      "2011-10-06",
      "2011-10-07",
      "2011-10-09"
    ],
    "navs": [
      10.002,
      10.002,
      100.02,
      100.02
    ],
    "expectedNavs": [
      100.02,
      100.02,
      100.02,
      100.02
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 1681,
    "fetchedAt": "2026-10-30T06:38:57.928Z",
    "sourceObservedAt": "2026-10-30T06:38:58.177Z",
    "sourceDocumentSha256": "7a85449575f3c251c30677e59120fc4c418585f2b2a1f83ad401243b9babca6a"
  },
  {
    "meta": {
      "schemeCode": 101974,
      "schemeName": "Aditya Birla Sun Life Money Market Fund - Regular Plan - Weekly IDCW",
      "fundHouse": "Aditya Birla Sun Life Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Money Market Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF209K01SY9"
    },
    "factor": 10,
    "oldNavThrough": "2011-10-06",
    "firstNewNavDate": "2011-10-07",
    "maxFactorDeviation": 0.01,
    "dates": [
      "2011-10-05",
      "2011-10-06",
      "2011-10-07",
      "2011-10-09"
    ],
    "navs": [
      10.0126,
      10.0151,
      100.1757,
      100.1253
    ],
    "expectedNavs": [
      100.126,
      100.151,
      100.1757,
      100.1253
    ],
    "expectedBoundaryReturnFraction": 0.0002466275923355733,
    "retainedPreEventObservations": 1628,
    "fetchedAt": "2026-10-30T06:38:58.357Z",
    "sourceObservedAt": "2026-10-30T06:38:59.234Z",
    "sourceDocumentSha256": "52b81ef1e7af03c7591edf2bcf0d4877d3a5ea9227661e54a91318050dd54646",
    "gapProbe": {
      "dates": [
        "2006-05-17",
        "2006-06-04",
        "2006-06-19",
        "2006-07-06",
        "2006-07-21",
        "2006-07-26",
        "2006-08-04",
        "2011-10-05",
        "2011-10-06",
        "2011-10-07",
        "2011-10-09"
      ],
      "navs": [
        10.0163,
        10.0,
        10.0,
        10.0,
        10.0181,
        10.0167,
        10.0185,
        10.0126,
        10.0151,
        100.1757,
        100.1253
      ],
      "expectedNavs": [
        100.163,
        100.0,
        100.0,
        100.0,
        100.181,
        100.167,
        100.185,
        100.126,
        100.151,
        100.1757,
        100.1253
      ],
      "gaps": [
        {
          "beforeDate": "2006-05-17",
          "afterDate": "2006-06-04",
          "calendarDays": 18
        },
        {
          "beforeDate": "2006-06-19",
          "afterDate": "2006-07-06",
          "calendarDays": 17
        },
        {
          "beforeDate": "2006-07-06",
          "afterDate": "2006-07-21",
          "calendarDays": 15
        },
        {
          "beforeDate": "2006-07-26",
          "afterDate": "2006-08-04",
          "calendarDays": 9
        }
      ]
    }
  },
  {
    "meta": {
      "schemeCode": 101994,
      "schemeName": "HDFC Money Market Fund - Regular Plan - Daily IDCW Option",
      "fundHouse": "HDFC Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Money Market Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF179KB1IG6"
    },
    "factor": 100,
    "oldNavThrough": "2015-08-28",
    "firstNewNavDate": "2015-08-30",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2015-08-27",
      "2015-08-28",
      "2015-08-30",
      "2015-08-31"
    ],
    "navs": [
      10.6364,
      10.6364,
      1063.64,
      1063.64
    ],
    "expectedNavs": [
      1063.64,
      1063.64,
      1063.64,
      1063.64
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 2875,
    "fetchedAt": "2026-10-30T06:40:04.887Z",
    "sourceObservedAt": "2026-10-30T06:40:06.207Z",
    "sourceDocumentSha256": "f78010f5d1ba748a15a87a1deaee2752095c2d29a9f4c87aa1578d6c508d1a00"
  },
  {
    "meta": {
      "schemeCode": 101997,
      "schemeName": "HDFC Overnight Fund - Regular Plan - IDCW Option (Daily)",
      "fundHouse": "HDFC Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Overnight Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF179KB1IF8"
    },
    "factor": 100,
    "oldNavThrough": "2015-08-28",
    "firstNewNavDate": "2015-08-30",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2015-08-27",
      "2015-08-28",
      "2015-08-30",
      "2015-08-31"
    ],
    "navs": [
      10.4266,
      10.4266,
      1042.66,
      1042.66
    ],
    "expectedNavs": [
      1042.66,
      1042.66,
      1042.66,
      1042.66
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 2876,
    "fetchedAt": "2026-10-27T02:40:47.894Z",
    "sourceObservedAt": "2026-10-27T02:40:48.439Z",
    "sourceDocumentSha256": "eab2e51ce9352d61acce0f83a6ac8a117f04bd6ccc3e11facba8e4428c59c0ab"
  },
  {
    "meta": {
      "schemeCode": 103193,
      "schemeName": "Aditya Birla Sun Life Ultra short to short term Fund - Regular Plan - Weekly IDCW",
      "fundHouse": "Aditya Birla Sun Life Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short to Short Term Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF209KA1LQ4"
    },
    "factor": 10,
    "oldNavThrough": "2011-10-05",
    "firstNewNavDate": "2011-10-07",
    "maxFactorDeviation": 0.01,
    "dates": [
      "2011-10-04",
      "2011-10-05",
      "2011-10-07",
      "2011-10-10"
    ],
    "navs": [
      10.0215,
      10.0045,
      100.088,
      100.1576
    ],
    "expectedNavs": [
      100.215,
      100.045,
      100.088,
      100.1576
    ],
    "expectedBoundaryReturnFraction": 0.00042980658703583387,
    "retainedPreEventObservations": 1608,
    "fetchedAt": "2026-10-30T03:31:18.121Z",
    "sourceObservedAt": "2026-10-30T03:31:19.833Z",
    "sourceDocumentSha256": "176d44f89d81c6bd2ce00e86780afa12a004d31a2a550cfe1d60fbfa872c84dc"
  },
  {
    "meta": {
      "schemeCode": 103884,
      "schemeName": "SBI ULTRA SHORT TERM FUND - Regular Plan - IDCW",
      "fundHouse": "SBI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short Term Fund",
      "isinGrowth": "INF200K01LM8",
      "isinDivReinvestment": "INF200K01LL0"
    },
    "factor": 100,
    "oldNavThrough": "2012-01-12",
    "firstNewNavDate": "2012-01-13",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2012-01-11",
      "2012-01-12",
      "2012-01-13",
      "2012-01-14"
    ],
    "navs": [
      10.7865,
      10.7891,
      1079.18,
      1077.5805
    ],
    "expectedNavs": [
      1078.65,
      1078.91,
      1079.18,
      1077.5805
    ],
    "expectedBoundaryReturnFraction": 0.0002502525697231465,
    "retainedPreEventObservations": 2113,
    "fetchedAt": "2026-10-30T07:14:20.342Z",
    "sourceObservedAt": "2026-10-30T07:14:21.093Z",
    "sourceDocumentSha256": "6901ece9f37cb0624356289651e6ca92379598f10892c7897d5aa01f03b90ab2"
  },
  {
    "meta": {
      "schemeCode": 105080,
      "schemeName": "SBI ULTRA SHORT TERM FUND - Regular Plan - IDCW",
      "fundHouse": "SBI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short Term Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF200K01LK2"
    },
    "factor": 100,
    "oldNavThrough": "2012-01-12",
    "firstNewNavDate": "2012-01-13",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2012-01-11",
      "2012-01-12",
      "2012-01-13",
      "2012-01-14"
    ],
    "navs": [
      16.7503,
      16.7503,
      1675.03,
      1675.03
    ],
    "expectedNavs": [
      1675.03,
      1675.03,
      1675.03,
      1675.03
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 1764,
    "fetchedAt": "2026-10-30T07:29:59.694Z",
    "sourceObservedAt": "2026-10-30T07:30:01.475Z",
    "sourceDocumentSha256": "727540eb95c9855420b49d8b914f4a18978ddbea2cf099e61eee3aeebb3d50dc"
  },
  {
    "meta": {
      "schemeCode": 105275,
      "schemeName": "SBI LIQUID FUND - Regular Plan - IDCW",
      "fundHouse": "SBI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF200K01LR7"
    },
    "factor": 100,
    "oldNavThrough": "2012-01-12",
    "firstNewNavDate": "2012-01-13",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2012-01-11",
      "2012-01-12",
      "2012-01-13",
      "2012-01-14"
    ],
    "navs": [
      10.0325,
      10.0325,
      1003.25,
      1003.25
    ],
    "expectedNavs": [
      1003.25,
      1003.25,
      1003.25,
      1003.25
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 1757,
    "fetchedAt": "2026-10-30T03:29:56.065Z",
    "sourceObservedAt": "2026-10-30T03:29:56.455Z",
    "sourceDocumentSha256": "ad97a9674a0a46554aeb82fa934ab56fd9d328b6b1245f258f90be5cc84e39be"
  },
  {
    "meta": {
      "schemeCode": 105281,
      "schemeName": "SBI LIQUID FUND - Regular Plan - IDCW",
      "fundHouse": "SBI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF200K01LX5"
    },
    "factor": 100,
    "oldNavThrough": "2012-01-12",
    "firstNewNavDate": "2012-01-13",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2012-01-11",
      "2012-01-12",
      "2012-01-13",
      "2012-01-14"
    ],
    "navs": [
      10.0325,
      10.0325,
      1003.25,
      1003.25
    ],
    "expectedNavs": [
      1003.25,
      1003.25,
      1003.25,
      1003.25
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 1757,
    "fetchedAt": "2026-10-30T03:29:57.065Z",
    "sourceObservedAt": "2026-10-30T03:29:57.735Z",
    "sourceDocumentSha256": "7b60d683cfb865b63ba17b1ea89a91cb6e4a5cc9523256c463dcccee2ec50f5e"
  },
  {
    "meta": {
      "schemeCode": 105887,
      "schemeName": "Aditya Birla Sun Life Ultra Short Term Fund - Regular Plan - Weekly IDCW",
      "fundHouse": "Aditya Birla Sun Life Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short Term Fund",
      "isinGrowth": "INF209K01MA2",
      "isinDivReinvestment": null
    },
    "factor": 10,
    "oldNavThrough": "2011-10-05",
    "firstNewNavDate": "2011-10-07",
    "maxFactorDeviation": 0.01,
    "dates": [
      "2011-10-04",
      "2011-10-05",
      "2011-10-07",
      "2011-10-10"
    ],
    "navs": [
      10.0038,
      10.0062,
      100.1103,
      100.079
    ],
    "expectedNavs": [
      100.038,
      100.062,
      100.1103,
      100.079
    ],
    "expectedBoundaryReturnFraction": 0.0004827007255501589,
    "retainedPreEventObservations": 1049,
    "fetchedAt": "2026-10-30T07:45:51.705Z",
    "sourceObservedAt": "2026-10-30T07:45:52.636Z",
    "sourceDocumentSha256": "fe3d33b20882a275fa870311a952495d6d1aad54b574c19c3e52ef5aaa2d5891"
  },
  {
    "meta": {
      "schemeCode": 105888,
      "schemeName": "Aditya Birla Sun Life Ultra Short Term Fund - Regular Plan - Daily IDCW",
      "fundHouse": "Aditya Birla Sun Life Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short Term Fund",
      "isinGrowth": "INF209K01LY4",
      "isinDivReinvestment": null
    },
    "factor": 10,
    "oldNavThrough": "2011-10-05",
    "firstNewNavDate": "2011-10-07",
    "maxFactorDeviation": 0.01,
    "dates": [
      "2011-10-04",
      "2011-10-05",
      "2011-10-07",
      "2011-10-10"
    ],
    "navs": [
      10.0068,
      10.0068,
      100.068,
      100.068
    ],
    "expectedNavs": [
      100.068,
      100.068,
      100.068,
      100.068
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 1049,
    "fetchedAt": "2026-10-30T04:20:41.388Z",
    "sourceObservedAt": "2026-10-30T04:20:42.785Z",
    "sourceDocumentSha256": "210eab2b083860e2c83f63845cc93d450cd86c99ee5f5fb169a8dbebc076b82e"
  },
  {
    "meta": {
      "schemeCode": 106213,
      "schemeName": "SBI Ultra Short to Short Term Fund - Regular Plan - IDCW",
      "fundHouse": "SBI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short to Short Term Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF200K01ML8"
    },
    "factor": 100,
    "oldNavThrough": "2012-01-12",
    "firstNewNavDate": "2012-01-13",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2012-01-11",
      "2012-01-12",
      "2012-01-13",
      "2012-01-16"
    ],
    "navs": [
      10.0077,
      10.0077,
      1000.77,
      1000.77
    ],
    "expectedNavs": [
      1000.77,
      1000.77,
      1000.77,
      1000.77
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 1081,
    "fetchedAt": "2026-10-30T07:45:53.963Z",
    "sourceObservedAt": "2026-10-30T07:45:54.223Z",
    "sourceDocumentSha256": "07e191e9311b21c73897f23a01a515939f90fa9239090d77acb37de3714b3320"
  },
  {
    "meta": {
      "schemeCode": 106214,
      "schemeName": "SBI Ultra Short to Short Term Fund - Regular Plan - IDCW",
      "fundHouse": "SBI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short to Short Term Fund",
      "isinGrowth": "INF200K01MR5",
      "isinDivReinvestment": "INF200K01MS3"
    },
    "factor": 100,
    "oldNavThrough": "2012-01-12",
    "firstNewNavDate": "2012-01-13",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2012-01-11",
      "2012-01-12",
      "2012-01-13",
      "2012-01-16"
    ],
    "navs": [
      10.1129,
      10.1152,
      1011.77,
      1010.7849
    ],
    "expectedNavs": [
      1011.29,
      1011.52,
      1011.77,
      1010.7849
    ],
    "expectedBoundaryReturnFraction": 0.00024715279974691555,
    "retainedPreEventObservations": 1081,
    "fetchedAt": "2026-10-30T07:45:54.265Z",
    "sourceObservedAt": "2026-10-30T07:45:54.502Z",
    "sourceDocumentSha256": "6bc93c1f3bc1dbe7816b8444556f2bb09282f69fd1eecc78eda46a9936ade17c"
  },
  {
    "meta": {
      "schemeCode": 106216,
      "schemeName": "SBI Ultra Short to Short Term Fund - Regular Plan - IDCW",
      "fundHouse": "SBI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short to Short Term Fund",
      "isinGrowth": "INF200K01MP9",
      "isinDivReinvestment": "INF200K01MQ7"
    },
    "factor": 100,
    "oldNavThrough": "2012-01-12",
    "firstNewNavDate": "2012-01-13",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2012-01-11",
      "2012-01-12",
      "2012-01-13",
      "2012-01-16"
    ],
    "navs": [
      10.3797,
      10.3821,
      1038.47,
      1039.2333
    ],
    "expectedNavs": [
      1037.97,
      1038.21,
      1038.47,
      1039.2333
    ],
    "expectedBoundaryReturnFraction": 0.00025043103033105057,
    "retainedPreEventObservations": 1081,
    "fetchedAt": "2026-10-30T07:45:54.669Z",
    "sourceObservedAt": "2026-10-30T07:45:54.905Z",
    "sourceDocumentSha256": "c38c53d9c33282cf99a88215d64e659cda91e71cd54cf113bb1fdd63d2212240"
  },
  {
    "meta": {
      "schemeCode": 106221,
      "schemeName": "SBI Ultra Short to Short Term Fund - Regular Plan - IDCW",
      "fundHouse": "SBI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short to Short Term Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF200K01MD5"
    },
    "factor": 100,
    "oldNavThrough": "2012-01-12",
    "firstNewNavDate": "2012-01-13",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2012-01-11",
      "2012-01-12",
      "2012-01-13",
      "2012-01-16"
    ],
    "navs": [
      10.006,
      10.006,
      1000.6,
      1000.6
    ],
    "expectedNavs": [
      1000.6,
      1000.6,
      1000.6,
      1000.6
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 1081,
    "fetchedAt": "2026-10-30T07:45:55.102Z",
    "sourceObservedAt": "2026-10-30T07:45:56.561Z",
    "sourceDocumentSha256": "c4e3e62328241cc774ed296a3a005eb06e3db8a7b39778428638def06c1d5240"
  },
  {
    "meta": {
      "schemeCode": 108272,
      "schemeName": "Aditya Birla Sun Life Banking & PSU Debt Fund - Regular Plan - IDCW-Re-investment",
      "fundHouse": "Aditya Birla Sun Life Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Banking and PSU Debt Fund",
      "isinGrowth": "INF209K01LX6",
      "isinDivReinvestment": "INF209KA11Z3"
    },
    "factor": 10,
    "oldNavThrough": "2011-10-05",
    "firstNewNavDate": "2011-10-07",
    "maxFactorDeviation": 0.01,
    "dates": [
      "2011-10-04",
      "2011-10-05",
      "2011-10-07",
      "2011-10-10"
    ],
    "navs": [
      10.302,
      10.3045,
      103.0965,
      103.1737
    ],
    "expectedNavs": [
      103.02,
      103.045,
      103.0965,
      103.1737
    ],
    "expectedBoundaryReturnFraction": 0.0004997816487942161,
    "retainedPreEventObservations": 821,
    "fetchedAt": "2026-10-30T08:02:01.996Z",
    "sourceObservedAt": "2026-10-30T08:02:15.820Z",
    "sourceDocumentSha256": "82046223d59f9e83417ca053c2b79303afa8f01cffc91bbdfa973e096271cbb4"
  },
  {
    "meta": {
      "schemeCode": 108274,
      "schemeName": "Aditya Birla Sun Life Banking & PSU Debt Fund - Regular Plan - QUARTERLY IDCW Payout",
      "fundHouse": "Aditya Birla Sun Life Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Banking and PSU Debt Fund",
      "isinGrowth": "INF209K01LN7",
      "isinDivReinvestment": null
    },
    "factor": 10,
    "oldNavThrough": "2011-10-05",
    "firstNewNavDate": "2011-10-07",
    "maxFactorDeviation": 0.01,
    "dates": [
      "2011-10-04",
      "2011-10-05",
      "2011-10-07",
      "2011-10-10"
    ],
    "navs": [
      10.1901,
      10.1733,
      101.784,
      101.8603
    ],
    "expectedNavs": [
      101.901,
      101.733,
      101.784,
      101.8603
    ],
    "expectedBoundaryReturnFraction": 0.0005013122585591696,
    "retainedPreEventObservations": 767,
    "fetchedAt": "2026-10-30T08:02:15.988Z",
    "sourceObservedAt": "2026-10-30T08:02:16.271Z",
    "sourceDocumentSha256": "abf536f92bde39c4b205c274819d59bf68feb3d016a50abe2672a7fa506448da"
  },
  {
    "meta": {
      "schemeCode": 110282,
      "schemeName": "Aditya Birla Sun Life Banking & PSU Debt Fund - Regular Plan - MONTHLY IDCW Payout",
      "fundHouse": "Aditya Birla Sun Life Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Banking and PSU Debt Fund",
      "isinGrowth": "INF209K01LU2",
      "isinDivReinvestment": null
    },
    "factor": 10,
    "oldNavThrough": "2011-10-05",
    "firstNewNavDate": "2011-10-07",
    "maxFactorDeviation": 0.01,
    "dates": [
      "2011-10-04",
      "2011-10-05",
      "2011-10-07",
      "2011-10-10"
    ],
    "navs": [
      10.0055,
      10.0055,
      100.055,
      100.055
    ],
    "expectedNavs": [
      100.055,
      100.055,
      100.055,
      100.055
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 727,
    "fetchedAt": "2026-10-30T04:20:47.401Z",
    "sourceObservedAt": "2026-10-30T04:20:48.758Z",
    "sourceDocumentSha256": "8b326471a925bc11dbb90f92e5e1456192eea6bedef7daa92c41aa8cbcd96135"
  },
  {
    "meta": {
      "schemeCode": 113307,
      "schemeName": "Aditya Birla Sun Life Ultra short to short term Fund - Regular Plan - Daily IDCW",
      "fundHouse": "Aditya Birla Sun Life Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short to Short Term Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF209KA1LP6"
    },
    "factor": 10,
    "oldNavThrough": "2011-10-05",
    "firstNewNavDate": "2011-10-07",
    "maxFactorDeviation": 0.01,
    "dates": [
      "2011-10-04",
      "2011-10-05",
      "2011-10-07",
      "2011-10-10"
    ],
    "navs": [
      10.0045,
      10.0045,
      100.045,
      100.045
    ],
    "expectedNavs": [
      100.045,
      100.045,
      100.045,
      100.045
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 263,
    "fetchedAt": "2026-10-30T15:19:34.105Z",
    "sourceObservedAt": "2026-10-30T15:19:34.750Z",
    "sourceDocumentSha256": "7d74d7e34767b407b1b327d05723764b414984fba03d7b3ddcfa2669c8fb45ae"
  },
  {
    "meta": {
      "schemeCode": 114297,
      "schemeName": "SBI OVERNIGHT FUND - Regular Plan - IDCW",
      "fundHouse": "SBI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Overnight Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF200K01LN6"
    },
    "factor": 100,
    "oldNavThrough": "2012-01-12",
    "firstNewNavDate": "2012-01-13",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2012-01-11",
      "2012-01-12",
      "2012-01-13",
      "2012-01-14"
    ],
    "navs": [
      10.0991,
      10.0991,
      1009.91,
      1009.91
    ],
    "expectedNavs": [
      1009.91,
      1009.91,
      1009.91,
      1009.91
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 415,
    "fetchedAt": "2026-10-30T03:47:09.076Z",
    "sourceObservedAt": "2026-10-30T03:47:10.077Z",
    "sourceDocumentSha256": "9cc44fd2a511de4088d802a878119453ab7bdcc996338ca269b6c4565d6a4570"
  },
  {
    "meta": {
      "schemeCode": 119088,
      "schemeName": "HDFC Liquid Fund - Direct Plan - IDCW Weekly",
      "fundHouse": "HDFC Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": null
    },
    "factor": 100,
    "oldNavThrough": "2015-08-28",
    "firstNewNavDate": "2015-08-30",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2015-08-27",
      "2015-08-28",
      "2015-08-30",
      "2015-08-31"
    ],
    "navs": [
      10.3167,
      10.3188,
      1032.32,
      1032.5348
    ],
    "expectedNavs": [
      1031.67,
      1031.88,
      1032.32,
      1032.5348
    ],
    "expectedBoundaryReturnFraction": 0.00042640617126022404,
    "retainedPreEventObservations": 805,
    "fetchedAt": "2026-10-30T16:26:52.878Z",
    "sourceObservedAt": "2026-10-30T16:26:53.143Z",
    "sourceDocumentSha256": "9a0edf7a8d3b4613e6f9d65392ee011dabab1fd0b5f9d7b649f0b108c8364727"
  },
  {
    "meta": {
      "schemeCode": 119089,
      "schemeName": "HDFC Liquid Fund - Direct Plan - IDCW Daily",
      "fundHouse": "HDFC Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF179KB1HV7"
    },
    "factor": 100,
    "oldNavThrough": "2015-08-28",
    "firstNewNavDate": "2015-08-30",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2015-08-27",
      "2015-08-28",
      "2015-08-30",
      "2015-08-31"
    ],
    "navs": [
      10.1982,
      10.1982,
      1019.82,
      1019.82
    ],
    "expectedNavs": [
      1019.82,
      1019.82,
      1019.82,
      1019.82
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 805,
    "fetchedAt": "2026-10-30T16:26:52.900Z",
    "sourceObservedAt": "2026-10-30T16:26:53.128Z",
    "sourceDocumentSha256": "1c13621ea6ac37db426d3765aaa5232da01f1c9ad0fc8252d5d7589898973f10"
  },
  {
    "meta": {
      "schemeCode": 119090,
      "schemeName": "HDFC Liquid Fund - Direct Plan - IDCW Monthly",
      "fundHouse": "HDFC Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF179KB1HO2",
      "isinDivReinvestment": "INF179KB1HQ7"
    },
    "factor": 100,
    "oldNavThrough": "2015-08-28",
    "firstNewNavDate": "2015-08-30",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2015-08-27",
      "2015-08-28",
      "2015-08-30",
      "2015-08-31"
    ],
    "navs": [
      10.3312,
      10.3334,
      1033.77,
      1033.987
    ],
    "expectedNavs": [
      1033.12,
      1033.34,
      1033.77,
      1033.987
    ],
    "expectedBoundaryReturnFraction": 0.00041612634757195115,
    "retainedPreEventObservations": 805,
    "fetchedAt": "2026-10-30T16:26:53.288Z",
    "sourceObservedAt": "2026-10-30T16:26:53.552Z",
    "sourceDocumentSha256": "64a6d1496fe563fbf00b1b4e3d6bea36941fbf55b2fe3d2fb4e7065c4bba6c95"
  },
  {
    "meta": {
      "schemeCode": 119093,
      "schemeName": "HDFC Money Market Fund - Direct Plan - Daily IDCW Option",
      "fundHouse": "HDFC Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Money Market Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF179KB1HZ8"
    },
    "factor": 100,
    "oldNavThrough": "2015-08-28",
    "firstNewNavDate": "2015-08-30",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2015-08-27",
      "2015-08-28",
      "2015-08-30",
      "2015-08-31"
    ],
    "navs": [
      10.6364,
      10.6364,
      1063.64,
      1063.64
    ],
    "expectedNavs": [
      1063.64,
      1063.64,
      1063.64,
      1063.64
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 805,
    "fetchedAt": "2026-10-30T16:26:54.930Z",
    "sourceObservedAt": "2026-10-30T16:26:55.161Z",
    "sourceDocumentSha256": "b44d83262928936472c6ae6a25c7ef8ad49d91b94c067f3dfd1a1a4b29e923a3"
  },
  {
    "meta": {
      "schemeCode": 119109,
      "schemeName": "HDFC Overnight Fund - Direct Plan - IDCW Option",
      "fundHouse": "HDFC Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Overnight Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF179KB1HY1"
    },
    "factor": 100,
    "oldNavThrough": "2015-08-28",
    "firstNewNavDate": "2015-08-30",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2015-08-27",
      "2015-08-28",
      "2015-08-30",
      "2015-08-31"
    ],
    "navs": [
      10.4266,
      10.4266,
      1042.66,
      1042.66
    ],
    "expectedNavs": [
      1042.66,
      1042.66,
      1042.66,
      1042.66
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 805,
    "fetchedAt": "2026-10-30T16:26:53.695Z",
    "sourceObservedAt": "2026-10-30T16:26:53.958Z",
    "sourceDocumentSha256": "3ca629440bab2d29b36f9feda7be5f6e88f102f20956eefef4c8d1a7f603d8da"
  },
  {
    "meta": {
      "schemeCode": 145483,
      "schemeName": "ADITYA BIRLA SUN LIFE OVERNIGHT FUND - Regular Plan - Daily IDCW",
      "fundHouse": "Aditya Birla Sun Life Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Overnight Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF209KB1ZD1"
    },
    "factor": 100,
    "oldNavThrough": "2018-11-02",
    "firstNewNavDate": "2018-11-04",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2018-11-02",
      "2018-11-04",
      "2018-11-05"
    ],
    "navs": [
      10.0002,
      1000.02,
      1000.02
    ],
    "expectedNavs": [
      1000.02,
      1000.02,
      1000.02
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 1,
    "fetchedAt": "2026-10-29T19:58:38.022Z",
    "sourceObservedAt": "2026-10-29T19:58:38.578Z",
    "sourceDocumentSha256": "3f6a79b7686e9754e1b276e7dd95c1e2edddcc000696047dd2dd6ff9bd1651a7"
  },
  {
    "meta": {
      "schemeCode": 145485,
      "schemeName": "ADITYA BIRLA SUN LIFE OVERNIGHT FUND - Regular Plan - Monthly IDCW",
      "fundHouse": "Aditya Birla Sun Life Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Overnight Fund",
      "isinGrowth": "INF209KB1ZG4",
      "isinDivReinvestment": null
    },
    "factor": 100,
    "oldNavThrough": "2018-11-02",
    "firstNewNavDate": "2018-11-04",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2018-11-02",
      "2018-11-04",
      "2018-11-05"
    ],
    "navs": [
      10.0033,
      1000.6702,
      1000.8308
    ],
    "expectedNavs": [
      1000.33,
      1000.6702,
      1000.8308
    ],
    "expectedBoundaryReturnFraction": 0.00034008777103555825,
    "retainedPreEventObservations": 1,
    "fetchedAt": "2026-10-29T19:58:38.702Z",
    "sourceObservedAt": "2026-10-29T19:58:38.999Z",
    "sourceDocumentSha256": "ae85e79078a952182f0ab8b1c9db2c58a2cebef38b6f7cd4f0179380bdf3fca2"
  },
  {
    "meta": {
      "schemeCode": 145487,
      "schemeName": "ADITYA BIRLA SUN LIFE OVERNIGHT FUND - Direct Plan - Daily IDCW",
      "fundHouse": "Aditya Birla Sun Life Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Overnight Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF209KB1ZI0"
    },
    "factor": 100,
    "oldNavThrough": "2018-11-02",
    "firstNewNavDate": "2018-11-04",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2018-11-02",
      "2018-11-04",
      "2018-11-05"
    ],
    "navs": [
      10.0002,
      1000.02,
      1000.02
    ],
    "expectedNavs": [
      1000.02,
      1000.02,
      1000.02
    ],
    "expectedBoundaryReturnFraction": 0.0,
    "retainedPreEventObservations": 1,
    "fetchedAt": "2026-10-29T19:58:39.114Z",
    "sourceObservedAt": "2026-10-29T19:58:39.394Z",
    "sourceDocumentSha256": "25371ddaa310003e5e1073ff8234610fca9de01fb260d6b864109a12c03f48fd"
  },
  {
    "meta": {
      "schemeCode": 145489,
      "schemeName": "ADITYA BIRLA SUN LIFE OVERNIGHT FUND - Direct Plan - Weekly IDCW",
      "fundHouse": "Aditya Birla Sun Life Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Overnight Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF209KB1ZJ8"
    },
    "factor": 100,
    "oldNavThrough": "2018-11-02",
    "firstNewNavDate": "2018-11-04",
    "maxFactorDeviation": 0.1,
    "dates": [
      "2018-11-02",
      "2018-11-04",
      "2018-11-05"
    ],
    "navs": [
      10.0002,
      1000.38,
      1000.54
    ],
    "expectedNavs": [
      1000.02,
      1000.38,
      1000.54
    ],
    "expectedBoundaryReturnFraction": 0.0003599928001439971,
    "retainedPreEventObservations": 1,
    "fetchedAt": "2026-10-29T19:58:39.549Z",
    "sourceObservedAt": "2026-10-29T19:58:39.818Z",
    "sourceDocumentSha256": "17e95d4e45ba42b894069843ac9d79065be6077ae107f43b14e196ee4c370a28",
    "gapProbe": {
      "dates": [
        "2018-11-02",
        "2018-11-04",
        "2018-11-05",
        "2022-08-01",
        "2022-12-29"
      ],
      "navs": [
        10.0002,
        1000.38,
        1000.54,
        1000.4297,
        1000.066
      ],
      "expectedNavs": [
        1000.02,
        1000.38,
        1000.54,
        1000.4297,
        1000.066
      ],
      "gaps": [
        {
          "beforeDate": "2022-08-01",
          "afterDate": "2022-12-29",
          "calendarDays": 150
        }
      ]
    }
  }
];

export const EXCLUDED_DEBT_DISTRIBUTION_FIXTURES: ExcludedDebtDistributionFixture[] = [
  {
    "meta": {
      "schemeCode": 101617,
      "schemeName": "ICICI Prudential Ultra Short to Short Term Fund - Regular Plan - Weekly IDCW",
      "fundHouse": "ICICI Prudential Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short to Short Term Fund",
      "isinGrowth": "INF109K01JO1",
      "isinDivReinvestment": "INF109K01753"
    },
    "dates": [
      "2009-10-29",
      "2009-10-30",
      "2009-11-03",
      "2009-11-04"
    ],
    "navs": [
      10.5434,
      10.5447,
      105.4104,
      105.4229
    ],
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "No original dated issuer/exchange conversion terms recovered for the reported 1-Nov-2009 Rs10 → Rs100 event. Secondary news remains insufficient. No primary evidence chain binds this exact stored option through its 2009 historical predecessor and boundary NAVs. Later collateral labels and unauthenticated 2019 table do not supply that chain.",
    "fetchedAt": "2026-10-30T04:19:57.155Z",
    "sourceObservedAt": "2026-10-30T04:20:13.498Z",
    "sourceDocumentSha256": "ed568f5524f782eca8d3ad3b29768bb7728798bede13898be1204e0be5661951"
  },
  {
    "meta": {
      "schemeCode": 101618,
      "schemeName": "ICICI Prudential Ultra Short to Short Term Fund - Regular Plan - Daily IDCW",
      "fundHouse": "ICICI Prudential Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short to Short Term Fund",
      "isinGrowth": "INF109K01738",
      "isinDivReinvestment": null
    },
    "dates": [
      "2009-10-29",
      "2009-10-30",
      "2009-11-03",
      "2009-11-04"
    ],
    "navs": [
      10.5735,
      10.5735,
      105.735,
      105.735
    ],
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "No original dated issuer/exchange conversion terms recovered for the reported 1-Nov-2009 Rs10 → Rs100 event. Secondary news remains insufficient. No primary evidence chain binds this exact stored option through its 2009 historical predecessor and boundary NAVs. Later collateral labels and unauthenticated 2019 table do not supply that chain.",
    "fetchedAt": "2026-10-30T04:19:57.157Z",
    "sourceObservedAt": "2026-10-30T04:20:13.535Z",
    "sourceDocumentSha256": "8358c1423b19e4f71a09eef2a00d270dd21e77822d2472d57ba9e545d436a655"
  },
  {
    "meta": {
      "schemeCode": 101804,
      "schemeName": "ICICI Prudential Floating Interest Rates Fund - Regular Plan - Daily IDCW",
      "fundHouse": "ICICI Prudential Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Floating Interest Rates Fund",
      "isinGrowth": "INF109K01AW3",
      "isinDivReinvestment": null
    },
    "dates": [
      "2009-10-29",
      "2009-10-30",
      "2009-11-03",
      "2009-11-04"
    ],
    "navs": [
      10.0021,
      10.0021,
      100.021,
      100.021
    ],
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "No original dated issuer/exchange conversion terms recovered for the reported 1-Nov-2009 Rs10 → Rs100 event. Secondary news remains insufficient. No primary evidence chain binds this exact stored option through its 2009 historical predecessor and boundary NAVs. Later collateral labels and unauthenticated 2019 table do not supply that chain.",
    "fetchedAt": "2026-10-30T06:38:54.468Z",
    "sourceObservedAt": "2026-10-30T06:38:55.437Z",
    "sourceDocumentSha256": "3f6ccce1afc99ebd9a064e6f4a6af8bab6d682232a79ddeaa39454da3f15b463"
  },
  {
    "meta": {
      "schemeCode": 101995,
      "schemeName": "HDFC Money Market Fund - Regular Plan - Weekly IDCW Option",
      "fundHouse": "HDFC Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Money Market Fund",
      "isinGrowth": "INF179KB1IH4",
      "isinDivReinvestment": "INF179KB1II2"
    },
    "dates": [
      "2015-08-27",
      "2015-08-28",
      "2015-08-30",
      "2015-08-31"
    ],
    "navs": [
      10.6377,
      10.6399,
      1062.9,
      1063.1148
    ],
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Documented factor100 event, but observed absolute factor deviation exceeds the established0.1 same-event guard. No tolerance widening or fitted factor is authorized.",
    "fetchedAt": "2026-10-30T06:40:05.282Z",
    "sourceObservedAt": "2026-10-30T06:40:05.540Z",
    "sourceDocumentSha256": "408185e4b0a7cdc5fe7b86f4e0266ca96137b889f841a195f05ae2ed8af426ba"
  },
  {
    "meta": {
      "schemeCode": 102134,
      "schemeName": "ICICI Prudential Multi Sector Passive FOF-Dividend Option - Regular Plan - IDCW",
      "fundHouse": "ICICI Prudential Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Other Scheme - FoF Domestic",
      "isinGrowth": "INF109K01DW7",
      "isinDivReinvestment": "INF109K01803"
    },
    "dates": [
      "2008-01-01",
      "2008-01-02",
      "2008-01-03",
      "2008-01-04"
    ],
    "navs": [
      28.9649,
      17.7769,
      29.0558,
      29.2943
    ],
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "No primary 2008 original NAV statement or correction/economic-event notice recovered for the 2-Jan-2008 anomalous observation. A source-error suspicion is not a verified correction.",
    "fetchedAt": "2026-10-30T03:13:54.924Z",
    "sourceObservedAt": "2026-10-30T03:13:55.928Z",
    "sourceDocumentSha256": "9fd1a775ebb0b3bcbb87cbf317a43b397a704ac6fa6f12f760d0fe84b47f7b1d"
  },
  {
    "meta": {
      "schemeCode": 102136,
      "schemeName": "ICICI Prudential Aggressive Hybrid Active FOF - Dividend Option - Regular Plan - IDCW",
      "fundHouse": "ICICI Prudential Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Other Scheme - FoF Domestic",
      "isinGrowth": "INF109K01FR2",
      "isinDivReinvestment": "INF109K01860"
    },
    "dates": [
      "2007-12-31",
      "2008-01-01",
      "2008-01-02",
      "2008-01-03",
      "2008-01-04"
    ],
    "navs": [
      36.8985,
      37.1037,
      19.2933,
      37.1764,
      37.5655
    ],
    "warnings": [
      "Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 2,
    "reason": "No primary 2008 original NAV statement or correction/economic-event notice recovered for the 2-Jan-2008 anomalous observation. A source-error suspicion is not a verified correction.",
    "fetchedAt": "2026-10-30T03:13:55.992Z",
    "sourceObservedAt": "2026-10-30T03:13:56.704Z",
    "sourceDocumentSha256": "99aeff51bdebab97e629554b96213903a0838c4d6943002181f39e9465c8898a"
  },
  {
    "meta": {
      "schemeCode": 103342,
      "schemeName": "ICICI Prudential Liquid Fund - - Regular Plan - Weekly IDCW",
      "fundHouse": "ICICI Prudential Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF109K01VS7",
      "isinDivReinvestment": null
    },
    "dates": [
      "2009-10-29",
      "2009-10-30",
      "2009-11-02",
      "2009-11-03"
    ],
    "navs": [
      10.0075,
      10.0086,
      100.1226,
      100.0523
    ],
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "No original dated issuer/exchange conversion terms recovered for the reported 1-Nov-2009 Rs10 → Rs100 event. Secondary news remains insufficient. No primary evidence chain binds this exact stored option through its 2009 historical predecessor and boundary NAVs. Later collateral labels and unauthenticated 2019 table do not supply that chain.",
    "fetchedAt": "2026-10-30T07:14:19.334Z",
    "sourceObservedAt": "2026-10-30T07:14:20.127Z",
    "sourceDocumentSha256": "f4988e7651e4516ed8b4d260098eeac43f482342a60d9022eb68338f908ed3a2"
  },
  {
    "meta": {
      "schemeCode": 103343,
      "schemeName": "ICICI Prudential Liquid Fund - - Regular Plan - Daily IDCW",
      "fundHouse": "ICICI Prudential Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Liquid Fund",
      "isinGrowth": "INF109K01VP3",
      "isinDivReinvestment": null
    },
    "dates": [
      "2009-10-29",
      "2009-10-30",
      "2009-11-02",
      "2009-11-03"
    ],
    "navs": [
      10.0022,
      10.0022,
      100.022,
      100.022
    ],
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "No original dated issuer/exchange conversion terms recovered for the reported 1-Nov-2009 Rs10 → Rs100 event. Secondary news remains insufficient. No primary evidence chain binds this exact stored option through its 2009 historical predecessor and boundary NAVs. Later collateral labels and unauthenticated 2019 table do not supply that chain.",
    "fetchedAt": "2026-10-30T07:14:20.294Z",
    "sourceObservedAt": "2026-10-30T07:14:20.828Z",
    "sourceDocumentSha256": "9c06fda7a4a04704cda177f8f8b5d0f67c96e433cdcb282c3af7859a89104cd0"
  },
  {
    "meta": {
      "schemeCode": 103634,
      "schemeName": "ICICI Prudential Money Market Fund - Cash Option - Regular Plan - Daily IDCW",
      "fundHouse": "ICICI Prudential Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Money Market Fund",
      "isinGrowth": "INF109K01TY9",
      "isinDivReinvestment": null
    },
    "dates": [
      "2009-10-29",
      "2009-10-30",
      "2009-11-02",
      "2009-11-03"
    ],
    "navs": [
      10.001,
      10.001,
      100.01,
      100.01
    ],
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "No original dated issuer/exchange conversion terms recovered for the reported 1-Nov-2009 Rs10 → Rs100 event. Secondary news remains insufficient. No primary evidence chain binds this exact stored option through its 2009 historical predecessor and boundary NAVs. Later collateral labels and unauthenticated 2019 table do not supply that chain.",
    "fetchedAt": "2026-10-30T07:14:21.882Z",
    "sourceObservedAt": "2026-10-30T07:14:22.400Z",
    "sourceDocumentSha256": "1524f4c466ae1292bd95b513493d89b399061964f505be5580d65f22bacaf852"
  },
  {
    "meta": {
      "schemeCode": 103635,
      "schemeName": "ICICI Prudential Money Market Fund - Cash Option - Regular Plan - Weekly IDCW",
      "fundHouse": "ICICI Prudential Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Money Market Fund",
      "isinGrowth": "INF109K01TZ6",
      "isinDivReinvestment": null
    },
    "dates": [
      "2009-10-29",
      "2009-10-30",
      "2009-11-02",
      "2009-11-03"
    ],
    "navs": [
      10.0064,
      10.0072,
      100.0973,
      100.0474
    ],
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "No original dated issuer/exchange conversion terms recovered for the reported 1-Nov-2009 Rs10 → Rs100 event. Secondary news remains insufficient. No primary evidence chain binds this exact stored option through its 2009 historical predecessor and boundary NAVs. Later collateral labels and unauthenticated 2019 table do not supply that chain.",
    "fetchedAt": "2026-10-30T07:14:22.568Z",
    "sourceObservedAt": "2026-10-30T07:14:23.158Z",
    "sourceDocumentSha256": "42e6374975956b1b8e92fe1924b98ad60dde32e3ae29da3149ba77bcca13e656"
  },
  {
    "meta": {
      "schemeCode": 106095,
      "schemeName": "SBI INFRASTRUCTURE FUND - Regular Plan - IDCW",
      "fundHouse": "SBI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Equity Scheme - Sectoral/ Thematic",
      "isinGrowth": "INF200K01CU0",
      "isinDivReinvestment": "INF200K01CV8"
    },
    "dates": [
      "2009-04-01",
      "2009-04-02",
      "2010-07-09",
      "2010-07-12"
    ],
    "navs": [
      5.72,
      6.0,
      10.28,
      10.33
    ],
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "A71.3333333333% increase spans463days (2-Apr-2009 to9-Jul-2010). No primary unit-change evidence explains this full event chain; no adjustment proposed.",
    "fetchedAt": "2026-10-30T04:20:41.892Z",
    "sourceObservedAt": "2026-10-30T04:20:42.160Z",
    "sourceDocumentSha256": "1ddcdb5f06bb0f790ba9f0e9d1cfed8c4628099b8d08771ff09d1fbf430df4ab"
  },
  {
    "meta": {
      "schemeCode": 106222,
      "schemeName": "SBI Ultra Short to Short Term Fund - Regular Plan - IDCW",
      "fundHouse": "SBI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Ultra Short to Short Term Fund",
      "isinGrowth": "INF200K01MJ2",
      "isinDivReinvestment": "INF200K01MK0"
    },
    "dates": [
      "2012-01-11",
      "2012-01-12",
      "2012-01-13",
      "2012-01-16"
    ],
    "navs": [
      10.0577,
      10.06,
      1006.25,
      1005.2608
    ],
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "The code/MK0 issuer SSD lead is insufficient to verify the second non-null retained ISIN INF200K01MJ2. Secondary listings are not promoted to primary identity evidence.",
    "fetchedAt": "2026-10-30T07:45:56.728Z",
    "sourceObservedAt": "2026-10-30T07:45:57.411Z",
    "sourceDocumentSha256": "c20b5fc30e223b840ae2b7b3c7e79b53f73538b334d321299d4011ff4cbc95dd"
  },
  {
    "meta": {
      "schemeCode": 111545,
      "schemeName": "ICICI Prudential Floating Interest Rates Fund - Regular Plan - Weekly IDCW",
      "fundHouse": "ICICI Prudential Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Floating Interest Rates Fund",
      "isinGrowth": "INF109K01EN4",
      "isinDivReinvestment": "INF109K01AY9"
    },
    "dates": [
      "2009-10-29",
      "2009-10-30",
      "2009-11-03",
      "2009-11-04"
    ],
    "navs": [
      10.0077,
      10.0088,
      100.056,
      100.0679
    ],
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "No original dated issuer/exchange conversion terms recovered for the reported 1-Nov-2009 Rs10 → Rs100 event. Secondary news remains insufficient. No primary evidence chain binds this exact stored option through its 2009 historical predecessor and boundary NAVs. Later collateral labels and unauthenticated 2019 table do not supply that chain. Full retained history contains a 262-calendar-day gap. No observations were filled, inferred or dropped.",
    "fetchedAt": "2026-10-30T08:34:37.958Z",
    "sourceObservedAt": "2026-10-30T08:34:38.980Z",
    "sourceDocumentSha256": "1900f94efed2d81d5e3fd65cef35d92acba8d7d862fb4a1a2364a8c90782baf9"
  },
  {
    "meta": {
      "schemeCode": 119094,
      "schemeName": "HDFC Money Market Fund - Direct Plan - Weekly IDCW Option",
      "fundHouse": "HDFC Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Money Market Fund",
      "isinGrowth": "INF179KB1IA9",
      "isinDivReinvestment": "INF179KB1IB7"
    },
    "dates": [
      "2015-08-27",
      "2015-08-28",
      "2015-08-30",
      "2015-08-31"
    ],
    "navs": [
      10.638,
      10.6403,
      1062.91,
      1063.1336
    ],
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Documented factor100 event, but observed absolute factor deviation exceeds the established0.1 same-event guard. No tolerance widening or fitted factor is authorized.",
    "fetchedAt": "2026-10-30T16:26:55.317Z",
    "sourceObservedAt": "2026-10-30T16:26:55.580Z",
    "sourceDocumentSha256": "df9fd066e0d0ef268286fbdc5acc5edd785a498eea434ede1c1dcc429944afa3"
  },
  {
    "meta": {
      "schemeCode": 145537,
      "schemeName": "ICICI Prudential Overnight Fund - Direct Plan - Daily IDCW",
      "fundHouse": "ICICI Prudential Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Overnight Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF109KC12G9"
    },
    "dates": [
      "2022-08-12",
      "2022-08-16",
      "2022-08-17",
      "2022-08-18"
    ],
    "navs": [
      100.0005,
      100.0005,
      1000.005,
      1000.005
    ],
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Parallel Overnight ISIN sets remain unexplained. NCCL/provider stored set conflicts with issuer SSD and historical corroborating table; no exact primary option/code mapping explains both sets.",
    "fetchedAt": "2026-10-29T19:58:39.973Z",
    "sourceObservedAt": "2026-10-29T19:58:40.610Z",
    "sourceDocumentSha256": "1813b0660a7fb8d3030d3c1f47b2179191ce0252a75cfd339178d5cd040d5ab7"
  },
  {
    "meta": {
      "schemeCode": 145538,
      "schemeName": "ICICI Prudential Overnight Fund - Regular Plan - Weekly IDCW",
      "fundHouse": "ICICI Prudential Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Overnight Fund",
      "isinGrowth": "INF109KC12F1",
      "isinDivReinvestment": "INF109KC11F3"
    },
    "dates": [
      "2022-08-12",
      "2022-08-16",
      "2022-08-17",
      "2022-08-18"
    ],
    "navs": [
      100.0547,
      100.1107,
      1000.1378,
      1000.2745
    ],
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Parallel Overnight ISIN sets remain unexplained. NCCL/provider stored set conflicts with issuer SSD and historical corroborating table; no exact primary option/code mapping explains both sets.",
    "fetchedAt": "2026-10-29T19:58:40.764Z",
    "sourceObservedAt": "2026-10-29T19:58:41.216Z",
    "sourceDocumentSha256": "1cd69a7e3c257adf66df1d417d23e0fb51825890c0abf17447713a2c664ad9f3"
  },
  {
    "meta": {
      "schemeCode": 145539,
      "schemeName": "ICICI Prudential Overnight Fund - Direct Plan - Weekly IDCW",
      "fundHouse": "ICICI Prudential Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Overnight Fund",
      "isinGrowth": "INF109KC16G0",
      "isinDivReinvestment": "INF109KC15G2"
    },
    "dates": [
      "2022-08-12",
      "2022-08-16",
      "2022-08-17",
      "2022-08-18"
    ],
    "navs": [
      100.0558,
      100.1127,
      1000.1406,
      1000.2797
    ],
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Parallel Overnight ISIN sets remain unexplained. NCCL/provider stored set conflicts with issuer SSD and historical corroborating table; no exact primary option/code mapping explains both sets. No exact primary145539 numeric-code binding to both stored ISIN fields recovered. P9695P/payout-only search evidence cannot replace the missing full identity bridge. Full retained history contains 36- and 10-calendar-day gaps. No observations were filled, inferred or dropped.",
    "fetchedAt": "2026-10-29T19:58:40.971Z",
    "sourceObservedAt": "2026-10-29T19:58:41.228Z",
    "sourceDocumentSha256": "b0e62f4e2c2de737a37b78d411d34812b6b08c21b3349cf798d9ab474f335cf9"
  },
  {
    "meta": {
      "schemeCode": 145547,
      "schemeName": "ICICI Prudential Overnight Fund - Regular Plan - Daily IDCW",
      "fundHouse": "ICICI Prudential Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Overnight Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF109KC18E1"
    },
    "dates": [
      "2022-08-12",
      "2022-08-16",
      "2022-08-17",
      "2022-08-18"
    ],
    "navs": [
      100.0005,
      100.0005,
      1000.005,
      1000.005
    ],
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "Parallel Overnight ISIN sets remain unexplained. NCCL/provider stored set conflicts with issuer SSD and historical corroborating table; no exact primary option/code mapping explains both sets.",
    "fetchedAt": "2026-10-29T19:58:41.370Z",
    "sourceObservedAt": "2026-10-29T19:58:41.654Z",
    "sourceDocumentSha256": "f0acbf6acb4cabf478ca64219b2d6d96bfb221454dc4bc136f5a54a9b2083146"
  },
  {
    "meta": {
      "schemeCode": 149408,
      "schemeName": "ICICI Prudential Overnight Fund - Direct Plan - Unclaimed IDCW Transitory Scheme",
      "fundHouse": "ICICI Prudential Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Overnight Fund",
      "isinGrowth": "INF109KC16H8",
      "isinDivReinvestment": null
    },
    "dates": [
      "2022-08-12",
      "2022-08-16",
      "2022-08-17",
      "2022-08-18"
    ],
    "navs": [
      102.7082,
      102.7667,
      1027.809,
      1027.952
    ],
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "For this unclaimed option, the current NCCL code/ISIN binding is present, but no issuer-authenticated historical 2022 NAV anchor or explicit Stable/Transitory-to-notice-name bridge was recovered.",
    "fetchedAt": "2026-10-29T21:41:17.729Z",
    "sourceObservedAt": "2026-10-29T21:41:18.194Z",
    "sourceDocumentSha256": "77d46d455d2e5d3303d3dd79d19206b3d9e23ea6b4eebaf4fa7b6ae6591f8fa1"
  },
  {
    "meta": {
      "schemeCode": 149411,
      "schemeName": "ICICI Prudential Overnight Fund - Direct Plan - Unclaimed IDCW Stable Scheme",
      "fundHouse": "ICICI Prudential Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Debt Scheme - Overnight Fund",
      "isinGrowth": "INF109KC18H4",
      "isinDivReinvestment": null
    },
    "dates": [
      "2022-08-12",
      "2022-08-16",
      "2022-08-17",
      "2022-08-18"
    ],
    "navs": [
      100.0,
      100.0,
      1000.0,
      1000.0
    ],
    "warnings": [
      "Unresolved discontinuity: 1 single-observation move(s) exceed 40%; derived analytics are blocked."
    ],
    "rawLargeMoves": 1,
    "reason": "For this unclaimed option, the current NCCL code/ISIN binding is present, but no issuer-authenticated historical 2022 NAV anchor or explicit Stable/Transitory-to-notice-name bridge was recovered.",
    "fetchedAt": "2026-10-29T21:41:19.104Z",
    "sourceObservedAt": "2026-10-29T21:41:19.321Z",
    "sourceDocumentSha256": "2ffd5233dcec10ed4161db3d99cf17e4ad49fef072a4644f94be2b7d84e111d7"
  }
];
