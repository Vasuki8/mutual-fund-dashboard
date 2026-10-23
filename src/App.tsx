import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { ArrowRight, Bookmark, Check, CircleHelp, Database, GitCompareArrows, Moon, Search, Sun, X } from 'lucide-react';
import type { FundData, ResearchSettings, Scheme } from './lib/types.ts';
import { MAX_FUND_NOTES, MAX_FUND_NOTE_LENGTH } from './lib/storage.ts';
import { getFund } from './lib/api.ts';
import { getSettings, getStorageGeneration, saveSettings, storageWarning } from './lib/storage.ts';
import { BRAND } from './lib/catalog.ts';
import { readAppearance, saveAppearance } from './lib/appearance.ts';
import { shortName } from './lib/format.ts';
import { Home } from './components/Home.tsx';
import { FundDetail } from './components/FundDetail.tsx';
import { Comparison } from './components/Comparison.tsx';
import { Methodology } from './components/Methodology.tsx';
import { DataStatus, useDataStatus } from './components/DataStatus.tsx';
import { GlobalSearch } from './components/GlobalSearch.tsx';

interface Route { page:string; code?:number; tab?:string; query?:string }
function readRoute():Route {
  const [path,query='']=window.location.hash.slice(1).split('?');const parts=path.split('/');const params=new URLSearchParams(query);
  if(parts[0]==='fund'&&/^\d+$/.test(parts[1]??'')) return {page:'fund',code:Number(parts[1]),tab:['overview','returns','risk','holding','portfolio','costs','monthly'].includes(params.get('tab')??'')?params.get('tab')!:'overview'};
  return {page:['compare','watchlist','methodology','data'].includes(parts[0])?parts[0]:'explore',query:params.get('q')??undefined};
}
export default function App() {
  const dataStatus = useDataStatus();
  const [route,setRoute]=useState<Route>(readRoute);const [settings,setSettings]=useState<ResearchSettings>(getSettings);const [funds,setFunds]=useState<Record<number,FundData>>({});const [errors,setErrors]=useState<Record<number,string>>({});const [loading,setLoading]=useState<number[]>([]);const [toast,setToast]=useState('');const [online,setOnline]=useState(navigator.onLine);const [appearance,setAppearance]=useState(readAppearance);
  const loaded=useRef<Record<number,FundData>>({});const inFlight=useRef(new Map<number,{generation:number;task:Promise<void>}>());const failed=useRef(new Set<number>());const toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);const settingsRef=useRef(settings);
  const notify=useCallback((message:string)=>{setToast(message);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),5500);},[]);
  const navigate=useCallback((hash:string)=>{if(window.location.hash===`#${hash}`)setRoute(readRoute());else window.location.hash=hash;window.scrollTo({top:0,behavior:'instant'});document.getElementById('main-content')?.focus({preventScroll:true});},[]);
  const navigateLink=(event:MouseEvent<HTMLAnchorElement>,hash:string)=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();navigate(hash);
  };
  useEffect(()=>{const handle=()=>{setRoute(readRoute());};window.addEventListener('hashchange',handle);const offline=()=>setOnline(navigator.onLine);window.addEventListener('online',offline);window.addEventListener('offline',offline);return()=>{window.removeEventListener('hashchange',handle);window.removeEventListener('online',offline);window.removeEventListener('offline',offline);};},[]);
  useEffect(()=>()=>{if(toastTimer.current)clearTimeout(toastTimer.current);},[]);
  useEffect(()=>{
    document.documentElement.dataset.appearance=appearance;
    document.documentElement.style.colorScheme=appearance;
    saveAppearance(appearance);
    window.dispatchEvent(new Event('fundscope:appearance'));
  },[appearance]);
  useEffect(()=>{
    const title=route.page==='fund'?(funds[route.code!]?shortName(funds[route.code!].meta.schemeName):`Scheme ${route.code}`):({explore:'Explore funds',watchlist:'Watchlist',compare:'Compare funds',data:'Data status',methodology:'Methodology'}[route.page]??'Research');
    document.title=`${title} · FundScope`;
  },[route.page,route.code,funds]);
  const updateSettings=useCallback((change:(old:ResearchSettings)=>ResearchSettings)=>{const next=change(settingsRef.current);saveSettings(next);settingsRef.current=next;setSettings(next);},[]);
  const ensureFund=useCallback((code:number,force=false):Promise<void>=>{
    const generation=getStorageGeneration();const pending=inFlight.current.get(code);
    if(pending?.generation===generation)return pending.task;
    if(!force&&(loaded.current[code]||failed.current.has(code)))return Promise.resolve();
    setLoading(old=>[...old.filter(c=>c!==code),code]);setErrors(old=>{const next={...old};delete next[code];return next;});
    const task=getFund(code,{force}).then(data=>{if(generation!==getStorageGeneration())return;loaded.current[code]=data;failed.current.delete(code);setFunds(old=>({...old,[code]:data}));}).catch(error=>{if(generation!==getStorageGeneration())return;failed.current.add(code);setErrors(old=>({...old,[code]:error instanceof Error?error.message:'Fund data is temporarily unavailable.'}));}).finally(()=>{if(inFlight.current.get(code)?.task!==task)return;inFlight.current.delete(code);setLoading(old=>old.filter(c=>c!==code));});
    inFlight.current.set(code,{generation,task});return task;
  },[]);
  useEffect(()=>{if(route.page==='fund'&&route.code)void ensureFund(route.code);},[route,ensureFund]);
  const openFund=useCallback((scheme:Scheme,tab='overview')=>{updateSettings(old=>({...old,lastFund:scheme}));navigate(`fund/${scheme.schemeCode}?tab=${tab}`);},[navigate,updateSettings]);
  const toggleWatch=useCallback((scheme:Scheme)=>{const exists=settings.watchlist.some(s=>s.schemeCode===scheme.schemeCode);if(!exists&&settings.watchlist.length>=100){notify('Your watchlist can hold up to 100 funds.');return;}updateSettings(old=>({...old,watchlist:exists?old.watchlist.filter(s=>s.schemeCode!==scheme.schemeCode):[...old.watchlist,scheme]}));notify(storageWarning()?'Watchlist updated. Storage needs attention; keep a backup.':exists?'Fund removed from your watchlist.':'Fund saved to your watchlist.');},[settings.watchlist,updateSettings,notify]);
  const toggleCompare=useCallback((scheme:Scheme)=>{const exists=settings.compared.some(s=>s.schemeCode===scheme.schemeCode);if(!exists&&settings.compared.length>=4){notify('Compare up to four funds. Remove one to add another.');return;}updateSettings(old=>({...old,compared:exists?old.compared.filter(s=>s.schemeCode!==scheme.schemeCode):[...old.compared,scheme]}));if(!exists)notify(`${shortName(scheme.schemeName)} added to comparison.`);},[settings.compared,updateSettings,notify]);
  const saveNote=useCallback((code:number, body:string, editingId?:string):boolean=>{
    const trimmed=body.trim();
    if(!trimmed||trimmed.length>MAX_FUND_NOTE_LENGTH){notify('Notes must contain 1–'+MAX_FUND_NOTE_LENGTH+' characters.');return false;}
    const now=new Date().toISOString();
    try {
      updateSettings(old=>{
        const current=old.fundNotes??[];
        if(editingId){
          const existing=current.find(note=>note.id===editingId&&note.schemeCode===code);
          if(!existing)throw new Error('The original note is no longer available.');
          return {...old,fundNotes:current.map(note=>note.id===editingId?{...note,body:trimmed,updatedAt:now}:note)};
        }
        if(current.length>=MAX_FUND_NOTES)throw new Error('Your browser workspace can store up to '+MAX_FUND_NOTES+' fund notes.');
        return {...old,fundNotes:[{id:crypto.randomUUID(),schemeCode:code,body:trimmed,createdAt:now,updatedAt:now},...current]};
      });
      notify(storageWarning()?'Note saved in this session. Export a backup before reloading.':editingId?'Research note updated.':'Research note saved in this browser.');
      return true;
    }catch(error){notify(error instanceof Error?error.message:'Research note could not be saved.');return false;}
  },[updateSettings,notify]);
  const removeNote=useCallback((code:number,id:string)=>{
    try{
      updateSettings(old=>({...old,fundNotes:(old.fundNotes??[]).filter(note=>!(note.id===id&&note.schemeCode===code))}));
      notify(storageWarning()?'Note removed for this session; back up your workspace.':'Research note removed.');
    }catch(error){notify(error instanceof Error?error.message:'Research note could not be removed.');}
  },[updateSettings,notify]);
  const restore=(value:ResearchSettings)=>{settingsRef.current=value;loaded.current={};failed.current.clear();inFlight.current.clear();setLoading([]);setFunds({});setErrors({});setSettings(value);};
  const browse=()=>navigate('explore');
  const tableProps={funds,errors,ensureFund,openFund,watchlist:settings.watchlist,compared:settings.compared,toggleWatch,toggleCompare};
  const navigationLink=(page:string,label:string,icon:ReactNode,count?:number)=>{
    const active=route.page===page||(page==='explore'&&route.page==='fund');
    return <a className={`atlas-nav-link ${active?'active':''}`} href={`#${page}`} aria-current={active?'page':undefined} onClick={event=>navigateLink(event,page)}>{icon}<span>{label}</span>{count!==undefined&&<span className="nav-count">{count}</span>}</a>;
  };
  return <div className={`app-shell atlas-ui ${settings.compared.length>0&&route.page!=='compare'?'has-comparison':''}`}>
    <a className="skip-link" href="#main-content" onClick={event=>{event.preventDefault();document.getElementById('main-content')?.focus();document.getElementById('main-content')?.scrollIntoView();}}>Skip to main content</a>
    <header className="app-header">
      <a className="brand" href="#explore" aria-label="FundScope home" onClick={event=>navigateLink(event,'explore')}><span className="brand-mark" aria-hidden="true"/><span>{BRAND.name}<small>/ fund research</small></span></a>
      <span className="header-disclosure">Indian mutual funds · End-of-day NAV</span>
      <GlobalSearch openFund={openFund}/>
      <div className="header-context"><span className={`status-dot ${online?'':'offline'}`}/><span>{online?'Browser online':'Offline cache'}</span></div>
      <button type="button" className="theme-switch icon-button" aria-label={`Switch to ${appearance==='light'?'dark':'light'} theme`} title={`Switch to ${appearance==='light'?'dark':'light'} theme`} onClick={()=>setAppearance(current=>current==='light'?'dark':'light')}>{appearance==='light'?<Moon size={17}/>:<Sun size={17}/>}</button>
    </header>
    <nav className="workspace-navigation" id="workspace-navigation" aria-label="Main navigation">
      {navigationLink('explore','Explore',<Search size={15}/>)}
      {navigationLink('compare','Compare',<GitCompareArrows size={15}/>,settings.compared.length)}
      {navigationLink('watchlist','Saved',<Bookmark size={15}/>,settings.watchlist.length)}
      {navigationLink('data','Data & backups',<Database size={15}/>)}
      {navigationLink('methodology','Methodology',<CircleHelp size={15}/>)}
    </nav>
    <div className="workspace-layout">
      <div className="workspace-body">
        {!online&&<div className="offline-banner" role="status">You’re offline. Available cached fund histories remain usable.</div>}
        {storageWarning()&&<div className="storage-banner" role="status"><span>{storageWarning()}</span><button onClick={()=>navigate('data')}>Back up your research <ArrowRight size={13}/></button></div>}
        <main id="main-content" className="main-content app-main" tabIndex={-1}>
      {(route.page==='explore'||route.page==='watchlist')&&<Home key={route.page} {...tableProps} savedOnly={route.page==='watchlist'} initialQuery={route.query} openCompare={()=>navigate('compare')} openResearch={openFund} browse={browse}/>}
      {route.page==='fund'&&route.code&&<FundDetail key={route.code} code={route.code} fund={funds[route.code]} error={errors[route.code]} tab={route.tab??'overview'} setTab={tab=>navigate(`fund/${route.code}?tab=${tab}`)} back={browse} watchlist={settings.watchlist} compared={settings.compared} toggleWatch={toggleWatch} toggleCompare={toggleCompare} refresh={()=>void ensureFund(route.code!,true)} refreshing={loading.includes(route.code)} riskFreeRate={settings.riskFreeRate} setRiskFreeRate={rate=>updateSettings(old=>({...old,riskFreeRate:rate}))} openMethod={()=>navigate('methodology')} fundNotes={settings.fundNotes??[]}
        onSaveNote={(body,id)=>saveNote(route.code!,body,id)} onRemoveNote={id=>removeNote(route.code!,id)}/>}
      {route.page==='compare'&&<Comparison schemes={settings.compared} funds={funds} errors={errors} ensureFund={ensureFund} toggleCompare={toggleCompare} browse={browse} openFund={openFund} riskFreeRate={settings.riskFreeRate}/>}
      {(route.page==='methodology'||route.page==='data')&&<Methodology tab={route.page} back={browse} settings={settings} restore={restore} notify={notify} dataStatus={dataStatus}/>}
        </main>
        <DataStatus state={dataStatus} compact onOpen={()=>navigate('data')}/>
        <footer className="site-footer"><span>FundScope · Independent research</span><div><a href="https://www.mfapi.in/" target="_blank" rel="noreferrer">NAV data by MFAPI</a><span>·</span><a href="#methodology" onClick={event=>navigateLink(event,'methodology')}>Calculation notes</a><span>·</span><span>Research, not investment advice</span></div></footer>
      </div>
    </div>
    {settings.compared.length>0&&route.page!=='compare'&&<section className="comparison-dock" aria-label="Fund comparison selection"><div className="dock-summary"><GitCompareArrows size={18}/><span><strong>{settings.compared.length} of 4 selected</strong><small>Same dates · Same starting amount</small></span></div><div className="comparison-chips">{settings.compared.map(s=><span className="comparison-chip" key={s.schemeCode}><span title={s.schemeName}>{shortName(s.schemeName)}</span><button aria-label={`Remove ${shortName(s.schemeName)} from comparison`} onClick={()=>toggleCompare(s)}><X size={13}/></button></span>)}</div><div className="comparison-dock-actions"><button className="button primary small" onClick={()=>navigate('compare')}>Compare <ArrowRight size={15}/></button><button className="icon-button" aria-label="Clear comparison" onClick={()=>updateSettings(old=>({...old,compared:[]}))}><X size={15}/></button></div></section>}
    {toast&&<div role="status" className="toast"><Check size={16}/><span>{toast}</span><button onClick={()=>setToast('')} aria-label="Dismiss notification"><X size={15}/></button></div>}
  </div>;
}
