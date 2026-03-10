---
allowed-tools: Bash(nx show:*), Bash(git:*), Bash(powershell:*), mcp__nx-mcp__nx_project_details, mcp__nx-mcp__nx_workspace
description: Deep dive analysis of a specific Nx project
argument-hint: <project-name>
model: sonnet
---

# Nx Project Deep Dive

Comprehensive analysis of a specific project including targets, configurations, dependencies, cache status, and build inputs/outputs.

## Argument Validation

Project Name: ${ARGUMENTS[0]}

If no project name provided:

```
════════════════════════════════════════
  ERROR: PROJECT NAME REQUIRED
════════════════════════════════════════

Usage: /nx:project-info <project-name>

Available projects:
[Run: nx show projects]

Example: /nx:project-info digital-content-builder
```

Exit if no project name provided.

## Step 1: Validate Project Exists

Execute bash command to check if project exists:

```bash
nx show project ${ARGUMENTS[0]} 2>&1
```

If project not found, present error:

```
════════════════════════════════════════
  ERROR: PROJECT NOT FOUND
════════════════════════════════════════

Project "${ARGUMENTS[0]}" does not exist in workspace.

Available projects:
[Run: nx show projects to list all]

Did you mean:
[Suggest similar project names if possible]
```

Exit if project doesn't exist.

## Step 2: Get Project Details

Use Nx MCP tool to get complete project configuration:

```
mcp__nx-mcp__nx_project_details projectName=${ARGUMENTS[0]}
```

Present with header:

```
════════════════════════════════════════
  PROJECT: ${ARGUMENTS[0]}
════════════════════════════════════════
```

Show basic info:

```
Name: [project-name]
Type: [application/library]
Root: [project-root-path]
Source Root: [src-path]

Tags: [list project tags]
Description: [project description if available]
```

## Step 3: Target Configuration

Present with header:

```
════════════════════════════════════════
  AVAILABLE TARGETS
════════════════════════════════════════
```

List all targets with their configuration:

```
TARGET: build
  Executor: @nx/vite:build
  Options:
    - outputPath: dist/apps/[project]
    - configFile: vite.config.ts
  Inputs:
    - production
    - ^production
    - {projectRoot}/src/**
    - {projectRoot}/index.html
  Outputs:
    - {projectRoot}/dist/**
  Cache: Enabled ✓
  Dependencies: [list target dependencies]

TARGET: dev
  Executor: @nx/vite:dev-server
  Options:
    - buildTarget: [project]:build
    - port: 3000
    - hmr: true
  Cache: Disabled (development target)

TARGET: test
  Executor: @nx/vite:test
  Options:
    - passWithNoTests: true
    - coverage: false
  Inputs:
    - default
    - ^production
  Outputs:
    - {projectRoot}/coverage/**
  Cache: Enabled ✓

[List all other targets similarly]

QUICK RUN COMMANDS:
nx run ${ARGUMENTS[0]}:build
nx run ${ARGUMENTS[0]}:dev
nx run ${ARGUMENTS[0]}:test
nx run ${ARGUMENTS[0]}:lint
```

## Step 4: Dependency Analysis

Present with header:

```
════════════════════════════════════════
  DEPENDENCIES
════════════════════════════════════════
```

Show project dependencies:

```
IMPLICIT DEPENDENCIES:
[Projects this project depends on]
Count: [number]

[List each dependency with relationship]
- @vibetech/ui-components (library)
- @vibetech/utils (library)
- shared-config (library)

DEPENDENT PROJECTS:
[Projects that depend on this project]
Count: [number]

[List projects that import/use this project]
- digital-content-builder-admin
- mobile-app

EXTERNAL DEPENDENCIES:
[From package.json]
Count: [number]

Production Dependencies:
- react: ^18.3.1
- react-dom: ^18.3.1
- [list other prod deps]

Development Dependencies:
- vite: ^5.0.0
- typescript: ^5.3.0
- [list other dev deps]

DEPENDENCY IMPACT:
- Changes to this project affect [count] other projects
- This project depends on [count] internal projects
- Build order: [position in dependency chain]

VISUALIZATION:
Run: nx graph --focus=${ARGUMENTS[0]}
To see this project's position in dependency graph
```

