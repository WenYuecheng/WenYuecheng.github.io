import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('supplied project artwork', () => {
  const artworkPath = resolve('public/projects/terminal-welcome.svg');

  it('ships the Yuecheng-Harness terminal welcome SVG', () => {
    expect(existsSync(artworkPath)).toBe(true);
  });

  it('does not make remote font requests from the SVG', () => {
    if (!existsSync(artworkPath)) return;
    expect(readFileSync(artworkPath, 'utf8')).not.toMatch(/url\(["']?https?:\/\//);
  });
});
