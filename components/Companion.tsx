'use client';
import {useEffect,useId,useLayoutEffect,useRef,useState,type PointerEvent,type KeyboardEvent,type MouseEvent} from 'react';
import {companionQuotes} from '../data/companion-quotes';
import {advanceCompanion,clampCompanion,type CompanionCursor,type Point} from '../lib/companion';
import type {Locale} from '../data/site';

type Gesture={id:number;start:Point;origin:Point;width:number;height:number;moved:boolean};
export function Companion({locale}:{locale:Locale}) {
 const root=useRef<HTMLDivElement>(null),bubble=useRef<HTMLDivElement>(null);
 const gesture=useRef<Gesture|null>(null),suppressClick=useRef(false);
 const [position,setPosition]=useState<Point|null>(null),[dragging,setDragging]=useState(false);
 const [cursor,setCursor]=useState<CompanionCursor|null>(null),[open,setOpen]=useState(false);
 const [viewport,setViewport]=useState({width:0,height:0});
 const [bubblePosition,setBubblePosition]=useState<{left:number;top:number;maxHeight:number}|null>(null);
 const helpId=useId();
 const text=cursor?companionQuotes[cursor.index][locale][cursor.part]:'';
 const pending=cursor?.part===0&&companionQuotes[cursor.index].zh.length===2;

 useEffect(()=>{
  const resize=()=>{
   const view={width:innerWidth,height:innerHeight};setViewport(view);
   const rect=root.current?.getBoundingClientRect();
   if(rect)setPosition(old=>old?clampCompanion(old,rect,view):null);
  };
  resize();window.addEventListener('resize',resize);
  return()=>window.removeEventListener('resize',resize);
 },[]);

 useEffect(()=>{
  if(!cursor)return;
  setOpen(true);
  const timer=setTimeout(()=>setOpen(false),Math.max(9000,Math.min(24000,text.length*85)));
  return()=>clearTimeout(timer);
 },[cursor,text]);

 useLayoutEffect(()=>{
  const rect=root.current?.getBoundingClientRect(),speech=bubble.current;
  if(!open||!rect||!speech)return;
  const above=Math.max(60,rect.top-24),below=Math.max(60,innerHeight-rect.bottom-24);
  const onTop=above>=speech.scrollHeight+12||above>=below;
  const maxHeight=Math.max(60,onTop?above:below);
  const height=Math.min(speech.scrollHeight,maxHeight);
  setBubblePosition({
   left:Math.max(12,Math.min(rect.x+rect.width/2-speech.offsetWidth/2,innerWidth-speech.offsetWidth-12)),
   top:onTop?Math.max(12,rect.top-height-12):Math.min(innerHeight-height-12,rect.bottom+12),maxHeight,
  });
 },[open,text,position,viewport]);

 function down(event:PointerEvent<HTMLButtonElement>) {
  if(!event.isPrimary||event.button!==0)return;
  const rect=root.current!.getBoundingClientRect();
  suppressClick.current=false;
  gesture.current={id:event.pointerId,start:{x:event.clientX,y:event.clientY},origin:{x:rect.x,y:rect.y},width:rect.width,height:rect.height,moved:false};
  event.currentTarget.setPointerCapture(event.pointerId);
 }
 function move(event:PointerEvent<HTMLButtonElement>) {
  const g=gesture.current;if(!g||g.id!==event.pointerId)return;
  const dx=event.clientX-g.start.x,dy=event.clientY-g.start.y;
  if(!g.moved&&Math.hypot(dx,dy)<7)return;
  g.moved=true;setDragging(true);
  setPosition(clampCompanion({x:g.origin.x+dx,y:g.origin.y+dy},g,{width:innerWidth,height:innerHeight}));
 }
 function finish(event:PointerEvent<HTMLButtonElement>,cancelled=false) {
  const g=gesture.current;if(!g||g.id!==event.pointerId)return;
  suppressClick.current=g.moved||cancelled;gesture.current=null;setDragging(false);
  if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
 }
 function speak(event:MouseEvent<HTMLButtonElement>) {
  if(event.detail>0&&suppressClick.current){suppressClick.current=false;return;}
  setCursor(current=>advanceCompanion(current));
 }
 function keyboard(event:KeyboardEvent<HTMLButtonElement>) {
  if(event.key==='Escape'){setOpen(false);return;}
  if(event.key==='Home'){event.preventDefault();setPosition(null);return;}
  const delta:Record<string,Point>={ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1}};
  const step=delta[event.key];if(!step)return;
  event.preventDefault();const rect=root.current!.getBoundingClientRect(),distance=event.shiftKey?32:12;
  setPosition(clampCompanion({x:rect.x+step.x*distance,y:rect.y+step.y*distance},rect,{width:innerWidth,height:innerHeight}));
 }

 return <div ref={root} className={`little-companion ${dragging?'is-dragging':''}`} style={position?{left:position.x,top:position.y,right:'auto',bottom:'auto'}:undefined}>
  {open&&<div ref={bubble} className="companion-speech" role="status" aria-live="polite" aria-atomic="true" style={bubblePosition?bubblePosition:{visibility:'hidden'}}>
   <p className="companion-speech-text">{text}</p>
   {pending&&<small>{locale==='zh'?'再点一下，听下一句':'Tap again for the next line'}</small>}
  </div>}
  <button type="button" className="companion-button" aria-label={locale==='zh'?'和小伙伴聊一句':'Chat with the little companion'} aria-describedby={helpId}
   onPointerDown={down} onPointerMove={move} onPointerUp={event=>finish(event)} onPointerCancel={event=>finish(event,true)} onLostPointerCapture={event=>finish(event,true)} onClick={speak} onKeyDown={keyboard}>
   <img src="/images/companion/pink-front-pen.webp" alt="" width="640" height="640" draggable={false}/>
  </button>
  <span id={helpId} className="companion-help">{locale==='zh'?'点击说话，拖动移动。键盘方向键移动，Home 复位，Esc 收起气泡。':'Click to chat, drag to move. Arrow keys move, Home resets, Escape dismisses the bubble.'}</span>
 </div>;
}
