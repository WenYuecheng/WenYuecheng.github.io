'use client';
import {useEffect,useRef} from 'react';
import {openingMoment} from '../lib/opening';

/** A bounded 2D glass surface: moisture moves independently of the scene behind it. */
export function OpeningMist(){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current,scene=canvas?.closest<HTMLElement>('.opening-scene');
  if(!canvas||!scene)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  let frame=0,last=-100,w=0,h=0;
  let seed=9137;
  const random=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
  const drops=Array.from({length:100},()=>({x:random(),y:random(),r:.7+random()*2.1,tail:random()*8}));
  const grain=document.createElement('canvas');grain.width=grain.height=160;
  const grainContext=grain.getContext('2d');
  if(grainContext){const pixels=grainContext.createImageData(160,160);for(let i=0;i<pixels.data.length;i+=4){pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;pixels.data[i+3]=random()*7;}grainContext.putImageData(pixels,0,0);}
  const resize=()=>{const size=scene.getBoundingClientRect(),scale=Math.min(1.25,devicePixelRatio||1,1440/Math.max(1,size.width),1000/Math.max(1,size.height));w=canvas.width=Math.max(1,Math.round(size.width*scale));h=canvas.height=Math.max(1,Math.round(size.height*scale));};
  resize();const observer=new ResizeObserver(resize);observer.observe(scene);
  scene.dataset.glass='ready';
  const draw=(now:number)=>{
   frame=requestAnimationFrame(draw);
   if(now-last<32||document.hidden)return;last=now;
   const video=scene.querySelector<HTMLVideoElement>('.opening-video');
   const progress=scene.dataset.media==='video'&&video?video.currentTime/10:Number.parseFloat(getComputedStyle(scene).getPropertyValue('--opening-progress'))||0;
   const {wipe,clear,sun}=openingMoment(progress);
   ctx.clearRect(0,0,w,h);
   if(clear>=1)return;
   ctx.save();ctx.globalAlpha=1-clear;
   // Frost is a blurred copy of the current moving frame, never an opaque paint layer.
   const poster=scene.querySelector<HTMLImageElement>('.opening-art');
   const source=video&&scene.dataset.media==='video'&&video.readyState>=2?video:poster;
   if(source){
    const sw=source instanceof HTMLVideoElement?source.videoWidth:source.naturalWidth,sh=source instanceof HTMLVideoElement?source.videoHeight:source.naturalHeight;
    if(sw&&sh){
     const mobile=scene.clientWidth<=600,scale=(mobile?Math.min:Math.max)(w/sw,h/sh);
     const focus=getComputedStyle(scene),fx=mobile ? .5 : parseFloat(focus.getPropertyValue('--opening-focus-x'))/100,fy=mobile ? .5 : parseFloat(focus.getPropertyValue('--opening-focus-y'))/100;
     ctx.filter=`blur(${Math.max(7,w*.011)}px) saturate(.85)`;
     if(mobile){const ambient=Math.max(w/sw,h/sh);ctx.globalAlpha=(1-clear)*.5;ctx.drawImage(source,(w-sw*ambient)/2,(h-sh*ambient)/2,sw*ambient,sh*ambient);ctx.globalAlpha=1-clear;}
     ctx.drawImage(source,(w-sw*scale)*fx,(h-sh*scale)*fy,sw*scale,sh*scale);ctx.filter='none';
    }
   }
   ctx.fillStyle='rgba(232,243,248,.045)';ctx.fillRect(0,0,w,h);
   const texture=ctx.createPattern(grain,'repeat');if(texture){ctx.fillStyle=texture;ctx.fillRect(0,0,w,h);}
   for(const drop of drops){const x=drop.x*w,y=(drop.y+progress*.018*drop.tail)*h%h;ctx.beginPath();ctx.ellipse(x,y,drop.r,drop.r*1.35,0,0,Math.PI*2);ctx.strokeStyle='rgba(250,255,255,.28)';ctx.lineWidth=.65;ctx.stroke();ctx.beginPath();ctx.moveTo(x-1,y+2);ctx.lineTo(x-1,y+2+drop.tail);ctx.strokeStyle='rgba(92,125,143,.1)';ctx.stroke();}
   if(wipe>0){
    // A broad hand-like arc leaves the already wiped area clear. It never travels back.
    const boundary=(y:number)=>(1.16-1.45*wipe)*w+Math.sin(y/h*Math.PI*1.7+.45)*w*.045;
    ctx.globalCompositeOperation='destination-out';
    ctx.beginPath();ctx.moveTo(w+80,-40);ctx.lineTo(boundary(-40),-40);
    for(let y=-40;y<=h+40;y+=12)ctx.lineTo(boundary(y),y);
    ctx.lineTo(w+80,h+40);ctx.closePath();ctx.fillStyle='#000';ctx.filter=`blur(${Math.max(12,w*.016)}px)`;ctx.fill();ctx.filter='none';
    ctx.globalCompositeOperation='source-over';
    // Fine wet ridges catch the sunlight at the leading edge, without a bright curtain.
    for(let i=0;i<5;i++){ctx.beginPath();for(let y=h*.15;y<h*.92;y+=10){const x=boundary(y)+(i-2)*3+Math.sin(y*.025+i)*2;if(y===h*.15)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=`rgba(255,245,213,${.025+sun*.035})`;ctx.lineWidth=.6;ctx.stroke();}
   }
   ctx.restore();
  };
  frame=requestAnimationFrame(draw);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();delete scene.dataset.glass;};
 },[]);
 return <canvas ref={ref} className="opening-glass" aria-hidden="true"/>;
}
