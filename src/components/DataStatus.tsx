import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Database, RefreshCw } from 'lucide-react';
import { archiveActivity, initialImportSummary, nextPlannedUpdate } from '../lib/archive-status.ts';
import { isStaticRuntime, loadDataStatus, type BrowserDataStatus } from '../lib/runtime.ts';
import type { SyncStatus } from '../lib/sync-types.ts';
import { loadSharedManifest } from '../lib/shared-archive.ts';
import type { ReadyArchiveManifest } from '../lib/archive-types.ts';
import { sourceErrorLabel, type ArchiveHealthSummary } from '../lib/archive-health.ts';

const integer = new Intl.NumberFormat('en-IN');
function time(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Awaiting first refresh';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: '2-digit',
    minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(value)) + ' IST';
}
export function useDataStatus() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [localStatus, setLocalStatus] = useState<BrowserDataStatus | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!isStaticRuntime()) return;
    // storageStats validates saved histories. Read it when the user opens the
    // data view or requests a check, rather than scanning it on a timer.
    const onRoute = () => { if (window.location.hash.split('?')[0] === '#data') refresh(); };
    window.addEventListener('hashchange', onRoute);
    return () => window.removeEventListener('hashchange', onRoute);
  }, [refresh]);
  useEffect(() => {
    if (!isStaticRuntime()) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    // Progress polling reads only the small published manifest. It does not
    // revalidate every IndexedDB history or contact MFAPI once per minute.
    const poll = async () => {
      try {
        const sharedManifest = await loadSharedManifest({ force: true, signal: controller.signal });
        if (!controller.signal.aborted) setLocalStatus(previous => previous
          ? { ...previous, sharedManifest, sharedError: null } : previous);
      } catch {
        if (!controller.signal.aborted) setLocalStatus(previous => previous
          ? { ...previous, sharedError: 'The shared archive status could not be refreshed. The figures shown are from the last verified checkpoint.' } : previous);
      } finally { if (!controller.signal.aborted) timer = setTimeout(poll, 60_000); }
    };
    timer = setTimeout(poll, 60_000);
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let closed = false;
    setBusy(true);
    const timeout = setTimeout(() => controller.abort(), 15_000);
    void (async () => {
      try {
        const result = await loadDataStatus(controller.signal);
        if (!closed) {
          if (result.kind === 'browser') setLocalStatus(previous => ({ ...result,
            sharedManifest: result.sharedManifest ?? previous?.sharedManifest ?? null }));
          else setStatus(result.status);
          setError('');
        }
      } catch {
        if (!closed) setError('Data status is temporarily unavailable. Previously loaded histories remain usable.');
      } finally {
        clearTimeout(timeout);
        if (!closed) setBusy(false);
      }
    })();
    const poll = isStaticRuntime() ? undefined : setTimeout(refresh, 60_000);
    return () => { closed = true; controller.abort(); clearTimeout(timeout); clearTimeout(poll); };
  }, [revision, refresh]);
  return { status, localStatus, error, busy, refresh };
}
export type DataStatusState = ReturnType<typeof useDataStatus>;

