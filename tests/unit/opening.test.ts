import {describe,it,expect} from 'vitest';
import {parseOpeningScene,projectOpeningPoint,OPENING_DURATION} from '../../lib/opening';
const scene={enabled:true,closed:'/images/opening/elf-side-closed.webp',open:'/images/opening/elf-side-open.webp',focusX:62,focusY:45};
describe('optional opening artwork configuration',()=>{
 it('stays dormant until explicitly enabled',()=>{expect(parseOpeningScene({...scene,enabled:false})).toBeNull();expect(parseOpeningScene(null)).toBeNull();});
 it('accepts only images from the local opening directory',()=>{expect(parseOpeningScene(scene)).toMatchObject(scene);for(const open of ['https://example.org/eye.webp','//evil.test/eye.webp','/images/opening/../portrait.webp','/images/opening/a.svg'])expect(parseOpeningScene({...scene,open})).toBeNull();});
 it('bounds crop positions',()=>{expect(parseOpeningScene({...scene,focusX:200,focusY:-1})).toMatchObject({focusX:100,focusY:0});expect(parseOpeningScene({...scene,focusX:'50%',focusY:null})).toMatchObject({focusX:62,focusY:45});});
 it('keeps the light on the actual iris after cover-cropping landscape and phone screens',()=>{
  const crop={focusX:87,focusY:44};const art={width:1536,height:1024};
  expect(projectOpeningPoint({x:84.5,y:39.2},crop,art,{width:1536,height:1024})).toEqual({x:1297.92,y:401.408,scale:1});
  const phone=projectOpeningPoint({x:84.5,y:39.2},crop,art,{width:390,height:844});
  expect(phone.x).toBeCloseTo(307.65,1);expect(phone.y).toBeCloseTo(330.848,2);
  const wide=projectOpeningPoint({x:84.5,y:39.2},crop,art,{width:1920,height:1080});
  expect(wide.x).toBeCloseTo(1622.4,1);expect(wide.y).toBeCloseTo(413.76,2);
 });
 it('bounds eye coordinates and extends the opening only moderately',()=>{
  expect(parseOpeningScene({...scene,eyeX:300,eyeY:-10})).toMatchObject({eyeX:100,eyeY:0});
  expect(parseOpeningScene({...scene,eyeX:'bad',eyeY:null})).toMatchObject({eyeX:84.5,eyeY:39.2});
  expect(OPENING_DURATION).toBe(7200);
 });
 it('allows a local turned-closed pose and falls back safely for older configurations',()=>{
  expect(parseOpeningScene({...scene,turned:'/images/opening/elf-turn-closed.webp'})).toMatchObject({turned:'/images/opening/elf-turn-closed.webp'});
  expect(parseOpeningScene(scene)).toMatchObject({turned:scene.closed});
  expect(parseOpeningScene({...scene,turned:'https://example.com/turn.webp'})).toBeNull();
  expect(parseOpeningScene({...scene,half:'/images/opening/elf-side-half.webp'})).toMatchObject({half:'/images/opening/elf-side-half.webp'});
  expect(parseOpeningScene({...scene,half:'https://example.com/half.webp'})).toBeNull();
 });
});
