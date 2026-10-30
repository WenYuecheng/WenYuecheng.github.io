import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const scene={enabled:true,image:'/images/opening/sunrise-mist.webp',focusX:50,focusY:50,sunX:94,sunY:69};
async function configured(page:import('@playwright/test').Page){
 const image=await readFile('public/images/generated/hero-night.webp');
 await page.route('**/opening/scene.json',r=>r.fulfill({json:scene}));
 await page.route('**/images/opening/*.webp',r=>r.fulfill({body:image,contentType:'image/webp'}));
}
async function controlledAutoplay(page:import('@playwright/test').Page){
 await page.addInitScript(()=>{
  const set=Element.prototype.setAttribute;
  Element.prototype.setAttribute=function(name,value){if(this instanceof HTMLVideoElement&&name.toLowerCase()==='autoplay')return;set.call(this,name,value);};
 });
}
test('unconfigured artwork leaves home directly accessible',async({page})=>{
 await page.route('**/opening/scene.json',r=>r.fulfill({json:{enabled:false}}));
 await page.goto('/zh/',{waitUntil:'domcontentloaded'});await expect(page.locator('.hero h1')).toBeVisible();await expect(page.locator('.opening-scene')).toHaveCount(0);
 expect(await page.locator('.site-experience').evaluate(el=>(el as HTMLElement).inert)).toBe(false);
});
test('configured frames open, brighten and automatically enter home',async({page})=>{
 await configured(page);await page.goto('/zh/',{waitUntil:'domcontentloaded'});await expect(page.getByRole('dialog',{name:'晨光水雾开屏动画'})).toBeVisible();
 expect(await page.locator('.site-experience').evaluate(el=>(el as HTMLElement).inert)).toBe(true);
 await expect(page.locator('.opening-art')).toHaveCSS('animation-name','opening-color');
 await expect(page.locator('.opening-scene')).toHaveCount(0,{timeout:12000});
 expect(await page.locator('.site-experience').evaluate(el=>(el as HTMLElement).inert)).toBe(false);
 await expect(page.locator('body')).not.toHaveCSS('overflow','hidden');
});
test('only fresh entry and refresh replay; returning home does not',async({page})=>{
 await configured(page);await page.goto('/zh/',{waitUntil:'domcontentloaded'});await page.locator('.opening-skip').click();await expect(page.locator('.opening-scene')).toHaveCount(0);
 await page.reload();await expect(page.locator('.opening-scene')).toBeVisible();
 await page.locator('.opening-skip').click();
 await page.locator('.footer-links').getByRole('link',{name:'项目',exact:true}).click();
 await page.locator('.wordmark').click();await expect(page.locator('.hero h1')).toBeVisible();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await expect(page.locator('html')).toHaveAttribute('data-opening','complete');await expect(page.locator('.opening-scene')).toHaveCount(0);
});
test('Escape skips only this playback and reduced motion still gets the opening',async({page})=>{
 await configured(page);await page.goto('/',{waitUntil:'domcontentloaded'});await expect(page.locator('.opening-scene')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('.opening-scene')).toHaveCount(0);
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await expect(page.locator('.opening-scene')).toBeVisible();await expect(page.locator('.opening-art')).toHaveCSS('animation-name','opening-color');await page.keyboard.press('Escape');
});
test('saved background motion preference does not bypass the opening and image failure releases the gate',async({page})=>{
 await configured(page);await page.addInitScript(()=>localStorage.setItem('yuecheng-motion','off'));await page.goto('/zh/',{waitUntil:'domcontentloaded'});await expect(page.locator('.opening-scene')).toBeVisible();await expect(page.locator('.opening-art')).toHaveCSS('animation-name','opening-color');await expect(page.locator('html')).toHaveAttribute('data-motion','off');await page.keyboard.press('Escape');
 await page.evaluate(()=>localStorage.removeItem('yuecheng-motion'));
 await page.route('**/opening/scene.json',r=>r.fulfill({json:{...scene,image:'/images/opening/missing-cold-poster.webp'}}));
 await page.route('**/images/opening/*.webp',r=>r.abort());await page.reload();await expect(page.locator('.hero h1')).toBeVisible();await expect(page.locator('.opening-scene')).toHaveCount(0);
 expect(await page.locator('.site-experience').evaluate(el=>(el as HTMLElement).inert)).toBe(false);
});

