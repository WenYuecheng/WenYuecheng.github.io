import { site, projects, routeFor, locales } from '../data/site';
export const dynamic='force-static';
export default function sitemap(){return locales.flatMap(locale=>['/','/projects/','/contact/','/guestbook/',...projects.map(p=>`/projects/${p.slug}/`)].map(path=>({url:site.url+routeFor(locale,path),lastModified:new Date(),alternates:{languages:{en:site.url+routeFor('en',path),'zh-CN':site.url+routeFor('zh',path)}}})));}
