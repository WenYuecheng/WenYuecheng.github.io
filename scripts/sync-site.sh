#!/usr/bin/env bash
set -euo pipefail
SITE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$SITE_ROOT/out"
TARGET_DIR="${1:-}"
if [[ ! -f "$SOURCE_DIR/index.html" || "$TARGET_DIR" != /opt/solaceai/edge/site || ! -d "$TARGET_DIR" ]]; then
  echo "Usage on the server: scripts/sync-site.sh /opt/solaceai/edge/site (existing site directory required)." >&2
  exit 1
fi
BACKUP_DIR="${TARGET_DIR}.backup-$(date -u +%Y%m%dT%H%M%SZ)"
cp -a "$TARGET_DIR" "$BACKUP_DIR"
# Preserve the bind-mounted root and prior hashed assets during rollout.
rsync -a --exclude='*.html' "$SOURCE_DIR/" "$TARGET_DIR/"
rsync -a --include='*/' --include='*.html' --exclude='*' "$SOURCE_DIR/" "$TARGET_DIR/"
python3 - "$SOURCE_DIR" "$TARGET_DIR" <<'PY'
from pathlib import Path
import sys
source, target = map(Path, sys.argv[1:])
for page in target.rglob('*.html'):
    if not (source / page.relative_to(target)).is_file():
        page.unlink()
PY
printf 'Published into %s; backup retained at %s\n' "$TARGET_DIR" "$BACKUP_DIR"
