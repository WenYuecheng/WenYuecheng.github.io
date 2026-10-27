'use client';
import { useEffect, useRef } from 'react';

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
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  update();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
  return()=>{window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);cancelAnimationFrame(frame);};
 },[]);
 return <div ref={ref} className="hero-envelope" aria-hidden="true"><div className="envelope-letter"/><div className="envelope-front"/><div className="envelope-flap"/><span className="envelope-seal">W</span><span className="envelope-stitch"/></div>;
}