function BrowserStatus({ state, compact, onOpen }: {
  state: DataStatusState; compact: boolean; onOpen?: () => void;
}) {
  const { localStatus, error, busy, refresh } = state;
  if (localStatus?.sharedManifest?.status === 'ready') {
    return <SharedArchiveStatus state={state} manifest={localStatus.sharedManifest} compact={compact} onOpen={onOpen} />;
  }
  const available = localStatus?.sourceAvailable === true && !error;
  const title = busy ? 'Checking MFAPI access…' : available
    ? 'MFAPI reached at last check · Histories cached in this browser'
    : 'MFAPI access unavailable · Saved histories remain usable';
  if (compact) return <div className="data-status-line"><span className={`status-dot ${available && !busy ? '' : 'pending'}`} />
    <span>{title}</span><button onClick={onOpen}>Data status <ArrowRight size={12} /></button></div>;

  const notices = [error, localStatus?.sourceError, localStatus?.cacheError, localStatus?.cacheWarning, localStatus?.sharedError].filter(Boolean);
  return <section className="panel archive-panel" aria-labelledby="browser-data-heading">
    <div className="panel-heading"><div><div className="eyebrow">SOURCE & LOCAL STORAGE</div><h2 id="browser-data-heading">MFAPI & browser histories</h2>
      <p>Fund searches and available NAV histories are fetched directly from MFAPI when needed.</p></div>
      <button className="button secondary small" onClick={refresh} disabled={busy}><RefreshCw size={14} className={busy ? 'spin' : ''} />Check source & cache</button></div>
    {notices.length > 0 && <div className="notice warning" role="status"><AlertCircle size={17} /><span>{notices.join(' ')}</span></div>}
    {localStatus?.sharedManifest && <div className="notice" role="status"><Database size={17} /><span>
      <strong>{localStatus.sharedManifest.status === 'disabled' ? 'Shared archive not enabled. ' : 'First shared import pending. '}</strong>
      {localStatus.sharedManifest.message} Direct MFAPI histories and your saved browser cache remain available.
    </span></div>}
    <div className="archive-metrics">
      <div><span>Market-data source</span><strong>MFAPI</strong><small>Direct access from this browser</small></div>
      <div><span>Cached fund histories</span><strong>{localStatus?.fundCount == null ? '—' : integer.format(localStatus.fundCount)}</strong><small>In this browser at the last check</small></div>
      <div><span>History refresh</span><strong>On demand</strong><small>While you use FundScope</small></div>
    </div>
    <dl className="archive-facts">
      <div><dt>MFAPI source access</dt><dd>{busy ? 'Checking…' : localStatus ? available ? 'Reached at last check' : 'Unavailable at last check' : 'Not yet checked'}</dd></div>
      <div><dt>Last status check</dt><dd>{localStatus ? time(localStatus.checkedAt) : 'Not yet checked'}</dd></div>
      <div><dt>History coverage</dt><dd>Funds opened or restored here</dd></div>
      <div><dt>Storage scope</dt><dd>This website in this browser</dd></div>
    </dl>
    <p className="panel-note">The cache contains the available histories you have opened or restored, with no fixed history cutoff. Source gaps remain visible. A successful access check does not verify every scheme or the freshness of every cached history.</p>
    <p className="panel-note">Refresh a fund to request current source data. A verified shared archive has not been loaded in this view; browser histories refresh while you use FundScope. Export a backup to keep or move your research; data from another website does not transfer automatically.</p>
  </section>;
}

function ArchiveHealthBreakdown({ health }: { health: ArchiveHealthSummary }) {
  const number = (value: number) => integer.format(value);
  const sources = Object.entries(health.sourceErrors).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const quality = health.quality;
  const behind = health.historyBehind;
  const latest = health.latestNav;
  return <details className="archive-issues archive-health-breakdown">
    <summary>Why source gaps, quality flags and refresh work remain</summary>
    <p>These are independently verified checkpoint groups, not four separate queues. Source failures and quality issues may overlap, and historical date differences are not automatically missing NAV prices.</p>
    <div className="archive-health-grid">
      <section aria-label="Source failure breakdown">
        <h3>Source failures</h3>
        <dl>
          {sources.map(([code, count])=><div key={code}><dt title={code}>{sourceErrorLabel(code)}</dt><dd>{number(count)}</dd></div>)}
        </dl>
        <p>Zero-only NAV histories cannot be used to calculate returns. They remain unavailable and are rechecked conservatively, not silently filled.</p>
      </section>
      <section aria-label="Saved history quality warning breakdown">
        <h3>Saved-history quality flags</h3>
        <dl>
          <div><dt>Invalid NAV observations only</dt><dd>{number(quality.invalidOnly)}</dd></div>
          <div><dt>Large historical NAV changes only</dt><dd>{number(quality.discontinuityOnly)}</dd></div>
          <div><dt>Both kinds of warning</dt><dd>{number(quality.both)}</dd></div>
          {quality.other>0&&<div><dt>Other unresolved warnings</dt><dd>{number(quality.other)}</dd></div>}
        </dl>
        <p>Invalid observations remain excluded. Unresolved histories do not become eligible for performance analytics merely because a refresh succeeded.</p>
      </section>
      <section aria-label="History date lag breakdown">
        <h3>Catalogue versus saved-history dates</h3>
        <dl>
          <div><dt>Behind by 1 day</dt><dd>{number(behind.oneDay)}</dd></div>
          <div><dt>Behind by 2–7 days</dt><dd>{number(behind.twoToSevenDays)}</dd></div>
          <div><dt>Behind by 8–30 days</dt><dd>{number(behind.eightToThirtyDays)}</dd></div>
          <div><dt>Behind by more than 30 days</dt><dd>{number(behind.overThirtyDays)}</dd></div>
        </dl>
        <p>These figures may overlap the refresh backlog. A missing date is never filled with a fabricated NAV.</p>
      </section>
      <section aria-label="Source currency and retry schedule">
        <h3>Source age and retries</h3>
        <dl>
          <div><dt>Latest source NAV dated before 2010</dt><dd>{number(latest.before2010)}</dd></div>
          <div><dt>Latest source NAV dated 2010–2020</dt><dd>{number(latest.from2010Through2020)}</dd></div>
          <div><dt>Latest source NAV dated 2021 or later</dt><dd>{number(latest.since2021)}</dd></div>
          {latest.missingDate>0&&<div><dt>No valid latest NAV date</dt><dd>{number(latest.missingDate)}</dd></div>}
          <div><dt>Latest source NAV value unavailable</dt><dd>{number(latest.missingValue)}</dd></div>
          <div><dt>Source follow-ups currently due</dt><dd>{number(health.retries.due)}</dd></div>
          <div><dt>Follow-ups in source backoff</dt><dd>{number(health.retries.future)}</dd></div>
        </dl>
        <p>Many known identities have not reported a NAV in years. Catalogue inclusion does not prove a fund is active or available for investment.</p>
      </section>
    </div>
  </details>;
}

