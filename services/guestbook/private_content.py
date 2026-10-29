"""Read private portfolio data from an explicitly configured external directory."""
import json
from pathlib import Path

from fastapi import HTTPException

PUBLIC_NAME = 'Eugene'
PUBLIC_PORTRAIT = '/images/visitor-fox-original.webp'
ASSET_IDS = frozenset({'weyra', 'solaceai', 'emblem'})
PROJECT_FIELDS = ('slug', 'tags', 'coverAsset', 'backdrop', 'accent', 'links')
COPY_FIELDS = ('title', 'kicker', 'summary', 'description')
ADMIN_FIELDS = ('role', 'architecture', 'features', 'stages', 'walkthrough')


def load_content(directory: Path | None) -> dict:
    try:
        if directory is None:
            raise ValueError('missing directory')
        root = directory.resolve(strict=True)
        source = (root / 'content.json').resolve(strict=True)
        if not source.is_relative_to(root) or not source.is_file():
            raise ValueError('invalid source')
        content = json.loads(source.read_text(encoding='utf-8'))
        if not isinstance(content, dict):
            raise ValueError('invalid configuration')
        for locale in ('en', 'zh'):
            if not isinstance(content['identity'][locale], str) or not content['identity'][locale]:
                raise ValueError('missing identity')
            for field in ('profile', 'education', 'interests'):
                content['home'][locale][field]
        if not isinstance(content['projects'], list) or not isinstance(content['assets'], dict):
            raise ValueError('invalid configuration')
        return content
    except (OSError, ValueError, TypeError, KeyError):
        raise HTTPException(503, 'Private content is temporarily unavailable.') from None


def project_view(project: dict, locale: str, admin: bool) -> dict:
    try:
        fields = COPY_FIELDS + (ADMIN_FIELDS if admin else ())
        return {**{key: project[key] for key in PROJECT_FIELDS},
                **{key: project[locale][key] for key in fields if key in project[locale]}}
    except (KeyError, TypeError):
        raise HTTPException(503, 'Private content is temporarily unavailable.') from None


def asset_path(directory: Path, content: dict, asset_id: str) -> Path:
    if asset_id not in ASSET_IDS or asset_id not in content['assets']:
        raise HTTPException(404, 'Asset not found.')
    try:
        root = directory.resolve(strict=True)
        relative = Path(content['assets'][asset_id])
        candidate = (root / relative).resolve(strict=True)
        if relative.is_absolute() or not candidate.is_relative_to(root) or not candidate.is_file() or candidate.suffix.lower() not in {'.webp', '.png', '.jpg', '.jpeg'}:
            raise ValueError('invalid asset')
        return candidate
    except (OSError, ValueError, TypeError):
        raise HTTPException(503, 'Private content is temporarily unavailable.') from None
