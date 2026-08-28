#!/usr/bin/env bash
set -euo pipefail

SITE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$SITE_ROOT/dist"
DEPLOY_ROOT="$(cd "$SITE_ROOT/../mindbridge-py/deploy" && pwd)"
TARGET_DIR="$DEPLOY_ROOT/site"
STAGING_DIR="$DEPLOY_ROOT/.site-next"
BACKUP_DIR="$DEPLOY_ROOT/.site-previous"

if [[ ! -f "$SOURCE_DIR/index.html" || "$TARGET_DIR" != */mindbridge-py/deploy/site ]]; then
  echo "Refusing to sync: build output or target validation failed." >&2
  exit 1
fi

for work_dir in "$STAGING_DIR" "$BACKUP_DIR"; do
  if [[ -d "$work_dir" ]]; then
    find "$work_dir" -mindepth 1 -delete
    rmdir "$work_dir"
  fi
done

mkdir "$STAGING_DIR"
rsync -a --delete "$SOURCE_DIR/" "$STAGING_DIR/"

if [[ -d "$TARGET_DIR" ]]; then mv "$TARGET_DIR" "$BACKUP_DIR"; fi
if mv "$STAGING_DIR" "$TARGET_DIR"; then
  echo "Portfolio synchronized to $TARGET_DIR"
  [[ -d "$BACKUP_DIR" ]] && echo "Previous site retained at $BACKUP_DIR"
else
  [[ -d "$BACKUP_DIR" ]] && mv "$BACKUP_DIR" "$TARGET_DIR"
  echo "Sync failed; previous site restored." >&2
  exit 1
fi
