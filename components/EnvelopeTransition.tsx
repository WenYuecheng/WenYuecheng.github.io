'use client';
import { useEffect, useRef, useState } from 'react';
import type {Locale} from '../data/site';

export function EnvelopeInvitation({locale}:{locale:Locale}) {
 const [opening,setOpening]=useState(false),timers=useRef<ReturnType<typeof setTimeout>[]>([]);
 useEffect(()=>()=>{timers.current.forEach(clearTimeout);},[]);
 function open(){
  if(opening)return;
  const still=document.documentElement.dataset.motion==='off'||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const enter=()=>document.getElementById('profile')?.scrollIntoView({behavior:still?'instant':'smooth',block:'start'});
  if(still){enter();return;}
  setOpening(true);
  timers.current=[setTimeout(enter,480),setTimeout(()=>{setOpening(false);timers.current=[];},1500)];
 }
 const label=locale==='zh'?'拆开信封':'Open the letter';
 return <button type="button" className={`envelope-invitation${opening?' is-opening':''}`} onClick={open} disabled={opening} aria-label={label} aria-controls="profile"><span className="envelope-spark" aria-hidden="true">✧</span><span className="envelope-invitation-letters" aria-hidden="true">{Array.from(label).map((letter,index)=><span key={index} style={{animationDelay:`${index*.09}s`}}>{letter===' '? '\u00a0':letter}</span>)}</span><span className="envelope-spark" aria-hidden="true">✦</span></button>;
}

/** A decorative paper fold follows the first scroll; content never depends on it. */
export function EnvelopeTransition() {
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const element=ref.current,hero=element?.closest('.hero');
  if(!element||!hero)return;
  let frame=0;
  const update=()=>{
   frame=0;
   const bounds=hero.getBoundingClientRect();
   const progress=Math.max(0,Math.min(1,-bounds.top/Math.max(240,bounds.height*.58)));
   element.style.setProperty('--letter-open',String(progress));
   (hero as HTMLElement).style.setProperty('--envelope-progress',String(progress));
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  update();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
  return()=>{window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);cancelAnimationFrame(frame);};
 },[]);
 return <div ref={ref} className="hero-envelope" aria-hidden="true"><div className="envelope-letter"/><div className="envelope-front"/><div className="envelope-flap"/><span className="envelope-seal">W</span><span className="envelope-stitch"/></div>;
}
