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
 const initialPath=useRef(pathname);
 const [videoPhase,setVideoPhase]=useState<'loading'|'awaiting'|'buffering'|'error'|'playing'>('loading');
 const requestVideo=useRef<(sound:boolean)=>void>(()=>{});
 const videoRef=useRef<HTMLVideoElement>(null);
 useEffect(()=>{
  const html=document.documentElement;
  if(html.dataset.opening==='skipped'){html.dataset.opening='complete';return;}
  html.dataset.opening='pending';
  const mayPlay=()=>{
   return !cancelled&&html.dataset.opening==='pending';
  };
  let cancelled=false,ending:ReturnType<typeof setTimeout>|undefined;
  const controller=new AbortController();
  let unlock:(()=>void)|undefined;
  const finish=()=>{
   cancelled=true;controller.abort();clearTimeout(ending);unlock?.();unlock=undefined;
   document.documentElement.dataset.opening='complete';
   setScene(null);setReady(false);
  };
  finishRef.current=finish;
  const load=async()=>{
   try{
    // The first-paint gate stays up until the safe fallback poster is ready.
    // Slow mobile connections keep the gate, rather than silently skipping the intro.
    const response=await fetch('/opening/scene.json',{signal:controller.signal,cache:'no-store'});
    if(!response.ok){finish();return;}
    const config=parseOpeningScene(await response.json());
    if(!config){finish();return;}
    const openFrame=await new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Opening image unavailable'));image.fetchPriority='high';image.src=config.image;});
    if(cancelled||!mayPlay())return;
    const overflow=document.body.style.overflow;
    const content=document.querySelector<HTMLElement>('.site-experience');
    const previousInert=content?.inert;
    const focused=document.activeElement;
    document.body.style.overflow='hidden';if(content)content.inert=true;
    unlock=()=>{document.body.style.overflow=overflow;if(content)content.inert=previousInert??false;if(focused instanceof HTMLElement&&document.contains(focused))focused.focus({preventScroll:true});};
    setArtSize({width:openFrame.naturalWidth,height:openFrame.naturalHeight});
    setViewport({width:innerWidth,height:innerHeight});setScene(config);setReady(true);
    if(!config.video)ending=setTimeout(finish,OPENING_DURATION);
   }catch{finish();/* A failed image releases the gate immediately. */}
  };
  void load();
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')finish();};
  document.addEventListener('opening:skip',finish);
  window.addEventListener('keydown',onKey);
  return()=>{finish();document.removeEventListener('opening:skip',finish);window.removeEventListener('keydown',onKey);};
 },[]);
 useEffect(()=>{if(pathname!==initialPath.current)finishRef.current();},[pathname]);
 useEffect(()=>{
  const leave=()=>finishRef.current();window.addEventListener('pagehide',leave);
  return()=>window.removeEventListener('pagehide',leave);
 },[]);
 useLayoutEffect(()=>{
  if(!scene)return;
  // Only hand off after the actual animation is mounted, before the next paint.
  if(!scene.video)document.documentElement.dataset.opening='playing';
  else {const layer=document.querySelector<HTMLElement>('.opening-scene');if(layer)layer.inert=false;}
  const update=()=>setViewport({width:innerWidth,height:innerHeight});
  update();window.addEventListener('resize',update);
  return()=>window.removeEventListener('resize',update);
 },[scene]);
 useEffect(()=>{if(scene&&!scene.video)document.querySelector<HTMLButtonElement>('.opening-skip')?.focus({preventScroll:true});},[scene]);
 useEffect(()=>{
  const video=videoRef.current,root=video?.closest<HTMLElement>('.opening-scene');
  if(!scene?.video||!video||!root)return;
  if(video.getAttribute('src')!==scene.video)video.src=scene.video;
  const audio=document.getElementById('site-audio') as HTMLAudioElement|null;audio?.pause();
  const sound=root.querySelector<HTMLButtonElement>('.opening-video-sound'),html=document.documentElement;
  const touchBrowser=/iPhone|iPad|iPod|MicroMessenger/i.test(navigator.userAgent)||navigator.maxTouchPoints>0;
  let disposed=false,started=false,userMuted=false,attempt=0,pending=false,gestureBlocked=false,resumeAfterHidden=false,mediaFailed=false;
  const timedAnimations=()=>root.getAnimations({subtree:true}).filter(a=>Number(a.effect?.getTiming().duration)===OPENING_DURATION);
  const align=(paused:boolean)=>{for(const animation of timedAnimations()){animation.currentTime=video.currentTime*1000;if(paused)animation.pause();else animation.play();}};
  const soundState=()=>{if(disposed)return;html.dataset.openingSound=!video.paused&&!video.muted?'playing':'blocked';sound?.setAttribute('aria-pressed',String(!video.muted&&!video.paused));};
  const phase=(value:typeof videoPhase)=>{if(!disposed)setVideoPhase(value);};
  const playing=()=>{
   if(disposed)return;pending=false;gestureBlocked=false;mediaFailed=false;root.dataset.media='video';root.inert=false;html.dataset.opening='playing';
   phase('playing');soundState();align(false);
   if(!started){started=true;root.querySelector<HTMLButtonElement>('.opening-skip')?.focus({preventScroll:true});}
  };
  const failed=()=>{if(disposed)return;mediaFailed=true;pending=false;align(true);phase('error');soundState();};
  const play=(withSound:boolean,reload=false)=>{
   if(disposed)return;
   const current=++attempt;gestureBlocked=false;
   if(mediaFailed||video.error||reload&&video.networkState===HTMLMediaElement.NETWORK_NO_SOURCE){
    if(!reload){failed();return;}
    mediaFailed=false;video.load();phase('loading');
   }
   video.hidden=false;video.muted=!withSound;if(withSound)userMuted=false;
   pending=true;
   // Keep play() directly in the tap/bridge event; awaiting anything first loses iOS activation.
   void video.play().then(()=>{
    if(disposed||current!==attempt)return;pending=false;
    if(!video.paused&&video.readyState>=2)playing();else soundState();
   }).catch(error=>{
    if(disposed||current!==attempt)return;pending=false;
    if(withSound&&error?.name==='NotAllowedError'){play(false);return;}
    align(true);soundState();
    if(mediaFailed||video.error||['NotSupportedError','NetworkError'].includes(error?.name)){failed();return;}
    gestureBlocked=error?.name!=='AbortError';phase(gestureBlocked?'awaiting':'loading');
   });
  };
  requestVideo.current=sound=>play(sound,true);
  const toggleSound=()=>{if(video.muted||video.paused){if(audio)audio.dataset.userPaused='0';play(true,true);}else{userMuted=true;if(audio)audio.dataset.userPaused='1';video.muted=true;soundState();}};
  const unlock=(event:Event)=>{
   if(event.target instanceof Element&&event.target.closest('.opening-sound,.opening-skip,.opening-play-button'))return;
   if(!userMuted&&(video.paused||video.muted))play(true,true);
  };
  const bridge=()=>{if(!disposed&&video.paused)play(false);};
  const canPlay=()=>{if(!disposed&&!mediaFailed&&!video.error&&video.paused&&!pending&&!gestureBlocked)play(false);};
  const waiting=()=>{if(disposed||mediaFailed)return;align(true);phase(started?'buffering':'loading');};
  const paused=()=>{if(disposed||mediaFailed||video.ended)return;align(true);phase(document.hidden?'buffering':'awaiting');soundState();};
  const ended=()=>{if(!disposed)finishRef.current();};
  const adjust=()=>{if(disposed)return;for(const animation of timedAnimations())if(Math.abs(Number(animation.currentTime)-video.currentTime*1000)>180)animation.currentTime=video.currentTime*1000;};
  const visibility=()=>{
   if(document.hidden){resumeAfterHidden=!video.paused;if(resumeAfterHidden)video.pause();}
   else if(resumeAfterHidden){resumeAfterHidden=false;play(!video.muted&&!userMuted);}
  };
  for(const [event,handler] of [['playing',playing],['waiting',waiting],['pause',paused],['canplay',canPlay],['timeupdate',adjust],['ended',ended],['error',failed],['volumechange',soundState]] as const)video.addEventListener(event,handler);
  sound?.addEventListener('click',toggleSound);document.addEventListener('click',unlock);document.addEventListener('touchend',unlock,{passive:true});document.addEventListener('WeixinJSBridgeReady',bridge);document.addEventListener('visibilitychange',visibility);
  video.setAttribute('webkit-playsinline','true');video.defaultMuted=true;video.muted=true;video.volume=.65;
  try{video.currentTime=0;}catch{/* A newly loaded video already starts at zero. */}
  root.inert=false;root.dataset.media='loading';html.dataset.opening='playing';phase('loading');align(true);
  // A cold WeChat visit must not begin by unmuting a video that iOS has not authorized.
  play(!touchBrowser);
  return()=>{
   disposed=true;attempt++;requestVideo.current=()=>{};
   if(userMuted&&audio)audio.dataset.userPaused='1';
   for(const [event,handler] of [['playing',playing],['waiting',waiting],['pause',paused],['canplay',canPlay],['timeupdate',adjust],['ended',ended],['error',failed],['volumechange',soundState]] as const)video.removeEventListener(event,handler);
   sound?.removeEventListener('click',toggleSound);document.removeEventListener('click',unlock);document.removeEventListener('touchend',unlock);document.removeEventListener('WeixinJSBridgeReady',bridge);document.removeEventListener('visibilitychange',visibility);
   video.autoplay=false;video.pause();video.removeAttribute('src');video.load();delete html.dataset.openingSound;
  };
 },[scene]);
 if(!scene)return null;
 const zh=pathname.startsWith('/zh');
 const mobile=viewport.width<=600;
 const crop=mobile?{focusX:50,focusY:50}:scene;
 const sun=projectOpeningPoint({x:scene.sunX,y:scene.sunY},crop,artSize,viewport,mobile?'contain':'cover');
 return <div data-playback={scene.video?videoPhase:undefined} className={`opening-scene ${ready?'opening-playing':''}`} role="dialog" aria-modal="true" aria-label={zh?'晨光水雾开屏动画':'Sunrise through mist opening'} style={{
  '--opening-duration':`${OPENING_DURATION}ms`,'--opening-focus-x':`${scene.focusX}%`,'--opening-focus-y':`${scene.focusY}%`,
  '--opening-sun-x':`${sun.x}px`,'--opening-sun-y':`${sun.y}px`,
 } as CSSProperties}>
  <div className="opening-landscape" aria-hidden="true"><img className="opening-ambient" src={scene.image} alt=""/><img className="opening-art" src={scene.image} alt=""/>{scene.video&&<video ref={videoRef} className="opening-video" src={scene.video} poster={scene.image} autoPlay muted playsInline preload="auto" disablePictureInPicture controlsList="nodownload nofullscreen noremoteplayback"/>}</div>
  <div className="opening-sunlight" aria-hidden="true"/><div className="opening-sun-rays" aria-hidden="true"/>
  <div className="opening-fog-fallback" aria-hidden="true"/><OpeningMist/>
  <div className="opening-night" aria-hidden="true"/>
  <div className="opening-sun-dust" aria-hidden="true">{Array.from({length:10},(_,i)=><i key={i} style={{left:`${(i*23+9)%100}%`,top:`${(i*31+17)%100}%`,animationDelay:`${i*.17}s`}}/>)}</div>
  <div className="opening-title-block"><div className="opening-site-title">{name}</div><p className="opening-welcome">{zh?'雾散之后，光会进来。':'Where the mist clears, light finds a way.'}</p></div>
  {scene.video&&videoPhase!=='playing'&&<div className="opening-play-prompt"><strong>Eugene</strong><p role="status">{videoPhase==='error'?(zh?'视频暂时没加载好，再试一下吧。':'The video could not load. Give it another try.'):(videoPhase==='buffering'?(zh?'视频正在缓冲，稍等一下…':'Buffering the video…'):(zh?'正在准备开屏视频，点一下也可以开始。':'Preparing the opening video. You can tap to start.'))}</p><button type="button" className="opening-play-button" onClick={()=>requestVideo.current(true)}>{videoPhase==='error'?(zh?'重新加载视频':'Retry video'):(zh?'点击播放开屏':'Play opening video')}<ArrowRight size={18}/></button></div>}
  <OpeningSound video={Boolean(scene.video)}/><button className="opening-skip" onClick={()=>finishRef.current()}>{zh?'跳过动画':'Skip intro'}<ArrowRight size={16}/></button>
 </div>;
}
