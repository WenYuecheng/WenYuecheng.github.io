'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {PRIVACY_VERSION} from '../data/legal';
import { site, type Locale } from '../data/site';
export type Account={id:string;nickname:string;email:string;role:'user'|'admin'};
export const accountName=(user:Account,locale:Locale)=>locale==='zh'&&/^Visitor \d{8}$/.test(user.nickname)?'访客'+user.nickname.slice(8):user.nickname;
type Session={token:string;expiresAt:string;user:Account};
type Options={method?:string;body?:unknown;authenticated?:boolean;signal?:AbortSignal;response?:'blob'};
export class ApiError extends Error {constructor(public status:number,message='Request failed',public retryAfter=0){super(message);}}
export function accountError(error:unknown,locale:Locale){
 const status=error instanceof ApiError?error.status:0;
 const zh=locale==='zh';
 if(status===429)return zh?'操作有点频繁，请稍后再试。':'Please pause a little before trying again.';
 if(status===400||status===401)return zh?'验证码有误或已过期，请重新验证登录。':'The code or session is invalid or expired. Please sign in again.';
 if(status===403)return zh?'当前账号没有此操作权限。':'This account cannot perform that action.';
 if(status===422)return zh?'请检查邮箱、验证码或输入长度。支持 edu 教育邮箱，站主使用专用管理员邮箱。':'Check your email, code and input lengths. Use an edu education email, or the configured owner email.';
 return zh?'暂时无法完成请求，请稍后重试，已填写的内容会保留。':'The request could not be completed. Please retry; your draft is retained.';
}
type AuthState={revision:number;user:Account|null;loading:boolean;unavailable:boolean;api:<T>(path:string,options?:Options)=>Promise<T>;signIn:(challengeId:string,code:string,privacyAccepted:boolean)=>Promise<Account>;logout:()=>Promise<void>;refresh:()=>Promise<void>};
const Context=createContext<AuthState|null>(null);
const key='yuecheng-account-session';
const signedOutKey='eugene-signed-out';
function signedOut(){try{return localStorage.getItem(signedOutKey)==='1';}catch{return false;}}
const validUser=(u:Account)=>u&&typeof u.id==='string'&&typeof u.nickname==='string'&&typeof u.email==='string'&&['user','admin'].includes(u.role);
export function AuthProvider({children}:{children:ReactNode}){
 const [revision,setRevision]=useState(0);
 const token=useRef<string|null>(null),expiry=useRef<string|null>(null),generation=useRef(0),refreshId=useRef(0);
 const [user,setUser]=useState<Account|null>(null),[loading,setLoading]=useState(true),[unavailable,setUnavailable]=useState(false),[expiresAt,setExpiresAt]=useState<string|null>(null);
 const clear=useCallback(()=>{generation.current++;setRevision(v=>v+1);token.current=null;expiry.current=null;setUser(null);setExpiresAt(null);setLoading(false);try{sessionStorage.removeItem(key);}catch{}},[]);
 const api=useCallback(async<T,>(path:string,options:Options={}):Promise<T>=>{
  if(!path.startsWith('/')||path.startsWith('//'))throw new ApiError(400);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12_000);
  const abort=()=>controller.abort();options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)controller.abort();
  try{
   const sentToken=options.authenticated?token.current:null,sentGeneration=generation.current;
   const headers:Record<string,string>={};
   if(options.body!==undefined)headers['Content-Type']='application/json';
   if(options.authenticated&&sentToken)headers.Authorization=`Bearer ${sentToken}`;
   const response=await fetch(`${site.api}${path}`,{method:options.method||'GET',headers,body:options.body===undefined?undefined:JSON.stringify(options.body),signal:controller.signal,cache:'no-store',credentials:options.authenticated||path.startsWith('/auth/')?'include':'omit',keepalive:path==='/auth/logout'});
   if(!response.ok){if(response.status===401&&options.authenticated&&generation.current===sentGeneration)clear();const raw=response.headers.get('Retry-After'),seconds=raw&&/^\d+$/.test(raw)?Number(raw):raw?Math.ceil((Date.parse(raw)-Date.now())/1000):0;throw new ApiError(response.status,'Request failed',Number.isFinite(seconds)?Math.max(0,Math.min(86400,seconds)):0);}
   return response.status===204?undefined as T:options.response==='blob'?await response.blob() as T:await response.json() as T;
  }finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
 },[clear]);
 const refresh=useCallback(async()=>{
  if(signedOut()){clear();return;}
  const checkedGeneration=generation.current,id=++refreshId.current;
  setLoading(true);setUnavailable(false);
  try{
   const data=await api<{user:Account;expiresAt:string}>('/auth/me',{authenticated:true});
   if(generation.current!==checkedGeneration||refreshId.current!==id)return;
   if(!validUser(data.user)||!Number.isFinite(Date.parse(data.expiresAt))||Date.parse(data.expiresAt)<=Date.now())throw new ApiError(401);
   setUser(data.user);expiry.current=data.expiresAt;setExpiresAt(data.expiresAt);
  }catch(error){
   if(generation.current!==checkedGeneration||refreshId.current!==id)return;
   if(error instanceof ApiError&&error.status===401)clear();
   else {setUser(null);setUnavailable(true);}
  }finally{if(refreshId.current===id)setLoading(false);}
 },[api,clear]);
 useEffect(()=>{
  if(signedOut()){clear();return;}
  try{const saved=JSON.parse(sessionStorage.getItem(key)||'null');if(saved&&typeof saved.token==='string'&&/^[A-Za-z0-9_-]{40,256}$/.test(saved.token)&&Date.parse(saved.expiresAt)>Date.now()){token.current=saved.token;expiry.current=saved.expiresAt;}else sessionStorage.removeItem(key);}
  catch{/* A server-issued HttpOnly cookie can still restore this session. */}
  void refresh();
 },[refresh]);
 useEffect(()=>{const changed=(event:StorageEvent)=>{if(event.key===signedOutKey){if(signedOut())clear();else void refresh();}};window.addEventListener('storage',changed);return()=>window.removeEventListener('storage',changed);},[clear,refresh]);
 useEffect(()=>{const check=()=>{void refresh();};const onShow=(event:PageTransitionEvent)=>{if(event.persisted)check();};const visible=()=>{if(document.visibilityState==='visible')check();};window.addEventListener('pageshow',onShow);document.addEventListener('visibilitychange',visible);return()=>{window.removeEventListener('pageshow',onShow);document.removeEventListener('visibilitychange',visible);};},[refresh]);
 useEffect(()=>{if(!expiresAt)return;const timer=setTimeout(clear,Math.min(2147483647,Math.max(0,Date.parse(expiresAt)-Date.now())));return()=>clearTimeout(timer);},[expiresAt,clear]);
 const signIn=async(challengeId:string,code:string,privacyAccepted:boolean)=>{
  const data=await api<Session>('/auth/verify',{method:'POST',body:{challengeId,code,privacyAccepted,privacyVersion:PRIVACY_VERSION}});
  if(!validUser(data.user)||typeof data.token!=='string'||!/^[A-Za-z0-9_-]{40,256}$/.test(data.token)||!(Date.parse(data.expiresAt)>Date.now()))throw new ApiError(503);
  generation.current++;setRevision(v=>v+1);token.current=data.token;expiry.current=data.expiresAt;setUser(data.user);setExpiresAt(data.expiresAt);setUnavailable(false);setLoading(false);
  try{localStorage.removeItem(signedOutKey);}catch{}
  try{sessionStorage.setItem(key,JSON.stringify({token:data.token,expiresAt:data.expiresAt}));}catch{/* This visit still works in memory. */}
  return data.user;
 };
 const logout=async()=>{
  const request=api('/auth/logout',{method:'POST',body:{},authenticated:true});
  try{localStorage.setItem(signedOutKey,'1');}catch{}
  clear();setUnavailable(false);
  await request;
 };
 return <Context.Provider value={{revision,user,loading,unavailable,api,signIn,logout,refresh}}>{children}</Context.Provider>;
}
export function useAuth(){const value=useContext(Context);if(!value)throw Error('AuthProvider required');return value;}
