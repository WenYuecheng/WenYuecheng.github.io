'use client';
/** Adapted from XinghuisamaBlogs Sakura (CC BY-NC 4.0); deterministic positions, reduced motion and dark fireflies added. */
export function Atmosphere() {
 return <div className="atmosphere" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{left:`${(i*37+11)%100}%`,width:`${6+i%5}px`,height:`${9+i%5}px`,animationDuration:`${15+i%8}s`,animationDelay:`${-i*2.3}s`}} />)}</div>;
}
