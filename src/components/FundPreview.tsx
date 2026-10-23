import { Fragment } from 'react';
import { ArrowUpRight, Bookmark, Check, Loader2, Plus, RefreshCw } from 'lucide-react';
import { isGrowthScheme, selectPeriod, trailingReturn } from '../lib/analytics.ts';
import { categoryLabel, currency, dateLabel, number, percent, planLabel, qualityBlocked, shortName } from '../lib/format.ts';
import type { FundData, Scheme } from '../lib/types.ts';
import { Chart } from './Chart.tsx';

interface Props {
  scheme?: Scheme; fund?: FundData; error?: string; saved: boolean; compared: boolean;
  openFund: (scheme: Scheme) => void; toggleWatch: (scheme: Scheme) => void;
  toggleCompare: (scheme: Scheme) => void; retry: () => void;
}

export function FundPreview({ scheme, fund, error, saved, compared, openFund, toggleWatch, toggleCompare, retry }: Props) {
  const latest = fund?.points.at(-1);
  const safe = fund && isGrowthScheme(fund.meta.schemeName) && !qualityBlocked(fund);
  const oneYear = safe ? trailingReturn(fund.points, 1) : null;
  const points = fund ? selectPeriod(fund.points, '1Y') : [];
  return <aside className="panel fund-preview" aria-label="Selected fund preview">
    <div className="preview-heading"><h2>Quick preview</h2><span className="badge">{scheme ? scheme.schemeCode : 'Select a fund'}</span></div>
    {!scheme ? <div className="preview-empty"><p>Select a fund in the table to preview its NAV history.</p></div> : <>
      <Fragment key={scheme.schemeCode}>
      <div className="preview-title"><h3>{shortName(scheme.schemeName)}</h3><p>{planLabel(scheme.schemeName)}</p></div>
      {!fund ? <div className="preview-empty" role="status">{error ? <><p>{error}</p><button className="button secondary small" onClick={retry}><RefreshCw size={13}/> Retry fund data</button></> : <><Loader2 size={20} className="spin"/><p>Loading NAV history…</p></>}</div> : <>
        <div className="preview-metrics"><div><span>Latest NAV · INR</span><strong>{currency(latest?.nav, 4)}</strong><small>{dateLabel(latest?.date, true)}</small></div><div><span>1Y return</span><strong className={oneYear == null ? '' : oneYear < 0 ? 'negative' : 'positive'}>{percent(oneYear)}</strong><small>Absolute return</small></div></div>
        <div className="preview-chart"><h4>NAV · up to 1 year · INR</h4><Chart series={[{ name: 'NAV (INR)', data: points.map(point => ({ date: point.date, value: point.nav })) }]} height={150} unit="currency" valuePrecision={4} title={`${shortName(scheme.schemeName)} NAV preview`} subtitle={`${dateLabel(points[0]?.date, true)} – ${dateLabel(latest?.date, true)}`}/></div>
        <dl className="preview-meta"><div><dt>Category</dt><dd>{categoryLabel(fund)}</dd></div><div><dt>First available NAV</dt><dd>{dateLabel(fund.points[0]?.date, true)}</dd></div><div><dt>Observations</dt><dd>{number(fund.points.length, 0)}</dd></div><div><dt>Data source</dt><dd>{fund.stale ? 'Saved data · refresh failed' : fund.fromCache ? 'MFAPI · browser cache' : fund.archive?.fromArchive ? 'Shared archive' : 'MFAPI'}</dd></div></dl>
        {fund.warnings.length > 0 && <p className="small-notice">{qualityBlocked(fund) ? 'A data-quality issue blocks return analytics. Open the fund for details.' : fund.stale ? 'The latest source refresh failed. Open the fund to review the saved history.' : 'Source and cache notes are available in the full analysis.'}</p>}
        {!isGrowthScheme(fund.meta.schemeName) && <p className="small-notice">Return analytics require a confirmed Growth option. Raw NAV remains available.</p>}
      </>}
      </Fragment>
      <div className="preview-actions"><button className="button primary" onClick={() => openFund(scheme)}>Open full analysis <ArrowUpRight size={15}/></button><div><button className={`button secondary small ${saved ? 'saved' : ''}`} aria-pressed={saved} onClick={() => toggleWatch(scheme)}><Bookmark size={14} fill={saved ? 'currentColor' : 'none'}/>{saved ? 'Saved' : 'Save'}</button><button className="button secondary small" aria-pressed={compared} onClick={() => toggleCompare(scheme)}>{compared ? <Check size={14}/> : <Plus size={14}/>}Compare</button></div></div>
    </>}
  </aside>;
}
