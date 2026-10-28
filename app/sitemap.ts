import { site,  routeFor, locales } from '../data/site';
export const dynamic='force-static';
export default function sitemap(){return locales.flatMap(locale=>['/','/contact/','/guestbook/','/privacy/','/copyright/'].map(path=>({url:site.url+routeFor(locale,path),lastModified:new Date(),alternates:{languages:{en:site.url+routeFor('en',path),'zh-CN':site.url+routeFor('zh',path)}}})));}
