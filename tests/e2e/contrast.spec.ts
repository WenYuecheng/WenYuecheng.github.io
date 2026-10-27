import { test, expect, type Locator } from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('**/opening/scene.json',r=>r.fulfill({json:{enabled:false}}));});
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const luminance=(rgb:number[])=>rgb.map(c=>{const s=c/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;}).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
async function contrast(locator:Locator){
 await locator.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 const foreground=await locator.evaluate(el=>{
  const style=getComputedStyle(el);let opacity=1;
  for(let node:Element|null=el;node;node=node.parentElement)opacity*=Number(getComputedStyle(node).opacity);
  const rgba=style.color.match(/[\d.]+/g)!.map(Number);
  const bounds=el.getBoundingClientRect(),ranges:{x:number;y:number}[]=[];
  const walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let text:Node|null;
  while((text=walk.nextNode())){if(!text.textContent?.trim())continue;const range=document.createRange();range.selectNodeContents(text);for(const rect of range.getClientRects())for(const f of [.3,.5,.7])ranges.push({x:rect.x-bounds.x+rect.width*f,y:rect.y-bounds.y+rect.height/2});}
  return {rgba,opacity,ranges};
 });
 // Keep gradients, translucent glass, backdrop filters and image layers rendered;
 // erase glyphs only, then sample the actual composed background under the text.
 const previous=await locator.evaluate(el=>[el,...el.querySelectorAll('*')].map(node=>{const element=node as HTMLElement;const old=element.getAttribute('style');element.style.setProperty('color','transparent','important');element.style.setProperty('text-shadow','none','important');return old;}));
 const screenshot=await locator.screenshot({animations:'disabled',scale:'css'});
 await locator.evaluate((el,styles)=>[el,...el.querySelectorAll('*')].forEach((node,i)=>{if(styles[i]===null)node.removeAttribute('style');else node.setAttribute('style',styles[i]!);}),previous);
 const {data,info}=await sharp(screenshot).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const ratios:number[]=[];
 for(const point of foreground.ranges){
  const x=Math.max(0,Math.min(info.width-1,Math.floor(point.x))),y=Math.max(0,Math.min(info.height-1,Math.floor(point.y))),offset=(y*info.width+x)*3;
  const bg=[data[offset],data[offset+1],data[offset+2]],alpha=(foreground.rgba[3]??1)*foreground.opacity;
  const fg=foreground.rgba.slice(0,3).map((c,i)=>c*alpha+bg[i]*(1-alpha));
  const light=[luminance(bg),luminance(fg)].sort((a,b)=>b-a);
  ratios.push((light[0]+.05)/(light[1]+.05));
 }
 return Math.min(...ratios);
}

for(const theme of ['light','dark'])test(`${theme} labels and actions meet 4.5 on composed surfaces`,async({page},info)=>{
 await page.addInitScript(theme=>{localStorage.setItem('yuecheng-theme',theme);localStorage.setItem('yuecheng-motion','off');},theme);
 await page.addInitScript(()=>sessionStorage.setItem('yuecheng-account-session',JSON.stringify({token:'t'.repeat(43),expiresAt:new Date(Date.now()+3600000).toISOString()})));
 await page.route('**/auth/me',route=>route.fulfill({json:{user:{id:'test-user',nickname:'Test student',email:'test@university.edu.cn',role:'user'},expiresAt:new Date(Date.now()+3600000).toISOString()}}));
 await page.route('**/messages/mine',route=>route.fulfill({json:{messages:[]}}));
 await page.route(/\/messages(?:\?.*)?$/,route=>route.fulfill({json:{messages:Array.from({length:4},(_,i)=>({id:i,name:'A visitor',message:'A note for contrast checks.',createdAt:'2026-10-26T10:00:00Z'}))}}));
 const results:{page:string;selector:string;ratio:number}[]=[];
 for(const prefix of ['', '/zh'])for(const [path,selectors] of [
  ['/guestbook/',['.wall-heading .section-kicker','.wall-heading>p:last-child','.compose-intro','.wall-message-label>span','.wall-message-label>small','.form-bottom>p','.form-bottom .primary','.pinned-note footer','.signed-author>small']],
  ['/contact/',['.contact-hero .hero-greeting','.contact-hero .wrap>p:last-child','.email-address','.copy-button','.social-contact>span','.guestbook-invitation p:last-child']],
  ['/',['.hero-greeting','.hero-subtitle','.hero-intro','.hero-outline','.hero-contact-link','.hero-scroll','.academic-metrics span','.wordmark small','.intro-card p','.admission-top','.admission-status','.school-header small','.course-grid b','.project-tags span','.site-footer>small','.text-link']],
  ['/projects/',['.page-banner .hero-greeting','.page-banner .wrap>p:last-child']],
  ['/projects/solaceai/',['.project-detail-hero .back-link','.detail-summary','.detail-tags span','.walkthrough-top','.flow-stages button','.flow-description p']],
  ['/projects/weyra/',['.project-detail-hero .back-link','.detail-summary','.detail-tags span','.walkthrough-top','.flow-stages button','.flow-description p']],
 ] as const){
  await page.goto(`${prefix}${path}`);await page.evaluate(()=>document.fonts.ready);
  if(theme==='dark')await expect(page.locator('html')).toHaveClass('dark');
  if(path==='/guestbook/')await page.locator('.note-form textarea').fill('Contrast check');
  for(const selector of selectors){for(const element of await page.locator(selector).all()){
   if(!await element.isVisible())continue;
   const ratio=await contrast(element);results.push({page:`${prefix}${path}`,selector,ratio:Number(ratio.toFixed(2))});
   expect.soft(ratio,`${theme} ${prefix}${path} ${selector}`).toBeGreaterThanOrEqual(4.5);
  }}
 }
 const output=info.outputPath(`contrast-${theme}.json`);await writeFile(output,JSON.stringify(results,null,2));
 await info.attach(`contrast-${theme}.json`,{path:output,contentType:'application/json'});
});
