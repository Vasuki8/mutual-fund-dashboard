import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Database, RefreshCw } from 'lucide-react';
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
            !Number.isSafeInteger(body[key as keyof SyncStatus]) || Number(body[key as keyof SyncStatus]) < 0)) {
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
  const age = status?.lastCatalogueSyncAt ? Date.now() - Date.parse(status.lastCatalogueSyncAt) : Infinity;
  const current = age >= 0 && age < 14 * 3600_000 && !error;
  const title = error ? 'Data status unavailable' : status?.lastCatalogueSyncAt
    ? `Market data checked ${time(status.lastCatalogueSyncAt)}` : busy ? 'Checking market-data status…' : 'First market-data refresh pending';
  if (compact) return <div className="data-status-line"><span className={`status-dot ${current ? '' : 'pending'}`} />
    <span>{title}</span><button onClick={onOpen}>Data status <ArrowRight size={12} /></button></div>;

  return <section className="panel archive-panel" aria-labelledby="archive-heading">
    <div className="panel-heading"><div><div className="eyebrow">SHARED MARKET DATA</div><h2 id="archive-heading">A lasting view of the history.</h2>
      <p>Full available MFAPI history is fetched when you open a scheme. The archive grows automatically between visits.</p></div>
      <button className="button secondary small" onClick={refresh} disabled={busy}><RefreshCw size={14} className={busy ? 'spin' : ''} />Check status</button></div>
    {error && <div className="notice warning" role="status"><AlertCircle size={17} /><span>{error}{status ? ' The figures below are the last status retrieved.' : ''}</span></div>}
    <div className="archive-metrics">
      <div><span>Catalogued schemes</span><strong>{status ? integer.format(status.catalogueCount) : '—'}</strong><small>Includes retained older schemes</small></div>
      <div><span>Histories archived</span><strong>{status ? integer.format(status.archivedCount) : '—'}</strong><small>{status ? `${integer.format(status.historyBacklog)} needing import or follow-up` : 'Coverage loading'}</small></div>
      <div><span>NAV observations stored</span><strong>{status ? integer.format(status.observationCount) : '—'}</strong><small>No fixed history cutoff</small></div>
    </div>
    {status && <>
      <div className="archive-progress"><label htmlFor="archive-coverage">Schemes with saved history <strong>{status.catalogueCount ? Math.min(100, status.archivedCount / status.catalogueCount * 100).toFixed(1) : '0.0'}%</strong></label>
        <progress id="archive-coverage" value={Math.min(status.archivedCount, status.catalogueCount)} max={status.catalogueCount || 1} /></div>
      <dl className="archive-facts"><div><dt>Latest catalogue refresh</dt><dd>{time(status.lastCatalogueSyncAt)}</dd></div>
        <div><dt>Newest reported NAV date</dt><dd>{status.latestNavDate ?? 'Awaiting provider data'}</dd></div>
        <div><dt>Latest history stored</dt><dd>{time(status.lastHistorySyncAt)}</dd></div>
        <div><dt>Daily refresh times</dt><dd>11:07 AM &amp; 11:07 PM IST</dd></div></dl>
      {status.lastRun && <div className="archive-run">{status.lastRun.status === 'failed' ? <AlertCircle size={16} /> : status.historyBacklog === 0 && status.lastRun.status === 'completed' ? <CheckCircle2 size={16} /> : <Database size={16} />}
        <span>Last run: <strong>{status.lastRun.status}</strong> · {integer.format(status.lastRun.processed)} histories processed · {integer.format(status.lastRun.failed)} failed
          {status.lastRun.error ? ` · ${status.lastRun.error}` : ''}</span></div>}
      {status.warnings.length > 0 && <div className="notice"><AlertCircle size={16} /><span>{status.warnings.join(' ')}</span></div>}
    </>}
    <p className="panel-note">A catalogue refresh does not mean every history has been archived. The remaining history import resumes in batches; opening a fund also saves its available history. Provider gaps remain visible, and older observations are retained.</p>
  </section>;
}
