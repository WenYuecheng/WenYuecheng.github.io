import fs from 'node:fs';
import path from 'node:path';
import {Script} from 'node:vm';
const routes=['','zh','projects','zh/projects','projects/weyra','projects/solaceai','zh/projects/weyra','zh/projects/solaceai','contact','zh/contact','guestbook','zh/guestbook','auth','zh/auth','admin','zh/admin'];
for(const route of routes){const file=path.join('out',route,'index.html');if(!fs.existsSync(file))throw Error(`Missing route ${route}`);let html=fs.readFileSync(file,'utf8');if(route==='zh'||route.startsWith('zh/')){html=html.replace('<html lang="en"','<html lang="zh-CN"');fs.writeFileSync(file,html);}for(const old of ['Yuecheng-Harness','EduRAG Agent','Chat2Excel','MIND ·','Frud_','XingHuiSama の'])if(html.includes(old))throw Error(`Obsolete content ${old} in ${file}`);}
for(const route of ['projects/mindbridge','projects/yuecheng-harness','projects/chat2excel','projects/edurag-agent','photography'])if(fs.existsSync(path.join('out',route,'index.html')))throw Error('Old route must be deleted: '+route);
for(const image of ['letter-garden','hero-day','hero-night','weyra-cover','solaceai-cover','contact-garden','profile-garden','message-garden'])if(!fs.existsSync(`out/images/generated/${image}.webp`))throw Error('Missing image '+image);
for(const name of ['weyra','solaceai'])if(!fs.existsSync(`out/images/runtime/${name}.webp`))throw Error('Missing runtime cover '+name);
if(!fs.existsSync('out/images/companion/pink-front-pen.webp'))throw Error('Missing approved companion artwork');
for(const frame of ['elf-turn-closed','elf-side-closed','elf-side-half','elf-side-open'])if(!fs.existsSync(`out/images/opening/${frame}.webp`))throw Error('Missing opening pose '+frame);
const rootHtml=fs.readFileSync('out/index.html','utf8');
const gateScript=[...rootHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match=>match[1]).find(script=>script.includes("root.dataset.opening='pending'"));
if(!gateScript)throw Error('Missing first-paint opening bootstrap');
new Script(gateScript); // Parse the generated trusted bootstrap without executing it.
fs.writeFileSync('out/.nojekyll','');
console.log(`Verified ${routes.length} bilingual pages, eight original scenes, and removed legacy routes.`);
