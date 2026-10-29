import {test,expect,type Page} from '@playwright/test';
import {papers} from '../../data/reading';
import {privateHome} from './private-fixture';

const createdAt='2026-10-28T23:30:00Z';
const note={id:'update-1',body:'整理好的论文已经放上书架。',bodyZh:'整理好的论文已经放上书架。',bodyEn:'The reading shelf is ready.',createdAt,updatedAt:createdAt};
const pageOf=(updates:unknown[],page=1,total=updates.length)=>({updates,page,pageSize:10,total,totalPages:Math.max(1,Math.ceil(total/10))});

async function journalAccount(page:Page,role:'user'|'admin'){
 await page.context().addCookies([{name:'journal-test-session',value:'restorable-admin-session',domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Lax'}]);
 await page.addInitScript(()=>{sessionStorage.setItem('yuecheng-account-session',JSON.stringify({token:'a'.repeat(64),expiresAt:'2099-01-01T00:00:00Z'}));});
 await page.route('**/auth/me',r=>r.fulfill({json:{user:{id:'journal-reader',email:'reader@example.edu',nickname:'Reader',role},expiresAt:'2099-01-01T00:00:00Z'}}));
 await page.route('**/content/home**',r=>r.fulfill({json:privateHome}));
 await page.route('**/content/assets/**',r=>r.fulfill({path:'public/images/visitor-fox-original.webp',contentType:'image/webp'}));
 await page.route('**/admin/messages**',r=>r.fulfill({json:{messages:[]}}));
}


test.beforeEach(async({page})=>{
 await page.route('**/opening/scene.json',r=>r.fulfill({json:{enabled:false}}));
 await page.route('**/auth/me',r=>r.fulfill({status:401}));
 await page.route(/\/updates(?:\?.*)?$/,r=>r.fulfill({json:pageOf([note])}));
});

test('anonymous readers can find every catalog paper without fetching source PDFs',async({page})=>{
 test.setTimeout(90000);
 const sourceRequests:string[]=[];
 page.on('request',r=>{if(/\.pdf(?:\?|$)|arxiv\.org|huggingface\.co|github\.com/.test(r.url()))sourceRequests.push(r.url());});
 await page.goto('/zh/reading/');
 await expect(page.getByRole('heading',{name:'最近读过',exact:true,level:1})).toBeVisible();
 await expect(page.locator('.reading-card')).toHaveCount(12);
 await expect(page.locator('.reading-count')).toContainText(String(papers.length));
 const pager=page.getByRole('navigation',{name:'论文分页'});
 await expect(pager).toContainText('1 / 4');
 await pager.getByRole('button',{name:'下一页'}).click();
 await expect(pager).toContainText('2 / 4');
 const search=page.getByRole('searchbox',{name:'搜索论文'});
 for(const paper of papers){
  await search.fill(paper.title);
  const card=page.locator('.reading-card').filter({has:page.getByRole('heading',{name:paper.title,exact:true})});
  await expect(card).toBeVisible();
  await expect(card.locator('.paper-summary')).toHaveText(paper.summary.zh);
  if(paper.paperDate){
   await expect(card.locator('.paper-meta time')).toHaveAttribute('dateTime',paper.paperDate);
   await expect(card.locator('.paper-meta time')).toHaveText(new Date(paper.paperDate).toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Shanghai'}));
  }else{
   await expect(card.locator('.paper-meta time')).toHaveCount(0);
   await expect(card.locator('.paper-meta')).toContainText(String(paper.year));
  }
  await expect(card.locator('.paper-link')).toHaveAttribute('href',paper.url);
  await expect(card.locator('.paper-link')).toHaveAttribute('target','_blank');
 }
 await search.fill(papers[0].summary.zh.slice(0,10));
 await expect(page.getByRole('heading',{name:papers[0].title,exact:true})).toBeVisible();
 await search.fill('');
 const topic=page.getByRole('combobox',{name:'论文主题'});
 await topic.selectOption('Memory');
 for(const tags of await page.locator('.reading-card .paper-tags').allTextContents())expect(tags).toContain('Memory');
 await expect(page.locator('iframe,embed,object')).toHaveCount(0);
 expect(sourceRequests).toEqual([]);
});

test('public updates paginate, preserve plain text and use Beijing dates',async({page})=>{
 const requests:string[]=[];
 await page.route(/\/updates(?:\?.*)?$/,r=>{
  requests.push(r.request().headers().authorization||'');
  const current=Number(new URL(r.request().url()).searchParams.get('page')||1);
  return r.fulfill({json:pageOf([{...note,id:`update-${current}`,body:current===1?'<script>window.bad=true</script>\n公开动态':'较早的一则动态'}],current,11)});
 });
 await page.goto('/zh/updates/');
 await expect(page.locator('.update-card')).toContainText('<script>window.bad=true</script>');
 await expect(page.locator('.update-card time').first()).toContainText('2026年10月29日');
 await expect(page.locator('.update-card')).toContainText('Eugene');
 const pager=page.getByRole('navigation',{name:'动态分页'});
 await pager.getByRole('button',{name:'下一页'}).click();
 await expect(page.locator('.update-card')).toContainText('较早的一则动态');
 expect(await page.evaluate(()=>Object.hasOwn(window,'bad'))).toBe(false);
 expect(requests.every(header=>header==='')).toBe(true);
 await expect(page.locator('.updates-form')).toHaveCount(0);
});

test('English reading search includes translated summaries and topic keywords',async({page})=>{
 await page.goto('/reading/');
 await expect(page.getByRole('heading',{name:'Reading',exact:true,level:1})).toBeVisible();
 const search=page.getByRole('searchbox',{name:'Search papers'});
 await search.fill(papers[0].summary.en.slice(0,30));
 await expect(page.getByRole('heading',{name:papers[0].title,level:2,exact:true})).toBeVisible();
 await expect(page.locator('.paper-summary')).toHaveText(papers[0].summary.en);
 await expect(page.locator('.paper-meta time')).toHaveText(new Date(papers[0].paperDate!).toLocaleDateString('en-GB',{year:'numeric',month:'short',day:'numeric',timeZone:'Asia/Shanghai'}));
 await search.fill('Memory');
 await expect(page.locator('.reading-card').first()).toBeVisible();
 await search.fill('there-is-no-paper-with-this-phrase');
 await expect(page.locator('.reading-card')).toHaveCount(0);
 await expect(page.locator('.journal-empty')).toContainText('No papers found');
});

test('home contains three recent reading cards and three public updates',async({page})=>{
 await page.route(/\/updates(?:\?.*)?$/,r=>{
  expect(new URL(r.request().url()).searchParams.get('pageSize')).toBe('3');
  return r.fulfill({json:pageOf(Array.from({length:3},(_,i)=>({...note,id:`home-${i}`})))});
 });
 await page.goto('/zh/');
 const home=page.locator('.journal-home');
 await expect(home.locator('.reading-card')).toHaveCount(3);
 await expect(home.locator('.update-card')).toHaveCount(3);
 await expect(home.locator('.paper-title').first()).toHaveText([...papers].sort((a,b)=>b.addedAt.localeCompare(a.addedAt))[0].title);
});

test('member and unavailable sessions cannot load the updates editor',async({page})=>{
 await journalAccount(page,'user');
 let adminRequests=0;
 await page.route('**/admin/updates**',r=>{adminRequests++;return r.fulfill({status:403});});
 await page.goto('/zh/admin/');
 await expect(page.locator('.access-panel')).toBeVisible();
 await expect(page.getByRole('link',{name:'返回留言墙',exact:true})).toBeVisible();
 await expect(page.locator('.updates-form')).toHaveCount(0);
 expect(adminRequests).toBe(0);
 await page.route('**/auth/me',r=>r.fulfill({status:503}));
 await page.reload();
 await expect(page.getByRole('link',{name:'登录站主账号',exact:true})).toBeVisible();
 await expect(page.locator('.updates-form')).toHaveCount(0);
 expect(adminRequests).toBe(0);
});

async function mockAdmin(page:Page){
 await journalAccount(page,'admin');
 let records=[{...note}],failNext=false,nextId=2;
 const mutations:{method:string;body:unknown}[]=[];
 const writeAuthorizations:(string|undefined)[]=[];
 const readAuthorizations:(string|undefined)[]=[];
 await page.route('**/admin/updates**',async r=>{
  const method=r.request().method(),headers=await r.request().allHeaders();
  expect(headers.authorization===`Bearer ${'a'.repeat(64)}`||headers.cookie?.includes('journal-test-session=restorable-admin-session')).toBe(true);
  if(method==='GET'){readAuthorizations.push(headers.authorization);return r.fulfill({json:pageOf(records)});}
  writeAuthorizations.push(headers.authorization);
  mutations.push({method,body:r.request().postDataJSON()});
  if(failNext){failNext=false;return r.fulfill({status:503});}
  const id=decodeURIComponent(new URL(r.request().url()).pathname.split('/').at(-1)!);
  if(method==='DELETE'){records=records.filter(record=>record.id!==id);return r.fulfill({status:204});}
  const body=r.request().postDataJSON();
  const existing=method==='POST'?{...note,id:`update-${nextId++}`} : records.find(record=>record.id===id);
  if(!existing)return r.fulfill({status:404});
  const updated={...existing,...body,body:body.bodyZh,updatedAt:'2026-10-29T01:30:00Z'};
  records=method==='POST'?[updated,...records]:records.map(record=>record.id===id?updated:record);
  return r.fulfill({json:updated});
 });
 return {mutations,writeAuthorizations,readAuthorizations,fail:()=>{failNext=true;}};
}

test('admin publishes, edits without changing creation date and confirms deletion inline',async({page})=>{
 const {mutations,writeAuthorizations}=await mockAdmin(page);
 await page.goto('/zh/admin/');
 const admin=page.locator('.updates-admin');
 await expect(admin.getByRole('heading',{name:'发布动态',exact:true})).toBeVisible();
 await admin.getByLabel('中文正文',{exact:true}).fill('新的学习记录');
 await admin.getByLabel('English (optional)',{exact:true}).fill('A new study note');
 await admin.getByRole('button',{name:'发布动态',exact:true}).click();
 await expect(admin.locator('.update-card').first()).toContainText('新的学习记录');
 expect(mutations[0]).toEqual({method:'POST',body:{bodyZh:'新的学习记录',bodyEn:'A new study note'}});
 const original=admin.locator('.update-card').filter({hasText:note.bodyZh});
 await original.getByRole('button',{name:'编辑',exact:true}).click();
 await admin.getByLabel('中文正文',{exact:true}).fill('修改后的学习记录');
 await admin.getByRole('button',{name:'保存修改',exact:true}).click();
 const edited=admin.locator('.update-card').filter({hasText:'修改后的学习记录'});
 await expect(edited).toBeVisible();
 await expect(edited.locator('time').first()).toHaveAttribute('dateTime',createdAt);
 await expect(admin.locator('.update-card').filter({hasText:'新的学习记录'})).toBeVisible();
 await expect(admin.locator('.update-card')).toHaveCount(2);
 await edited.getByRole('button',{name:'删除',exact:true}).click();
 expect(mutations.filter(m=>m.method==='DELETE')).toHaveLength(0);
 await edited.getByRole('button',{name:'取消',exact:true}).click();
 await expect(admin.getByRole('button',{name:'确认删除',exact:true})).toHaveCount(0);
 await edited.getByRole('button',{name:'删除',exact:true}).click();
 await edited.getByRole('button',{name:'确认删除',exact:true}).click();
 await expect(edited).toHaveCount(0);
 await expect(admin.locator('.update-card')).toHaveCount(1);
 await expect(admin.locator('.update-card').filter({hasText:'新的学习记录'})).toBeVisible();
 expect(mutations.at(-1)).toEqual({method:'DELETE',body:{}});
 expect(writeAuthorizations).toEqual(Array(3).fill(`Bearer ${'a'.repeat(64)}`));
});

test('failed publish and edit retain both language drafts',async({page})=>{
 const mock=await mockAdmin(page);
 await page.goto('/zh/admin/');
 const admin=page.locator('.updates-admin'),zh=admin.getByLabel('中文正文',{exact:true}),en=admin.getByLabel('English (optional)',{exact:true});
 await zh.fill('失败也要保留的草稿');await en.fill('Retain this draft');mock.fail();
 await admin.getByRole('button',{name:'发布动态',exact:true}).click();
 await expect(admin.locator('.updates-status')).toContainText('已填写的内容会保留');
 await expect(zh).toHaveValue('失败也要保留的草稿');await expect(en).toHaveValue('Retain this draft');
 await admin.getByRole('button',{name:'编辑',exact:true}).click();
 await zh.fill('编辑失败的草稿');await en.fill('Retain this edit');mock.fail();
 await admin.getByRole('button',{name:'保存修改',exact:true}).click();
 await expect(admin.locator('.updates-status')).toContainText('已填写的内容会保留');
 await expect(zh).toHaveValue('编辑失败的草稿');await expect(en).toHaveValue('Retain this edit');
 await expect(admin.locator('.update-card')).toContainText(note.bodyZh);
 await admin.getByRole('button',{name:'删除',exact:true}).click();mock.fail();
 await admin.getByRole('button',{name:'确认删除',exact:true}).click();
 await expect(admin.locator('.updates-status')).toContainText('已填写的内容会保留');
 await expect(zh).toHaveValue('编辑失败的草稿');await expect(en).toHaveValue('Retain this edit');
 await expect(admin.locator('.update-card')).toContainText(note.bodyZh);
});

test('session recheck hides controls and preserves the same admin draft, while identity changes and logout clear it',async({page})=>{
 const {readAuthorizations}=await mockAdmin(page);
 await page.goto('/zh/admin/');
 const admin=page.locator('.updates-admin'),zh=admin.getByLabel(/中文正文/),en=admin.getByLabel(/English \(optional\)/);
 await zh.fill('切换标签后仍在的草稿');await en.fill('Draft survives a session recheck');
 let release!:()=>void;
 const pending=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/auth/me',async r=>{await pending;return r.fulfill({json:{user:{id:'journal-reader',email:'reader@example.edu',nickname:'Reader',role:'admin'},expiresAt:'2099-01-01T00:00:00Z'}});});
 const recheck=page.waitForRequest('**/auth/me');
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await recheck;
 await expect(zh).toBeHidden();
 release();
 await expect(zh).toBeVisible();
 await expect(zh).toHaveValue('切换标签后仍在的草稿');await expect(en).toHaveValue('Draft survives a session recheck');
 await page.route('**/auth/me',r=>r.fulfill({json:{user:{id:'different-admin',email:'other@example.edu',nickname:'Another owner',role:'admin'},expiresAt:'2099-01-01T00:00:00Z'}}));
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await expect(zh).toHaveValue('');await expect(en).toHaveValue('');
 await zh.fill('退出时需要清除的草稿');
 await page.evaluate(()=>{localStorage.setItem('eugene-signed-out','1');window.dispatchEvent(new StorageEvent('storage',{key:'eugene-signed-out',newValue:'1'}));});
 await expect(admin).toHaveCount(0);
 const restored=page.waitForResponse(response=>response.url().includes('/admin/updates')&&response.request().method()==='GET');
 await page.evaluate(()=>{localStorage.removeItem('eugene-signed-out');window.dispatchEvent(new StorageEvent('storage',{key:'eugene-signed-out',newValue:null}));});
 await restored;
 await expect(zh).toHaveValue('');
 expect(readAuthorizations.at(-1)).toBeUndefined();
});
