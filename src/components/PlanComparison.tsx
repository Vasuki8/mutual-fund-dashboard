import { AlertCircle, Download, Info } from 'lucide-react';
import type { FundData } from '../lib/types.ts';
import { currency, dateLabel, downloadCsv, number, percent } from '../lib/format.ts';
import { summarizePlanNavDifference, type AlignedPlanHistory } from '../lib/plan-comparison.ts';

interface Props {
  funds: FundData[];
  aligned: AlignedPlanHistory;
  requestedPeriod: string;
}

export function PlanComparison({ funds, aligned, requestedPeriod }: Props) {
  const result = summarizePlanNavDifference(funds, aligned);
  if (!result.applicable) return null;
  const metrics = result.metrics;
  if (!metrics) {
    return <section className="panel" aria-labelledby="plan-comparison-heading">
      <div className="panel-heading"><div>
        <h2 id="plan-comparison-heading">Direct vs Regular plan</h2>
        <p>A plan comparison is available only for defensibly matched Growth scheme variants.</p>
      </div></div>
      <div className="notice warning" role="status"><AlertCircle size={16}/><span>{result.reason}</span></div>
      <p className="panel-note">Select one explicitly named Direct Plan and one Regular Plan for the same strategy. MFAPI does not certify plan pairings or provide expense ratios.</p>
    </section>;
  }
  const direct = funds[metrics.directIndex];
  const regular = funds[metrics.regularIndex];
  const percentagePointGap = metrics.returnDifference * 100;
  const gap = (percentagePointGap > 0 ? '+' : '') + number(percentagePointGap) + ' pp';
  const exportPlans = () => downloadCsv([
    ['Data source', 'MFAPI validated Growth NAV observations'],
    ['Method', 'Exact common reported NAV dates; no imputation or forward fill'],
    ['Pairing', 'Same normalized scheme name, fund house, category and type; not an AMC-certified pair'],
    ['Requested period', requestedPeriod],
    ['Actual common NAV dates', metrics.start + ' to ' + metrics.end],
    ['Elapsed calendar days', metrics.elapsedDays],
    ['Common NAV observations', metrics.observationCount],
    ['Return measure', metrics.measure],
    ['Starting investment (INR)', 10_000],
    ['Direct scheme code', direct.meta.schemeCode],
    ['Direct scheme name', direct.meta.schemeName],
    ['Direct source', 'https://api.mfapi.in/mf/' + direct.meta.schemeCode],
    ['Direct history retrieved UTC', direct.fetchedAt],
    ['Regular scheme code', regular.meta.schemeCode],
    ['Regular scheme name', regular.meta.schemeName],
    ['Regular source', 'https://api.mfapi.in/mf/' + regular.meta.schemeCode],
    ['Regular history retrieved UTC', regular.fetchedAt],
    ['Direct reported return (decimal)', metrics.directReturn],
    ['Regular reported return (decimal)', metrics.regularReturn],
    ['Direct minus Regular return (percentage points)', percentagePointGap],
    ['Direct ending value (INR)', metrics.directEndingValue],
    ['Regular ending value (INR)', metrics.regularEndingValue],
    ['Direct minus Regular ending value (INR)', metrics.endingValueDifference],
    ['Caveat', 'Observed NAV difference is not an estimate of the total expense ratio or all fees'],
    ['Date', 'Direct NAV', 'Regular NAV', 'Direct normalized INR', 'Regular normalized INR', 'Direct minus Regular INR'],
    ...aligned.dates.map((date, index) => {
      const directSeries = aligned.series[metrics.directIndex];
      const regularSeries = aligned.series[metrics.regularIndex];
      const directValue = 10_000 * directSeries[index].nav / directSeries[0].nav;
      const regularValue = 10_000 * regularSeries[index].nav / regularSeries[0].nav;
      return [date, directSeries[index].nav, regularSeries[index].nav, directValue, regularValue, directValue - regularValue];
    }),
  ], 'fundscope-direct-regular-' + direct.meta.schemeCode + '-' + regular.meta.schemeCode + '.csv');
  return <section className="panel" aria-labelledby="plan-comparison-heading">
    <div className="panel-heading"><div><h2 id="plan-comparison-heading">Direct vs Regular plan</h2>
      <p>Same named strategy · {dateLabel(metrics.start,true)} to {dateLabel(metrics.end,true)} · {metrics.observationCount.toLocaleString('en-IN')} identical NAV dates</p></div>
      <button className="button secondary small" aria-label="Export Direct Regular plan comparison as CSV" onClick={exportPlans}><Download size={14}/> CSV</button>
    </div>
    <div className="metrics-strip compact">
      <div className="metric"><span className="metric-label">Direct {metrics.measure}</span><strong>{percent(metrics.directReturn)}</strong><small>{metrics.measure==='CAGR'?'ACT/365 annualized':'Full-period absolute return'}</small></div>
      <div className="metric"><span className="metric-label">Regular {metrics.measure}</span><strong>{percent(metrics.regularReturn)}</strong><small>Same observed dates</small></div>
      <div className="metric"><span className="metric-label">Return gap (Direct − Regular)</span><strong className={metrics.returnDifference<0?'negative':'positive'}>{gap}</strong><small>Percentage points; not a fee estimate</small></div>
      <div className="metric"><span className="metric-label">₹10,000 ending-value gap</span><strong className={metrics.endingValueDifference<0?'negative':'positive'}>{currency(metrics.endingValueDifference)}</strong><small>Direct {currency(metrics.directEndingValue)} · Regular {currency(metrics.regularEndingValue)}</small></div>
    </div>
    {result.staleCount>0&&<div className="notice warning"><AlertCircle size={16}/><span>{result.staleCount} plan history may be stale after a failed refresh. The original NAV observation dates remain visible.</span></div>}
    <p className="panel-note"><Info size={13}/> Names and MFAPI metadata match, but MFAPI does not expressly certify these as paired share classes. Confirm the scheme documents with the AMC. Each plan starts with a hypothetical ₹10,000 on the same reported date. NAV already reflects ongoing fund costs; the return gap is <strong>not</strong> an estimate of TER or transaction fees. No distributions, taxes, loads, or new data sources were added.</p>
  </section>;
}
