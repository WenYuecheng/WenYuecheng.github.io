'use client';
import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {usePathname} from 'next/navigation';
import {ArrowRight} from 'lucide-react';
import {OPENING_DURATION,parseOpeningScene,projectOpeningPoint,type OpeningScene as Scene} from '../lib/opening';

import {useIdentity} from './PrivateContent';
import {OpeningSound} from './EarlyAudio';
import {OpeningMist} from './OpeningMist';
export function OpeningScene(){
 const {name}=useIdentity();
 const pathname=usePathname();
 const [scene,setScene]=useState<Scene|null>(null),[ready,setReady]=useState(false);
 const [artSize,setArtSize]=useState({width:1536,height:1024});
 const [viewport,setViewport]=useState({width:0,height:0});
 const finishRef=useRef<()=>void>(()=>{});
 const playedThisDocument=useRef(false);
 const playbackStarted=useRef<()=>void>(()=>{});
 const videoRef=useRef<HTMLVideoElement>(null);
 useEffect(()=>{
  if(pathname!=='/'&&pathname!=='/zh/')return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const mayPlay=()=>{
   if(document.documentElement.dataset.opening!=='pending'||playedThisDocument.current||reduced.matches||document.documentElement.dataset.motion==='off')return false;
   try{if(localStorage.getItem('yuecheng-motion')==='off')return false;}catch{/* The in-document guard also works without browser storage. */}
   return true;
  };
  if(!mayPlay()){if(document.documentElement.dataset.opening==='pending')document.documentElement.dataset.opening='complete';return;}
  let cancelled=false,watchdog:ReturnType<typeof setTimeout>|undefined,ending:ReturnType<typeof setTimeout>|undefined;
  const controller=new AbortController();
  let unlock:(()=>void)|undefined;
  const finish=()=>{
   cancelled=true;controller.abort();clearTimeout(watchdog);clearTimeout(ending);unlock?.();unlock=undefined;
   document.documentElement.dataset.opening='complete';
   setScene(null);setReady(false);
  };
  finishRef.current=finish;
  const load=async()=>{
   try{
    // The first-paint gate stays up until the safe fallback poster is ready.
    watchdog=setTimeout(finish,10000);
    const response=await fetch('/opening/scene.json',{signal:controller.signal});
    if(!response.ok){finish();return;}
    const config=parseOpeningScene(await response.json());
    if(!config){finish();return;}
    const openFrame=await new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Opening image unavailable'));image.fetchPriority='high';image.src=config.image;});
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
    playbackStarted.current=()=>{clearTimeout(ending);ending=setTimeout(finish,OPENING_DURATION);};
    ending=setTimeout(finish,OPENING_DURATION+(config.video?9500:0));
   }catch{finish();/* A failed image releases the gate immediately. */}
   finally{clearTimeout(watchdog);}
  };
  void load();
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')finish();};
  const onMotion=()=>{if(reduced.matches||document.documentElement.dataset.motion==='off')finish();};
  document.addEventListener('opening:skip',finish);
  window.addEventListener('keydown',onKey);reduced.addEventListener('change',onMotion);
  const observer=new MutationObserver(onMotion);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});
  return()=>{finish();document.removeEventListener('opening:skip',finish);window.removeEventListener('keydown',onKey);reduced.removeEventListener('change',onMotion);observer.disconnect();};
 },[pathname]);
 useLayoutEffect(()=>{
  if(!scene)return;
  // Only hand off after the actual animation is mounted, before the next paint.
  if(!scene.video)document.documentElement.dataset.opening='playing';
  else {const layer=document.querySelector<HTMLElement>('.opening-scene');if(layer)layer.inert=true;}
  const update=()=>setViewport({width:innerWidth,height:innerHeight});
  update();window.addEventListener('resize',update);
  return()=>window.removeEventListener('resize',update);
 },[scene]);
 useEffect(()=>{if(scene&&!scene.video)document.querySelector<HTMLButtonElement>('.opening-skip')?.focus({preventScroll:true});},[scene]);
 useEffect(()=>{
  const video=videoRef.current,root=video?.closest<HTMLElement>('.opening-scene');
  if(!scene?.video||!video||!root)return;
  const audio=document.getElementById('site-audio') as HTMLAudioElement|null;audio?.pause();
  const sound=root.querySelector<HTMLButtonElement>('.opening-video-sound');
  const html=document.documentElement;
  let userMuted=false;
  const soundState=()=>{if(failed)return;html.dataset.openingSound=!video.paused&&!video.muted?'playing':'blocked';sound?.setAttribute('aria-pressed',String(!video.muted&&!video.paused));};
  const playWithSound=()=>{video.muted=false;void video.play().then(soundState).catch(()=>{video.muted=true;soundState();void video.play().catch(fallback);});};
  const toggleSound=()=>{if(video.muted){userMuted=false;if(audio)audio.dataset.userPaused='0';playWithSound();}else{userMuted=true;if(audio)audio.dataset.userPaused='1';video.muted=true;soundState();}};
  const unlockSound=(event:Event)=>{if(!userMuted&&video.muted&&!(event.target instanceof Element&&event.target.closest('.opening-sound,.opening-skip')))playWithSound();};
  let failed=false,started=false,stall:ReturnType<typeof setTimeout>;
  const timedAnimations=()=>root.getAnimations({subtree:true}).filter(a=>Number(a.effect?.getTiming().duration)===OPENING_DURATION);
  const align=(paused:boolean)=>{for(const a of timedAnimations()){a.currentTime=video.currentTime*1000;if(paused)a.pause();else a.play();}};
  const fallback=()=>{if(failed)return;failed=true;clearTimeout(stall);video.pause();video.hidden=true;delete html.dataset.openingSound;root.dataset.media='poster';root.inert=false;html.dataset.opening='playing';root.querySelector<HTMLButtonElement>('.opening-skip')?.focus({preventScroll:true});for(const a of timedAnimations())a.play();if(!started)playbackStarted.current();};
  const playing=()=>{if(failed)return;clearTimeout(stall);root.dataset.media='video';root.inert=false;html.dataset.opening='playing';if(!started)root.querySelector<HTMLButtonElement>('.opening-skip')?.focus({preventScroll:true});soundState();align(false);if(!started){started=true;playbackStarted.current();}};
  const waiting=()=>{if(failed)return;align(true);clearTimeout(stall);stall=setTimeout(fallback,started?1800:9000);};
  const adjust=()=>{if(failed)return;for(const a of timedAnimations()){if(Math.abs(Number(a.currentTime)-video.currentTime*1000)>180)a.currentTime=video.currentTime*1000;}};
  video.addEventListener('playing',playing);video.addEventListener('waiting',waiting);video.addEventListener('timeupdate',adjust);video.addEventListener('error',fallback);
  sound?.addEventListener('click',toggleSound);document.addEventListener('click',unlockSound);video.addEventListener('volumechange',soundState);
  video.volume=.65;align(true);stall=setTimeout(fallback,9000);playWithSound();
  return()=>{failed=true;clearTimeout(stall);if(userMuted&&audio)audio.dataset.userPaused='1';video.pause();delete html.dataset.openingSound;sound?.removeEventListener('click',toggleSound);document.removeEventListener('click',unlockSound);video.removeEventListener('volumechange',soundState);video.removeEventListener('playing',playing);video.removeEventListener('waiting',waiting);video.removeEventListener('timeupdate',adjust);video.removeEventListener('error',fallback);};
 },[scene]);
 if(!scene)return null;
 const zh=pathname.startsWith('/zh');
 const mobile=viewport.width<=600;
 const crop=mobile?{focusX:50,focusY:50}:scene;
 const sun=projectOpeningPoint({x:scene.sunX,y:scene.sunY},crop,artSize,viewport,mobile?'contain':'cover');
 return <div className={`opening-scene ${ready?'opening-playing':''}`} role="dialog" aria-modal="true" aria-label={zh?'晨光水雾开屏动画':'Sunrise through mist opening'} style={{
  '--opening-duration':`${OPENING_DURATION}ms`,'--opening-focus-x':`${scene.focusX}%`,'--opening-focus-y':`${scene.focusY}%`,
  '--opening-sun-x':`${sun.x}px`,'--opening-sun-y':`${sun.y}px`,
 } as CSSProperties}>
  <div className="opening-landscape" aria-hidden="true"><img className="opening-ambient" src={scene.image} alt=""/><img className="opening-art" src={scene.image} alt=""/>{scene.video&&<video ref={videoRef} className="opening-video" src={scene.video} poster={scene.image} muted playsInline preload="auto" disablePictureInPicture controlsList="nodownload nofullscreen noremoteplayback"/>}</div>
  <div className="opening-sunlight" aria-hidden="true"/><div className="opening-sun-rays" aria-hidden="true"/>
  <div className="opening-fog-fallback" aria-hidden="true"/><OpeningMist/>
  <div className="opening-night" aria-hidden="true"/>
  <div className="opening-sun-dust" aria-hidden="true">{Array.from({length:10},(_,i)=><i key={i} style={{left:`${(i*23+9)%100}%`,top:`${(i*31+17)%100}%`,animationDelay:`${i*.17}s`}}/>)}</div>
  <div className="opening-title-block"><div className="opening-site-title">{name}</div><p className="opening-welcome">{zh?'雾散之后，光会进来。':'Where the mist clears, light finds a way.'}</p></div>
  <OpeningSound video={Boolean(scene.video)}/><button className="opening-skip" onClick={()=>finishRef.current()}>{zh?'跳过动画':'Skip intro'}<ArrowRight size={16}/></button>
 </div>;
}
