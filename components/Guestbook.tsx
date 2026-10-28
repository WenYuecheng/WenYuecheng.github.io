'use client';
import Link from 'next/link';
import {useCallback,useEffect,useId,useRef,useState,type FormEvent} from 'react';
import {ChevronLeft,ChevronRight,Flower2,LoaderCircle,RefreshCw,Send,ShieldCheck} from 'lucide-react';
import {content,routeFor,type Locale} from '../data/site';
import {accountError,useAuth} from './Auth';
import {useIdentity} from './PrivateContent';
type Note={id:string;name:string;message:string;createdAt:string;status?:'pending'|'approved'|'rejected'};
type NotePage={messages:Note[];page?:number;pageSize?:number;total?:number;totalPages?:number};
function WallNote({note,index,locale}:{note:Note;index:number;locale:Locale}){
 const[expanded,setExpanded]=useState(false),bodyId=useId(),zh=locale==='zh';
 const long=note.message.length>180||note.message.split('\n').length>6;
 return <article className={`pinned-note color-${index%4}`}><span className="note-pin"/>
  <p id={bodyId} className={long&&!expanded?'note-preview':undefined}>{note.message}</p>
  {long&&<button type="button" className="note-expand" aria-expanded={expanded} aria-controls={bodyId} onClick={()=>setExpanded(v=>!v)}>{expanded?(zh?'收起':'Show less'):(zh?'展开全文':'Read full note')}</button>}
  <footer><strong>{note.name==='A visitor'||note.name==='Anonymous'?content[locale].guestbook.anonymous:note.name}</strong><time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleDateString(zh?'zh-CN':'en-GB',{year:'numeric',month:'short',day:'numeric',timeZone:'Asia/Shanghai'})}</time></footer>
 </article>;
}
export default function Guestbook({locale}:{locale:Locale}){
 const {name}=useIdentity(); const auth=useAuth(),t=content[locale].guestbook,zh=locale==='zh';
 const[notes,setNotes]=useState<Note[]>([]),[mine,setMine]=useState<Note[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false),[status,setStatus]=useState(''),[mineError,setMineError]=useState(''),[message,setMessage]=useState(''),[website,setWebsite]=useState(''),[sending,setSending]=useState(false),[attempt,setAttempt]=useState(0),[mineAttempt,setMineAttempt]=useState(0),[showMine,setShowMine]=useState(false);
 const scope=`${auth.revision}:${auth.user&&!auth.loading&&!auth.unavailable?auth.user.id+auth.user.role:'anonymous'}:${locale}`, [notesScope,setNotesScope]=useState('');
 const visibleNotes=notesScope===scope?notes:[];
 const post=useRef<AbortController|null>(null),loadVersion=useRef(0);
 const[page,setPage]=useState(1),[pageInfo,setPageInfo]=useState({page:1,total:0,totalPages:1});
 useEffect(()=>()=>post.current?.abort(),[]);
 const load=useCallback(async(signal?:AbortSignal)=>{
  const version=++loadVersion.current;
  try{const result=await auth.api<NotePage>(`/messages?page=${page}&pageSize=12&locale=${locale}`,{signal,authenticated:!!auth.user&&!auth.loading&&!auth.unavailable});if(!signal?.aborted&&version===loadVersion.current){const messages=Array.isArray(result.messages)?result.messages:[];setNotes(messages);setNotesScope(scope);const current=result.page??page;setPageInfo({page:current,total:result.total??messages.length,totalPages:result.totalPages??1});if(current!==page)setPage(current);setError(false);}}
  catch{if(!signal?.aborted&&version===loadVersion.current)setError(true);}
  finally{if(!signal?.aborted&&version===loadVersion.current)setLoading(false);}
 },[auth.api,page,auth.user,auth.loading,auth.unavailable,locale,scope]);
 useEffect(()=>{const controller=new AbortController();setLoading(true);void load(controller.signal);const timer=setInterval(()=>{if(document.visibilityState==='visible')void load(controller.signal);},30_000);const focus=()=>void load(controller.signal);window.addEventListener('focus',focus);return()=>{controller.abort();clearInterval(timer);window.removeEventListener('focus',focus);};},[load,attempt]);
 useEffect(()=>{
  if(!auth.user){setMine([]);setMineError('');return;}
  const controller=new AbortController();setMineError('');
  auth.api<{messages:Note[]}>(`/messages/mine?locale=${locale}`,{authenticated:true,signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setMine(result.messages);}).catch(e=>{if(!controller.signal.aborted)setMineError(accountError(e,locale));});
  return()=>controller.abort();
 },[auth.api,auth.user,mineAttempt,locale]);
 async function submit(event:FormEvent){
  event.preventDefault();if(!message.trim()||!auth.user||sending)return;setSending(true);setStatus('');const controller=new AbortController();post.current=controller;
  try{const note=await auth.api<Note>('/messages',{method:'POST',body:{message,website},authenticated:true,signal:controller.signal});if(note.status!=='pending')throw Error('Missing review state');if(controller.signal.aborted)return;setMessage('');setStatus(zh?'留言已提交，待站主审核后公开展示。':'Your note is submitted and will appear publicly after the owner approves it.');setShowMine(true);setMineAttempt(a=>a+1);}
  catch(e){if(!controller.signal.aborted)setStatus(accountError(e,locale));}
  finally{if(post.current===controller)post.current=null;if(!controller.signal.aborted)setSending(false);}
 }
 const states={pending:zh?'待审核':'Pending review',approved:zh?'已公开':'Published',rejected:zh?'未通过 / 已下架':'Not approved / unpublished'};
 function changePage(next:number){setLoading(true);setPage(next);setAttempt(a=>a+1);}
 return <div className="wall-content wrap"><div className="wall-toolbar glass"><div><Flower2 size={20}/><h2>{zh?'相遇留下的小纸条':'Notes left by fellow explorers'}</h2><span>{pageInfo.total}</span></div><button className="icon-button" aria-label={zh?'刷新公开留言':'Refresh public notes'} onClick={()=>setAttempt(a=>a+1)}><RefreshCw size={18}/></button></div>
  {loading&&visibleNotes.length===0?<p className="glass wall-empty" role="status">{t.loading}</p>:<>{error&&<p className="glass wall-error" role="status">{zh?'暂时无法更新留言，请稍后刷新。':'Notes could not be updated. Please refresh in a moment.'}</p>}{visibleNotes.length===0?<p className="glass wall-empty">{zh?'风把纸页轻轻翻开，等待第一张留言。':'A quiet page, waiting for its first note.'}</p>:<div className="notes-wall approved-wall">{visibleNotes.map((note,index)=><WallNote key={note.id} note={note} index={index} locale={locale}/>)}</div>}</>}
  {pageInfo.totalPages>1&&<nav className="wall-pagination glass" aria-label={zh?'留言分页':'Message pages'} aria-busy={loading}>
   <button type="button" disabled={loading||pageInfo.page<=1} onClick={()=>changePage(pageInfo.page-1)}><ChevronLeft size={16}/>{zh?'上一页':'Previous'}</button>
   <span aria-live="polite">{pageInfo.page} / {pageInfo.totalPages}</span>
   <button type="button" disabled={loading||pageInfo.page>=pageInfo.totalPages} onClick={()=>changePage(pageInfo.page+1)}>{zh?'下一页':'Next'}<ChevronRight size={16}/></button>
  </nav>}
  <section className="glass wall-compose"><div className="compose-heading"><div><p className="section-kicker"><Send size={16}/>{zh?'写下此刻的想法':'Leave a little thought'}</p><h2>{zh?'一封小小的来信。':'A small letter, from you.'}</h2></div><ShieldCheck size={25}/></div><p className="compose-intro">{zh?'留言需要登录教育邮箱，提交后由站主审核。公开展示昵称与内容，邮箱不会公开。':'Sign in with an education email. The owner reviews every note; only your nickname and message appear publicly.'}</p>
   {auth.loading?<p role="status">{zh?'正在确认登录状态…':'Checking your session…'}</p>:!auth.user?<div className="wall-signin"><Link className="button primary" href={`${routeFor(locale,'/auth/')}?next=${encodeURIComponent(routeFor(locale,'/guestbook/'))}`}>{zh?'登录 / 注册后留言':'Sign in / register to leave a note'}<ShieldCheck size={17}/></Link></div>:<form className="note-form" onSubmit={submit}><div className="signed-author"><span>{auth.user.role==='admin'?name:auth.user.nickname}</span><small>{zh?'以此昵称留言':'Posting with this nickname'}</small>{auth.user.role==='admin'&&<Link className="text-link" href={routeFor(locale,'/admin/')}>{zh?'审核留言':'Moderate notes'}<ShieldCheck size={15}/></Link>}</div><label className="honeypot" aria-hidden="true">Website<input value={website} onChange={e=>setWebsite(e.target.value)} tabIndex={-1} autoComplete="off"/></label><label className="wall-message-label"><span>{t.message}</span><textarea rows={4} maxLength={500} required value={message} onChange={e=>setMessage(e.target.value)} placeholder={zh?'一句问候、一个想法，或者一个想交流的问题。':'A greeting, an idea, or a question you would like to explore.'}/><small>{message.length} / 500</small></label><div className="form-bottom"><p role="status">{status||t.max}</p><button className="button primary" disabled={sending||!message.trim()}>{sending?<LoaderCircle className="spin" size={16}/>:<Send size={16}/>} {sending?t.sending:zh?'提交审核':'Submit for review'}</button></div></form>}
   <noscript><p className="no-script-note">{zh?'登录与留言需要启用 JavaScript；公开页面仍可浏览。':'Enable JavaScript to sign in and post. The public portfolio remains readable.'}</p></noscript>
  </section>
  {auth.user&&<section className="glass my-notes"><button className="my-notes-heading" aria-expanded={showMine} onClick={()=>setShowMine(v=>!v)}><span>{zh?'我的留言与审核状态':'My notes and review status'}</span><small>{zh?'仅自己可见':'Visible only to you'} · {mine.length}</small></button>{showMine&&<>{mineError?<p role="status">{mineError}<button className="text-link" onClick={()=>setMineAttempt(a=>a+1)}>{zh?'重试':'Retry'}</button></p>:mine.length===0?<p>{zh?'你还没有留下纸条。':'You have not left any notes yet.'}</p>:<div className="own-notes-list">{mine.map(note=><article key={note.id}><span className={`review-badge ${note.status}`}>{states[note.status||'pending']}</span><p>{note.message}</p><time>{new Date(note.createdAt).toLocaleDateString(zh?'zh-CN':'en-GB')}</time></article>)}</div>}</>}</section>}
 </div>;
}