test('real artwork shows the public identity without technical keywords and can replay',async({page},info)=>{
 await page.goto('/zh/?intro=preview');await expect(page.locator('.opening-scene')).toBeVisible();
 await expect(page.locator('.opening-site-title')).toHaveText('Eugene');
 await expect(page.locator('.opening-title-block')).not.toContainText(/Agent|RSI|PEFT|DeepSeek/);
 for(const frame of await page.locator('.opening-landscape img').all())expect(await frame.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(1000);
 await page.waitForTimeout(3600);await page.screenshot({path:`test-results/mist-opening-${info.project.name}.png`});
 await page.keyboard.press('Escape');await expect(page.locator('.opening-scene')).toHaveCount(0);await page.reload();await expect(page.locator('.opening-scene')).toBeVisible();
});

test('fog clears from the right before the left and completely dissolves, with sunlight anchored to the sun',async({page},info)=>{
 await page.route('**/opening/scene.json',r=>r.fulfill({json:{enabled:true,image:'/images/opening/sunrise-mist.webp',focusX:50,focusY:50,sunX:94,sunY:67}}));
 await page.goto('/zh/',{waitUntil:'domcontentloaded'});const scene=page.locator('.opening-scene');await expect(scene).toBeVisible();
 await expect(scene).toHaveAttribute('data-glass','ready');
 const seek=async(time:number)=>{await scene.evaluate((el,t)=>{for(const a of el.getAnimations({subtree:true})){a.pause();a.currentTime=t;}},time);await page.waitForTimeout(100);};
 const opacity=()=>page.locator('.opening-glass').evaluate(el=>{const c=el as HTMLCanvasElement,ctx=c.getContext('2d')!;return {left:ctx.getImageData(Math.round(c.width*.12),Math.round(c.height*.5),1,1).data[3],right:ctx.getImageData(Math.round(c.width*.88),Math.round(c.height*.5),1,1).data[3],width:c.width,height:c.height};});
 await seek(500);let fog=await opacity();expect(fog.left).toBeGreaterThan(230);expect(fog.right).toBeGreaterThan(230);
 await page.screenshot({path:`test-results/mist-dark-${info.project.name}.png`});
 await seek(3600);await expect.poll(async()=>(await opacity()).right,{timeout:2500}).toBeLessThan(20);fog=await opacity();expect(fog.left).toBeGreaterThan(230);
 await page.screenshot({path:`test-results/mist-wipe-${info.project.name}.png`});
 await seek(8900);fog=await opacity();expect(fog.left).toBe(0);expect(fog.right).toBe(0);expect(fog.width).toBeLessThanOrEqual(1440);expect(fog.height).toBeLessThanOrEqual(1000);
 await page.screenshot({path:`test-results/mist-clear-${info.project.name}.png`});
 const light=await scene.evaluate(el=>{const r=el.getBoundingClientRect(),image=el.querySelector<HTMLImageElement>('.opening-art')!,style=getComputedStyle(el),s=(r.width<=600?Math.min:Math.max)(r.width/image.naturalWidth,r.height/image.naturalHeight);return {x:parseFloat(style.getPropertyValue('--opening-sun-x')),y:parseFloat(style.getPropertyValue('--opening-sun-y')),ex:image.naturalWidth*s*.94+(r.width-image.naturalWidth*s)*.5,ey:image.naturalHeight*s*.67+(r.height-image.naturalHeight*s)*.5};});
 expect(light.x).toBeCloseTo(light.ex,1);expect(light.y).toBeCloseTo(light.ey,1);
 await expect(page.locator('.opening-skip')).toBeInViewport();await expect(page.locator('.opening-sound')).toBeInViewport();
 await expect(page.locator('.opening-title-block')).toBeInViewport();
 await page.keyboard.press('Escape');await expect(scene).toHaveCount(0);
});

test('supplied video plays its original soundtrack without overlapping the site music',async({page})=>{
 // The production static host supports byte ranges; the Python preview does not.
 const audio=await readFile('public/music/cant-give-up.mp3');
 await page.route('**/music/cant-give-up.mp3',route=>{
  const range=/^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range||'');
  if(!range)return route.fulfill({body:audio,contentType:'audio/mpeg',headers:{'Accept-Ranges':'bytes'}});
  const start=Number(range[1]),end=Math.min(range[2]?Number(range[2]):audio.length-1,audio.length-1);
  return route.fulfill({status:206,body:audio.subarray(start,end+1),contentType:'audio/mpeg',headers:{'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${audio.length}`}});
 });
 await page.goto('/',{waitUntil:'domcontentloaded'});const root=page.locator('.opening-scene'),video=page.locator('.opening-video');
 await expect(root).toHaveAttribute('data-media','video');
 await expect.poll(()=>video.evaluate(v=>(v as HTMLVideoElement).currentTime)).toBeGreaterThan(.2);
 if(await video.evaluate(v=>(v as HTMLVideoElement).muted))await page.locator('.opening-sound').click();
 expect(await video.evaluate(v=>({muted:(v as HTMLVideoElement).muted,volume:(v as HTMLVideoElement).volume,width:(v as HTMLVideoElement).videoWidth,duration:(v as HTMLVideoElement).duration}))).toMatchObject({muted:false,volume:.65,width:1280});
 expect(await video.evaluate(v=>(v as HTMLVideoElement).duration)).toBeCloseTo(10,1);
 expect(await page.locator('#site-audio').evaluate(a=>(a as HTMLAudioElement).paused)).toBe(true);
 await expect(page.locator('html')).toHaveAttribute('data-opening-sound','playing');
 await page.locator('.opening-sound').click();expect(await video.evaluate(v=>(v as HTMLVideoElement).muted)).toBe(true);
 await page.locator('.opening-sound').click();expect(await video.evaluate(v=>(v as HTMLVideoElement).muted)).toBe(false);
 await page.keyboard.press('Escape');await expect(root).toHaveCount(0);
 if(await page.locator('#site-audio').evaluate(a=>(a as HTMLAudioElement).paused))await page.getByRole('button',{name:'Play music',exact:true}).click();
 await expect.poll(()=>page.locator('#site-audio').evaluate(a=>(a as HTMLAudioElement).paused)).toBe(false);
});

test('a first-load network error keeps a retry action and recovers the actual video',async({page})=>{
 await page.route('**/videos/opening/*.mp4',route=>route.abort());
 await page.goto('/zh/',{waitUntil:'domcontentloaded'});await expect(page.getByRole('button',{name:'重新加载视频'})).toBeVisible();
 await expect(page.locator('.opening-video')).not.toHaveAttribute('hidden','');
 await page.unroute('**/videos/opening/*.mp4');await page.getByRole('button',{name:'重新加载视频'}).click();
 await expect(page.locator('.opening-scene')).toHaveAttribute('data-media','video');
 await expect.poll(()=>page.locator('.opening-video').evaluate(el=>(el as HTMLVideoElement).currentTime)).toBeGreaterThan(.2);
 await page.keyboard.press('Escape');
});

test('blocked video sound still permits motion and a real click enables the supplied soundtrack',async({page})=>{
 await page.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;let clicked=false;document.addEventListener('click',()=>{clicked=true;},true);HTMLMediaElement.prototype.play=function(){if(this instanceof HTMLVideoElement&&!this.muted&&!clicked)return Promise.reject(new DOMException('Gesture required','NotAllowedError'));return play.call(this);};});
 await page.goto('/',{waitUntil:'domcontentloaded'});await expect(page.locator('.opening-scene')).toHaveAttribute('data-media','video');
 await expect(page.locator('html')).toHaveAttribute('data-opening-sound','blocked');
 await page.locator('.opening-sound').click();await expect(page.locator('html')).toHaveAttribute('data-opening-sound','playing');
 await page.keyboard.press('Escape');
});

test('phone autoplay restrictions keep the real video available with a visible play action',async({page})=>{
 await controlledAutoplay(page);
 await page.addInitScript(()=>{
  localStorage.setItem('yuecheng-motion','off');
  const play=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){return this instanceof HTMLVideoElement?Promise.reject(new DOMException('Low-power autoplay restriction','NotAllowedError')):play.call(this);};
 });
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/zh/',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('button',{name:'点击播放开屏',exact:true})).toBeVisible();
 await expect(page.locator('.opening-video')).not.toHaveAttribute('hidden','');
 await expect(page.locator('.opening-scene')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('.opening-scene')).toHaveCount(0);
});

