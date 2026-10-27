import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.route('**/opening/scene.json',r=>r.fulfill({json:{enabled:false}}));
 // Deterministic draws select entry 1, then entry 2 (immediate repeats are excluded).
 await page.addInitScript(()=>{Math.random=()=>0;});
});

test('approved mascot asks first and reveals the answer only on the next click',async({page})=>{
 await page.goto('/zh/');
 const pet=page.locator('.companion-button');
 await expect(pet).toBeVisible();
 await expect(pet.locator('img')).toHaveAttribute('src','/images/companion/pink-front-pen.webp');
 await expect(pet.locator('img')).toHaveJSProperty('naturalWidth',640);
 await expect(page.locator('.cat-head')).toHaveCount(0);
 await pet.click();
 await expect(page.locator('.companion-speech-text')).toHaveText('咱俩都挺过分的。');
 await pet.click();
 await expect(page.locator('.companion-speech-text')).toHaveText('你过分美丽，我过分着迷。');
 await pet.click();
 await expect(page.locator('.companion-speech-text')).toHaveText('你知道你很像一款游戏吗？');
 await expect(page.locator('.companion-speech')).not.toContainText('我的世界');
 await pet.click();
 await expect(page.locator('.companion-speech-text')).toHaveText('我的世界。');
});

test('dragging moves the mascot without speaking and keeps it inside the viewport',async({page})=>{
 await page.goto('/zh/');
 const pet=page.locator('.companion-button');const box=await pet.boundingBox();expect(box).not.toBeNull();
 await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);
 await page.mouse.down();await page.mouse.move(30,150,{steps:8});await page.mouse.up();
 const moved=await pet.boundingBox();expect(moved!.x).toBeLessThan(box!.x-50);
 await expect(page.locator('.companion-speech')).toHaveCount(0);
 await pet.click();await expect(page.locator('.companion-speech')).toBeVisible();
 const speech=await page.locator('.companion-speech').boundingBox();
 const viewport=page.viewportSize()!;expect(speech!.x).toBeGreaterThanOrEqual(0);expect(speech!.x+speech!.width).toBeLessThanOrEqual(viewport.width);
 expect(speech!.y).toBeGreaterThanOrEqual(0);expect(speech!.y+speech!.height).toBeLessThanOrEqual(viewport.height);
 await page.setViewportSize({width:320,height:568});
 await expect.poll(async()=>{const r=await pet.boundingBox();return r!.x>=0&&r!.y>=0&&r!.x+r!.width<=320&&r!.y+r!.height<=568;}).toBe(true);
});

test('English dialogue, keyboard movement, reset and motion preference work',async({page})=>{
 await page.goto('/');const pet=page.locator('.companion-button');
 await pet.focus();await page.keyboard.press('Enter');
 await expect(page.locator('.companion-speech-text')).toHaveText("We're both a little too much.");
 await page.keyboard.press('Space');
 await expect(page.locator('.companion-speech-text')).toHaveText("You're too beautiful, and I'm too captivated.");
 await page.keyboard.press('Enter');
 await expect(page.locator('.companion-speech-text')).toHaveText('Do you know which game you remind me of?');
 await page.keyboard.press('Enter');
 await expect(page.locator('.companion-speech-text')).toHaveText("Minecraft. Because you're my whole world.");
 const before=await pet.boundingBox();await page.keyboard.press('ArrowLeft');
 await expect.poll(async()=>Math.round((await pet.boundingBox())!.x)).toBeLessThan(Math.round(before!.x));
 await page.keyboard.press('Home');await expect.poll(async()=>Math.round((await pet.boundingBox())!.x)).toBe(Math.round(before!.x));
 await page.keyboard.press('Escape');await expect(page.locator('.companion-speech')).toHaveCount(0);
 await page.getByRole('button',{name:'Toggle background animation'}).click();
 await expect(pet.locator('img')).toHaveCSS('animation-name','none');
});

test('touch dragging does not scroll or consume the question',async({page},info)=>{
 test.skip(info.project.name!=='mobile','Touch viewport only');
 await page.goto('/zh/');
 const pet=page.locator('.companion-button');const r=(await pet.boundingBox())!;
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:90,y:240}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect(page.locator('.companion-speech')).toHaveCount(0);
 expect(await page.evaluate(()=>scrollY)).toBe(0);
 expect((await pet.boundingBox())!.y).toBeLessThan(300);
 await pet.tap();await expect(page.locator('.companion-speech-text')).toHaveText('咱俩都挺过分的。');
 await pet.tap();await expect(page.locator('.companion-speech-text')).toHaveText('你过分美丽，我过分着迷。');
 await pet.tap();await expect(page.locator('.companion-speech-text')).toHaveText('你知道你很像一款游戏吗？');
 await pet.tap();await expect(page.locator('.companion-speech-text')).toHaveText('我的世界。');
});

test('a pending answer survives bubble timeout, page navigation and a language switch',async({page})=>{
 await page.clock.install();
 await page.goto('/zh/');const pet=page.locator('.companion-button');
 await pet.click();await pet.click();
 await expect(page.locator('.companion-speech-text')).toHaveText('你过分美丽，我过分着迷。');
 await pet.click();
 await expect(page.locator('.companion-speech-text')).toHaveText('你知道你很像一款游戏吗？');
 await page.clock.fastForward(25000);
 await expect(page.locator('.companion-speech')).toHaveCount(0);
 await page.locator('.footer-links').getByRole('link',{name:'联系',exact:true}).click();
 await expect(page).toHaveURL('/zh/contact/');
 await page.locator('.language-control').click();await expect(page).toHaveURL('/contact/');
 await pet.click();
 await expect(page.locator('.companion-speech-text')).toHaveText("Minecraft. Because you're my whole world.");
});
