---
allowed-tools: Bash(nx run-many:*), Bash(nx show:*), Bash(powershell:*), mcp__nx-mcp__nx_workspace
description: Run tasks across multiple projects with filtering and parallel execution
argument-hint: <target> [projects]
model: sonnet
---

# Nx Run Many Projects

Execute tasks across multiple projects simultaneously with intelligent filtering, parallel execution management, and progress tracking.

## Argument Validation

Target: ${ARGUMENTS[0]}
Project Filter: ${ARGUMENTS[1]:-all}

If no target provided:

```
════════════════════════════════════════
  ERROR: TARGET REQUIRED
════════════════════════════════════════

Usage: /nx:run-many <target> [projects]

Examples:
/nx:run-many build                    # Build all projects
/nx:run-many test app1,app2           # Test specific projects
/nx:run-many lint --all               # Lint all projects

Common Targets:
- build
- test
- lint
- typecheck
- quality

Available projects:
[Run: nx show projects]
```

Exit if no target provided.

## Step 1: Validate Target Exists

Execute bash command to verify target is available:

```bash
nx show projects --json
```

Check if target ${ARGUMENTS[0]} exists in any project configuration.

Present with header:

```
════════════════════════════════════════
  TARGET: ${ARGUMENTS[0]}
════════════════════════════════════════
```

If target doesn't exist in any project:

```
⚠️  Target "${ARGUMENTS[0]}" not found in any project

Available targets across workspace:
[List common targets: build, test, lint, dev, etc.]

Did you mean:
[Suggest similar target names]

Use: /nx:project-info <project-name>
To see available targets for specific project
```

If target found:

```
Target: ${ARGUMENTS[0]}
Projects with this target: [count]

[If specific projects requested via ARGUMENTS[1]]
Filtering to: ${ARGUMENTS[1]}
```

## Step 2: Determine Project Selection

Parse project filter from ${ARGUMENTS[1]:-all}

Supported filters:

- "all" or empty: All projects
- "app1,app2,app3": Comma-separated list
- "apps/\*": Pattern matching
- "tag:api": Projects with specific tag

Execute bash command based on filter:

```bash
# For all projects
nx show projects

# For specific projects (comma-separated)
echo "${ARGUMENTS[1]}" | tr ',' '\n'

# For pattern matching
nx show projects --pattern="${ARGUMENTS[1]}"
```

Present with header:

```
════════════════════════════════════════
  PROJECT SELECTION
════════════════════════════════════════
```

Show selected projects:

```
Filter: ${ARGUMENTS[1]:-all}
Selected Projects: [count]

[List selected projects]
- digital-content-builder
- crypto-enhanced
- vibe-tutor
[... other projects]

EXECUTION PLAN:
Target: ${ARGUMENTS[0]}
Projects: [count]
Parallelization: Enabled
Cache: Enabled

Estimated time:
- Without cache: ~[estimate] minutes
- With cache: ~[estimate] seconds
```

## Step 3: Check Cache Status

For each selected project, check if cache exists:

Execute bash command:

```bash
powershell -Command "if (Test-Path 'node_modules/.cache/nx') { 'Cache available' } else { 'No cache - first run will be slower' }"
```

Present with header:

```
════════════════════════════════════════
  CACHE STATUS
════════════════════════════════════════
```

Show cache information:

```
Local Cache: [Available/Not Available]

[If cache available]
✓ Cache available
  Tasks will execute faster using cached results

[If no cache]
⚠️  No cache found
    First execution will build cache
    Subsequent runs will be much faster

CACHEABLE OPERATIONS:
[List which operations will be cached]
- build ✓
- test ✓
- lint ✓
- typecheck ✓
```

## Step 4: Execute Run-Many Command

Build the nx run-many command with appropriate flags:

```bash
# Base command
nx run-many --target=${ARGUMENTS[0]}

# Add project filter if specified
[If ARGUMENTS[1] provided and not "all"]
--projects=${ARGUMENTS[1]}

# Add parallel execution
--parallel=3

# Add output grouping for readability
--output-style=stream-without-prefixes
```

Full command:

```bash
nx run-many --target=${ARGUMENTS[0]} ${ARGUMENTS[1] ? '--projects=' + ARGUMENTS[1] : ''} --parallel=3 --output-style=stream
```

Present with header:

```
════════════════════════════════════════
  EXECUTING: ${ARGUMENTS[0]} (Multiple Projects)
════════════════════════════════════════
```

Execute the command and show real-time output.

## Step 5: Progress Tracking

During execution, show progress:

```
Running [count] tasks in parallel...

[Show real-time status if possible]
✓ digital-content-builder:${ARGUMENTS[0]} [completed]
⚡ crypto-enhanced:${ARGUMENTS[0]} [in progress]
⏳ vibe-tutor:${ARGUMENTS[0]} [queued]

[Update as tasks complete]
```

## Step 6: Execution Summary

After completion, analyze results:

Present with header:

```
════════════════════════════════════════
  EXECUTION SUMMARY
════════════════════════════════════════
```

Show detailed summary:

```
Target: ${ARGUMENTS[0]}
Projects: [count]

RESULTS:
✓ Successful: [count] projects
❌ Failed: [count] projects
⚠️  Warnings: [count] projects

SUCCESSFUL PROJECTS:
[List projects that completed successfully]
✓ digital-content-builder
✓ vibe-tutor
✓ shared-ui

FAILED PROJECTS:
[List failed projects with error summary]
❌ crypto-enhanced
   Error: Type error in trading_engine.py
   Run: /nx:project-info crypto-enhanced

[If any warnings]
⚠️  WARNINGS:
[List projects with warnings]

PERFORMANCE:
Tasks Executed: [count]
Tasks From Cache: [count] ([percentage]%)
Tasks Failed: [count]

Execution Time:
- Total: [time]
- Average per project: [time]
- Longest task: [project-name] ([time])
- Shortest task: [project-name] ([time])

Cache Hit Rate: [percentage]%

TIME COMPARISON:
- Sequential execution: ~[estimate] minutes
- Parallel execution: [actual] minutes
- Time saved: [percentage]% faster

CACHE EFFICIENCY:
[If high cache hit rate]
✓ Excellent cache efficiency
  Most projects used cached results

[If low cache hit rate]
⚠️  Low cache efficiency
    Consider running affected commands
    Or clear and rebuild cache
```

