# Desktop Quality Check Command

---

name: quality-check
display_name: Desktop Quality Check
category: desktop
description: Run automated quality checks (lint + typecheck + format) with auto-fix
priority: high

---

## Command

```bash
/desktop:quality-check [options]
```

## Options

- **`--fix`** (default: true) - Auto-fix ESLint errors and format code
- **`--project`** (default: auto-detect) - Specify project (vibe-code-studio, nova-agent, etc.)
- **`--parallel`** (default: true) - Run checks in parallel for speed
- **`--config`** (optional) - Specify TypeScript config (strict, build.relaxed)

## Description

Delegates to the **desktop-quality-checker** sub-agent to run comprehensive quality checks on desktop applications. Automatically detects and fixes common issues like unused React imports, TypeScript errors, and formatting problems.

## What It Does

1. **ESLint Check & Auto-Fix**
   - Runs ESLint with proper memory settings (4GB for vibe-code-studio)
   - Auto-fixes unused imports, variable naming, import order
   - Reports remaining errors

2. **TypeScript Compilation**
   - Detects correct tsconfig (strict vs build.relaxed)
   - Runs `tsc --noEmit` to check types
   - Reports type errors with file:line references

3. **Code Formatting**
   - Runs Prettier on modified files
   - Formats before other checks to reduce noise
   - Integrates with lint-staged

4. **Quality Metrics**
   - Reports file complexity (files >500 lines)
   - Detects React anti-patterns (React.FC usage)
   - Checks IPC type safety (Tauri/Electron)

## Examples

### Basic usage (auto-detect project)

```bash
/desktop:quality-check
```

### Specific project with auto-fix

```bash
/desktop:quality-check --project=vibe-code-studio --fix
```

### Using relaxed TypeScript config for builds

```bash
/desktop:quality-check --config=build.relaxed
```

### Sequential checks (not parallel)

```bash
/desktop:quality-check --parallel=false
```

## Expected Output

```
✓ Desktop Quality Check Complete

Lint: 12 files checked, 8 auto-fixed
  - Removed unused React imports (3 files)
  - Prefixed unused event parameters (2 files)
  - Fixed import order (5 files)

TypeScript: 45 files checked, 0 errors

Format: 5 files formatted

⚠ Warnings:
  - apps/vibe-code-studio/src/App.tsx exceeds 500 lines (512)

Execution time: 2.4s
```

## When To Use

- **Before committing code** - Ensure quality passes before push
- **After major refactoring** - Validate all changes comply with standards
- **CI/CD pipeline** - Automated quality gate
- **Daily development** - Quick sanity check during coding

## Sub-Agent Details

- **Delegates to**: desktop-quality-checker
- **Model**: Claude Haiku 4 (fast, cheap)
- **Context**: 3k tokens (configs only)
- **Execution time**: 2-3 minutes typical
- **Cost**: ~$0.01 per run (Haiku pricing)

## Integration

This command automatically triggers the desktop-quality-checker sub-agent through the desktop-expert parent agent. The sub-agent runs with minimal context (only configuration files) for maximum speed and cost efficiency.

## Related Commands

- `/desktop:test-smart` - Run tests with coverage
- `/desktop:cleanup` - Clean build artifacts
- `/lint` - Basic linting only (without TypeScript/format)

## Troubleshooting

### ESLint memory errors

If you see "JavaScript heap out of memory":

```bash
# The sub-agent auto-adjusts NODE_OPTIONS for vibe-code-studio
# No action needed - it handles 4GB memory requirement
```

### TypeScript config confusion

If wrong tsconfig is used:

```bash
# Specify explicitly
/desktop:quality-check --config=build.relaxed
```

### Slow execution (>5 min)

```bash
# Check Nx cache - may need reset
pnpm nx reset

# Then retry
/desktop:quality-check
```

---

**Created**: 2026-01-15
**Last Updated**: 2026-01-15
**Status**: Active (Phase 1)
