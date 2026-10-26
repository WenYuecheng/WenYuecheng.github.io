import { describe, it, expect } from 'vitest';
import { content, projects, routeFor, music, admission } from '../../data/site';
describe('public portfolio contract', () => {
 it('contains precisely the two approved projects in both languages', () => {
  expect(projects.map(p => p.slug)).toEqual(['weyra','solaceai']);
  for(const project of projects) for(const locale of ['en','zh'] as const) {
   expect(project[locale].summary.length).toBeGreaterThan(35);
   expect(project[locale].notes.length).toBeGreaterThanOrEqual(2);
   expect(project[locale].architecture.length).toBeGreaterThanOrEqual(3);
  }
 });
 it('describes admission rather than current enrolment', () => {
  expect(admission.start).toBe('2027-09');
  expect(admission.status).toBe('admitted');
  expect(content.en.education.admission).toContain('Admitted');
  expect(content.zh.education.admission).toContain('已录取');
 });
 it('preserves deep routes across language switches', () => {
  expect(routeFor('zh','/projects/weyra/')).toBe('/zh/projects/weyra/');
  expect(routeFor('en','/zh/contact/')).toBe('/contact/');
 });
 it('never invents a playable track', () => {
  expect(music.autoPlay).toBe(true);
  expect(music.tracks).toEqual([]);
 });
});