## Step 5: Cache Status & Performance

Execute bash command to check cache:

```bash
powershell -Command "if (Test-Path 'node_modules/.cache/nx') { Get-ChildItem -Path 'node_modules/.cache/nx' -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match '${ARGUMENTS[0]}' } | Measure-Object -Property Length -Sum | Select-Object Count, @{Name='Size';Expression={[math]::Round($_.Sum / 1MB, 2)}} }"
```

Present with header:

```
════════════════════════════════════════
  CACHE STATUS & PERFORMANCE
════════════════════════════════════════
```

Show cache information:

```
Local Cache:
- Cached artifacts: [count] files
- Cache size: [size] MB
- Last cached: [timestamp if available]

CACHEABLE TARGETS:
✓ build - Enabled
✓ test - Enabled
✓ lint - Enabled
✓ typecheck - Enabled

NON-CACHEABLE TARGETS:
  dev - Development server
  start - Runtime target

CACHE CONFIGURATION:
Inputs (what invalidates cache):
- Source files: {projectRoot}/src/**
- Config files: vite.config.ts, tsconfig.json
- Dependencies: ^production
- Global configs: eslint.config.js, tailwind.config.ts

Outputs (what gets cached):
- Build artifacts: {projectRoot}/dist/**
- Test coverage: {projectRoot}/coverage/**
- Type definitions: {projectRoot}/dist/**/*.d.ts

PERFORMANCE METRICS:
[Estimate based on project size]
- Cold build: ~[estimate] seconds
- Cached build: < 1 second
- Test execution: ~[estimate] seconds
- Lint check: ~[estimate] seconds

CACHE EFFICIENCY:
[If cache exists]
✓ Cache is populated and healthy
  Next builds will be fast

[If no cache]
⚠️  No cache found for this project
    Run: nx build ${ARGUMENTS[0]}
    To populate cache
```

## Step 6: Build Configuration

Present with header:

```
════════════════════════════════════════
  BUILD CONFIGURATION
════════════════════════════════════════
```

Show detailed build configuration:

```
BUILD SETTINGS:
- Output Path: dist/apps/${ARGUMENTS[0]}
- Bundle Format: [ESM/CommonJS/Both]
- Minification: Enabled
- Source Maps: Enabled (dev), Disabled (prod)
- Tree Shaking: Enabled

VITE CONFIGURATION:
- Config File: vite.config.ts
- Build Target: ES2020
- CSS Processing: PostCSS + Tailwind
- Asset Handling: Automatic optimization

INPUT FILES:
- Entry point: src/main.tsx
- HTML template: index.html
- Public assets: public/**
- Environment: .env files

OUTPUT STRUCTURE:
dist/apps/${ARGUMENTS[0]}/
  ├── index.html
  ├── assets/
  │   ├── [hash].js
  │   └── [hash].css
  └── [other assets]

BUILD OPTIMIZATION:
✓ Code splitting enabled
✓ Asset optimization enabled
✓ Lazy loading configured
✓ Bundle analysis available

RUN BUILD:
nx build ${ARGUMENTS[0]}                    # Development build
nx build ${ARGUMENTS[0]} --configuration=production  # Production build
```

## Step 7: Git History & Activity

Execute bash commands to check project activity:

```bash
git log --oneline --since="30 days ago" -- apps/${ARGUMENTS[0]} | wc -l
```

```bash
git log --oneline -5 -- apps/${ARGUMENTS[0]}
```

Present with header:

```
════════════════════════════════════════
  PROJECT ACTIVITY
════════════════════════════════════════
```

Show git activity:

