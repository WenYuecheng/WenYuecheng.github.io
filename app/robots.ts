import {site} from '../data/site';
export const dynamic='force-static';
export default function robots(){return{rules:{userAgent:'*',allow:'/',disallow:['/auth/','/zh/auth/','/admin/','/zh/admin/']},sitemap:`${site.url}/sitemap.xml`};}
