import {test,expect} from '@playwright/test';
import {privateAccount,privateHome} from './private-fixture';
import {content} from '../../data/site';

test.beforeEach(async({page})=>{
 await page.route('**/opening/scene.json',r=>r.fulfill({json:{enabled:false}}));
});

for(const locale of ['zh','en'] as const)test(`${locale}: welcome and fox identity remain the same for every visitor role`,async({page},info)=>{
 const requests:string[]=[];
 page.on('request',r=>{if(r.url().includes('/content/assets/portrait'))requests.push(r.url());});
 for(const role of ['anonymous','user','admin'] as const){
  if(role==='anonymous')await page.route('**/auth/me',r=>r.fulfill({status:401}));
  else await privateAccount(page,role);
  // A legacy API snapshot must not put withdrawn identity or biography back on screen.
  await page.route('**/content/home?*',r=>r.fulfill({json:{...privateHome,name:'yuechengwen',profile:{...privateHome.profile,text:'WITHDRAWN_OLD_BIO'},education:{...privateHome.education,admission:'已录取旧状态'}}}));
  await page.goto(locale==='zh'?'/zh/':'/');
  if(role!=='anonymous')await expect(page.locator('.academic-metrics')).toBeVisible();
  await expect(page.locator('.hero-subtitle,.hero-intro,.hero-actions,.hero-scroll')).toHaveCount(0);
  await expect(page.locator('.hero h1')).toContainText(locale==='zh'?'窗外是佛罗伦萨':'Outside the window is Florence');
  await expect(page.locator('.hero-signature')).toContainText('Eugene');
  await expect(page.locator('.portrait-card h2')).toHaveText('Eugene');
  await expect(page.locator('.portrait-frame img')).toHaveAttribute('src','/images/visitor-fox-original.webp');
  await expect(page.locator('.intro-card')).toContainText(locale==='zh'?'君子知命不惧':'Knowing my path');
  await expect(page.locator('.intro-card')).toContainText(locale==='zh'?'欢迎光临我的网站':'welcome to my website');
  await expect(page.locator('.intro-card>p')).toHaveCount(1);
  await expect(page.locator('.intro-card')).not.toContainText(locale==='zh'?'乒乓球':'table tennis');
  await expect(page.locator('.admission-status')).toHaveCount(0);
  await expect(page.locator('#interests .interest-card h4')).toHaveText(['Agent','RSI','PEFT']);
  await expect(page.locator('body')).not.toContainText(/yuechengwen|WITHDRAWN_OLD_BIO|已录取旧状态/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(role==='anonymous')await page.locator('#profile').screenshot({path:`test-results/profile-public-${locale}-${info.project.name}.png`,animations:'disabled'});
 }
 await page.locator('#profile').scrollIntoViewIfNeeded();
 await page.screenshot({path:`test-results/profile-privacy-${locale}-${info.project.name}.png`});
});

test('medicine dialogue reveals setup, question and answer on three separate clicks',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>.999999;});
 for(const [locale,turns] of [['zh',['我要去吃药了。','吃的什么药？','你最最最最重要。']],['en',['Time for my medicine.','Which one?','A reminder that you are the most, most, most important person to me.']]] as const){
  await page.goto(locale==='zh'?'/zh/':'/');
  for(let i=0;i<turns.length;i++){
   await page.locator('.companion-button').click();
   await expect(page.locator('.companion-speech-text')).toHaveText(turns[i]);
   await expect(page.locator('.companion-speech small')).toHaveCount(i<turns.length-1?1:0);
  }
 }
});

test('a four-turn conversation survives a timeout and language change without skipping',async({page})=>{
 await page.clock.install();
 await page.addInitScript(()=>{Math.random=()=>102.1/111;});
 await page.goto('/zh/');
 const pet=page.locator('.companion-button');
 await pet.click();await expect(page.locator('.companion-speech-text')).toHaveText('我又长胖了。');
 await page.clock.fastForward(25000);await expect(page.locator('.companion-speech')).toHaveCount(0);
 await pet.click();await expect(page.locator('.companion-speech-text')).toHaveText('真好。');
 await page.locator('.language-control').click();await expect(page).toHaveURL('/');
 await expect(page.locator('.companion-speech-text')).toHaveText('Wonderful.');
 await pet.click();await expect(page.locator('.companion-speech-text')).toHaveText('Why wonderful?');
 await pet.click();await expect(page.locator('.companion-speech-text')).toHaveText('That is a little more of you for me to love.');
 await expect(page.locator('.companion-speech small')).toHaveCount(0);
});

for(const locale of ['zh','en'] as const)test(`${locale}: detailed interests appear only after sign-in and disappear immediately on sign-out`,async({page})=>{
 const note=`MEMBER_ONLY_INTERESTS_${locale} <not-html>`;
 const publicText=content[locale].profile.text.split('\n')[0];
 await page.route('**/auth/me',r=>r.fulfill({status:401}));
 await page.goto(locale==='zh'?'/zh/':'/');
 await expect(page.locator('.intro-card>p')).toHaveCount(1);
 await expect(page.locator('.intro-card>p')).toHaveText(publicText);
 await expect(page.locator('body')).not.toContainText(note);
 await privateAccount(page,'user');
 await page.route('**/content/home?*',r=>r.fulfill({json:{...privateHome,interestsNote:note}}));
 await page.reload();
 await expect(page.locator('.intro-card>p').nth(1)).toHaveText(note);
 await expect(page.locator('.intro-card not-html')).toHaveCount(0);
 await page.evaluate(()=>{localStorage.setItem('eugene-signed-out','1');window.dispatchEvent(new StorageEvent('storage',{key:'eugene-signed-out',newValue:'1'}));});
 await expect(page.locator('.intro-card>p')).toHaveCount(1);
 await expect(page.locator('.intro-card>p')).toHaveText(publicText);
 await expect(page.locator('body')).not.toContainText(note);
 await page.reload();
 await expect(page.locator('.intro-card>p')).toHaveCount(1);
 await expect(page.locator('.intro-card>p')).toHaveText(publicText);
 await expect(page.locator('body')).not.toContainText(note);
});
