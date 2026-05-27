#!/usr/bin/env bash
set -euo pipefail

project_name="${PROJECT_NAME:-<%= projectName %>}"
iterations="${RALPH_ITERATIONS:-3}"
workspace_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

cd "$workspace_root"

for iteration in $(seq 1 "$iterations"); do
  echo "Ralph UX polish loop ${iteration}/${iterations}: running ${project_name}:e2e"
  pnpm nx e2e "$project_name" -- --project=chromium
done

echo "Ralph UX polish loop complete. Review playwright-report/index.html for visual traces."
