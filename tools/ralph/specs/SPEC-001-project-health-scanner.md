# SPEC-001: Project Health Scanner

## Overview

A Python CLI tool that scans the C:\dev monorepo and generates a prioritized "finish list" by analyzing project health metrics.

## Problem Statement

- 20+ apps in monorepo with unclear completion status
- No single source of truth for "what needs work"
- Manual effort to determine project staleness
- Easy to forget about partially-built projects

## Target Users

- Bruce (solo dev) running from PowerShell

## Core Requirements

### REQ-1: Project Discovery

- Scan `C:\dev\apps\` for all subdirectories
- Scan `C:\dev\packages\` for all subdirectories
- Identify project type by presence of:
  - `package.json` → Node/React project
  - `requirements.txt` or `pyproject.toml` → Python project
  - `Cargo.toml` → Rust project
  - `project.json` → Nx-managed project

### REQ-2: Health Metrics (per project)

- **Last Modified**: Most recent file change (excluding node_modules, .venv, **pycache**)
- **Staleness Score**: Days since last modification (higher = more stale)
- **TODO Count**: Grep for `TODO`, `FIXME`, `HACK` in source files
- **Has Tests**: Boolean — test files exist
- **Build Status**: Can it build without errors (optional, expensive)
- **README Exists**: Boolean
- **Size**: Line count of source files

### REQ-3: Output Formats

- **Console**: Pretty-printed table with color coding
- **Markdown**: `C:\dev\PROJECT_HEALTH.md` auto-generated report
- **JSON**: Machine-readable for integration (optional)

### REQ-4: Prioritization Algorithm

Score = (Staleness * 0.4) + (TODO_Count * 0.3) + (No_Tests * 0.2) + (No_README * 0.1)
Higher score = needs more attention

### REQ-5: CLI Interface

```
python -m health_scanner [OPTIONS]

Options:
  --path PATH       Root path to scan (default: C:\dev)
  --output FORMAT   console|markdown|json (default: console)
  --top N           Show only top N projects (default: all)
  --include-build   Run build check (slow)
```

## Non-Requirements (Out of Scope)

- GUI interface
- Auto-fixing issues
- Git integration (user has no git workflow)
- Watching for changes (one-shot tool)

## Success Criteria

- Runs in under 30 seconds for full monorepo scan
- Correctly identifies all 20+ projects
- Output is actionable (clear next steps)
- Zero false positives in project detection

## Technical Constraints

- Python 3.11+ (available in C:\dev\.venv)
- No external dependencies beyond stdlib if possible
- Windows-native paths (backslashes)
- Must handle permission errors gracefully
