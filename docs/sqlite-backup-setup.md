# Zero-Downtime SQLite Hot Backup Guide
This guide explains how to configure, run, and automate zero-downtime daily hot backups of your active SQLite databases on your Windows 11 data drive (`D:\databases\`).

---

## 🛡️ Why Use Hot Backups?
For active multi-agent workspaces (such as **Claude Code**, **Google Antigravity CLI**, and **Kimi Code CLI**), traditional file copying is a major hazard:
* Copying an active database can result in **corrupted snapshots** because write transactions in Write-Ahead Logging (WAL) files may be incomplete.
* Deleting WAL files or locking tables causes parallel agents to crash with database errors.
* **The Solution**: SQLite’s `VACUUM INTO` command writes a clean, defragmented single-file database copy directly to disk, fully bypassing locks and including all outstanding WAL transactions—without interrupting active read/write actions.

---

## 1. The Script: `scripts/backup-databases.ps1`
The PowerShell script automatically iterates through your active databases in `D:\databases\` and executes safe hot backups inside `D:\_backups\`, enforcing a **7-day retention window**.

To run it manually, execute:
```powershell
pwsh.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/backup-databases.ps1
```

---

## 2. Automating with Windows Task Scheduler

To ensure your databases are backed up automatically every night without manual intervention, configure a background task in Windows 11.

### Option A: Automatic Registration (Recommended)
Run the registration helper script from an elevated PowerShell terminal (Run as Administrator):
```powershell
pwsh.exe -NoProfile -ExecutionPolicy Bypass -File V:\monorepo\scripts\register-backup-task.ps1
```

### Option B: Manual Registration
If you prefer to configure the task manually using the Task Scheduler GUI:

### Step 1: Open Task Scheduler
Press `Win + R`, type `taskschd.msc`, and press **Enter**.

### Step 2: Create a New Basic Task
1. Click **Create Basic Task...** in the right-hand actions panel.
2. **Name**: `VibeTech Database Daily Backup`
3. **Description**: Performs zero-downtime daily hot backups of all SQLite databases on the data drive.
4. Click **Next**.

### Step 3: Trigger Settings
1. Set the trigger to **Daily**.
2. Set the start time to **2:00:00 AM** (or any low-activity hour).
3. Set recur every **1 day**.
4. Click **Next**.

### Step 4: Action Settings
1. Select **Start a program**.
2. Click **Next**.
3. **Program/script**: `pwsh.exe`
4. **Add arguments (optional)**: `-NoProfile -ExecutionPolicy Bypass -File V:\monorepo\scripts\backup-databases.ps1`
5. Click **Next**.

### Step 5: Configure Security Settings
1. Click **Finish** to save.
2. Double-click the newly created task in the list to open its **Properties**.
3. Under the **General** tab, select **Run whether user is logged on or not** to ensure it runs even if your machine is locked or signed out.
4. Check **Run with highest privileges** to allow writing and purging backups in protected paths.
5. Click **OK**.

---

## 3. Restoring from a Snapshot

If you need to roll back to a prior snapshot:
1. Stop all active development tools (Claude Code, agy, kimi, etc.).
2. Navigate to `D:\databases\`.
3. Rename your current corrupted or broken database file (e.g., `memory.db` to `memory_corrupt.db`).
4. Copy your chosen backup from `D:\_backups\memory_backup_YYYYMMDD_HHMMSS.db` into `D:\databases\memory.db`.
5. Safe deletion of any active WAL/SHM sidecars (`memory.db-wal` and `memory.db-shm`) ensures a clean, non-corrupted boot.
6. Restart your agents.
