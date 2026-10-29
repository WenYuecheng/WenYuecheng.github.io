import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('**/auth/config',r=>r.fulfill({json:{mode:'smtp',devMailbox:false}}));await page.route('**/opening/scene.json',r=>r.fulfill({json:{enabled:false}}));});
const hasInk=async(page:import('@playwright/test').Page)=>page.locator('.click-effects').evaluate(el=>{const c=el as HTMLCanvasElement,ctx=c.getContext('2d')!;const rgba=ctx.getImageData(0,0,c.width,c.height).data;for(let i=3;i<rgba.length;i+=4)if(rgba[i]>0)return true;return false;});
test('root stays English for a Chinese browser and supports explicit Chinese',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'language',{value:'zh-CN'}));await page.goto('/');
 await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('.main-nav')).toContainText('Home');await expect(page).toHaveURL('/');
 await page.locator('.language-control').click();await expect(page).toHaveURL('/zh/');await expect(page.locator('html')).toHaveAttribute('lang','zh-CN');
});
test('pointer clicks paint a short ripple and leave controls clickable',async({page},info)=>{
 await page.goto('/');
 if(info.project.name==='mobile')await page.locator('.hero-signature').tap();else await page.locator('.hero-signature').click();
 await expect.poll(()=>hasInk(page)).toBe(true);await expect.poll(()=>hasInk(page),{timeout:2500}).toBe(false);
 await expect(page.locator('.click-effects')).toHaveCSS('pointer-events','none');
 await page.locator('.footer-links').getByRole('link',{name:'Contact',exact:true}).click();await expect(page).toHaveURL('/contact/');
});
test('typing and motion-off preference suppress ripples',async({page})=>{
 await page.goto('/auth/');await page.locator('input[type=email]').click();await expect.poll(()=>hasInk(page)).toBe(false);
 await page.evaluate(()=>document.documentElement.dataset.motion='off');await expect(page.locator('.click-effects')).not.toBeVisible();
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>document.documentElement.dataset.motion='on');await expect(page.locator('.click-effects')).not.toBeVisible();
});
