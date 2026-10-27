import type {CSSProperties,ReactNode} from 'react';
import {site} from '../data/site';
export function WallScene({children,className=''}:{children:ReactNode;className?:string}){
 return <main id="main" className={`wall-scene ${className}`} style={{'--wall-scene-art':`url(${site.art.wall})`} as CSSProperties}><div className="wall-scenery" aria-hidden="true"><div className="wall-scenery-art"/><div className="wall-scenery-veil"/>{Array.from({length:14},(_,i)=><i className="wall-firefly" key={i} style={{left:`${(i*29+9)%100}%`,top:`${(i*17+13)%90}%`,animationDelay:`${-i*1.7}s`,animationDuration:`${8+i%5}s`}}/>)}</div>{children}</main>;
}
