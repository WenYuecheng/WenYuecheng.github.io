import { describe, expect, it } from 'vitest';
import { allContent, projectSlugs, validateContent } from '../src/data/content';

describe('bilingual portfolio content', () => {
  it('passes the shared schema for both languages', () => {
    expect(() => validateContent(allContent)).not.toThrow();
  });

  it('has four unique bilingual project slugs', () => {
    expect(projectSlugs).toHaveLength(4);
    expect(new Set(projectSlugs).size).toBe(projectSlugs.length);
    expect(allContent.en.projects.map((project) => project.slug)).toEqual(projectSlugs);
    expect(allContent.zh.projects.map((project) => project.slug)).toEqual(projectSlugs);
  });

  it('only exposes the approved public contact channels', () => {
    expect(allContent.en.socialLinks.map((link) => link.label)).toEqual(['Email', 'GitHub', 'CSDN']);
    expect(JSON.stringify(allContent)).not.toMatch(/linkedin|phone|curriculum vitae|cv download/i);
  });

  it('uses the confirmed academic figures', () => {
    expect(allContent.en.education.average).toBe('91.01/100');
    expect(allContent.en.education.rank).toBe('26/320');
    expect(allContent.en.education.ielts).toBe('7.0');
  });

  it('uses the correct Chinese name everywhere', () => {
    expect(allContent.zh.profile.name).toBe('温悦成');
    expect(allContent.zh.meta.title).toContain('温悦成');
    expect(JSON.stringify(allContent)).not.toContain('温悦程');
  });

  it('gives every photograph a stable detail-page slug', () => {
    for (const locale of ['en', 'zh'] as const) {
      const slugs = allContent[locale].photography.items.map((item) => (item as { slug?: string }).slug);
      expect(slugs).toEqual(['signal-dusk', 'frame-coast', 'artifact-shore']);
    }
  });
});
