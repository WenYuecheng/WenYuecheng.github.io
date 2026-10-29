import {describe,it,expect} from 'vitest';
import {parseOpeningScene,projectOpeningPoint,openingMoment,OPENING_DURATION} from '../../lib/opening';
const scene={enabled:true,image:'/images/opening/sunrise-mist.webp',focusX:50,focusY:45,sunX:94,sunY:69};
describe('sunrise through mist opening',()=>{
 it('accepts only enabled local artwork and rejects URL/path injection',()=>{
  expect(parseOpeningScene(scene)).toMatchObject(scene);
  expect(parseOpeningScene({...scene,enabled:false})).toBeNull();expect(parseOpeningScene(null)).toBeNull();
  for(const image of ['https://example.org/a.webp','//evil.test/a.webp','/images/opening/../a.webp','/images/opening/a.svg'])expect(parseOpeningScene({...scene,image})).toBeNull();
 });
 it('allows only local browser-compatible video sources',()=>{
  expect(parseOpeningScene({...scene,video:'/videos/opening/sunrise-wipe.mp4'})).toMatchObject({video:'/videos/opening/sunrise-wipe.mp4'});
  for(const video of ['https://evil.test/a.mp4','/videos/opening/../a.mp4','/videos/opening/a.mov'])expect(parseOpeningScene({...scene,video})).toBeNull();
 });
 it('bounds artwork focus and sun positions',()=>{
  expect(parseOpeningScene({...scene,focusX:200,focusY:-1,sunX:-1,sunY:300})).toMatchObject({focusX:100,focusY:0,sunX:0,sunY:100});
  expect(parseOpeningScene({...scene,focusX:null,sunX:'94%'})).toMatchObject({focusX:50,sunX:94});
 });
 it('projects light from the actual sun in cover and mobile contain layouts',()=>{
  const art={width:1536,height:1024},crop={focusX:50,focusY:50};
  expect(projectOpeningPoint({x:94,y:69},crop,art,{width:1536,height:1024})).toEqual({x:1443.84,y:706.56,scale:1});
  const phone=projectOpeningPoint({x:94,y:69},crop,art,{width:390,height:844},'contain');
  expect(phone.x).toBeCloseTo(366.6,1);expect(phone.y).toBeCloseTo(471.4,1);
 });
 it('starts obscured, wipes continuously right to left, then holds the completely clear image',()=>{
  expect(OPENING_DURATION).toBe(10000);
  expect(openingMoment(0)).toMatchObject({wipe:0,clear:0,sun:0});
  let previous=-1;
  for(let i=0;i<=100;i++){const moment=openingMoment(i/100);expect(moment.wipe).toBeGreaterThanOrEqual(previous);expect(moment.wipe).toBeLessThanOrEqual(1);previous=moment.wipe;}
  expect(openingMoment(.4).wipe).toBeGreaterThan(0);expect(openingMoment(.4).wipe).toBeLessThan(openingMoment(.65).wipe);
  expect(openingMoment(.88)).toMatchObject({wipe:1,clear:1,sun:1});
  expect(openingMoment(Number.NaN)).toEqual(openingMoment(0));expect(openingMoment(8)).toEqual(openingMoment(1));
 });
});
