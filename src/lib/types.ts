import type { ArchiveProvenance } from './sync-types.ts';

export interface NavPoint { date: string; nav: number }
export interface Scheme {
  schemeCode: number;
  schemeName: string;
  isinGrowth?: string | null;
  isinDivReinvestment?: string | null;
}
export interface FundMeta extends Scheme {
  fundHouse: string;
  schemeType: string;
  schemeCategory: string;
}
export interface FundData {
  meta: FundMeta;
  points: NavPoint[];
  fetchedAt: string;
  source: 'mfapi.in';
  fromCache: boolean;
  stale: boolean;
  warnings: string[];
  archive?: ArchiveProvenance;
}
export type Period = '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'MAX';
export interface DateRange { start: string; end: string }
export type AnalysisRange = Period | DateRange;
export interface FundNote {
  id: string;
  schemeCode: number;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedComparison {
  id: string;
  name: string;
  schemes: Scheme[];
  range: AnalysisRange;
  savedAt: string;
}

export interface ResearchSettings {
  version: 1;
  watchlist: Scheme[];
  compared: Scheme[];
  riskFreeRate: number;
  lastFund: Scheme | null;
  // Optional for backwards compatibility with version-1 settings and backups.
  fundNotes?: FundNote[];
  savedComparisons?: SavedComparison[];
}
