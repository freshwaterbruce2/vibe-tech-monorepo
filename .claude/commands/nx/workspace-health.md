---
allowed-tools: Bash(nx:*), Bash(git:*), Bash(powershell:*), mcp__nx-mcp__nx_workspace, mcp__nx-mcp__nx_project_details
description: Comprehensive workspace health diagnostics and validation
model: sonnet
---

# Nx Workspace Health Check

Comprehensive diagnostics for your Nx workspace including circular dependencies, orphaned projects, configuration validation, cache efficiency, and Nx Cloud connectivity.

## Step 1: Workspace Overview

Use the Nx MCP tool to get workspace structure:

```
mcp__nx-mcp__nx_workspace
```

Present with header:

```
════════════════════════════════════════
  WORKSPACE OVERVIEW
════════════════════════════════════════
```

Show:

- Total projects count
- Project types (apps vs libraries)
- Nx version
- Configuration source (nx.json)

## Step 2: Check for Circular Dependencies

Execute this bash command:

```bash
nx graph --file=temp-graph.json 2>&1
```

Analyze output for circular dependency warnings.

Present with header:

```
════════════════════════════════════════
  CIRCULAR DEPENDENCY CHECK
════════════════════════════════════════
```

If circular dependencies detected:

```
⚠️  CIRCULAR DEPENDENCIES FOUND

[List affected projects and dependency chain]

IMPACT:
- Build order ambiguity
- Potential runtime issues
- Cache invalidation problems
- Increased build times

RESOLUTION:
1. Review dependency chain
2. Extract shared code to separate library
3. Use dependency injection patterns
4. Refactor to break circular reference

Run: nx graph
Then click affected projects to visualize the cycle
```

If no circular dependencies:

```
✓ No circular dependencies detected
  Workspace dependency graph is healthy
```

## Step 3: Identify Orphaned Projects

Execute this bash command to list all projects:

```bash
nx show projects
```

For each project, check if it has dependencies or dependents:

```bash
nx show project <project-name> --json
```

Present with header:

```
════════════════════════════════════════
  ORPHANED PROJECTS ANALYSIS
════════════════════════════════════════
```

Identify projects with:

- No dependencies AND no dependents (completely isolated)
- No recent commits (check git)

Show:

```
Isolated Projects: [count]
[List projects with neither dependencies nor dependents]

RECOMMENDATIONS:
✓ Review if these should be in monorepo
✓ Consider moving to separate repos if independent
✓ Check if they're actively maintained
✓ Verify they're not dead code

Recently Modified:
[Show git log for each isolated project]
```

## Step 4: Validate Project Configurations

Check each project's configuration validity:

Execute bash command:

```bash
nx show projects --json
```

For each project, validate:

- Has build target defined
- Has proper inputs/outputs configured
- Has appropriate caching settings
- Has valid executor references

Present with header:

```
════════════════════════════════════════
  CONFIGURATION VALIDATION
════════════════════════════════════════
```

Show validation results:

```
Projects Analyzed: [count]

VALIDATION CHECKS:
✓ Build targets: [count] configured correctly
✓ Cache settings: [count] properly configured
✓ Input/output paths: [count] valid
⚠️  Missing configurations: [count]

ISSUES FOUND:
[List projects with configuration issues]

Example issues:
- Missing build target: [project-name]
- No cache configuration: [project-name]
- Invalid executor: [project-name]

RECOMMENDATIONS:
Run: /nx:project-info <project-name>
To inspect specific project configuration
```

## Step 5: Analyze Cache Efficiency

Execute bash commands to check cache status:

```bash
powershell -Command "if (Test-Path 'node_modules/.cache/nx') { $files = Get-ChildItem -Path 'node_modules/.cache/nx' -Recurse -File -ErrorAction SilentlyContinue; $size = ($files | Measure-Object -Property Length -Sum).Sum / 1MB; $count = $files.Count; Write-Host \"Size: $([math]::Round($size, 2)) MB\"; Write-Host \"Files: $count\" } else { Write-Host 'No cache found' }"
```

Present with header:

```
════════════════════════════════════════
  CACHE EFFICIENCY ANALYSIS
════════════════════════════════════════
```

Show cache statistics:

```
Local Cache Status:
- Location: node_modules/.cache/nx
- Size: [size] MB
- File count: [count]
- Status: [Healthy/Large/Empty]

CACHE HEALTH:
[If size > 1GB]
⚠️  Cache is large (> 1GB)
    Consider running: /nx:cache-clear deep

[If size < 10MB]
⚠️  Cache is small - may not be effective
    Run quality checks to populate cache

[If 10MB - 1GB]
✓ Cache size is healthy

CACHE CONFIGURATION (nx.json):
Cached Operations:
- build ✓
- test ✓
- lint ✓
- typecheck ✓
- quality ✓

Cache Inputs:
- production files
- configuration files
- dependencies

OPTIMIZATION TIPS:
✓ Use affected commands to minimize cache churn
✓ Configure proper inputs/outputs for tasks
✓ Enable remote caching with Nx Cloud
✓ Clear cache after major dependency updates
```

