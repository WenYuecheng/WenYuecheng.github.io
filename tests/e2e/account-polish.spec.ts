import {test,expect} from '@playwright/test';
import {privateAccount,privateHome} from './private-fixture';
const expiresAt=new Date(Date.now()+3600000).toISOString(),token='v'.repeat(43);
test.beforeEach(async({page})=>{await page.route('**/opening/scene.json',r=>r.fulfill({json:{enabled:false}}));await page.route('**/auth/config',r=>r.fulfill({json:{deliveryMode:'smtp',devMailbox:false}}));});
test('public copy is simplified and personal GitHub buttons require verification',async({page})=>{
 await page.route(/\/messages(?:\?.*)?$/,r=>r.fulfill({json:{messages:[]}}));
 for(const path of ['/zh/','/zh/contact/','/zh/guestbook/']){
  await page.goto(path);await expect(page.locator('a[href*="github.com/"]')).toHaveCount(0);
  await expect(page.locator('.site-footer')).not.toContainText(/鸣谢|动效参考|XinghuisamaBlogs/);
 }
 await expect(page.locator('.wall-empty')).toHaveText('风把纸页轻轻翻开，等待第一张留言。');
 await expect(page.locator('.wall-signin')).not.toContainText('支持 edu');
 await page.goto('/zh/contact/');await expect(page.locator('.contact-cards .verified-github,.social-contact')).toHaveCount(0);await expect(page.locator('.email-address')).toHaveCount(0);
});
test('administrator leaves nickname blank and goes directly to moderation',async({page})=>{
 let verified=false;
 const user={id:'owner',nickname:'A visitor',email:'owner@example.edu',role:'admin'};
 await page.route('**/auth/me',r=>r.fulfill(verified?{json:{user,expiresAt}}:{status:401}));
 await page.route('**/auth/request-code',r=>r.fulfill({json:{challengeId:'current-challenge',resendAfter:0,deliveryMode:'smtp'}}));
 await page.route('**/auth/verify',r=>{expect(r.request().postDataJSON()).not.toHaveProperty('nickname');verified=true;return r.fulfill({json:{token,expiresAt,user}});});
 await page.route('**/admin/messages?*',r=>r.fulfill({json:{messages:[]}}));
 await page.route('**/admin/updates**',r=>r.fulfill({json:{updates:[],page:1,pageSize:10,total:0,totalPages:1}}));
 await page.route('**/content/home?*',r=>r.fulfill({json:{...privateHome,name:'Eugene'}}));
 await page.goto('/zh/auth/');await page.locator('input[type=email]').fill('owner@example.edu');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'发送验证码'}).click();await page.getByLabel('邮箱验证码').fill('123456');await page.getByRole('button',{name:'验证并登录'}).click();await expect(page).toHaveURL('/zh/admin/');
 await page.locator('.account-control').click();await expect(page.locator('.auth-card h2')).toHaveText('Eugene');
});
test('resending clears old input before using the new challenge',async({page})=>{
 let issued=0;await page.route('**/auth/request-code',r=>r.fulfill({json:{challengeId:`challenge-${++issued}`,resendAfter:0,deliveryMode:'smtp'}}));
 await page.goto('/zh/auth/');await page.locator('input[type=email]').fill('owner@example.edu');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'发送验证码'}).click();await page.getByLabel('邮箱验证码').fill('111111');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'发送验证码'}).click();await expect(page.getByLabel('邮箱验证码')).toHaveValue('');await expect(page.locator('.auth-status')).toContainText('旧码会失效');
});
test('verified profile access resolves through the authenticated API',async({page})=>{
 await privateAccount(page);
 await page.addInitScript(({token,expiresAt})=>sessionStorage.setItem('yuecheng-account-session',JSON.stringify({token,expiresAt})),{token,expiresAt});
 await page.route('**/auth/me',r=>r.fulfill({json:{expiresAt,user:{id:'visitor',email:'v@school.edu',nickname:'Visitor',role:'user'}}}));
 await page.route('**/profile/links/github',r=>{expect(r.request().headers().authorization).toBe(`Bearer ${token}`);return r.fulfill({json:{url:'https://github.com/example-owner'}});});
 await page.route('https://github.com/example-owner',r=>r.fulfill({contentType:'text/html',body:'<h1>Verified destination fixture</h1>'}));
 await page.goto('/contact/');await page.locator('.contact-cards .verified-github').click();await expect(page).toHaveURL('https://github.com/example-owner');
});

test('academic paper surface stays readable and retains its campus illustration',async({page})=>{
 await privateAccount(page);
 await page.goto('/zh/');await expect(page.locator('.education-card')).toHaveCSS('backdrop-filter','none');
 const alpha=await page.locator('.education-card').evaluate(el=>Number(getComputedStyle(el).backgroundColor.match(/[\d.]+/g)?.[3]??1));
 expect(alpha).toBeGreaterThanOrEqual(.5);expect(alpha).toBeLessThan(.85);
 expect(await page.locator('.education-layout').evaluate(el=>getComputedStyle(el,'::before').backgroundImage)).toContain('profile-garden');
});
