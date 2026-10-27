export const OPENING_DURATION=7200;
export type OpeningScene={enabled:true;closed:string;open:string;turned:string;half:string;focusX:number;focusY:number;eyeX:number;eyeY:number};
const localArt=(value:unknown):value is string=>typeof value==='string'&&/^\/images\/opening\/[a-zA-Z0-9_-]+\.(webp|png|jpg|jpeg|avif)$/.test(value);
/** Only the site's local image directory can supply opening artwork. */
export function parseOpeningScene(value:unknown):OpeningScene|null{
 if(!value||typeof value!=='object')return null;
 const scene=value as Record<string,unknown>;
 if(scene.enabled!==true||!localArt(scene.closed)||!localArt(scene.open))return null;
 if(scene.turned!==undefined&&!localArt(scene.turned))return null;
 if(scene.half!==undefined&&!localArt(scene.half))return null;
 const focus=(n:unknown,fallback:number)=>typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.min(100,n)):fallback;
 return {enabled:true,closed:scene.closed,open:scene.open,turned:localArt(scene.turned)?scene.turned:scene.closed,half:localArt(scene.half)?scene.half:scene.closed,focusX:focus(scene.focusX,62),focusY:focus(scene.focusY,45),eyeX:focus(scene.eyeX,84.5),eyeY:focus(scene.eyeY,39.2)};
}

/** Project an artwork-space percentage through the same cover crop used by the image. */
export function projectOpeningPoint(point:{x:number;y:number},crop:{focusX:number;focusY:number},art:{width:number;height:number},viewport:{width:number;height:number}){
 const scale=Math.max(viewport.width/art.width,viewport.height/art.height);
 return {x:art.width*scale*point.x/100+(viewport.width-art.width*scale)*crop.focusX/100,
  y:art.height*scale*point.y/100+(viewport.height-art.height*scale)*crop.focusY/100,scale};
}
