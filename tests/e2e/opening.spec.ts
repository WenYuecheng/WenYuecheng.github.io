import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test.use({launchOptions:{args:['--autoplay-policy=no-user-gesture-required']}});
const scene={enabled:true,image:'/images/opening/sunrise-mist.webp',focusX:50,focusY:50,sunX:94,sunY:69};
async function configured(page:import('@playwright/test').Page){
 const image=await readFile('public/images/generated/hero-night.webp');
 await page.route('**/opening/scene.json',r=>r.fulfill({json:scene}));
 await page.route('**/images/opening/*.webp',r=>r.fulfill({body:image,contentType:'image/webp'}));
}
test('unconfigured artwork leaves home directly accessible',async({page})=>{
 await page.route('**/opening/scene.json',r=>r.fulfill({json:{enabled:false}}));
 await page.goto('/zh/');await expect(page.locator('.hero h1')).toBeVisible();await expect(page.locator('.opening-scene')).toHaveCount(0);
 expect(await page.locator('.site-experience').evaluate(el=>(el as HTMLElement).inert)).toBe(false);
});
test('configured frames open, brighten and automatically enter home',async({page})=>{
 await configured(page);await page.goto('/zh/');await expect(page.getByRole('dialog',{name:'晨光水雾开屏动画'})).toBeVisible();
 expect(await page.locator('.site-experience').evaluate(el=>(el as HTMLElement).inert)).toBe(true);
 await expect(page.locator('.opening-art')).toHaveCSS('animation-name','opening-color');
 await expect(page.locator('.opening-scene')).toHaveCount(0,{timeout:12000});
 expect(await page.locator('.site-experience').evaluate(el=>(el as HTMLElement).inert)).toBe(false);
 await expect(page.locator('body')).not.toHaveCSS('overflow','hidden');
});
test('refresh replays the opening while client navigation does not',async({page})=>{
 await configured(page);await page.goto('/zh/');await page.getByRole('button',{name:'跳过动画'}).click();await expect(page.locator('.opening-scene')).toHaveCount(0);
 await page.reload();await expect(page.locator('.opening-scene')).toBeVisible();
 await page.getByRole('button',{name:'跳过动画'}).click();
 await page.locator('.footer-links').getByRole('link',{name:'项目',exact:true}).click();
 await page.locator('.wordmark').click();await expect(page.locator('.hero h1')).toBeVisible();await expect(page.locator('.opening-scene')).toHaveCount(0);
});
test('Escape skips and reduced motion bypasses opening',async({page})=>{
 await configured(page);await page.goto('/');await expect(page.locator('.opening-scene')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('.opening-scene')).toHaveCount(0);
 await page.evaluate(()=>sessionStorage.clear());await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await expect(page.locator('.hero h1')).toBeVisible();await expect(page.locator('.opening-scene')).toHaveCount(0);
});
test('motion preference and image failure never block the site',async({page})=>{
 await configured(page);await page.addInitScript(()=>localStorage.setItem('yuecheng-motion','off'));await page.goto('/zh/');await expect(page.locator('.opening-scene')).toHaveCount(0);
 await page.evaluate(()=>localStorage.removeItem('yuecheng-motion'));
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
 await page.goto('/zh/');const scene=page.locator('.opening-scene');await expect(scene).toBeVisible();
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
 await page.goto('/');const root=page.locator('.opening-scene'),video=page.locator('.opening-video');
 await expect(root).toHaveAttribute('data-media','video');
 await expect.poll(()=>video.evaluate(v=>(v as HTMLVideoElement).currentTime)).toBeGreaterThan(.2);
 expect(await video.evaluate(v=>({muted:(v as HTMLVideoElement).muted,volume:(v as HTMLVideoElement).volume,width:(v as HTMLVideoElement).videoWidth,duration:(v as HTMLVideoElement).duration}))).toMatchObject({muted:false,volume:.65,width:1280});
 expect(await video.evaluate(v=>(v as HTMLVideoElement).duration)).toBeCloseTo(10,1);
 expect(await page.locator('#site-audio').evaluate(a=>(a as HTMLAudioElement).paused)).toBe(true);
 await expect(page.locator('html')).toHaveAttribute('data-opening-sound','playing');
 await page.locator('.opening-sound').click();expect(await video.evaluate(v=>(v as HTMLVideoElement).muted)).toBe(true);
 await page.locator('.opening-sound').click();expect(await video.evaluate(v=>(v as HTMLVideoElement).muted)).toBe(false);
 await page.keyboard.press('Escape');await expect(root).toHaveCount(0);
 await expect.poll(()=>page.locator('#site-audio').evaluate(a=>(a as HTMLAudioElement).paused)).toBe(false);
});

