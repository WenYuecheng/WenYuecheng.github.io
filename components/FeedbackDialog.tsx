'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {usePathname} from 'next/navigation';
import {Bug,Check,LoaderCircle,Send,Sparkles,X} from 'lucide-react';
import {ApiError,useAuth} from './Auth';
import type {Locale} from '../data/site';
type Quota={remaining:number;limit:number;resetsAt:string};
export function FeedbackDialog({locale}:{locale:Locale}){
 const {user,loading,unavailable,api}=useAuth(),pathname=usePathname(),zh=locale==='zh';
 const dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLElement|null>(null),requestId=useRef('');
 const [open,setOpen]=useState(false),[category,setCategory]=useState('bug'),[title,setTitle]=useState(''),[message,setMessage]=useState(''),[context,setContext]=useState(true),[busy,setBusy]=useState(false),[quota,setQuota]=useState<Quota|null>(null),[status,setStatus]=useState(''),[sent,setSent]=useState(false);
 const active=!!user&&!loading&&!unavailable;
 useEffect(()=>{if(!active){setOpen(false);return;}const onOpen=()=>{opener.current=document.activeElement as HTMLElement;setOpen(true);setStatus('');setSent(false);};window.addEventListener('eugene-report',onOpen);return()=>window.removeEventListener('eugene-report',onOpen);},[active]);
 useEffect(()=>{if(!open)return;const controller=new AbortController();api<Quota>('/feedback/quota',{authenticated:true,signal:controller.signal}).then(setQuota).catch(()=>setQuota(null));return()=>controller.abort();},[api,open]);
 useEffect(()=>{const el=dialog.current;if(open){el?.showModal();}else if(el?.open){el.close();opener.current?.focus();}},[open]);
 const changed=()=>{requestId.current='';setSent(false);setStatus('');};
 const submit=async(event:FormEvent)=>{
  event.preventDefault();if(busy||sent||!active)return;setBusy(true);setStatus('');requestId.current||=crypto.randomUUID().replaceAll('-','');
  try{
   const result=await api<Quota>('/feedback',{method:'POST',authenticated:true,body:{category,title,message,page:context?pathname:'',context:context?`${navigator.userAgent.slice(0,320)} · ${innerWidth}×${innerHeight}`:'',requestId:requestId.current}});
   setQuota(result);setSent(true);setTitle('');setMessage('');requestId.current='';setStatus(zh?'来信已送达，谢谢你帮这里变得更好。':'Delivered. Thank you for making this little space better.');
  }catch(error){
   const code=error instanceof ApiError?error.status:0;
   setStatus(code===429?(zh?'今天的 3 次反馈已用完，明天再来吧。':'You have used today’s 3 reports. Please try again tomorrow.'):code===409?(zh?'反馈仍在发送，请稍后再试，内容已保留。':'Delivery is still in progress. Your draft is safe; please retry shortly.'):(zh?'暂时未能确认送达，草稿已保留，请稍后重试。':'Delivery could not be confirmed. Your draft is safe; please retry shortly.'));
   if(code===429)setQuota(q=>q?{...q,remaining:0}:null);
   if(code===503)requestId.current='';
  }finally{setBusy(false);}
 };
 if(!user)return null;
 return <>{active&&<button className="feedback-launcher" onClick={()=>window.dispatchEvent(new Event('eugene-report'))} aria-label={zh?'问题反馈':'Report an issue'}><Bug size={17}/><span>{zh?'问题反馈':'Feedback'}</span></button>}
 <dialog ref={dialog} className="feedback-dialog" aria-labelledby="feedback-title" onCancel={()=>setOpen(false)} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();if(e.target===e.currentTarget&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))setOpen(false);}}>
  <button className="feedback-close" aria-label={zh?'关闭反馈':'Close feedback'} onClick={()=>setOpen(false)}><X size={20}/></button>
  <div className="feedback-letterhead"><span className="feedback-seal"><Bug size={24}/></span><p>EUGENE · LITTLE IMPROVEMENTS</p><Sparkles size={20}/></div>
  <p className="section-kicker">{zh?'发现问题，也是一种温柔的帮助':'A little care makes a better space'}</p><h2 id="feedback-title">{zh?'留一封改进的小信。':'A little note to make things better.'}</h2>
  <p className="feedback-intro">{zh?'页面出了小状况，或你有一个好建议？告诉我发生了什么。':'Something out of place, or an idea worth sharing? Tell me what happened.'}</p>
  <form onSubmit={submit}>
   <label>{zh?'反馈类型':'Type'}<select value={category} onChange={e=>{setCategory(e.target.value);changed();}} disabled={busy}><option value="bug">{zh?'遇到问题':'Something is broken'}</option><option value="suggestion">{zh?'改进建议':'An improvement idea'}</option><option value="other">{zh?'其他反馈':'Something else'}</option></select></label>
   <label>{zh?'一句话描述':'In a few words'}<input value={title} onChange={e=>{setTitle(e.target.value);changed();}} placeholder={zh?'例如：手机上的项目卡片显示错位':'For example: a project card overlaps on mobile'} required minLength={3} maxLength={100} disabled={busy}/></label>
   <label>{zh?'具体发生了什么':'What happened?'}<textarea value={message} onChange={e=>{setMessage(e.target.value);changed();}} placeholder={zh?'可以写下操作步骤、预期效果和实际看到的情况。请勿填写密码、验证码等敏感信息。':'Steps to reproduce, what you expected, and what you saw. Please leave out passwords, codes and sensitive details.'} required minLength={10} maxLength={3000} rows={5} disabled={busy}/><span className="feedback-count">{message.length} / 3000</span></label>
   <label className="feedback-context"><input type="checkbox" checked={context} onChange={e=>{setContext(e.target.checked);changed();}} disabled={busy}/><span>{zh?'附带当前页面与浏览器信息，方便定位问题':'Include the page and browser details to help reproduce this'}</span></label>
   <div className="feedback-bottom"><span>{quota?(zh?`今日还可反馈 ${quota.remaining} / 3 次`:`${quota.remaining} / 3 reports left today`):(zh?'每天最多 3 次 · 北京时间零点刷新':'3 per day · resets at midnight Beijing time')}</span><button className="button primary" type="submit" disabled={busy||quota?.remaining===0||sent}>{busy?<LoaderCircle size={17} className="feedback-spinner"/>:sent?<Check size={17}/>:<Send size={17}/>} {busy?(zh?'正在投递…':'Sending…'):sent?(zh?'已送达':'Delivered'):(zh?'发送这封信':'Send this note')}</button></div>
   <p className={`feedback-status ${sent?'is-success':''}`} role="status">{status}</p>
  </form>
 </dialog></>;
}
