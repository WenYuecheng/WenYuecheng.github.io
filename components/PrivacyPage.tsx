'use client';
import Link from 'next/link';
import {LegalPaper} from './LegalPaper';
import {useIdentity} from './PrivateContent';
import {site,routeFor,type Locale} from '../data/site';
import {legalCopy,PRIVACY_VERSION} from '../data/legal';
export function LegalContact({locale}:{locale:Locale}){const{home}=useIdentity(),zh=locale==='zh';return <p>{home?.contact.email?<a href={`mailto:${home.contact.email}`}>{home.contact.email}</a>:<a href={site.xiaohongshu} target="_blank" rel="noreferrer">{zh?'通过小红书联系 Eugene':'Contact Eugene on Xiaohongshu'}</a>}</p>;}
export function PrivacyPage({locale}:{locale:Locale}){const zh=locale==='zh',copy=legalCopy[locale];return <LegalPaper><p className="section-kicker">EUGENE · PRIVACY</p><h1>{copy.title}</h1><p className="legal-version">{zh?'版本':'Version'} {PRIVACY_VERSION} · {zh?'生效日期：2026 年 10 月 28 日':'Effective 28 October 2026'}</p><p>{copy.intro}</p><nav className="legal-toc" aria-label={zh?'协议目录':'Agreement contents'}>{copy.sections.map(s=><a key={s.id} href={'#'+s.id}>{s.title}</a>)}</nav>{copy.sections.map(s=><section key={s.id} id={s.id} className={s.important?'legal-important':undefined}><h2>{s.title}</h2>{s.body.split('\n').map((p,i)=><p key={i}>{s.important?<strong>{p}</strong>:p}</p>)}</section>)}<h2>{zh?'联系与权利请求':'Contact and rights requests'}</h2><LegalContact locale={locale}/><div className="legal-footer"><Link href={routeFor(locale,'/copyright/')}>{zh?'查看版权说明':'Read the copyright notice'}</Link><Link href={routeFor(locale)}>{zh?'返回首页':'Back home'}</Link></div></LegalPaper>;}
