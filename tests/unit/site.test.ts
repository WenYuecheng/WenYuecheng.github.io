import {describe,it,expect} from 'vitest';
import {site,content,routeFor,music} from '../../data/site';
describe('public website',()=>{
 it('uses the public identity in both languages',()=>{expect(site.name).toBe('Eugene');expect(content.en.name).toBe('Eugene');expect(content.zh.name).toBe('Eugene');});
 it('preserves language routes',()=>{expect(routeFor('zh','/projects/weyra/')).toBe('/zh/projects/weyra/');expect(routeFor('en','/zh/contact/')).toBe('/contact/');});
 it('keeps the selected local music',()=>{expect(music.autoPlay).toBe(true);expect(music.volume).toBe(.25);expect(music.tracks[0].src).toBe('/music/cant-give-up.mp3');});
});
