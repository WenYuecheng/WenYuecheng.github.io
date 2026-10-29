import type {Page,Route} from '@playwright/test';
export const privateHome={name:'Verified Owner',portraitAsset:'portrait',contact:{csdn:'https://example.org/blog',email:'contact@example.com'},profile:{eyebrow:'Hello',title:'A new chapter',motto:'Stay curious',text:'A synthetic member profile.',badge:'University',photoAlt:'Private owner portrait',interests:'Interests'},education:{shortName:'EX',startYear:'2030',eyebrow:'Education',title:'Learning',current:'Example University',degree:'Computer science',period:'2025–2029',admission:'Admitted · 2030',next:'Example Graduate School',nextDegree:'Research programme',metrics:['Focus','Practice','Ideas','Language'],values:['Study','Build','Explore','Learn']},interests:[{title:'Agents',sub:'Systems',body:'Building useful tools.'},{title:'Learning',sub:'Ideas',body:'Exploring new questions.'},{title:'Design',sub:'Interfaces',body:'Making ideas readable.'}]};
export async function privateAccount(page:Page,role:'user'|'admin'='user'){
 await page.addInitScript(()=>{if(sessionStorage.getItem('fixture-seeded'))return;sessionStorage.setItem('fixture-seeded','1');sessionStorage.setItem('yuecheng-account-session',JSON.stringify({token:'a'.repeat(64),expiresAt:'2099-01-01T00:00:00Z'}));});
 const respond=(r:Route)=>{
  const path=new URL(r.request().url()).pathname.replace(/^\/api\/portal(?=\/)/,'');
  if(path==='/auth/me')return r.fulfill({json:{user:{id:'reader',email:'reader@example.edu',nickname:'Reader',role},expiresAt:'2099-01-01T00:00:00Z'}});
  if(path==='/content/home')return r.fulfill({json:privateHome});
  const projects=['weyra','solaceai'].map(slug=>({slug,tags:['Systems'],coverAsset:slug,backdrop:`/images/generated/${slug}-cover.webp`,accent:'lavender',links:[{key:'github',label:'GitHub',zh:'GitHub'}],title:slug==='weyra'?'Example Planner':'Example Companion',kicker:'A useful idea',summary:'A synthetic project introduction.',description:'A member project description.',...(role==='admin'?{role:'Implementation owner',architecture:['Receive input','Produce output'],features:[{title:'A useful feature',body:'An implementation example.'}],stages:['Input','Plan'],walkthrough:['Receive a question.','Choose an appropriate action.']}:{})}));
  if(path==='/content/projects')return r.fulfill({json:{projects}});
  if(path.startsWith('/content/projects/'))return r.fulfill({json:{project:projects.find(p=>path.endsWith(p.slug))}});
  if(path.startsWith('/content/assets/'))return r.fulfill({path:'public/images/visitor-fox-original.webp',contentType:'image/webp'});
  return r.fulfill({json:{messages:[],page:1,pageSize:12,total:0,totalPages:1}});
 };
 await page.route('**/api/portal/**',respond);
 // The final local preview uses the backend's unprefixed development URL.
 await page.route('http://127.0.0.1:8093/**',respond);
}
