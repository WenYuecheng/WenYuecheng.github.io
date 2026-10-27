import { test, expect } from '@playwright/test';
const api='https://wenyuecheng.cn/api/portal';
test('bilingual personal home, real portrait, admission and only two projects',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/zh/');await expect(page.locator('h1')).toContainText('时来天地皆同力');
 await expect(page.getByAltText('温悦成的本人照片')).toBeVisible();
 await expect(page.getByText('已录取 · 2027 年 9 月入学')).toBeVisible();
 await expect(page.locator('.project-card')).toHaveCount(2);
 await expect(page.locator('body')).not.toContainText('EduRAG');
 for(const img of await page.locator('img').all()){await img.scrollIntoViewIfNeeded();await expect(img).toHaveJSProperty('complete',true);expect(await img.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);}
 await page.evaluate(()=>scrollTo(0,0));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/home-${info.project.name}-light.png`,fullPage:true});
 await page.getByRole('button',{name:'切换日夜主题'}).click();await expect(page.locator('html')).toHaveClass('dark');
 await page.screenshot({path:`test-results/home-${info.project.name}-dark.png`,fullPage:true});
 await page.getByRole('button',{name:'开关背景动效'}).click();await expect(page.locator('html')).toHaveAttribute('data-motion','off');
 await page.getByRole('link',{name:'English',exact:true}).click();await expect(page).toHaveURL(/\/$/);await expect(page.locator('h1')).toContainText('With fortune');
 await expect(page.locator('html')).toHaveClass('dark');expect(errors).toEqual([]);
});
test('project list, walkthrough, notes and verified external links',async({page},info)=>{
 await page.goto('/zh/projects/');await expect(page.locator('.project-card')).toHaveCount(2);
 await page.locator('.project-card').first().click();await expect(page).toHaveURL(/\/zh\/projects\/weyra\/$/);
 await expect(page.getByRole('heading',{name:'Weyra',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'2 技能定位',exact:true}).click();await expect(page.locator('.flow-description')).toContainText('歧义时弃权');
 await expect(page.locator('.project-note')).toHaveCount(2);
 await expect(page.locator('#links button').first()).toContainText('GitHub');
 await expect(page.locator('#links')).toContainText('登录后访问');
 await expect(page.locator('.project-detail')).toHaveCSS('background-image',/weyra-cover/);
 await page.screenshot({path:`test-results/weyra-${info.project.name}.png`,fullPage:true});
 await page.getByRole('link',{name:'English',exact:true}).click();await expect(page).toHaveURL('/projects/weyra/');
 await page.goto('/zh/projects/solaceai/');await expect(page.locator('#links button').first()).toContainText('在线体验');
 await expect(page.locator('.project-detail')).toHaveCSS('background-image',/solaceai-cover/);
 await expect(page.locator('#evidence')).toContainText('399 / 400');
});
test('contact leads to a public approved-only wall with sign-in entry',async({page},info)=>{
 await page.route(`${api}/messages`,route=>route.fulfill({json:{messages:[{id:'note-1',name:'A visitor',message:'A thoughtful little corner.',createdAt:'2026-10-26T09:00:00Z'}]}}));
 await page.goto('/zh/contact/');await expect(page.locator('.email-address')).toHaveAttribute('href','mailto:15698557180@163.com');
 await page.screenshot({path:`test-results/contact-${info.project.name}.png`,fullPage:true});
 await page.locator('.guestbook-invitation').click();await expect(page).toHaveURL('/zh/guestbook/');
 await expect(page.getByText('A thoughtful little corner.')).toBeVisible();
 await expect(page.getByRole('link',{name:'登录 / 注册后留言'})).toBeVisible();
 await expect(page.locator('textarea')).toHaveCount(0);
 await page.screenshot({path:`test-results/guestbook-${info.project.name}.png`,fullPage:true});
});
test('selected music, navigation and small cat work',async({page},info)=>{
 await page.goto('/zh/');await expect(page.locator('audio')).toHaveAttribute('src','/music/cant-give-up.mp3');
 await expect(page.locator('.music-copy strong')).toHaveText("Can't Give Up");
 await page.getByRole('button',{name:'和小猫打个招呼'}).click();await expect(page.getByText('你好呀，好奇心在这里永远受欢迎。')).toBeVisible();
 if(info.project.name==='mobile'){await page.getByRole('button',{name:'打开导航'}).click();await page.getByRole('navigation').getByRole('link',{name:'项目',exact:true}).click();}else await page.getByRole('navigation').getByRole('link',{name:'项目',exact:true}).click();
 await expect(page).toHaveURL('/zh/projects/');
});
test('static content remains available without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto('http://127.0.0.1:4321/zh/');await expect(page.locator('h1')).toBeVisible();await expect(page.locator('html')).toHaveAttribute('lang','zh-CN');await expect(page.getByAltText('温悦成的本人照片')).toBeVisible();await context.close();
});
