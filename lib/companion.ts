import {companionQuotes} from '../data/companion-quotes';

export type CompanionCursor={index:number;part:0|1};
export type Point={x:number;y:number};
type Size={width:number;height:number};

export function advanceCompanion(current:CompanionCursor|null,random= Math.random):CompanionCursor {
 if(current&&current.part===0&&companionQuotes[current.index].zh.length===2)return {...current,part:1};
 const count=companionQuotes.length-(current?1:0);
 const choice=Math.min(count-1,Math.max(0,Math.floor(random()*count)));
 return {index:current&&choice>=current.index?choice+1:choice,part:0};
}

export function clampCompanion(point:Point,size:Size,viewport:Size):Point {
 return {
  x:Math.max(8,Math.min(point.x,viewport.width-size.width-8)),
  y:Math.max(8,Math.min(point.y,viewport.height-size.height-8)),
 };
}
