# Analytics implementation task

Own only src/lib/analytics.ts and tests/analytics.test.ts. Shared NavPoint and Period types are in src/lib/types.ts. Read the calculation contract in docs/superpowers/specs/2026-10-20-fundscope-design.md. Use pure TypeScript, no external dependency. Node 24 can run TS tests directly. Percentages are decimal fractions.

Implement these exports exactly:

```ts
export const CALCULATION_VERSION = '1.0.0';
export function parseNavDate(value:string):string|null; // DD-MM-YYYY, reject invalid
export function daysBetween(start:string,end:string):number;
export function periodStart(end:string,period:Period):string|null; // MAX returns null
export function selectPeriod(points:NavPoint[],period:Period):NavPoint[];
export function absoluteReturn(points:NavPoint[]):number|null;
export function cagr(points:NavPoint[]):number|null; // only >=365 days
export function trailingReturn(points:NavPoint[],years:number):number|null; // 1Y absolute; multi-year CAGR; null incomplete
export function drawdownSeries(points:NavPoint[]):{date:string;value:number}[];
export function drawdownStats(points:NavPoint[]):{maxDrawdown:number|null;currentDrawdown:number|null;peakDate:string|null;troughDate:string|null;recoveryDate:string|null};
export function monthlyReturns(points:NavPoint[]):{year:number;month:number;date:string;value:number}[]; // month 1-12, complete months only
export function riskStats(points:NavPoint[],annualRiskFreeRate?:number):{volatility:number|null;sharpe:number|null;sortino:number|null;monthlyCount:number;positiveMonths:number;bestMonth:number|null;worstMonth:number|null};
export function rollingReturns(points:NavPoint[],years:number):{start:string;end:string;value:number}[]; // daily available starts; complete anniversaries
export function alignFunds(series:NavPoint[][],period:Period):{dates:string[];series:NavPoint[][];start:string|null;end:string|null}; // exact date intersection; common endpoint; period computed from common end
export function isGrowthScheme(name:string):boolean;
```

Contract: actual calendar dates, ACT/365, max seven days preceding target date tolerance, no future valuation, never bridge missing monthly buckets, require 12 complete monthly returns for risk. Exclude latest calendar month unless latest date is actual calendar month end (or earlier month than current real calendar month with valid month-end observation within seven days). An optional latest month may be determined against current date, but deterministic fixtures must not depend on host timezone. Past dates before latest observation are complete by definition. Zero variance ratios null. Drawdowns start at first selected point. Comparison selects only dates reported by every fund, returns same-length arrays. No interpolation. Respect point identity and ascending input order.

Meaningful tests: 100 to121 over730 days CAGR10%; [100,120,90,120] max drawdown -25%, final recovery; constant NAV volatility0 and ratiosnull; missing month not bridged; leap-day anniversary clamp; insufficient requested horizon null; multi-fund common start/end; no forward/future dates; Growth versus IDCW treatment. Add tests before implementation; observe failures, implement, run full suite. Document exact test command/results in docs/analytics-report.md. Do not commit or modify shared config; site owner integrates.
