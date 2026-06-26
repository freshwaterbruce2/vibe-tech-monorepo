# D:\ Drive Storage Capacity Monitor Setup
This document explains the implementation, configurations, and automated scheduling of the **D:\ Drive Storage Capacity Monitor** (`monitor-disk-space.ps1`) to ensure safety and prevent database lockups due to disk-space depletion.

---

## 🛡️ Why Real-Time Disk Monitoring Matters
In a high-intensity, multi-agent development environment running parallel sessions of **Claude Code**, **Google Antigravity CLI**, and **Kimi Code CLI**, storage layers are highly dynamic:
*   **Database Write Locks**: SQLite databases operating in Write-Ahead Logging (WAL) mode can experience write errors and catastrophic corruption if the physical drive runs out of disk space mid-transaction.
*   **Log and Telemetry Proliferation**: Active task executors, test runs, and background learning modules constantly write logs to `D:\logs\` and update `agent_learning.db` on `D:\databases\`.
*   **Fast Loop Retries**: Sub-agents trapped in infinite compilation or execution retry loops can consume gigabytes of storage within minutes due to unhandled standard error dumps.

The capacity monitor utility mitigates these risks by actively checking drive metrics, evaluating safety margins, throwing alerts on capacity drift, and syncing metrics with your central telemetry log.

---

## 1. Metrics and Alert Thresholds
The monitoring script checks your active database and runtime volume (`D:\`) against two safety baselines:

| Threshold Dimension | Limit Setting | Status Trigger | Operational Description |
| --- | --- | --- | --- |
| **Minimum Absolute Space** | `< 15.0 GB` | `WARN_SPACE` | Warns that storage levels are low; database vacuuming and old log pruning are highly recommended. |
| **Minimum Percentage Space** | `< 10.0%` | `CRITICAL_PCT` | Indicates a critical shortage of storage space. Runaway sub-agent tasks should be paused immediately. |

---

## 2. Telemetry and Learning Integration
Each execution is captured, aggregated, and synced with your local learning ecosystem:
*   **Active Log Destination**: `D:\databases\agent_learning.db`
*   **Target Database Table**: `agent_executions`
*   **Assigned Task ID**: `disk-capacity-monitor`
*   **Logging Namespace**: `storage-learning-expert`

This allows background agents to run **Pre-Task Recall** queries, reviewing physical drive health metrics before performing bulk data transformations, and allowing automation pipelines to abort safely if available space falls below a critical threshold.

---

## 3. Automation and Scheduling

To configure this monitoring check to run autonomously in the background on Windows 11:

### Automated Command Integration (`package.json`)
You can map this monitoring task directly to your local package scripts to make workspace safety a single-line command:
```json
"scripts": {
  "storage:monitor": "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/monitor-disk-space.ps1"
}
```

### Windows Task Scheduler Background Check

To run the storage monitor automatically every hour:

#### Option A: Automatic Registration (Recommended)
Run the registration helper script from an elevated PowerShell terminal (Run as Administrator):
```powershell
pwsh.exe -NoProfile -ExecutionPolicy Bypass -File V:\monorepo\scripts\register-disk-monitor.ps1
```

#### Option B: Manual Registration
If you prefer to configure the task manually using the Task Scheduler GUI:
1. Open **Windows Task Scheduler** (`taskschd.msc`).
2. Create a new Task named `VibeTech Drive Space Monitor`.
3. Set the Trigger to **Daily**, and check **Repeat task every: 1 hour** for a duration of **Indefinitely**.
4. Configure the Action to **Start a program**:
   *   **Program/script**: `pwsh.exe`
   *   **Arguments**: `-NoProfile -ExecutionPolicy Bypass -File "V:\\monorepo\\scripts\\monitor-disk-space.ps1"`
5. Under **Conditions** or task security options, check **Run with highest privileges** to allow query permission fallback logic to run.

