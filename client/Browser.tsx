import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,RotateCw,Home,LockKeyhole,Plus,X,ArrowUpRight,ShieldCheck,Star,AlertTriangle,Globe} from 'lucide-react';
import {classify} from './destinations';
type Tab={id:string;history:string[];index:number;title:string};
type Page={url:string;title:string;html:string};
const baseCSS=`:host{display:block;height:100%;color:#202124;background:#fff;font:16px/1.6 Georgia,serif}.fp-document{padding:28px 36px;overflow-wrap:anywhere;min-height:100%;box-sizing:border-box}a{color:#5146b8}img{max-width:100%;height:auto}pre{white-space:pre-wrap;overflow-wrap:anywhere}table{max-width:100%}*{box-sizing:border-box}`;
function PublicDocument({html,onNavigate}:{html:string;onNavigate:(url:string)=>void}){
 const host=useRef<HTMLElement>(null);
 useEffect(()=>{
 const root=host.current!.shadowRoot || host.current!.attachShadow({mode:'open'});
 root.innerHTML=`<style>${baseCSS}</style>${html}`;
 const click=(e:Event)=>{const target=(e.target as Element).closest('a');if(!target)return;const href=target.getAttribute('href');if(!href)return;
 e.preventDefault();
 if(href.startsWith('#')){try{root.getElementById(decodeURIComponent(href.slice(1)))?.scrollIntoView({behavior:'auto'});}catch{/* invalid anchor */}return;}
 if(target.getAttribute('data-direct')==='true'){window.open(href,'_blank','noopener,noreferrer');return;}
 try{const u=new URL(href,location.origin).searchParams.get('url');if(u)onNavigate(u);}catch{/* sanitized content only */}
 };
 root.addEventListener('click',click);return()=>root.removeEventListener('click',click);
 },[html,onNavigate]);
 return <public-document ref={host}/>;
}
declare module 'react' {namespace JSX {interface IntrinsicElements {'public-document':React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>,HTMLElement>;}}}
export function Browser({url,onRoute,onHome,onVisited,onFavorite,isFavorite}:{url:string;onRoute:(url:string)=>void;onHome:()=>void;onVisited:(url:string,title:string)=>void;onFavorite:(url:string,title:string)=>void;isFavorite:boolean}){
 const [tabs,setTabs]=useState<Tab[]>(()=>[{id:crypto.randomUUID(),history:[url],index:0,title:'New page'}]);const [active,setActive]=useState(tabs[0].id);
 const tab=tabs.find(x=>x.id===active) || tabs[0];const current=tab.history[tab.index];
 const [address,setAddress]=useState(current);const [page,setPage]=useState<Page|null>(null);const [loading,setLoading]=useState(false);const [error,setError]=useState('');const [reload,setReload]=useState(0);
 const visitRef=useRef(onVisited);visitRef.current=onVisited;
 const navigate=(next:string)=>{
 try{const dest=classify(next);if(dest.mode!=='proxy'){window.open(dest.url,'_blank','noopener,noreferrer');setError(dest.mode==='search'?'Search results opened directly in a new tab.':'This interactive website opens directly in a new tab.');return;}
 setTabs(ts=>ts.map(t=>t.id===active?{...t,history:[...t.history.slice(0,t.index+1),dest.url],index:t.index+1}:t));onRoute(dest.url);
 }catch(e){setError((e as Error).message);}
 };
 useEffect(()=>{if(url!==current){setTabs(ts=>ts.map(t=>t.id===active?{...t,history:[...t.history.slice(0,t.index+1),url],index:t.index+1}:t));}},[url]);
 useEffect(()=>{
 const controller=new AbortController();setAddress(current);setPage(null);setError('');setLoading(true);
 let kind:ReturnType<typeof classify>;
 try{kind=classify(current);}catch(e){setError((e as Error).message);setLoading(false);return;}
 if(kind.mode!=='proxy'){setError('This website needs direct access for its interactive features.');setLoading(false);return;}
 fetch(`/api/browse?url=${encodeURIComponent(current)}`,{signal:controller.signal}).then(async res=>{
 const body=await res.json();if(!res.ok)throw new Error(body.error || 'The page could not be loaded.');if(controller.signal.aborted)return;
 setPage(body);setAddress(body.url);setTabs(ts=>ts.map(t=>t.id===tab.id?{...t,title:body.title,history:t.history.map((h,i)=>i===t.index?body.url:h)}:t));
 visitRef.current(body.url,body.title);
 }).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
 return()=>controller.abort();
 },[current,tab.id,reload]);
 const step=(offset:number)=>{const i=tab.index+offset;if(i<0 || i>=tab.history.length)return;setTabs(ts=>ts.map(t=>t.id===active?{...t,index:i}:t));onRoute(tab.history[i]);};
 const newTab=()=>{const next={id:crypto.randomUUID(),history:['https://example.com/'],index:0,title:'New page'};setTabs(ts=>[...ts,next]);setActive(next.id);onRoute(next.history[0]);};
 const closeTab=(id:string)=>{if(tabs.length===1){onHome();return;}const remaining=tabs.filter(t=>t.id!==id);setTabs(remaining);if(active===id){setActive(remaining[0].id);onRoute(remaining[0].history[remaining[0].index]);}};
 let safeDirect:string|undefined;try{const d=classify(current);if(d.mode!=='search')safeDirect=d.url;}catch{/* no direct fallback for unsafe schemes */}
 return <section className="browser" aria-label="Public page browser"><div className="browser-tabs" role="tablist" aria-label="Browser tabs">{tabs.map(t=><div className={`browser-tab ${t.id===active?'active':''}`} key={t.id}><button role="tab" aria-selected={t.id===active} onClick={()=>{setActive(t.id);onRoute(t.history[t.index]);}}><Globe size={13}/><span>{t.title}</span></button><button className="close-tab" aria-label={`Close ${t.title}`} onClick={()=>closeTab(t.id)}><X size={13}/></button></div>)}<button className="icon-button" aria-label="New tab" disabled={tabs.length>=8} onClick={newTab}><Plus size={17}/></button></div>
 <div className="browser-toolbar"><div className="browser-actions"><button className="icon-button" aria-label="Back" disabled={tab.index===0} onClick={()=>step(-1)}><ArrowLeft size={18}/></button><button className="icon-button" aria-label="Forward" disabled={tab.index===tab.history.length-1} onClick={()=>step(1)}><ArrowRight size={18}/></button><button className={`icon-button ${loading?'spinning':''}`} aria-label="Reload" onClick={()=>setReload(x=>x+1)}><RotateCw size={17}/></button><button className="icon-button" aria-label="Browser home" onClick={onHome}><Home size={17}/></button></div><form className="address-bar" onSubmit={e=>{e.preventDefault();navigate(address);}}><LockKeyhole size={14}/><input aria-label="Browser address" value={address} onChange={e=>setAddress(e.target.value)}/><button className="icon-button" aria-label="Navigate to address" type="submit"><ArrowRight size={15}/></button></form><button className="icon-button" aria-label="Favorite current page" onClick={()=>onFavorite(page?.url || current,page?.title || 'Public page')}><Star size={17} fill={isFavorite?'currentColor':'none'}/></button>{safeDirect&&<a className="icon-button browser-direct" aria-label="Open current page directly" href={safeDirect} target="_blank" rel="noopener noreferrer"><ArrowUpRight size={17}/></a>}</div>
 <div className="browser-notice"><ShieldCheck size={13}/><span>Public reading mode · Scripts and forms removed · No login or session forwarding</span></div>{loading&&<div className="loading-line" role="progressbar" aria-label="Loading public page"/>}
 <div className="browser-content">{error?<div className="browser-error"><span className="error-icon"><AlertTriangle size={28}/></span><div className="eyebrow">DIRECT ACCESS IS ALWAYS AN OPTION</div><h1>This page needs another route</h1><p role="alert">{error}</p><div className="error-actions"><button className="secondary-button" onClick={()=>setReload(x=>x+1)}><RotateCw size={16}/> Try again</button>{safeDirect&&<a className="primary-button" href={safeDirect} target="_blank" rel="noopener noreferrer">Open website directly <ArrowUpRight size={16}/></a>}</div><p className="form-note">Interactive apps, sign-in and streaming work best on the official website.</p></div>:page?<PublicDocument html={page.html} onNavigate={navigate}/>:<div className="loading-state"><Globe size={24}/><p>Connecting to the public page…</p></div>}</div></section>;
}
