'use client';
import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {usePathname} from 'next/navigation';
import {ArrowRight} from 'lucide-react';
import {OPENING_DURATION,parseOpeningScene,projectOpeningPoint,type OpeningScene as Scene} from '../lib/opening';

export function OpeningScene(){
 const pathname=usePathname();
 const [scene,setScene]=useState<Scene|null>(null),[ready,setReady]=useState(false);
 const [artSize,setArtSize]=useState({width:1536,height:1024});
 const [viewport,setViewport]=useState({width:0,height:0});
 const finishRef=useRef<()=>void>(()=>{});
 const playedThisDocument=useRef(false);
 useEffect(()=>{
  if(pathname!=='/'&&pathname!=='/zh/')return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const mayPlay=()=>{
   if(playedThisDocument.current||reduced.matches||document.documentElement.dataset.motion==='off')return false;
   try{if(localStorage.getItem('yuecheng-motion')==='off')return false;}catch{/* The in-document guard also works without browser storage. */}
   return true;
  };
  if(!mayPlay())return;
  let cancelled=false,watchdog:ReturnType<typeof setTimeout>|undefined,ending:ReturnType<typeof setTimeout>|undefined;
  const controller=new AbortController();
  let unlock:(()=>void)|undefined;
  const finish=()=>{
   cancelled=true;controller.abort();clearTimeout(watchdog);clearTimeout(ending);unlock?.();unlock=undefined;
   setScene(null);setReady(false);
  };
  finishRef.current=finish;
  const load=async()=>{
   try{
    // Do not hide the page until a real scene has been configured and decoded.
    watchdog=setTimeout(finish,10000);
    const response=await fetch('/opening/scene.json',{signal:controller.signal});
    if(!response.ok)return;
    const config=parseOpeningScene(await response.json());
    if(!config)return;
    const [,openFrame]=await Promise.all([config.closed,config.open,config.turned,config.half].map(src=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Opening image unavailable'));image.fetchPriority='high';image.src=src;})));
    if(cancelled||!mayPlay())return;
    clearTimeout(watchdog);
    playedThisDocument.current=true;
    const overflow=document.body.style.overflow;
    const content=document.querySelector<HTMLElement>('.site-experience');
    const previousInert=content?.inert;
    const focused=document.activeElement;
    document.body.style.overflow='hidden';if(content)content.inert=true;
    unlock=()=>{document.body.style.overflow=overflow;if(content)content.inert=previousInert??false;if(focused instanceof HTMLElement&&document.contains(focused))focused.focus({preventScroll:true});};
    setArtSize({width:openFrame.naturalWidth,height:openFrame.naturalHeight});
    setViewport({width:innerWidth,height:innerHeight});setScene(config);setReady(true);
    ending=setTimeout(finish,OPENING_DURATION);
   }catch{/* A failed or slow image never blocks the portfolio. */}
   finally{clearTimeout(watchdog);}
  };
  void load();
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')finish();};
  const onMotion=()=>{if(reduced.matches||document.documentElement.dataset.motion==='off')finish();};
  window.addEventListener('keydown',onKey);reduced.addEventListener('change',onMotion);
  const observer=new MutationObserver(onMotion);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});
  return()=>{finish();window.removeEventListener('keydown',onKey);reduced.removeEventListener('change',onMotion);observer.disconnect();};
 },[pathname]);
 useLayoutEffect(()=>{
  if(!scene)return;
  const update=()=>setViewport({width:innerWidth,height:innerHeight});
  update();window.addEventListener('resize',update);
  return()=>window.removeEventListener('resize',update);
 },[scene]);
 useEffect(()=>{if(scene)document.querySelector<HTMLButtonElement>('.opening-skip')?.focus({preventScroll:true});},[scene]);
 if(!scene)return null;
 const zh=pathname.startsWith('/zh');
 const eye=projectOpeningPoint({x:scene.eyeX,y:scene.eyeY},scene,artSize,viewport);
 const hair=projectOpeningPoint({x:60,y:57},scene,artSize,viewport);
 return <div className={`opening-scene ${ready?'opening-playing':''}`} role="dialog" aria-modal="true" aria-label={zh?'精灵开屏动画':'Elven opening animation'} style={{
  '--opening-duration':`${OPENING_DURATION}ms`,'--opening-focus-x':`${scene.focusX}%`,'--opening-focus-y':`${scene.focusY}%`,
  '--opening-eye-x':`${eye.x}px`,'--opening-eye-y':`${eye.y}px`,'--opening-iris-size':`${90*eye.scale}px`,
  '--opening-hair-x':`${hair.x}px`,'--opening-hair-y':`${hair.y}px`,
  '--opening-hair-width':`${artSize.width*eye.scale*.15}px`,'--opening-hair-height':`${artSize.height*eye.scale*.4}px`,
 } as CSSProperties}>
  <div className="opening-portrait" aria-hidden="true"><div className="opening-figure">
   <img className="opening-closed" src={scene.closed} alt=""/><img className="opening-turned" src={scene.turned} alt=""/><img className="opening-half-open" src={scene.half} alt=""/><img className="opening-open" src={scene.open} alt=""/>
   <div className="opening-hair-motion"><img className="opening-hair-closed" src={scene.closed} alt=""/><img className="opening-hair-open" src={scene.open} alt=""/></div>
   <div className="opening-moonlight"/>
  </div></div>
  <div className="opening-darkness" aria-hidden="true"/>
  <div className="opening-eye-light" aria-hidden="true"/>
  <div className="opening-dust" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{left:`${(i*23+9)%100}%`,top:`${(i*31+17)%100}%`,animationDelay:`${i*.13}s`}}/>)}</div>
  <div className="opening-dawn" aria-hidden="true"/>
  <div className="opening-brand"><span className="opening-brand-spark">✦</span><span>Yuecheng Wen</span><i/><small>wenyuecheng.cn</small></div>
  <div className="opening-title-block"><div className="opening-orbit" aria-hidden="true"><i/></div><p className="opening-owner">{zh?'Yuecheng Wen 的个人空间':'Yuecheng Wen’s personal space'}</p><div className="opening-site-title">wenyuecheng<span>.cn</span></div><p className="opening-welcome">{zh?'欢迎走进我的世界':'Welcome to my world'}</p><div className="opening-title-line" aria-hidden="true"><span/>✦<span/></div></div>
  <p className="opening-caption">{zh?'循着微光，走进我的世界。':'Follow the light into my world.'}</p>
  <button className="opening-skip" onClick={()=>finishRef.current()}>{zh?'跳过动画':'Skip intro'}<ArrowRight size={16}/></button>
 </div>;
}
