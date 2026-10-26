import { test, expect } from '@playwright/test';
const api='https://wenyuecheng.cn/api/portal/messages';
const note={id:'saved-note',name:'Tester',message:'Keep this saved note.',createdAt:'2026-10-26T10:00:00Z'};

for(const outcome of ['stale snapshot','failure'] as const){
 test(`saved note survives a delayed initial GET ${outcome}`,async({page})=>{
  let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve;});
  let started!:()=>void;const requested=new Promise<void>(resolve=>{started=resolve;});
  await page.route(api,async route=>{
   if(route.request().method()==='POST')return route.fulfill({status:201,json:note});
   started();await pending;
   return outcome==='failure'?route.fulfill({status:503,json:{error:'unavailable'}}):route.fulfill({json:{messages:[{...note,id:'old-note',message:'An older note.'}]}});
  });
  await page.goto('/guestbook/');await requested;
  await page.getByLabel('What would you like to say?').fill(note.message);
  await page.getByRole('button',{name:'Pin my note',exact:true}).click();
  await expect(page.getByText('Your note is on the wall. Thank you!')).toBeVisible();
  await expect(page.locator('.pinned-note').filter({hasText:note.message})).toHaveCount(1);
  await expect(page.getByText('Opening the notebook…')).toHaveCount(0);
  const response=page.waitForResponse(r=>r.url()===api&&r.request().method()==='GET');release();await response;
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  if(outcome==='stale snapshot')await expect(page.getByText('An older note.')).toBeVisible();
  await expect(page.locator('.pinned-note').filter({hasText:note.message})).toHaveCount(1);
  await expect(page.getByText('Notes are unavailable right now. You can still reach me by email.')).toHaveCount(0);
 });
}

test('stalled GET offers retry and recovers',async({page})=>{
 await page.clock.install();let getCount=0;
 await page.route(api,async route=>{getCount++;if(getCount===1)return;await route.fulfill({json:{messages:[note]}});});
 await page.goto('/guestbook/');await expect(page.getByText('Opening the notebook…')).toBeVisible();
 await page.clock.fastForward(10001);
 await expect(page.getByRole('button',{name:'Retry loading notes',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Retry loading notes',exact:true}).click();
 await expect(page.getByText(note.message,{exact:true})).toBeVisible();
});

test('stalled POST restores submit and retains the draft',async({page})=>{
 await page.clock.install();let posts=0;
 await page.route(api,async route=>{if(route.request().method()==='GET')return route.fulfill({json:{messages:[]}});posts++;if(posts===1)return;await route.fulfill({status:201,json:note});});
 await page.goto('/guestbook/');await expect(page.getByText('A quiet corner, waiting for the first hello.')).toBeVisible();
 await page.getByLabel('Your name (optional)').fill('Tester');await page.getByLabel('What would you like to say?').fill(note.message);
 await page.getByRole('button',{name:'Pin my note',exact:true}).click();await expect(page.getByRole('button',{name:'Pinning…'})).toBeDisabled();
 await page.clock.fastForward(10001);
 await expect(page.getByText(/request timed out/i)).toBeVisible();
 await expect(page.getByLabel('What would you like to say?')).toHaveValue(note.message);
 await expect(page.getByLabel('Your name (optional)')).toHaveValue('Tester');
 await page.getByRole('button',{name:'Pin my note',exact:true}).click();
 await expect(page.getByText('Your note is on the wall. Thank you!')).toBeVisible();
 await expect(page.getByLabel('What would you like to say?')).toHaveValue('');
});

test('no-JavaScript guestbook explains disabled controls',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
 await page.goto('http://127.0.0.1:4321/guestbook/');
 await expect(page.locator('.no-script-note')).toHaveText('Enable JavaScript to load and send notes. You can also reach me by email.');
 await expect(page.locator('.no-script-note')).toBeVisible();
 await expect(page.getByLabel('Your name (optional)')).toBeDisabled();
 await expect(page.getByLabel('What would you like to say?')).toBeDisabled();
 await expect(page.getByRole('button',{name:'Pin my note',exact:true})).toBeDisabled();
 expect(new URL(page.url()).search).toBe('');await context.close();
});