test('failure to obtain a canvas context still releases the opening',async({page})=>{
 await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=(()=>null) as typeof HTMLCanvasElement.prototype.getContext;});
 await page.goto('/',{waitUntil:'domcontentloaded'});await expect(page.locator('.opening-scene')).toBeVisible();
 await expect(page.locator('.opening-fog-fallback')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('.hero h1')).toBeVisible();
});

test('healthy artwork that takes over 4.5 seconds stays behind the opening gate',async({page})=>{
 const image=await readFile('public/images/generated/hero-night.webp');
 await page.route('**/images/opening/*.webp',async route=>{
  await new Promise(resolve=>setTimeout(resolve,5500));
  await route.fulfill({body:image,contentType:'image/webp'});
 });
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#opening-bootstrap')).toBeVisible();
 await expect(page.locator('.site-experience')).toBeHidden();
 await expect(page.locator('.opening-scene')).toBeVisible({timeout:12000});
 await page.keyboard.press('Escape');await expect(page.locator('.opening-scene')).toHaveCount(0);
});

test('the first painted document is the opening gate even before React downloads',async({page})=>{
 const requests:import('@playwright/test').Route[]=[];
 await page.route('**/_next/static/**/*.js',route=>{requests.push(route);});
 await page.goto('/zh/',{waitUntil:'commit'});
 await expect(page.locator('#opening-bootstrap')).toBeVisible();
 await expect(page.locator('.site-experience')).toBeHidden();
 await expect(page.locator('html')).toHaveAttribute('data-opening','pending');
 await page.locator('#opening-bootstrap-skip').click();
 await expect(page.locator('#opening-bootstrap')).toBeHidden();
 await expect(page.locator('.hero h1')).toBeVisible();
 for(const route of requests)await route.abort();
});

