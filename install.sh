#!/usr/bin/env bash
# Bootstrap pi-agent config symlinks on a new machine.
# Run from repo root: ./install.sh
#
# This creates symlinks from ~/.pi/agent/ → this repo.
# Existing files/dirs at target paths are backed up to ~/.pi/agent.backup.YYYYMMDDHHMMSS.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
PI_AGENT="$HOME/.pi/agent"
BACKUP_DIR="$HOME/.pi/agent.backup.$(date +%Y%m%d%H%M%S)"

# Paths to symlink (relative to PI_AGENT → relative to REPO_ROOT/pi-agent)
declare -A LINKS=(
  ["agents"]="pi-agent/agents"
  ["extensions"]="pi-agent/extensions"
  ["skills"]="pi-agent/skills"
  ["bin"]="pi-agent/bin"
  ["caveman.json"]="pi-agent/caveman.json"
  ["mcp.json"]="pi-agent/mcp.json"
  ["settings.json"]="pi-agent/settings.json"
  ["models.json"]="pi-agent/models.json"
  ["pi-codex-conversion.json"]="pi-agent/pi-codex-conversion.json"
  ["pi-hermes-memory/skills"]="pi-hermes-memory/skills"
)

backup_and_link() {
  local target="$PI_AGENT/$1"
  local source="$REPO_ROOT/$2"

  # If target exists and is NOT already a symlink to the right place, back it up
  if [[ -e "$target" || -L "$target" ]]; then
    if [[ -L "$target" ]] && [[ "$(readlink -f "$target")" == "$(readlink -f "$source")" ]]; then
      echo "[skip] $target → already linked correctly"
      return
    fi
    mkdir -p "$BACKUP_DIR"
    mv "$target" "$BACKUP_DIR/"
    echo "[backup] $target → $BACKUP_DIR/"
  fi

  mkdir -p "$(dirname "$target")"
  ln -s "$source" "$target"
  echo "[link] $target → $source"
}

echo "=== pi-config bootstrap ==="
echo "Repo: $REPO_ROOT"
echo "Target: $PI_AGENT"
echo "Backup: $BACKUP_DIR"
echo ""

for rel_target in "${!LINKS[@]}"; do
  backup_and_link "$rel_target" "${LINKS[$rel_target]}"
done

echo ""
echo "=== Done ==="
