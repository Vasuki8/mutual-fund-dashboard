import type { HistoryDocument } from '../../server/types.ts';
import type { FundData, Scheme } from './types.ts';
import { isGrowthScheme, trailingReturn, threeYearMaxDrawdown } from './analytics.ts';
import { qualityBlocked } from './format.ts';

export type FundSortKey = 'name' | '1' | '3' | '5' | 'dd3';
export interface FundSort { key: FundSortKey; desc: boolean }
export interface FundReturns {
  schemeCode: number;
  navDate: string;
  oneYear: number | null;
  threeYear: number | null;
  fiveYear: number | null;
  /** Absent from historical version-1 ranking indexes. */
  threeYearMaxDrawdown?: number | null;
}
export interface ArchivedReturnIndex {
  version: 1 | 2;
  source: 'mfapi.in';
  sequence: number;
  catalogueFetchedAt: string;
  entries: FundReturns[];
}
export type FundReturnLookup = Record<number, FundReturns>;

const keys: Record<Exclude<FundSortKey, 'name'>, keyof Pick<FundReturns, 'oneYear' | 'threeYear' | 'fiveYear' | 'threeYearMaxDrawdown'>> = {
  '1': 'oneYear', '3': 'threeYear', '5': 'fiveYear', 'dd3': 'threeYearMaxDrawdown',
};

/** Use the exact NAV and quality gates as a fund's detail view. */
export function localFundReturns(fund: FundData): FundReturns {
  const safe = isGrowthScheme(fund.meta.schemeName) && !qualityBlocked(fund);
  const navDate = fund.points.at(-1)?.date ?? '';
  return { schemeCode: fund.meta.schemeCode, navDate,
    oneYear: safe ? trailingReturn(fund.points, 1) : null,
    threeYear: safe ? trailingReturn(fund.points, 3) : null,
    fiveYear: safe ? trailingReturn(fund.points, 5) : null,
    threeYearMaxDrawdown: safe ? threeYearMaxDrawdown(fund.points) : null };
}

/** Published historical returns never substitute a future NAV or an IDCW cash distribution. */
export function archivedFundReturns(doc: HistoryDocument): FundReturns | null {
  if (doc.unresolved || !isGrowthScheme(doc.payload.meta.scheme_name)) return null;
  // The archive's validated MFAPI observations are descending DD-MM-YYYY.
  // Reuse the same analysis function as the individual-fund display.
  const points = doc.payload.data.map(row => ({ date: row.date.slice(6, 10) + '-'
    + row.date.slice(3, 5) + '-' + row.date.slice(0, 2), nav: Number(row.nav) })).reverse();
  return { schemeCode: doc.schemeCode, navDate: doc.coverageEnd,
    oneYear: trailingReturn(points, 1), threeYear: trailingReturn(points, 3),
    fiveYear: trailingReturn(points, 5),
    threeYearMaxDrawdown: threeYearMaxDrawdown(points) };
}

const calendarDate = (value: unknown): value is string => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

/** Reject inaccurate, extra, or cross-checkpoint values before ranking search results. */
export function validateReturnIndex(value: unknown, sequence: number, catalogueFetchedAt: string,
  knownCodes: Set<number>, cleanCount: number): FundReturnLookup {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid archived return index.');
  const record = value as Record<string, unknown>;
  if (![1, 2].includes(record.version as number) || record.source !== 'mfapi.in' || record.sequence !== sequence
    || record.catalogueFetchedAt !== catalogueFetchedAt || !Array.isArray(record.entries)
    || record.entries.length > cleanCount || record.entries.length > 100_000) {
    throw new Error('Archived return index does not match the verified checkpoint.');
  }
  const result: FundReturnLookup = {};
  let lastCode = 0;
  for (const raw of record.entries) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid archived return entry.');
    const item = raw as Record<string, unknown>;
    if (typeof item.schemeCode !== 'number' || !Number.isSafeInteger(item.schemeCode)
      || item.schemeCode <= lastCode || !knownCodes.has(item.schemeCode)
      || !calendarDate(item.navDate)) {
      throw new Error('Archived return scheme identity, date or order is invalid.');
    }
    for (const field of ['oneYear', 'threeYear', 'fiveYear']) {
      const entry = item[field];
      if (entry !== null && (typeof entry !== 'number' || !Number.isFinite(entry) || entry <= -1)) {
        throw new Error('Archived return value is not finite or valid.');
      }
    }
    // A v2 index must explicitly carry a bounded downside metric for every
    // eligible fund. Existing v1 indexes remain readable without fabricating it.
    if (record.version === 2 && (item.threeYearMaxDrawdown === undefined
      || item.threeYearMaxDrawdown !== null
        && (typeof item.threeYearMaxDrawdown !== 'number'
          || !Number.isFinite(item.threeYearMaxDrawdown)
          || item.threeYearMaxDrawdown <= -1 || item.threeYearMaxDrawdown > 0))) {
      throw new Error('Archived three-year maximum drawdown value is invalid.');
    }
    lastCode = item.schemeCode;
    result[lastCode] = { schemeCode: lastCode, navDate: item.navDate,
      oneYear: item.oneYear as number | null, threeYear: item.threeYear as number | null,
      fiveYear: item.fiveYear as number | null,
      ...(record.version === 2 ? { threeYearMaxDrawdown: item.threeYearMaxDrawdown as number | null } : {}) };
  }
  return result;
}

export function returnValue(row: FundReturns | undefined, key: Exclude<FundSortKey, 'name'>): number | null {
  return row?.[keys[key]] ?? null;
}

/** Sort the whole filtered population; slice into pages only after this function. */
export function sortFundSchemes(schemes: Scheme[], sort: FundSort, returns: FundReturnLookup): Scheme[] {
  // One reusable collator avoids constructing locale options for every
  // comparison when browsing the complete ~38K-scheme catalogue.
  const collator = new Intl.Collator('en', { sensitivity: 'base' });
  const byName = (left: Scheme, right: Scheme) => collator.compare(left.schemeName, right.schemeName)
    || left.schemeCode - right.schemeCode;
  return [...schemes].sort((a, b) => {
    if (sort.key === 'name') return (sort.desc ? -1 : 1) * byName(a, b);
    const left = returnValue(returns[a.schemeCode], sort.key);
    const right = returnValue(returns[b.schemeCode], sort.key);
    // Missing, incomplete, or ineligible histories are ALWAYS last, in both directions.
    if (left === null || right === null) return left === null ? (right === null ? byName(a, b) : 1) : -1;
    const comparison = (sort.desc ? right - left : left - right);
    return comparison || byName(a, b);
  });
}