test('slow opening artwork stays above home and hands off without a home flash',async({page})=>{
 const image=await readFile('public/images/generated/hero-night.webp');
 await page.route('**/images/opening/*.webp',async route=>{
  await new Promise(resolve=>setTimeout(resolve,2000));await route.fulfill({body:image,contentType:'image/webp'});
 });
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#opening-bootstrap')).toBeVisible();
 await expect(page.locator('.site-experience')).toBeHidden();
 await expect(page.locator('.opening-scene')).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('data-opening','playing');
 await expect(page.locator('#opening-bootstrap')).toBeHidden();
 await page.keyboard.press('Escape');
 await expect(page.locator('.opening-scene')).toHaveCount(0);
 await expect(page.locator('.hero h1')).toBeVisible();
});

test('slow application scripts cannot silently skip the opening after twelve seconds',async({page})=>{
 await page.clock.install();const requests:import('@playwright/test').Route[]=[];
 await page.route('**/_next/static/**/*.js',route=>{requests.push(route);});
 await page.goto('/',{waitUntil:'commit'});await expect(page.locator('#opening-bootstrap')).toBeVisible();
 await page.clock.fastForward(12500);
 await expect(page.locator('html')).toHaveAttribute('data-opening','pending');
 await expect(page.locator('#opening-bootstrap')).toBeVisible();await expect(page.locator('.site-experience')).toBeHidden();
 await page.locator('#opening-bootstrap-skip').click();await expect(page.locator('.hero h1')).toBeVisible();
 for(const route of requests)await route.abort();
});

test('a slow mobile poster cannot consume the opening before it starts',async({page})=>{
 await page.clock.install();const waiting:import('@playwright/test').Route[]=[];let configured=false;
 const image=await readFile('public/images/generated/hero-night.webp');
 await page.route('**/opening/scene.json',route=>{configured=true;return route.fulfill({json:scene});});
 await page.route('**/images/opening/*.webp',route=>{waiting.push(route);});
 await page.goto('/zh/',{waitUntil:'commit'});await expect.poll(()=>configured).toBe(true);
 await page.clock.fastForward(12500);
 await expect(page.locator('#opening-bootstrap')).toBeVisible();await expect(page.locator('.site-experience')).toBeHidden();
 for(const route of waiting)await route.fulfill({body:image,contentType:'image/webp'});
 await expect(page.locator('.opening-scene')).toBeVisible();await page.keyboard.press('Escape');
});


test('slow video offers a play action while waiting for the first real frame',async({page})=>{
 await page.route('**/videos/opening/*.mp4',async route=>{await new Promise(resolve=>setTimeout(resolve,3000));await route.continue();});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.opening-play-prompt')).toBeVisible();await expect(page.locator('.opening-play-prompt strong')).toHaveText('Eugene');
 await expect(page.locator('.site-experience')).toHaveAttribute('inert','');
 await expect(page.locator('.opening-scene')).toHaveAttribute('data-media','video',{timeout:11000});
 await expect(page.locator('#opening-bootstrap')).toBeHidden();
 await page.keyboard.press('Escape');await expect(page.locator('.hero h1')).toBeVisible();
});


test('an explicit intro mute stays muted when entering the home page',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});await expect(page.locator('.opening-scene')).toHaveAttribute('data-media','video');
 if(await page.locator('.opening-video').evaluate(v=>(v as HTMLVideoElement).muted))await page.locator('.opening-sound').click();
 await expect(page.locator('html')).toHaveAttribute('data-opening-sound','playing');
 await page.locator('.opening-sound').click();await expect(page.locator('html')).toHaveAttribute('data-opening-sound','blocked');
 await page.keyboard.press('Escape');await expect(page.locator('.opening-scene')).toHaveCount(0);
 expect(await page.locator('#site-audio').evaluate(a=>(a as HTMLAudioElement).paused)).toBe(true);
 await page.waitForTimeout(250);expect(await page.locator('#site-audio').evaluate(a=>(a as HTMLAudioElement).paused)).toBe(true);
});