function SharedArchiveStatus({ state, manifest, compact, onOpen }: {
  state: DataStatusState; manifest: ReadyArchiveManifest; compact: boolean; onOpen?: () => void;
}) {
  const { localStatus, error, busy, refresh } = state;
  const counts = manifest.counts;
  const saved = `${integer.format(counts.saved)} of ${integer.format(counts.total)}`;
  const age = Date.now() - Date.parse(manifest.catalogueFetchedAt);
  const recent = age >= 0 && age < 14 * 3600_000 && !localStatus?.sharedError && !error;
  const collecting = manifest.collectionEnabled;
  if (compact) return <div className="data-status-line"><span className={`status-dot ${recent && collecting ? '' : 'pending'}`} />
    <span>Shared archive · {saved} histories saved{!collecting ? ' · Collection paused' : !recent ? ' · Check freshness' : ''}</span>
    <button onClick={onOpen}>Data status <ArrowRight size={12} /></button></div>;
  const percentage = counts.total ? (counts.saved / counts.total * 100).toFixed(2) : '0.00';
  const notices = [error, localStatus?.sharedError, localStatus?.sourceError, localStatus?.cacheError, localStatus?.cacheWarning].filter(Boolean);
  const activity = !collecting ? 'Shared collection is paused; verified histories remain available'
    : counts.pending > 0 ? 'Initial import awaiting further tranches'
    : counts.sourceGaps || counts.qualityIssues ? 'Import pass checked; source gaps or quality issues remain'
    : counts.refreshPending ? 'Saved histories are awaiting refresh or reconciliation'
    : 'Available source histories have been checked';
  return <section className="panel archive-panel" aria-labelledby="shared-archive-heading">
    <div className="panel-heading"><div><div className="eyebrow">SHARED MARKET DATA</div><h2 id="shared-archive-heading">Historical archive & refreshes</h2>
      <p>Verified MFAPI histories are shared across visitors. Your personal research stays in this browser.</p></div>
      <button className="button secondary small" onClick={refresh} disabled={busy}><RefreshCw size={14} className={busy ? 'spin' : ''} />Check status</button></div>
    {notices.length > 0 && <div className="notice warning" role="status"><AlertCircle size={17} /><span>{notices.join(' ')}</span></div>}
    <div className="archive-metrics">
      <div><span>Known schemes</span><strong>{integer.format(counts.total)}</strong><small>Includes retained older schemes</small></div>
      <div><span>Histories saved</span><strong>{integer.format(counts.saved)}</strong><small>{integer.format(counts.pending)} awaiting their first attempt</small></div>
      <div><span>Without quality flags</span><strong>{integer.format(counts.clean)}</strong><small>Source freshness is tracked separately</small></div>
    </div>
    <div className="archive-progress"><label htmlFor="shared-history-progress"><span>Histories with saved observations<br /><small>{saved} histories saved</small></span><strong>{percentage}%</strong></label>
      <progress id="shared-history-progress" value={counts.saved} max={counts.total || 1}
        aria-valuetext={`${saved} histories saved. ${integer.format(counts.sourceGaps)} source failures and ${integer.format(counts.qualityIssues)} quality flags remain.`} /></div>
    <div className="archive-run">{counts.coverageComplete ? <CheckCircle2 size={16} /> : <Database size={16} />}<span><strong>{activity}</strong><br />
      {integer.format(counts.attempted)} of {integer.format(counts.total)} schemes have received an import attempt. Progress advances when a verified checkpoint is published.</span></div>
    <dl className="archive-facts">
      <div><dt>Latest catalogue check</dt><dd>{time(manifest.catalogueFetchedAt)}</dd></div>
      <div><dt>Newest reported NAV date</dt><dd>{manifest.latestNavDate ?? 'Unavailable from source'}</dd></div>
      <div><dt>Saved checkpoint</dt><dd>#{integer.format(manifest.sequence)} · {time(manifest.checkpointAt)}</dd></div>
      <div><dt>Snapshot published</dt><dd>{time(manifest.generatedAt)}</dd></div>
      <div><dt>Source failures needing follow-up</dt><dd>{integer.format(counts.sourceGaps)}</dd></div>
      <div><dt>Saved histories with quality flags</dt><dd>{integer.format(counts.qualityIssues)}</dd></div>
      <div><dt>History refresh or reconciliation pending</dt><dd>{integer.format(counts.refreshPending)}</dd></div>
      <div><dt>Histories cached in this browser (local only)</dt><dd>{localStatus?.fundCount == null ? 'Unavailable' : integer.format(localStatus.fundCount)}</dd></div>
    </dl>
    {manifest.health&&<ArchiveHealthBreakdown health={manifest.health}/>}
    {manifest.issues.length > 0 && <details className="archive-issues"><summary>Source-gap examples ({manifest.issues.length} shown)</summary>
      <ul>{manifest.issues.map(issue => <li key={issue.code}><strong>Scheme {issue.code}</strong> · {issue.attempts} attempt(s): {issue.message}</li>)}</ul></details>}
    {manifest.warnings.length > 0 && <div className="notice warning"><AlertCircle size={16} /><span>{manifest.warnings.join(' ')}</span></div>}
    <p className="panel-note">The browser-cache count tracks only histories opened or saved on this device. It is not a central backfill deficit and does not need to equal the shared Release archive size.</p>
    <p className="panel-note">A saved history can still have a source failure, quality flag or pending refresh. Those categories can overlap. A completed attempt pass does not prove complete historical coverage, and provider gaps remain visible.</p>
    <p className="panel-note">{collecting
      ? 'Catalogue checks are scheduled twice daily at 07:00 and 19:00 UTC, with bounded history imports between checks. Actual job times may vary; these figures report the last verified checkpoint, not a currently running job.'
      : 'Shared collection is paused. Scheduled collection runs do not import new data while it is disabled. The last verified snapshot remains available, and you can refresh an individual fund directly from MFAPI.'}
      {' '}The catalogue’s newest NAV date does not establish that every fund’s history is current.</p>
    <p className="panel-note">Refresh a fund to check MFAPI directly. Shared histories and browser histories retain older observations when a shorter response arrives. Export a backup to preserve your watchlist, comparisons and personal research.</p>
  </section>;
}

