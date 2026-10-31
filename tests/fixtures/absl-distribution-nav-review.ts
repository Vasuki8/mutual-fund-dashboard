import type { FundData, FundMeta } from '../../src/lib/types.ts';

// Exact checkpoint 268 source observations; replacement NAVs are the issuer's
// original 9–11 April 2019 exports, not a fitted factor or a sibling Growth NAV.
// Explicit public selector IDs: Regular IDCW 297D and Direct IDCW 297DZ.
// Python Decimal (precision 60) independently produced expected daily returns.
// Manifest SHA-256: d91fddfc92fb514d1e7b5050ccc9b5aca9a4b05fac0af7b9652e9ecd68da1190.
// Evidence and retained source limitations:
// docs/DISTRIBUTION_NAV_BATCH_2026-10-31.md.
export interface AbslDistributionCorrectionFixture {
  meta: FundMeta;
  internalCode: string;
  dates: string[];
  navs: number[];
  expectedNavs: number[];
  verified: number;
  firstReturn: number;
  secondReturn: number;
  fetchedAt: string;
  sourceObservedAt: string;
  sourceDocumentSha256: string;
}

export const ABSL_DISTRIBUTION_WARNING =
  'Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.';

export const ABSL_DISTRIBUTION_CORRECTION_FIXTURES: AbslDistributionCorrectionFixture[] = [
  {
    "meta": {
      "schemeCode": 106872,
      "schemeName": "Aditya Birla Sun Life International Equity Fund - Regular Plan - IDCW",
      "fundHouse": "Aditya Birla Sun Life Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Equity Scheme - Sectoral/ Thematic",
      "isinGrowth": "INF209K01512",
      "isinDivReinvestment": "INF209K01CV9"
    },
    "internalCode": "297D",
    "dates": [
      "2019-04-05",
      "2019-04-08",
      "2019-04-09",
      "2019-04-10",
      "2019-04-11",
      "2019-04-12",
      "2019-04-15"
    ],
    "navs": [
      15.4327,
      15.5738,
      15.5022,
      50.3562,
      15.3809,
      15.4463,
      15.6184
    ],
    "expectedNavs": [
      15.4327,
      15.5738,
      15.5022,
      15.4144,
      15.3809,
      15.4463,
      15.6184
    ],
    "verified": 15.4144,
    "firstReturn": -0.005663712247293932,
    "secondReturn": -0.0021732925057089477,
    "fetchedAt": "2026-10-25T10:34:20.846Z",
    "sourceObservedAt": "2026-10-25T10:34:21.131Z",
    "sourceDocumentSha256": "24584fcef99625bcfc8cf95dc9714e35d2b4db06b1ade47baa8140945c24a61a"
  },
  {
    "meta": {
      "schemeCode": 119516,
      "schemeName": "Aditya Birla Sun Life International Equity Fund - Direct Plan - IDCW",
      "fundHouse": "Aditya Birla Sun Life Mutual Fund",
      "schemeType": "Open Ended Schemes",
      "schemeCategory": "Equity Scheme - Sectoral/ Thematic",
      "isinGrowth": "INF209K01Q89",
      "isinDivReinvestment": "INF209K01WT1"
    },
    "internalCode": "297DZ",
    "dates": [
      "2019-04-05",
      "2019-04-08",
      "2019-04-09",
      "2019-04-10",
      "2019-04-11",
      "2019-04-12",
      "2019-04-15"
    ],
    "navs": [
      21.6311,
      21.8295,
      21.7294,
      70.5846,
      21.5598,
      21.6516,
      21.8935
    ],
    "expectedNavs": [
      21.6311,
      21.8295,
      21.7294,
      21.6065,
      21.5598,
      21.6516,
      21.8935
    ],
    "verified": 21.6065,
    "firstReturn": -0.005655931594981914,
    "secondReturn": -0.0021613866197671998,
    "fetchedAt": "2026-10-30T16:26:55.742Z",
    "sourceObservedAt": "2026-10-30T16:26:55.980Z",
    "sourceDocumentSha256": "a2c7ccd5df2d065dfe343bf1aacea728bdf573631213f01b145e5cca16c4e0f2"
  }
];

export function abslDistributionFixture(spec: AbslDistributionCorrectionFixture): FundData {
  return {
    meta: { ...spec.meta },
    points: spec.dates.map((date, i) => ({ date, nav: spec.navs[i] })),
    fetchedAt: spec.fetchedAt, sourceObservedAt: spec.sourceObservedAt,
    source: 'mfapi.in', fromCache: true, stale: false,
    warnings: [ABSL_DISTRIBUTION_WARNING],
  };
}