```
Recent Activity (Last 30 Days):
- Commits: [count]
- Last Modified: [date]
- Last Commit: [commit message]

Recent Commits:
[Show last 5 commits affecting this project]

Contributors:
[Run git shortlog to show contributors]

ACTIVITY LEVEL:
[If commits > 50]
⚡ High activity - actively developed

[If commits 10-50]
✓ Moderate activity - stable development

[If commits < 10]
⚠️  Low activity - maintenance mode or stable

[If commits = 0]
⚠️  No recent changes
    Verify project is still active
```

## Step 8: Configuration Files

Present with header:

```
════════════════════════════════════════
  CONFIGURATION FILES
════════════════════════════════════════
```

List important configuration files:

```
PROJECT CONFIGURATION:
✓ project.json - Nx project configuration
✓ package.json - Dependencies and scripts
✓ tsconfig.json - TypeScript configuration
✓ vite.config.ts - Build tool configuration

[Check for additional configs]
✓ tailwind.config.ts - Styling configuration
✓ postcss.config.js - CSS processing
✓ .eslintrc.json - Linting rules
✓ vitest.config.ts - Testing configuration

WORKSPACE CONFIGURATION (Inherited):
- nx.json - Global Nx settings
- tsconfig.base.json - Shared TypeScript config
- eslint.config.js - Shared ESLint config
- vite.config.ts - Shared Vite config

VIEW CONFIGURATION:
nx show project ${ARGUMENTS[0]} --json
```

## Step 9: Project Health Check

Execute validation checks:

Present with header:

```
════════════════════════════════════════
  PROJECT HEALTH CHECK
════════════════════════════════════════
```

Show health status:

```
VALIDATION CHECKS:

✓ Configuration Valid
  - All required targets defined
  - Proper executors configured
  - Valid input/output paths

✓ Dependencies Healthy
  - No circular dependencies detected
  - All imports resolved
  - Package.json in sync

[Run quick validation]
✓ TypeScript Compilation
  Run: nx typecheck ${ARGUMENTS[0]}

✓ Linting
  Run: nx lint ${ARGUMENTS[0]}

✓ Build Success
  Run: nx build ${ARGUMENTS[0]}

ISSUES FOUND:
[List any issues detected]

RECOMMENDATIONS:
[Provide specific recommendations for this project]
- Update outdated dependencies
- Improve cache configuration
- Add missing tests
- Optimize build settings
```

## Step 10: Quick Actions

Present with header:

```
════════════════════════════════════════
  QUICK ACTIONS
════════════════════════════════════════
```

Provide actionable commands:

```
DEVELOPMENT:
nx run ${ARGUMENTS[0]}:dev               # Start dev server
nx run ${ARGUMENTS[0]}:build             # Build project
nx run ${ARGUMENTS[0]}:preview           # Preview build

QUALITY CHECKS:
nx run ${ARGUMENTS[0]}:lint              # Run linter
nx run ${ARGUMENTS[0]}:lint --fix        # Auto-fix lint issues
nx run ${ARGUMENTS[0]}:typecheck         # TypeScript check
nx run ${ARGUMENTS[0]}:test              # Run tests

ANALYSIS:
nx graph --focus=${ARGUMENTS[0]}         # View dependencies
nx affected --base=main                  # Check if affected
nx run ${ARGUMENTS[0]}:build --verbose   # Detailed build info

TROUBLESHOOTING:
nx reset                                 # Clear cache
nx build ${ARGUMENTS[0]} --skip-nx-cache # Force rebuild
nx show project ${ARGUMENTS[0]} --json   # Raw configuration

RELATED COMMANDS:
/nx:workspace-health                     # Overall workspace health
/nx:affected                             # Check affected projects
/nx:graph                                # View dependency graph
/nx:cache-clear                          # Clear project cache

════════════════════════════════════════
  PROJECT ANALYSIS COMPLETE
════════════════════════════════════════
```

$ARGUMENTS

**IMPORTANT EXECUTION NOTES:**

- Execute bash commands using the Bash tool
- Use Nx MCP tools for detailed project analysis
- Project name is case-sensitive
- All commands run from C:\dev as base directory
- Analysis is read-only and safe to run anytime
- Results provide comprehensive project understanding
- Use for troubleshooting and optimization
