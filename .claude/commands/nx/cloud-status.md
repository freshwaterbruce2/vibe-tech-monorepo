---
allowed-tools: Bash(nx:*), Bash(powershell:*), mcp__nx-mcp__nx_cloud_cipe_details, mcp__nx-mcp__nx_cloud_pipeline_executions_search, mcp__nx-mcp__nx_cloud_runs_search, mcp__nx-mcp__nx_cloud_tasks_search
description: Monitor Nx Cloud integration, cache statistics, and pipeline performance
model: sonnet
---

# Nx Cloud Status Monitor

Comprehensive monitoring of Nx Cloud integration including connection status, remote cache statistics, recent pipeline executions, and performance metrics.

## Step 1: Verify Cloud Configuration

Execute bash command to check nx.json for cloud config:

```bash
powershell -Command "Get-Content nx.json | Select-String -Pattern 'nxCloudId|cloud|tasksRunner'"
```

Present with header:

```
════════════════════════════════════════
  NX CLOUD CONFIGURATION
════════════════════════════════════════
```

Show configuration:

```
Nx Cloud ID: 68edca82f2b9a8eee56b978f
Status: [Configured/Not Configured]

[If configured]
✓ Nx Cloud is configured

Cloud Features:
✓ Remote caching enabled
✓ Distributed task execution
✓ CI pipeline insights
✓ Workspace analytics
✓ Self-healing CI

Configuration Location: nx.json
```

If not configured:

```
⚠️  Nx Cloud not configured

BENEFITS OF NX CLOUD:
- 10x faster CI/CD with distributed caching
- Share cache across team members and CI
- Pipeline insights and analytics
- Automatic failure detection and recovery
- Distributed task execution

SETUP:
1. Run: nx connect-to-nx-cloud
2. Follow interactive setup
3. Commit updated nx.json

Documentation:
https://nx.dev/nx-cloud
```

## Step 2: Check Cloud Connection

Execute bash command to test connection:

```bash
nx reset && echo "Connection test completed"
```

Use Nx Cloud MCP tool to get CIPE details:

```
mcp__nx-mcp__nx_cloud_cipe_details
```

Present with header:

```
════════════════════════════════════════
  CONNECTION STATUS
════════════════════════════════════════
```

Show connection status:

```
Connection: [Active/Inactive]
Workspace ID: 68edca82f2b9a8eee56b978f

[If connected]
✓ Connected to Nx Cloud
  Last sync: [timestamp]
  Status: Operational

Cloud Dashboard:
https://cloud.nx.app/orgs/[org-id]/workspaces/68edca82f2b9a8eee56b978f

[If connection issues]
⚠️  Connection issues detected
    - Check internet connectivity
    - Verify Nx Cloud credentials
    - Review nx.json configuration

TROUBLESHOOTING:
Run: nx reset
Then: nx build <project>
To test cloud connectivity
```

## Step 3: Recent Pipeline Executions

Use Nx Cloud MCP tool to search recent pipeline executions:

```
mcp__nx-mcp__nx_cloud_pipeline_executions_search
  minCreatedAt="7 days ago"
  limit=10
```

Present with header:

```
════════════════════════════════════════
  RECENT PIPELINE EXECUTIONS
════════════════════════════════════════
```

Show recent pipelines:

```
Last 10 Pipeline Executions:

[For each execution]
Pipeline #[id]:
  Branch: [branch-name]
  Status: [SUCCEEDED/FAILED/IN_PROGRESS/CANCELED]
  Started: [timestamp]
  Duration: [duration]
  Tasks: [count]
  Author: [commit-author]
  Commit: [commit-sha]

SUMMARY:
Total Executions (7 days): [count]
Success Rate: [percentage]%
Average Duration: [time]

STATUS BREAKDOWN:
✓ Succeeded: [count] ([percentage]%)
❌ Failed: [count] ([percentage]%)
🔄 In Progress: [count]
⊗ Canceled: [count]

TRENDS:
[If success rate > 90%]
✓ Excellent pipeline health

[If success rate 70-90%]
⚠️  Moderate failures detected
    Review failed pipelines

[If success rate < 70%]
❌ High failure rate
    Investigate pipeline issues
```

## Step 4: Detailed Run Analysis

Use Nx Cloud MCP tool to search recent runs:

```
mcp__nx-mcp__nx_cloud_runs_search
  minStartTime="24 hours ago"
  limit=20
```

Present with header:

```
════════════════════════════════════════
  RECENT RUNS (24 Hours)
════════════════════════════════════════
```

Show run details:

