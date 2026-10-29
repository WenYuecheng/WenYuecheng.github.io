'use client';
import {createContext,useContext,useEffect,useState,type ReactNode,type ImgHTMLAttributes} from 'react';
import {usePathname} from 'next/navigation';
import {useAuth} from './Auth';
import {site,type Locale} from '../data/site';
export type PrivateHome={name:string;portraitUrl:string;interestsNote?:string;contact:{csdn:string;email?:string};education:{shortName:string;startYear:string;eyebrow:string;title:string;current:string;degree:string;period:string;next:string;nextDegree:string;metrics:string[];values:string[]}};
export type PrivateProject={slug:string;tags:string[];coverAsset:string;backdrop:string;accent:string;links:{key:string;label:string;zh?:string}[];title:string;kicker:string;summary:string;description:string;role?:string;architecture?:string[];features?:{title:string;body:string}[];stages?:string[];walkthrough?:string[]};
export function usePrivateResource<T>(path:string|null){
 const auth=useAuth(),active=!!auth.user&&!auth.loading&&!auth.unavailable;
 const key=active&&path?`${auth.revision}:${auth.user!.id}:${auth.user!.role}:${path}`:'';
 const[state,setState]=useState<{key:string;data:T|null;error:boolean}>({key:'',data:null,error:false});
 useEffect(()=>{if(!key||!path){setState({key:'',data:null,error:false});return;}const controller=new AbortController();setState({key,data:null,error:false});auth.api<T>(path,{authenticated:true,signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setState({key,data,error:false});}).catch(()=>{if(!controller.signal.aborted)setState({key,data:null,error:true});});return()=>controller.abort();},[auth.api,key,path]);
 return {data:key&&state.key===key?state.data:null,error:!!key&&state.key===key&&state.error,loading:!!key&&(state.key!==key||!state.data&&!state.error)};
}
const Identity=createContext<{home:PrivateHome|null;name:string;loading:boolean;error:boolean}>({home:null,name:'Eugene',loading:false,error:false});
export function PrivateContentProvider({children}:{children:ReactNode}){
 const pathname=usePathname(),locale:Locale=pathname.startsWith('/zh')?'zh':'en';
 const result=usePrivateResource<PrivateHome>(`/content/home?locale=${locale}`);
 return <Identity.Provider value={{home:result.data,name:site.name,loading:result.loading,error:result.error}}>{children}</Identity.Provider>;
}
export const useIdentity=()=>useContext(Identity);
export function PrivateImage({asset,...props}:{asset:string}&Omit<ImgHTMLAttributes<HTMLImageElement>,'src'>){
 const auth=useAuth(),active=!!auth.user&&!auth.loading&&!auth.unavailable,key=active?`${auth.revision}:${auth.user!.id}:${auth.user!.role}:${asset}`:'';
 const[state,setState]=useState<{key:string;url:string}>({key:'',url:''});
 useEffect(()=>{if(!key)return;const controller=new AbortController();let url='';auth.api<Blob>(`/content/assets/${encodeURIComponent(asset)}`,{authenticated:true,response:'blob',signal:controller.signal}).then(blob=>{if(controller.signal.aborted)return;url=URL.createObjectURL(blob);setState({key,url});}).catch(()=>{});return()=>{controller.abort();if(url)URL.revokeObjectURL(url);};},[auth.api,key,asset]);
 if(!key||state.key!==key||!state.url)return <span className={`private-image-placeholder ${props.className||''}`} aria-hidden="true"/>;
 return <img {...props} src={state.url}/>;
}
