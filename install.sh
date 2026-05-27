#!/usr/bin/env bash
# Bootstrap pi-agent config symlink on a new machine.
# Run from repo root: ./install.sh
#
# Creates symlink: ~/.pi/agent → <repo>/pi-agent
# Existing ~/.pi/agent is backed up to ~/.pi/agent.backup.YYYYMMDDHHMMSS.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
TARGET="$HOME/.pi/agent"
SOURCE="$REPO_ROOT/pi-agent"
BACKUP_DIR="$HOME/.pi/agent.backup.$(date +%Y%m%d%H%M%S)"

echo "=== pi-config bootstrap ==="
echo "Repo: $REPO_ROOT"
echo "Target: $TARGET"
echo ""

# Already correctly linked?
if [[ -L "$TARGET" ]] && [[ "$(readlink -f "$TARGET")" == "$(readlink -f "$SOURCE")" ]]; then
  echo "[skip] $TARGET → already linked correctly"
  exit 0
fi

# Backup existing dir/symlink
if [[ -e "$TARGET" || -L "$TARGET" ]]; then
  mkdir -p "$BACKUP_DIR"
  mv "$TARGET" "$BACKUP_DIR/"
  echo "[backup] $TARGET → $BACKUP_DIR/"
fi

ln -s "$SOURCE" "$TARGET"
echo "[link] $TARGET → $SOURCE"
echo ""
echo "=== Done ==="
