import { useEffect, useMemo, useState } from 'react';
import { Search, ArrowRight, ArrowUpRight, GitCompareArrows, ShieldCheck, ChartNoAxesCombined, X, Loader2, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Scheme } from '../lib/types.ts';
import { searchSchemes } from '../lib/api.ts';
import { isGrowthScheme } from '../lib/analytics.ts';
import { STARTER_FUNDS } from '../lib/catalog.ts';
import { FundTable } from './FundTable.tsx';
import { FundPreview } from './FundPreview.tsx';
import type { FundTableProps } from './FundTable.tsx';

interface Props extends Omit<FundTableProps,'schemes'> { savedOnly?:boolean; initialQuery?:string; openCompare:()=>void; openResearch:(scheme:Scheme,tab:string)=>void; browse:()=>void }
export function Home(props:Props) {
  const [query,setQuery]=useState(props.initialQuery??'');
  const [results,setResults]=useState<Scheme[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [directOnly,setDirectOnly]=useState(!props.savedOnly);
  const [page,setPage]=useState(0);
  const [attempt,setAttempt]=useState(0);
  const [selectedCode,setSelectedCode]=useState<number>();
  useEffect(()=>{setQuery(props.initialQuery??'');},[props.initialQuery]);
  useEffect(()=>{
    setPage(0);setError('');let cancelled=false;
    if(props.savedOnly||!query.trim()){setBusy(false);setResults([]);return;}
    setBusy(true);
    const timer=setTimeout(()=>{searchSchemes(query.trim()).then(data=>{if(!cancelled)setResults(data);}).catch(e=>{if(!cancelled){setError(e instanceof Error?e.message:'Search is unavailable. Please retry.');setResults([]);}}).finally(()=>{if(!cancelled)setBusy(false);});},350);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[query,props.savedOnly,attempt]);
  const list=useMemo(()=>{
    const base=props.savedOnly?props.watchlist:query.trim()?results:STARTER_FUNDS;
    const term=query.trim().toLowerCase();
    return base.filter(s=>(!props.savedOnly||!term||s.schemeName.toLowerCase().includes(term)||String(s.schemeCode).includes(term))&&(!directOnly||(/direct/i.test(s.schemeName)&&isGrowthScheme(s.schemeName))));
  },[props.savedOnly,props.watchlist,query,results,directOnly]);
  const currentPage=Math.min(page,Math.max(0,Math.ceil(list.length/8)-1));
  const visible=useMemo(()=>list.slice(currentPage*8,currentPage*8+8),[list,currentPage]);
  const selected=(!busy&&!error||props.savedOnly)?visible.find(s=>s.schemeCode===selectedCode)??visible[0]:undefined;
  const resetFilters=()=>{setQuery('');setDirectOnly(!props.savedOnly);setPage(0);};
  return <>
    <section className="page-heading compact"><div><div className="eyebrow">MUTUAL FUND RESEARCH</div><h1>{props.savedOnly?'Your watchlist':'Explore funds'}</h1><p>{props.savedOnly?'Saved funds, performance, and risk in one workspace.':'Find a fund. Inspect its history. Build your comparison.'}</p></div><button className="button secondary small" onClick={props.openCompare}><GitCompareArrows size={15}/>Compare funds</button></section>
    <section className="panel explorer-toolbar" aria-label="Fund filters"><div className="search-box"><Search size={17}/><input type="search" value={query} maxLength={200} onChange={e=>setQuery(e.target.value)} placeholder={props.savedOnly?'Filter your saved funds':'Filter by fund name, fund house or scheme code'} aria-label={props.savedOnly?'Filter saved funds':'Filter mutual funds'} autoComplete="off"/>{query&&<button className="icon-button" onClick={()=>setQuery('')} aria-label="Clear fund filter"><X size={16}/></button>}{busy&&!props.savedOnly&&<Loader2 className="spin" size={16}/>}</div><label className="toggle-label"><input type="checkbox" checked={directOnly} onChange={e=>{setDirectOnly(e.target.checked);setPage(0);}}/><span className="toggle-track"/>Direct · Growth only</label></section>
    {!props.savedOnly&&<div className="search-suggestions"><span>Browse</span>{[['Flexi cap','Flexi cap'],['Large cap','Large cap'],['Small cap','Small cap'],['Index','Index funds'],['Liquid','Liquid funds']].map(([term,label])=><button key={term} className={query===term?'selected':''} aria-pressed={query===term} onClick={()=>setQuery(query===term?'':term)}>{label}<ArrowUpRight size={11}/></button>)}</div>}
    <div className="explorer-layout">
      <section className="fund-list-section">
        <div className="section-heading"><div><h2>{props.savedOnly?'Saved funds':query.trim()?'Search results':'Starter collection'}<span className="count-badge" aria-live="polite">{busy?'…':list.length}</span></h2><p>{props.savedOnly?'Stored in this browser. Export a backup from Data & backups.':query.trim()?`Matching “${query}” · Select a row to preview`:'A starting point for research. Not a ranking or recommendation.'}</p></div></div>
        <div className="panel table-panel">
          {busy&&!props.savedOnly?<div className="search-loading" role="status"><Loader2 className="spin" size={24}/><h3>Finding your funds</h3><p>Searching MFAPI’s scheme directory…</p></div>:error&&!props.savedOnly?<div className="empty-state" role="status"><h3>Search is temporarily unavailable</h3><p>{error}</p><button className="button secondary" onClick={()=>setAttempt(value=>value+1)}>Retry search</button></div>:!list.length?<div className="empty-state"><span className="empty-icon">{props.savedOnly?<Bookmark size={24}/>:<Search size={24}/>}</span><h3>{props.savedOnly&&props.watchlist.length===0?'No saved funds yet':'No funds match these filters'}</h3><p>{props.savedOnly&&props.watchlist.length===0?'Save a fund from the explorer to keep it here.':'Try a shorter name, a scheme code, or include all plan types.'}</p>{props.savedOnly&&props.watchlist.length===0?<button className="button primary" onClick={props.browse}>Explore funds <ArrowRight size={15}/></button>:<button className="button secondary" onClick={resetFilters}>Reset filters</button>}</div>:<FundTable {...props} schemes={visible} selectedCode={selected?.schemeCode} previewFund={scheme=>setSelectedCode(scheme.schemeCode)}/>}
          {!!list.length&&!busy&&<div className="table-bottom"><span>1Y: absolute · 3Y / 5Y: annualized{list.length>8?' · Sort applies to this page':''}</span>{list.length>8?<div className="pagination"><button className="icon-button" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)} aria-label="Previous page"><ChevronLeft size={15}/></button><span>{currentPage*8+1}–{Math.min((currentPage+1)*8,list.length)} of {list.length}</span><button className="icon-button" disabled={(currentPage+1)*8>=list.length} onClick={()=>setPage(currentPage+1)} aria-label="Next page"><ChevronRight size={15}/></button></div>:<span>End-of-day NAV</span>}</div>}
        </div>
        {!props.savedOnly&&<section className="research-section"><div className="section-heading"><div><h2>Research tools</h2><p>Explore the outcomes behind the latest return.</p></div></div><div className="research-grid">
          <button className="research-card" onClick={props.openCompare}><span className="research-icon"><GitCompareArrows size={19}/></span><span className="research-card-body"><strong>Compare funds</strong><span>Aligned dates and a shared starting amount.</span></span><ArrowUpRight size={16}/></button>
          <button className="research-card" onClick={()=>props.openResearch(selected??STARTER_FUNDS[0],'risk')}><span className="research-icon"><ShieldCheck size={19}/></span><span className="research-card-body"><strong>Risk & drawdown</strong><span>Volatility and the difficult periods.</span></span><ArrowUpRight size={16}/></button>
          <button className="research-card" onClick={()=>props.openResearch(selected??STARTER_FUNDS[0],'holding')}><span className="research-icon"><ChartNoAxesCombined size={19}/></span><span className="research-card-body"><strong>Holding periods</strong><span>Consistency across historical windows.</span></span><ArrowUpRight size={16}/></button>
        </div></section>}
      </section>
      <FundPreview scheme={selected} fund={selected?props.funds[selected.schemeCode]:undefined} error={selected?props.errors[selected.schemeCode]:undefined} saved={!!selected&&props.watchlist.some(s=>s.schemeCode===selected.schemeCode)} compared={!!selected&&props.compared.some(s=>s.schemeCode===selected.schemeCode)} openFund={props.openFund} toggleWatch={props.toggleWatch} toggleCompare={props.toggleCompare} retry={()=>{if(selected)void props.ensureFund(selected.schemeCode,true);}}/>
    </div>
    <div className="quiet-note"><span className="status-dot"/>NAV histories supplied by MFAPI. Missing observations are never treated as zero.</div>
  </>;
}
