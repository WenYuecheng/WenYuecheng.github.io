import type { Metadata } from 'next';
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/500.css';
import '@fontsource/source-sans-3/600.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import './globals.css';
import { Shell } from '../components/Shell';
import { site } from '../data/site';
export const metadata:Metadata={metadataBase:new URL(site.url),title:{default:'Yuecheng Wen — Agents, RSI & PEFT',template:'%s · Yuecheng Wen'},description:'Yuecheng Wen’s personal universe: agents, recursive self-improvement and parameter-efficient fine-tuning. Explore Weyra and SolaceAI.',icons:{icon:'/favicon.svg'},openGraph:{type:'website',siteName:'Yuecheng Wen',images:[{url:'/images/generated/hero-day.webp',width:1536,height:1024}]},twitter:{card:'summary_large_image'}};
const bootstrap=`try{var r=document.documentElement;r.classList.toggle('dark',localStorage.getItem('yuecheng-theme')==='dark');r.dataset.motion=localStorage.getItem('yuecheng-motion')==='off'?'off':'on';r.lang=location.pathname.startsWith('/zh')?'zh-CN':'en'}catch(e){}`;
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:bootstrap}}/></head><body><Shell>{children}</Shell></body></html>;}
