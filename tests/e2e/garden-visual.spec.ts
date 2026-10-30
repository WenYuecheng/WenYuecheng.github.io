import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('**/opening/scene.json',r=>r.fulfill({json:{enabled:false}}));});

for(const theme of ['light','dark'])for(const locale of ['en','zh']){
 test(`garden surfaces ${locale} ${theme}`,async({page},info)=>{
  await page.addInitScript(theme=>{localStorage.setItem('yuecheng-theme',theme);localStorage.setItem('yuecheng-motion','off');},theme);
  await page.route('**/auth/me',r=>r.fulfill({status:401,json:{error:'Sign in to continue.'}}));
  const prefix=locale==='zh'?'/zh':'';
  for(const [path,scene] of [['/','profile'],['/reading/','reading'],['/updates/','updates']] as const){
   await page.goto(`${prefix}${path}`);
   await expect(page.locator('#main')).toBeVisible();
   const art=page.locator('.route-scenery-art img');
   await expect(art).toHaveJSProperty('complete',true);
   expect(await art.evaluate(e=>(e as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
   const source=await art.evaluate(e=>(e as HTMLImageElement).currentSrc);
   expect(source).toContain(`${scene}-${theme==='dark'?'night':'day'}${info.project.name==='mobile'?'-mobile':''}.webp`);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   expect(await page.locator('.route-scenery-art').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
   await page.screenshot({path:`test-results/garden-${scene}-${locale}-${info.project.name}-${theme}.png`,fullPage:path==='/'});
  }
 });
}

test('all six scenes are represented without eager-loading other routes',async({page})=>{
 const images:string[]=[];page.on('request',r=>{if(r.url().includes('/images/scenes/'))images.push(r.url());});
 await page.addInitScript(()=>localStorage.setItem('yuecheng-motion','off'));
 await page.goto('/reading/');await expect(page.locator('.route-scenery-art img')).toHaveJSProperty('complete',true);
 expect(images.length).toBeGreaterThan(0);
 expect(images.every(url=>url.includes('/reading-day'))).toBe(true);
});

test('a saved night theme requests only its night background on a cold visit',async({page})=>{
 const images:string[]=[];page.on('request',r=>{if(r.url().includes('/images/scenes/'))images.push(r.url());});
 await page.addInitScript(()=>{localStorage.setItem('yuecheng-theme','dark');localStorage.setItem('yuecheng-motion','off');});
 await page.goto('/reading/');
 await expect(page.locator('.route-scenery-art img')).toHaveJSProperty('complete',true);
 await expect(page.locator('html')).toHaveClass('dark');
 expect(images.length).toBeGreaterThan(0);
 expect(images.every(url=>url.includes('/reading-night'))).toBe(true);
});
