export const OPENING_DURATION=10000;
export type OpeningScene={enabled:true;image:string;video?:string;focusX:number;focusY:number;sunX:number;sunY:number};
const localArt=(value:unknown):value is string=>typeof value==='string'&&/^\/images\/opening\/[a-zA-Z0-9_-]+\.(webp|png|jpg|jpeg|avif)$/.test(value);
/** Never let remote configuration introduce external or private image URLs. */
export function parseOpeningScene(value:unknown):OpeningScene|null{
 if(!value||typeof value!=='object')return null;
 const scene=value as Record<string,unknown>;
 if(scene.enabled!==true||!localArt(scene.image))return null;
 if(scene.video!==undefined&&(typeof scene.video!=='string'||!/^\/videos\/opening\/[a-zA-Z0-9_-]+\.mp4$/.test(scene.video)))return null;
 const focus=(n:unknown,fallback:number)=>typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.min(100,n)):fallback;
 return {enabled:true,image:scene.image,...(typeof scene.video==='string'?{video:scene.video}:{}),focusX:focus(scene.focusX,50),focusY:focus(scene.focusY,45),sunX:focus(scene.sunX,94),sunY:focus(scene.sunY,69)};
}
/** Project through the exact cover/contain crop used by the visible image. */
export function projectOpeningPoint(point:{x:number;y:number},crop:{focusX:number;focusY:number},art:{width:number;height:number},viewport:{width:number;height:number},fit:'cover'|'contain'='cover'){
 const scale=(fit==='contain'?Math.min:Math.max)(viewport.width/art.width,viewport.height/art.height);
 return {x:art.width*scale*point.x/100+(viewport.width-art.width*scale)*crop.focusX/100,
  y:art.height*scale*point.y/100+(viewport.height-art.height*scale)*crop.focusY/100,scale};
}
const smooth=(from:number,to:number,p:number)=>{const t=Math.max(0,Math.min(1,(p-from)/(to-from)));return t*t*(3-2*t);};
/** One continuous timeline drives the glass wipe and its warm backlight. */
export function openingMoment(progress:number){
 const p=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
 return {wipe:smooth(.18,.60,p),clear:smooth(.60,.75,p),sun:smooth(.17,.84,p)};
}