```
Recent Runs: [count]

[For each run, show summary]
Run #[id]:
  Command: [command executed]
  Status: [status]
  Duration: [time]
  Tasks: [count]
  Cache Hits: [count] ([percentage]%)
  Branch: [branch]

TOP COMMANDS:
[Aggregate by command type]
- build: [count] runs
- test: [count] runs
- lint: [count] runs
- typecheck: [count] runs

PERFORMANCE:
Average Duration: [time]
Cache Hit Rate: [percentage]%
Success Rate: [percentage]%

SLOWEST RUNS:
1. [command] - [duration] - [branch]
2. [command] - [duration] - [branch]
3. [command] - [duration] - [branch]

[If performance issues]
⚠️  Performance concerns:
    - High average duration
    - Low cache hit rate
    - Consider optimization
```

## Step 5: Task Statistics

Use Nx Cloud MCP tool to get task statistics:

```
mcp__nx-mcp__nx_cloud_tasks_search
  minStartTime="7 days ago"
  limit=100
```

Present with header:

```
════════════════════════════════════════
  TASK STATISTICS (7 Days)
════════════════════════════════════════
```

Show task statistics:

```
Total Tasks Executed: [count]

TASK BREAKDOWN BY TARGET:
- build: [count] executions
- test: [count] executions
- lint: [count] executions
- typecheck: [count] executions
- quality: [count] executions

CACHE PERFORMANCE:
Total Cache Hits: [count] ([percentage]%)
Total Cache Misses: [count] ([percentage]%)

Average Duration by Target:
- build: [time] avg
- test: [time] avg
- lint: [time] avg
- typecheck: [time] avg

MOST EXECUTED PROJECTS:
[Top 5 projects by task count]
1. [project]: [count] tasks
2. [project]: [count] tasks
3. [project]: [count] tasks

PERFORMANCE INSIGHTS:
[If cache hit rate > 80%]
✓ Excellent cache efficiency
  Remote caching working effectively

[If cache hit rate 50-80%]
⚡ Good cache usage
    Room for improvement

[If cache hit rate < 50%]
⚠️  Low cache efficiency
    Review cache configuration
    Check: nx.json targetDefaults
```

## Step 6: Remote Cache Analysis

Execute bash command to check local vs remote cache:

```bash
powershell -Command "if (Test-Path 'node_modules/.cache/nx') { $size = (Get-ChildItem -Path 'node_modules/.cache/nx' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB; 'Local: {0:N2} MB' -f $size } else { 'No local cache' }"
```

Present with header:

```
════════════════════════════════════════
  CACHE ANALYSIS
════════════════════════════════════════
```

Show cache details:

```
LOCAL CACHE:
- Size: [size] MB
- Location: node_modules/.cache/nx
- Status: [Healthy/Large/Empty]

REMOTE CACHE (Nx Cloud):
- Status: [Enabled/Disabled]
- Access: [Full/Limited]
- Sharing: [Team-wide/Personal]

CACHE EFFICIENCY:
Recent Cache Hits: [percentage]%
Average Cache Savings: [time saved per build]

STORAGE OPTIMIZATION:
[If local cache > 1GB]
⚠️  Large local cache detected
    Remote cache available - local can be cleared
    Run: /nx:cache-clear

[If cache < 100MB]
⚠️  Small cache - may need population
    Run builds to populate cache

CACHE SHARING:
✓ Team members share remote cache
✓ CI/CD shares cache with local dev
✓ Faster builds across all environments

BANDWIDTH USAGE:
[Estimate based on cache size and frequency]
Upload: ~[size] MB/day
Download: ~[size] MB/day
```

## Step 7: CI/CD Pipeline Insights

Use MCP tool to get detailed pipeline execution info:

```
mcp__nx-mcp__nx_cloud_pipeline_executions_details
  pipelineExecutionId=[latest-execution-id]
```

Present with header:

```
════════════════════════════════════════
  CI/CD PIPELINE INSIGHTS
════════════════════════════════════════
```

Show pipeline details:

```
LATEST PIPELINE EXECUTION:

Execution ID: [id]
Branch: [branch]
Status: [status]
Started: [timestamp]
Duration: [duration]

EXECUTION BREAKDOWN:
Total Tasks: [count]
✓ Succeeded: [count]
❌ Failed: [count]
⚡ Cached: [count]

RUN GROUPS:
[For each run group]
- [group-name]: [task-count] tasks, [duration]

PERFORMANCE METRICS:
Time Saved by Cache: [time]
Parallel Efficiency: [percentage]%
Average Task Duration: [time]

COMPARISON:
Without Nx Cloud: ~[estimate] minutes
With Nx Cloud: [actual] minutes
Time Saved: [percentage]% faster

FAILURE ANALYSIS:
[If failures exist]
Failed Tasks:
- [task]: [error summary]

Use: /nx:project-info [project]
To investigate specific failures
```

