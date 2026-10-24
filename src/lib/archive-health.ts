import type { ArchiveCounts } from './archive-types.ts';

/** Small, checkpoint-derived issue taxonomy. Numbers count schemes, not NAV observations. */
export interface ArchiveHealthSummary {
  version: 1;
  sourceErrors: Record<string, number>;
  quality: {
    invalidOnly: number;
    discontinuityOnly: number;
    both: number;
    other: number;
  };
  latestNav: {
    missingValue: number;
    missingDate: number;
    before2010: number;
    from2010Through2020: number;
    since2021: number;
  };
  historyBehind: {
    oneDay: number;
    twoToSevenDays: number;
    eightToThirtyDays: number;
    overThirtyDays: number;
  };
  retries: { due: number; future: number };
  recentNav?: { referenceDate: string | null; windowDays: 7; schemes: number; saved: number;
    missingHistories: number; sourceFailures: number; qualityFlags: number; pending: number };
}

function dictionary(raw: unknown, name: string): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid '+name+' health data.');
  const value = raw as Record<string, unknown>;
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw new Error('Invalid '+name+' health data.');
  }
  return value;
}

function counts(raw: unknown, keys: string[], total: number, label: string): Record<string, number> {
  const source = dictionary(raw, label);
  if (Object.keys(source).length !== keys.length || keys.some(key => !(key in source))) {
    throw new Error('Invalid '+label+' health fields.');
  }
  const result: Record<string, number> = {};
  for (const key of keys) {
    const value = source[key];
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > total) {
      throw new Error('Invalid '+label+' health count.');
    }
    result[key] = value;
  }
  return result;
}

function sum(values: Record<string, number>): number {
  return Object.values(values).reduce((total, item) => total + item, 0);
}

/** Validate source categories against exact saved checkpoint totals. */
export function validateArchiveHealthSummary(raw: unknown, totals: ArchiveCounts): ArchiveHealthSummary {
  const value = dictionary(raw, 'archive');
  if (value.version !== 1 || Object.keys(value).length !== (Object.hasOwn(value,'recentNav') ? 7 : 6)
    || Object.keys(value).some(key => !['version','sourceErrors','quality','latestNav','historyBehind','retries','recentNav'].includes(key))
    || !['sourceErrors', 'quality', 'latestNav', 'historyBehind', 'retries'].every(k => k in value)
    || !Number.isSafeInteger(totals.total) || totals.total < 1) {
    throw new Error('Invalid archive health version.');
  }
  const rawErrors = dictionary(value.sourceErrors, 'source errors');
  if (Object.keys(rawErrors).length > 100) throw new Error('Too many source error types.');
  const sourceErrors: Record<string, number> = {};
  for (const [key, value] of Object.entries(rawErrors)) {
    if (!/^[a-z][a-z0-9_]{0,99}$/.test(key) || typeof value !== 'number'
      || !Number.isSafeInteger(value) || value < 1 || value > totals.total) {
      throw new Error('Invalid source-error health code or count.');
    }
    sourceErrors[key] = value;
  }
  const quality = counts(value.quality,['invalidOnly','discontinuityOnly','both','other'],totals.total,'quality');
  const latestNav = counts(value.latestNav,['missingValue','missingDate','before2010','from2010Through2020','since2021'],totals.total,'latest NAV');
  const historyBehind = counts(value.historyBehind,['oneDay','twoToSevenDays','eightToThirtyDays','overThirtyDays'],totals.total,'history lag');
  const retries = counts(value.retries,['due','future'],totals.total,'retry');
  let recentNav: ArchiveHealthSummary['recentNav'];
  if ('recentNav' in value) {
    const recent = dictionary(value.recentNav, 'recent NAV');
    if (Object.keys(recent).length !== 8 || recent.windowDays !== 7 ||
      !(recent.referenceDate === null || typeof recent.referenceDate === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(recent.referenceDate) &&
        Number.isFinite(Date.parse(recent.referenceDate)) &&
        new Date(recent.referenceDate).toISOString().slice(0,10) === recent.referenceDate)) {
      throw new Error('Invalid recent NAV health fields.');
    }
    const values = counts(recent,['schemes','saved','missingHistories','sourceFailures','qualityFlags','pending'],totals.total,'recent NAV');
    if (values.saved + values.missingHistories + values.pending !== values.schemes ||
        values.saved > totals.saved || values.sourceFailures > totals.sourceGaps ||
        values.sourceFailures < values.missingHistories ||
        values.sourceFailures > values.saved + values.missingHistories ||
        values.qualityFlags > totals.qualityIssues || values.qualityFlags > values.saved ||
        values.pending > totals.pending || (recent.referenceDate === null && values.schemes !== 0)) {
      throw new Error('Recent NAV health counts do not match the checkpoint.');
    }
    recentNav = {referenceDate: recent.referenceDate as string | null,windowDays:7,
      schemes:values.schemes,saved:values.saved,missingHistories:values.missingHistories,
      sourceFailures:values.sourceFailures,
      qualityFlags:values.qualityFlags,pending:values.pending};
  }
  if (sum(sourceErrors) !== totals.sourceGaps || sum(quality) !== totals.qualityIssues
    || latestNav.missingDate + latestNav.before2010 + latestNav.from2010Through2020 + latestNav.since2021 !== totals.total
    || sum(historyBehind) > totals.saved || sum(retries) > totals.total) {
    throw new Error('Archive health counts do not match the verified checkpoint.');
  }
  return {
    version: 1, sourceErrors, quality: quality as unknown as ArchiveHealthSummary['quality'],
    latestNav: latestNav as unknown as ArchiveHealthSummary['latestNav'],
    historyBehind: historyBehind as unknown as ArchiveHealthSummary['historyBehind'],
    retries: retries as unknown as ArchiveHealthSummary['retries'],
    ...(recentNav ? {recentNav} : {}),
  };
}

const ERROR_LABELS: Record<string, string> = {
  source_history_zero_nav_only: 'History contains only zero NAVs',
  source_history_empty: 'Provider returned an empty history',
  source_history_invalid: 'History failed validation (cause not yet classified)',
  source_history_unsuccessful: 'Provider reported an unsuccessful history',
  source_history_oversize: 'History exceeded the allowed size',
  source_payload_invalid: 'Invalid provider response',
  source_transport: 'Provider connection failed',
  source_unavailable: 'Provider temporarily unavailable',
  source_deadline: 'Collection deadline reached',
};
export function sourceErrorLabel(code: string): string {
  return ERROR_LABELS[code] ?? (/^source_http_\d{3}$/.test(code)
    ? 'Provider HTTP '+code.slice(-3) : 'Other provider or validation failure');
}
