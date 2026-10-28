'use client';
import {usePathname} from 'next/navigation';
import type {CSSProperties} from 'react';
import {site} from '../data/site';

/** One continuous moving illustration behind the route and its footer. */
export function RouteScenery(){
 const path=usePathname().replace(/^\/zh(?=\/|$)/,'')||'/';
 const project=path.match(/^\/projects\/(weyra|solaceai)\/$/)?.[1];
 const wall=['/guestbook/','/auth/','/admin/'].includes(path);
 const kind=project??(path==='/'?'home':path==='/contact/'?'contact':path==='/projects/'?'projects':wall?'wall':'');
 const image=(project?site.art[project as 'weyra'|'solaceai']:undefined)??(kind==='home'?site.art.home:kind==='contact'?site.art.contact:kind==='projects'?site.art.night:site.art.wall);
 if(!kind)return null;
 return <div className="route-scenery" data-scene={kind} style={{'--route-art':`url(${image})`} as CSSProperties} aria-hidden="true">
  <div className="route-scenery-art"/><div className="route-scenery-veil"/><div className="route-scenery-light"/>
  <div className="route-scenery-motes">{Array.from({length:16},(_,i)=><i key={i} style={{left:`${(i*31+7)%100}%`,top:`${(i*19+11)%100}%`,animationDelay:`${-i*1.3}s`,animationDuration:`${8+i%5}s`}}/>)}</div>
 </div>;
}
