import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('**/opening/scene.json',r=>r.fulfill({json:{enabled:false}}));});
for(const theme of ['light','dark'])test(`${theme} envelope opens and scenic surfaces span their sections`,async({page},info)=>{
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
 await expect(page.locator('.route-scenery-art')).toHaveCSS('background-image',/weyra-cover/);
 await page.goto('/zh/contact/');
 await expect(page.locator('.route-scenery-art')).toHaveCSS('background-image',/contact-garden/);
 expect(await page.locator('.contact-page').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThan(await page.locator('.contact-hero').evaluate(el=>el.getBoundingClientRect().height));
 await page.screenshot({path:`test-results/contact-scenery-${theme}-${info.project.name}.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('reduced motion keeps the envelope still and the letter readable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/zh/');
 await page.evaluate(()=>scrollTo({top:300,behavior:'instant'}));
 await expect(page.locator('.envelope-flap')).toHaveCSS('transform','none');
 await expect(page.locator('.hero h1')).toContainText('时来天地皆同力');
});

test('hero actions, scroll prompt and envelope remain separated at short desktop heights',async({page})=>{
 for(const [width,height] of [[1440,900],[1366,768],[1280,720],[1024,600],[390,844]]){
  await page.setViewportSize({width,height});
  for(const locale of ['/','/zh/']){
   await page.goto(locale);await page.evaluate(()=>document.fonts.ready);
   const gap=await page.evaluate(()=>{
    const actions=document.querySelector('.hero-actions')!.getBoundingClientRect();
    const prompt=document.querySelector('.hero-scroll')!.getBoundingClientRect();
    const envelope=document.querySelector('.hero-envelope')!.getBoundingClientRect();
    return {actionsToPrompt:prompt.top-actions.bottom,promptToEnvelope:envelope.top-prompt.bottom};
   });
   expect(gap.actionsToPrompt,`${width}×${height} ${locale}: prompt must clear action buttons`).toBeGreaterThanOrEqual(20);
   expect(gap.promptToEnvelope,`${width}×${height} ${locale}: prompt must clear envelope`).toBeGreaterThanOrEqual(20);
  }
 }
});

test('each full-page scene really moves and respects the motion switch',async({page})=>{
 for(const [path,kind,file] of [['/zh/','home','letter-garden'],['/zh/projects/','projects','hero-night'],['/zh/projects/weyra/','weyra','weyra-cover'],['/zh/projects/solaceai/','solaceai','solaceai-cover'],['/zh/guestbook/','wall','message-garden'],['/zh/contact/','contact','contact-garden']]){
  await page.goto(path);await expect(page.locator('.route-scenery')).toHaveAttribute('data-scene',kind);
  const art=page.locator('.route-scenery-art');await expect(art).toHaveCSS('background-image',new RegExp(file));
  await expect(art).toHaveCSS('animation-name','route-scenery-drift');
  const before=await art.evaluate(el=>getComputedStyle(el).transform);await page.waitForTimeout(160);
  expect(await art.evaluate(el=>getComputedStyle(el).transform)).not.toBe(before);
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  const coverage=await art.evaluate(el=>{const r=el.getBoundingClientRect();return r.top<=0&&r.left<=0&&r.bottom>=innerHeight&&r.right>=innerWidth;});expect(coverage).toBe(true);
  await page.evaluate(()=>document.documentElement.dataset.motion='off');await expect(art).toHaveCSS('animation-name','none');await expect(page.locator('.route-scenery-motes')).not.toBeVisible();
 }
});
