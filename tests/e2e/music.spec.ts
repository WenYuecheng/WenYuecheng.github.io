import { test, expect } from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('**/opening/scene.json',r=>r.fulfill({json:{enabled:false}}));});
test.use({launchOptions:{args:['--autoplay-policy=no-user-gesture-required']}});
const src='/music/cant-give-up.mp3';
async function navigate(page:import('@playwright/test').Page,name:string,mobile:boolean) {
 if(mobile)await page.getByRole('button',{name:'打开导航'}).click();
 await page.getByRole('navigation').getByRole('link',{name,exact:true}).click();
}
test('selected audio decodes, autoplays and keeps playback across pages and language',async({page},info)=>{
 await page.addInitScript(()=>localStorage.setItem('yuecheng-music','off'));
 await page.goto('/zh/');const audio=page.locator('audio');
 await expect(audio).toHaveAttribute('src',src);
 await expect.poll(()=>audio.evaluate(a=>(a as HTMLAudioElement).currentTime)).toBeGreaterThan(0.1);
 expect(await audio.evaluate(a=>(a as HTMLAudioElement).duration)).toBeCloseTo(128.6,0);
 expect(await audio.evaluate(a=>(a as HTMLAudioElement).volume)).toBe(0.25);
 await audio.evaluate(a=>{a.dataset.identity='continuous-audio';});
 const before=await audio.evaluate(a=>(a as HTMLAudioElement).currentTime);
 await navigate(page,'项目',info.project.name==='mobile');await expect(page).toHaveURL('/zh/projects/');
 await expect(audio).toHaveAttribute('data-identity','continuous-audio');
 await expect.poll(()=>audio.evaluate(a=>(a as HTMLAudioElement).currentTime)).toBeGreaterThan(before);
 await page.getByRole('link',{name:'English',exact:true}).click();await expect(page).toHaveURL('/projects/');
 await expect(audio).toHaveAttribute('data-identity','continuous-audio');
 await page.getByRole('button',{name:'Pause music',exact:true}).click();
 await expect.poll(()=>audio.evaluate(a=>(a as HTMLAudioElement).paused)).toBe(true);
 await page.locator('.site-footer').getByRole('link',{name:'Contact',exact:true}).click();
 await expect(page).toHaveURL('/contact/');
 expect(await audio.evaluate(a=>(a as HTMLAudioElement).paused)).toBe(true);
 await page.reload();await expect(page.getByRole('button',{name:'Pause music',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect.poll(()=>audio.evaluate(a=>(a as HTMLAudioElement).currentTime)).toBeGreaterThan(0.1);
});
test('blocked autoplay offers a real user-gesture playback control',async({page})=>{
 await page.addInitScript(()=>{
  const play=HTMLMediaElement.prototype.play;let attempts=0;
  HTMLMediaElement.prototype.play=function(){if(++attempts===1)return Promise.reject(new DOMException('Gesture required','NotAllowedError'));return play.call(this);};
 });
 await page.goto('/zh/');await expect(page.locator('.music-copy small')).toHaveText('点击，让旋律开始');
 await page.getByRole('button',{name:'播放音乐',exact:true}).click();
 await expect.poll(()=>page.locator('audio').evaluate(a=>(a as HTMLAudioElement).currentTime)).toBeGreaterThan(0.1);
 await expect(page.locator('.music-copy small')).toHaveText('ZXXXQ');
});
test('failed audio does not block navigation and can be retried',async({page},info)=>{
 await page.route('**/music/cant-give-up.mp3',route=>route.abort());
 await page.goto('/zh/');await expect(page.locator('.music-copy strong')).toHaveText('暂时无法播放这首音乐');
 await navigate(page,'联系',info.project.name==='mobile');await expect(page).toHaveURL('/zh/contact/');
 await expect(page.locator('.email-address')).toHaveAttribute('href','mailto:15698557180@163.com');
 await page.unroute('**/music/cant-give-up.mp3');await page.getByRole('button',{name:'播放音乐',exact:true}).click();
 await expect.poll(()=>page.locator('audio').evaluate(a=>(a as HTMLAudioElement).currentTime)).toBeGreaterThan(0.1);
 await expect(page.locator('.music-copy strong')).toHaveText("Can't Give Up");
});

test('blocked entry starts on first ordinary click and respects a later pause',async({page})=>{
 await page.addInitScript(()=>{
  const play=HTMLMediaElement.prototype.play;let attempts=0;
  HTMLMediaElement.prototype.play=function(){if(++attempts===1)return Promise.reject(new DOMException('Gesture required','NotAllowedError'));return play.call(this);};
 });
 await page.goto('/zh/');await expect(page.locator('.music-copy small')).toHaveText('点击，让旋律开始');
 await page.locator('.hero-actions').getByRole('link',{name:'看看我的项目'}).click();
 await expect(page).toHaveURL('/zh/projects/');
 await expect.poll(()=>page.locator('audio').evaluate(a=>(a as HTMLAudioElement).currentTime)).toBeGreaterThan(0.1);
 await page.getByRole('button',{name:'暂停音乐',exact:true}).click();
 await page.locator('.site-footer').getByRole('link',{name:'联系',exact:true}).click();
 await expect(page).toHaveURL('/zh/contact/');
 expect(await page.locator('audio').evaluate(a=>(a as HTMLAudioElement).paused)).toBe(true);
});
