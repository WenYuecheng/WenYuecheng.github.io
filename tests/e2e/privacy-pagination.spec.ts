import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{await page.route('**/opening/scene.json',r=>r.fulfill({json:{enabled:false}}));});

test('both anonymous languages keep education private and a public identity',async({page})=>{
 for(const path of ['/','/zh/']){await page.goto(path);await expect(page.locator('.hero-signature')).toContainText('Eugene');await expect(page.locator('.wordmark')).toContainText('Eugene');await expect(page.locator('.academic-metrics')).toHaveCount(0);await expect(page.locator('.selected-projects')).toHaveCount(0);}
 for(const width of [320,390]){await page.setViewportSize({width,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});

test('wall pages keep older messages accessible and long words wrap on narrow screens',async({page})=>{
 let total=73;
 await page.route(/\/messages(?:\?.*)?$/,r=>{
  const u=new URL(r.request().url());const page=Number(u.searchParams.get('page')||1),pageSize=12;
  const effective=Math.min(page,Math.ceil(total/pageSize));
  return r.fulfill({json:{messages:Array.from({length:Math.min(pageSize,total-(effective-1)*pageSize)},(_,i)=>({id:`${(effective-1)*pageSize+i}`,name:'Reader',message:i===0?'长留言与longword'.repeat(35):`Page ${effective}, note ${i}`,createdAt:'2026-10-27T00:00:00Z'})),page:effective,pageSize,total,totalPages:Math.ceil(total/pageSize)}});
 });
 await page.goto('/zh/guestbook/');
 const pager=page.getByRole('navigation',{name:'留言分页'});
 await expect(page.locator('.approved-wall article')).toHaveCount(12);
 const first=page.locator('.approved-wall article').first();
 const collapsed=(await first.locator('p').boundingBox())!.height;
 await first.getByRole('button',{name:'展开全文'}).click();
 await expect(first.getByRole('button',{name:'收起'})).toHaveAttribute('aria-expanded','true');
 expect((await first.locator('p').boundingBox())!.height).toBeGreaterThan(collapsed);
 await first.getByRole('button',{name:'收起'}).click();
 await expect(pager).toContainText('1 / 7');await expect(pager.getByRole('button',{name:'上一页'})).toBeDisabled();
 await pager.getByRole('button',{name:'下一页'}).click();await expect(pager).toContainText('2 / 7');
 await expect(page.locator('.approved-wall')).toContainText('Page 2, note 1');
 await page.getByRole('button',{name:'刷新公开留言'}).click();await expect(pager).toContainText('2 / 7');
 for(let n=3;n<=7;n++){await pager.getByRole('button',{name:'下一页'}).click();await expect(pager).toContainText(`${n} / 7`);}
 await expect(page.locator('.approved-wall article')).toHaveCount(1);await expect(pager.getByRole('button',{name:'下一页'})).toBeDisabled();
 total=60;await page.getByRole('button',{name:'刷新公开留言'}).click();await expect(pager).toContainText('5 / 5');
 await pager.getByRole('button',{name:'上一页'}).click();await expect(pager).toContainText('4 / 5');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
