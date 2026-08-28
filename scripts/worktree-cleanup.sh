#!/usr/bin/env bash
# Safe pre-remove cleanup for a monorepo git worktree (project root).
# Stops root Docker Compose when present and removes worktree-local temp dirs.
# Does not touch node_modules, .nx cache, pnpm store, or D:\ durable data.
#
# Usage:
#   bash scripts/worktree-cleanup.sh
#   bash scripts/worktree-cleanup.sh --dry-run
#   pnpm worktree:cleanup:sh

set -u
DRY_RUN=0
if [[ "${1:-}" == "--dry-run" || "${1:-}" == "-n" ]]; then
  DRY_RUN=1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1
echo "Worktree cleanup root: $ROOT"

compose_file=""
for f in docker-compose.yml docker-compose.yaml compose.yml compose.yaml; do
  if [[ -f "$ROOT/$f" ]]; then
    compose_file="$f"
    break
  fi
done

if [[ -n "$compose_file" ]]; then
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[DryRun] docker compose -f $compose_file down --remove-orphans"
  else
    echo "Stopping Compose ($compose_file)..."
    docker compose -f "$compose_file" down --remove-orphans 2>/dev/null \
      || echo "docker compose down failed or docker unavailable (ignored)."
  fi
else
  echo "No root Compose file; skip docker compose down."
fi

remove_path() {
  local rel="$1"
  local path="$ROOT/$rel"
  if [[ ! -e "$path" ]]; then
    echo "Skip missing: $rel"
    return 0
  fi
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[DryRun] rm -rf $path"
    return 0
  fi
  rm -rf "$path" && echo "Removed: $rel" || echo "Failed to remove: $rel"
}

# Worktree-local temps only — never node_modules, .nx, or D: paths
remove_path ".cache/tmp"
remove_path ".cache"
remove_path "tmp"

echo "Worktree cleanup complete."
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "(DryRun — no changes applied)"
fi
