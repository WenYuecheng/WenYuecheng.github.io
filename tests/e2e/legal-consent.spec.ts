import{test,expect}from'@playwright/test';
test.beforeEach(async({page})=>{await page.route('**/opening/scene.json',r=>r.fulfill({json:{enabled:false}}));});
import{PRIVACY_VERSION}from'../../data/legal';
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('yuecheng-motion','off'));await page.route('**/auth/config',r=>r.fulfill({json:{deliveryMode:'smtp',devMailbox:false,privacyVersion:PRIVACY_VERSION}}));});
for(const locale of ['en','zh'])test(`${locale}: explicit agreement gates code and signup; both notices remain public`,async({page},info)=>{
 const zh=locale==='zh',prefix=zh?'/zh':'';let sends=0;
 await page.route('**/auth/request-code',r=>{sends++;const body=r.request().postDataJSON();expect(body.privacyAccepted).toBe(true);expect(body.privacyVersion).toBe(PRIVACY_VERSION);return r.fulfill({json:{challengeId:'checked',resendAfter:0,deliveryMode:'smtp'}});});
 await page.route('**/auth/verify',r=>{expect(r.request().postDataJSON().privacyAccepted).toBe(true);expect(r.request().postDataJSON().privacyVersion).toBe(PRIVACY_VERSION);return r.fulfill({status:400,json:{error:'Fixture code'}});});
 await page.goto(prefix+'/auth/');const checkbox=page.getByRole('checkbox'),send=page.getByRole('button',{name:zh?'发送验证码':'Send code',exact:true});await expect(checkbox).not.toBeChecked();await page.locator('input[type=email]').fill('reader@example.edu');await expect(send).toBeDisabled();expect(sends).toBe(0);
 await expect(page.locator('.auth-agreement a')).toHaveCount(2);await expect(page.locator('.auth-agreement a').first()).toHaveAttribute('href',prefix+'/privacy/');await expect(page.locator('.auth-agreement a').last()).toHaveAttribute('href',prefix+'/copyright/');
 await checkbox.check();await send.click();expect(sends).toBe(1);await page.getByLabel(zh?'邮箱验证码':'Email verification code',{exact:true}).fill('123456');await page.getByRole('button',{name:zh?'验证并登录':'Verify and sign in',exact:true}).click();await expect(page.locator('.auth-status')).toBeVisible();
 await page.screenshot({path:`test-results/legal-consent-${locale}-${info.project.name}.png`});
 await checkbox.uncheck();await expect(send).toBeDisabled();await expect(page.getByRole('button',{name:zh?'验证并登录':'Verify and sign in',exact:true})).toBeDisabled();
 await page.goto(prefix+'/privacy/');await expect(page.locator('h1')).toHaveText(zh?'隐私协议':'Privacy agreement');await expect(page.locator('#responsibility strong')).toHaveCount(3);await expect(page.locator('.privacy-sources')).toHaveCount(0);
 await page.goto(prefix+'/copyright/');await expect(page.locator('h1')).toHaveText(zh?'版权说明':'Copyright notice');await expect(page.locator('.privacy-sources')).toContainText('871914611');await expect(page.locator('.privacy-sources a')).toHaveAttribute('href','https://github.com/heiehiehi/XinghuisamaBlogs');await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
});
test('a newer server agreement cannot be accepted using stale frontend text',async({page})=>{
 await page.route('**/auth/config',r=>r.fulfill({json:{deliveryMode:'smtp',devMailbox:false,privacyVersion:'future'}}));await page.goto('/zh/auth/');await page.locator('input[type=email]').fill('reader@example.edu');await page.getByRole('checkbox').check();await expect(page.locator('.auth-agreement')).toContainText('协议已有更新');await expect(page.getByRole('button',{name:'发送验证码',exact:true})).toBeDisabled();
});
