'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, Check, ChevronUp, Menu, Moon, Music2, Pause, Play, Sparkles, Sun, Waves, X } from 'lucide-react';
import { content, music, routeFor, site, type Locale } from '../data/site';
import { Atmosphere } from './Atmosphere';
import { AccountNav } from './AccountPages';
import { OpeningScene } from './OpeningScene';
import { RouteScenery } from './RouteScenery';
import { ClickEffect } from './ClickEffect';
import { VerifiedGitHubLink } from './VerifiedGitHubLink';
import { Companion } from './Companion';

function readPreference(key:string) { try { return localStorage.getItem(key); } catch { return null; } }
function savePreference(key:string,value:string) { try { localStorage.setItem(key,value); } catch { /* Private browsing still gets a functioning page. */ } }
export function Shell({children}:{children:ReactNode}) {
 const pathname=usePathname(); const locale:Locale=pathname.startsWith('/zh')?'zh':'en'; const t=content[locale];
 const [dark,setDark]=useState(false),[motion,setMotion]=useState(true),[menu,setMenu]=useState(false);
 useEffect(()=>{setDark(readPreference('yuecheng-theme')==='dark');setMotion(readPreference('yuecheng-motion')!=='off');},[]);
 useEffect(()=>{document.documentElement.classList.toggle('dark',dark);},[dark]);
 useEffect(()=>{document.documentElement.dataset.motion=motion?'on':'off';},[motion]);
 useEffect(()=>{ document.documentElement.lang=locale==='zh'?'zh-CN':'en';setMenu(false); },[locale,pathname]);
 useEffect(()=>{if(!menu)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setMenu(false);};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[menu]);
 const links=[{key:'home' as const,path:'/'},{key:'projects' as const,path:'/projects/'},{key:'wall' as const,path:'/guestbook/'},{key:'contact' as const,path:'/contact/'}];
 const normalized=pathname.replace(/^\/zh(?=\/|$)/,'')||'/';
 return <>
  <OpeningScene/>
  <ClickEffect/>
  <div className="site-experience">
  <RouteScenery/>
  <a className="skip-link" href="#main">{t.skip}</a>
  <div className="ambient-paper" aria-hidden="true" />
  <Atmosphere />
  <header className="site-header"><div className="nav-inner">
   <Link href={routeFor(locale)} className="wordmark"><span className="wordmark-orbit">✦</span><span>{site.name}<span className="wordmark-dot">.</span></span><small>{t.tagline}</small></Link>
   <nav className={`main-nav ${menu?'is-open':''}`} aria-label={locale==='zh'?'主导航':'Main navigation'}>{links.map(({key,path})=><Link key={key} href={routeFor(locale,path)} onClick={()=>setMenu(false)} className={path==='/'?normalized==='/'?'active':'':normalized.startsWith(path)?'active':''} aria-current={(path==='/'?normalized==='/':normalized.startsWith(path))?'page':undefined}>{t.nav[key]}</Link>)}</nav>
   <div className="nav-tools"><AccountNav locale={locale}/><Link className="language-control" href={routeFor(locale==='en'?'zh':'en',pathname)} hrefLang={locale==='en'?'zh-CN':'en'}>{t.controls.language}</Link><span className="tool-divider" />
    <button className="icon-button" title={t.controls.motion} aria-label={t.controls.motion} aria-pressed={motion} onClick={()=>{savePreference('yuecheng-motion',motion?'off':'on');setMotion(!motion);}}><Sparkles size={17}/></button>
    <button className="icon-button" aria-label={t.controls.theme} title={t.controls.theme} onClick={()=>{savePreference('yuecheng-theme',dark?'light':'dark');setDark(!dark);}}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button>
    <button className="icon-button mobile-menu" aria-label={menu?t.controls.close:t.controls.menu} aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X size={20}/>:<Menu size={20}/>}</button>
   </div>
  </div></header>
  {children}
  <footer className="site-footer"><div className="footer-star">✦</div><p>{t.footer}</p><div className="footer-links"><Link href={routeFor(locale,'/projects/')}>{t.nav.projects}</Link><Link href={routeFor(locale,'/contact/')}>{t.nav.contact}</Link><Link href={routeFor(locale,'/guestbook/')}>{locale==='zh'?'留言墙':'Message wall'}</Link><VerifiedGitHubLink locale={locale}>GitHub <ArrowUpRight size={12}/></VerifiedGitHubLink></div><small>© {new Date().getFullYear()} {t.rights}</small></footer>
  <BackgroundMusic locale={locale}/>
  <Companion locale={locale}/>
  </div>
 </>;
}
export function BackgroundMusic({locale}:{locale:Locale}) {
 const t=content[locale].controls, track=music.tracks[0];
 const audio=useRef<HTMLAudioElement>(null), userPaused=useRef(false);
 const [playing,setPlaying]=useState(false),[hint,setHint]=useState(false),[blocked,setBlocked]=useState(false),[failed,setFailed]=useState(false);
 const requestPlayback=useCallback(async(reload=false)=>{
  const element=audio.current;if(!element)return;
  userPaused.current=false;
  if(reload||element.error)element.load();
  try{await element.play();setBlocked(false);}
  catch(error){
   if(userPaused.current)return;
   const name=error instanceof DOMException?error.name:'';
   if(name==='NotAllowedError')setBlocked(true);
   else if(name!=='AbortError')setFailed(true);
  }
 },[]);
 useEffect(()=>{
  if(audio.current)audio.current.volume=music.volume;
  // Every new visit starts enabled; a pause survives internal page changes.
  if(track&&music.autoPlay)void requestPlayback();
 },[track,requestPlayback]);
 useEffect(()=>{
  if(!blocked||!track||failed)return;
  const onInteraction=(event:Event)=>{
   if(userPaused.current)return;
   if(event.target instanceof Element&&event.target.closest('.music-widget'))return;
   if(event instanceof KeyboardEvent&&(event.metaKey||event.ctrlKey||event.altKey))return;
   void requestPlayback();
  };
  document.addEventListener('click',onInteraction);
  document.addEventListener('keydown',onInteraction);
  return()=>{document.removeEventListener('click',onInteraction);document.removeEventListener('keydown',onInteraction);};
 },[blocked,failed,track,requestPlayback]);
 const toggle=()=>{
  if(!track){setHint(!hint);return;}
  if(playing){userPaused.current=true;audio.current?.pause();}
  else void requestPlayback(failed);
 };
 return <div className={`music-widget ${playing?'is-playing':''}`}>
  {track&&<audio ref={audio} src={track.src} loop preload="metadata" onPlay={()=>{setPlaying(true);setFailed(false);setBlocked(false);}} onPause={()=>setPlaying(false)} onError={()=>{setFailed(true);setPlaying(false);}}/>}
  <button className="music-toggle" aria-label={track?(playing?t.pause:t.play):t.noMusic} onClick={toggle} aria-pressed={playing}><span className="mini-record">{track?(playing?<Pause size={15}/>:<Play size={15}/>):<Music2 size={16}/>}</span><span className="music-copy"><strong>{failed?t.audioError:track?.title||t.music}</strong><small>{failed?t.audioError:track?(blocked?t.blocked:track.artist):t.noMusic}</small></span>{playing?<span className="audio-bars"><i/><i/><i/></span>:<Waves size={17} className="music-wave"/>}</button>
  {hint&&!track&&<p className="music-hint" role="status">{t.noMusicHint}</p>}
 </div>;
}
export function CopyEmail({locale}:{locale:Locale}) {
 const [state,setState]=useState<'idle'|'ok'|'failed'>('idle');const t=content[locale].contact;const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 return <button className="copy-button" onClick={async()=>{try{await navigator.clipboard.writeText(site.email);setState('ok');}catch{setState('failed');}if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setState('idle'),3000);}}>{state==='ok'?<Check size={15}/>:null}<span role="status">{state==='ok'?t.copied:state==='failed'?t.copyFail:t.copy}</span></button>;
}
