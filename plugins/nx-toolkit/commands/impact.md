---
name: impact
description: Deep cascade impact analysis - shows what breaks if a project or file changes
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
  - TaskCreate
  - TaskUpdate
  - TaskList
argument-hint: "<project-name> [--depth <n>] [--include-tests]"
---

# Impact Analysis

Perform deep cascade impact analysis for a given project. Goes beyond `nx affected` by showing the full dependency chain, affected consumers, and estimated blast radius.

## Execution Steps

### 1. Parse Arguments

Extract:
- `project-name` (required) - The project to analyze
- `--depth N` (optional, default: 3) - How many levels deep to trace
- `--include-tests` (optional) - Include test targets in analysis

### 2. Get Project Graph

Retrieve the Nx project graph:

```bash
pnpm nx graph --file=output.json 2>/dev/null
```

Read the generated graph file to understand all project dependencies.

Alternatively, use `pnpm nx show project <name>` to get project details.

### 3. Trace Dependency Chain

Starting from the target project, trace:

**Direct dependents** (depth 1):
- Projects that directly import from the target
- Found via project graph "dependents" edges

**Indirect dependents** (depth 2+):
- Projects that depend on direct dependents
- Continue tracing up to `--depth` levels

**Implicit dependents**:
- Projects with `implicitDependencies` on the target
- Found in `project.json` configurations

### 4. Classify Impact

For each affected project, classify the impact level:

- **CRITICAL** - Direct runtime dependency (will break immediately)
- **HIGH** - Direct build dependency (will fail to compile)
- **MEDIUM** - Indirect dependency through 1 hop
- **LOW** - Indirect dependency through 2+ hops
- **TEST-ONLY** - Only test targets are affected

### 5. Present Impact Report

```
Impact Analysis: shared-utils
==============================

Target: @vibetech/shared-utils (packages/shared-utils)
Change Type: Any modification to source files

IMPACT CASCADE (depth: 3)
─────────────────────────

Level 1 - DIRECT (8 projects):
  CRITICAL  apps/nova-agent           - imports formatDate, debounce
  CRITICAL  apps/vibe-code-studio     - imports logger, fileUtils
  CRITICAL  apps/crypto-enhanced      - imports config helpers
  HIGH      packages/shared-components - imports type utilities
  HIGH      packages/ui-components     - imports className helpers
  HIGH      apps/iconforge            - imports path utilities
  MEDIUM    apps/business-booking     - imports via shared-components
  TEST-ONLY testing-utils             - imports test helpers

Level 2 - INDIRECT (4 projects):
  MEDIUM    apps/vibe-tutor           - via shared-components
  MEDIUM    apps/shipping-pwa         - via ui-components
  LOW       apps/vibe-tech-lovable    - via shared-components → ui-components
  LOW       apps/desktop-commander    - via shared-config

Level 3 - TRANSITIVE (1 project):
  LOW       backend/openrouter-proxy  - via nova-agent → shared-config

BLAST RADIUS SUMMARY
────────────────────
  Total affected: 13 / 52 projects (25%)
  Critical:       3 projects
  High:           3 projects
  Medium:         4 projects
  Low:            2 projects
  Test-only:      1 project

RECOMMENDED ACTIONS
───────────────────
  1. Run tests: pnpm nx affected -t test --base=main
  2. Build check: pnpm nx affected -t build --base=main
  3. Review critical consumers before merging
```

### 6. Specific Import Analysis

For CRITICAL impacts, show what specific exports are consumed:

```bash
# Find what the dependent project imports from target
grep -rn "from '@vibetech/shared-utils'" apps/nova-agent/src/ --include="*.ts" --include="*.tsx"
```

This helps determine if the change actually affects used exports.

### 7. Clean Up

Remove temporary files:

```bash
rm -f output.json
```

## Tips

- Use before making breaking changes to shared libraries
- Critical consumers should be tested thoroughly
- If blast radius is >50%, consider if the change should be in a new package
- Combine with `/nx-toolkit:dep-sync` to understand version impacts
