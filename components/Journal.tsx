'use client';

/**
 * Reading-card filtering/disclosure and chronological author/text cards adapted from
 * heiehiehi/XinghuisamaBlogs DailyBriefing.tsx and app/moments/MomentList.tsx,
 * commit 8633e983371acc3b627b88b911143ff0fd31ea23 (CC BY-NC 4.0).
 * See THIRD_PARTY_NOTICES.md and vendor/xinghui for retained attribution/license.
 * This adaptation uses this site's own bibliography and updates; no upstream posts.
 */
import Link from 'next/link';
import {useEffect,useId,useMemo,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {ArrowUpRight,ChevronLeft,ChevronRight,RefreshCw} from 'lucide-react';
import {papers,type Paper} from '../data/reading';
import {routeFor,type Locale} from '../data/site';
import {ApiError,useAuth} from './Auth';
import PageTransition from './PageTransition';

type Update={id:string;body:string;createdAt:string;updatedAt:string};
type SourceUpdate=Update&{bodyZh:string;bodyEn:string};
type UpdatePage<T=Update>={updates:T[];page:number;pageSize:number;total:number;totalPages:number};
const newestPapers=[...papers].sort((a,b)=>b.addedAt.localeCompare(a.addedAt));
const topics=[...new Set(papers.flatMap(paper=>paper.tags))].sort();

function validUpdatePage(value:UpdatePage){
 return value&&Array.isArray(value.updates)&&Number.isInteger(value.page)&&value.page>=1&&Number.isInteger(value.totalPages)&&value.totalPages>=1&&Number.isInteger(value.total)&&value.total>=0&&value.updates.every(item=>item&&typeof item.id==='string'&&typeof item.body==='string'&&typeof item.createdAt==='string'&&typeof item.updatedAt==='string');
}

function beijingDate(value:string,locale:Locale){
 return new Date(value).toLocaleDateString(locale==='zh'?'zh-CN':'en-GB',{year:'numeric',month:locale==='zh'?'long':'short',day:'numeric',timeZone:'Asia/Shanghai'});
}

function JournalEmblem({kind}:{kind:'reading'|'letters'}){
 return <svg className={`journal-emblem journal-emblem-${kind}`} viewBox="0 0 180 150" width="180" height="150" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
  {kind==='reading'?<>
   <path className="emblem-wash" fill="currentColor" fillOpacity=".07" stroke="none" d="M24 53C39 20 109 14 145 44s16 78-27 85S6 93 24 53Z"/>
   <path d="M89 117V54c-20-13-43-15-62-9v63c21-6 43-3 62 9Zm0 0V54c20-13 43-15 62-9v63c-21-6-43-3-62 9Z"/>
   <path d="M21 53v62c24-6 47-3 68 10 21-13 44-16 68-10V53M38 58c14-2 26 0 39 6M38 69c14-2 26 0 39 6M38 80c14-2 26 0 39 6M101 85c14-6 27-8 39-6M101 96c14-6 27-8 39-6"/>
   <path className="emblem-bookmark" fill="currentColor" fillOpacity=".16" d="m115 43 13-2v36l-7-5-6 7V43Z"/>
   <path d="M142 39c-3-17 2-26 12-31M146 24c-10 0-12-5-11-10 7 0 11 3 11 10Zm0-1c8 0 12-5 12-10-7 0-11 3-12 10ZM40 32l-3-8m-5 10-7-3M54 130c20 6 47 6 68-1"/>
  </>:<>
   <path className="emblem-wash" fill="currentColor" fillOpacity=".07" stroke="none" d="M23 51C37 20 111 18 148 46s13 76-31 84S7 86 23 51Z"/>
   <path d="m23 61 68-18 65 28-11 59-123-8 1-61Z"/>
   <path className="emblem-letter" fill="currentColor" fillOpacity=".06" d="m40 76 5-50 88 8-3 58-40 23-50-39Z"/>
   <path d="m23 61 67 54 66-44M22 122l47-24m76 32-36-31M57 44l57 5m-58 7 46 4M80 18c-3-6-1-11 5-14m3 15 7-8"/>
   <g transform="rotate(12 133 40)"><path strokeDasharray="2.5 3" d="M115 18h37v45h-37z"/><path d="m133 26 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z"/><path d="M123 54h20"/></g>
   <path d="M10 136c19-6 29 5 47-1s27 4 43 0M146 143l8-3m1-6 4 2"/>
  </>}
 </svg>;
}

function JournalChapter({kind}:{kind:'reading'|'letters'}){
 return <p className="journal-chapter"><span className="journal-chapter-rule" aria-hidden="true"/><span>{kind==='reading'?'Reading room':'Letters'}</span></p>;
}

function JournalHero({kind,title,intro,note}:{kind:'reading'|'letters';title:string;intro:string;note:string}){
 return <header className="journal-hero journal-editorial-hero"><div className="journal-hero-copy"><JournalChapter kind={kind}/><h1>{title}</h1><p className="journal-intro">{intro}</p></div><div className="journal-hero-illustration"><JournalEmblem kind={kind}/><p className="journal-marginalia">{note}</p></div></header>;
}

function PaperBookmark(){
 return <svg className="paper-bookmark" viewBox="0 0 26 55" width="26" height="55" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true" focusable="false"><path fill="currentColor" fillOpacity=".12" d="M6 1h14v40l-7-6-7 6V1Z"/><path d="M10 8h6m-6 5h6M1 49c8-3 16-3 24 0"/></svg>;
}

function PostalMark(){
 return <svg className="update-postmark" viewBox="0 0 116 52" width="116" height="52" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true" focusable="false"><circle cx="88" cy="26" r="21"/><circle cx="88" cy="26" r="16" strokeDasharray="1 4"/><path d="M3 16c11-8 16 8 28 0s17 8 30 0M3 26c11-8 16 8 28 0s17 8 30 0M3 36c11-8 16 8 28 0s17 8 30 0m19-16h16v12H80V20Zm0 0 8 7 8-7"/></svg>;
}

function Pagination({page,totalPages,total,locale,label,busy=false,onChange}:{page:number;totalPages:number;total:number;locale:Locale;label:string;busy?:boolean;onChange:(page:number)=>void}){
 const zh=locale==='zh';
 return <nav className="journal-pagination" aria-label={label}>
  <button type="button" className="button secondary" disabled={busy||page<=1} onClick={()=>onChange(page-1)}><ChevronLeft size={16}/>{zh?'上一页':'Previous'}</button>
  <span aria-live="polite">{page} / {Math.max(1,totalPages)} <small>· {zh?`共 ${total} 条`:`${total} total`}</small></span>
  <button type="button" className="button secondary" disabled={busy||page>=totalPages} onClick={()=>onChange(page+1)}>{zh?'下一页':'Next'}<ChevronRight size={16}/></button>
 </nav>;
}

function PaperCard({paper,locale,headingLevel='h3'}:{paper:Paper;locale:Locale;headingLevel?:'h2'|'h3'}){
 const zh=locale==='zh',Heading=headingLevel;
 return <article className="reading-card glass">
  <PaperBookmark/>
  <div className="paper-meta">{paper.paperDate?<time dateTime={paper.paperDate}>{beijingDate(paper.paperDate,locale)}</time>:<span>{paper.year}</span>}<span>{zh?'论文':'Paper'}</span></div>
  <Heading className="paper-title">{paper.title}</Heading>
  <div className="paper-tags">{paper.tags.map(tag=><span key={tag}>#{tag}</span>)}</div>
  <p className="paper-summary">{paper.summary[locale]}</p>
  <a className="paper-link text-link" href={paper.url} target="_blank" rel="noopener noreferrer">{zh?'阅读原文':'Read the paper'}<ArrowUpRight size={16}/><span className="sr-only"> — {paper.title}</span></a>
  <span className="paper-corner-rule" aria-hidden="true"/>
 </article>;
}

export function ReadingPage({locale}:{locale:Locale}){
 const zh=locale==='zh',searchId=useId(),topicId=useId();
 const [query,setQuery]=useState(''),[topic,setTopic]=useState(''),[page,setPage]=useState(1);
 // Adapted from MomentList's memoized plain-text search and DailyBriefing's tag selection.
 const filtered=useMemo(()=>{
  const needle=query.trim().toLocaleLowerCase();
  return newestPapers.filter(paper=>(!topic||paper.tags.includes(topic))&&(!needle||[paper.title,...paper.tags,paper.summary.zh,paper.summary.en].join(' ').toLocaleLowerCase().includes(needle)));
 },[query,topic]);
 const totalPages=Math.max(1,Math.ceil(filtered.length/12)),current=Math.min(page,totalPages);
 return <PageTransition><main id="main" className="journal-page reading-page"><div className="wrap">
  <JournalHero kind="reading" title={zh?'最近读过':'Reading'} intro={zh?'读过的论文，留下一句简短记录。':'Papers I have read, with a short note on each.'} note={zh?'沿着原文，继续探索。':'Follow the source to explore further.'}/>
  <div className="journal-controls glass"><label htmlFor={searchId}><span>{zh?'搜索论文':'Search papers'}</span><input id={searchId} type="search" value={query} placeholder={zh?'标题、主题或简介':'Title, topic or summary'} onChange={event=>{setQuery(event.target.value);setPage(1);}}/></label><label htmlFor={topicId}><span>{zh?'论文主题':'Paper topic'}</span><select id={topicId} value={topic} onChange={event=>{setTopic(event.target.value);setPage(1);}}><option value="">{zh?'所有主题':'All topics'}</option>{topics.map(tag=><option key={tag} value={tag}>{tag}</option>)}</select></label></div>
  <p className="journal-count reading-count" role="status">{zh?`${filtered.length} / ${papers.length} 篇论文`:`${filtered.length} of ${papers.length} papers`}</p>
  {filtered.length?<div className="journal-grid">{filtered.slice((current-1)*12,current*12).map(paper=><PaperCard key={paper.id} paper={paper} locale={locale} headingLevel="h2"/>)}</div>:<p className="journal-empty glass">{zh?'没有找到相关论文，试试其他关键词。':'No papers found. Try another search.'}</p>}
  <Pagination page={current} totalPages={totalPages} total={filtered.length} locale={locale} label={zh?'论文分页':'Paper pages'} onChange={setPage}/>
 </div></main></PageTransition>;
}

function UpdateCard({update,locale,children}:{update:Update;locale:Locale;children?:ReactNode}){
 return <article className="update-card glass"><PostalMark/><header><strong>Eugene</strong><time dateTime={update.createdAt}>{beijingDate(update.createdAt,locale)}</time></header><p className="update-body">{update.body}</p>{update.updatedAt!==update.createdAt&&<small className="update-edited">{locale==='zh'?'编辑于 ':'Edited '}<time dateTime={update.updatedAt}>{beijingDate(update.updatedAt,locale)}</time></small>}{children}</article>;
}

function PublicUpdates({locale,compact=false}:{locale:Locale;compact?:boolean}){
 const {api}=useAuth(),zh=locale==='zh';
 const [page,setPage]=useState(1),[attempt,setAttempt]=useState(0),[data,setData]=useState<UpdatePage|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(false);
 const scope=`${locale}:${page}:${compact}`, [loadedScope,setLoadedScope]=useState('');
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError(false);
  api<UpdatePage>(`/updates?page=${page}&pageSize=${compact?3:10}&locale=${locale}`,{signal:controller.signal}).then(result=>{if(controller.signal.aborted)return;if(!validUpdatePage(result))throw new Error('Invalid updates response');setData(result);setLoadedScope(scope);if(result.page!==page)setPage(result.page);}).catch(()=>{if(!controller.signal.aborted)setError(true);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[api,page,compact,locale,attempt,scope]);
 const visible=loadedScope===scope?data:null;
 return <>
  {loading&&<p className="updates-status" role="status">{zh?'正在打开动态…':'Opening updates…'}</p>}
  {error?<div className="updates-status" role="status"><p>{zh?'暂时无法加载动态，请稍后重试。':'Updates are unavailable. Please try again.'}</p><button type="button" className="text-link" onClick={()=>setAttempt(value=>value+1)}><RefreshCw size={15}/>{zh?'重试':'Retry'}</button></div>:visible&&<>{visible.updates.length?<div className="updates-list">{visible.updates.map(update=><UpdateCard key={update.id} update={update} locale={locale}/>)}</div>:<p className="journal-empty glass">{zh?'下一段记录，正在酝酿。':'The next note is taking shape.'}</p>}{!compact&&<Pagination page={visible.page} totalPages={visible.totalPages} total={visible.total} locale={locale} label={zh?'动态分页':'Update pages'} busy={loading} onChange={setPage}/>}</>}
 </>;
}

export function UpdatesPage({locale}:{locale:Locale}){
 const zh=locale==='zh';
 return <PageTransition><main id="main" className="journal-page updates-page"><div className="wrap"><JournalHero kind="letters" title={zh?'近况与片刻':'Notes & updates'} intro={zh?'Eugene 的学习、生活，以及值得记下的小事。':'Learning, life, and small things Eugene wants to remember.'} note={zh?'寄给日常的一封短信。':'A little letter to the everyday.'}/><PublicUpdates locale={locale}/></div></main></PageTransition>;
}

export function JournalHome({locale}:{locale:Locale}){
 const zh=locale==='zh';
 return <div className="journal-home"><section aria-labelledby="home-reading-title"><div className="journal-section-heading journal-editorial-heading"><div className="journal-heading-emblem"><JournalEmblem kind="reading"/></div><div className="journal-heading-copy"><JournalChapter kind="reading"/><h2 id="home-reading-title">{zh?'最近读过':'Reading'}</h2><p className="journal-marginalia">{zh?'最近翻过的几页':'Recently on my desk'}</p></div><Link className="text-link" href={routeFor(locale,'/reading/')}>{zh?'查看全部论文':'All papers'}<ArrowUpRight size={16}/></Link></div><div className="journal-grid">{newestPapers.slice(0,3).map(paper=><PaperCard key={paper.id} paper={paper} locale={locale}/>)}</div></section><section aria-labelledby="home-updates-title"><div className="journal-section-heading journal-editorial-heading"><div className="journal-heading-emblem"><JournalEmblem kind="letters"/></div><div className="journal-heading-copy"><JournalChapter kind="letters"/><h2 id="home-updates-title">{zh?'近况与片刻':'Notes & updates'}</h2><p className="journal-marginalia">{zh?'把片刻写成信':'A few moments, written down'}</p></div><Link className="text-link" href={routeFor(locale,'/updates/')}>{zh?'查看全部动态':'All updates'}<ArrowUpRight size={16}/></Link></div><PublicUpdates locale={locale} compact/></section></div>;
}

function updateError(error:unknown,locale:Locale){
 const zh=locale==='zh';
 if(error instanceof ApiError&&error.status===403)return zh?'当前账号没有发布权限，已填写的内容会保留。':'This account cannot publish updates. Your draft is retained.';
 if(error instanceof ApiError&&error.status===422)return zh?'请检查正文长度：中文 1–1500 字，英文最多 3000 字。已填写的内容会保留。':'Check the text lengths: Chinese 1–1500 characters, English up to 3000. Your draft is retained.';
 return zh?'暂时无法完成请求，请稍后重试，已填写的内容会保留。':'The request could not be completed. Please retry; your draft is retained.';
}

export function UpdatesAdmin({locale}:{locale:Locale}){
 const auth=useAuth();
 if(auth.unavailable||auth.user?.role!=='admin')return null;
 // A visibility/session recheck hides the controls while retaining the same owner's draft.
 // Logout, an unavailable session, or a new identity unmounts/rekeys the editor instead.
 return <div hidden={auth.loading} inert={auth.loading} aria-busy={auth.loading}><UpdatesEditor key={`${auth.revision}:${auth.user.id}:${locale}`} locale={locale}/></div>;
}

function UpdatesEditor({locale}:{locale:Locale}){
 const {api}=useAuth(),zh=locale==='zh',formRef=useRef<HTMLFormElement>(null),post=useRef<AbortController|null>(null);
 const [bodyZh,setBodyZh]=useState(''),[bodyEn,setBodyEn]=useState(''),[editing,setEditing]=useState<string|null>(null),[confirmId,setConfirmId]=useState<string|null>(null),[page,setPage]=useState(1),[attempt,setAttempt]=useState(0),[data,setData]=useState<UpdatePage<SourceUpdate>|null>(null),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 useEffect(()=>()=>post.current?.abort(),[]);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setLoadError(false);
  api<UpdatePage<SourceUpdate>>(`/admin/updates?page=${page}&pageSize=10&locale=${locale}`,{authenticated:true,signal:controller.signal}).then(result=>{if(controller.signal.aborted)return;setData(result);if(result.page!==page)setPage(result.page);}).catch(()=>{if(!controller.signal.aborted)setLoadError(true);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[api,page,locale,attempt]);
 function resetDraft(){setBodyZh('');setBodyEn('');setEditing(null);}
 function edit(update:SourceUpdate){setEditing(update.id);setBodyZh(update.bodyZh);setBodyEn(update.bodyEn||'');setConfirmId(null);setStatus('');formRef.current?.querySelector('textarea')?.focus();}
 async function submit(event:FormEvent){
  event.preventDefault();if(busy||!bodyZh.trim()||bodyZh.length>1500||bodyEn.length>3000)return;
  const controller=new AbortController();post.current=controller;setBusy(true);setStatus('');
  try{await api<SourceUpdate>(editing?`/admin/updates/${encodeURIComponent(editing)}`:'/admin/updates',{method:editing?'PATCH':'POST',body:{bodyZh,bodyEn},authenticated:true,signal:controller.signal});if(controller.signal.aborted)return;setStatus(editing?(zh?'修改已保存。':'Changes saved.'):(zh?'动态已发布。':'Update published.'));resetDraft();setPage(1);setAttempt(value=>value+1);}
  catch(error){if(!controller.signal.aborted)setStatus(updateError(error,locale));}
  finally{if(post.current===controller)post.current=null;if(!controller.signal.aborted)setBusy(false);}
 }
 async function remove(id:string){
  if(busy||confirmId!==id)return;const controller=new AbortController();post.current=controller;setBusy(true);setStatus('');
  try{await api<void>(`/admin/updates/${encodeURIComponent(id)}`,{method:'DELETE',body:{},authenticated:true,signal:controller.signal});if(controller.signal.aborted)return;if(editing===id)resetDraft();setConfirmId(null);setStatus(zh?'动态已删除。':'Update deleted.');setAttempt(value=>value+1);}
  catch(error){if(!controller.signal.aborted)setStatus(updateError(error,locale));}
  finally{if(post.current===controller)post.current=null;if(!controller.signal.aborted)setBusy(false);}
 }
 return <section className="updates-admin" aria-labelledby="updates-admin-title"><div className="journal-section-heading"><div><p className="section-kicker">{zh?'公开动态管理':'Public updates'}</p><h2 id="updates-admin-title">{zh?'发布动态':'Publish an update'}</h2></div></div>
  <form ref={formRef} className="updates-form glass" onSubmit={event=>void submit(event)}><h3>{editing?(zh?'编辑动态':'Edit update'):(zh?'写下新的片刻':'Write a new note')}</h3><label><span>{zh?'中文正文':'Chinese text'}</span><textarea aria-label={zh?'中文正文':'Chinese text'} rows={5} required maxLength={1500} disabled={busy} value={bodyZh} onChange={event=>setBodyZh(event.target.value)}/><small>{bodyZh.length} / 1500</small></label><label><span>English (optional)</span><textarea aria-label="English (optional)" rows={4} maxLength={3000} disabled={busy} value={bodyEn} onChange={event=>setBodyEn(event.target.value)}/><small>{bodyEn.length} / 3000</small></label><p className="updates-form-hint">{zh?'英文留空时，英文页面将展示中文正文。':'Leave English empty to show the Chinese text on the English page.'}</p><div className="update-editor-actions"><button className="button primary" disabled={busy||!bodyZh.trim()}>{busy?(zh?'正在保存…':'Saving…'):editing?(zh?'保存修改':'Save changes'):(zh?'发布动态':'Publish update')}</button>{editing&&<button type="button" className="button secondary" disabled={busy} onClick={()=>{resetDraft();setStatus('');}}>{zh?'取消编辑':'Cancel edit'}</button>}</div></form>
  {status&&<p className="updates-status" role="status">{status}</p>}
  <div className="journal-section-heading"><h3>{zh?'已发布动态':'Published updates'}</h3><button type="button" className="text-link" disabled={busy||loading} onClick={()=>setAttempt(value=>value+1)}><RefreshCw size={15}/>{zh?'刷新动态':'Refresh updates'}</button></div>
  {loading?<p role="status">{zh?'正在加载动态…':'Loading updates…'}</p>:loadError?<p className="updates-status" role="status">{zh?'暂时无法加载已发布动态，请重试。':'Published updates could not be loaded. Please retry.'}</p>:data&&<>{data.updates.length?<div className="updates-list">{data.updates.map(update=><UpdateCard key={update.id} update={{...update,body:locale==='en'?(update.bodyEn||update.bodyZh):update.bodyZh}} locale={locale}><div className="update-editor-actions">{confirmId===update.id?<><p>{zh?'确定删除这条公开动态？':'Delete this public update?'}</p><button type="button" className="button secondary" disabled={busy} onClick={()=>void remove(update.id)}>{zh?'确认删除':'Confirm delete'}</button><button type="button" className="text-link" disabled={busy} onClick={()=>setConfirmId(null)}>{zh?'取消':'Cancel'}</button></>:<><button type="button" className="text-link" disabled={busy} onClick={()=>edit(update)}>{zh?'编辑':'Edit'}</button><button type="button" className="text-link" disabled={busy} onClick={()=>setConfirmId(update.id)}>{zh?'删除':'Delete'}</button></>}</div></UpdateCard>)}</div>:<p className="journal-empty">{zh?'还没有发布动态。':'No updates published yet.'}</p>}<Pagination page={data.page} totalPages={data.totalPages} total={data.total} locale={locale} label={zh?'管理动态分页':'Manage update pages'} busy={busy} onChange={setPage}/></>}
 </section>;
}
