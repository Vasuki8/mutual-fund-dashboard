import type { VerifiedNavReview } from '../lib/verified-nav-reviews.ts';
import { useMemo } from 'react';
import { Download } from 'lucide-react';
import type { AnalysisRange, FundData, Scheme } from '../lib/types.ts';
import { selectedPeerSummary } from '../lib/selected-peers.ts';
import { asScheme, dateLabel, downloadCsv, navReviewSummary, number, percent, shortName } from '../lib/format.ts';

interface Props {
  funds: FundData[];
  range: AnalysisRange;
  requestedPeriod: string;
  navReviews?: VerifiedNavReview[];
  openFund: (scheme: Scheme) => void;
}

export function SelectedPeers({ funds, range, requestedPeriod, openFund, navReviews = [] }: Props) {
  const reviewMetadata = navReviews.flatMap(review => [
    ['NAV calculation basis', `Scheme ${review.schemeCode}: reviewed calculation NAV. ${navReviewSummary(review)}`],
    ...review.events.map(event => ['Economic event evidence', `Scheme ${review.schemeCode}, ${event.date}: ${event.evidenceUrl}`]),
  ]);
  const summary = useMemo(() => selectedPeerSummary(funds, range), [funds, range]);
  const byCode = useMemo(() => new Map(funds.map(fund => [fund.meta.schemeCode, fund])), [funds]);
  const exportPeers = () => {
    if (!summary.available) return;
    downloadCsv([
      ['Source', navReviews.length ? 'MFAPI NAV history; reviewed calculation NAV supported by issuer evidence below; user-selected schemes' : 'mfapi.in NAV history; user-selected schemes'],
      ...reviewMetadata,
      ['Universe', 'Only selected funds; not a category-wide sample or official ranking'],
      ['Selected period', requestedPeriod],
      ['Actual common NAV dates', String(summary.start) + ' to ' + String(summary.end)],
      ['Scheme category', summary.category],
      ['Plan', summary.plan],
      ['Return metric', summary.metric],
      ['Common NAV observations', summary.observationCount],
      ['Eligible independent funds', summary.eligibleCount],
      ['Cohort median return (decimal)', summary.median],
      ['Percentile method', '100 × (number below + 0.5 × number tied) / eligible count'],
      ['Scheme code', 'Full scheme name', 'Return (decimal)', 'Selected-cohort midrank percentile (0–100)', 'Difference vs cohort median (decimal)'],
      ...summary.rows.map(row => [row.schemeCode, row.schemeName, row.returnValue, row.percentile, row.returnValue - (summary.median ?? 0)]),
    ], 'fundscope-selected-peer-context.csv');
  };
  return <section className="panel" aria-labelledby="selected-peer-heading">
    <div className="panel-heading"><div>
      <h2 id="selected-peer-heading">Selected peer context</h2>
      <p>Compare only eligible schemes you selected. Not a market-wide category percentile or an investment rating.</p>
    </div><div className="fund-heading-actions"><span className="pill">Selected set only</span>
      <button className="button secondary small" aria-label="Export selected peer statistics as CSV" onClick={exportPeers} disabled={!summary.available}>
        <Download size={14}/> CSV
      </button>
    </div></div>
    {!summary.available ? <div className="small-notice" role="status">
      Selected-peer statistics unavailable: {summary.reason} The regular comparison chart remains available for different fund objectives where NAV data permits.
    </div> : <>
      <div className="metrics-strip">
        <div className="metric"><span className="metric-label">Peer median {summary.metric}</span>
          <strong>{percent(summary.median)}</strong><small>Only eligible selected funds</small></div>
        <div className="metric"><span className="metric-label">Eligible peer count</span>
          <strong>{number(summary.eligibleCount,0)}</strong><small>Matched fund categories and plans</small></div>
        <div className="metric"><span className="metric-label">Shared NAV observations</span>
          <strong>{number(summary.observationCount,0)}</strong><small>No filled or interpolated missing dates</small></div>
        <div className="metric"><span className="metric-label">Actual common dates</span>
          <strong className="tabular">{dateLabel(summary.start,true)} – {dateLabel(summary.end,true)}</strong><small>Exact NAV dates from all selected funds</small></div>
      </div>
      <div className="table-scroll" role="region" aria-label="Selected peer percentile table" tabIndex={0}>
        <table className="simple-table" aria-label="Selected peer statistics">
          <thead><tr><th scope="col">Selected fund</th><th scope="col" className="numeric">{summary.metric}</th>
            <th scope="col" className="numeric">Vs peer median</th><th scope="col" className="numeric">Selected-set percentile</th></tr></thead>
          <tbody>{summary.rows.map(row => <tr key={row.schemeCode}>
            <td><button className="text-action" onClick={() => {
              const fund = byCode.get(row.schemeCode);
              if (fund) openFund(asScheme(fund));
            }}>{shortName(row.schemeName)}</button></td>
            <td className="numeric">{percent(row.returnValue)}</td>
            <td className="numeric">{percent(row.returnValue - (summary.median ?? 0))}</td>
            <td className="numeric">{number(row.percentile,1)} / 100</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="panel-note">MFAPI category: {summary.category} · {summary.plan} Growth · {summary.eligibleCount} selected distinct schemes · {summary.observationCount} exact common NAV dates. The percentile uses midranks (ties receive the same value); it is calculated only within this very small user-selected group and is not representative of all funds in the category. No weighting, survivorship correction or external peer universe is implied.</p>
      {summary.staleCount > 0 && <p className="panel-note">{summary.staleCount} selected fund(s) used cached data after a failed refresh. Their period and last source dates should be reviewed before drawing conclusions.</p>}
    </>}
  </section>;
}
