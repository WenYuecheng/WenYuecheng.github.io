import {test,expect,type Page} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('**/opening/scene.json',r=>r.fulfill({json:{enabled:false}}));});
const base='**',token='t'.repeat(43),expiresAt=new Date(Date.now()+3600_000).toISOString();
const user={id:'user-1',nickname:'Test student',email:'visitor@university.edu.cn',role:'user'};
const note={id:'note-1',name:user.nickname,message:'A note for the owner.',createdAt:'2026-10-26T10:00:00Z',status:'pending'};
async function signed(page:Page,role='user'){
 await page.addInitScript(({token,expiresAt})=>sessionStorage.setItem('yuecheng-account-session',JSON.stringify({token,expiresAt})),{token,expiresAt});
 await page.route(`${base}/auth/me`,route=>route.fulfill({json:{user:{...user,role},expiresAt}}));
}
test('submitted notes stay private and show pending status to the author',async({page})=>{
 await signed(page);let submitted=false;
 await page.route(/\/messages(?:\?.*)?$/,async route=>{
  if(route.request().method()==='POST'){expect(route.request().headers().authorization).toBe(`Bearer ${token}`);submitted=true;await route.fulfill({status:201,json:{...note,message:route.request().postDataJSON().message}});}
  else await route.fulfill({json:{messages:[]}});
 });
 await page.route(`${base}/messages/mine?**`,route=>route.fulfill({json:{messages:submitted?[{...note,message:'<img src=x onerror=alert(1)>'}]:[]}}));
 await page.goto('/zh/guestbook/');await page.getByLabel('有什么想说的话？').fill('<img src=x onerror=alert(1)>');
 await page.getByRole('button',{name:'提交审核',exact:true}).click();
 await expect(page.getByText('留言已提交，待站主审核后公开展示。')).toBeVisible();
 await expect(page.locator('.own-notes-list')).toContainText('<img src=x onerror=alert(1)>');
 await expect(page.locator('.own-notes-list')).toContainText('待审核');
 await expect(page.locator('.approved-wall .pinned-note')).toHaveCount(0);await expect(page.locator('.own-notes-list img')).toHaveCount(0);
});
test('public refresh removes a note unpublished by the owner',async({page})=>{
 let published=true;await page.route(/\/messages(?:\?.*)?$/,route=>route.fulfill({json:{messages:published?[note]:[]}}));
 await page.goto('/zh/guestbook/');await expect(page.locator('.pinned-note')).toHaveCount(1);
 published=false;await page.getByRole('button',{name:'刷新公开留言'}).click();await expect(page.locator('.pinned-note')).toHaveCount(0);
});
test('stalled public load recovers without exposing a posting form to visitors',async({page})=>{
 await page.clock.install();let recover=false;await page.route(/\/messages(?:\?.*)?$/,route=>{if(!recover)return;return route.fulfill({json:{messages:[note]}});});
 await page.goto('/guestbook/');await page.clock.fastForward(12001);await expect(page.getByText('Notes could not be updated. Please refresh in a moment.')).toBeVisible();
 recover=true;await page.getByRole('button',{name:'Refresh public notes'}).click();await expect(page.locator('.pinned-note')).toHaveCount(1);
 await expect(page.locator('textarea')).toHaveCount(0);
});
test('failed submission keeps the authenticated draft for retry',async({page})=>{
 await signed(page);await page.route(`${base}/messages/mine?**`,r=>r.fulfill({json:{messages:[]}}));
 await page.route(/\/messages(?:\?.*)?$/,r=>r.request().method()==='POST'?r.fulfill({status:503,json:{error:'Unavailable'}}):r.fulfill({json:{messages:[]}}));
 await page.goto('/zh/guestbook/');await page.getByLabel('有什么想说的话？').fill('Keep this draft.');await page.getByRole('button',{name:'提交审核',exact:true}).click();
 await expect(page.getByText('暂时无法完成请求，请稍后重试，已填写的内容会保留。')).toBeVisible();
 await expect(page.getByLabel('有什么想说的话？')).toHaveValue('Keep this draft.');await expect(page.getByRole('button',{name:'提交审核',exact:true})).toBeEnabled();
});
test('regular accounts cannot read the moderation queue',async({page})=>{
 await signed(page);let requests=0;await page.route(`${base}/admin/messages**`,r=>{requests++;return r.fulfill({status:403,json:{error:'Forbidden'}});});
 await page.goto('/zh/admin/');await expect(page.getByRole('heading',{name:'这里仅对站主开放'})).toBeVisible();expect(requests).toBe(0);
});
test('owner approval and unpublishing use authenticated server review actions',async({page})=>{
 await signed(page,'admin');let status='pending';
 await page.route(`${base}/admin/messages?**`,r=>r.fulfill({json:{messages:r.request().url().endsWith(`status=${status}`)?[{...note,status,email:user.email}]:[]}}));
 await page.route(`${base}/admin/messages/${note.id}/review`,r=>{expect(r.request().headers().authorization).toBe(`Bearer ${token}`);status=r.request().postDataJSON().decision;return r.fulfill({json:{...note,status,email:user.email}});});
 await page.goto('/zh/admin/');await expect(page.getByText(note.message)).toBeVisible();await page.getByRole('button',{name:'通过并公开'}).click();await expect(page.getByText('审核结果已保存。')).toBeVisible();await expect(page.locator('.review-card')).toHaveCount(0);
 await page.getByRole('tab',{name:'已通过'}).click();await expect(page.locator('.review-card')).toHaveCount(1);await page.getByRole('button',{name:'拒绝 / 下架'}).click();await expect(page.locator('.review-card')).toHaveCount(0);
});
test('project entry requires sign-in and no direct project URL is exported',async({page})=>{
 await page.goto('/zh/projects/weyra/');await expect(page.locator('#links a')).toHaveCount(0);
 await expect(page.locator('.locked-panel')).toBeVisible();await expect(page.locator('.project-detail')).toHaveCount(0);
 await page.locator('.locked-panel a').click();await expect(page).toHaveURL(/\/zh\/auth\//);
 expect(page.url()).not.toContain('token');
});
test('verified login returns only to a safe local route, not a query-provided external site',async({page})=>{
 await page.route(`${base}/auth/config`,r=>r.fulfill({json:{registration:'edu',deliveryMode:'smtp',devMailbox:false}}));
 await page.route(`${base}/auth/request-code`,r=>r.fulfill({json:{challengeId:'challenge-1',expiresIn:600,resendAfter:60,deliveryMode:'smtp'}}));
 await page.route(`${base}/auth/verify`,r=>r.fulfill({json:{token,expiresAt,user}}));
 await page.route(/\/messages(?:\?.*)?$/,r=>r.fulfill({json:{messages:[]}}));await page.route(`${base}/messages/mine?**`,r=>r.fulfill({json:{messages:[]}}));
 await page.goto('/zh/auth/?next=https://evil.example/');await page.getByLabel('邮箱（教育邮箱或站主邮箱）',{exact:true}).fill(user.email);await page.getByRole('checkbox').check();await page.getByRole('button',{name:'发送验证码'}).click();await page.getByLabel('邮箱验证码').fill('123456');await page.getByRole('button',{name:'验证并登录'}).click();await expect(page).toHaveURL('/zh/guestbook/');
 expect(await page.evaluate(()=>localStorage.getItem('yuecheng-account-session'))).toBeNull();expect(page.url()).not.toContain(token);
});
test('development helper selects the latest resend code and remains clearly local',async({page})=>{
 await page.route(`${base}/auth/config`,r=>r.fulfill({json:{registration:'edu',deliveryMode:'local',devMailbox:true}}));await page.route(`${base}/auth/request-code`,r=>r.fulfill({json:{challengeId:'challenge-1',expiresIn:600,resendAfter:60,deliveryMode:'local'}}));await page.route(`${base}/dev/mailbox?**`,r=>r.fulfill({json:{messages:[{code:'111111'},{code:'222222'}]}}));
 await page.goto('/zh/auth/');await page.getByLabel('邮箱（教育邮箱或站主邮箱）',{exact:true}).fill(user.email);await page.getByRole('checkbox').check();await page.getByRole('button',{name:'发送验证码'}).click();await page.getByRole('button',{name:'查看本地测试验证码'}).click();await expect(page.locator('.local-code')).toHaveText('222222');await expect(page.locator('.local-mailbox')).toContainText('不会发到真实邮箱');
});
test('no-JavaScript wall explains sign-in needs and provides no misleading post form',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto('http://127.0.0.1:4321/guestbook/');await expect(page.locator('.no-script-note')).toContainText('Enable JavaScript');await expect(page.locator('textarea')).toHaveCount(0);await context.close();
});
test('a delayed older public load cannot restore a note after a newer empty snapshot',async({page})=>{
 const older:import('@playwright/test').Route[]=[];let fresh=false,calls=0;
 await page.route(/\/messages(?:\?.*)?$/,async route=>{calls++;if(!fresh){older.push(route);return;}await route.fulfill({json:{messages:[]}});});
 await page.goto('/zh/guestbook/');await expect.poll(()=>older.length).toBeGreaterThan(0);
 fresh=true;const previousCalls=calls;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(()=>calls).toBeGreaterThan(previousCalls);
 await expect(page.getByText('风把纸页轻轻翻开，等待第一张留言。')).toBeVisible();
 for(const route of older)await route.fulfill({json:{messages:[note]}});
 await expect(page.locator('.pinned-note')).toHaveCount(0);
});
test('mailbox identity cannot change during code issuance, local lookup or verification',async({page})=>{
 let issued:import('@playwright/test').Route|undefined,mailbox:import('@playwright/test').Route|undefined,verification:import('@playwright/test').Route|undefined;
 await page.route(`${base}/auth/config`,r=>r.fulfill({json:{registration:'edu',deliveryMode:'local',devMailbox:true}}));
 await page.route(`${base}/auth/request-code`,r=>{issued=r;});await page.route(`${base}/dev/mailbox?**`,r=>{mailbox=r;});await page.route(`${base}/auth/verify`,r=>{verification=r;});
 await page.route(/\/messages(?:\?.*)?$/,r=>r.fulfill({json:{messages:[]}}));await page.route(`${base}/messages/mine?**`,r=>r.fulfill({json:{messages:[]}}));
 await page.goto('/zh/auth/');const email=page.getByLabel('邮箱（教育邮箱或站主邮箱）',{exact:true}),code=page.getByLabel('邮箱验证码');
 await email.fill(user.email);await page.getByRole('checkbox').check();await page.getByRole('button',{name:'发送验证码'}).click();
 await expect(email).toBeDisabled();await expect(page.locator('input[autocomplete=nickname]')).toHaveCount(0);await expect(code).toBeDisabled();
 await issued!.fulfill({json:{challengeId:'challenge-1',expiresIn:600,resendAfter:60,deliveryMode:'local'}});await expect(email).toBeEnabled();await expect(email).toHaveValue(user.email);
 await page.getByRole('button',{name:'查看本地测试验证码'}).click();await expect(email).toBeDisabled();await mailbox!.fulfill({json:{messages:[{code:'222222'}]}});await expect(email).toBeEnabled();
 await code.fill('222222');await page.getByRole('button',{name:'验证并登录'}).click();await expect(email).toBeDisabled();await expect(code).toBeDisabled();
 await verification!.fulfill({json:{token,expiresAt,user}});await expect(page).toHaveURL('/zh/guestbook/');
});
