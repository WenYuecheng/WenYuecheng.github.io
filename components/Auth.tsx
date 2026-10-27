'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { site, type Locale } from '../data/site';
export type Account={id:string;nickname:string;email:string;role:'user'|'admin'};
type Session={token:string;expiresAt:string;user:Account};
type Options={method?:string;body?:unknown;authenticated?:boolean;signal?:AbortSignal};
export class ApiError extends Error {constructor(public status:number,message='Request failed'){super(message);}}
export function accountError(error:unknown,locale:Locale){
 const status=error instanceof ApiError?error.status:0;
 const zh=locale==='zh';
 if(status===429)return zh?'操作有点频繁，请稍后再试。':'Please pause a little before trying again.';
 if(status===400||status===401)return zh?'验证码有误或已过期，请重新验证登录。':'The code or session is invalid or expired. Please sign in again.';
 if(status===403)return zh?'当前账号没有此操作权限。':'This account cannot perform that action.';
 if(status===422)return zh?'请检查邮箱、验证码或输入长度。支持 edu 教育邮箱，站主使用专用管理员邮箱。':'Check your email, code and input lengths. Use an edu education email, or the configured owner email.';
 return zh?'暂时无法完成请求，请稍后重试，已填写的内容会保留。':'The request could not be completed. Please retry; your draft is retained.';
}
type AuthState={user:Account|null;loading:boolean;unavailable:boolean;api:<T>(path:string,options?:Options)=>Promise<T>;signIn:(challengeId:string,code:string,nickname:string)=>Promise<void>;logout:()=>Promise<void>;refresh:()=>Promise<void>};
const Context=createContext<AuthState|null>(null);
const key='yuecheng-account-session';
const validUser=(u:Account)=>u&&typeof u.id==='string'&&typeof u.nickname==='string'&&typeof u.email==='string'&&['user','admin'].includes(u.role);
export function AuthProvider({children}:{children:ReactNode}){
 const token=useRef<string|null>(null),expiry=useRef<string|null>(null);
 const [user,setUser]=useState<Account|null>(null),[loading,setLoading]=useState(true),[unavailable,setUnavailable]=useState(false),[expiresAt,setExpiresAt]=useState<string|null>(null);
 const clear=useCallback(()=>{token.current=null;expiry.current=null;setUser(null);setExpiresAt(null);setLoading(false);try{sessionStorage.removeItem(key);}catch{}},[]);
 const api=useCallback(async<T,>(path:string,options:Options={}):Promise<T>=>{
  if(!path.startsWith('/')||path.startsWith('//'))throw new ApiError(400);
  if(options.authenticated&&!token.current)throw new ApiError(401);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12_000);
  const abort=()=>controller.abort();options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)controller.abort();
  try{
   const sentToken=options.authenticated?token.current:null;
   const headers:Record<string,string>={};
   if(options.body!==undefined)headers['Content-Type']='application/json';
   if(options.authenticated)headers.Authorization=`Bearer ${sentToken}`;
   const response=await fetch(`${site.api}${path}`,{method:options.method||'GET',headers,body:options.body===undefined?undefined:JSON.stringify(options.body),signal:controller.signal,cache:'no-store',credentials:'omit'});
   if(!response.ok){if(response.status===401&&options.authenticated&&token.current===sentToken)clear();throw new ApiError(response.status);}
   return response.status===204?undefined as T:await response.json() as T;
  }finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
 },[clear]);
 const refresh=useCallback(async()=>{
  if(!token.current){setLoading(false);return;}
  const checkedToken=token.current;setLoading(true);setUnavailable(false);
  try{const data=await api<{user:Account;expiresAt:string}>('/auth/me',{authenticated:true});if(token.current!==checkedToken)return;if(!validUser(data.user)||!Number.isFinite(Date.parse(data.expiresAt))||Date.parse(data.expiresAt)<=Date.now())throw new ApiError(401);setUser(data.user);expiry.current=data.expiresAt;setExpiresAt(data.expiresAt);}
  catch(error){if(token.current!==checkedToken)return;if(error instanceof ApiError&&error.status===401)clear();else setUnavailable(true);}
  finally{setLoading(false);}
 },[api,clear]);
 useEffect(()=>{
  try{const saved=JSON.parse(sessionStorage.getItem(key)||'null');if(saved&&typeof saved.token==='string'&&/^[A-Za-z0-9_-]{40,256}$/.test(saved.token)&&Date.parse(saved.expiresAt)>Date.now()){token.current=saved.token;expiry.current=saved.expiresAt;void refresh();}else{clear();setLoading(false);}}
  catch{clear();setLoading(false);}
 },[clear,refresh]);
 useEffect(()=>{if(!expiresAt)return;const timer=setTimeout(clear,Math.max(0,Date.parse(expiresAt)-Date.now()));return()=>clearTimeout(timer);},[expiresAt,clear]);
 const signIn=async(challengeId:string,code:string,nickname:string)=>{
  const data=await api<Session>('/auth/verify',{method:'POST',body:{challengeId,code,nickname}});
  if(!validUser(data.user)||typeof data.token!=='string'||!/^[A-Za-z0-9_-]{40,256}$/.test(data.token)||!(Date.parse(data.expiresAt)>Date.now()))throw new ApiError(503);
  token.current=data.token;expiry.current=data.expiresAt;setUser(data.user);setExpiresAt(data.expiresAt);setUnavailable(false);setLoading(false);
  try{sessionStorage.setItem(key,JSON.stringify({token:data.token,expiresAt:data.expiresAt}));}catch{/* This visit still works in memory. */}
 };
 const logout=async()=>{try{if(token.current)await api('/auth/logout',{method:'POST',body:{},authenticated:true});}finally{clear();setUnavailable(false);}};
 return <Context.Provider value={{user,loading,unavailable,api,signIn,logout,refresh}}>{children}</Context.Provider>;
}
export function useAuth(){const value=useContext(Context);if(!value)throw Error('AuthProvider required');return value;}
