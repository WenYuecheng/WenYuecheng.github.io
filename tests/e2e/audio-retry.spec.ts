import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

// This isolated browser fixture imports the production component. The in-memory
// track and media events never enter the static export or public music config.
test('audio error clears after confirmed retry playback',async({page},info)=>{
 test.skip(info.project.name!=='desktop','One browser fixture covers the shared component state.');
 const root=process.cwd(),fixture=await mkdtemp(join(root,'.superpowers/audio-fixture-'));
 const require=createRequire(import.meta.resolve('vitest/package.json'));
 const {createServer}=await import(pathToFileURL(require.resolve('vite')).href);
 await writeFile(join(fixture,'index.html'),'<html><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>');
 await writeFile(join(fixture,'entry.tsx'),`
  import React from 'react';
  import {createRoot} from 'react-dom/client';
  import {BackgroundMusic} from ${JSON.stringify(resolve(root,'components/Shell.tsx'))};
  import {music} from ${JSON.stringify(resolve(root,'data/site.ts'))};
  music.autoPlay=false;music.tracks=[{src:'/test-track.mp3',title:'Fixture track',artist:'Fixture artist'}];
  HTMLMediaElement.prototype.play=function(){this.dispatchEvent(new Event('play'));return Promise.resolve();};
  HTMLMediaElement.prototype.pause=function(){this.dispatchEvent(new Event('pause'));};
  createRoot(document.getElementById('root')).render(<BackgroundMusic locale="en"/>);
 `);
 const server=await createServer({root:fixture,configFile:false,server:{host:'127.0.0.1',port:0,fs:{allow:[root,fixture]}},oxc:{jsx:{runtime:'automatic'}},define:{'process.env.NEXT_PUBLIC_GUESTBOOK_API':'undefined'},optimizeDeps:{include:['react','react-dom/client','react/jsx-dev-runtime']},resolve:{dedupe:['react','react-dom']}});
 try{
  await server.listen();const address=server.httpServer!.address();
  if(!address||typeof address==='string')throw Error('Fixture address unavailable');
  await page.route('**/test-track.mp3',()=>{});
  await page.goto(`http://127.0.0.1:${address.port}/`);
  await expect(page.locator('audio')).toHaveCount(1);
  await page.locator('audio').evaluate(audio=>audio.dispatchEvent(new Event('error')));
  await expect(page.locator('.music-copy strong')).toHaveText('This track is unavailable');
  await page.getByRole('button',{name:'Play music',exact:true}).click();
  await expect(page.getByRole('button',{name:'Pause music',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.music-copy strong')).toHaveText('Fixture track');
  await expect(page.locator('.music-copy small')).toHaveText('Fixture artist');
 }finally{await server.close();await rm(fixture,{recursive:true,force:true});}
});
