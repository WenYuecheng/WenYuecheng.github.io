import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('**/opening/scene.json',r=>r.fulfill({json:{enabled:false}}));});
import {privateAccount} from './private-fixture';
import sharp from 'sharp';

for(const locale of ['en','zh'])test(`${locale}: project, wall and contact scenes change with the theme`,async({page},info)=>{
 test.setTimeout(60000);
 await page.addInitScript(()=>{localStorage.setItem('yuecheng-theme','light');localStorage.setItem('yuecheng-motion','off');});
 await privateAccount(page,'admin');
 await page.route('**/admin/updates**',r=>r.fulfill({json:{updates:[],page:1,pageSize:10,total:0,totalPages:1}}));
 const prefix=locale==='zh'?'/zh':'';
 for(const [path,scene] of [['/projects/','projects'],['/projects/weyra/','projects'],['/projects/solaceai/','projects'],['/guestbook/','wall'],['/contact/','contact'],['/auth/','wall'],['/admin/','wall']]){
  await page.goto(prefix+path);
  for(const theme of ['day','night']){
   const image=page.locator('.route-scenery-art img');
   await expect(image).toHaveJSProperty('complete',true);
   const suffix=info.project.name==='mobile'?'-mobile':'';
   await expect.poll(()=>image.evaluate(e=>(e as HTMLImageElement).currentSrc)).toContain(`${scene}-${theme}${suffix}.webp`);
   await image.evaluate(e=>(e as HTMLImageElement).decode());
   expect(await image.evaluate(e=>(e as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await expect(page.locator('.projects-banner>img,.contact-hero>img,.project-detail-hero>img')).toHaveCount(0);
   if(['/projects/','/guestbook/','/contact/'].includes(path))await page.screenshot({path:`test-results/route-${scene}-${locale}-${info.project.name}-${theme}.png`,animations:'disabled'});
   if(theme==='day')await page.getByRole('button',{name:locale==='zh'?'切换日夜主题':'Switch colour theme',exact:true}).click();
  }
 }
});

test('saved night preference loads only the needed night scene on the other routes',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('yuecheng-theme','dark');localStorage.setItem('yuecheng-motion','off');});
 const loaded:string[]=[];page.on('request',request=>{if(request.url().includes('/images/'))loaded.push(request.url());});
 for(const [path,scene] of [['/projects/','projects'],['/guestbook/','wall'],['/contact/','contact']]){
  loaded.length=0;await page.goto(path);
  await expect(page.locator('.route-scenery-art img')).toHaveAttribute('src',new RegExp(`${scene}-night`));
  const scenes=loaded.filter(url=>url.includes('/images/scenes/'));
  expect(scenes.length).toBeGreaterThan(0);
  expect(scenes.every(url=>url.includes(`${scene}-night`))).toBe(true);
  expect(loaded.some(url=>/generated\/(contact-garden|message-garden|hero-night)/.test(url))).toBe(false);
 }
});

test('contact artwork is painted visibly behind the page',async({page},info)=>{
 test.skip(info.project.name==='mobile','The open desktop scene is a paint probe; mobile sources are checked above.');
 await page.addInitScript(()=>{localStorage.setItem('yuecheng-theme','dark');localStorage.setItem('yuecheng-motion','off');});
 await page.goto('/zh/contact/');
 await page.locator('.route-scenery-art img').evaluate(e=>(e as HTMLImageElement).decode());
 const screenshot=await page.screenshot({path:'test-results/contact-night-public.png',animations:'disabled',scale:'css'});
 const viewport=page.viewportSize()!;
 // This area is open scenery beside the contact heading. A flat paper fallback
 // would pass URL/load assertions but has no painted color variation here.
 const area=await sharp(screenshot).extract({left:Math.floor(viewport.width*.72),top:160,width:Math.floor(viewport.width*.25),height:200}).stats();
 expect(Math.max(...area.channels.slice(0,3).map(channel=>channel.stdev))).toBeGreaterThan(15);
});
