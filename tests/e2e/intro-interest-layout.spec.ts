import {test,expect} from '@playwright/test';
import {privateAccount} from './private-fixture';

test.beforeEach(async({page})=>{
 await page.route('**/opening/scene.json',r=>r.fulfill({json:{enabled:false}}));
});

for(const locale of ['zh','en'] as const){
 test(`${locale} welcome replaces the old research blocks and remains readable`,async({page})=>{
  await privateAccount(page);
  await page.goto(locale==='zh'?'/zh/':'/');
  const intro=page.locator('.intro-card');
  await expect(page.locator('#interests')).toHaveCount(0);
  await expect(intro.locator('.signature-line,.inline-topics')).toHaveCount(0);
  await expect(intro.locator('.interest-card')).toHaveCount(0);
  await expect(intro.locator(':scope > p')).toHaveCount(1);
  await expect(intro).toContainText(locale==='zh'?'欢迎光临我的网站':'welcome to my website');
  const blocks=await page.locator('.intro-card > p,#education').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().top+scrollY));
  expect(blocks).toHaveLength(2);expect(blocks[0]).toBeLessThan(blocks[1]);
  await intro.scrollIntoViewIfNeeded();
  const cards=await intro.locator(':scope > p').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,right:r.right,width:r.width,height:r.height,overflow:n.scrollWidth>n.clientWidth+1};}));
  for(const card of cards){expect(card.x).toBeGreaterThanOrEqual(0);expect(card.right).toBeLessThanOrEqual(page.viewportSize()!.width);expect(card.overflow).toBe(false);}
  await expect(page.locator('.portrait-frame img')).toBeVisible();
  await expect(page.locator('.admission-card')).toContainText('2030');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 });
}

test('a declarative setup and its punchline need separate clicks in both languages',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>43.1/111;});
 await page.goto('/zh/');const pet=page.locator('.companion-button');
 await pet.click();await expect(page.locator('.companion-speech-text')).toHaveText('我变心了。');
 await expect(page.locator('.companion-speech')).not.toContainText('今天的我');
 await pet.click();await expect(page.locator('.companion-speech-text')).toHaveText('今天的我比昨天更喜欢你了。');
 await page.goto('/');
 await pet.click();await expect(page.locator('.companion-speech-text')).toHaveText('My heart has changed.');
 await pet.click();await expect(page.locator('.companion-speech-text')).toHaveText('It likes you even more today than it did yesterday.');
});