test('browser history cache restoration does not start another opening',async({page})=>{
 await configured(page);await page.goto('/zh/',{waitUntil:'domcontentloaded'});await expect(page.locator('.opening-scene')).toBeVisible();await page.keyboard.press('Escape');
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
 await expect(page.locator('html')).toHaveAttribute('data-opening','complete');await expect(page.locator('.opening-scene')).toHaveCount(0);await expect(page.locator('.site-experience')).not.toHaveAttribute('inert','');
});

test('entering a shared inner-page link also shows the opening and keeps its destination',async({page})=>{
 await configured(page);await page.goto('/zh/reading/');await expect(page.locator('.opening-scene')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page).toHaveURL('/zh/reading/');
 await expect(page.locator('.journal-page')).toBeVisible();
});

test('returning to the home tab from the background does not replay the opening',async({page})=>{
 await configured(page);await page.goto('/zh/',{waitUntil:'domcontentloaded'});await expect(page.locator('.opening-scene')).toBeVisible();await page.keyboard.press('Escape');
 await page.evaluate(()=>{
  Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
  Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));
 });
 await expect(page.locator('.opening-scene')).toHaveCount(0);
});


test('iPhone WeChat starts muted and plays actual video frames on its first visit',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'userAgent',{get:()=> 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0'});
  const play=HTMLMediaElement.prototype.play;
  (window as any).openingPlayAttempts=[];
  HTMLMediaElement.prototype.play=function(){
   if(this instanceof HTMLVideoElement){(window as any).openingPlayAttempts.push(this.muted);if(!this.muted)return Promise.reject(new DOMException('Gesture required','NotAllowedError'));}
   return play.call(this);
  };
 });
 await page.goto('/zh/',{waitUntil:'domcontentloaded'});await expect(page.locator('.opening-scene')).toHaveAttribute('data-media','video');
 expect(await page.evaluate(()=>(window as any).openingPlayAttempts[0])).toBe(true);
 await expect.poll(()=>page.locator('.opening-video').evaluate(el=>(el as HTMLVideoElement).currentTime)).toBeGreaterThan(.3);
 await page.keyboard.press('Escape');
});

test('WeChat bridge readiness can retry a first-load autoplay rejection without replacing the video',async({page})=>{
 await controlledAutoplay(page);
 await page.addInitScript(()=>{
  const play=HTMLMediaElement.prototype.play;(window as any).bridgeReady=false;
  HTMLMediaElement.prototype.play=function(){return this instanceof HTMLVideoElement&&!(window as any).bridgeReady?Promise.reject(new DOMException('Bridge not ready','NotAllowedError')):play.call(this);};
 });
 await page.goto('/zh/',{waitUntil:'domcontentloaded'});await expect(page.getByRole('button',{name:'点击播放开屏',exact:true})).toBeVisible();
 await page.evaluate(()=>{(window as any).bridgeReady=true;document.dispatchEvent(new Event('WeixinJSBridgeReady'));});
 await expect(page.locator('.opening-scene')).toHaveAttribute('data-media','video');
 await expect.poll(()=>page.locator('.opening-video').evaluate(el=>(el as HTMLVideoElement).currentTime)).toBeGreaterThan(.3);
 await page.keyboard.press('Escape');
});

test('a user tap recovers a blocked first load and the intro waits for video playback',async({page},info)=>{
 await controlledAutoplay(page);
 await page.clock.install();
 await page.addInitScript(()=>{
  const play=HTMLMediaElement.prototype.play;(window as any).allowVideo=false;
  document.addEventListener('click',()=>{(window as any).allowVideo=true;},true);
  HTMLMediaElement.prototype.play=function(){return this instanceof HTMLVideoElement&&!(window as any).allowVideo?Promise.reject(new DOMException('Tap required','NotAllowedError')):play.call(this);};
 });
 await page.goto('/zh/',{waitUntil:'domcontentloaded'});const start=page.getByRole('button',{name:'点击播放开屏',exact:true});await expect(start).toBeVisible();
 await page.clock.fastForward(25000);await expect(start).toBeVisible();
 await page.screenshot({path:info.outputPath('wechat-first-load-tap.png')});
 await expect(page.locator('.opening-video')).not.toHaveAttribute('hidden','');
 await start.click();await expect(page.locator('.opening-scene')).toHaveAttribute('data-media','video');
 await expect.poll(()=>page.locator('.opening-video').evaluate(el=>(el as HTMLVideoElement).currentTime)).toBeGreaterThan(.3);
 await page.keyboard.press('Escape');
});
