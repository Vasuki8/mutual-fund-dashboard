import type { Scheme } from '../src/lib/types.ts';
import { ApiError } from './types.ts';
import type { ArchiveIndex, Catalogue, CatalogueEntry, HistoryDocument, ProviderHistory, RawNav } from './types.ts';

function record(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(`Invalid MFAPI ${name}.`);
  return value as Record<string, unknown>;
}

function text(value: unknown, name: string, maximum = 500): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) throw new ApiError(`Invalid MFAPI ${name}.`);
  return value;
}

export function validCode(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export function dateISO(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCFullYear() === Number(year) && date.getUTCMonth() + 1 === Number(month)
    && date.getUTCDate() === Number(day) ? date.toISOString().slice(0, 10) : null;
}

function navString(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 128 || !/^\d+(?:\.\d+)?$/.test(value.trim())) return null;
  return Number.isFinite(Number(value)) && Number(value) > 0 ? value.trim() : null;
}

function decimalIdentity(value: string): string {
  const [whole, fraction = ''] = value.split('.');
  return `${whole.replace(/^0+(?=\d)/, '')}.${fraction.replace(/0+$/, '')}`;
}

export function scheme(value: unknown): Scheme {
  const item = record(value, 'scheme identity');
  if (!validCode(item.schemeCode)) throw new ApiError('Invalid MFAPI scheme code.');
  const result: Scheme = { schemeCode: item.schemeCode, schemeName: text(item.schemeName, 'scheme name') };
  for (const field of ['isinGrowth', 'isinDivReinvestment'] as const) {
    const value = item[field];
    // MFAPI uses empty strings as well as null for optional, unavailable ISINs.
    if (value === null || (typeof value === 'string' && value.length <= 64 && !value.trim())) result[field] = null;
    else if (value !== undefined) result[field] = text(value, 'ISIN', 64);
  }
  return result;
}

export function searchResults(value: unknown): Scheme[] {
  if (!Array.isArray(value) || value.length > 100_000) throw new ApiError('Invalid MFAPI search results.');
  const schemes = new Map<number, Scheme>();
  for (const entry of value) {
    const parsed = scheme(entry);
    const existing = schemes.get(parsed.schemeCode);
    if (existing && existing.schemeName !== parsed.schemeName) throw new ApiError('Conflicting MFAPI scheme identities.');
    schemes.set(parsed.schemeCode, parsed);
  }
  return [...schemes.values()];
}

