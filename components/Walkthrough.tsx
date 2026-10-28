'use client';
import { useState } from 'react';
import { ArrowRight, Check, GitBranch, RotateCcw } from 'lucide-react';
export function Walkthrough({stages,locale,slug,explanations}:{stages:string[];locale:'en'|'zh';slug:string;explanations:string[]}) {
 const [step,setStep]=useState(0);
 return <div className={`walkthrough ${slug}`}><div className="walkthrough-top"><span><GitBranch size={16}/> {locale==='zh'?'流程漫游':'Explore the flow'}</span><span>{step+1} / {stages.length}</span></div><div className="flow-stages">{stages.map((label,i)=><button key={label} onClick={()=>setStep(i)} aria-pressed={step===i} className={i===step?'selected':i<step?'complete':''}><span>{i<step?<Check size={12}/>:i+1}</span>{label}</button>)}</div><div className="flow-description" aria-live="polite"><strong>{stages[step]}</strong><p>{explanations[step]}</p></div><button className="text-link" onClick={()=>setStep((step+1)%stages.length)}>{step===stages.length-1?(locale==='zh'?'再走一遍':'Start again'):(locale==='zh'?'下一步':'Next step')}{step===stages.length-1?<RotateCcw size={15}/>:<ArrowRight size={15}/>}</button></div>;
}
