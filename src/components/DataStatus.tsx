import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Database, RefreshCw } from 'lucide-react';
import { archiveActivity, initialImportSummary, nextPlannedUpdate, validBackfillStatus } from '../lib/archive-status.ts';
import type { SyncStatus } from '../lib/sync-types.ts';

const integer = new Intl.NumberFormat('en-IN');
function time(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Awaiting first refresh';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: '2-digit',
    minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(value)) + ' IST';
}
export function useDataStatus() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let closed = false;
    setBusy(true);
    const timeout = setTimeout(() => controller.abort(), 15_000);
    void (async () => {
      try {
        const response = await fetch('/api/data/status', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Data status is temporarily unavailable.');
        const body = await response.json() as SyncStatus;
        if (body.source !== 'mfapi.in' || !Array.isArray(body.warnings)
          || ['catalogueCount', 'archivedCount', 'observationCount', 'historyBacklog'].some(key =>
            !Number.isSafeInteger(body[key as keyof SyncStatus]) || Number(body[key as keyof SyncStatus]) < 0)
          || !validBackfillStatus(body)) {
          throw new Error('Data status could not be verified.');
        }
        if (!closed) { setStatus(body); setError(''); }
      } catch {
        if (!closed) setError('Data status is temporarily unavailable. Previously loaded histories remain usable.');
      } finally {
        clearTimeout(timeout);
        if (!closed) setBusy(false);
      }
    })();
    const poll = setTimeout(() => setRevision(value => value + 1), 60_000);
    return () => { closed = true; controller.abort(); clearTimeout(timeout); clearTimeout(poll); };
  }, [revision]);
  return { status, error, busy, refresh: () => setRevision(value => value + 1) };
}
export type DataStatusState = ReturnType<typeof useDataStatus>;

export function DataStatus({ state, compact = false, onOpen }: {
  state: DataStatusState; compact?: boolean; onOpen?: () => void;
}) {
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
