import fs from 'node:fs';
import path from 'node:path';
const routes=['','zh','projects','zh/projects','projects/weyra','projects/solaceai','zh/projects/weyra','zh/projects/solaceai','contact','zh/contact','guestbook','zh/guestbook'];
for(const route of routes){const file=path.join('out',route,'index.html');if(!fs.existsSync(file))throw Error(`Missing route ${route}`);let html=fs.readFileSync(file,'utf8');if(route==='zh'||route.startsWith('zh/')){html=html.replace('<html lang="en"','<html lang="zh-CN"');fs.writeFileSync(file,html);}for(const old of ['Yuecheng-Harness','EduRAG Agent','Chat2Excel','MIND ·','Frud_','XingHuiSama の'])if(html.includes(old))throw Error(`Obsolete content ${old} in ${file}`);}
for(const route of ['projects/mindbridge','projects/yuecheng-harness','projects/chat2excel','projects/edurag-agent','photography'])if(fs.existsSync(path.join('out',route,'index.html')))throw Error('Old route must be deleted: '+route);
for(const image of ['hero-day','hero-night','weyra-cover','solaceai-cover','contact-garden','profile-garden'])if(!fs.existsSync(`out/images/generated/${image}.webp`))throw Error('Missing image '+image);
fs.writeFileSync('out/.nojekyll','');
console.log(`Verified ${routes.length} bilingual pages, six original scenes, and removed legacy routes.`);
