import {describe,it,expect} from 'vitest';
import {content,site} from '../../data/site';
describe('public export privacy',()=>{
 it('contains only the public identity and no protected profile facts',()=>{
  const publicData=JSON.stringify({content,site});
  expect(site.name).toBe('Eugene');
  for(const secret of ['Sichuan University','四川大学','/images/portrait.webp','MSc in Computer Science'])expect(publicData).not.toContain(secret);
 });
});
