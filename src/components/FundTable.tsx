import { useEffect } from 'react';
import { ArrowDown, ArrowUpRight, Bookmark, Check, Plus, RefreshCw } from 'lucide-react';
import type { FundData, Scheme } from '../lib/types.ts';
import { currency, percent, shortName, planLabel, categoryLabel, fundInitials, dateLabel } from '../lib/format.ts';
import { returnValue, type FundReturnLookup, type FundSort, type FundSortKey } from '../lib/fund-sort.ts';

export interface FundTableProps {
  schemes: Scheme[]; funds: Record<number,FundData>; errors:Record<number,string>;
  ensureFund:(code:number,force?:boolean)=>Promise<void>; openFund:(scheme:Scheme)=>void;
  watchlist:Scheme[]; compared:Scheme[]; toggleWatch:(scheme:Scheme)=>void; toggleCompare:(scheme:Scheme)=>void;
  sort:FundSort; onSort:(key:FundSortKey)=>void; returnsByScheme:FundReturnLookup; canSortReturns:boolean; canSortDrawdown:boolean;
}
export function FundTable({schemes,funds,errors,ensureFund,openFund,watchlist,compared,toggleWatch,toggleCompare,sort,onSort,returnsByScheme,canSortReturns,canSortDrawdown}:FundTableProps) {
  useEffect(()=>{for(const scheme of schemes) void ensureFund(scheme.schemeCode);},[schemes,ensureFund]);
  // Home owns the sort across ALL matches and passes only the already sorted page.
  const getReturn=(scheme:Scheme,years:1|3|5)=>returnValue(returnsByScheme[scheme.schemeCode],String(years) as '1'|'3'|'5');
  const sortedState=(key:FundSortKey):'ascending'|'descending'|undefined=>sort.key===key?(sort.desc?'descending':'ascending'):undefined;
  return <div className="table-scroll" role="region" aria-label="Fund results table" tabIndex={0}><table className="fund-table"><thead><tr>
    <th scope="col" className="fund-name-column" aria-sort={sortedState('name')}><button onClick={()=>onSort('name')}>Fund name {sort.key==='name'&&<ArrowDown size={12} className={sort.desc?'':'rotate'}/>}</button></th>
    <th scope="col" className="numeric">NAV</th>
    <th scope="col" className="numeric" aria-sort={sortedState('1')}><button onClick={()=>onSort('1')} disabled={!canSortReturns} title={!canSortReturns?'Global return sorting requires a published return index or complete loaded history':undefined}>1Y return {sort.key==='1'&&<ArrowDown size={12} className={sort.desc?'':'rotate'}/>}</button></th>
    <th scope="col" className="numeric" aria-sort={sortedState('3')}><button onClick={()=>onSort('3')} disabled={!canSortReturns} title={!canSortReturns?'Global return sorting requires a published return index or complete loaded history':undefined}>3Y CAGR {sort.key==='3'&&<ArrowDown size={12} className={sort.desc?'':'rotate'}/>}</button></th>
    <th scope="col" className="numeric" aria-sort={sortedState('5')}><button onClick={()=>onSort('5')} disabled={!canSortReturns} title={!canSortReturns?'Global return sorting requires a published return index or complete loaded history':undefined}>5Y CAGR {sort.key==='5'&&<ArrowDown size={12} className={sort.desc?'':'rotate'}/>}</button></th>
    <th scope="col" className="numeric" aria-sort={sortedState('dd3')}><button onClick={()=>onSort('dd3')} disabled={!canSortDrawdown} title={!canSortDrawdown?'Global 3Y max drawdown requires the updated verified archive or complete loaded histories.':'Largest observed peak-to-trough NAV loss over the trailing three years; smaller losses sort first by default.'}>3Y max drawdown {sort.key==='dd3'&&<ArrowDown size={12} className={sort.desc?'':'rotate'}/>}</button></th>
    <th scope="col" className="actions-head">Save / compare / open</th>
  </tr></thead><tbody>{schemes.map((scheme)=>{
    const fund=funds[scheme.schemeCode];const latest=fund?.points.at(-1);const saved=watchlist.some(s=>s.schemeCode===scheme.schemeCode);const added=compared.some(s=>s.schemeCode===scheme.schemeCode);
    return <tr key={scheme.schemeCode}>
      <td><button className="fund-link" aria-label={`Open ${shortName(scheme.schemeName)}`} onClick={()=>openFund(scheme)}><span className={`fund-avatar tone-${scheme.schemeCode%5}`}>{fundInitials(shortName(scheme.schemeName))}</span><span><strong>{shortName(scheme.schemeName)}</strong><small>{planLabel(scheme.schemeName)}<span className="dot-sep">·</span>{fund?categoryLabel(fund):`Scheme ${scheme.schemeCode}`}</small></span></button></td>
      <td className="numeric nav-cell">{latest?<><strong>{currency(latest.nav)}</strong><small>{dateLabel(latest.date,true)}</small></>:errors[scheme.schemeCode]?<button className="retry-inline" title={errors[scheme.schemeCode]} onClick={()=>void ensureFund(scheme.schemeCode,true)}><RefreshCw size={12}/> Retry</button>:<span className="skeleton"/>}</td>
      {[1,3,5].map(year=>{const value=getReturn(scheme,year as 1|3|5);return <td key={year} className={`numeric return-cell ${value!=null?(value<0?'negative':'positive'):''}`} title={returnsByScheme[scheme.schemeCode]?.navDate?`Trailing NAV return through ${dateLabel(returnsByScheme[scheme.schemeCode].navDate,true)}. Dates vary by scheme.`:undefined}>{returnsByScheme[scheme.schemeCode]||fund?percent(value):errors[scheme.schemeCode]?'—':<span className="skeleton short"/>}</td>;})}
      {(()=>{const value=returnValue(returnsByScheme[scheme.schemeCode],'dd3');
        const date=returnsByScheme[scheme.schemeCode]?.navDate;
        return <td className={`numeric return-cell ${value!==null&&value<0?'negative':''}`}
          title={value!==null && date
            ? `Largest observed peak-to-trough NAV decline over the trailing 3Y through ${dateLabel(date,true)}. Actual observations only.`
            : 'Unavailable: requires a validated Growth history covering the trailing three years.'}>
          {returnsByScheme[scheme.schemeCode]||fund?percent(value):errors[scheme.schemeCode]?'—':<span className="skeleton short"/>}
        </td>;})()}
      <td><div className="table-actions"><button className={`icon-button ${saved?'active':''}`} aria-pressed={saved} onClick={()=>toggleWatch(scheme)} aria-label={`${saved?'Remove':'Save'} ${shortName(scheme.schemeName)} ${saved?'from':'to'} watchlist`} title={saved?'Remove from watchlist':'Save to watchlist'}><Bookmark size={17} fill={saved?'currentColor':'none'}/></button><button className={`compare-toggle ${added?'active':''}`} aria-pressed={added} onClick={()=>toggleCompare(scheme)} aria-label={`${added?'Remove':'Add'} ${shortName(scheme.schemeName)} ${added?'from':'to'} comparison`} title={added?'Remove from comparison':'Add to comparison'}>{added?<Check size={14}/>:<Plus size={15}/>}</button><button className="analysis-trigger icon-button" onClick={()=>openFund(scheme)} aria-label={`Open full analysis for ${shortName(scheme.schemeName)}`} title="Open full analysis"><ArrowUpRight size={16}/></button></div></td>
    </tr>;
  })}</tbody></table>{!schemes.length&&<div className="empty-state">No funds to display.</div>}{schemes.length>0&&!schemes.some(s=>funds[s.schemeCode]||errors[s.schemeCode])&&<span className="sr-only" role="status">Loading NAV data</span>}</div>;
}