## Step 6: Check Nx Cloud Connection

Execute bash command to check Nx Cloud status:

```bash
nx show projects --json 2>&1 | grep -i "cloud\|nx cloud" || echo "No cloud messages"
```

Check nx.json for cloud configuration:

```bash
powershell -Command "Get-Content nx.json | Select-String -Pattern 'nxCloudId|cloud'"
```

Present with header:

```
════════════════════════════════════════
  NX CLOUD CONNECTION STATUS
════════════════════════════════════════
```

Show cloud configuration:

```
Cloud Configuration:
- Nx Cloud ID: 68edca82f2b9a8eee56b978f
- Status: [Connected/Disconnected/Not Configured]

[If connected]
✓ Nx Cloud is configured

BENEFITS ENABLED:
✓ Remote caching across machines
✓ Distributed task execution
✓ CI/CD pipeline insights
✓ Workspace analytics
✓ Self-healing CI capabilities

VIEW DASHBOARD:
https://cloud.nx.app/orgs/[org-id]/workspaces/68edca82f2b9a8eee56b978f

RUN COMMAND FOR DETAILED STATUS:
/nx:cloud-status

[If not connected/configured]
⚠️  Nx Cloud not fully configured

SETUP BENEFITS:
- 10x faster CI/CD with distributed caching
- Share cache across team members
- Pipeline insights and analytics
- Automatic failure detection and recovery

TO ENABLE:
nx connect-to-nx-cloud
```

## Step 7: Git Integration Health

Execute bash commands to check git status:

```bash
git status --short | wc -l
```

```bash
git log --oneline -10
```

Present with header:

```
════════════════════════════════════════
  GIT INTEGRATION HEALTH
════════════════════════════════════════
```

Show git health:

```
Current Branch: [branch-name]
Uncommitted Changes: [count] files
Recent Commits: [last 5 commits]

AFFECTED ANALYSIS:
[Run affected check]
Changes since main: [count] projects affected

RECOMMENDATIONS:
✓ Use affected commands in CI/CD
✓ Merge frequently (every 10 commits)
✓ Keep feature branches short-lived
✓ Use conventional commits

Related Commands:
- /git:smart-commit
- /nx:affected
- /monorepo-check
```

## Step 8: Performance Metrics

Execute bash commands to gather performance data:

```bash
powershell -Command "$nodeModulesSize = (Get-ChildItem -Path 'node_modules' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1GB; [math]::Round($nodeModulesSize, 2)"
```

Present with header:

```
════════════════════════════════════════
  PERFORMANCE METRICS
════════════════════════════════════════
```

Show metrics:

```
Workspace Size:
- node_modules: [size] GB
- Cache size: [size] MB
- Total projects: [count]

BUILD PERFORMANCE:
[Estimate based on project count]
- Cold build (no cache): ~[estimate] minutes
- Warm build (cached): ~[estimate] seconds
- Affected build: ~[estimate] seconds

OPTIMIZATION OPPORTUNITIES:
[If node_modules > 5GB]
⚠️  Large node_modules detected
    - Review dependency usage
    - Consider removing unused packages
    - Use pnpm for better space efficiency

[If many projects]
✓ Use nx affected for faster builds
✓ Enable parallel execution
✓ Configure Nx Cloud for distributed tasks

CURRENT CONFIGURATION:
- Package Manager: pnpm (configured)
- Parallel Tasks: Enabled
- Remote Caching: [Check cloud status]
```

## Step 9: Health Summary

Generate comprehensive health score:

Present with header:

```
════════════════════════════════════════
  WORKSPACE HEALTH SUMMARY
════════════════════════════════════════
```

Show final summary:

```
OVERALL HEALTH SCORE: [Calculate percentage based on checks]

✓ PASSED CHECKS:
  [List all passed checks]

⚠️  WARNINGS:
  [List all warnings]

❌ FAILED CHECKS:
  [List all failures]

PRIORITY ACTIONS:
1. [Most critical issue if any]
2. [Second priority issue]
3. [Third priority issue]

RECOMMENDED COMMANDS:
- Fix specific project: /nx:project-info <project-name>
- Clear cache issues: /nx:cache-clear deep
- View dependencies: /nx:graph
- Check cloud status: /nx:cloud-status
- Run affected tests: /nx:affected test

NEXT STEPS:
[Provide actionable next steps based on findings]

════════════════════════════════════════
  HEALTH CHECK COMPLETE
════════════════════════════════════════
```

**IMPORTANT EXECUTION NOTES:**

- Execute bash commands using the Bash tool
- Use Nx MCP tools for workspace analysis
- All checks are non-destructive (read-only)
- Run from C:\dev as base directory
- Health check takes 30-60 seconds to complete
- Results cached for 5 minutes
- Safe to run frequently during development
