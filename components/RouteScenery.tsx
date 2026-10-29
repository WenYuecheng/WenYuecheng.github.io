'use client';
import {usePathname} from 'next/navigation';
import type {CSSProperties} from 'react';
import {site} from '../data/site';
import {SceneOrnaments} from './SceneOrnaments';

/** One continuous moving illustration behind the route and its footer. */
export function RouteScenery({dark=null}:{dark?:boolean|null}){
 const path=usePathname().replace(/^\/zh(?=\/|$)/,'')||'/';
 const project=path.match(/^\/projects\/(weyra|solaceai)\/$/)?.[1];
 const wall=['/guestbook/','/auth/','/admin/'].includes(path);
 const journal=path==='/reading/'?'reading':path==='/updates/'?'updates':null;
 const kind=journal??project??(path==='/'?'home':path==='/contact/'?'contact':path==='/projects/'?'projects':wall?'wall':'');
 const scene=journal??(kind==='home'?'profile':kind==='contact'?'contact':kind==='projects'||project?'projects':wall?'wall':null);
 // Resolve the saved theme before mounting a scene image, so the browser does
 // not eagerly fetch day art on a cold night visit.
 const base=scene&&dark!==null?`/images/scenes/${scene}-${dark?'night':'day'}`:null;
 const image=scene?(base?`${base}.webp`:null):(project?site.art[project as 'weyra'|'solaceai']:undefined)??(kind==='contact'?site.art.contact:kind==='projects'?site.art.night:site.art.wall);
 if(!kind||!image)return null;
 return <div className="route-scenery" data-scene={kind} style={{'--route-art':`url(${image})`} as CSSProperties} aria-hidden="true">
  <picture className="route-scenery-art" key={image}>{base&&<source media="(max-width: 600px)" srcSet={`${base}-mobile.webp`}/>}<img src={image} alt="" width="1664" height="936" decoding="async"/></picture><div className="route-scenery-veil"/><div className="route-scenery-light"/>
  <div className="scene-beams"><i/><i/><i/></div>
  {scene&&['profile','reading','updates'].includes(scene)&&<SceneOrnaments scene={scene}/>}
  <div className="route-scenery-motes">{Array.from({length:16},(_,i)=><i key={i} style={{left:`${(i*31+7)%100}%`,top:`${(i*19+11)%100}%`,animationDelay:`${-i*1.3}s`,animationDuration:`${8+i%5}s`}}/>)}</div>
 </div>;
}
