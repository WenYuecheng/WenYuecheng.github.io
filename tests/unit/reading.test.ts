import {afterEach, describe, expect, it} from 'vitest';
import {existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync, symlinkSync, realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root = resolve(import.meta.dirname, '../..');
const temporary: string[] = [];
afterEach(() => temporary.splice(0).forEach(path => rmSync(path, {recursive: true, force: true})));
const sources = () => existsSync(join(root, 'scripts/reading-sources.json')) ? JSON.parse(readFileSync(join(root, 'scripts/reading-sources.json'), 'utf8')).sources : [];

async function catalog() {
  if (!existsSync(join(root, 'data/reading.ts'))) return [];
  return (await import('../../data/reading')).papers;
}

describe('reading catalog', () => {
  it('accounts for every one of the 47 inventoried originals exactly once', async () => {
    const papers = await catalog();
    expect(papers).toHaveLength(47);
    expect(sources()).toHaveLength(47);
    expect(new Set(papers.map((paper: {id: string}) => paper.id)).size).toBe(47);
    expect(new Set(sources().map((source: {paperId: string}) => source.paperId))).toEqual(new Set(papers.map((paper: {id: string}) => paper.id)));
  });
  it('has bilingual factual descriptions and safe official external destinations', async () => {
    const papers = await catalog();
    expect(papers.length).toBeGreaterThan(0);
    for (const paper of papers) {
      const url = new URL(paper.url);
      expect(url.protocol).toBe('https:');
      expect(['arxiv.org', 'github.com', 'huggingface.co', 'www.nature.com', 'openaccess.thecvf.com', 'papers.nips.cc', 'proceedings.nips.cc', 'proceedings.mlr.press']).toContain(url.hostname);
      if (url.hostname === 'github.com') expect(url.pathname).toMatch(/^\/deepseek-ai\//);
      if (url.hostname === 'huggingface.co') expect(url.pathname).toMatch(/^\/deepseek-ai\//);
      expect(paper.summary.zh.trim().length).toBeGreaterThan(10);
      expect(paper.summary.en.trim().length).toBeGreaterThan(20);
      expect(paper.title.length).toBeGreaterThan(5);
      expect(paper.tags.length).toBeGreaterThan(0);
      expect(paper.url).not.toMatch(/^(file:|\/)|localhost|127\.0\.0\.1|Downloads/);
      expect(Date.parse(paper.addedAt)).not.toBeNaN();
      if (paper.paperDate !== null) {
        expect(paper.paperDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(paper.year).toBe(Number(paper.paperDate.slice(0, 4)));
      }
    }
  });
  it('uses original modification times as addedAt and sorts newest first', async () => {
    const papers = await catalog();
    expect(papers.length).toBeGreaterThan(0);
    for (const source of sources()) {
      expect(papers.find((paper: {id: string}) => paper.id === source.paperId)?.addedAt).toBe(source.addedAt);
      expect(source.sha256).toMatch(/^[a-f0-9]{64}$/);
      if (/^\d{4}\.\d+v\d+\.pdf$/.test(source.file)) {
        expect(papers.find((paper: {id: string}) => paper.id === source.paperId)?.url).toBe(`https://arxiv.org/abs/${source.file.slice(0, -4)}`);
      }
    }
    expect(papers.map((paper: {addedAt: string}) => Date.parse(paper.addedAt))).toEqual(papers.map((paper: {addedAt: string}) => Date.parse(paper.addedAt)).sort((a: number, b: number) => b - a));
  });
});

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'reading-import-'));
  temporary.push(dir);
  const downloads = join(dir, 'Downloads');
  const archive = join(downloads, '已上架论文');
  mkdirSync(downloads);
  const content = Buffer.from('%PDF-fixture original');
  const sha256 = createHash('sha256').update(content).digest('hex');
  writeFileSync(join(downloads, 'paper.pdf'), content);
  const record = {id: 'paper', title: 'A verified paper', year: 2025, paperDate: null, addedAt: '2026-10-29T01:00:00Z', tags: ['Agents'], summary: {zh: '这是一篇用于测试归档行为的论文。', en: 'This paper tests a safe archival workflow.'}, url: 'https://arxiv.org/abs/2512.08296v1'};
  const sourceFile = join(dir, 'sources.json');
  const catalogFile = join(dir, 'reading.ts');
  writeFileSync(sourceFile, JSON.stringify({sources: [{file: 'paper.pdf', paperId: 'paper', sha256, addedAt: record.addedAt}]}));
  writeFileSync(catalogFile, `export const papers: Paper[] = ${JSON.stringify([record])};`);
  const run = (...args: string[]) => spawnSync('python3', [join(root, 'scripts/archive-reading-papers.py'), '--source-dir', downloads, '--sources', sourceFile, '--catalog', catalogFile, ...args], {encoding: 'utf8'});
  const runInterrupted = (failure: 'exception' | 'exit') => spawnSync('python3', ['-c', `
import os, runpy, shutil, sys
failure_mode = sys.argv[1]
def interrupt_copy(source, destination):
    destination.write(source.read(5))
    destination.flush()
    if failure_mode == 'exit':
        os._exit(73)
    raise OSError('injected copy interruption')
shutil.copyfileobj = interrupt_copy
sys.argv = sys.argv[2:]
runpy.run_path(sys.argv[0], run_name='__main__')
`, failure, join(root, 'scripts/archive-reading-papers.py'), '--source-dir', downloads, '--sources', sourceFile, '--catalog', catalogFile, '--apply'], {encoding: 'utf8'});
  return {downloads, archive, content, sha256, run, runInterrupted, sourceFile};
}

describe('paper archive helper', () => {
  it.each(['exception', 'exit'] as const)('recovers safely after an interrupted %s copy', failure => {
    const f = fixture();
    const interrupted = f.runInterrupted(failure);
    expect(interrupted.status).toBe(failure === 'exit' ? 73 : 1);
    expect(readFileSync(join(f.downloads, 'paper.pdf'))).toEqual(f.content);
    expect(existsSync(join(f.archive, 'paper.pdf'))).toBe(false);
    const prepared = JSON.parse(readFileSync(join(f.archive, '上架清单.json'), 'utf8'));
    expect(prepared.records[0].destination).toBe(join(realpathSync(f.archive), 'paper.pdf'));
    expect(prepared.records[0].status).toBe('prepared');
    expect(readdirSync(f.archive).filter(name => name.startsWith('.reading-copy-') && name.endsWith('.tmp'))).toHaveLength(failure === 'exception' ? 0 : 1);
    const retry = f.run('--apply');
    expect(retry.status, retry.stderr).toBe(0);
    expect(existsSync(join(f.downloads, 'paper.pdf'))).toBe(false);
    expect(readFileSync(join(f.archive, 'paper.pdf'))).toEqual(f.content);
    expect(readdirSync(f.archive).filter(name => name.endsWith('.pdf'))).toEqual(['paper.pdf']);
    const completed = JSON.parse(readFileSync(join(f.archive, '上架清单.json'), 'utf8'));
    expect(completed.records[0]).toMatchObject({destination: prepared.records[0].destination, sha256: f.sha256, status: 'archived'});
    expect(f.run('--apply').status).toBe(0);
  });
  it('supports a dry run, verifies bytes, and is idempotent after moving', () => {
    const f = fixture();
    expect(f.run().status).toBe(0);
    expect(existsSync(join(f.downloads, 'paper.pdf'))).toBe(true);
    expect(existsSync(f.archive)).toBe(false);
    expect(f.run('--apply').status).toBe(0);
    expect(existsSync(join(f.downloads, 'paper.pdf'))).toBe(false);
    expect(readFileSync(join(f.archive, 'paper.pdf'))).toEqual(f.content);
    expect(f.run('--apply').status).toBe(0);
    const manifest = JSON.parse(readFileSync(join(f.archive, '上架清单.json'), 'utf8'));
    expect(manifest.records).toHaveLength(1);
    expect(manifest.records[0]).toMatchObject({paperId: 'paper', title: 'A verified paper', sha256: f.sha256, status: 'archived'});
  });
  it('preserves conflicting destination bytes and picks a deterministic checksum suffix', () => {
    const f = fixture();
    mkdirSync(f.archive);
    writeFileSync(join(f.archive, 'paper.pdf'), 'existing other PDF');
    expect(f.run('--apply').status).toBe(0);
    expect(readFileSync(join(f.archive, 'paper.pdf'), 'utf8')).toBe('existing other PDF');
    expect(readFileSync(join(f.archive, `paper--${f.sha256.slice(0, 12)}.pdf`))).toEqual(f.content);
    expect(f.run('--apply').status).toBe(0);
  });
  it('refuses checksum mismatches before moving any source', () => {
    const f = fixture();
    writeFileSync(join(f.downloads, 'paper.pdf'), '%PDF-changed');
    expect(f.run('--apply').status).not.toBe(0);
    expect(existsSync(join(f.downloads, 'paper.pdf'))).toBe(true);
    expect(existsSync(f.archive)).toBe(false);
  });
  it('leaves future unregistered PDFs distinguishable and untouched', () => {
    const f = fixture();
    writeFileSync(join(f.downloads, 'future.pdf'), '%PDF-future');
    expect(f.run('--apply').status).toBe(0);
    expect(readdirSync(f.downloads)).toContain('future.pdf');
  });
  it('rejects unsafe source names', () => {
    const f = fixture();
    const data = JSON.parse(readFileSync(f.sourceFile, 'utf8'));
    data.sources[0].file = '../paper.pdf';
    writeFileSync(f.sourceFile, JSON.stringify(data));
    expect(f.run('--apply').status).not.toBe(0);
    expect(existsSync(f.archive)).toBe(false);
  });
  it('refuses symbolic-link sources without following or moving them', () => {
    const f = fixture();
    const target = join(f.downloads, 'target.bin');
    writeFileSync(target, f.content);
    rmSync(join(f.downloads, 'paper.pdf'));
    symlinkSync(target, join(f.downloads, 'paper.pdf'));
    expect(f.run('--apply').status).not.toBe(0);
    expect(readFileSync(target)).toEqual(f.content);
    expect(existsSync(f.archive)).toBe(false);
  });
});
