import {test,expect} from '@playwright/test';
const token='s'.repeat(43),expiresAt=new Date(Date.now()+8*3600_000).toISOString();
const user={id:'same-visitor',email:'reader@school.edu',nickname:'Visitor 12345678',role:'user'};
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('yuecheng-motion','off'));
 await page.route('**/auth/config',r=>r.fulfill({json:{deliveryMode:'smtp',devMailbox:false,privacyVersion:'2026-10-28.2'}}));
});
test('pending email verification survives refresh without sending another code',async({page})=>{
 let sends=0;
 await page.route('**/auth/request-code',r=>{sends++;return r.fulfill({json:{challengeId:'pending-challenge',expiresIn:600,resendAfter:60,deliveryMode:'smtp'}});});
 await page.goto('/zh/auth/');
 await expect(page.locator('input[autocomplete=nickname]')).toHaveCount(0);
 await page.locator('input[type=email]').fill(user.email);await page.getByRole('checkbox').check();await page.getByRole('button',{name:'发送验证码',exact:true}).click();
 await expect(page.locator('.auth-status')).toContainText('验证码已发送');
 await page.reload();await expect(page.locator('input[type=email]')).toHaveValue(user.email);
 await page.getByRole('checkbox').check();
 await expect(page.getByRole('button',{name:/\d+s/})).toBeDisabled();
 await page.route('**/auth/verify',r=>{const body=r.request().postDataJSON();expect(body.challengeId).toBe('pending-challenge');expect(body).not.toHaveProperty('nickname');return r.fulfill({json:{token,expiresAt,user}});});
 await page.getByLabel('邮箱验证码',{exact:true}).fill('123456');await page.getByRole('button',{name:'验证并登录',exact:true}).click();await expect(page).toHaveURL('/zh/guestbook/');expect(sends).toBe(1);
});
test('server cookie can restore a session without a tab token and expires safely',async({page})=>{
 let valid=true;
 await page.route('**/auth/me',r=>valid?r.fulfill({json:{expiresAt,user}}):r.fulfill({status:401,json:{error:'expired'}}));
 await page.goto('/zh/auth/');await expect(page.locator('.account-email')).toHaveText(user.email);
 await page.reload();await expect(page.locator('.account-email')).toHaveText(user.email);
 valid=false;await page.reload();await expect(page.locator('.account-email')).toHaveCount(0);await expect(page.locator('input[type=email]')).toBeVisible();
});
test('rate limit response controls the resend timer',async({page})=>{
 await page.route('**/auth/request-code',r=>r.fulfill({status:429,headers:{'Retry-After':'120','Access-Control-Expose-Headers':'Retry-After'},json:{error:'wait'}}));
 await page.goto('/zh/auth/');await page.locator('input[type=email]').fill(user.email);await page.getByRole('checkbox').check();await page.getByRole('button',{name:'发送验证码',exact:true}).click();
 await expect(page.getByRole('button',{name:/\d+s/})).toBeDisabled();await expect(page.locator('.auth-status')).toContainText('秒');
});
test('cookie-only logout calls the server and cannot silently sign back in on refresh',async({page})=>{
 let logouts=0;
 await page.route('**/auth/me',r=>r.fulfill({json:{expiresAt,user}}));
 await page.route('**/auth/logout',r=>{logouts++;return r.fulfill({status:204});});
 await page.goto('/auth/');await expect(page.locator('.account-email')).toHaveText(user.email);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.locator('input[type=email]')).toBeVisible();
 await expect.poll(()=>logouts).toBe(1);await page.reload();await expect(page.locator('.account-email')).toHaveCount(0);
});
