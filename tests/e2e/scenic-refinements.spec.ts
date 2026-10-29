import {test,expect} from '@playwright/test';
import {privateAccount} from './private-fixture';
test.beforeEach(async({page})=>{await page.route('**/opening/scene.json',r=>r.fulfill({json:{enabled:false}}));});
for(const theme of ['light','dark'])test(`${theme} envelope opens and scenic surfaces span their sections`,async({page},info)=>{
 await privateAccount(page);
 await page.addInitScript(theme=>localStorage.setItem('yuecheng-theme',theme),theme);
 await page.goto('/zh/');
 await expect(page.locator('.hero-envelope')).toBeVisible();
 await page.evaluate(()=>scrollTo({top:280,behavior:'instant'}));
 await expect.poll(()=>page.locator('.hero-envelope').evaluate(el=>Number((el as HTMLElement).style.getPropertyValue('--letter-open')))).toBeGreaterThan(.3);
 const fold=await page.locator('.envelope-flap').evaluate(el=>getComputedStyle(el).transform);
 expect(fold).not.toBe('none');
 await page.screenshot({path:`test-results/envelope-${theme}-${info.project.name}.png`});
 await page.locator('#education').scrollIntoViewIfNeeded();
 expect(await page.locator('.education-layout').evaluate(el=>getComputedStyle(el,'::before').backgroundImage)).toContain('profile-garden');
 await page.locator('.education-layout').screenshot({path:`test-results/campus-${theme}-${info.project.name}.png`});
 await page.evaluate(()=>document.documentElement.dataset.motion='off');
 await expect(page.locator('.envelope-flap')).toHaveCSS('transform','none');
 await page.goto('/zh/projects/weyra/');
 await expect(page.locator('.route-scenery-art img')).toHaveAttribute('src',/projects-(day|night)/);
 await page.goto('/zh/contact/');
 await expect(page.locator('.route-scenery-art img')).toHaveAttribute('src',/contact-(day|night)/);
 expect(await page.locator('.contact-page').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThan(await page.locator('.contact-hero').evaluate(el=>el.getBoundingClientRect().height));
 await page.screenshot({path:`test-results/contact-scenery-${theme}-${info.project.name}.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('reduced motion keeps the envelope still and the letter readable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/zh/');
 await page.evaluate(()=>scrollTo({top:300,behavior:'instant'}));
 await expect(page.locator('.envelope-flap')).toHaveCSS('transform','none');
 await expect(page.locator('.hero h1')).toContainText('窗外是佛罗伦萨');
});

test('poem and signature remain separated from the envelope at short desktop heights',async({page})=>{
 for(const [width,height] of [[1440,900],[1366,768],[1280,720],[1024,600],[390,844]]){
  await page.setViewportSize({width,height});
  for(const locale of ['/','/zh/']){
   await page.goto(locale);await page.evaluate(()=>document.fonts.ready);
   expect(await page.locator('.hero h1 span').evaluateAll(lines=>lines.every(line=>line.scrollWidth<=line.clientWidth+1)),`${width} ${locale}: the complete quote must remain inside the hero`).toBe(true);
   await expect(page.locator('.hero-actions,.hero-scroll,.hero-subtitle,.hero-intro')).toHaveCount(0);
   const gap=await page.evaluate(()=>{
    const quote=document.querySelector('.hero h1')!.getBoundingClientRect();
    const signature=document.querySelector('.hero-signature')!.getBoundingClientRect();
    const envelope=document.querySelector('.hero-envelope')!.getBoundingClientRect();
    return {quoteToSignature:signature.top-quote.bottom,signatureToEnvelope:envelope.top-signature.bottom};
   });
   expect(gap.quoteToSignature,`${width}×${height} ${locale}: signature must clear the poem`).toBeGreaterThanOrEqual(15);
   expect(gap.signatureToEnvelope,`${width}×${height} ${locale}: signature must clear the envelope`).toBeGreaterThanOrEqual(20);
  }
 }
});

test('each full-page scene really moves and respects the motion switch',async({page})=>{
 for(const [path,kind,file] of [['/zh/','home','profile-day'],['/zh/projects/','projects','projects-day'],['/zh/projects/weyra/','weyra','projects-day'],['/zh/projects/solaceai/','solaceai','projects-day'],['/zh/guestbook/','wall','wall-day'],['/zh/contact/','contact','contact-day']]){
  await page.goto(path);await expect(page.locator('.route-scenery')).toHaveAttribute('data-scene',kind);
  const art=page.locator('.route-scenery-art');await expect(art.locator('img')).toHaveAttribute('src',new RegExp(file));
  await expect(art).toHaveCSS('animation-name','route-scenery-drift');
  const before=await art.evaluate(el=>getComputedStyle(el).transform);await page.waitForTimeout(160);
  expect(await art.evaluate(el=>getComputedStyle(el).transform)).not.toBe(before);
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  const coverage=await art.evaluate(el=>{const r=el.getBoundingClientRect();return r.top<=0&&r.left<=0&&r.bottom>=innerHeight&&r.right>=innerWidth;});expect(coverage).toBe(true);
  await page.evaluate(()=>document.documentElement.dataset.motion='off');await expect(art).toHaveCSS('animation-name','none');await expect(page.locator('.route-scenery-motes')).not.toBeVisible();
 }
});