test('a failed video falls back to the glass animation and still enters home',async({page})=>{
 await page.route('**/videos/opening/*.mp4',route=>route.abort());
 await page.goto('/');await expect(page.locator('.opening-scene')).toHaveAttribute('data-media','poster');
 await expect(page.locator('.opening-video')).toBeHidden();
 await expect(page.locator('.opening-scene')).toHaveCount(0,{timeout:14000});await expect(page.locator('.hero h1')).toBeVisible();
});

test('blocked video sound still permits motion and a real click enables the supplied soundtrack',async({page})=>{
 await page.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;let blocked=false;HTMLMediaElement.prototype.play=function(){if(this instanceof HTMLVideoElement&&!this.muted&&!blocked){blocked=true;return Promise.reject(new DOMException('Gesture required','NotAllowedError'));}return play.call(this);};});
 await page.goto('/');await expect(page.locator('.opening-scene')).toHaveAttribute('data-media','video');
 await expect(page.locator('html')).toHaveAttribute('data-opening-sound','blocked');
 await page.locator('.opening-sound').click();await expect(page.locator('html')).toHaveAttribute('data-opening-sound','playing');
 await page.keyboard.press('Escape');
});

test('failure to obtain a canvas context still releases the opening',async({page})=>{
 await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=(()=>null) as typeof HTMLCanvasElement.prototype.getContext;});
 await page.goto('/');await expect(page.locator('.opening-scene')).toBeVisible();
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

test('the early gate releases at its deadline if application scripts never arrive',async({page})=>{
 await page.clock.install();const requests:import('@playwright/test').Route[]=[];
 await page.route('**/_next/static/**/*.js',route=>{requests.push(route);});
 await page.goto('/',{waitUntil:'commit'});await expect(page.locator('#opening-bootstrap')).toBeVisible();
 await page.clock.fastForward(12500);
 await expect(page.locator('html')).toHaveAttribute('data-opening','complete');
 await expect(page.locator('#opening-bootstrap')).toBeHidden();await expect(page.locator('.hero h1')).toBeVisible();
 for(const route of requests)await route.abort();
});


test('slow video remains behind the black centered-name loading screen until a playable frame exists',async({page})=>{
 await page.route('**/videos/opening/*.mp4',async route=>{await new Promise(resolve=>setTimeout(resolve,3000));await route.continue();});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#opening-bootstrap')).toBeVisible();await expect(page.locator('#opening-bootstrap strong')).toHaveText('Eugene');
 await expect(page.locator('.site-experience')).toBeHidden();
 await expect(page.locator('#opening-bootstrap')).toHaveCSS('background-color','rgb(0, 0, 0)');
 await expect(page.locator('.opening-scene')).toHaveAttribute('data-media','video',{timeout:11000});
 await expect(page.locator('#opening-bootstrap')).toBeHidden();
 await page.keyboard.press('Escape');await expect(page.locator('.hero h1')).toBeVisible();
});


test('an explicit intro mute stays muted when entering the home page',async({page})=>{
 await page.goto('/');await expect(page.locator('html')).toHaveAttribute('data-opening-sound','playing');
 await page.locator('.opening-sound').click();await expect(page.locator('html')).toHaveAttribute('data-opening-sound','blocked');
 await page.keyboard.press('Escape');await expect(page.locator('.opening-scene')).toHaveCount(0);
 expect(await page.locator('#site-audio').evaluate(a=>(a as HTMLAudioElement).paused)).toBe(true);
 await page.waitForTimeout(250);expect(await page.locator('#site-audio').evaluate(a=>(a as HTMLAudioElement).paused)).toBe(true);
});
