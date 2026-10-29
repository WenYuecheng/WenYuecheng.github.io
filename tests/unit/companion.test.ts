import {describe,it,expect} from 'vitest';
import {companionQuotes} from '../../data/companion-quotes';
import {advanceCompanion,clampCompanion} from '../../lib/companion';
describe('companion conversations',()=>{
 it('has all 111 source entries with complete bilingual dialogue stages',()=>{
  expect(companionQuotes.map(q=>q.id)).toEqual(Array.from({length:111},(_,i)=>i+1));
  for(const q of companionQuotes){expect(q.zh.length).toBeGreaterThan(0);expect(q.en.length).toBe(q.zh.length);for(const line of [...q.zh,...q.en])expect(line.trim().length).toBeGreaterThan(0);}
 });
 it('keeps medicine setup, listener question and punchline on separate clicks',()=>{
  const index=companionQuotes.findIndex(q=>q.id===111);
  expect(companionQuotes[index].zh).toEqual(['我要去吃药了。','吃的什么药？','你最最最最重要。']);
  expect(companionQuotes[index].en).toHaveLength(3);
 });
 it('finishes every authored turn, including conversations longer than two turns',()=>{
  for(let index=0;index<companionQuotes.length;index++){
   let cursor={index,part:0};
   for(let part=1;part<companionQuotes[index].zh.length;part++){
    cursor=advanceCompanion(cursor,()=>{throw new Error('Do not skip an authored dialogue turn');});
    expect(cursor).toEqual({index,part});
   }
   expect(advanceCompanion(cursor,()=>0).index).not.toBe(index);
  }
 });
 it('finishes the selected question before consuming another random draw',()=>{
  const question=advanceCompanion(null,()=>1/111);
  expect(companionQuotes[question.index].id).toBe(2);expect(question.part).toBe(0);
  const answer=advanceCompanion(question,()=>{throw new Error('Must not draw another quote yet');});
  expect(answer).toEqual({...question,part:1});
  expect(advanceCompanion(answer,()=>0)).toEqual({index:0,part:0});
 });
 it('reveals declarative and comma-based punchlines on the second click',()=>{
  for(const [id,setup,punchline] of [[44,'我变心了。','今天的我比昨天更喜欢你了。'],[45,'我一点也不想你，','一点半再想。'],[76,'今天吃了一个桃，','爱你在劫难逃。']] as const){
   const index=companionQuotes.findIndex(q=>q.id===id);
   expect(companionQuotes[index].zh).toEqual([setup,punchline]);
   const next=advanceCompanion({index,part:0},()=>{throw new Error('Pending punchline must be revealed first');});
   expect(next).toEqual({index,part:1});
   expect(companionQuotes[index].en).toHaveLength(2);
  }
  expect(companionQuotes.find(q=>q.id===41)?.zh).toHaveLength(1);
 });
 it('avoids consecutive repeated sayings for both ends of the random range',()=>{
  expect(advanceCompanion({index:0,part:1},()=>0).index).toBe(1);
  expect(advanceCompanion({index:110,part:companionQuotes[110].zh.length-1},()=>0.99999).index).toBe(109);
 });
 it('clamps a dragged mascot into narrow or resized viewports',()=>{
  expect(clampCompanion({x:-900,y:4000},{width:114,height:114},{width:320,height:568})).toEqual({x:8,y:446});
  expect(clampCompanion({x:400,y:-20},{width:134,height:134},{width:1440,height:900})).toEqual({x:400,y:8});
 });
});
