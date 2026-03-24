---
description: Generate effectiveness report for the planning-with-files trial
model: sonnet
---

# Planning Effectiveness Report

Generate a report comparing current metrics against baseline for the planning-with-files trial.

## Step 1: Fetch Current Metrics

Execute:

```bash
curl -s http://localhost:3100/api/planning/metrics?days=30 || echo "Dashboard API not available"
```

## Step 2: Fetch Trial Comparison

Execute:

```bash
curl -s http://localhost:3100/api/planning/comparison || echo "Dashboard API not available"
```

## Step 3: Fetch Summary Metrics

Execute:

```bash
curl -s http://localhost:3100/api/planning/summary || echo "Dashboard API not available"
```

## Step 4: Read Baseline File

Read the baseline metrics:

```bash
cat "D:\planning-files\_metrics\baseline.json"
```

## Step 5: Count Session Files

Execute:

```bash
powershell -Command "(Get-ChildItem -Path 'D:\planning-files' -Directory -Recurse -Depth 2 | Where-Object { $_.Name -match '^\d{8}-\d{6}$' }).Count"
```

## Step 6: Generate Report

Present comprehensive report:

```
=====================================
  PLANNING-WITH-FILES TRIAL REPORT
=====================================

Trial Period: [START_DATE] to [END_DATE]
Total Sessions: [COUNT]
Days Elapsed: [DAYS]

PRIMARY METRICS
---------------
                      Baseline    Current    Change
Task Completion Rate:   [X]%       [Y]%      [+/-Z]%
Goal Adherence Rate:    N/A        [Y]%      N/A
Context Recovery:       N/A        [Y]%      N/A
Error Rate:             [X]%       [Y]%      [+/-Z]%
Avg Files Per Task:     [X]        [Y]       [+/-Z]

SUCCESS CRITERIA STATUS
-----------------------
[PASS/FAIL] Task Completion: +15% vs baseline
[PASS/FAIL] Goal Adherence: >= 85%
[PASS/FAIL] Context Recovery: >= 90%
[PASS/FAIL] Error Reduction: -20% vs baseline

RECOMMENDATION
--------------
Based on [X/4] criteria met:
- CONTINUE: Methodology is effective
- MODIFY: Mixed results, needs adjustment
- DISCONTINUE: Regression in primary metrics

SESSION BREAKDOWN
-----------------
Completed Sessions: [X]
In-Progress Sessions: [X]
Blocked Sessions: [X]

Average Session Duration: [X] hours
Most Common Project: [PROJECT]

=====================================
```

## Step 7: Save Report

Optionally save to file:

```bash
powershell -Command "Get-Date -Format 'yyyy-MM-dd'"
```

Save report to: `D:\planning-files\_metrics\report-[DATE].md`

**NOTE:** Run this command weekly during the trial to track progress toward success criteria.
