import type { Metadata } from 'next';
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/500.css';
import '@fontsource/source-sans-3/600.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import './globals.css';
import { Shell } from '../components/Shell';
import { AuthProvider } from '../components/Auth';
import { site } from '../data/site';
import {OpeningGate,openingBootstrap,openingGateStyles} from '../components/OpeningGate';
import {PrivateContentProvider} from '../components/PrivateContent';
import {EarlyAudio} from '../components/EarlyAudio';
export const metadata:Metadata={metadataBase:new URL(site.url),title:{default:'Eugene — Agents, RSI & PEFT',template:'%s · Eugene'},description:'Eugene’s personal universe: agents, recursive self-improvement and parameter-efficient fine-tuning. A place for curiosity and conversations.',icons:{icon:'/favicon.svg'},openGraph:{type:'website',siteName:'Eugene',images:[{url:'/images/generated/hero-day.webp',width:1536,height:1024}]},twitter:{card:'summary_large_image'}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en" suppressHydrationWarning><head><style dangerouslySetInnerHTML={{__html:openingGateStyles}}/><script dangerouslySetInnerHTML={{__html:openingBootstrap}}/></head><body><EarlyAudio/><OpeningGate/><AuthProvider><PrivateContentProvider><Shell>{children}</Shell></PrivateContentProvider></AuthProvider></body></html>;}
