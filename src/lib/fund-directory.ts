import type { Catalogue, HistoryDocument } from '../../server/types.ts';

/** Source-provided scheme categories, independent of any Growth/NAV-quality gate. */
export interface ArchivedCategory {
  schemeCode: number;
  schemeCategory: string;
}
export interface ArchivedCategoryIndex {
  version: 1;
  source: 'mfapi.in';
  sequence: number;
  catalogueFetchedAt: string;
  entries: ArchivedCategory[];
}
export type CategoryLookup = Record<number, string>;

export function archiveCategory(document: HistoryDocument): ArchivedCategory {
  return { schemeCode: document.schemeCode, schemeCategory: document.payload.meta.scheme_category };
}

/** A verified snapshot must classify every SAVED history, including IDCW and quality-flagged funds. */
export function validateCategoryIndex(value: unknown, sequence: number, fetchedAt: string,
  catalogue: Pick<Catalogue, 'entries'>, savedCount: number): CategoryLookup {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid category index.');
  const index = value as Record<string, unknown>;
  if (index.version !== 1 || index.source !== 'mfapi.in' || index.sequence !== sequence
    || index.catalogueFetchedAt !== fetchedAt || !Array.isArray(index.entries)
    || index.entries.length !== savedCount || index.entries.length > 100_000) {
    throw new Error('Category index does not match the published checkpoint.');
  }
  const known = new Set(catalogue.entries.map(entry => entry.schemeCode));
  const categories: CategoryLookup = {};
  let previous = 0;
  for (const raw of index.entries) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid category entry.');
    const item = raw as Record<string, unknown>;
    if (typeof item.schemeCode !== 'number' || !Number.isSafeInteger(item.schemeCode)
      || item.schemeCode <= previous || !known.has(item.schemeCode)
      || typeof item.schemeCategory !== 'string' || item.schemeCategory.length > 500
      || !item.schemeCategory.trim()) throw new Error('Invalid category identity or value.');
    // Keep the exact provider label, rather than assigning a category based on a fund name.
    categories[item.schemeCode] = item.schemeCategory;
    previous = item.schemeCode;
  }
  return categories;
}

export function categoryKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

export function categoryOptions(categories: CategoryLookup): { value: string; label: string }[] {
  const unique = new Map<string, string>();
  for (const label of Object.values(categories)) {
    const key = categoryKey(label);
    if (key && !unique.has(key)) unique.set(key, label.trim().replace(/\s+/g, ' '));
  }
  return [...unique].sort((a, b) => a[1].localeCompare(b[1], 'en', { sensitivity: 'base' }))
    .map(([value, label]) => ({ value, label }));
}

export function inCategory(code: number, selected: string, categories: CategoryLookup): boolean {
  if (selected === 'all') return true;
  const category = categories[code];
  if (selected === 'unclassified') return category === undefined;
  return category !== undefined && categoryKey(category) === selected;
}

/** At least 20 funds per page; never render thousands of history panels at once. */
export const PAGE_SIZES = [20, 50, 100] as const;
export type PageSize = typeof PAGE_SIZES[number];
export function pageFor(total: number, current: number, pageSize: PageSize) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.max(0, Math.min(Number.isSafeInteger(current) ? current : 0, pages - 1));
  return { pages, page, start: page * pageSize, end: Math.min(total, (page + 1) * pageSize) };
}
