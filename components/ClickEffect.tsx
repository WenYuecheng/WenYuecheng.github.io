'use client';
/** Ripple primitive adapted from XinghuisamaBlogs (CC BY-NC 4.0); see retained original. */
import {useEffect,useRef} from 'react';
type Ripple={x:number;y:number;start:number};
export function ClickEffect(){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=canvasRef.current,context=canvas?.getContext('2d');if(!canvas||!context)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let ripples:Ripple[]=[],frame=0,width=0,height=0;
  const enabled=()=>!reduced.matches&&document.documentElement.dataset.motion!=='off';
  const clear=()=>{cancelAnimationFrame(frame);frame=0;ripples=[];context.clearRect(0,0,width,height);};
  const resize=()=>{width=innerWidth;height=innerHeight;const ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);context.setTransform(ratio,0,0,ratio,0,0);};
  const draw=(now:number)=>{
   frame=0;context.clearRect(0,0,width,height);
   if(!enabled()){ripples=[];return;}
   ripples=ripples.filter(r=>now-r.start<850);
   const color=document.documentElement.classList.contains('dark')?'169,190,255':'184,121,158';
   for(const ripple of ripples){
    const progress=Math.max(0,(now-ripple.start)/850),radius=(1-Math.pow(1-progress,3))*62,alpha=(1-progress)*.68;
    context.shadowBlur=12;context.shadowColor=`rgba(${color},.45)`;
    context.beginPath();context.arc(ripple.x,ripple.y,radius,0,Math.PI*2);context.strokeStyle=`rgba(${color},${alpha})`;context.lineWidth=1.7;context.stroke();
    context.beginPath();context.arc(ripple.x,ripple.y,radius*.48,0,Math.PI*2);context.fillStyle=`rgba(${color},${alpha*.12})`;context.fill();
   }
   if(ripples.length)frame=requestAnimationFrame(draw);
  };
  const click=(event:PointerEvent)=>{
   if(!enabled()||event.button!==0||!event.isPrimary)return;
   if(event.target instanceof Element&&event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))return;
   ripples.push({x:event.clientX,y:event.clientY,start:performance.now()});if(ripples.length>12)ripples.shift();
   if(!frame)frame=requestAnimationFrame(draw);
  };
  const preference=()=>{if(!enabled())clear();};
  resize();window.addEventListener('resize',resize);window.addEventListener('pointerdown',click,{passive:true});reduced.addEventListener('change',preference);
  const observer=new MutationObserver(preference);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});
  return()=>{clear();window.removeEventListener('resize',resize);window.removeEventListener('pointerdown',click);reduced.removeEventListener('change',preference);observer.disconnect();};
 },[]);
 return <canvas className="click-effects" ref={canvasRef} aria-hidden="true"/>;
}
