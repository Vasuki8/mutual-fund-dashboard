import { useEffect, useMemo, useState } from 'react';
import { Search, ArrowRight, ArrowUpRight, GitCompareArrows, ShieldCheck, ChartNoAxesCombined, X, Loader2, Bookmark, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { Scheme } from '../lib/types.ts';
import { searchSchemes } from '../lib/api.ts';
import { isGrowthScheme } from '../lib/analytics.ts';
import { loadSharedReturnIndex, loadSharedDirectory, loadSharedCategoryIndex } from '../lib/shared-archive.ts';
import { categoryOptions, inCategory, pageFor, PAGE_SIZES, type CategoryLookup, type PageSize } from '../lib/fund-directory.ts';
import { localFundReturns, sortFundSchemes, type FundReturnLookup, type FundSort, type FundSortKey } from '../lib/fund-sort.ts';
import { STARTER_FUNDS } from '../lib/catalog.ts';
import { FundTable } from './FundTable.tsx';
import type { FundTableProps } from './FundTable.tsx';

interface Props extends Omit<FundTableProps,'schemes'|'sort'|'onSort'|'returnsByScheme'|'canSortReturns'|'canSortDrawdown'|'categoryByScheme'> { savedOnly?:boolean; initialQuery?:string; openCompare:()=>void; openResearch:(scheme:Scheme,tab:string)=>void; browse:()=>void }
export function Home(props:Props) {
  const [query,setQuery]=useState(props.initialQuery??'');
  const [results,setResults]=useState<Scheme[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [directOnly,setDirectOnly]=useState(!props.savedOnly);
  const [page,setPage]=useState(0);
  const [pageSize,setPageSize]=useState<PageSize>(20);
  const [category,setCategory]=useState('all');
  const [directory,setDirectory]=useState<Scheme[] | null>(null);
  const [directoryState,setDirectoryState]=useState<'loading'|'ready'|'unavailable'>('loading');
  const [categoriesByScheme,setCategoriesByScheme]=useState<CategoryLookup | null>(null);
  const [categoryState,setCategoryState]=useState<'loading'|'ready'|'unavailable'>('loading');
  useEffect(()=>{let cancelled=false;
    loadSharedDirectory().then(value=>{if(!cancelled){setDirectory(value);setDirectoryState(value?'ready':'unavailable');}})
      .catch(()=>{if(!cancelled){setDirectory(null);setDirectoryState('unavailable');}});
    loadSharedCategoryIndex().then(value=>{if(!cancelled){setCategoriesByScheme(value);setCategoryState(value?'ready':'unavailable');}})
      .catch(()=>{if(!cancelled){setCategoriesByScheme(null);setCategoryState('unavailable');}});
    return()=>{cancelled=true;};
  },[]);
  const [attempt,setAttempt]=useState(0);
  const [sort,setSort]=useState<FundSort>({key:'name',desc:false});
  const [archiveReturns,setArchiveReturns]=useState<FundReturnLookup | null>(null);
  const [returnIndexState,setReturnIndexState]=useState<'loading'|'ready'|'unavailable'>('loading');
  useEffect(()=>{let cancelled=false;
    loadSharedReturnIndex().then(result=>{if(!cancelled){setArchiveReturns(result);setReturnIndexState(result?'ready':'unavailable');}})
      .catch(()=>{if(!cancelled){setArchiveReturns(null);setReturnIndexState('unavailable');}});
    return()=>{cancelled=true;};
  },[]);
  useEffect(()=>{setQuery(props.initialQuery??'');},[props.initialQuery]);
  useEffect(()=>{
    setPage(0);setError('');let cancelled=false;
    if(props.savedOnly||!query.trim()){setBusy(false);setResults([]);return;}
    setBusy(true);
    const timer=setTimeout(()=>{searchSchemes(query.trim()).then(data=>{if(!cancelled)setResults(data);}).catch(e=>{if(!cancelled){setError(e instanceof Error?e.message:'Search is unavailable. Please retry.');setResults([]);}}).finally(()=>{if(!cancelled)setBusy(false);});},350);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[query,props.savedOnly,attempt]);
  const categoryMap=categoriesByScheme??{};
  const choices=useMemo(()=>categoryOptions(categoryMap),[categoriesByScheme]);
  const directoryBusy=!props.savedOnly&&!query.trim()&&directoryState==='loading';
  const directoryFunds=directory??STARTER_FUNDS;
  const hasUnclassified=directoryFunds.some(scheme=>categoryMap[scheme.schemeCode]===undefined);
  const list=useMemo(()=>{
    const base=props.savedOnly?props.watchlist:query.trim()?results:directoryFunds;
    const term=query.trim().toLowerCase();
    return base.filter(s=>(!props.savedOnly||!term||s.schemeName.toLowerCase().includes(term)||String(s.schemeCode).includes(term))
      &&(!directOnly||(/direct/i.test(s.schemeName)&&isGrowthScheme(s.schemeName)))
      &&inCategory(s.schemeCode,category,categoryMap));
  },[props.savedOnly,props.watchlist,query,results,directOnly,directory,category,categoriesByScheme]);
  const returnsByScheme=useMemo<FundReturnLookup>(()=>{
    if(archiveReturns)return archiveReturns;
    return Object.fromEntries(Object.values(props.funds).map(fund=>[fund.meta.schemeCode,localFundReturns(fund)]));
  },[archiveReturns,props.funds]);
  // Without a verified snapshot, sorting by return requires all matching
  // histories to have loaded. Never imply a page-local rank is global.
  const canSortReturns=archiveReturns!==null || list.every(s=>Boolean(props.funds[s.schemeCode]||props.errors[s.schemeCode]));
  // An older published v1 index does not contain downside data. A page-only
  // sort would be misleading, so disable that heading until the v2 index is live.
  const canSortDrawdown=archiveReturns!==null
    ? Object.values(archiveReturns).some(row=>Object.prototype.hasOwnProperty.call(row,'threeYearMaxDrawdown'))
    : canSortReturns;
  const activeSort=(sort.key==='dd3'?canSortDrawdown:sort.key==='name'||canSortReturns)
    ? sort:{key:'name',desc:false} as FundSort;
  const ordered=useMemo(()=>sortFundSchemes(list,activeSort,returnsByScheme),[list,activeSort.key,activeSort.desc,returnsByScheme]);
  const paging=pageFor(ordered.length,page,pageSize);
  const currentPage=paging.page;
  const visible=useMemo(()=>ordered.slice(paging.start,paging.end),[ordered,paging.start,paging.end]);
  const onSort=(key:FundSortKey)=>{if((key==='dd3'&&!canSortDrawdown)||(key!=='name'&&!canSortReturns))return;
    setSort(current=>({key,desc:current.key===key?!current.desc:key!=='name'}));setPage(0);};
  const researchFund=(!busy&&!error?visible[0]:undefined)??STARTER_FUNDS[0];
  const resetFilters=()=>{setQuery('');setDirectOnly(!props.savedOnly);setCategory('all');setPage(0);};
  return <>
    <section className="page-heading compact"><div><div className="eyebrow">MUTUAL FUND RESEARCH</div><h1>{props.savedOnly?'Your watchlist':'Explore funds'}</h1><p>{props.savedOnly?'Saved funds, performance, and risk in one workspace.':'Find a fund. Inspect its history. Build your comparison.'}</p></div><button className="button secondary small" onClick={props.openCompare}><GitCompareArrows size={15}/>Compare funds</button></section>
    <section className="panel explorer-toolbar" aria-label="Fund filters"><div className="search-box"><Search size={17}/><input type="search" value={query} maxLength={200} onChange={e=>setQuery(e.target.value)} placeholder={props.savedOnly?'Filter your saved funds':'Filter by fund name, fund house or scheme code'} aria-label={props.savedOnly?'Filter saved funds':'Filter mutual funds'} autoComplete="off"/>{query&&<button className="icon-button" onClick={()=>setQuery('')} aria-label="Clear fund filter"><X size={16}/></button>}{busy&&!props.savedOnly&&<Loader2 className="spin" size={16}/>}</div><label className="toggle-label"><input type="checkbox" checked={directOnly} onChange={e=>{setDirectOnly(e.target.checked);setPage(0);}}/><span className="toggle-track"/>Direct · Growth only</label>
      <label className="explorer-category">Category <select aria-label="Fund category" value={category}
        disabled={categoryState!=='ready'} onChange={e=>{setCategory(e.target.value);setPage(0);}}>
        <option value="all">All categories</option>
        {choices.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
        {hasUnclassified&&<option value="unclassified">Category not yet available</option>}
      </select></label></section>
    {!props.savedOnly&&<div className="search-suggestions"><span>Browse</span>{[['Flexi cap','Flexi cap'],['Large cap','Large cap'],['Small cap','Small cap'],['Index','Index funds'],['Liquid','Liquid funds']].map(([term,label])=><button key={term} className={query===term?'selected':''} aria-pressed={query===term} onClick={()=>setQuery(query===term?'':term)}>{label}<ArrowUpRight size={11}/></button>)}</div>}
    {categoryState==='unavailable'&&<p className="quiet-note" role="status">Category filtering is unavailable until the next verified archive publication.</p>}
    <section className="fund-list-section">
      <div className="section-heading"><div><h2>{props.savedOnly?'Saved funds':query.trim()?'Search results':directory?'All funds':'Starter collection'}<span className="count-badge" aria-live="polite">{busy?'…':list.length}</span></h2><p>{props.savedOnly?'Stored in this browser. Export a backup from Data & backups.':query.trim()?`Matching “${query}” · Select a fund for full analysis`:directory?'Browse the published MFAPI catalogue. Categories are sourced from saved histories, not guessed from names.':'Showing starter examples while the full catalogue is unavailable.'}</p></div></div>
      <div className="panel table-panel">
        {directoryBusy?<div className="search-loading" role="status"><Loader2 className="spin" size={24}/><h3>Loading the complete fund directory</h3><p>Reading the verified scheme catalogue…</p></div>:busy&&!props.savedOnly?<div className="search-loading" role="status"><Loader2 className="spin" size={24}/><h3>Finding your funds</h3><p>Searching MFAPI’s scheme directory…</p></div>:error&&!props.savedOnly?<div className="empty-state" role="status"><h3>Search is temporarily unavailable</h3><p>{error}</p><button className="button secondary" onClick={()=>setAttempt(value=>value+1)}>Retry search</button></div>:!list.length?<div className="empty-state"><span className="empty-icon">{props.savedOnly?<Bookmark size={24}/>:<Search size={24}/>}</span><h3>{props.savedOnly&&props.watchlist.length===0?'No saved funds yet':'No funds match these filters'}</h3><p>{props.savedOnly&&props.watchlist.length===0?'Save a fund from the explorer to keep it here.':'Try a shorter name, a scheme code, or include all plan types.'}</p>{props.savedOnly&&props.watchlist.length===0?<button className="button primary" onClick={props.browse}>Explore funds <ArrowRight size={15}/></button>:<button className="button secondary" onClick={resetFilters}>Reset filters</button>}</div>:<FundTable {...props} schemes={visible} sort={activeSort} onSort={onSort} returnsByScheme={returnsByScheme} canSortReturns={canSortReturns} canSortDrawdown={canSortDrawdown} categoryByScheme={categoryMap}/>}
        {!!list.length&&!busy&&!directoryBusy&&<div className="table-bottom">
          <span>1Y: absolute · 3Y / 5Y: annualized · 3Y max DD: largest observed decline
            {archiveReturns?' · Verified archive rankings':' · Global return sorting requires complete data'}
            {returnIndexState==='loading'?' · Loading return index…':''}
          </span>
          <div className="pagination-controls">
            <label>Funds per page <select aria-label="Funds per page" value={pageSize}
              onChange={e=>{setPageSize(Number(e.target.value) as PageSize);setPage(0);}}>
              {PAGE_SIZES.map(value=><option key={value} value={value}>{value}</option>)}
            </select></label>
            <span role="status">Showing {paging.start+1}–{paging.end} of {list.length.toLocaleString('en-IN')}</span>
            {paging.pages>1&&<nav className="pagination" aria-label="Fund pages">
              <button className="icon-button" disabled={currentPage===0} onClick={()=>setPage(0)} aria-label="First page"><ChevronsLeft size={15}/></button>
              <button className="icon-button" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)} aria-label="Previous page"><ChevronLeft size={15}/></button>
              <label>Page <input type="number" aria-label="Go to page" min={1} max={paging.pages} value={currentPage+1}
                onChange={e=>{const value=Number(e.target.value);if(Number.isSafeInteger(value)&&value>=1&&value<=paging.pages)setPage(value-1);}}/>
                of {paging.pages.toLocaleString('en-IN')}</label>
              <button className="icon-button" disabled={currentPage+1>=paging.pages} onClick={()=>setPage(currentPage+1)} aria-label="Next page"><ChevronRight size={15}/></button>
              <button className="icon-button" disabled={currentPage+1>=paging.pages} onClick={()=>setPage(paging.pages-1)} aria-label="Last page"><ChevronsRight size={15}/></button>
            </nav>}
          </div>
        </div>}
      </div>
      {!props.savedOnly&&<section className="research-section"><div className="section-heading"><div><h2>Research tools</h2><p>Explore the outcomes behind the latest return.</p></div></div><div className="research-grid">
        <button className="research-card" onClick={props.openCompare}><span className="research-icon"><GitCompareArrows size={19}/></span><span className="research-card-body"><strong>Compare funds</strong><span>Aligned dates and a shared starting amount.</span></span><ArrowUpRight size={16}/></button>
        <button className="research-card" onClick={()=>props.openResearch(researchFund,'risk')}><span className="research-icon"><ShieldCheck size={19}/></span><span className="research-card-body"><strong>Risk & drawdown</strong><span>Volatility and the difficult periods.</span></span><ArrowUpRight size={16}/></button>
        <button className="research-card" onClick={()=>props.openResearch(researchFund,'holding')}><span className="research-icon"><ChartNoAxesCombined size={19}/></span><span className="research-card-body"><strong>Holding periods</strong><span>Consistency across historical windows.</span></span><ArrowUpRight size={16}/></button>
      </div></section>}
    </section>
    <div className="quiet-note"><span className="status-dot"/>NAV histories supplied by MFAPI. Missing observations are never treated as zero.</div>
  </>;
}
