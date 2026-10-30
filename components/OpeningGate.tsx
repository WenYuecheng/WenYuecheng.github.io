import {OpeningSound} from './EarlyAudio';
import config from '../public/opening/scene.json';
import {parseOpeningScene} from '../lib/opening';

export const openingPoster=parseOpeningScene(config)?.image;

// These rules and the bootstrap execute in <head>, before any page content paints.
export const openingGateStyles=`
#opening-bootstrap{display:none}
html[data-opening=pending]{overflow:hidden}
html[data-opening=pending] .site-experience{visibility:hidden!important}
html[data-opening=pending] #opening-bootstrap{position:fixed;inset:0;z-index:210;display:grid;place-items:center;overflow:hidden;background:#000;color:#cbe8ff;font-family:system-ui,sans-serif}
html #opening-bootstrap .opening-bootstrap-halo{position:absolute;width:min(70vw,640px);aspect-ratio:1;border-radius:50%;background:radial-gradient(ellipse,#15365366,transparent 65%);animation:opening-bootstrap-breathe 3s ease-in-out infinite alternate!important;pointer-events:none}
.opening-bootstrap-copy{position:relative;text-align:center;padding:24px}
.opening-bootstrap-copy strong{display:block;font-family:Georgia,serif;font-size:clamp(26px,5vw,46px);font-weight:400;letter-spacing:.025em}
.opening-bootstrap-copy p{margin:16px 0 24px;font-size:12px;letter-spacing:.08em;color:#9fb5c9}
html #opening-bootstrap .opening-bootstrap-line{width:140px;height:1px;margin:auto;background:linear-gradient(90deg,transparent,#9ddcff,transparent);animation:opening-bootstrap-breathe 1.6s ease-in-out infinite alternate!important}
#opening-bootstrap-skip{position:absolute;right:24px;top:24px;border:1px solid #d8ebff66;border-radius:30px;background:#07101e;color:#eaf4ff;padding:10px 18px;font:13px system-ui,sans-serif;cursor:pointer}
#opening-bootstrap-skip:focus-visible{outline:3px solid #9ddcff;outline-offset:4px}
.opening-bootstrap-zh{display:none}
html[lang=zh-CN] .opening-bootstrap-en{display:none}
html[lang=zh-CN] .opening-bootstrap-zh{display:inline}
@keyframes opening-bootstrap-breathe{from{opacity:.35;transform:scale(.96)}to{opacity:1;transform:scale(1.04)}}
`;

export const openingBootstrap=`(()=>{
const root=document.documentElement;
root.lang=location.pathname.startsWith('/zh')?'zh-CN':'en';root.dataset.motion='on';
try{root.classList.toggle('dark',localStorage.getItem('yuecheng-theme')==='dark');root.dataset.motion=localStorage.getItem('yuecheng-motion')==='off'?'off':'on'}catch{}
if(!${Boolean(parseOpeningScene(config))})return;
root.dataset.opening='pending';
const release=()=>{if(root.dataset.opening!=='pending')return;root.dataset.opening='skipped';document.dispatchEvent(new Event('opening:skip'))};
const click=e=>{if(e.target instanceof Element&&e.target.closest('#opening-bootstrap-skip'))release()};
const key=e=>{if(e.key==='Escape')release()};
document.addEventListener('click',click);window.addEventListener('keydown',key);
})();`;

export function OpeningGate(){return <div id="opening-bootstrap" role="status" aria-live="polite">
 <div className="opening-bootstrap-halo" aria-hidden="true"/>
 <div className="opening-bootstrap-copy"><strong>Eugene</strong><p><span className="opening-bootstrap-en">Follow the light into my world.</span><span className="opening-bootstrap-zh">循着微光，走进我的世界。</span></p><div className="opening-bootstrap-line" aria-hidden="true"/></div>
 <button type="button" id="opening-bootstrap-skip"><span className="opening-bootstrap-en">Skip intro</span><span className="opening-bootstrap-zh">跳过动画</span></button>
 </div>;}
