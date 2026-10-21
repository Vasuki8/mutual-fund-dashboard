import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Bookmark, Check, CircleHelp, Database, GitCompareArrows, Search, X } from 'lucide-react';
import type { FundData, ResearchSettings, Scheme } from './lib/types.ts';
import { getFund } from './lib/api.ts';
import { getSettings, getStorageGeneration, saveSettings, storageWarning } from './lib/storage.ts';
import { BRAND } from './lib/catalog.ts';
import { shortName } from './lib/format.ts';
import { Home } from './components/Home.tsx';
import { FundDetail } from './components/FundDetail.tsx';
import { Comparison } from './components/Comparison.tsx';
import { Methodology } from './components/Methodology.tsx';
import { DataStatus, useDataStatus } from './components/DataStatus.tsx';

interface Route { page:string; code?:number; tab?:string; query?:string }
function readRoute():Route {
  const [path,query='']=window.location.hash.slice(1).split('?');const parts=path.split('/');const params=new URLSearchParams(query);
  if(parts[0]==='fund'&&/^\d+$/.test(parts[1]??'')) return {page:'fund',code:Number(parts[1]),tab:['overview','risk','holding','monthly'].includes(params.get('tab')??'')?params.get('tab')!:'overview'};
  return {page:['compare','watchlist','methodology','data'].includes(parts[0])?parts[0]:'explore',query:params.get('q')??undefined};
}
export default function App() {
  const dataStatus = useDataStatus();
  const [route,setRoute]=useState<Route>(readRoute);const [settings,setSettings]=useState<ResearchSettings>(getSettings);const [funds,setFunds]=useState<Record<number,FundData>>({});const [errors,setErrors]=useState<Record<number,string>>({});const [loading,setLoading]=useState<number[]>([]);const [toast,setToast]=useState('');const [online,setOnline]=useState(navigator.onLine);const [mobileNav,setMobileNav]=useState(false);
  const loaded=useRef<Record<number,FundData>>({});const inFlight=useRef(new Map<number,{generation:number;task:Promise<void>}>());const failed=useRef(new Set<number>());const toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);const settingsRef=useRef(settings);
  const notify=useCallback((message:string)=>{setToast(message);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),5500);},[]);
  const navigate=useCallback((hash:string)=>{if(window.location.hash===`#${hash}`)setRoute(readRoute());else window.location.hash=hash;setMobileNav(false);window.scrollTo({top:0,behavior:'instant'});},[]);
  useEffect(()=>{const handle=()=>setRoute(readRoute());window.addEventListener('hashchange',handle);const offline=()=>setOnline(navigator.onLine);window.addEventListener('online',offline);window.addEventListener('offline',offline);return()=>{window.removeEventListener('hashchange',handle);window.removeEventListener('online',offline);window.removeEventListener('offline',offline);};},[]);
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
  const restore=(value:ResearchSettings)=>{settingsRef.current=value;loaded.current={};failed.current.clear();inFlight.current.clear();setLoading([]);setFunds({});setErrors({});setSettings(value);};
  const browse=()=>navigate('explore');
  const tableProps={funds,errors,ensureFund,openFund,watchlist:settings.watchlist,compared:settings.compared,toggleWatch,toggleCompare};
  return <div className="app-shell"><a className="skip-link" href="#main-content" onClick={event=>{event.preventDefault();document.getElementById('main-content')?.focus();document.getElementById('main-content')?.scrollIntoView();}}>Skip to main content</a><header className="site-header"><div className="header-inner"><button className="brand" onClick={browse} aria-label="FundScope home"><span className="brand-mark"><svg width="25" height="26" viewBox="0 0 25 26" aria-hidden="true"><path d="M4 21V8l8.5-5L21 8v13M8.5 19V10.5l4-2.4 4 2.4V19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span><span>{BRAND.name}<small>SEE THE FULL PICTURE</small></span></button>
    <nav className={mobileNav?'main-nav open':'main-nav'} aria-label="Main navigation"><button className={route.page==='explore'||route.page==='fund'?'active':''} onClick={browse}>Explore funds</button><button className={route.page==='compare'?'active':''} onClick={()=>navigate('compare')}>Compare{settings.compared.length>0&&<span className="nav-count">{settings.compared.length}</span>}</button><button className={route.page==='watchlist'?'active':''} onClick={()=>navigate('watchlist')}>Watchlist{settings.watchlist.length>0&&<span className="nav-count neutral">{settings.watchlist.length}</span>}</button></nav>
    <div className="header-tools"><button className={`icon-button ${route.page==='data'?'active':''}`} onClick={()=>navigate('data')} title="Your data and backups" aria-label="Your data and backups"><Database size={17}/></button><button className="methodology-button" onClick={()=>navigate('methodology')}><CircleHelp size={17}/><span>Methodology</span></button><span className="header-separator"/><span className="personal-avatar" title="Private research workspace">VP</span><button className="mobile-menu icon-button" aria-label="Toggle navigation" onClick={()=>setMobileNav(!mobileNav)}>{mobileNav?<X size={20}/>:<span>☰</span>}</button></div></div></header>
    {!online&&<div className="offline-banner">You’re offline. Available cached fund histories remain usable.</div>}
    {storageWarning()&&<div className="storage-banner" role="status"><span>{storageWarning()}</span><button onClick={()=>navigate('data')}>Back up your research <ArrowRight size={13}/></button></div>}
    <main id="main-content" className="main-content" tabIndex={-1}>
      {(route.page==='explore'||route.page==='watchlist')&&<Home key={route.page} {...tableProps} savedOnly={route.page==='watchlist'} initialQuery={route.query} openCompare={()=>navigate('compare')} openResearch={openFund} browse={browse}/>}
      {route.page==='fund'&&route.code&&<FundDetail key={route.code} code={route.code} fund={funds[route.code]} error={errors[route.code]} tab={route.tab??'overview'} setTab={tab=>navigate(`fund/${route.code}?tab=${tab}`)} back={browse} watchlist={settings.watchlist} compared={settings.compared} toggleWatch={toggleWatch} toggleCompare={toggleCompare} refresh={()=>void ensureFund(route.code!,true)} refreshing={loading.includes(route.code)} riskFreeRate={settings.riskFreeRate} setRiskFreeRate={rate=>updateSettings(old=>({...old,riskFreeRate:rate}))} openMethod={()=>navigate('methodology')}/>}
      {route.page==='compare'&&<Comparison schemes={settings.compared} funds={funds} errors={errors} ensureFund={ensureFund} toggleCompare={toggleCompare} browse={browse} openFund={openFund} riskFreeRate={settings.riskFreeRate}/>}
      {(route.page==='methodology'||route.page==='data')&&<Methodology tab={route.page} back={browse} settings={settings} restore={restore} notify={notify} dataStatus={dataStatus}/>}
    </main>
    <DataStatus state={dataStatus} compact onOpen={()=>navigate('data')}/>
    <footer className="site-footer"><div><span className="footer-brand">FundScope</span><span>A little more clarity. A better-informed perspective.</span></div><div><a href="https://www.mfapi.in/" target="_blank" rel="noreferrer">NAV data by MFAPI</a><span>•</span><button onClick={()=>navigate('methodology')}>Calculation notes</button><span>•</span><button onClick={()=>navigate('data')}>Data status & backups</button><span>•</span><a href="https://github.com/Vasuki8/mutual-fund-dashboard" target="_blank" rel="noreferrer">GitHub</a><span>•</span><span>Research, not investment advice</span></div></footer>
    {settings.compared.length>0&&route.page!=='compare'&&<div className="comparison-dock"><span className="dock-icon"><GitCompareArrows size={18}/></span><div><strong>{settings.compared.length} fund{settings.compared.length>1?'s':''} selected</strong><small>Compare up to 4 funds</small></div><div className="dock-funds">{settings.compared.map((s,i)=><span key={s.schemeCode} title={s.schemeName}>{i+1}<button aria-label={`Remove ${shortName(s.schemeName)} from comparison`} onClick={()=>toggleCompare(s)}><X size={10}/></button></span>)}</div><button className="button primary small" onClick={()=>navigate('compare')}>Compare funds <ArrowRight size={15}/></button><button className="icon-button" aria-label="Clear comparison" onClick={()=>updateSettings(old=>({...old,compared:[]}))}><X size={15}/></button></div>}
    {toast&&<div role="status" className="toast"><Check size={16}/><span>{toast}</span><button onClick={()=>setToast('')} aria-label="Dismiss notification"><X size={15}/></button></div>}
    <div className="sr-only"><Bookmark/><Search/></div>
  </div>;
}