## Step 8: Team Collaboration Metrics

Present with header:

```
════════════════════════════════════════
  TEAM COLLABORATION METRICS
════════════════════════════════════════
```

Show collaboration stats:

```
CACHE SHARING BENEFITS:

Team Cache Hits: [count]
Individual Builds Avoided: [count]
Collective Time Saved: [hours]

MOST ACTIVE CONTRIBUTORS:
[From git and cloud data]
1. [developer]: [commits] commits, [tasks] tasks
2. [developer]: [commits] commits, [tasks] tasks
3. [developer]: [commits] commits, [tasks] tasks

BRANCH ACTIVITY:
Active Branches: [count]
Main Branch Builds: [count]
Feature Branch Builds: [count]

COLLABORATION EFFICIENCY:
✓ Remote cache reduces duplicate work
✓ Fast feedback loops for all team members
✓ Consistent build performance across machines

COST SAVINGS:
[Calculate based on time saved and developer costs]
Developer Time Saved: [hours/week]
Estimated Value: $[amount]/month
```

## Step 9: Performance Recommendations

Based on collected metrics, provide recommendations:

Present with header:

```
════════════════════════════════════════
  PERFORMANCE RECOMMENDATIONS
════════════════════════════════════════
```

Show recommendations:

```
OPTIMIZATION OPPORTUNITIES:

[If cache hit rate < 80%]
⚡ IMPROVE CACHE EFFICIENCY
   Current: [percentage]%
   Target: 85%+

   Actions:
   1. Review target configurations in nx.json
   2. Ensure proper inputs/outputs defined
   3. Use affected commands more frequently
   4. Verify cache settings per project

[If average build time > 5 minutes]
⚡ REDUCE BUILD TIME
   Current: [time]
   Target: < 3 minutes

   Actions:
   1. Enable distributed task execution
   2. Increase parallel tasks
   3. Optimize project dependencies
   4. Review slow tasks and optimize

[If failure rate > 10%]
⚠️  REDUCE FAILURE RATE
   Current: [percentage]%
   Target: < 5%

   Actions:
   1. Investigate common failure patterns
   2. Add pre-commit quality checks
   3. Improve test reliability
   4. Use: /nx:workspace-health

ADVANCED FEATURES:
[If not using distributed execution]
💡 Enable Distributed Task Execution
   - Run tasks across multiple machines
   - 2-3x faster for large workspaces
   - Automatic work distribution

[If not using self-healing CI]
💡 Enable Self-Healing CI
   - Automatic failure recovery
   - Intelligent retry logic
   - Reduced maintenance overhead

COST OPTIMIZATION:
- Current remote cache usage: [efficient/moderate/high]
- Storage costs: [estimate]
- Potential savings: [areas for improvement]
```

## Step 10: Quick Actions & Monitoring

Present with header:

```
════════════════════════════════════════
  QUICK ACTIONS & MONITORING
════════════════════════════════════════
```

Show available actions:

```
VIEW CLOUD DASHBOARD:
https://cloud.nx.app/orgs/[org-id]/workspaces/68edca82f2b9a8eee56b978f

COMMAND SHORTCUTS:
Check latest pipeline:
  [View in dashboard link]

Clear local cache:
  /nx:cache-clear

Run affected tasks:
  /nx:affected build

View workspace health:
  /nx:workspace-health

MONITORING SETUP:
Set up alerts for:
✓ Pipeline failures
✓ High build times
✓ Low cache hit rates
✓ Configuration issues

REGULAR MAINTENANCE:
Daily: Check pipeline status
Weekly: Review cache efficiency
Monthly: Optimize slow tasks
Quarterly: Review Nx Cloud plan

RELATED COMMANDS:
/nx:workspace-health    # Overall workspace diagnostics
/nx:affected           # Run affected tasks
/nx:run-many           # Run multiple tasks
/nx:project-info       # Deep dive into projects
/nx:graph              # Visualize dependencies

SUPPORT:
Nx Cloud Docs: https://nx.dev/nx-cloud
Community: https://github.com/nrwl/nx/discussions
Support: support@nrwl.io

════════════════════════════════════════
  CLOUD STATUS MONITORING COMPLETE
════════════════════════════════════════
```

**IMPORTANT EXECUTION NOTES:**

- Execute bash commands using the Bash tool
- Use Nx Cloud MCP tools for detailed metrics
- All data fetched from Nx Cloud API
- Results cached for 5 minutes
- Safe to run frequently
- No modifications to workspace
- Provides actionable insights
- Helps optimize team productivity
