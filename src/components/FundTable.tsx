import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUpRight, Bookmark, Check, Plus, Loader2, RefreshCw } from 'lucide-react';
import type { FundData, Scheme } from '../lib/types.ts';
import { trailingReturn, isGrowthScheme } from '../lib/analytics.ts';
import { currency, percent, shortName, planLabel, categoryLabel, fundInitials, dateLabel, qualityBlocked } from '../lib/format.ts';

export interface FundTableProps {
  schemes: Scheme[]; funds: Record<number,FundData>; errors:Record<number,string>;
  ensureFund:(code:number,force?:boolean)=>Promise<void>; openFund:(scheme:Scheme)=>void;
  watchlist:Scheme[]; compared:Scheme[]; toggleWatch:(scheme:Scheme)=>void; toggleCompare:(scheme:Scheme)=>void;
}
export function FundTable({schemes,funds,errors,ensureFund,openFund,watchlist,compared,toggleWatch,toggleCompare}:FundTableProps) {
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
  return <div className="table-scroll"><table className="fund-table"><thead><tr>
    <th className="fund-name-column"><button onClick={()=>sortBy('name')}>Fund name {sort.key==='name'&&<ArrowDown size={12} className={sort.desc?'':'rotate'}/>}</button></th>
    <th className="numeric">NAV</th>
    <th className="numeric"><button onClick={()=>sortBy('1')}>1Y return {sort.key==='1'&&<ArrowDown size={12}/>}</button></th>
    <th className="numeric"><button onClick={()=>sortBy('3')}>3Y CAGR {sort.key==='3'&&<ArrowDown size={12}/>}</button></th>
    <th className="numeric"><button onClick={()=>sortBy('5')}>5Y CAGR {sort.key==='5'&&<ArrowDown size={12}/>}</button></th>
    <th className="actions-head">Save / compare</th>
  </tr></thead><tbody>{ordered.map((scheme)=>{
    const fund=funds[scheme.schemeCode];const latest=fund?.points.at(-1);const saved=watchlist.some(s=>s.schemeCode===scheme.schemeCode);const added=compared.some(s=>s.schemeCode===scheme.schemeCode);
    return <tr key={scheme.schemeCode}>
      <td><button className="fund-link" onClick={()=>openFund(scheme)}><span className={`fund-avatar tone-${scheme.schemeCode%5}`}>{fundInitials(shortName(scheme.schemeName))}</span><span><strong>{shortName(scheme.schemeName)}<ArrowUpRight size={13}/></strong><small>{planLabel(scheme.schemeName)}<span className="dot-sep">·</span>{fund?categoryLabel(fund):`Scheme ${scheme.schemeCode}`}</small></span></button></td>
      <td className="numeric nav-cell">{latest?<><strong>{currency(latest.nav)}</strong><small>{dateLabel(latest.date,true)}</small></>:errors[scheme.schemeCode]?<button className="retry-inline" title={errors[scheme.schemeCode]} onClick={()=>void ensureFund(scheme.schemeCode,true)}><RefreshCw size={12}/> Retry</button>:<span className="skeleton"/>}</td>
      {[1,3,5].map(year=>{const value=getReturn(scheme,year);return <td key={year} className={`numeric return-cell ${value!=null?(value<0?'negative':'positive'):''}`}>{fund?percent(value):errors[scheme.schemeCode]?'—':<span className="skeleton short"/>}</td>;})}
      <td><div className="table-actions"><button className={`icon-button ${saved?'active':''}`} onClick={()=>toggleWatch(scheme)} aria-label={`${saved?'Remove':'Save'} ${shortName(scheme.schemeName)} ${saved?'from':'to'} watchlist`} title={saved?'Remove from watchlist':'Save to watchlist'}><Bookmark size={17} fill={saved?'currentColor':'none'}/></button><button className={`compare-toggle ${added?'active':''}`} onClick={()=>toggleCompare(scheme)} aria-label={`${added?'Remove':'Add'} ${shortName(scheme.schemeName)} ${added?'from':'to'} comparison`} title={added?'Remove from comparison':'Add to comparison'}>{added?<Check size={14}/>:<Plus size={15}/>}</button></div></td>
    </tr>;
  })}</tbody></table>{!schemes.length&&<div className="empty-state">No funds to display.</div>}{schemes.length>0&&!schemes.some(s=>funds[s.schemeCode]||errors[s.schemeCode])&&<span className="sr-only" role="status"><Loader2/>Loading NAV data</span>}</div>;
}
