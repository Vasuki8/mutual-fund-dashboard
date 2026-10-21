import { validBackfillStatus } from './archive-status.ts';
import { storageStats, storageWarning, validateScheme } from './storage.ts';
import type { SyncStatus } from './sync-types.ts';
import type { PublicArchiveManifest } from './archive-types.ts';
import { loadSharedManifest } from './shared-archive.ts';

// Only the standalone Vite configuration defines this constant. Legacy builds
// and Node tests intentionally keep their existing behavior when it is absent.
declare const __FUNDSCOPE_STATIC__: boolean;

export function isStaticRuntime(): boolean {
  return typeof __FUNDSCOPE_STATIC__ !== 'undefined' && __FUNDSCOPE_STATIC__ === true;
}

export function getApiConnection(): { baseUrl: string; credentials: RequestCredentials } {
  return isStaticRuntime() || typeof window === 'undefined'
    ? { baseUrl: 'https://api.mfapi.in', credentials: 'omit' }
    : { baseUrl: '/api', credentials: 'same-origin' };
}

export interface BrowserDataStatus {
  kind: 'browser';
  checkedAt: string;
  fundCount: number | null;
  cacheWarning: string | null;
  cacheError: string | null;
  sourceAvailable: boolean;
  sourceError: string | null;
  sharedManifest: PublicArchiveManifest | null;
  sharedError: string | null;
}

export type RuntimeDataStatus = BrowserDataStatus | { kind: 'archive'; status: SyncStatus };

async function checkSource(signal: AbortSignal): Promise<void> {
  // An empty result is a valid availability check. This small search avoids
  // downloading the full catalogue or a fund's history just to check access.
  const response = await fetch('https://api.mfapi.in/mf/search?q=FundScope', {
    credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' }, signal,
  });
  if (!response.ok) throw new Error(`MFAPI availability check failed (HTTP ${response.status}).`);
  try {
    const body: unknown = await response.json();
    if (!Array.isArray(body) || body.length > 50_000) throw new Error('Invalid search result.');
    for (const scheme of body) validateScheme(scheme);
  } catch { throw new Error('MFAPI availability check returned an invalid response.'); }
}

export async function loadDataStatus(signal: AbortSignal): Promise<RuntimeDataStatus> {
  if (isStaticRuntime()) {
    const [cache, source, shared] = await Promise.allSettled([
      storageStats(), checkSource(signal), loadSharedManifest({ force: true, signal }),
    ]);
    // Counts remain useful during an outage. They describe this browser only;
    // never substitute or combine archive totals from another deployment.
    return {
      kind: 'browser', checkedAt: new Date().toISOString(),
      fundCount: cache.status === 'fulfilled' ? cache.value.fundCount : null,
      cacheWarning: storageWarning(),
      cacheError: cache.status === 'rejected' ? 'Cached history counts could not be read. Try checking status again.' : null,
      sourceAvailable: source.status === 'fulfilled',
      sourceError: source.status === 'rejected'
        ? source.reason instanceof Error && !(source.reason instanceof TypeError) && source.reason.name !== 'AbortError'
          ? source.reason.message
          : signal.aborted ? 'MFAPI availability check timed out. Try checking status again.'
          : 'MFAPI could not be reached from this browser. Previously cached histories remain usable.'
        : null,
      sharedManifest: shared.status === 'fulfilled' ? shared.value : null,
      sharedError: shared.status === 'rejected'
        ? 'The shared archive status could not be verified. Direct MFAPI access and saved browser histories remain available.' : null,
    };
  }

  const response = await fetch('/api/data/status', { credentials: 'same-origin', cache: 'no-store', signal });
  if (!response.ok) throw new Error('Data status is temporarily unavailable.');
  const body = await response.json() as SyncStatus;
  if (body.source !== 'mfapi.in' || !Array.isArray(body.warnings)
    || ['catalogueCount', 'archivedCount', 'observationCount', 'historyBacklog'].some(key =>
      !Number.isSafeInteger(body[key as keyof SyncStatus]) || Number(body[key as keyof SyncStatus]) < 0)
    || !validBackfillStatus(body)) {
    throw new Error('Data status could not be verified.');
  }
  return { kind: 'archive', status: body };
}