export function validateHistory(value: unknown, code: number): { payload: ProviderHistory; warnings: string[] } {
  if (!validCode(code)) throw new ApiError('Invalid requested scheme code.', 400);
  const body = record(value, 'history response');
  if (body.status !== 'SUCCESS') throw new ApiError('MFAPI returned an unsuccessful response status.');
  const meta = record(body.meta, 'scheme metadata');
  if (meta.scheme_code !== code) throw new ApiError('MFAPI scheme code does not match the requested plan identity.');
  const identity = scheme({ schemeCode: meta.scheme_code, schemeName: meta.scheme_name,
    isinGrowth: meta.isin_growth, isinDivReinvestment: meta.isin_div_reinvestment });
  const parsedMeta: ProviderHistory['meta'] = { scheme_code: code, scheme_name: identity.schemeName,
    fund_house: text(meta.fund_house, 'fund house metadata'), scheme_type: text(meta.scheme_type, 'scheme type metadata'),
    scheme_category: text(meta.scheme_category, 'scheme category metadata') };
  if (identity.isinGrowth !== undefined) parsedMeta.isin_growth = identity.isinGrowth;
  if (identity.isinDivReinvestment !== undefined) parsedMeta.isin_div_reinvestment = identity.isinDivReinvestment;
  if (!Array.isArray(body.data) || !body.data.length || body.data.length > 100_000) {
    throw new ApiError('Invalid MFAPI NAV history: no usable observations or excessive history size.');
  }
  const observations = new Map<string, RawNav>();
  let duplicates = 0;
  let invalid = 0;
  const conflicting = new Set<string>();
  for (const raw of body.data) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { invalid += 1; continue; }
    const item = raw as Record<string, unknown>;
    const date = dateISO(item.date);
    const nav = navString(item.nav);
    if (!date || !nav) { invalid += 1; continue; }
    const existing = observations.get(date);
    if (existing) {
      duplicates += 1;
      if (decimalIdentity(existing.nav) !== decimalIdentity(nav)) {
        conflicting.add(date);
        const [leftWhole, leftFraction] = decimalIdentity(existing.nav).split('.');
        const [rightWhole, rightFraction] = decimalIdentity(nav).split('.');
        const length = Math.max(leftFraction.length, rightFraction.length);
        const comparison = leftWhole.length - rightWhole.length || leftWhole.localeCompare(rightWhole)
          || leftFraction.padEnd(length, '0').localeCompare(rightFraction.padEnd(length, '0'));
        if (comparison <= 0) continue;
      } else {
      // Preserve all reported decimal places deterministically for equivalent values.
        if (nav.length <= existing.nav.length) continue;
      }
    }
    observations.set(date, { date: item.date as string, nav });
  }
  if (!observations.size) throw new ApiError('Invalid NAV observations: MFAPI returned no usable history.');
  const data = [...observations].sort(([left], [right]) => right.localeCompare(left)).map(([, point]) => point);
  const warnings = [
    ...(invalid ? [`Invalid NAV observations were excluded (${invalid}); derived analytics are blocked until the data is resolved.`] : []),
    ...(conflicting.size ? [`Conflicting NAV values occur on ${conflicting.size} duplicate date(s); the lowest value is retained deterministically and analytics are blocked.`]
      : duplicates ? [`Identical duplicate NAV dates were consolidated (${duplicates}).`] : []),
  ];
  warnings.push(...discontinuityWarnings(data));
  return { payload: { status: 'SUCCESS', meta: parsedMeta, data }, warnings };
}

function discontinuityWarnings(data: RawNav[]): string[] {
  let count = 0;
  for (let index = 1; index < data.length; index += 1) {
    const ratio = Number(data[index - 1].nav) / Number(data[index].nav);
    if (ratio > 1.4 + 1e-12 || ratio < 0.6 - 1e-12) count += 1;
  }
  return count ? [`Unresolved discontinuity: ${count} single-observation move(s) exceed 40%; derived analytics are blocked.`] : [];
}

