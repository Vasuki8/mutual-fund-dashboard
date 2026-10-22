import { useMemo } from 'react';
import { Download } from 'lucide-react';
import type { AnalysisRange, FundData } from '../lib/types.ts';
import { returnCorrelationMatrix } from '../lib/return-correlation.ts';
import { downloadCsv, number, shortName } from '../lib/format.ts';

interface Props { funds: FundData[]; range: AnalysisRange; requestedPeriod: string }

export function ReturnCorrelation({ funds, range, requestedPeriod }: Props) {
  const matrix = useMemo(() => returnCorrelationMatrix(funds, range), [funds, range]);
  const availablePairs = matrix.cells.reduce((count, row, i) =>
    count + row.filter((cell, j) => j > i && cell.correlation !== null).length, 0);
  const exportMatrix = () => {
    downloadCsv([
      ['Source', 'mfapi.in; validated NAV history; locally computed monthly returns'],
      ['Selected period', requestedPeriod],
      ['Method', 'Pearson correlation of complete calendar-month NAV returns, pairwise common calendar months'],
      ['Missing values', 'Months absent from either scheme are excluded; no zeros or interpolation'],
      ['Minimum paired returns', 12],
      ['Measure', 'Unitless Pearson coefficient -1 to 1; not holdings overlap'],
      ['Fund A code', 'Fund A name', 'Fund B code', 'Fund B name', 'Pearson correlation', 'Paired complete months', 'First paired month', 'Last paired month', 'Unavailable reason'],
      ...matrix.cells.flatMap((row, i) => row.filter((_, j) => j >= i).map((cell, offset) => {
        const j = i + offset;
        return [matrix.schemeCodes[i], matrix.schemeNames[i], matrix.schemeCodes[j], matrix.schemeNames[j],
          cell.correlation, cell.pairedMonths, cell.firstMonth, cell.lastMonth, cell.reason];
      })),
    ], 'fundscope-monthly-return-correlation.csv');
  };
  return <section className="panel" aria-labelledby="return-correlation-heading">
    <div className="panel-heading">
      <div><h2 id="return-correlation-heading">Monthly return correlation</h2>
        <p>How closely the selected funds have moved together. Different categories may be compared.</p></div>
      <button className="button secondary small" onClick={exportMatrix} aria-label="Export monthly return correlation as CSV">
        <Download size={14}/> CSV
      </button>
    </div>
    <div className="small-notice">
      Pearson correlation ranges from −1 (opposite historical moves) to +1 (similar moves). Each pair needs at least
      12 **complete, matching calendar-month returns**; months with missing data are excluded. A result is descriptive,
      not a forecast or guarantee of diversification.
    </div>
    <div className="table-scroll" role="region" aria-label="Monthly return correlation matrix" tabIndex={0}>
      <table className="simple-table comparison-table" aria-label="Monthly NAV return correlations">
        <thead><tr><th scope="col">Selected fund</th>{matrix.schemeNames.map((name, j) =>
          <th scope="col" key={matrix.schemeCodes[j]} className="numeric">{shortName(name)}</th>)}</tr></thead>
        <tbody>{matrix.schemeNames.map((name, i) => <tr key={matrix.schemeCodes[i]}>
          <th scope="row">{shortName(name)}</th>{matrix.cells[i].map((cell, j) => <td key={matrix.schemeCodes[j]} className="numeric">
            <span title={cell.reason ?? 'Pearson correlation of paired complete monthly NAV returns'}>
              {cell.correlation === null ? '—' : number(cell.correlation, 2)}
            </span>
            <span className="muted"> · {number(cell.pairedMonths,0)} mo.</span>
          </td>)}</tr>)}</tbody>
      </table>
    </div>
    {availablePairs === 0 && <p className="panel-note" role="status">No pair has enough eligible complete monthly observations for a correlation estimate. Broaden the period or inspect the missing-history and NAV-quality warnings.</p>}
    <p className="panel-note">Each cell uses that pair's own overlapping complete months. Pairwise first and last months, observation counts, and unavailable reasons are included in CSV; different pairs may have different samples. Source: MFAPI NAV. {matrix.staleCount > 0 ? String(matrix.staleCount) + ' fund(s) are marked stale. ' : ''}<strong>Return correlation is not portfolio holdings overlap.</strong> Holdings overlap needs separately verified holdings snapshots.</p>
  </section>;
}
