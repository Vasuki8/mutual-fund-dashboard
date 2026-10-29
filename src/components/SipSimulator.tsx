import { useMemo, useState } from 'react';
import { Download, Info } from 'lucide-react';
import type { AnalysisRange, FundData } from '../lib/types.ts';
import type { VerifiedUnitAdjustment } from '../lib/corporate-actions.ts';
import type { VerifiedNavReview } from '../lib/verified-nav-reviews.ts';
import { SIP_MAX_AMOUNT, SIP_MIN_AMOUNT, simulateSip } from '../lib/sip.ts';
import { currency, dateLabel, downloadCsv, number, percent, qualityBlocked, shortName, navReviewSummary, navReviewEvidenceUrl } from '../lib/format.ts';
import { isGrowthScheme } from '../lib/analytics.ts';
import { Chart } from './Chart.tsx';
import { RangeNotice, RangePicker } from './AnalysisRangePicker.tsx';

interface Props { fund: FundData; unitAdjustment?: VerifiedUnitAdjustment; unitAdjustments?: VerifiedUnitAdjustment[]; navReview?: VerifiedNavReview }

export function SipSimulator({ fund, unitAdjustment, unitAdjustments, navReview }: Props) {
  const adjustments=unitAdjustments??(unitAdjustment?[unitAdjustment]:[]);
  const unitAdjusted=adjustments.length>0;
  const [range, setRange] = useState<AnalysisRange>('3Y');
  const [amountDraft, setAmountDraft] = useState('1000');
  const amount = amountDraft.trim() ? Number(amountDraft) : Number.NaN;
  const growth = isGrowthScheme(fund.meta.schemeName);
  const blocked = qualityBlocked(fund);
  const eligible = growth && !blocked;
  const result = useMemo(() => eligible ? simulateSip(fund.points, range, amount) : null,
    [fund.points, range, amount, eligible]);
  const successful = result !== null && result.reason === null;
  const latest = fund.points.at(-1);
  const period = typeof range === 'string' ? (range === 'MAX' ? 'All available history' : range + ' ending ' + (latest?.date ?? 'unavailable'))
    : range.start + ' to ' + range.end;

  const exportCsv = () => {
    if (!result || result.reason) return;
    const rows = [
      ...result.contributions.map(item => ({
        scheduled: item.scheduledDate, execution: item.navDate, nav: item.nav,
        contribution: item.amount, units: item.units, status: navReview ? 'Valued using reviewed calculation NAV' : unitAdjusted ? 'Valued using unit-adjusted NAV' : 'Valued using reported NAV',
      })),
      ...result.skippedDates.map(date => ({
        scheduled: date, execution: null, nav: null, contribution: null, units: null,
        status: 'No reported NAV on or within 7 days after scheduled date',
      })),
    ].sort((a, b) => a.scheduled.localeCompare(b.scheduled));
    downloadCsv([
      ['Fund', fund.meta.schemeName],
      ['Scheme code', fund.meta.schemeCode],
      ['NAV source', 'https://api.mfapi.in/mf/' + fund.meta.schemeCode],
      ['NAV calculation basis', navReview ? `Reviewed calculation NAV. ${navReviewSummary(navReview)}` : unitAdjusted ? adjustments.map(action=>`Source NAV through ${action.oldNavThrough} multiplied by ${action.factor}; new unit basis begins ${action.firstNewNavDate}; scheme ${action.schemeCode}; raw observations unchanged`).join(' | ')+(adjustments.length>1?'; factors apply cumulatively where periods overlap':'') : 'Source reported NAV'],
      ...(navReview?.events.map(event=>['Economic event evidence',`${event.date}: ${event.evidenceUrl}`])??[]),
      ['Original NAV retrieval', fund.fetchedAt],
      ['Calculation', 'Hypothetical fixed monthly contribution; no real transactions'],
      ['Monthly anchor', 'Requested start day (clamped to month-end when needed)'],
      ['Execution policy', 'First reported NAV on or after schedule date, within 7 calendar days; missing months skipped'],
      ['Requested period', period],
      ['First NAV in period', result.actualStart],
      ['Valuation NAV date', result.valuationDate],
      ['Monthly contribution (INR)', amount],
      ['Scheduled contributions', result.scheduledCount],
      ['Contributions with reported NAV', result.contributions.length],
      ['Skipped dates', result.skippedCount],
      ['NAV observations in selected period', result.navObservations],
      ['Contributed (INR)', result.invested],
      ['Hypothetical units', result.units],
      ['Final value (INR)', result.endingValue],
      ['Value less contributions (INR)', result.gain],
      ['Simple gain divided by contributions (decimal)', result.gainShare],
      ['Money-weighted XIRR (decimal, ACT/365)', result.annualizedXirr],
      ['Excluded from illustration', 'Taxes, transaction charges, exit loads, allotment rounding and distributions'],
      ['Scheduled date', 'Actual NAV date', navReview ? 'Reviewed calculation NAV (INR/unit)' : unitAdjusted ? 'Calculation NAV (INR/unit)' : 'Reported NAV (INR/unit)', 'Hypothetical contribution (INR)',
        'Fractional units', 'Status'],
      ...rows.map(item => [item.scheduled, item.execution, item.nav, item.contribution, item.units, item.status]),
    ], 'fundscope-' + fund.meta.schemeCode + '-historical-sip.csv');
  };

  return <section className="panel sip-simulator" aria-labelledby="sip-simulator-heading">
    <div className="panel-heading"><div>
      <h2 id="sip-simulator-heading">Historical SIP simulation</h2>
      <p>How an assumed monthly investment would have behaved using Growth-option NAVs{unitAdjusted ? `, adjusted for the ${adjustments.map(action=>action.label).join('; ')}` : ''}.</p>
    </div><button className="button secondary small" onClick={exportCsv}
      aria-label="Export hypothetical SIP cash flows as CSV" disabled={!successful}>
      <Download size={14}/> CSV
    </button></div>
    {navReview&&<div className="notice" role="status"><Info size={16}/><span>
      This simulation uses reviewed calculation NAV. {navReviewSummary(navReview,false)}
      <a href={navReviewEvidenceUrl(navReview)} target="_blank" rel="noreferrer"> Read the verified NAV evidence.</a>
      {navReview.events.map(event=><a key={event.date} href={event.evidenceUrl} target="_blank" rel="noreferrer"> Read the {dateLabel(event.date,true)} event evidence.</a>)}
    </span></div>}
    <div className="sip-controls">
      <label className="sip-amount">Monthly contribution (INR)
        <span>₹<input type="number" min={SIP_MIN_AMOUNT} max={SIP_MAX_AMOUNT} step="100"
          aria-label="Hypothetical monthly SIP contribution in INR" value={amountDraft}
          onChange={event => setAmountDraft(event.target.value)}/></span>
      </label>
      <RangePicker value={range} onChange={setRange}
        defaultStart={result?.actualStart ?? fund.points[0]?.date}
        defaultEnd={result?.valuationDate ?? latest?.date}/>
    </div>
    {result && <RangeNotice value={range} actualStart={result.actualStart}
      actualEnd={result.valuationDate} presetEnd={latest?.date}/>}
    {!growth ? <div className="notice warning" role="status"><Info size={16}/>
      <span>A verified Growth option is required. IDCW/dividend NAVs exclude cash distributions and cannot establish investor total returns.</span>
    </div> : blocked ? <div className="notice warning" role="status"><Info size={16}/>
      <span>SIP analytics unavailable until material NAV history-quality warnings are resolved. Raw observations remain accessible elsewhere on this page.</span>
    </div> : result?.reason ? <div className="small-notice" role="status">{result.reason}</div> : null}
    {result && successful && <>
      <div className="metrics-strip sip-metrics">
        <div className="metric"><span className="metric-label">Total contributions</span>
          <strong>{currency(result.invested,0)}</strong>
          <small>{number(result.contributions.length,0)} valued / {number(result.scheduledCount,0)} scheduled</small></div>
        <div className="metric"><span className="metric-label">Value at last NAV</span>
          <strong>{currency(result.endingValue,0)}</strong>
          <small>As of {dateLabel(result.valuationDate,true)}</small></div>
        <div className="metric"><span className="metric-label">Value less contributions</span>
          <strong className={result.gain !== null && result.gain < 0 ? 'negative' : 'positive'}>{currency(result.gain,0)}</strong>
          <small>{percent(result.gainShare)} simple gain / contributions</small></div>
        <div className="metric"><span className="metric-label">Money-weighted XIRR</span>
          <strong>{percent(result.annualizedXirr)}</strong>
          <small>{result.annualizedXirr === null ? 'Requires at least one year of executed cash flows'
            : 'Annualized on actual NAV cash-flow dates / 365'}</small></div>
      </div>
      {result.skippedCount > 0 && <p className="small-notice" role="status">
        {result.skippedCount} of {result.scheduledCount} scheduled contributions were not simulated:
        no reported NAV occurred within seven calendar days after those dates.
        The skipped scheduled dates are included in the CSV.
      </p>}
      {result.timeline.length > 1 && <div className="sip-chart">
        <Chart series={[
          {name: 'Hypothetical SIP value', data: result.timeline.map(item => ({date:item.date,value:item.value}))},
          {name: 'Cumulative contributions', data: result.timeline.map(item => ({date:item.date,value:item.invested}))},
        ]} unit="currency" height={290}
          title={shortName(fund.meta.schemeName) + ' historical SIP illustration'}
          subtitle={dateLabel(result.actualStart,true) + ' – ' + dateLabel(result.valuationDate,true)
            + ' · ' + result.navObservations + ' reported NAV observations · ' + (navReview?'Reviewed NAV (MFAPI and issuer records)':'MFAPI') + ' · INR'}/>
      </div>}
      <div className="sip-summary"><span>Hypothetical units: <strong>{number(result.units,6)}</strong></span>
        <span>First purchase: <strong>{dateLabel(result.contributions[0]?.navDate,true)}</strong></span>
        <span>Last NAV: <strong>{dateLabel(result.valuationDate,true)}</strong></span></div>
      <div className="table-scroll" role="region" aria-label="Recent hypothetical SIP cash flows" tabIndex={0}>
        <table className="simple-table">
          <thead><tr><th>Scheduled</th><th>Observed NAV date</th><th className="numeric">{navReview?'Reviewed calculation NAV (INR)':unitAdjusted?'Calculation NAV (INR)':'NAV (INR)'}</th>
            <th className="numeric">Contribution (INR)</th><th className="numeric">Units</th></tr></thead>
          <tbody>{result.contributions.slice(-12).reverse().map(item =>
            <tr key={item.scheduledDate}><td>{dateLabel(item.scheduledDate,true)}</td>
              <td>{dateLabel(item.navDate,true)}</td>
              <td className="numeric">{currency(item.nav,4)}</td>
              <td className="numeric">{currency(item.amount,0)}</td>
              <td className="numeric">{number(item.units,6)}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="panel-note">Most recent 12 valued installments shown; CSV contains the entire schedule, including missed dates.
        Observed NAV dates are not necessarily allotment dates. This illustration assumes exact fractional units and omits taxes,
        exit load, transaction charges, unit rounding, inflation and any separate cash distributions.
        NAV generally already reflects fund operating costs. Simple gain is not annualized and XIRR is not the fund’s CAGR.</p>
    </>}
    <p className="panel-note">Method: contribute once monthly on the requested starting day (clamped for shorter months);
      use the first reported NAV on or after each date, no more than seven days later. Never substitute a preceding NAV
      or fill a missing month. Value accumulated units at the last reported NAV within the requested period. XIRR,
      when available, is the annualized internal rate of return of the hypothetical dated contributions and closing value.
      Past performance and simulations are not forecasts, guaranteed results, or personal investment advice.</p>
  </section>;
}
