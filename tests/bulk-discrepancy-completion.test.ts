import assert from 'node:assert/strict';
import test from 'node:test';
import { financialNavBasis } from '../src/lib/corporate-actions.ts';
import { absoluteReturn, isGrowthScheme } from '../src/lib/analytics.ts';
import { qualityBlocked } from '../src/lib/format.ts';
import type { FundData, FundMeta } from '../src/lib/types.ts';

interface Fixture {
  meta: FundMeta; dates: string[]; navs: number[]; expectedNavs: number[];
  eventReturns: number[]; growthEligible: boolean;
  actions: { oldNavThrough: string; firstNewNavDate: string; factor: number;
    maxFactorDeviation: number; evidenceUrl: string }[];
}

// Literal checkpoint-213 observations. Decimal expectations were calculated
// independently from primary unit terms, before editing the production registry.
// Full histories and exact source hashes are reconciled in the bulk evidence ledger.
const FIXTURES: Fixture[] = [
  { meta: {"schemeCode":145481,"schemeName":"ADITYA BIRLA SUN LIFE OVERNIGHT FUND - Regular Plan - GROWTH","fundHouse":"Aditya Birla Sun Life Mutual Fund","isinGrowth":"INF209KB1ZC3","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Debt Scheme - Overnight Fund"},
    dates: ["2018-11-02", "2018-11-04", "2018-11-05"], navs: [10.0033, 1000.6706, 1000.8312],
    expectedNavs: [1000.33, 1000.6706, 1000.8312], eventReturns: [0.0003404876390791039],
    growthEligible: true, actions: [{"oldNavThrough":"2018-11-02","firstNewNavDate":"2018-11-04","factor":100,"maxFactorDeviation":0.1,"evidenceUrl":"https://bsmedia.business-standard.com/_media/bs/data/announcements/bse/02112018/6f0ab561-caf1-483a-9772-ec88472f67ba.pdf#page=3"}] },
  { meta: {"schemeCode":145486,"schemeName":"ADITYA BIRLA SUN LIFE OVERNIGHT FUND - Direct Plan - GROWTH","fundHouse":"Aditya Birla Sun Life Mutual Fund","isinGrowth":"INF209KB1ZH2","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Debt Scheme - Overnight Fund"},
    dates: ["2018-11-02", "2018-11-04", "2018-11-05"], navs: [10.0034, 1000.6884, 1000.8526],
    expectedNavs: [1000.34, 1000.6884, 1000.8526], eventReturns: [0.00034828158426135114],
    growthEligible: true, actions: [{"oldNavThrough":"2018-11-02","firstNewNavDate":"2018-11-04","factor":100,"maxFactorDeviation":0.1,"evidenceUrl":"https://bsmedia.business-standard.com/_media/bs/data/announcements/bse/02112018/6f0ab561-caf1-483a-9772-ec88472f67ba.pdf#page=3"}] },
  { meta: {"schemeCode":141545,"schemeName":"Axis Nifty 50 ETF","fundHouse":"Axis Mutual Fund","isinGrowth":"INF846K01W98","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Exchange Traded Funds (ETFs) - Equity ETF"},
    dates: ["2020-07-23", "2020-07-24", "2020-07-27", "2020-07-28"], navs: [1160.5924, 1158.4007, 115.1955, 116.9362],
    expectedNavs: [116.05924, 115.84007, 115.1955, 116.9362], eventReturns: [-0.005564309482893095],
    growthEligible: false, actions: [{"oldNavThrough":"2020-07-24","firstNewNavDate":"2020-07-27","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://www.nseindia.com/api/corporates-corporateActions?index=mf&from_date=01-07-2020&to_date=31-07-2020"}] },
  { meta: {"schemeCode":109353,"schemeName":"Canara Robeco Liquid Fund - Regular Plan - GROWTH OPTION","fundHouse":"Canara Robeco Mutual Fund","isinGrowth":"INF760K01CW9","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Income/Debt Oriented Schemes - Liquid Fund"},
    dates: ["2011-08-19", "2011-08-20", "2011-08-21", "2011-08-22"], navs: [12.3239, 12.3269, 1232.9891, 1233.2835],
    expectedNavs: [1232.39, 1232.69, 1232.9891, 1233.2835], eventReturns: [0.00024264007982542244],
    growthEligible: true, actions: [{"oldNavThrough":"2011-08-20","firstNewNavDate":"2011-08-21","factor":100,"maxFactorDeviation":0.1,"evidenceUrl":"https://www.canararobeco.com/wp-content/uploads/2025/02/canara-robeco-liquid-fund-f-y-2012-13.pdf#page=21"}] },
  { meta: {"schemeCode":109371,"schemeName":"Canara Robeco Ultra Short Term Fund - Regular Plan - GROWTH OPTION","fundHouse":"Canara Robeco Mutual Fund","isinGrowth":"INF760K01DC9","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Income/Debt Oriented Schemes - Ultra Short Term Fund"},
    dates: ["2011-08-18", "2011-08-19", "2011-08-22", "2011-08-23"], navs: [15.3639, 15.3675, 1537.8711, 1538.2531],
    expectedNavs: [1536.39, 1536.75, 1537.8711, 1538.2531], eventReturns: [0.000729526598340654],
    growthEligible: true, actions: [{"oldNavThrough":"2011-08-19","firstNewNavDate":"2011-08-22","factor":100,"maxFactorDeviation":0.1,"evidenceUrl":"https://www.canararobeco.com/wp-content/uploads/2025/02/canara-robeco-treasury-advantage-f-y-2012-13.pdf#page=22"}] },
  { meta: {"schemeCode":149403,"schemeName":"DSP Nifty Midcap 150 Quality 50 ETF","fundHouse":"DSP Mutual Fund","isinGrowth":"INF740KA1ZF3","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-06"], navs: [246.0859, 247.4292, 24.6921, 24.8373],
    expectedNavs: [24.60859, 24.74292, 24.6921, 24.8373], eventReturns: [-0.0020539208791848333],
    growthEligible: false, actions: [{"oldNavThrough":"2026-07-02","firstNewNavDate":"2026-07-03","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML74912.pdf#page=1"}] },
  { meta: {"schemeCode":150523,"schemeName":"DSP Silver ETF","fundHouse":"DSP Mutual Fund","isinGrowth":"INF740KA1ZQ0","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Exchange Traded Funds (ETFs) - Silver ETF"},
    dates: ["2026-08-26", "2026-08-27", "2026-08-28", "2026-08-31"], navs: [232.0312, 228.7309, 23.3002, 22.6319],
    expectedNavs: [23.20312, 22.87309, 23.3002, 22.6319], eventReturns: [0.018673034557202373],
    growthEligible: false, actions: [{"oldNavThrough":"2026-08-27","firstNewNavDate":"2026-08-28","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML75868.pdf#page=1"}] },
  { meta: {"schemeCode":151737,"schemeName":"DSP Gold ETF","fundHouse":"DSP Mutual Fund","isinGrowth":"INF740KA1ZP2","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Exchange Traded Funds (ETFs) - Gold ETF"},
    dates: ["2026-08-26", "2026-08-27", "2026-08-28", "2026-08-31"], navs: [154.9612, 152.3813, 15.3425, 14.9875],
    expectedNavs: [15.49612, 15.23813, 15.3425, 14.9875], eventReturns: [0.0068492656251127925],
    growthEligible: false, actions: [{"oldNavThrough":"2026-08-27","firstNewNavDate":"2026-08-28","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML75868.pdf#page=1"}] },
  { meta: {"schemeCode":152306,"schemeName":"DSP Nifty Healthcare ETF","fundHouse":"DSP Mutual Fund","isinGrowth":"INF740KA1ZG1","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-06"], navs: [161.9455, 162.8506, 16.5804, 16.6201],
    expectedNavs: [16.19455, 16.28506, 16.5804, 16.6201], eventReturns: [0.01813564088802866],
    growthEligible: false, actions: [{"oldNavThrough":"2026-07-02","firstNewNavDate":"2026-07-03","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML74912.pdf#page=1"}] },
  { meta: {"schemeCode":152957,"schemeName":"Groww Gold ETF","fundHouse":"Groww Mutual Fund","isinGrowth":"INF666M01OE7","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Exchange Traded Funds (ETFs) - Gold ETF"},
    dates: ["2026-02-04", "2026-02-05", "2026-02-06", "2026-02-09"], navs: [152.8297, 147.8827, 14.8031, 15.0487],
    expectedNavs: [15.28297, 14.78827, 14.8031, 15.0487], eventReturns: [0.001002821831086395],
    growthEligible: false, actions: [{"oldNavThrough":"2026-02-05","firstNewNavDate":"2026-02-06","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML72617.pdf#page=1"}] },
  { meta: {"schemeCode":153524,"schemeName":"Groww Silver ETF","fundHouse":"Groww Mutual Fund","isinGrowth":"INF666M01OF4","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Exchange Traded Funds (ETFs) - Silver ETF"},
    dates: ["2026-02-04", "2026-02-05", "2026-02-06", "2026-02-09"], navs: [274.326, 244.566, 23.52, 24.6092],
    expectedNavs: [27.4326, 24.4566, 23.52, 24.6092], eventReturns: [-0.038296410784818824],
    growthEligible: false, actions: [{"oldNavThrough":"2026-02-05","firstNewNavDate":"2026-02-06","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML72617.pdf#page=1"}] },
  { meta: {"schemeCode":139455,"schemeName":"ICICI Prudential Nifty50 Value 20 ETF","fundHouse":"ICICI Prudential Mutual Fund","isinGrowth":"INF109KC11V0","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2024-02-29", "2024-03-01", "2024-03-04", "2024-03-05"], navs: [136.0269, 137.643, 13.8284, 13.7667],
    expectedNavs: [13.60269, 13.7643, 13.8284, 13.7667], eventReturns: [0.004656974927893173],
    growthEligible: false, actions: [{"oldNavThrough":"2024-03-01","firstNewNavDate":"2024-03-04","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML60740.pdf#page=1"}] },
  { meta: {"schemeCode":139519,"schemeName":"ICICI Prudential BSE Midcap Select ETF","fundHouse":"ICICI Prudential Mutual Fund","isinGrowth":"INF109KC10W0","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2024-05-09", "2024-05-10", "2024-05-13", "2024-05-14"], navs: [153.5418, 154.506, 15.5328, 15.6812],
    expectedNavs: [15.35418, 15.4506, 15.5328, 15.6812], eventReturns: [0.005320181740514932],
    growthEligible: false, actions: [{"oldNavThrough":"2024-05-10","firstNewNavDate":"2024-05-13","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML61766.pdf#page=1"}] },
  { meta: {"schemeCode":141596,"schemeName":"ICICI Prudential Nifty 100 Low Volatility 30 ETF","fundHouse":"ICICI Prudential Mutual Fund","isinGrowth":"INF109KC19U5","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2024-02-29", "2024-03-01", "2024-03-04", "2024-03-05"], navs: [195.067, 196.363, 19.7146, 19.6482],
    expectedNavs: [19.5067, 19.6363, 19.7146, 19.6482], eventReturns: [0.003987512922495582],
    growthEligible: false, actions: [{"oldNavThrough":"2024-03-01","firstNewNavDate":"2024-03-04","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML60740.pdf#page=1"}] },
  { meta: {"schemeCode":143247,"schemeName":"ICICI Prudential BSE 500 ETF","fundHouse":"ICICI Prudential Mutual Fund","isinGrowth":"INF109KC1V59","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2021-10-28", "2021-10-29", "2021-11-01", "2021-11-02"], navs: [250.4542, 248.73, 25.2242, 25.2436],
    expectedNavs: [25.04542, 24.873, 25.2242, 25.2436], eventReturns: [0.01411972821935432],
    growthEligible: false, actions: [{"oldNavThrough":"2021-10-29","firstNewNavDate":"2021-11-01","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://www.nseindia.com/api/corporates-corporateActions?index=mf&symbol=BSE500IETF&from_date=01-10-2021&to_date=30-11-2021"}] },
  { meta: {"schemeCode":144587,"schemeName":"ICICI Prudential Nifty Next 50 ETF","fundHouse":"ICICI Prudential Mutual Fund","isinGrowth":"INF109KC1NS5","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2018-11-15", "2018-11-16", "2018-11-19", "2018-11-20"], navs: [273.36, 274.4, 27.59, 27.25],
    expectedNavs: [27.336, 27.44, 27.59, 27.25], eventReturns: [0.005466472303206997],
    growthEligible: false, actions: [{"oldNavThrough":"2018-11-16","firstNewNavDate":"2018-11-19","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://www.icicipruamc.com/blob/emailmedia/mutualfund/Passive%20Factsheet%20PDF%202.pdf#page=10"}] },
  { meta: {"schemeCode":147483,"schemeName":"ICICI Prudential Nifty Bank ETF","fundHouse":"ICICI Prudential Mutual Fund","isinGrowth":"INF109KC15I8","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2022-09-01", "2022-09-02", "2022-09-05", "2022-09-06"], navs: [394.1309, 395.327, 39.9181, 39.7783],
    expectedNavs: [39.41309, 39.5327, 39.9181, 39.7783], eventReturns: [0.0097488914240616],
    growthEligible: false, actions: [{"oldNavThrough":"2022-09-02","firstNewNavDate":"2022-09-05","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML53404.pdf#page=1"}] },
  { meta: {"schemeCode":147530,"schemeName":"ICICI Prudential Nifty Private Bank ETF","fundHouse":"ICICI Prudential Mutual Fund","isinGrowth":"INF109KC18U7","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2024-02-29", "2024-03-01", "2024-03-04", "2024-03-05"], navs: [230.389, 236.213, 23.7117, 23.6638],
    expectedNavs: [23.0389, 23.6213, 23.7117, 23.6638], eventReturns: [0.003827054395820721],
    growthEligible: false, actions: [{"oldNavThrough":"2024-03-01","firstNewNavDate":"2024-03-04","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML60740.pdf#page=1"}] },
  { meta: {"schemeCode":147921,"schemeName":"ICICI Prudential Nifty Midcap 150 ETF","fundHouse":"ICICI Prudential Mutual Fund","isinGrowth":"INF109KC11W8","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2024-05-09", "2024-05-10", "2024-05-13", "2024-05-14"], navs: [186.6539, 188.473, 18.9428, 19.12],
    expectedNavs: [18.66539, 18.8473, 18.9428, 19.12], eventReturns: [0.005067038780090517],
    growthEligible: false, actions: [{"oldNavThrough":"2024-05-10","firstNewNavDate":"2024-05-13","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML61766.pdf#page=1"}] },
  { meta: {"schemeCode":148456,"schemeName":"ICICI Prudential Nifty Alpha Low- Volatility 30 ETF","fundHouse":"ICICI Prudential Mutual Fund","isinGrowth":"INF109KC17V7","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2024-05-09", "2024-05-10", "2024-05-13", "2024-05-14"], navs: [266.4457, 269.356, 27.1022, 27.2246],
    expectedNavs: [26.64457, 26.9356, 27.1022, 27.2246], eventReturns: [0.006185123034200092],
    growthEligible: false, actions: [{"oldNavThrough":"2024-05-10","firstNewNavDate":"2024-05-13","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML61766.pdf#page=1"}] },
  { meta: {"schemeCode":148466,"schemeName":"ICICI Prudential Nifty IT ETF","fundHouse":"ICICI Prudential Mutual Fund","isinGrowth":"INF109KC16I6","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2022-09-01", "2022-09-02", "2022-09-05", "2022-09-06"], navs: [287.6885, 286.643, 28.7576, 28.6606],
    expectedNavs: [28.76885, 28.6643, 28.7576, 28.6606], eventReturns: [0.0032549198829205667],
    growthEligible: false, actions: [{"oldNavThrough":"2022-09-02","firstNewNavDate":"2022-09-05","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML53404.pdf#page=1"}] },
  { meta: {"schemeCode":149072,"schemeName":"ICICI Prudential Nifty FMCG ETF","fundHouse":"ICICI Prudential Mutual Fund","isinGrowth":"INF109KC19V3","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2024-05-09", "2024-05-10", "2024-05-13", "2024-05-14"], navs: [566.9909, 573.75, 57.4409, 57.1633],
    expectedNavs: [56.69909, 57.375, 57.4409, 57.1633], eventReturns: [0.0011485838779956427],
    growthEligible: false, actions: [{"oldNavThrough":"2024-05-10","firstNewNavDate":"2024-05-13","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML61766.pdf#page=1"}] },
  { meta: {"schemeCode":149463,"schemeName":"ICICI Prudential Nifty Auto ETF","fundHouse":"ICICI Prudential Mutual Fund","isinGrowth":"INF109KC10V2","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2024-02-29", "2024-03-01", "2024-03-04", "2024-03-05"], navs: [207.1675, 211.831, 21.1506, 21.4356],
    expectedNavs: [20.71675, 21.1831, 21.1506, 21.4356], eventReturns: [-0.00153424191926583],
    growthEligible: false, actions: [{"oldNavThrough":"2024-03-01","firstNewNavDate":"2024-03-04","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML60740.pdf#page=1"}] },
  { meta: {"schemeCode":151907,"schemeName":"ICICI Prudential Nifty 200 Quality 30 ETF","fundHouse":"ICICI Prudential Mutual Fund","isinGrowth":"INF109KC18V5","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2024-05-09", "2024-05-10", "2024-05-13", "2024-05-14"], navs: [187.4433, 188.694, 18.9683, 19.0958],
    expectedNavs: [18.74433, 18.8694, 18.9683, 19.0958], eventReturns: [0.005241290131111747],
    growthEligible: false, actions: [{"oldNavThrough":"2024-05-10","firstNewNavDate":"2024-05-13","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML61766.pdf#page=1"}] },
  { meta: {"schemeCode":104486,"schemeName":"Invesco India Liquid Fund - Regular Plan - Growth","fundHouse":"Invesco Mutual Fund","isinGrowth":"INF205K01HM5","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Income/Debt Oriented Schemes - Liquid Fund"},
    dates: ["2011-02-24", "2011-02-25", "2011-02-27", "2011-02-28"], navs: [13.3605, 13.3635, 1336.9456, 1337.2457],
    expectedNavs: [1336.05, 1336.35, 1336.9456, 1337.2457], eventReturns: [0.00044569162270363303],
    growthEligible: true, actions: [{"oldNavThrough":"2011-02-25","firstNewNavDate":"2011-02-27","factor":100,"maxFactorDeviation":0.1,"evidenceUrl":"https://invescomutualfund.com/docs/default-source/default-document-library/annual-report-fy-2016-2017.pdf?sfvrsn=0#page=92"}] },
  { meta: {"schemeCode":104488,"schemeName":"Invesco India Liquid Fund - Regular Plan - Growth","fundHouse":"Invesco Mutual Fund","isinGrowth":"INF205K01HG7","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Income/Debt Oriented Schemes - Liquid Fund"},
    dates: ["2011-02-24", "2011-02-25", "2011-02-27", "2011-02-28"], navs: [13.1427, 13.1454, 1315.0759, 1315.344],
    expectedNavs: [1314.27, 1314.54, 1315.0759, 1315.344], eventReturns: [0.000407671124499825],
    growthEligible: true, actions: [{"oldNavThrough":"2011-02-25","firstNewNavDate":"2011-02-27","factor":100,"maxFactorDeviation":0.1,"evidenceUrl":"https://invescomutualfund.com/docs/default-source/default-document-library/annual-report-fy-2016-2017.pdf?sfvrsn=0#page=92"}] },
  { meta: {"schemeCode":104726,"schemeName":"Invesco India Ultra Short to Short Term Fund - Regular Plan - Growth","fundHouse":"Invesco Mutual Fund","isinGrowth":"INF205K01HY0","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Income/Debt Oriented Schemes - Ultra Short to Short Term Fund"},
    dates: ["2011-02-24", "2011-02-25", "2011-02-28", "2011-03-01"], navs: [13.4045, 13.4076, 1341.6663, 1341.9756],
    expectedNavs: [1340.45, 1340.76, 1341.6663, 1341.9756], eventReturns: [0.0006759599033384051],
    growthEligible: true, actions: [{"oldNavThrough":"2011-02-25","firstNewNavDate":"2011-02-28","factor":100,"maxFactorDeviation":0.1,"evidenceUrl":"https://invescomutualfund.com/docs/default-source/default-document-library/annual-report-fy-2016-2017.pdf?sfvrsn=0#page=92"}] },
  { meta: {"schemeCode":112368,"schemeName":"Invesco India Gold Exchange Traded Fund - Regular Plan - Growth","fundHouse":"Invesco Mutual Fund","isinGrowth":"INF205KA1BP1","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Exchange Traded Funds (ETFs) - Gold ETF"},
    dates: ["2026-04-28", "2026-04-29", "2026-04-30", "2026-05-04"], navs: [12879.3395, 12786.2383, 129.8369, 127.8003],
    expectedNavs: [128.793395, 127.862383, 129.8369, 127.8003], eventReturns: [0.015442516819039733],
    growthEligible: true, actions: [{"oldNavThrough":"2026-04-29","firstNewNavDate":"2026-04-30","factor":0.01,"maxFactorDeviation":0.0005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML73909.pdf#page=1"}] },
  { meta: {"schemeCode":115284,"schemeName":"Invesco India Nifty 50 Exchange Traded Fund - Regular Plan - Growth","fundHouse":"Invesco Mutual Fund","isinGrowth":"INF205KA1CC7","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Exchange Traded Funds (ETFs) - Equity ETF"},
    dates: ["2026-07-29", "2026-07-30", "2026-07-31", "2026-08-03"], navs: [2780.1438, 2787.7876, 279.5975, 284.2699],
    expectedNavs: [278.01438, 278.77876, 279.5975, 284.2699], eventReturns: [0.0029368808441503935],
    growthEligible: true, actions: [{"oldNavThrough":"2026-07-30","firstNewNavDate":"2026-07-31","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML75432.pdf#page=1"}] },
  { meta: {"schemeCode":100835,"schemeName":"Kotak Liquid Fund - Regular Plan - Growth","fundHouse":"Kotak Mahindra Mutual Fund","isinGrowth":"INF174K01NI9","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Income/Debt Oriented Schemes - Liquid Fund"},
    dates: ["2013-01-17", "2013-01-18", "2013-01-20", "2013-01-21"], navs: [23.3922, 23.3975, 2340.8205, 2341.3536],
    expectedNavs: [2339.22, 2339.75, 2340.8205, 2341.3536], eventReturns: [0.0004575275136232503],
    growthEligible: true, actions: [{"oldNavThrough":"2013-01-18","firstNewNavDate":"2013-01-20","factor":100,"maxFactorDeviation":0.1,"evidenceUrl":"https://vatseelabs-s3.kotakmf.com/FormsDownloads_BKP_05_April_2024/Addendums/KLiquid,-KFST---14-January-2013/14-01-13.pdf#page=1"}] },
  { meta: {"schemeCode":101893,"schemeName":"Kotak Money Market Fund - Regular Plan - (Growth)","fundHouse":"Kotak Mahindra Mutual Fund","isinGrowth":"INF174K01NA6","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Income/Debt Oriented Schemes - Money Market Fund"},
    dates: ["2013-01-17", "2013-01-18", "2013-01-20", "2013-01-21"], navs: [18.8908, 18.8951, 1890.3857, 1890.8246],
    expectedNavs: [1889.08, 1889.51, 1890.3857, 1890.8246], eventReturns: [0.0004634534879413181],
    growthEligible: true, actions: [{"oldNavThrough":"2013-01-18","firstNewNavDate":"2013-01-20","factor":100,"maxFactorDeviation":0.1,"evidenceUrl":"https://vatseelabs-s3.kotakmf.com/FormsDownloads_BKP_05_April_2024/Addendums/KLiquid,-KFST---14-January-2013/14-01-13.pdf#page=1"}] },
  { meta: {"schemeCode":106193,"schemeName":"KOTAK GOLD ETF","fundHouse":"Kotak Mahindra Mutual Fund","isinGrowth":"INF174KA1HJ8","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Gold ETF"},
    dates: ["2015-04-10", "2015-04-13", "2015-04-15", "2015-04-16", "2016-01-01", "2017-01-02", "2018-01-01", "2019-01-01", "2020-01-01", "2021-01-01", "2021-07-20", "2021-07-22", "2021-07-23", "2021-07-26"], navs: [2474.7078, 2467.7746, 245.325, 248.1237, 231.0563, 255.8238, 261.6539, 280.773, 346.2717, 437.2755, 420.811, 414.7251, 41.6153, 41.7327],
    expectedNavs: [24.747078, 24.677746, 24.5325, 24.81237, 23.10563, 25.58238, 26.16539, 28.0773, 34.62717, 43.72755, 42.0811, 41.47251, 41.6153, 41.7327], eventReturns: [-0.00588570771414861, 0.0034430035703168194],
    growthEligible: false, actions: [{"oldNavThrough":"2015-04-13","firstNewNavDate":"2015-04-15","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://www.msei.in/SX-Content/Circulars/2015/April/Circular-2894.pdf#page=1"},{"oldNavThrough":"2021-07-22","firstNewNavDate":"2021-07-23","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://archives.nseindia.com/content/circulars/CMPT48962.pdf#page=1"}] },
  { meta: {"schemeCode":106929,"schemeName":"Kotak Nifty PSU Bank ETF","fundHouse":"Kotak Mahindra Mutual Fund","isinGrowth":"INF174KA1A86","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Exchange Traded Funds (ETFs) - Equity ETF"},
    dates: ["2026-07-08", "2026-07-09", "2026-07-10", "2026-07-13"], navs: [809.0168, 822.0532, 84.6849, 84.7714],
    expectedNavs: [80.90168, 82.20532, 84.6849, 84.7714], eventReturns: [0.030163254640940513],
    growthEligible: false, actions: [{"oldNavThrough":"2026-07-09","firstNewNavDate":"2026-07-10","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://vatseelabs-s3.kotakmf.com/FormsDownloads/Addendums/Notice-cum-addendum---Change-in-Face-Value-&-Creation-Unit-size-of-Kotak-Nifty-PSU-Bank-ETF-June-23,-2026/NoticecumaddendumChangeinFaceValueCreationUnitsize.pdf#page=1"}] },
  { meta: {"schemeCode":109010,"schemeName":"Kotak BSE Sensex ETF","fundHouse":"Kotak Mahindra Mutual Fund","isinGrowth":"INF174KA1JD7","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2022-07-20", "2022-07-21", "2022-07-22", "2022-07-25"], navs: [584.1327, 587.5397, 59.1638, 58.8406],
    expectedNavs: [58.41327, 58.75397, 59.1638, 58.8406], eventReturns: [0.0069753584310983585],
    growthEligible: false, actions: [{"oldNavThrough":"2022-07-21","firstNewNavDate":"2022-07-22","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://vatseelabs-s3.kotakmf.com/FormsDownloads/Addendums/Addendum-Sensex-ETF-July-7,-2022/NoticecumaddendumChangeinFaceValueandCreationUnitsizeofKotakSandPBSESensexETF.pdf#page=1"}] },
  { meta: {"schemeCode":112351,"schemeName":"Kotak Nifty 50 ETF","fundHouse":"Kotak Mahindra Mutual Fund","isinGrowth":"INF174K014P6","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2017-07-26", "2017-07-27", "2017-07-28", "2017-07-31"], navs: [1011.2159, 1011.3517, 101.0737, 101.7096],
    expectedNavs: [101.12159, 101.13517, 101.0737, 101.7096], eventReturns: [-0.0006078004318379056],
    growthEligible: false, actions: [{"oldNavThrough":"2017-07-27","firstNewNavDate":"2017-07-28","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://vatseelabs-s3.kotakmf.com/FormsDownloads/Addendums/Kotak-Nifty-ETF---13-July-2017/13July2017.pdf#page=1"}] },
  { meta: {"schemeCode":119746,"schemeName":"Kotak Money Market Fund - Direct Plan - (Growth)","fundHouse":"Kotak Mahindra Mutual Fund","isinGrowth":"INF174K01MW2","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Income/Debt Oriented Schemes - Money Market Fund"},
    dates: ["2013-01-17", "2013-01-18", "2013-01-20", "2013-01-21"], navs: [18.8913, 18.8957, 1890.4426, 1890.8842],
    expectedNavs: [1889.13, 1889.57, 1890.4426, 1890.8842], eventReturns: [0.00046179818688908057],
    growthEligible: true, actions: [{"oldNavThrough":"2013-01-18","firstNewNavDate":"2013-01-20","factor":100,"maxFactorDeviation":0.1,"evidenceUrl":"https://vatseelabs-s3.kotakmf.com/FormsDownloads_BKP_05_April_2024/Addendums/KLiquid,-KFST---14-January-2013/14-01-13.pdf#page=1"}] },
  { meta: {"schemeCode":119766,"schemeName":"Kotak Liquid Fund - Direct Plan - Growth","fundHouse":"Kotak Mahindra Mutual Fund","isinGrowth":"INF174K01NE8","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Income/Debt Oriented Schemes - Liquid Fund"},
    dates: ["2013-01-17", "2013-01-18", "2013-01-20", "2013-01-21"], navs: [23.3927, 23.398, 2340.8814, 2341.4178],
    expectedNavs: [2339.27, 2339.8, 2340.8814, 2341.4178], eventReturns: [0.0004621762543807163],
    growthEligible: true, actions: [{"oldNavThrough":"2013-01-18","firstNewNavDate":"2013-01-20","factor":100,"maxFactorDeviation":0.1,"evidenceUrl":"https://vatseelabs-s3.kotakmf.com/FormsDownloads_BKP_05_April_2024/Addendums/KLiquid,-KFST---14-January-2013/14-01-13.pdf#page=1"}] },
  { meta: {"schemeCode":133122,"schemeName":"Kotak Nifty Bank ETF","fundHouse":"Kotak Mahindra Mutual Fund","isinGrowth":"INF174KA1ZB7","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2026-02-25", "2026-02-26", "2026-02-27", "2026-03-02"], navs: [631.0948, 632.4949, 62.5682, 61.8549],
    expectedNavs: [63.10948, 63.24949, 62.5682, 61.8549], eventReturns: [-0.010771470252171204],
    growthEligible: false, actions: [{"oldNavThrough":"2026-02-26","firstNewNavDate":"2026-02-27","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://vatseelabs-s3.kotakmf.com/FormsDownloads/Addendums/Notice-Cum-Addendum---Change-in-Face-value-of-Units-and-Creation-unit-size-in-certain-scheme(s)-of-Kotak-Mahindra-Mutual-Fund-Feb-17,-2026/February172026ChangeinFacevalueofUnitsandCreationunitsizeincertainschemesofKotakMahindraMutualFund.pdf#page=1"}] },
  { meta: {"schemeCode":135744,"schemeName":"Kotak Nifty 50 Value 20 ETF","fundHouse":"Kotak Mahindra Mutual Fund","isinGrowth":"INF174KA1ZE1","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2026-02-25", "2026-02-26", "2026-02-27", "2026-03-02"], navs: [152.2915, 152.4884, 15.1024, 14.9943],
    expectedNavs: [15.22915, 15.24884, 15.1024, 14.9943], eventReturns: [-0.009603353435408857],
    growthEligible: false, actions: [{"oldNavThrough":"2026-02-26","firstNewNavDate":"2026-02-27","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://vatseelabs-s3.kotakmf.com/FormsDownloads/Addendums/Notice-Cum-Addendum---Change-in-Face-value-of-Units-and-Creation-unit-size-in-certain-scheme(s)-of-Kotak-Mahindra-Mutual-Fund-Feb-17,-2026/February172026ChangeinFacevalueofUnitsandCreationunitsizeincertainschemesofKotakMahindraMutualFund.pdf#page=1"}] },
  { meta: {"schemeCode":149757,"schemeName":"Kotak Nifty Midcap 50 ETF","fundHouse":"Kotak Mahindra Mutual Fund","isinGrowth":"INF174KA1ZC5","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2026-02-25", "2026-02-26", "2026-02-27", "2026-03-02"], navs: [171.7017, 172.8852, 17.1056, 16.8556],
    expectedNavs: [17.17017, 17.28852, 17.1056, 16.8556], eventReturns: [-0.010580431407662426],
    growthEligible: false, actions: [{"oldNavThrough":"2026-02-26","firstNewNavDate":"2026-02-27","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://vatseelabs-s3.kotakmf.com/FormsDownloads/Addendums/Notice-Cum-Addendum---Change-in-Face-value-of-Units-and-Creation-unit-size-in-certain-scheme(s)-of-Kotak-Mahindra-Mutual-Fund-Feb-17,-2026/February172026ChangeinFacevalueofUnitsandCreationunitsizeincertainschemesofKotakMahindraMutualFund.pdf#page=1"}] },
  { meta: {"schemeCode":150492,"schemeName":"Kotak Nifty India Consumption ETF","fundHouse":"Kotak Mahindra Mutual Fund","isinGrowth":"INF174KA1ZF8","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2026-02-25", "2026-02-26", "2026-02-27", "2026-03-02"], navs: [119.8786, 119.9479, 11.8175, 11.6291],
    expectedNavs: [11.98786, 11.99479, 11.8175, 11.6291], eventReturns: [-0.014780583903511441],
    growthEligible: false, actions: [{"oldNavThrough":"2026-02-26","firstNewNavDate":"2026-02-27","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://vatseelabs-s3.kotakmf.com/FormsDownloads/Addendums/Notice-Cum-Addendum---Change-in-Face-value-of-Units-and-Creation-unit-size-in-certain-scheme(s)-of-Kotak-Mahindra-Mutual-Fund-Feb-17,-2026/February172026ChangeinFacevalueofUnitsandCreationunitsizeincertainschemesofKotakMahindraMutualFund.pdf#page=1"}] },
  { meta: {"schemeCode":150948,"schemeName":"Kotak Silver ETF","fundHouse":"Kotak Mahindra Mutual Fund","isinGrowth":"INF174KA1ZD3","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2026-02-25", "2026-02-26", "2026-02-27", "2026-03-02"], navs: [256.5833, 250.5571, 25.6016, 27.8521],
    expectedNavs: [25.65833, 25.05571, 25.6016, 27.8521], eventReturns: [0.021787049738363033],
    growthEligible: false, actions: [{"oldNavThrough":"2026-02-26","firstNewNavDate":"2026-02-27","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://vatseelabs-s3.kotakmf.com/FormsDownloads/Addendums/Notice-Cum-Addendum---Change-in-Face-value-of-Units-and-Creation-unit-size-in-certain-scheme(s)-of-Kotak-Mahindra-Mutual-Fund-Feb-17,-2026/February172026ChangeinFacevalueofUnitsandCreationunitsizeincertainschemesofKotakMahindraMutualFund.pdf#page=1"}] },
  { meta: {"schemeCode":120249,"schemeName":"LIC MF Liquid Fund - Direct Plan - Growth","fundHouse":"LIC Mutual Fund","isinGrowth":"INF767K01DN1","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Debt Scheme - Liquid Fund"},
    dates: ["2013-01-19", "2013-01-20", "2013-01-21", "2013-01-22"], navs: [20.9388, 20.9435, 2094.8261, 2095.2939],
    expectedNavs: [2093.88, 2094.35, 2094.8261, 2095.2939], eventReturns: [0.00022732590063742928],
    growthEligible: true, actions: [{"oldNavThrough":"2013-01-20","firstNewNavDate":"2013-01-21","factor":100,"maxFactorDeviation":0.1,"evidenceUrl":"https://www.licmf.com/assets/pdf/statuary_disclosure/LIC%20-%20Balance%20Sheet%20-%2010%20May%202013.pdf#page=4"}] },
  { meta: {"schemeCode":151961,"schemeName":"LIC MF Gold Exchange Traded Fund","fundHouse":"LIC Mutual Fund","isinGrowth":"INF767K01SM1","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Gold ETF"},
    dates: ["2026-03-04", "2026-03-05", "2026-03-06", "2026-03-09"], navs: [14576.8662, 14403.0433, 142.4556, 143.4628],
    expectedNavs: [145.768662, 144.030433, 142.4556, 143.4628], eventReturns: [-0.010934029476950888],
    growthEligible: false, actions: [{"oldNavThrough":"2026-03-05","firstNewNavDate":"2026-03-06","factor":0.01,"maxFactorDeviation":0.0005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML73115.pdf#page=1"}] },
  { meta: {"schemeCode":114984,"schemeName":"Motilal Oswal Nasdaq 100 ETF","fundHouse":"Motilal Oswal Mutual Fund","isinGrowth":"INF247L01AP3","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2021-06-17", "2021-06-18", "2021-06-21", "2021-06-22"], navs: [1001.7978, 1025.4998, 101.5224, 102.4352],
    expectedNavs: [100.17978, 102.54998, 101.5224, 102.4352], eventReturns: [-0.010020284743107703],
    growthEligible: false, actions: [{"oldNavThrough":"2021-06-18","firstNewNavDate":"2021-06-21","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://www.msei.in/SX-Content/Circulars/2021/June/Circular-10553.pdf#page=1"}] },
  { meta: {"schemeCode":149801,"schemeName":"Motilal Oswal Nifty 200 Momentum 30 ETF","fundHouse":"Motilal Oswal Mutual Fund","isinGrowth":"INF247L01BK2","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2022-08-11", "2022-08-12", "2022-08-16", "2022-08-17"], navs: [187.4391, 188.9862, 38.2311, 38.3515],
    expectedNavs: [37.48782, 37.79724, 38.2311, 38.3515], eventReturns: [0.011478615898938652],
    growthEligible: false, actions: [{"oldNavThrough":"2022-08-12","firstNewNavDate":"2022-08-16","factor":0.2,"maxFactorDeviation":0.01,"evidenceUrl":"https://archives.nseindia.com/content/circulars/CML53260.pdf#page=1"}] },
  { meta: {"schemeCode":149921,"schemeName":"Motilal Oswal BSE Low Volatility ETF","fundHouse":"Motilal Oswal Mutual Fund","isinGrowth":"INF247L01BL0","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2022-08-11", "2022-08-12", "2022-08-16", "2022-08-17"], navs: [120.4671, 120.4685, 24.3511, 24.509],
    expectedNavs: [24.09342, 24.0937, 24.3511, 24.509], eventReturns: [0.010683290652743248],
    growthEligible: false, actions: [{"oldNavThrough":"2022-08-12","firstNewNavDate":"2022-08-16","factor":0.2,"maxFactorDeviation":0.01,"evidenceUrl":"https://archives.nseindia.com/content/circulars/CML53260.pdf#page=1"}] },
  { meta: {"schemeCode":112636,"schemeName":"Navi Liquid Fund - Regular Plan - Growth Option","fundHouse":"Navi Mutual Fund","isinGrowth":"INF959L01GL9","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Debt Scheme - Liquid Fund"},
    dates: ["2014-09-18", "2014-09-19", "2014-09-21", "2014-09-22", "2015-01-01", "2016-01-01", "2017-01-01", "2018-01-01", "2019-01-01", "2020-01-01", "2021-01-01", "2022-01-02", "2022-11-24", "2022-11-25", "2022-11-27", "2022-11-28"], navs: [14.6684, 14.6718, 1467.877, 1468.2229, 1503.1412, 1628.603, 1755.575, 1874.3097, 2013.3388, 2138.232, 2216.5149, 2292.0457, 2392.5514, 2392.9649, 23.9379, 23.9409],
    expectedNavs: [14.6684, 14.6718, 14.67877, 14.682229, 15.031412, 16.28603, 17.55575, 18.743097, 20.133388, 21.38232, 22.165149, 22.920457, 23.925514, 23.929649, 23.9379, 23.9409], eventReturns: [0.00047506100137679086, 0.0003448023830186561],
    growthEligible: true, actions: [{"oldNavThrough":"2014-09-19","firstNewNavDate":"2014-09-21","factor":100,"maxFactorDeviation":0.1,"evidenceUrl":"https://navi-amc-docs.s3.ap-south-1.amazonaws.com/Factsheet/Factsheets/2021-22/Factsheet_November%202021.pdf#page=13"},{"oldNavThrough":"2022-11-25","firstNewNavDate":"2022-11-27","factor":0.01,"maxFactorDeviation":1e-05,"evidenceUrl":"https://nsearchives.nseindia.com/corporate/TRITURBINE_20112022113809_TTL_NEWS_20_11_2022.pdf#page=2"}] },
  { meta: {"schemeCode":103048,"schemeName":"Nippon India Money Market Fund - Regular Plan - Growth Option","fundHouse":"Nippon India Mutual Fund","isinGrowth":"INF204K01VA4","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Debt Scheme - Money Market Fund"},
    dates: ["2012-08-02", "2012-08-03", "2012-08-05", "2012-08-06"], navs: [16.7009, 16.705, 1671.3154, 1671.7598],
    expectedNavs: [1670.09, 1670.5, 1671.3154, 1671.7598], eventReturns: [0.00048811733014067645],
    growthEligible: true, actions: [{"oldNavThrough":"2012-08-03","firstNewNavDate":"2012-08-05","factor":100,"maxFactorDeviation":0.1,"evidenceUrl":"https://mf.nipponindiaim.com/InvestorServices/AnnualHalfYearlyReportsFY20122013/Half_Yearly_Portfolio_-_Financials_-_Oct-_2012_-_for_Website_upload.pdf#page=34"}] },
  { meta: {"schemeCode":107693,"schemeName":"Quantum Gold ETF","fundHouse":"Quantum Mutual Fund","isinGrowth":"INF082J01408","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Gold ETF"},
    dates: ["2021-12-16", "2021-12-17", "2021-12-20", "2021-12-21"], navs: [2082.7869, 2107.2943, 41.8417, 41.6155],
    expectedNavs: [41.655738, 42.145886, 41.8417, 41.6155], eventReturns: [-0.007217454154362777],
    growthEligible: false, actions: [{"oldNavThrough":"2021-12-17","firstNewNavDate":"2021-12-20","factor":0.02,"maxFactorDeviation":0.001,"evidenceUrl":"https://www.nseindia.com/api/corporates-corporateActions?index=mf&from_date=01-12-2021&to_date=31-12-2021"}] },
  { meta: {"schemeCode":108479,"schemeName":"Quantum Nifty 50 ETF","fundHouse":"Quantum Mutual Fund","isinGrowth":"INF082J01499","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Other  ETFs"},
    dates: ["2026-02-12", "2026-02-13", "2026-02-16", "2026-02-17"], navs: [2821.3343, 2784.6135, 280.777, 281.2432],
    expectedNavs: [282.13343, 278.46135, 280.777, 281.2432], eventReturns: [0.008315875793893838],
    growthEligible: false, actions: [{"oldNavThrough":"2026-02-13","firstNewNavDate":"2026-02-16","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML72718.pdf#page=1"}] },
  { meta: {"schemeCode":106217,"schemeName":"SBI Ultra Short to Short Term Fund - Regular Plan - Growth","fundHouse":"SBI Mutual Fund","isinGrowth":"INF200K01MG8","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Income/Debt Oriented Schemes - Ultra Short to Short Term Fund"},
    dates: ["2012-01-11", "2012-01-12", "2012-01-13", "2012-01-16"], navs: [13.7221, 13.7253, 1372.88, 1373.9101],
    expectedNavs: [1372.21, 1372.53, 1372.88, 1373.9101], eventReturns: [0.00025500353362039447],
    growthEligible: true, actions: [{"oldNavThrough":"2012-01-12","firstNewNavDate":"2012-01-13","factor":100,"maxFactorDeviation":0.1,"evidenceUrl":"https://www.sbimf.com/docs/default-source/scheme-portfolios/default-library/unaudited-half-yearly-results-%28as-on-march-31-2012%29.pdf?sfvrsn=24795812_0#page=23"}] },
  { meta: {"schemeCode":111954,"schemeName":"SBI Gold ETF - Regular Plan - Growth","fundHouse":"SBI Mutual Fund","isinGrowth":"INF200KA16D8","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Other Scheme - Gold ETF"},
    dates: ["2022-01-06", "2022-01-07", "2022-01-10", "2022-01-11"], navs: [4270.7973, 4227.2573, 42.3783, 42.3571],
    expectedNavs: [42.707973, 42.272573, 42.3783, 42.3571], eventReturns: [0.002501077944794134],
    growthEligible: true, actions: [{"oldNavThrough":"2022-01-07","firstNewNavDate":"2022-01-10","factor":0.01,"maxFactorDeviation":0.0005,"evidenceUrl":"https://www.msei.in/SX-Content/Circulars/2022/January/Circular-11335.pdf#page=1"}] },
  { meta: {"schemeCode":102672,"schemeName":"Tata Liquid Fund - Regular Plan - Growth Option","fundHouse":"Tata Mutual Fund","isinGrowth":"INF277K01YD8","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Debt Scheme - Liquid Fund"},
    dates: ["2014-01-30", "2014-01-31", "2014-02-02", "2014-02-03"], navs: [19.8838, 19.8878, 1989.7362, 1990.214],
    expectedNavs: [1988.38, 1988.78, 1989.7362, 1990.214], eventReturns: [0.00048079727269984614],
    growthEligible: true, actions: [{"oldNavThrough":"2014-01-31","firstNewNavDate":"2014-02-02","factor":100,"maxFactorDeviation":0.1,"evidenceUrl":"https://www.tatamutualfund.com/system/files/2023-08/half_yearly_portfolios_march_2014.pdf#page=4"}] },
  { meta: {"schemeCode":119861,"schemeName":"Tata Liquid Fund - Direct Plan - Growth Option","fundHouse":"Tata Mutual Fund","isinGrowth":"INF277K01YE6","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Debt Scheme - Liquid Fund"},
    dates: ["2014-01-30", "2014-01-31", "2014-02-02", "2014-02-03"], navs: [19.912, 19.9161, 1992.5727, 1993.056],
    expectedNavs: [1991.2, 1991.61, 1992.5727, 1993.056], eventReturns: [0.0004833777697440764],
    growthEligible: true, actions: [{"oldNavThrough":"2014-01-31","firstNewNavDate":"2014-02-02","factor":100,"maxFactorDeviation":0.1,"evidenceUrl":"https://www.tatamutualfund.com/system/files/2023-08/half_yearly_portfolios_march_2014.pdf#page=4"}] },
  { meta: {"schemeCode":100664,"schemeName":"UTI Large & Mid Cap Fund - Regular Plan - Growth","fundHouse":"UTI Mutual Fund","isinGrowth":"INF789F01869","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Equity Scheme - Large & Mid Cap Fund"},
    dates: ["2009-06-03", "2009-06-04", "2009-06-05", "2009-06-08"], navs: [45.95, 46.19, 23.3, 22.66],
    expectedNavs: [22.975, 23.095, 23.3, 22.66], eventReturns: [0.00887638016886772],
    growthEligible: true, actions: [{"oldNavThrough":"2009-06-04","firstNewNavDate":"2009-06-05","factor":0.5,"maxFactorDeviation":0.025,"evidenceUrl":"https://www.business-standard.com/article/press-releases/uti-top-100-fund-declares-1-1-bonus-109060100093_1.html"}] },
  { meta: {"schemeCode":135320,"schemeName":"UTI Nifty 50 ETF - Direct Plan","fundHouse":"UTI Mutual Fund","isinGrowth":"INF789F1AZC0","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Exchange Traded Funds (ETFs) - Equity ETF"},
    dates: ["2023-09-22", "2023-09-25", "2023-09-26", "2023-09-27"], navs: [2111.5236, 2111.5501, 211.0492, 211.6047],
    expectedNavs: [211.15236, 211.15501, 211.0492, 211.6047], eventReturns: [-0.0005011010631478742],
    growthEligible: false, actions: [{"oldNavThrough":"2023-09-25","firstNewNavDate":"2023-09-26","factor":0.1,"maxFactorDeviation":0.005,"evidenceUrl":"https://nsearchives.nseindia.com/content/circulars/CML58523.pdf#page=1"}] },
  { meta: {"schemeCode":115398,"schemeName":"Union Liquid Fund - Regular Plan - Growth Option","fundHouse":"Union Mutual Fund","isinGrowth":"INF582M01013","isinDivReinvestment":null,"schemeType":"Open Ended Schemes","schemeCategory":"Debt Scheme - Liquid Fund"},
    dates: ["2011-09-28", "2011-09-29", "2011-10-02", "2011-10-03"], navs: [10.2457, 10.2483, 1025.5879, 1025.8299],
    expectedNavs: [1024.57, 1024.83, 1025.5879, 1025.8299], eventReturns: [0.0007395372891113648],
    growthEligible: true, actions: [{"oldNavThrough":"2011-09-29","firstNewNavDate":"2011-10-02","factor":100,"maxFactorDeviation":0.1,"evidenceUrl":"https://www.unionmf.com/docs/default-source/downloads/scheme-disclosures/factsheets/october-2012.pdf?sfvrsn=f69eb488_3#page=5"}] },
];

function warning(n: number): string {
  return `Unresolved discontinuity: ${n} single-observation move(s) exceed 40%; derived analytics are blocked.`;
}
function fixture(spec: Fixture): FundData {
  return { meta: { ...spec.meta }, points: spec.dates.map((date, i) => ({ date, nav: spec.navs[i] })),
    fetchedAt: '2026-10-29T01:02:19.208Z', source: 'mfapi.in', fromCache: true,
    stale: false, warnings: [warning(spec.actions.length)] };
}
function close(actual: number | null, expected: number, tolerance = 1e-9): void {
  assert.notEqual(actual, null);
  assert.ok(Math.abs(actual! - expected) < tolerance, `${actual} should equal ${expected}`);
}
function unchanged(raw: FundData, reason: string): void {
  const original = structuredClone(raw), result = financialNavBasis(raw);
  assert.equal(result.adjusted, false, reason);
  assert.equal(result.fund, raw, reason);
  assert.equal(result.adjustment, undefined, reason);
  assert.equal(result.adjustments, undefined, reason);
  assert.deepEqual(raw, original, reason);
}
function shifted(date: string, days: number): string {
  return new Date(Date.parse(date + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10);
}

for (const spec of FIXTURES) {
  const code = spec.meta.schemeCode;
  test(`${code}: matches independent calculation NAVs, preserves raw evidence and reports every action`, () => {
    const raw = fixture(spec), original = structuredClone(raw);
    raw.points.forEach(Object.freeze); Object.freeze(raw.points); Object.freeze(raw.meta);
    Object.freeze(raw.warnings); Object.freeze(raw);
    const result = financialNavBasis(raw);
    assert.equal(result.adjusted, true);
    assert.notEqual(result.fund, raw);
    assert.notEqual(result.fund.points, raw.points);
    result.fund.points.forEach((p, i) => { assert.equal(p.date, spec.dates[i]); close(p.nav, spec.expectedNavs[i]); });
    assert.equal(result.fund.points.length, raw.points.length);
    const lastDate = spec.actions.at(-1)!.firstNewNavDate;
    assert.deepEqual(result.fund.points.filter(p => p.date >= lastDate), raw.points.filter(p => p.date >= lastDate));
    assert.deepEqual({ ...result.fund, points: raw.points, warnings: raw.warnings }, raw);
    assert.deepEqual(result.fund.warnings, []);
    assert.deepEqual(raw, original);
    const actions = result.adjustments ?? (result.adjustment ? [result.adjustment] : []);
    assert.equal(actions.length, spec.actions.length);
    for (let i = 0; i < actions.length; i++) {
      const a = actions[i], expected = spec.actions[i];
      assert.equal(a.schemeCode, code);
      assert.equal(a.factor, expected.factor);
      assert.equal(a.oldNavThrough, expected.oldNavThrough);
      assert.equal(a.firstNewNavDate, expected.firstNewNavDate);
      assert.equal(a.evidenceUrl, expected.evidenceUrl);
      assert.match(a.label, /verified .* (?:unit (?:split|consolidation)|bonus unit allotment)/);
      assert.equal('maxFactorDeviation' in a, false);
    }
    assert.equal(result.adjustment === undefined, actions.length > 1);
    assert.equal(result.adjustments === undefined, actions.length === 1);
  });

  test(`${code}: retains independently calculated nonzero investment returns at every unit change`, () => {
    const result = financialNavBasis(fixture(spec));
    assert.equal(result.adjusted, true);
    spec.actions.forEach((a, i) => {
      const eventIndex = spec.dates.indexOf(a.firstNewNavDate);
      close(absoluteReturn(result.fund.points.slice(eventIndex - 1, eventIndex + 1)), spec.eventReturns[i], 1e-12);
      assert.notEqual(spec.eventReturns[i], 0);
    });
  });

  test(`${code}: requires the exact code, untrimmed name, fund house and current ISIN`, () => {
    const changes: Partial<FundMeta>[] = [
      { schemeCode: 999999 }, { schemeName: spec.meta.schemeName + ' Extra' },
      { schemeName: ' ' + spec.meta.schemeName }, { schemeName: spec.meta.schemeName + ' IDCW' },
      { fundHouse: 'Another Mutual Fund' }, { isinGrowth: null }, { isinGrowth: undefined },
      { isinGrowth: 'INF000000000' },
    ];
    const sibling = FIXTURES.find(f => f.meta.schemeCode !== code && f.meta.schemeName === spec.meta.schemeName);
    if (sibling) changes.push({ schemeCode: sibling.meta.schemeCode }, { isinGrowth: sibling.meta.isinGrowth });
    for (const change of changes) {
      const raw = fixture(spec); Object.assign(raw.meta, change);
      unchanged(raw, 'identity mismatch: ' + JSON.stringify(change));
    }
  });

  test(`${code}: requires both exact observed boundary dates for every action`, () => {
    for (const a of spec.actions) {
      const previous = fixture(spec);
      previous.points = previous.points.map(p => p.date <= a.oldNavThrough ? { ...p, date: shifted(p.date, -1) } : p);
      unchanged(previous, 'wrong last old-basis date');
      const next = fixture(spec);
      next.points = next.points.map(p => p.date >= a.firstNewNavDate ? { ...p, date: shifted(p.date, 1) } : p);
      unchanged(next, 'wrong first new-basis date');
      for (const date of [a.oldNavThrough, a.firstNewNavDate]) {
        const raw = fixture(spec); raw.points = raw.points.filter(p => p.date !== date);
        unchanged(raw, 'missing exact boundary row');
      }
    }
  });

  test(`${code}: requires the exact generated warning count and retains independent quality blockers`, () => {
    const expected = warning(spec.actions.length);
    for (const warnings of [[], [warning(spec.actions.length + 1)], [expected, expected],
      [expected.replace('single-observation', 'single observation')],
      [expected, 'Invalid NAV observations were excluded (1).'],
      [expected, 'Conflicting NAV values were reported for 1 date(s).']]) {
      const raw = fixture(spec); raw.warnings = warnings;
      unchanged(raw, 'warning contract');
    }
    const raw = fixture(spec), coverage = 'History coverage has not been independently verified.';
    raw.warnings.push(coverage);
    const result = financialNavBasis(raw);
    assert.equal(result.adjusted, true);
    assert.deepEqual(result.fund.warnings, [coverage]);
    assert.deepEqual(raw.warnings, [expected, coverage]);
  });

  test(`${code}: enforces a bounded residual return without fitting the observed NAV ratio`, () => {
    for (const a of spec.actions) for (const sign of [-1, 1]) {
      const index = spec.dates.indexOf(a.firstNewNavDate);
      const outside = fixture(spec);
      outside.points[index].nav = outside.points[index - 1].nav * (a.factor + sign * a.maxFactorDeviation * 1.01);
      unchanged(outside, 'outside documented-factor bound');
      const inside = fixture(spec);
      inside.points[index].nav = inside.points[index - 1].nav * (a.factor + sign * a.maxFactorDeviation * .99);
      assert.equal(financialNavBasis(inside).adjusted, true, 'bounded market/interest residual remains valid');
    }
  });

  test(`${code}: refuses an additional unexplained jump, even with a rewritten count warning`, () => {
    for (const rewrite of [false, true]) {
      const raw = fixture(spec), first = raw.points[0];
      raw.points.unshift({ date: shifted(first.date, -1), nav: first.nav / 2 });
      if (rewrite) raw.warnings = [warning(spec.actions.length + 1)];
      unchanged(raw, 'an additional unresolved jump cannot be partly cleared');
    }
  });

  test(`${code}: refuses malformed, unordered, duplicate or too-short input`, () => {
    for (const nav of [0, -1, NaN, Infinity]) {
      const raw = fixture(spec); raw.points[0].nav = nav; unchanged(raw, 'invalid NAV');
    }
    for (const date of ['invalid', '2026-02-30', '2026-1-01']) {
      const raw = fixture(spec); raw.points[0].date = date; unchanged(raw, 'invalid date');
    }
    const reversed = fixture(spec); reversed.points.reverse(); unchanged(reversed, 'descending dates');
    const duplicate = fixture(spec); duplicate.points.splice(1, 0, { ...duplicate.points[0] }); unchanged(duplicate, 'duplicate date');
    const short = fixture(spec); short.points = short.points.slice(0, 2); unchanged(short, 'too few observations');
  });

  test(`${code}: keeps the Growth consumer gate and refuses repeated application`, () => {
    const result = financialNavBasis(fixture(spec)); assert.equal(result.adjusted, true);
    assert.equal(isGrowthScheme(result.fund.meta.schemeName) && !qualityBlocked(result.fund), spec.growthEligible);
    unchanged(result.fund, 'already adjusted calculation copy');
    const forced = structuredClone(result.fund); forced.warnings = [warning(spec.actions.length)];
    unchanged(forced, 'restoring the warning cannot reapply the factors');
  });
}

for (const spec of FIXTURES.filter(f => f.actions.length > 1)) {
  test(`${spec.meta.schemeCode}: rejects each partially adjusted multi-event history as a whole`, () => {
    for (const action of spec.actions) {
      const raw = fixture(spec);
      raw.points = raw.points.map(p => p.date < action.firstNewNavDate ? { ...p, nav: p.nav * action.factor } : p);
      unchanged(raw, 'only one event already adjusted');
      raw.warnings = [warning(1)];
      unchanged(raw, 'partial normalization plus a rewritten count is still not an exact complete history');
    }
  });
}

test('bulk inventory has 58 exact identities and 60 independently evidenced events', () => {
  assert.equal(FIXTURES.length, 58);
  assert.equal(new Set(FIXTURES.map(f => f.meta.schemeCode)).size, 58);
  assert.equal(FIXTURES.reduce((n, f) => n + f.actions.length, 0), 60);
  assert.equal(FIXTURES.filter(f => f.growthEligible).length, 22);
});
