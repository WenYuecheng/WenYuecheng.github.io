import fs from 'node:fs';
import path from 'node:path';
import {Script} from 'node:vm';
const routes=['','zh','projects','zh/projects','projects/weyra','projects/solaceai','zh/projects/weyra','zh/projects/solaceai','contact','zh/contact','guestbook','zh/guestbook','auth','zh/auth','admin','zh/admin','privacy','zh/privacy'];
for(const route of routes){const file=path.join('out',route,'index.html');if(!fs.existsSync(file))throw Error(`Missing route ${route}`);let html=fs.readFileSync(file,'utf8');if(route==='zh'||route.startsWith('zh/')){html=html.replace('<html lang="en"','<html lang="zh-CN"');fs.writeFileSync(file,html);}for(const old of ['Yuecheng-Harness','EduRAG Agent','Chat2Excel','MIND ·','Frud_','XingHuiSama の'])if(html.includes(old))throw Error(`Obsolete content ${old} in ${file}`);}
for(const route of ['projects/mindbridge','projects/yuecheng-harness','projects/chat2excel','projects/edurag-agent','photography'])if(fs.existsSync(path.join('out',route,'index.html')))throw Error('Old route must be deleted: '+route);
for(const image of ['letter-garden','hero-day','hero-night','weyra-cover','solaceai-cover','contact-garden','profile-garden','message-garden'])if(!fs.existsSync(`out/images/generated/${image}.webp`))throw Error('Missing image '+image);
if(fs.existsSync('out/images/portrait.webp')||fs.existsSync('out/images/runtime'))throw Error('Private assets must not be exported');
if(!fs.existsSync('out/images/eugene-avatar.webp'))throw Error('Missing public avatar');
if(!fs.existsSync('out/images/companion/pink-front-pen.webp'))throw Error('Missing approved companion artwork');
for(const frame of ['elf-turn-closed','elf-side-closed','elf-side-half','elf-side-open'])if(!fs.existsSync(`out/images/opening/${frame}.webp`))throw Error('Missing opening pose '+frame);
const rootHtml=fs.readFileSync('out/index.html','utf8');
const gateScript=[...rootHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match=>match[1]).find(script=>script.includes("root.dataset.opening='pending'"));
if(!gateScript)throw Error('Missing first-paint opening bootstrap');
new Script(gateScript);
const audioScript=[...rootHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).find(x=>x.includes("getElementById('site-audio')"));if(!audioScript)throw Error('Missing opening audio bootstrap');new Script(audioScript); // Parse the generated trusted bootstrap without executing it.
fs.writeFileSync('out/.nojekyll','');
console.log(`Verified ${routes.length} bilingual pages, eight original scenes, and removed legacy routes.`);

function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of walk('out')){if(/portrait|images[\/]runtime|cuhk-emblem/.test(file))throw Error(`Private path in export: ${file}`);if(/\.(html|js|css|json|txt|xml)$/.test(file)){const data=fs.readFileSync(file,'utf8');for(const forbidden of ['CUHK','Sichuan University','四川大学','MSc in Computer Science','下一站，香港'])if(data.includes(forbidden))throw Error(`Private content in export: ${file}`);}}