export function mergeHistory(incoming: ReturnType<typeof validateHistory>, previous: HistoryDocument | null,
  fetchedAt: string, archivedAt: string, expectedLatest: string | null = null): HistoryDocument {
  const code = incoming.payload.meta.scheme_code;
  if (previous && previous.schemeCode !== code) throw new ApiError('Archived scheme identity does not match the requested plan.', 503);
  const latest = dateISO(incoming.payload.data[0].date)!;
  const olderHistory = previous !== null && latest < previous.coverageEnd;
  const lateResponse = previous !== null && fetchedAt < previous.fetchedAt;
  const questionable = incoming.warnings.some(warning => /^(Invalid NAV|Conflicting NAV)/.test(warning));
  const preferPrevious = olderHistory || lateResponse || (questionable && previous !== null);
  const observations = new Map<string, RawNav>();
  const existingDates = new Set((previous?.payload.data ?? []).map(point => point.date));
  const incomingDates = new Set(incoming.payload.data.map(point => point.date));
  const first = preferPrevious ? incoming.payload.data : previous?.payload.data ?? [];
  const last = preferPrevious ? previous?.payload.data ?? [] : incoming.payload.data;
  for (const point of [...first, ...last]) observations.set(dateISO(point.date)!, point);
  const data = [...observations].sort(([left], [right]) => right.localeCompare(left)).map(([, point]) => point);
  const retained = [...existingDates].filter(date => !incomingDates.has(date)).length;
  const retainedQualityWarnings = retained > 0
    ? (previous?.warnings ?? []).filter(warning => /^(Invalid NAV|Conflicting NAV)/.test(warning)) : [];
  let corrections = 0;
  if (previous && !preferPrevious) {
    const old = new Map(previous.payload.data.map(point => [point.date, point.nav]));
    for (const point of incoming.payload.data) if (old.has(point.date)
      && decimalIdentity(old.get(point.date)!) !== decimalIdentity(point.nav)) corrections += 1;
  }
  const warnings = lateResponse && previous ? [...previous.warnings] : [...incoming.warnings];
  warnings.push(...retainedQualityWarnings);
  if (retained) warnings.push(`MFAPI returned a shorter or changed history; ${retained} archived observation(s) absent from the response were retained.`);
  if (corrections) warnings.push(`Applied source corrections to ${corrections} existing observation(s).`);
  if (olderHistory && !lateResponse) warnings.push('MFAPI returned an older latest observation; the newer saved history and its successful fetch time were retained.');
  if (lateResponse) warnings.push('A later successful archive refresh took precedence over this earlier request.');
  if (questionable && previous && !lateResponse) warnings.push('Existing valid observations and their successful fetch time were retained while source quality issues remain unresolved.');
  const effectiveLatest = lateResponse && previous ? previous.coverageEnd : latest;
  const behindCatalogue = expectedLatest !== null && effectiveLatest < expectedLatest;
  if (behindCatalogue) warnings.push(`The history response has not yet reached the catalogue NAV date ${expectedLatest}.`);
  warnings.push(...discontinuityWarnings(data));
  return { version: 1, schemeCode: code,
    payload: { ...(preferPrevious && previous ? previous.payload : incoming.payload), data },
    fetchedAt: preferPrevious && previous ? previous.fetchedAt : fetchedAt, archivedAt,
    coverageStart: dateISO(data.at(-1)!.date)!, coverageEnd: dateISO(data[0].date)!,
    unresolved: lateResponse ? !!previous?.unresolved || behindCatalogue
      : olderHistory || behindCatalogue || questionable || retainedQualityWarnings.length > 0,
    warnings: [...new Set(warnings)] };
}

export function buildCatalogue(payload: unknown, previous: Catalogue | null, indexes: ArchiveIndex[], fetchedAt: string): Catalogue {
  if (!Array.isArray(payload) || !payload.length || payload.length > 100_000) throw new ApiError('Invalid or empty MFAPI latest catalogue.');
  const entries = new Map<number, CatalogueEntry>();
  for (const entry of previous?.entries ?? []) entries.set(entry.schemeCode, { ...entry, current: false });
  for (const entry of indexes) if (!entries.has(entry.scheme_code)) entries.set(entry.scheme_code, {
    schemeCode: entry.scheme_code, schemeName: entry.scheme_name, latestDate: entry.coverage_end, nav: null, current: false,
  });
  const current = new Set<number>();
  let invalidLatest = 0;
  let olderLatest = 0;
  for (const raw of payload) {
    const identity = scheme(raw);
    const item = raw as Record<string, unknown>;
    if (current.has(identity.schemeCode)) throw new ApiError('Duplicate scheme code in the MFAPI latest catalogue.');
    current.add(identity.schemeCode);
    const date = dateISO(item.date);
    const nav = navString(item.nav);
    if (!date || !nav) invalidLatest += 1;
    const old = entries.get(identity.schemeCode);
    const retainLatest = !!old?.latestDate && (!date || date < old.latestDate);
    if (retainLatest) olderLatest += 1;
    entries.set(identity.schemeCode, { ...identity,
      latestDate: retainLatest ? old!.latestDate : date,
      nav: retainLatest ? old!.nav : nav, current: true });
  }
  const absent = entries.size - current.size;
  const warnings = [
    ...(invalidLatest ? [`${invalidLatest} catalogue scheme(s) have missing or invalid latest NAV values/dates; identities are retained and full history remains unresolved until validated.`] : []),
    ...(olderLatest ? [`Newer saved latest dates were retained for ${olderLatest} scheme(s) whose snapshot observations regressed or became invalid.`] : []),
    ...(absent ? [`${absent} previously known scheme(s) are absent from the current provider catalogue and remain retained.`] : []),
  ];
  return { version: 1, fetchedAt, entries: [...entries.values()].sort((a, b) => a.schemeCode - b.schemeCode), warnings };
}
