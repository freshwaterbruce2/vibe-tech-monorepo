# Database Telemetry & Capacity Planning Guide

This guide details the design, metrics, and operation of the **VibeTech SQLite Capacity & Growth Audit Utility** (`audit-db-telemetry.ps1`). This utility provides automatic capacity planning and drift detection for active multi-agent systems operating across your stateful storage layers on `D:\databases\`.

---

## 🛡️ Why Telemetry Audits Matter

In a high-density, multi-agent development environment running parallel sessions of **Claude Code**, **Google Antigravity CLI**, and **Kimi Code CLI**, databases can grow unpredictably:

- **Context Token Spikes**: Automated agents storing raw file buffers, vector index snapshots, or recursive learning logs can cause massive database size spikes.
- **Recursive Feedback Loops**: Sub-agents might repeatedly write execution error records or diagnostic data due to unhandled exceptions, rapidly inflating `agent_learning.db` or `memory.db` without warning.
- **Disk Fragmentation**: SQLite databases in Write-Ahead Logging (WAL) mode utilize index caches (`-shm`) and WAL frames (`-wal`) that lock file handles concurrently, making real-time system performance audits critical to maintaining throughput.

The capacity audit utility bridges this gap by calculating active, daily, and 30-day capacity forecasts, allowing you to catch storage anomalies before they trigger operational blocks.

---

## 1. Key Metrics Analyzed

The audit utility evaluates database behavior across five critical dimensions:

| Metric                  | Calculation                                                            | Threshold Limit | Alert Action                                                                                |
| ----------------------- | ---------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------- |
| **Current Size**        | Size on disk in Megabytes (MB)                                         | `>500MB`        | Triggers a `WARN_SZ` status and highlights yellow to signal massive file volumes.           |
| **Growth Spike**        | Percentage increase in size compared to the previous day's hot backup. | `>20.0%`        | Triggers a `SPIKE` critical alert status and highlights red to detect rogue looping writes. |
| **Historical Baseline** | Retains up to a 30-day snapshot window from backup folders.            | N/A             | Utilized to establish stable baseline consumption rates.                                    |
| **Growth Rate**         | Megabytes grown divided by the backup lifetime (MB/day).               | N/A             | Measures active execution throughput over time.                                             |
| **30-Day Project**      | Current size added to 30 days of projected growth rate.                | N/A             | Dynamically forecasts future drive limits to allow proactive storage expansion.             |

---

## 2. Operation and Console Layout

When run, the script prints an ASCII dashboard showing the health of all managed database models:

```
+----------------------+------------+------------+--------------+--------------+----------+
| Database Name        | Current MB | Change (%) | 30-Day Proj  | Growth MB/d  | Status   |
+----------------------+------------+------------+--------------+--------------+----------+
| agent_learning       | 42.15      | 1.05%      | 45.12        | 0.099        | OK       |
| memory               | 12.80      | 0.00%      | 12.80        | 0.000        | OK       |
| nova_activity        | 104.50     | 4.20%      | 112.40       | 0.263        | OK       |
| vibe_studio          | 505.10     | 0.15%      | 509.20       | 0.137        | WARN_SZ  |
| ship-check-test      | 15.30      | 22.45%     | 25.10        | 0.327        | SPIKE    |
+----------------------+------------+------------+--------------+--------------+----------+
Total Managed Database Space: [ 680.15 MB ]

🚨 TELEMETRY WARNINGS TRIGGERED:
 - Database 'vibe_studio' size (505.10 MB) exceeds alert threshold of 500 MB.
 - Database 'ship-check-test' grew by 22.45% (current: 15.30 MB) since last backup, exceeding the 20% threshold.
```

---

## 3. SQLite Learning System Telemetry Integration

To ensure your multi-agent loops continuously record execution data, the script automatically aggregates metrics after each run and locks them directly into your active learning database:

- **Log Destination**: `D:\databases\agent_learning.db`
- **Logging Table**: `agent_executions`
- **Task Mapping ID**: `db-telemetry-audit`
- **Assigned Namespace**: `storage-learning-expert`

The recorded error/status columns populate with formatted JSON telemetry strings, tracking sizes and growth metrics across all audited models so developers can easily query historical database capacity directly via SQL command bridges.

---

## 4. Remediation Steps for Alerts

If any alerts are triggered during the daily capacity check, follow these guidelines:

### For `WARN_SZ` (Database Exceeds Size Limits)

1. **Purge Temp Tables**: Run custom scripts to delete temporary test environments or cached sub-agent files.
2. **Vacuum Files**: Run `VACUUM;` on the affected SQLite database to recover unused database pages and shrink the physical file size on disk.
3. **Compress Blobs**: If storing large texts or screenshots, move them to flat files on `D:\logs\` or compress them using GZIP formats before inserting them into SQLite text columns.

### For `SPIKE` (Rogue Growth Spike Detected)

1. **Analyze Execution Logs**: Query the `agent_executions` table inside `agent_learning.db` to identify which sub-agent performed a high volume of writes over the past 24 hours.
2. **Evaluate Loops**: Verify that your sub-agents are not trapped in infinite retry loops (confirm compliance with the **3-Strike Protocol** and **Ralph Wiggum file-based state checks**).
3. **Rollback Snapshot**: If data corruption or runaway bloat occurred, halt development and execute the rollback procedures detailed in `sqlite-backup-setup.md` to restore a clean daily snapshot.
