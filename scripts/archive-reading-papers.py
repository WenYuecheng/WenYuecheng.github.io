#!/usr/bin/env python3
"""Verify the prepared catalog and safely archive its local originals.

Dry run is the default. Run with --apply to move verified originals into
Downloads/已上架论文. Unregistered future PDFs are listed and left untouched.
The helper uses only Python's standard library and never uploads PDF bytes.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
OFFICIAL_HOSTS = {'arxiv.org', 'github.com', 'huggingface.co', 'www.nature.com',
                  'openaccess.thecvf.com', 'papers.nips.cc', 'proceedings.nips.cc',
                  'proceedings.mlr.press'}


def checksum(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def safe_file(directory: Path, name: str) -> Path:
    if not name or name != Path(name).name or '/' in name or '\\' in name:
        raise ValueError(f'Unsafe source filename: {name!r}')
    path = directory / name
    if path.is_symlink():
        raise ValueError(f'Symbolic link refused: {path}')
    if path.exists() and not path.is_file():
        raise ValueError(f'Not a regular file: {path}')
    return path


def read_catalog(path: Path) -> list[dict]:
    text = path.read_text(encoding='utf-8')
    match = re.search(r'export const papers\s*:\s*Paper\[\]\s*=\s*(\[.*\])\s*;', text, re.S)
    if not match:
        raise ValueError('Catalog must contain a JSON-compatible papers array')
    papers = json.loads(match.group(1))
    if not papers or len({p['id'] for p in papers}) != len(papers):
        raise ValueError('Catalog is empty or contains duplicate IDs')
    for paper in papers:
        url = urlparse(paper['url'])
        if url.scheme != 'https' or url.hostname not in OFFICIAL_HOSTS or url.username or url.password:
            raise ValueError(f'Unverified external destination for {paper["id"]}')
        if url.hostname in {'github.com', 'huggingface.co'} and not url.path.startswith('/deepseek-ai/'):
            raise ValueError(f'Unexpected report publisher for {paper["id"]}')
        if not paper['title'].strip() or not all(paper['summary'][locale].strip() for locale in ('zh', 'en')):
            raise ValueError(f'Incomplete record: {paper["id"]}')
    return papers


def write_json_atomic(path: Path, value: dict) -> None:
    if path.is_symlink():
        raise ValueError(f'Symbolic link refused: {path}')
    handle, temp_name = tempfile.mkstemp(prefix='.reading-manifest-', dir=path.parent)
    try:
        with os.fdopen(handle, 'w', encoding='utf-8') as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write('\n')
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp_name, path)
    finally:
        Path(temp_name).unlink(missing_ok=True)



def copy_verified_atomic(original: Path, destination: Path, expected: str) -> None:
    """Stage complete bytes before atomically placing a final file without replacement.

    Abrupt process exit may leave a hidden .reading-copy-*.tmp file. These are
    deliberately outside the PDF destination namespace and ignored on retry;
    a fresh unique staging file can never conflict with the prepared mapping.
    """
    handle, temp_name = tempfile.mkstemp(prefix='.reading-copy-', suffix='.tmp', dir=destination.parent)
    staging = Path(temp_name)
    try:
        with os.fdopen(handle, 'wb') as outgoing, original.open('rb') as incoming:
            shutil.copyfileobj(incoming, outgoing)
            outgoing.flush()
            os.fsync(outgoing.fileno())
        shutil.copystat(original, staging)
        if checksum(staging) != expected:
            raise ValueError(f'Staged copy verification failed; original retained: {original}')
        try:
            # Same-directory hard linking commits a complete file atomically and
            # fails if another process has occupied the destination; never replace.
            os.link(staging, destination, follow_symlinks=False)
        except FileExistsError:
            safe_file(destination.parent, destination.name)
            if checksum(destination) != expected:
                raise ValueError(f'Destination appeared with different bytes; original retained: {destination}')
        directory_handle = os.open(destination.parent, os.O_RDONLY)
        try:
            # Persist the final directory entry before the caller removes source.
            os.fsync(directory_handle)
        finally:
            os.close(directory_handle)
    finally:
        staging.unlink(missing_ok=True)


def prepare(source_dir: Path, archive_dir: Path, sources: list[dict], papers: list[dict]) -> list[dict]:
    if len(sources) != len(papers) or {s['paperId'] for s in sources} != {p['id'] for p in papers}:
        raise ValueError('Catalog/source parity mismatch')
    if len({s['file'] for s in sources}) != len(sources):
        raise ValueError('Duplicate source filenames')
    by_id = {p['id']: p for p in papers}
    records = []
    for source in sources:
        paper = by_id[source['paperId']]
        digest = source['sha256']
        if not re.fullmatch('[a-f0-9]{64}', digest):
            raise ValueError('Invalid SHA256')
        if source['addedAt'] != paper['addedAt']:
            raise ValueError(f'Source timestamp mismatch: {source["file"]}')
        original = safe_file(source_dir, source['file'])
        destination = safe_file(archive_dir, source['file'])
        if destination.exists() and checksum(destination) != digest:
            destination = safe_file(archive_dir, f'{Path(source["file"]).stem}--{digest[:12]}.pdf')
            if destination.exists() and checksum(destination) != digest:
                raise ValueError(f'Checksum-suffix destination also conflicts: {destination}')
        if original.exists() and checksum(original) != digest:
            raise ValueError(f'Source checksum mismatch: {original}')
        if not original.exists() and not destination.exists():
            raise ValueError(f'Original and archive both missing: {original}')
        records.append({'paperId': paper['id'], 'source': str(original), 'destination': str(destination),
                        'title': paper['title'], 'url': paper['url'], 'sha256': digest,
                        'addedAt': source['addedAt'], 'status': 'prepared' if original.exists() else 'archived'})
    return records


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, default=Path.home() / 'Downloads')
    parser.add_argument('--archive-dir', type=Path)
    parser.add_argument('--sources', type=Path, default=ROOT / 'scripts/reading-sources.json')
    parser.add_argument('--catalog', type=Path, default=ROOT / 'data/reading.ts')
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    source_dir = args.source_dir.expanduser().resolve(strict=True)
    archive_input = args.archive_dir or source_dir / '已上架论文'
    if archive_input.is_symlink():
        raise ValueError('Archive directory must not be a symbolic link')
    archive_dir = archive_input.expanduser().resolve()
    if archive_dir == source_dir:
        raise ValueError('Archive directory must differ from source directory')
    sources = json.loads(args.sources.read_text(encoding='utf-8'))['sources']
    papers = read_catalog(args.catalog)
    records = prepare(source_dir, archive_dir, sources, papers)
    unregistered = sorted(p.name for p in source_dir.iterdir() if p.suffix.lower() == '.pdf' and p.name not in {s['file'] for s in sources})
    print(json.dumps({'mode': 'apply' if args.apply else 'dry-run', 'verified': len(records),
                      'toMove': sum(r['status'] == 'prepared' for r in records),
                      'unregisteredLeftUntouched': unregistered, 'archive': str(archive_dir)}, ensure_ascii=False))
    if not args.apply:
        return
    archive_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = safe_file(archive_dir, '上架清单.json')
    manifest = {'schemaVersion': 1, 'datePolicy': 'addedAt is the original source mtime, not a reading date.',
                'records': records}
    if manifest_path.exists():
        previous = json.loads(manifest_path.read_text(encoding='utf-8'))
        old_ids = {r['paperId'] for r in previous['records']}
        if old_ids - {r['paperId'] for r in records}:
            raise ValueError('Refusing to discard existing manifest records')
        for old in previous['records']:
            current = next(r for r in records if r['paperId'] == old['paperId'])
            if any(current[key] != old[key] for key in ('source', 'destination', 'sha256')):
                raise ValueError('Existing manifest mapping differs; manual reconciliation required')
    write_json_atomic(manifest_path, manifest)
    for record in records:
        original = Path(record['source'])
        destination = Path(record['destination'])
        # Validate again immediately before file operations; prepare() validates every record first.
        safe_file(source_dir, original.name)
        safe_file(archive_dir, destination.name)
        if original.exists():
            if checksum(original) != record['sha256']:
                raise ValueError(f'Source changed during archive: {original}')
            if not destination.exists():
                copy_verified_atomic(original, destination, record['sha256'])
            if checksum(destination) != record['sha256']:
                raise ValueError(f'Archive verification failed; original retained: {destination}')
            if checksum(original) != record['sha256']:
                raise ValueError(f'Source changed; original retained: {original}')
            original.unlink()
        elif checksum(destination) != record['sha256']:
            raise ValueError(f'Archive checksum mismatch: {destination}')
        record['status'] = 'archived'
        write_json_atomic(manifest_path, manifest)
    readme = safe_file(archive_dir, 'README.md')
    readme.write_text('# 已上架论文\n\n此文件夹保存已整理为网站书目链接的原始 PDF；网站不托管这些 PDF。\n\n'
                      '上架清单.json 记录原路径、归档路径、标题、官方链接和 SHA256，可据此核验或恢复。\n'
                      'addedAt 来自原文件修改时间，不代表精确阅读时间；论文日期来自书目来源。\n\n'
                      '日后直接下载到 Downloads 的 PDF 不会被本次脚本自动收录，应先核对元数据并加入目录。\n'
                      '脚本默认仅检查；使用 --apply 后才移动，重复执行会核验已有归档且不会产生重复文件。\n'
                      '同名不同内容保留原文件，并给新归档加校验和后缀；脚本不会覆盖 PDF。\n', encoding='utf-8')
    print(f'Archived and verified {len(records)} originals; manifest: {manifest_path}')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f'Archive refused: {error}', file=sys.stderr)
        sys.exit(1)