## Step 7: Failed Tasks Analysis

If any tasks failed, provide detailed analysis:

Present with header:

```
════════════════════════════════════════
  FAILURE ANALYSIS
════════════════════════════════════════
```

For each failed project:

```
PROJECT: [project-name]
Target: ${ARGUMENTS[0]}
Exit Code: [code]

ERROR SUMMARY:
[Show concise error message]

FULL ERROR:
[Show complete error output]

NEXT STEPS:
1. Review error details above
2. Run: /nx:project-info [project-name]
3. Fix issues and retry
4. Or run single project: nx run [project-name]:${ARGUMENTS[0]}

COMMON ISSUES:
- Type errors: Run typecheck first
- Missing dependencies: Check package.json
- Cache corruption: Run /nx:cache-clear
- Configuration issues: Verify project.json
```

## Step 8: Optimization Recommendations

Based on execution results, provide recommendations:

Present with header:

```
════════════════════════════════════════
  OPTIMIZATION RECOMMENDATIONS
════════════════════════════════════════
```

Show recommendations:

```
PERFORMANCE OPTIMIZATION:

[If cache hit rate < 50%]
⚡ Improve Cache Efficiency
   - Use affected commands instead of run-many
   - Run: /nx:affected ${ARGUMENTS[0]}
   - Configure proper inputs/outputs

[If execution time > 5 minutes]
⚡ Speed Up Execution
   - Increase parallel tasks: --parallel=5
   - Enable Nx Cloud for distributed execution
   - Review project dependencies

[If many failures]
⚠️  Quality Issues Detected
   - Run quality checks before execution
   - Use: /web:quality-check fix
   - Set up pre-commit hooks

WORKFLOW IMPROVEMENTS:
✓ Use affected commands for faster feedback
✓ Run run-many for comprehensive checks
✓ Enable Nx Cloud for team collaboration
✓ Configure CI/CD with parallel execution

ALTERNATIVE COMMANDS:
For faster development workflow:
- /nx:affected ${ARGUMENTS[0]}    # Only changed projects
- /nx:graph                       # Visualize dependencies
- /web:quality-check              # Comprehensive quality

For specific projects:
- nx run <project>:${ARGUMENTS[0]}
- /nx:project-info <project>
```

## Step 9: Parallel Execution Details

Explain parallel execution behavior:

Present with header:

```
════════════════════════════════════════
  PARALLEL EXECUTION DETAILS
════════════════════════════════════════
```

Show details:

```
PARALLELIZATION STRATEGY:
- Max parallel tasks: 3 (default)
- Task distribution: Automatic
- Dependency respect: Enabled

HOW IT WORKS:
1. Nx analyzes task dependencies
2. Independent tasks run in parallel
3. Dependent tasks wait for prerequisites
4. Results streamed in real-time

DEPENDENCY CHAIN:
[Show execution order based on dependencies]
Wave 1 (Parallel): [projects with no deps]
Wave 2 (Parallel): [projects depending on wave 1]
Wave 3 (Parallel): [projects depending on wave 2]

CUSTOMIZATION:
Increase parallelization:
  nx run-many --target=${ARGUMENTS[0]} --parallel=5

Disable parallelization:
  nx run-many --target=${ARGUMENTS[0]} --parallel=1

SYSTEM RESOURCES:
CPU Cores: [detect system cores]
Recommended parallel tasks: [cores - 1]
Current setting: 3

OPTIMIZATION:
[If system has many cores]
✓ Increase --parallel for faster execution
  Recommended: --parallel=[cores-1]
```

## Step 10: Next Actions

Present with header:

```
════════════════════════════════════════
  NEXT ACTIONS
════════════════════════════════════════
```

Provide actionable next steps:

```
QUICK COMMANDS:

Retry Failed Projects:
[If failures occurred]
nx run-many --target=${ARGUMENTS[0]} --projects=[failed-projects]

Run Different Target:
nx run-many --target=[target] --projects=${ARGUMENTS[1]}

Check Project Details:
/nx:project-info [project-name]

View Dependencies:
/nx:graph

Clear Cache:
/nx:cache-clear

RECOMMENDED WORKFLOW:
1. Run affected for quick checks: /nx:affected ${ARGUMENTS[0]}
2. Fix any issues found
3. Run full suite before merging: /nx:run-many ${ARGUMENTS[0]}
4. Commit and push changes

RELATED COMMANDS:
/nx:affected ${ARGUMENTS[0]}    # Faster, affected-only
/nx:workspace-health            # Overall health check
/nx:cloud-status                # Cloud execution stats
/web:quality-check              # Comprehensive quality

════════════════════════════════════════
  EXECUTION COMPLETE
════════════════════════════════════════
```

$ARGUMENTS

**IMPORTANT EXECUTION NOTES:**

- Execute bash commands using the Bash tool
- Use --parallel flag for concurrent execution
- Respect task dependencies automatically
- Show real-time progress during execution
- Cache results for subsequent runs
- All commands run from C:\dev as base directory
- Default parallel tasks: 3 (configurable)
- Failed tasks don't stop other tasks
- Results aggregated at completion
