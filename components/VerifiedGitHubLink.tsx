'use client';
import {useState,type ReactNode} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {accountError,ApiError,useAuth} from './Auth';
import {routeFor,type Locale} from '../data/site';
export function VerifiedGitHubLink({locale,children,className='',ariaLabel}:{locale:Locale;children:ReactNode;className?:string;ariaLabel?:string}){
 const auth=useAuth(),pathname=usePathname(),router=useRouter();
 const[busy,setBusy]=useState(false),[error,setError]=useState('');
 const signIn=()=>router.push(`${routeFor(locale,'/auth/')}?next=${encodeURIComponent(pathname)}`);
 async function open(){
  if(!auth.user){signIn();return;}
  setBusy(true);setError('');
  try{
   const result=await auth.api<{url:string}>('/profile/links/github',{authenticated:true});
   const url=new URL(result.url);if(url.protocol!=='https:'||url.hostname!=='github.com'||!/^\/[A-Za-z0-9-]+\/?$/.test(url.pathname))throw Error('Invalid profile destination');
   window.location.assign(url.href);
  }catch(e){if(e instanceof ApiError&&e.status===401)signIn();else setError(accountError(e,locale));setBusy(false);}
 }
 return <button type="button" className={`verified-github ${className}`} aria-label={ariaLabel} disabled={busy||auth.loading} aria-busy={busy} onClick={()=>void open()}>{children}{error&&<span className="github-access-error" role="status">{error}</span>}</button>;
}
