import type { FundMeta } from '../../src/lib/types.ts';

// Literal checkpoint-256 observations and independently calculated decimal expectations.
// Identity and event evidence: docs/UTI_DISTRIBUTION_UNIT_REVIEW_2026-10-30.md.
export const UTI_DISTRIBUTION_FIXTURES: { meta: FundMeta; dates: string[]; navs: number[]; expectedNavs: number[] }[] = [
  {
    "meta": {
      "schemeCode": 102010,
      "schemeName": "UTI - Liquid Fund - Regular Plan - Daily IDCW (Reinvestment)",
      "fundHouse": "UTI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF789F1AF77"
    },
    "dates": [
      "2026-06-18",
      "2026-06-19",
      "2026-06-20",
      "2026-06-21"
    ],
    "navs": [
      1195.8496,
      1196.0616,
      119.6264,
      119.6466
    ],
    "expectedNavs": [
      119.58496,
      119.60616,
      119.6264,
      119.6466
    ]
  },
  {
    "meta": {
      "schemeCode": 102011,
      "schemeName": "UTI - Liquid Fund - Regular Plan - Monthly IDCW",
      "fundHouse": "UTI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": "INF789F1AF93",
      "isinDivReinvestment": "INF789F1AG01"
    },
    "dates": [
      "2026-06-18",
      "2026-06-19",
      "2026-06-20",
      "2026-06-21"
    ],
    "navs": [
      1129.8746,
      1130.0749,
      113.0266,
      113.0457
    ],
    "expectedNavs": [
      112.98746,
      113.00749,
      113.0266,
      113.0457
    ]
  },
  {
    "meta": {
      "schemeCode": 120558,
      "schemeName": "UTI - Liquid Fund - Direct Plan - Daily IDCW (Reinvestment)",
      "fundHouse": "UTI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": null,
      "isinDivReinvestment": "INF789F1AD38"
    },
    "dates": [
      "2026-06-18",
      "2026-06-19",
      "2026-06-20",
      "2026-06-21"
    ],
    "navs": [
      1065.3037,
      1065.3037,
      106.5304,
      106.5304
    ],
    "expectedNavs": [
      106.53037,
      106.53037,
      106.5304,
      106.5304
    ]
  },
  {
    "meta": {
      "schemeCode": 120794,
      "schemeName": "UTI - Liquid Fund - Direct Plan - Monthly IDCW",
      "fundHouse": "UTI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": "INF789F1AD53",
      "isinDivReinvestment": "INF789F1AD61"
    },
    "dates": [
      "2026-06-18",
      "2026-06-19",
      "2026-06-20",
      "2026-06-21"
    ],
    "navs": [
      1047.3618,
      1047.5507,
      104.7731,
      104.7912
    ],
    "expectedNavs": [
      104.73618,
      104.75507,
      104.7731,
      104.7912
    ]
  },
  {
    "meta": {
      "schemeCode": 133973,
      "schemeName": "UTI - Liquid Fund - Regular Plan - Annual IDCW",
      "fundHouse": "UTI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": "INF789F1AD12",
      "isinDivReinvestment": "INF789F1AD20"
    },
    "dates": [
      "2026-06-18",
      "2026-06-19",
      "2026-06-20",
      "2026-06-21"
    ],
    "navs": [
      2003.1598,
      2003.5149,
      200.3854,
      200.4193
    ],
    "expectedNavs": [
      200.31598,
      200.35149,
      200.3854,
      200.4193
    ]
  },
  {
    "meta": {
      "schemeCode": 134427,
      "schemeName": "UTI - Liquid Fund - Direct Plan - Annual IDCW",
      "fundHouse": "UTI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": "INF789F1AE45",
      "isinDivReinvestment": "INF789F1AE52"
    },
    "dates": [
      "2026-06-18",
      "2026-06-19",
      "2026-06-20",
      "2026-06-21"
    ],
    "navs": [
      2017.8743,
      2018.2382,
      201.8586,
      201.8934
    ],
    "expectedNavs": [
      201.78743,
      201.82382,
      201.8586,
      201.8934
    ]
  },
  {
    "meta": {
      "schemeCode": 135721,
      "schemeName": "UTI - Liquid Fund - Regular Plan - Quarterly IDCW",
      "fundHouse": "UTI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": "INF789F1AG43",
      "isinDivReinvestment": "INF789F1AG50"
    },
    "dates": [
      "2026-06-18",
      "2026-06-19",
      "2026-06-20",
      "2026-06-21"
    ],
    "navs": [
      1891.4278,
      1891.7631,
      189.2083,
      189.2404
    ],
    "expectedNavs": [
      189.14278,
      189.17631,
      189.2083,
      189.2404
    ]
  },
  {
    "meta": {
      "schemeCode": 139838,
      "schemeName": "UTI - Liquid Fund - Regular Plan - Fortnightly IDCW",
      "fundHouse": "UTI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": "INF789F1AF28",
      "isinDivReinvestment": "INF789F1AF36"
    },
    "dates": [
      "2026-06-18",
      "2026-06-19",
      "2026-06-20",
      "2026-06-21"
    ],
    "navs": [
      1156.0527,
      1156.2576,
      115.6453,
      115.6649
    ],
    "expectedNavs": [
      115.60527,
      115.62576,
      115.6453,
      115.6649
    ]
  },
  {
    "meta": {
      "schemeCode": 140024,
      "schemeName": "UTI - Liquid Fund - Direct Plan - Quarterly IDCW",
      "fundHouse": "UTI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": "INF789F1AE03",
      "isinDivReinvestment": "INF789F1AE11"
    },
    "dates": [
      "2026-06-18",
      "2026-06-19",
      "2026-06-20",
      "2026-06-21"
    ],
    "navs": [
      1905.7443,
      1906.0881,
      190.6416,
      190.6745
    ],
    "expectedNavs": [
      190.57443,
      190.60881,
      190.6416,
      190.6745
    ]
  },
  {
    "meta": {
      "schemeCode": 140504,
      "schemeName": "UTI - Liquid Fund - Direct Plan - Half-Yearly IDCW",
      "fundHouse": "UTI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": "INF789F1AE29",
      "isinDivReinvestment": "INF789F1AE37"
    },
    "dates": [
      "2026-06-18",
      "2026-06-19",
      "2026-06-20",
      "2026-06-21"
    ],
    "navs": [
      1576.223,
      1576.5073,
      157.6779,
      157.7051
    ],
    "expectedNavs": [
      157.6223,
      157.65073,
      157.6779,
      157.7051
    ]
  },
  {
    "meta": {
      "schemeCode": 140517,
      "schemeName": "UTI - Liquid Fund - Regular Plan - Flexi IDCW",
      "fundHouse": "UTI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": "INF789F1AF02",
      "isinDivReinvestment": "INF789F1AF10"
    },
    "dates": [
      "2026-06-18",
      "2026-06-19",
      "2026-06-20",
      "2026-06-21"
    ],
    "navs": [
      1650.9602,
      1651.2528,
      165.1532,
      165.1812
    ],
    "expectedNavs": [
      165.09602,
      165.12528,
      165.1532,
      165.1812
    ]
  },
  {
    "meta": {
      "schemeCode": 140913,
      "schemeName": "UTI - Liquid Fund - Direct Plan - Fortnightly IDCW",
      "fundHouse": "UTI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": "INF789F1AD87",
      "isinDivReinvestment": "INF789F1AD95"
    },
    "dates": [
      "2026-06-18",
      "2026-06-19",
      "2026-06-20",
      "2026-06-21"
    ],
    "navs": [
      1156.8994,
      1157.1081,
      115.7307,
      115.7507
    ],
    "expectedNavs": [
      115.68994,
      115.71081,
      115.7307,
      115.7507
    ]
  },
  {
    "meta": {
      "schemeCode": 141768,
      "schemeName": "UTI - Liquid Fund - Direct Plan - Flexi IDCW",
      "fundHouse": "UTI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": "INF789F1AE60",
      "isinDivReinvestment": "INF789F1AE78"
    },
    "dates": [
      "2026-06-18",
      "2026-06-19",
      "2026-06-20",
      "2026-06-21"
    ],
    "navs": [
      1662.0119,
      1662.3117,
      166.2598,
      166.2885
    ],
    "expectedNavs": [
      166.20119,
      166.23117,
      166.2598,
      166.2885
    ]
  },
  {
    "meta": {
      "schemeCode": 144475,
      "schemeName": "UTI - Liquid Fund - Regular Plan - Half-Yearly IDCW",
      "fundHouse": "UTI Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Income/Debt Oriented Schemes - Liquid Fund",
      "isinGrowth": "INF789F1AF51",
      "isinDivReinvestment": "INF789F1AF69"
    },
    "dates": [
      "2026-06-18",
      "2026-06-19",
      "2026-06-20",
      "2026-06-21"
    ],
    "navs": [
      1395.0469,
      1395.2988,
      139.554,
      139.578
    ],
    "expectedNavs": [
      139.50469,
      139.52988,
      139.554,
      139.578
    ]
  }
];