export function DataStatus({ state, compact = false, onOpen }: {
  state: DataStatusState; compact?: boolean; onOpen?: () => void;
}) {
  if (isStaticRuntime()) return <BrowserStatus state={state} compact={compact} onOpen={onOpen} />;
  const { status, error, busy, refresh } = state;
  const now = Date.now();
  const age = status?.lastCatalogueSyncAt ? now - Date.parse(status.lastCatalogueSyncAt) : Infinity;
  const current = age >= 0 && age < 14 * 3600_000 && !error;
  const title = error ? 'Data status unavailable' : status?.lastCatalogueSyncAt
    ? `Market data checked ${time(status.lastCatalogueSyncAt)}` : busy ? 'Checking market-data status…' : 'First market-data refresh pending';
  if (compact) return <div className="data-status-line"><span className={`status-dot ${current ? '' : 'pending'}`} />
    <span>{title}</span><button onClick={onOpen}>Data status <ArrowRight size={12} /></button></div>;

  const activity = status ? archiveActivity(status) : null;
  const initialImport = status ? initialImportSummary(status) : null;
  const nextUpdate = status ? nextPlannedUpdate(status.schedule, now) : null;
  const coverage = status?.catalogueCount ? Math.min(100, status.archivedCount / status.catalogueCount * 100).toFixed(2) : '0.00';
  const savedCount = status ? `${integer.format(status.archivedCount)} of ${integer.format(status.catalogueCount)}` : '';

  return <section className="panel archive-panel" aria-labelledby="archive-heading">
    <div className="panel-heading"><div><div className="eyebrow">SHARED MARKET DATA</div><h2 id="archive-heading">A lasting view of the history.</h2>
      <p>Full available MFAPI histories are saved during scheduled imports and when you open a fund.</p></div>
      <button className="button secondary small" onClick={refresh} disabled={busy}><RefreshCw size={14} className={busy ? 'spin' : ''} />Check status</button></div>
    {error && <div className="notice warning" role="status"><AlertCircle size={17} /><span>{error}{status ? ' The figures and import state below are from the last successful status check.' : ''}</span></div>}
    <div className="archive-metrics">
      <div><span>Catalogued schemes</span><strong>{status ? integer.format(status.catalogueCount) : '—'}</strong><small>Includes retained older schemes</small></div>
      <div><span>Histories archived</span><strong>{status ? integer.format(status.archivedCount) : '—'}</strong><small>{status ? `${integer.format(status.historyBacklog)} needing import or follow-up` : 'Coverage loading'}</small></div>
      <div><span>NAV observations stored</span><strong>{status ? integer.format(status.observationCount) : '—'}</strong><small>No fixed history cutoff</small></div>
    </div>
    {status && <>
      <div className="archive-progress"><label htmlFor="archive-coverage"><span>Archive coverage<br /><small>{savedCount} histories saved</small></span><strong>{coverage}%</strong></label>
        <progress id="archive-coverage" value={Math.min(status.archivedCount, status.catalogueCount)} max={status.catalogueCount || 1}
          aria-valuetext={`${savedCount} histories saved (${coverage}%)`} /></div>
      <dl className="archive-facts"><div><dt>Latest catalogue refresh</dt><dd>{time(status.lastCatalogueSyncAt)}</dd></div>
        <div><dt>Newest reported NAV date</dt><dd>{status.latestNavDate ?? 'Awaiting provider data'}</dd></div>
        <div><dt>Latest history stored</dt><dd>{time(status.lastHistorySyncAt)}</dd></div>
        <div><dt>Next planned update</dt><dd>{nextUpdate ? time(nextUpdate) : 'Schedule unavailable'}</dd></div></dl>
      {initialImport && <section aria-labelledby="initial-import-heading">
        <div className="archive-run"><Database size={16} /><span><strong id="initial-import-heading">Initial history import</strong><br />
          {initialImport.label}<br />{integer.format(initialImport.checked)} of {integer.format(initialImport.total)} schemes checked</span></div>
        <dl className="archive-facts">
          <div><dt>Awaiting first attempt</dt><dd>{integer.format(initialImport.awaiting)}</dd></div>
          <div><dt>Waiting for retry</dt><dd>{integer.format(initialImport.retrying)}</dd></div>
          <div><dt>No history after 3 attempts</dt><dd>{integer.format(initialImport.unavailable)}</dd></div>
          <div><dt>Saved histories needing review</dt><dd>{integer.format(initialImport.needsReview)}</dd></div>
        </dl>
        <p className="panel-note">Checked means an import was attempted or history was already saved. It does not mean that every history passed validation.
          {status.backfill?.active ? ' The initial import continues in hourly batches.' : ' Scheduled updates continue to check for available data.'}
          {status.backfill?.completedAt && !status.backfill.active && status.backfill.remainingCount === 0 && status.catalogueCount > 0
            ? ` Initial import finished ${time(status.backfill.completedAt)}.` : ''}</p>
      </section>}
      <div className="archive-run">{activity?.kind === 'failed' ? <AlertCircle size={16} /> : activity?.kind === 'complete' ? <CheckCircle2 size={16} /> : <Database size={16} />}
        <span><strong>{activity?.label}</strong>{status.lastRun && <><br />
          {status.lastRun.status === 'running' ? 'Last reported run' : 'Last run'}: {integer.format(status.lastRun.processed)} histories processed · {integer.format(status.lastRun.failed)} failed
          {status.lastRun.finishedAt ? ` · Finished ${time(status.lastRun.finishedAt)}` : ''}
          {status.lastRun.error ? ` · ${status.lastRun.error}` : ''}</>}</span></div>
      {status.warnings.length > 0 && <div className="notice"><AlertCircle size={16} /><span>{status.warnings.join(' ')}</span></div>}
    </>}
    <p className="panel-note">Check status refreshes this display. Additional histories are saved during scheduled jobs or when you open a fund. The next update is a planned time; actual job starts may vary. Provider gaps remain visible, and older observations are retained.</p>
  </section>;
}
