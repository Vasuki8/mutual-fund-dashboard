import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUpRight, Bookmark, Check, Plus, RefreshCw } from 'lucide-react';
import type { FundData, Scheme } from '../lib/types.ts';
import { trailingReturn, isGrowthScheme } from '../lib/analytics.ts';
import { currency, percent, shortName, planLabel, categoryLabel, fundInitials, dateLabel, qualityBlocked } from '../lib/format.ts';

export interface FundTableProps {
  schemes: Scheme[]; funds: Record<number,FundData>; errors:Record<number,string>;
  ensureFund:(code:number,force?:boolean)=>Promise<void>; openFund:(scheme:Scheme)=>void;
  watchlist:Scheme[]; compared:Scheme[]; toggleWatch:(scheme:Scheme)=>void; toggleCompare:(scheme:Scheme)=>void;
  selectedCode?:number; previewFund?:(scheme:Scheme)=>void;
}
export function FundTable({schemes,funds,errors,ensureFund,openFund,watchlist,compared,toggleWatch,toggleCompare,selectedCode,previewFund}:FundTableProps) {
  const [sort,setSort]=useState<{key:'name'|'1'|'3'|'5';desc:boolean}>({key:'name',desc:false});
  useEffect(()=>{for(const scheme of schemes) void ensureFund(scheme.schemeCode);},[schemes,ensureFund]);
  const getReturn=(scheme:Scheme,years:number)=>{const fund=funds[scheme.schemeCode]; return fund && isGrowthScheme(fund.meta.schemeName)&&!qualityBlocked(fund)?trailingReturn(fund.points,years):null;};
  const ordered=[...schemes].sort((a,b)=>{
    if(sort.key==='name') return sort.desc?b.schemeName.localeCompare(a.schemeName):a.schemeName.localeCompare(b.schemeName);
    const av=getReturn(a,+sort.key),bv=getReturn(b,+sort.key);
    if(av==null)return bv==null?0:1;if(bv==null)return -1;
    return sort.desc?bv-av:av-bv;
  });
  const sortBy=(key:typeof sort.key)=>setSort(current=>({key,desc:current.key===key?!current.desc:key!=='name'}));
  const sortedState=(key:typeof sort.key):'ascending'|'descending'|undefined=>sort.key===key?(sort.desc?'descending':'ascending'):undefined;
  return <div className="table-scroll" role="region" aria-label="Fund results table" tabIndex={0}><table className="fund-table"><thead><tr>
    <th scope="col" className="fund-name-column" aria-sort={sortedState('name')}><button onClick={()=>sortBy('name')}>Fund name {sort.key==='name'&&<ArrowDown size={12} className={sort.desc?'':'rotate'}/>}</button></th>
    <th scope="col" className="numeric">NAV</th>
    <th scope="col" className="numeric" aria-sort={sortedState('1')}><button onClick={()=>sortBy('1')}>1Y return {sort.key==='1'&&<ArrowDown size={12} className={sort.desc?'':'rotate'}/>}</button></th>
    <th scope="col" className="numeric" aria-sort={sortedState('3')}><button onClick={()=>sortBy('3')}>3Y CAGR {sort.key==='3'&&<ArrowDown size={12} className={sort.desc?'':'rotate'}/>}</button></th>
    <th scope="col" className="numeric" aria-sort={sortedState('5')}><button onClick={()=>sortBy('5')}>5Y CAGR {sort.key==='5'&&<ArrowDown size={12} className={sort.desc?'':'rotate'}/>}</button></th>
    <th scope="col" className="actions-head">Save / compare / open</th>
  </tr></thead><tbody>{ordered.map((scheme)=>{
    const fund=funds[scheme.schemeCode];const latest=fund?.points.at(-1);const saved=watchlist.some(s=>s.schemeCode===scheme.schemeCode);const added=compared.some(s=>s.schemeCode===scheme.schemeCode);
    return <tr key={scheme.schemeCode} className={selectedCode===scheme.schemeCode?'selected-row':''}>
      <td><button className="fund-link" aria-pressed={previewFund?selectedCode===scheme.schemeCode:undefined} aria-label={`${previewFund?'Preview':'Open'} ${shortName(scheme.schemeName)}`} onClick={()=>previewFund?previewFund(scheme):openFund(scheme)}><span className={`fund-avatar tone-${scheme.schemeCode%5}`}>{fundInitials(shortName(scheme.schemeName))}</span><span><strong>{shortName(scheme.schemeName)}</strong><small>{planLabel(scheme.schemeName)}<span className="dot-sep">·</span>{fund?categoryLabel(fund):`Scheme ${scheme.schemeCode}`}</small></span></button></td>
      <td className="numeric nav-cell">{latest?<><strong>{currency(latest.nav)}</strong><small>{dateLabel(latest.date,true)}</small></>:errors[scheme.schemeCode]?<button className="retry-inline" title={errors[scheme.schemeCode]} onClick={()=>void ensureFund(scheme.schemeCode,true)}><RefreshCw size={12}/> Retry</button>:<span className="skeleton"/>}</td>
      {[1,3,5].map(year=>{const value=getReturn(scheme,year);return <td key={year} className={`numeric return-cell ${value!=null?(value<0?'negative':'positive'):''}`}>{fund?percent(value):errors[scheme.schemeCode]?'—':<span className="skeleton short"/>}</td>;})}
      <td><div className="table-actions"><button className={`icon-button ${saved?'active':''}`} aria-pressed={saved} onClick={()=>toggleWatch(scheme)} aria-label={`${saved?'Remove':'Save'} ${shortName(scheme.schemeName)} ${saved?'from':'to'} watchlist`} title={saved?'Remove from watchlist':'Save to watchlist'}><Bookmark size={17} fill={saved?'currentColor':'none'}/></button><button className={`compare-toggle ${added?'active':''}`} aria-pressed={added} onClick={()=>toggleCompare(scheme)} aria-label={`${added?'Remove':'Add'} ${shortName(scheme.schemeName)} ${added?'from':'to'} comparison`} title={added?'Remove from comparison':'Add to comparison'}>{added?<Check size={14}/>:<Plus size={15}/>}</button><button className="preview-trigger icon-button" onClick={()=>openFund(scheme)} aria-label={`Open full analysis for ${shortName(scheme.schemeName)}`} title="Open full analysis"><ArrowUpRight size={16}/></button></div></td>
    </tr>;
  })}</tbody></table>{!schemes.length&&<div className="empty-state">No funds to display.</div>}{schemes.length>0&&!schemes.some(s=>funds[s.schemeCode]||errors[s.schemeCode])&&<span className="sr-only" role="status">Loading NAV data</span>}</div>;
}
