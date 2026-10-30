import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('**/opening/scene.json',r=>r.fulfill({json:{enabled:false}}));});

test('a malformed public updates response leaves the home and bibliography usable',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('yuecheng-motion','off'));
 await page.route(/\/updates(?:\?.*)?$/,r=>r.fulfill({json:{messages:[]}}));
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/zh/');
 await expect(page.locator('.journal-home .updates-status')).toContainText('暂时无法加载动态');
 await expect(page.locator('.hero h1')).toContainText('窗外是佛罗伦萨');
 await expect(page.locator('.reading-card')).toHaveCount(3);
 expect(errors).toEqual([]);
});
