import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ArrowRight, ArrowUpRight, GitCompareArrows, ShieldCheck, ChartNoAxesCombined, X, Loader2, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Scheme } from '../lib/types.ts';
import { searchSchemes } from '../lib/api.ts';
import { isGrowthScheme } from '../lib/analytics.ts';
import { STARTER_FUNDS } from '../lib/catalog.ts';
import { FundTable } from './FundTable.tsx';
import type { FundTableProps } from './FundTable.tsx';

interface Props extends Omit<FundTableProps,'schemes'> { savedOnly?:boolean; initialQuery?:string; openCompare:()=>void; openResearch:(scheme:Scheme,tab:string)=>void; browse:()=>void }
export function Home(props:Props) {
  const [query,setQuery]=useState(props.initialQuery??'');const [results,setResults]=useState<Scheme[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [directOnly,setDirectOnly]=useState(true);const [page,setPage]=useState(0);
  const search=useRef<HTMLInputElement>(null);
  useEffect(()=>{setQuery(props.initialQuery??'');},[props.initialQuery]);
  useEffect(()=>{
    const handler=(event:KeyboardEvent)=>{if((event.key==='/'||(event.key.toLowerCase()==='k'&&(event.metaKey||event.ctrlKey)))&&!(event.target instanceof HTMLInputElement)&&!(event.target instanceof HTMLTextAreaElement)){event.preventDefault();search.current?.focus();}};
    window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
  },[]);
  useEffect(()=>{
    setPage(0);setError('');let cancelled=false;
    if(props.savedOnly||!query.trim()){setBusy(false);setResults([]);return;}
    setBusy(true);
    const timer=setTimeout(()=>{searchSchemes(query.trim()).then(data=>{if(!cancelled)setResults(data);}).catch(e=>{if(!cancelled){setError(e instanceof Error?e.message:'Search is unavailable. Please retry.');setResults([]);}}).finally(()=>{if(!cancelled)setBusy(false);});},350);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[query,props.savedOnly]);
  const list=useMemo(()=>{
    const base=props.savedOnly?props.watchlist:query.trim()?results:STARTER_FUNDS;
    return base.filter(s=>(!props.savedOnly||!query||s.schemeName.toLowerCase().includes(query.toLowerCase())||String(s.schemeCode).includes(query))&&(!directOnly||(/direct/i.test(s.schemeName)&&isGrowthScheme(s.schemeName))));
  },[props.savedOnly,props.watchlist,query,results,directOnly]);
  const visible=useMemo(()=>list.slice(page*8,page*8+8),[list,page]);
  return <>
    <section className={`hero ${props.savedOnly?'compact-hero':''}`}>
      <div className="eyebrow"><span className="tiny-line"/>{props.savedOnly?'YOUR RESEARCH WORKSPACE':'INDIAN MUTUAL FUND RESEARCH'}</div>
      <h1>{props.savedOnly?'Keep your funds in focus.':<>A clearer view of<br/>your mutual funds<span className="green-period">.</span></>}</h1>
      <p>{props.savedOnly?'Your saved funds, with performance and risk a click away.':'Explore performance. Understand risk. Make your own informed decisions.'}</p>
      <div className="search-box"><Search size={21}/><input ref={search} value={query} onChange={e=>setQuery(e.target.value)} placeholder={props.savedOnly?'Search your saved funds':'Search a fund, fund house or scheme code'} aria-label="Search mutual funds" autoComplete="off"/>{query?<button className="icon-button" onClick={()=>setQuery('')} aria-label="Clear search"><X size={16}/></button>:<kbd>/</kbd>}{busy&&!props.savedOnly&&<Loader2 className="spin" size={17}/>}</div>
      {!props.savedOnly&&<div className="search-suggestions"><span>Explore</span>{['Flexi cap','Large cap','Small cap','Index funds','Liquid funds'].map((s,i)=><button key={s} className={query===(i===3?'Index':s)?'selected':''} onClick={()=>setQuery(i===3?'Index':s)}>{s}<ArrowUpRight size={11}/></button>)}</div>}
    </section>
    <section className="fund-list-section">
      <div className="section-heading"><div><h2>{props.savedOnly?'Your watchlist':query.trim()?'Search results':'A few funds to explore'}<span className="count-badge">{list.length}</span></h2><p>{props.savedOnly?'Saved on this browser. Use backup to keep a portable copy.':query.trim()?`Matching “${query}” · Select a fund to see the full analysis`:'A starting point for your research. Not a ranking or recommendation.'}</p></div><label className="toggle-label"><input type="checkbox" checked={directOnly} onChange={e=>{setDirectOnly(e.target.checked);setPage(0);}}/><span className="toggle-track"/>Direct · Growth only</label></div>
      <div className="panel table-panel">
        {busy&&!props.savedOnly?<div className="search-loading"><Loader2 className="spin" size={24}/><h3>Finding your funds</h3><p>Searching MFAPI’s scheme directory…</p></div>:error&&!props.savedOnly?<div className="empty-state"><h3>Search is temporarily unavailable</h3><p>{error}</p><button className="button secondary" onClick={()=>{const q=query;setQuery('');setTimeout(()=>setQuery(q),0);}}>Try again</button></div>:!list.length?<div className="empty-state"><span className="empty-icon">{props.savedOnly?<Bookmark size={24}/>:<Search size={24}/>}</span><h3>{props.savedOnly?'Your research starts with a saved fund':'No matching funds'}</h3><p>{props.savedOnly?'Use the bookmark beside any fund to add it here.':'Try a shorter fund name or a scheme code. You can also include all plan types.'}</p>{props.savedOnly&&<button className="button primary" onClick={props.browse}>Explore funds <ArrowRight size={15}/></button>}</div>:<FundTable {...props} schemes={visible}/>}
        {!!list.length&&!busy&&<div className="table-bottom"><span>End-of-day NAV · Returns calculated from MFAPI history</span>{list.length>8?<div className="pagination"><button className="icon-button" disabled={page===0} onClick={()=>setPage(p=>p-1)} aria-label="Previous page"><ChevronLeft size={15}/></button><span>{page*8+1}–{Math.min((page+1)*8,list.length)} of {list.length}</span><button className="icon-button" disabled={(page+1)*8>=list.length} onClick={()=>setPage(p=>p+1)} aria-label="Next page"><ChevronRight size={15}/></button></div>:<span>1Y: absolute · 3Y / 5Y: annualized</span>}</div>}
      </div>
    </section>
    {!props.savedOnly&&<section className="research-section"><div className="section-heading"><div><h2>Look beyond the latest return.</h2><p>Three ways to get a better understanding of a fund.</p></div></div><div className="research-grid">
      <button className="research-card" onClick={props.openCompare}><span className="research-icon"><GitCompareArrows size={22}/></span><span className="research-card-body"><strong>Compare funds</strong><span>The same dates. The same starting amount.<br/>See how the outcomes differ.</span></span><ArrowUpRight size={19}/></button>
      <button className="research-card" onClick={()=>props.openResearch(STARTER_FUNDS[0],'risk')}><span className="research-icon"><ShieldCheck size={22}/></span><span className="research-card-body"><strong>Understand the risk</strong><span>Explore volatility, drawdowns,<br/>and risk-adjusted returns.</span></span><ArrowUpRight size={19}/></button>
      <button className="research-card" onClick={()=>props.openResearch(STARTER_FUNDS[0],'holding')}><span className="research-icon"><ChartNoAxesCombined size={22}/></span><span className="research-card-body"><strong>See the consistency</strong><span>Find out how returns changed<br/>across different holding periods.</span></span><ArrowUpRight size={19}/></button>
    </div></section>}
    <div className="quiet-note"><span className="status-dot"/>Independent research. Transparent calculations. Your own perspective.</div>
  </>;
}
