import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { FundData, Scheme } from '../lib/types.ts';
import { selectPeriod } from '../lib/analytics.ts';
import { dateLabel, percent, planLabel, shortName } from '../lib/format.ts';
import { returnValue, type FundReturnLookup } from '../lib/fund-sort.ts';
import { FundPreview } from './FundPreview.tsx';

interface Props {
  schemes: Scheme[]; funds: Record<number, FundData>; errors: Record<number, string>;
  returnsByScheme: FundReturnLookup; ensureFund: (code: number, force?: boolean) => Promise<void>;
  onSelect: (scheme: Scheme) => void; openFund: (scheme: Scheme) => void;
  watchlist: Scheme[]; compared: Scheme[]; toggleWatch: (scheme: Scheme) => void; toggleCompare: (scheme: Scheme) => void;
}

function NavSparkline({ fund }: { fund?: FundData }) {
  const points = fund ? selectPeriod(fund.points, '1Y') : [];
  if (points.length < 2) return <span className="band-spark-empty" aria-hidden="true"/>;
  const low = Math.min(...points.map(point => point.nav));
  const high = Math.max(...points.map(point => point.nav));
  const first = Date.parse(points[0].date), last = Date.parse(points.at(-1)!.date);
  if (last <= first) return <span className="band-spark-empty" aria-hidden="true"/>;
  const path = points.map((point, index) => `${index ? 'L' : 'M'}${((Date.parse(point.date) - first) / (last - first) * 96).toFixed(2)},${(28 - (point.nav - low) / (high - low || 1) * 24).toFixed(2)}`).join(' ');
  return <svg className="band-spark" viewBox="0 0 96 32" preserveAspectRatio="none" aria-hidden="true"><path d={path}/></svg>;
}

export function FundBands(props: Props) {
  const [expandedCode, setExpandedCode] = useState<number | null>(props.schemes[0]?.schemeCode ?? null);
  useEffect(() => { for (const scheme of props.schemes) void props.ensureFund(scheme.schemeCode); }, [props.schemes, props.ensureFund]);
  return <div className="fund-bands" aria-label="Starter fund collection">
    {props.schemes.map((scheme, index) => {
      const fund = props.funds[scheme.schemeCode];
      const reading = props.returnsByScheme[scheme.schemeCode];
      const value = returnValue(reading, '3');
      const expanded = expandedCode === scheme.schemeCode;
      return <div className="fund-band-entry" key={scheme.schemeCode}>
        <button type="button" className="fund-band" aria-expanded={expanded} aria-controls={`fund-evidence-${scheme.schemeCode}`} onClick={() => {
          props.onSelect(scheme);
          setExpandedCode(current => current === scheme.schemeCode ? null : scheme.schemeCode);
        }}>
          <span className="band-index">{String(index + 1).padStart(2, '0')}</span>
          <span className="band-name"><strong>{shortName(scheme.schemeName)}</strong><small>{planLabel(scheme.schemeName)}</small></span>
          <span className="band-reading"><strong className={value === null ? '' : value < 0 ? 'negative' : 'positive'}>{percent(value)}</strong><small>3Y CAGR{reading?.navDate ? ` · ${dateLabel(reading.navDate, true)}` : ''}</small></span>
          <NavSparkline fund={fund}/>
          {expanded ? <Minus size={16}/> : <Plus size={16}/>}
        </button>
        <section className="fund-band-evidence" id={`fund-evidence-${scheme.schemeCode}`} hidden={!expanded} aria-label={`${shortName(scheme.schemeName)} evidence`}>
          {expanded && <FundPreview scheme={scheme} fund={fund} error={props.errors[scheme.schemeCode]}
            saved={props.watchlist.some(item => item.schemeCode === scheme.schemeCode)}
            compared={props.compared.some(item => item.schemeCode === scheme.schemeCode)}
            openFund={props.openFund} toggleWatch={props.toggleWatch} toggleCompare={props.toggleCompare}
            retry={() => { void props.ensureFund(scheme.schemeCode, true); }}/>}
        </section>
      </div>;
    })}
  </div>;
}
