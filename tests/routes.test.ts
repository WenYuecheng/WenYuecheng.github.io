import { describe, expect, it } from 'vitest';
import { localizedProjectPath, alternatePath } from '../src/lib/routes';

describe('localized routes', () => {
  it('keeps English at root and Chinese under /zh', () => {
    expect(localizedProjectPath('en', 'mindbridge')).toBe('/projects/mindbridge/');
    expect(localizedProjectPath('zh', 'mindbridge')).toBe('/zh/projects/mindbridge/');
    expect(alternatePath('en', '/projects/mindbridge/')).toBe('/zh/projects/mindbridge/');
    expect(alternatePath('zh', '/zh/projects/mindbridge/')).toBe('/projects/mindbridge/');
    expect(alternatePath('zh', '/zh/404/')).toBe('/404.html');
  });
});
