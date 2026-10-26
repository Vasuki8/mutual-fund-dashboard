import type { FundData, Scheme } from './types.ts';

export const currency = (value: number | null | undefined, digits = 2) => value == null || !Number.isFinite(value) ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
export const number = (value: number | null | undefined, digits = 2) => value == null || !Number.isFinite(value) ? '—' : new Intl.NumberFormat('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
export const percent = (value: number | null | undefined, digits = 2) => value == null || !Number.isFinite(value) ? '—' : `${value > 0 ? '+' : ''}${(value * 100).toFixed(digits)}%`;
export const dateLabel = (date: string | null | undefined, compact = false) => date ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: compact ? 'short' : 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(date.slice(0, 10) + 'T00:00:00Z')) : '—';
export const shortName = (name: string) => name.replace(/\s*[-–]\s*Direct\s*(?:Plan)?\s*[-–]?\s*(?:Growth(?:\s*Option)?)?/ig, '').replace(/\s*[-–]\s*(?:Regular\s*Plan|Growth(?:\s*Option)?)\s*$/ig, '').replace(/\s*\(erstwhile[^)]*\)/ig, '').trim();
export const planLabel = (name: string) => `${/direct/i.test(name) ? 'Direct' : /regular/i.test(name) ? 'Regular' : 'Plan as named'} · ${/idcw|dividend/i.test(name) ? 'IDCW / dividend' : /growth/i.test(name) ? 'Growth' : 'Option as named'}`;
export const categoryLabel = (fund?: FundData) => fund?.meta.schemeCategory.replace(/^(?:Equity|Debt|Hybrid|Other|Solution Oriented) Scheme\s*[-–]\s*/i, '').replace(/ Fund$/i, '') ?? 'Loading category…';
export const fundInitials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
// Operational refresh errors do not invalidate the already-validated cached history.
export const qualityBlocked = (fund: FundData) => fund.warnings.some(w => /^(?:Invalid NAV observations|Conflicting NAV values|Unresolved discontinuity)\b/i.test(w));
export const asScheme = (fund: FundData): Scheme => ({schemeCode: fund.meta.schemeCode, schemeName: fund.meta.schemeName, isinGrowth: fund.meta.isinGrowth});

export function downloadText(text: string, filename: string, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadCsv(rows: (string | number | null)[][], filename: string) {
  const escape = (v: string | number | null) => {
    const value = v == null ? '' : String(v);
    const safe = typeof v === 'string' && /^[=+@-]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  downloadText('\uFEFF' + rows.map(row => row.map(escape).join(',')).join('\r\n'), filename, 'text/csv;charset=utf-8');
}

// Verified source-specific NAV normalizations are used only in derived calculations.
export { financialNavBasis, OVERNIGHT_AMC_NOTICE } from './corporate-actions.ts';
