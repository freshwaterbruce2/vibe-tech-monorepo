# Database Growth Trend-Checking & CLI/MCP Integration Setup

This guide details the architecture, configurations, and operations of the **Database Growth Trend Checker** and its integration across the CLI and Model Context Protocol (MCP) layers of the VibeTech Monorepo.

---

## 🛡️ Objective: Disk Write Safety & Anomaly Gate

To protect the stateful data drive (`D:\`) against transaction write failures and runaway file inflation, this setup imposes a session-based growth gate on all database files:

- **Persistent Storage Directory**: `D:\databases\`
- **Telemetry Learning Database**: [agent_learning.db](file:///D:/databases/agent_learning.db)
- **Capacity Limit**: A **15.0% session-level growth cap** on any SQLite database file relative to the initialized baseline.
- **Core Automation Script**: [check-database-trends.ps1](file:///V:/monorepo/scripts/check-database-trends.ps1) handles the verification and exit codes.
- **ASCII visualization**: [view-db-trends.ps1](file:///V:/monorepo/scripts/view-db-trends.ps1) aggregates daily metrics and renders a 7-day terminal growth chart.

---

## 1. Components and Scripts

| Script / Configuration File | Role                                                                                                       | Location / Link                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Trend Checker**           | Core check logic; compares current file lengths against baseline. Exits with code `1` on growth violation. | [check-database-trends.ps1](file:///V:/monorepo/scripts/check-database-trends.ps1) |
| **Trends Viewer**           | Terminal dashboard with 7-day ASCII chart showing space changes and 30-day capacity projections.           | [view-db-trends.ps1](file:///V:/monorepo/scripts/view-db-trends.ps1)               |
| **CLI & MCP Installer**     | Automates mapping to `pnpm run db:trends` and registers the server in `.mcp.json`.                         | [integrate-trends-cli.ps1](file:///V:/monorepo/scripts/integrate-trends-cli.ps1)   |
| **Workspace Manifest**      | Maps the CLI command `pnpm run db:trends` to run the viewer.                                               | [package.json](file:///V:/monorepo/package.json)                                   |
| **MCP Configuration**       | Defines `storage-learning-server` and registers `view_database_trends` as an executable tool.              | [.mcp.json](file:///V:/monorepo/.mcp.json)                                         |
| **Git Pre-Commit Hook**     | Runs `check-database-trends.ps1` as the final quality gate (`[6/6]`) before any commit is processed.       | [pre-commit.ps1](file:///V:/monorepo/scripts/pre-commit.ps1)                       |

---

## 2. Setting Up the Baseline

A session baseline is required for comparison. The baseline file is saved as a hidden configuration file:

- **Path**: `D:\databases\.db_size_baseline.json`

### Automatic Initialization

When [check-database-trends.ps1](file:///V:/monorepo/scripts/check-database-trends.ps1) runs and does not detect `.db_size_baseline.json`, it dynamically maps all active database sizes as the baseline and exits successfully:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-database-trends.ps1
```

### Resetting the Baseline

To clear or update the baseline to the current database state, delete the JSON file and execute the script:

```powershell
Remove-Item -Path "D:\databases\.db_size_baseline.json" -ErrorAction SilentlyContinue
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-database-trends.ps1
```

---

## 3. Pre-Commit Integration Gate

The trend check is integrated as **Gate [6/6]** inside [pre-commit.ps1](file:///V:/monorepo/scripts/pre-commit.ps1).

If any database length increases by more than 15.0% relative to the baseline file, the script returns exit code `1` and outputs:

```
❌ CRITICAL: Database growth limit exceeded (> 15% growth in active session)!
  Database:      vibe_studio.db
  Baseline Size: 104.50 MB
  Current Size:  122.45 MB
  Growth:        +17.95 MB (17.18%)

Please vacuum the database or optimize writes before committing.
```

### Bypassing in Emergencies

If the write operations are verified and valid, you can bypass the hook using standard Git parameters:

```bash
git commit --no-verify -m "message"
```

---

## 4. Remediation Steps for Growth Violations

When blocked by a database growth limit spike, execute the following commands to restore safe capacities:

### 1. SQLite Vacuuming

Reclaims unused space in databases:

```powershell
sqlite3 D:\databases\vibe_studio.db "VACUUM;"
```

### 2. Log Pruning

Clear temporary log files from:

```powershell
Remove-Item -Path "D:\logs\*" -Recurse -Force -ErrorAction SilentlyContinue
```

### 3. Check for Infinite Loop Telemetry

Query the learning database's execution histories to trace runaway subprocess writes:

```sql
SELECT task_type, started_at, error_message
FROM agent_executions
ORDER BY started_at DESC
LIMIT 10;
```
