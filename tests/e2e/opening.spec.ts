import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const scene={enabled:true,closed:'/images/opening/elf-side-closed.webp',open:'/images/opening/elf-side-open.webp',focusX:62,focusY:45};
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
 await configured(page);await page.goto('/zh/');await expect(page.getByRole('dialog',{name:'精灵开屏动画'})).toBeVisible();
 expect(await page.locator('.site-experience').evaluate(el=>(el as HTMLElement).inert)).toBe(true);
 await expect(page.locator('.opening-open')).toHaveCSS('animation-name','opening-awaken');
 await expect(page.locator('.opening-scene')).toHaveCount(0,{timeout:8000});
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

test('real artwork shows the personal domain without technical keywords and can replay',async({page},info)=>{
 await page.goto('/zh/?intro=preview');await expect(page.locator('.opening-scene')).toBeVisible();
 await expect(page.locator('.opening-site-title')).toHaveText('wenyuecheng.cn');
 await expect(page.locator('.opening-title-block')).not.toContainText(/Agent|RSI|PEFT|DeepSeek/);
 for(const frame of await page.locator('.opening-portrait img').all())expect(await frame.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(1000);
 await page.waitForTimeout(3600);await page.screenshot({path:`test-results/elf-opening-${info.project.name}.png`});
 await page.getByRole('button',{name:'跳过动画'}).click();await page.reload();await expect(page.locator('.opening-scene')).toBeVisible();
});

test('eye light stays on the cropped iris and reveals outward while the character moves',async({page})=>{
 await page.goto('/zh/');await expect(page.locator('.opening-scene')).toBeVisible();
 const eye=page.locator('.opening-eye-light');await expect(eye).toHaveCount(1);
 const measure=async()=>page.locator('.opening-scene').evaluate(el=>{
  const frame=el.querySelector<HTMLImageElement>('.opening-open')!,r=el.getBoundingClientRect(),style=getComputedStyle(el);
  const s=Math.max(r.width/frame.naturalWidth,r.height/frame.naturalHeight);
  return {x:parseFloat(style.getPropertyValue('--opening-eye-x')),y:parseFloat(style.getPropertyValue('--opening-eye-y')),
   expectedX:frame.naturalWidth*s*.845+(r.width-frame.naturalWidth*s)*.87,
   expectedY:frame.naturalHeight*s*.392+(r.height-frame.naturalHeight*s)*.44};
 });
 let point=await measure();expect(point.x).toBeCloseTo(point.expectedX,1);expect(point.y).toBeCloseTo(point.expectedY,1);
 const origin=await page.locator('.opening-portrait').evaluate(el=>getComputedStyle(el).transformOrigin.split(' ').map(parseFloat));
 expect(origin[0]).toBeCloseTo(point.x,1);expect(origin[1]).toBeCloseTo(point.y,1);
 const reveal=()=>page.locator('.opening-darkness').evaluate(el=>parseFloat(getComputedStyle(el).getPropertyValue('--opening-reveal')));
 const before=await reveal();await expect.poll(reveal,{timeout:5700}).toBeGreaterThan(before+80);
 await expect(eye).toHaveCSS('animation-name','opening-eye-ignite');
 await expect(page.locator('.opening-figure')).toHaveCSS('animation-name','opening-breathe');
 await expect(page.locator('.opening-hair-motion')).toHaveCSS('animation-name',/opening-hair-sway/);
 const movement=()=>page.locator('.opening-figure').evaluate(el=>getComputedStyle(el).transform);
 const breathing=await movement();await expect.poll(movement).not.toBe(breathing);
 await page.setViewportSize({width:430,height:740});
 await expect.poll(async()=>{point=await measure();return Math.max(Math.abs(point.x-point.expectedX),Math.abs(point.y-point.expectedY));},{timeout:1500}).toBeLessThan(.05);
 await page.keyboard.press('Escape');await expect(page.locator('.opening-scene')).toHaveCount(0);
});

test('the face turns with closed eyes before an eyelid reveal and blue glow',async({page})=>{
 await page.goto('/zh/');const scene=page.locator('.opening-scene');await expect(scene).toBeVisible();
 await expect(page.locator('.opening-turned')).toHaveAttribute('src','/images/opening/elf-turn-closed.webp');
 const seek=async(time:number)=>scene.evaluate((el,t)=>{for(const a of el.getAnimations({subtree:true})){a.pause();a.currentTime=t;}},time);
 await seek(850);
 await expect(page.locator('.opening-turned')).toHaveCSS('opacity','1');
 const turnStart=await page.locator('.opening-turned').evaluate(el=>getComputedStyle(el).transform);
 await seek(2500);
 await expect(page.locator('.opening-open')).toHaveCSS('opacity','0');
 await expect(page.locator('.opening-half-open')).toHaveCSS('opacity','0');
 await expect(page.locator('.opening-closed')).toHaveCSS('opacity','1');
 await expect(page.locator('.opening-eye-light')).toHaveCSS('opacity','0');
 const darkness=await page.locator('.opening-darkness').evaluate(el=>Number(getComputedStyle(el).opacity));expect(darkness).toBeLessThan(.8);
 expect(await page.locator('.opening-turned').evaluate(el=>getComputedStyle(el).transform)).not.toBe(turnStart);
 await expect(page.locator('.opening-turned')).toHaveCSS('opacity','0');
 await seek(3750);
 await expect(page.locator('.opening-half-open')).toHaveAttribute('src','/images/opening/elf-side-half.webp');
 await expect(page.locator('.opening-half-open')).toHaveCSS('opacity','1');
 await expect(page.locator('.opening-open')).toHaveCSS('opacity','0');
 await seek(4350);
 expect(await page.locator('.opening-open').evaluate(el=>Number(getComputedStyle(el).opacity))).toBeGreaterThan(.8);
 expect(await page.locator('.opening-eye-light').evaluate(el=>Number(getComputedStyle(el).opacity))).toBeGreaterThan(0);
 await page.keyboard.press('Escape');await expect(scene).toHaveCount(0);
});
