import {test,expect,type Page} from '@playwright/test';
const home={name:'Verified Owner',portraitAsset:'portrait',contact:{csdn:'https://example.org/blog'},profile:{eyebrow:'Hello',title:'A new chapter',motto:'Stay curious',text:'PRIVATE_PROFILE_BIO',badge:'University',photoAlt:'Private owner portrait',interests:'Interests'},education:{shortName:'EX',startYear:'2030',eyebrow:'Education',title:'Learning',current:'PRIVATE_UNIVERSITY',degree:'CS degree',period:'2023–2027',admission:'Admitted',next:'Graduate school',nextDegree:'CS masters',metrics:['GPA','Average','Rank','IELTS'],values:['4','90','10%','7']},interests:[{title:'Agent',sub:'Systems',body:'Curiosity'}]};
const project={slug:'weyra',tags:['Systems'],coverAsset:'weyra',backdrop:'/images/generated/weyra-cover.webp',accent:'lavender',links:[],title:'Private project',kicker:'A goal',summary:'A short introduction',description:'MEMBER_SUMMARY'};
async function account(page:Page,role:'user'|'admin'){
 await page.addInitScript(()=>{if(sessionStorage.getItem('access-test-seeded'))return;sessionStorage.setItem('access-test-seeded','1');sessionStorage.setItem('yuecheng-account-session',JSON.stringify({token:'a'.repeat(64),expiresAt:'2099-01-01T00:00:00Z'}));});
 await page.route('**/api/portal/**',async r=>{const path=new URL(r.request().url()).pathname.split('/api/portal')[1];
  if(path==='/auth/me')return r.fulfill({json:{user:{id:'reader',email:'reader@example.edu',nickname:'Reader',role},expiresAt:'2099-01-01T00:00:00Z'}});
  if(path==='/content/home')return r.fulfill({json:home});
  if(path==='/content/projects')return r.fulfill({json:{projects:[project]}});
  if(path==='/content/projects/weyra')return r.fulfill({json:{project:role==='admin'?{...project,role:'ADMIN_WORK',architecture:['ADMIN_ARCHITECTURE'],features:[{title:'ADMIN_IMPLEMENTATION',body:'Internal'}],stages:['Input'],walkthrough:['ADMIN_WALKTHROUGH']}:project}});
  if(path.startsWith('/content/assets/'))return r.fulfill({path:'public/images/visitor-fox-original.webp',contentType:'image/webp'});
  if(path==='/auth/logout')return r.fulfill({status:204});
  return r.fulfill({json:{messages:[],page:1,pageSize:12,total:0,totalPages:1}});
 });
}
test.beforeEach(async({page})=>{await page.route('**/opening/scene.json',r=>r.fulfill({json:{enabled:false}}));});
test('anonymous reader has only public identity, avatar, wall and email',async({page})=>{
 await page.goto('/zh/');await expect(page.locator('.hero-signature')).toContainText('Eugene');await expect(page.locator('.portrait-frame img')).toHaveAttribute('src','/images/visitor-fox-original.webp');await expect(page.locator('.academic-metrics')).toHaveCount(0);await expect(page.locator('.selected-projects')).toHaveCount(0);
 await page.goto('/projects/weyra/');await expect(page.locator('.locked-panel')).toBeVisible();await expect(page.locator('.project-detail')).toHaveCount(0);
 await page.goto('/contact/');await expect(page.locator('.email-address')).toHaveCount(0);await expect(page.locator('.social-contact')).toHaveCount(0);
 await page.goto('/guestbook/');await expect(page.locator('#main')).toBeVisible();
});
test('member sees permitted education and projects with the public fox identity, then logout clears private data',async({page})=>{
 await account(page,'user');await page.goto('/');await expect(page.locator('.intro-card')).toContainText('welcome to my website');await expect(page.locator('body')).not.toContainText('PRIVATE_PROFILE_BIO');await expect(page.locator('.academic-metrics')).toBeVisible();await expect(page.locator('.portrait-frame img')).toHaveAttribute('src','/images/visitor-fox-original.webp');
 await page.goto('/projects/weyra/');await expect(page.locator('.detail-intro')).toContainText('MEMBER_SUMMARY');await expect(page.locator('#links')).toBeVisible();await expect(page.locator('#architecture,#implementation,#walkthrough,#evidence,#notes')).toHaveCount(0);
 await page.goto('/auth/');await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.goto('/');await expect(page.locator('.hero-signature')).toContainText('Eugene');await expect(page.locator('.academic-metrics')).toHaveCount(0);
 await page.goBack();await expect(page.locator('body')).not.toContainText('PRIVATE_PROFILE_BIO');
});
test('administrator receives remaining implementation but removed sections never return',async({page})=>{
 await account(page,'admin');await page.goto('/projects/weyra/');await expect(page.locator('#architecture')).toContainText('ADMIN_ARCHITECTURE');await expect(page.locator('#implementation')).toContainText('ADMIN_IMPLEMENTATION');await expect(page.locator('#walkthrough')).toContainText('ADMIN_WALKTHROUGH');await expect(page.locator('#evidence,#notes,.course-grid')).toHaveCount(0);
});
test('pending or failed session never reveals protected data',async({page})=>{
 await page.addInitScript(()=>sessionStorage.setItem('yuecheng-account-session',JSON.stringify({token:'a'.repeat(64),expiresAt:'2099-01-01T00:00:00Z'})));
 await page.route('**/auth/me',async r=>{await new Promise(done=>setTimeout(done,300));await r.fulfill({status:503});});
 await page.goto('/zh/');await expect(page.locator('.hero-signature')).toContainText('Eugene');await expect(page.locator('.academic-metrics')).toHaveCount(0);await page.waitForTimeout(400);await expect(page.locator('.hero-signature')).toContainText('Eugene');
});
