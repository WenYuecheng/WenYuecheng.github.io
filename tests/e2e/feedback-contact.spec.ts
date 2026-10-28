import {test,expect} from '@playwright/test';
import {privateAccount,privateHome} from './private-fixture';
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('yuecheng-motion','off'));});
test('anonymous pages reveal only the public social profile',async({page})=>{
 for(const path of ['/','/zh/contact/','/privacy/']){
  await page.goto(path);await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/15698557180|wyc041110/);
  await expect(page.locator('a[href*="xiaohongshu.com/user/profile/"]').first()).toBeAttached();
  await expect(page.locator('.feedback-launcher')).toHaveCount(0);
 }
});
for(const role of ['user','admin'] as const)test(`${role} receives its contact and can send a private issue report`,async({page},info)=>{
 await privateAccount(page,role);const email=role==='admin'?'private@example.com':'contact@example.com';let used=0;
 await page.route('**/content/home?*',r=>r.fulfill({json:{...privateHome,contact:{...privateHome.contact,email}}}));
 await page.route('**/feedback/quota',r=>r.fulfill({json:{remaining:3-used,limit:3,resetsAt:'2030-01-02T00:00:00+08:00'}}));
 await page.route('**/api/portal/feedback',async r=>{const data=r.request().postDataJSON();expect(data.title).toBe('A test display problem');expect(data.message).toContain('The mobile card overlaps');expect(data.requestId).toMatch(/^[a-f0-9]{32}$/);expect(data.recipient).toBeUndefined();used++;await r.fulfill({json:{status:'sent',remaining:3-used,limit:3,resetsAt:'2030-01-02T00:00:00+08:00'}});});
 await page.goto('/contact/');await expect(page.locator('.email-address')).toHaveAttribute('href','mailto:'+email);
 await page.getByRole('button',{name:'Report an issue',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 await page.getByLabel('In a few words').fill('A test display problem');await page.getByLabel('What happened?').fill('The mobile card overlaps after switching languages.');
 await page.screenshot({path:`test-results/feedback-${role}-${info.project.name}.png`});
 await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await page.getByRole('button',{name:'Report an issue',exact:true}).click();await expect(page.getByLabel('In a few words')).toHaveValue('A test display problem');
 await page.getByRole('button',{name:'Send this note',exact:true}).click();await expect(dialog.getByRole('status')).toContainText('Delivered.');expect(used).toBe(1);
 await expect(dialog).toContainText('2 / 3 reports left today');
 await page.getByRole('button',{name:'Close feedback',exact:true}).click();await page.goto('/zh/contact/');await page.getByRole('button',{name:'问题反馈',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('留一封改进的小信');
 await page.getByRole('button',{name:'关闭反馈',exact:true}).click();await page.goto('/auth/');await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.goto('/contact/');await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);await expect(page.locator('.feedback-launcher')).toHaveCount(0);
});
test('feedback failure retains draft and daily limit prevents another submission',async({page})=>{
 await privateAccount(page);let remaining=3;await page.route('**/feedback/quota',r=>r.fulfill({json:{remaining,limit:3,resetsAt:'2030-01-02T00:00:00+08:00'}}));
 await page.route('**/api/portal/feedback',r=>{remaining=2;return r.fulfill({status:503,json:{error:'unavailable'}});});
 await page.goto('/zh/');await page.getByRole('button',{name:'问题反馈',exact:true}).click();await page.getByLabel('一句话描述').fill('手机页面显示有错位');await page.getByLabel('具体发生了什么').fill('在手机打开项目页面切换语言之后，卡片出现了重叠。');await page.getByRole('button',{name:'发送这封信',exact:true}).click();await expect(page.getByRole('dialog').getByRole('status')).toContainText('草稿已保留');await expect(page.getByLabel('一句话描述')).toHaveValue('手机页面显示有错位');await expect(page.getByRole('dialog')).toContainText('今日还可反馈 2 / 3 次');
 await page.route('**/api/portal/feedback',r=>{remaining=0;return r.fulfill({status:429,json:{error:'limit'}});});await page.getByRole('button',{name:'发送这封信',exact:true}).click();await expect(page.getByRole('dialog').getByRole('status')).toContainText('今天的 3 次反馈已用完');await expect(page.getByRole('button',{name:'发送这封信',exact:true})).toBeDisabled();
});

test('night feedback stays within the viewport and keyboard focus stays in the dialog',async({page},info)=>{
 await privateAccount(page);await page.addInitScript(()=>localStorage.setItem('yuecheng-theme','dark'));
 await page.route('**/feedback/quota',r=>r.fulfill({json:{remaining:3,limit:3,resetsAt:'2030-01-02T00:00:00+08:00'}}));
 await page.goto('/zh/contact/');await page.getByRole('button',{name:'问题反馈',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 const bounds=await dialog.boundingBox(),viewport=page.viewportSize()!;expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(viewport.width);expect(bounds!.height).toBeLessThanOrEqual(viewport.height);
 await page.keyboard.press('Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
 await page.screenshot({path:`test-results/feedback-night-${info.project.name}.png`});
 await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();
});

test('an older quota response cannot restore an already consumed allowance',async({page})=>{
 await privateAccount(page);let old:import('@playwright/test').Route|undefined;
 await page.route('**/feedback/quota',r=>{old=r;});await page.route('**/api/portal/feedback',r=>r.fulfill({json:{status:'sent',remaining:2,limit:3,resetsAt:'2030-01-02T00:00:00+08:00'}}));
 await page.goto('/contact/');await page.getByRole('button',{name:'Report an issue',exact:true}).click();await expect.poll(()=>!!old).toBe(true);
 await page.getByLabel('In a few words').fill('A display problem');await page.getByLabel('What happened?').fill('The card overlaps when I switch the language.');await page.getByRole('button',{name:'Send this note',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('2 / 3 reports left today');
 await old!.fulfill({json:{remaining:3,limit:3,resetsAt:'2030-01-02T00:00:00+08:00'}});await expect(page.getByRole('dialog')).toContainText('2 / 3 reports left today');
});
