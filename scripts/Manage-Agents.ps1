#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Power Cell NATO — PowerShell Native Agent Task Orchestration

.DESCRIPTION
    Manages named Claude Code agent cells as persistent background processes.
    Each cell polls an inbox for tasks and runs claude --print non-interactively,
    appending output to a per-cell log file on D:\.

    Run .\New-AgentCells.ps1 once before first use.

.PARAMETER Action
    start      — Create and start a new agent cell
    stop       — Stop a running cell
    restart    — Stop then immediately restart a cell
    assign     — Send a task to a cell (-Auto picks first idle cell)
    broadcast  — Assign the same task to ALL idle cells at once
    monitor    — Tail a cell's log output
    list       — Show all cells and their current status
    clear-log  — Truncate a cell's log file (use -All to clear every cell)
    purge      — Stop a cell and remove it from the registry entirely
    doctor     — Check prerequisites

.PARAMETER Cell
    Cell name, e.g. CELL_01 (required for start/stop/assign/monitor)

.PARAMETER Task
    Task text to assign (required for assign)

.PARAMETER Visual
    Open a Windows Terminal tab showing live log output for this cell

.PARAMETER Follow
    With monitor: stream continuously (Ctrl+C to exit)

.PARAMETER All
    With monitor: tail all cells interleaved

.PARAMETER Auto
    With assign: automatically pick the first idle cell (no -Cell needed)

.PARAMETER Lines
    With monitor: number of tail lines to show (default 60)

.EXAMPLE
    .\Manage-Agents.ps1 -Action doctor
    .\Manage-Agents.ps1 -Action start     -Cell CELL_01
    .\Manage-Agents.ps1 -Action start     -Cell CELL_01 -Visual
    .\Manage-Agents.ps1 -Action restart   -Cell CELL_01
    .\Manage-Agents.ps1 -Action assign    -Cell CELL_01 -Task "List TS errors in apps/vibe-tutor"
    .\Manage-Agents.ps1 -Action assign    -Auto -Task "Check for unused imports"
    .\Manage-Agents.ps1 -Action broadcast -Task "Run pnpm typecheck on apps/vibe-tutor and report errors"
    .\Manage-Agents.ps1 -Action monitor   -Cell CELL_01 -Follow
    .\Manage-Agents.ps1 -Action monitor   -All
    .\Manage-Agents.ps1 -Action list
    .\Manage-Agents.ps1 -Action clear-log -Cell CELL_01
    .\Manage-Agents.ps1 -Action clear-log -All
    .\Manage-Agents.ps1 -Action stop      -Cell CELL_01
    .\Manage-Agents.ps1 -Action purge     -Cell CELL_01
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('start', 'stop', 'restart', 'assign', 'broadcast', 'monitor', 'list', 'clear-log', 'purge', 'doctor', 'dlq', 'issues', 'issue-assign', 'issue-close')]
    [string]$Action,

    [string]$Cell,
    [string]$Task,
    [switch]$Visual,
    [switch]$Follow,
    [switch]$All,
    [switch]$Auto,
    [int]$Lines    = 60,
    [string]$IssueId = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── Paths ─────────────────────────────────────────────────────────────────────

$RegistryPath = 'D:\databases\agent_cells.json'
$InboxDir     = 'D:\temp\cell_inbox'
$StatusDir    = 'D:\databases\cell_status'   # durable — survives reboots
$LogDir       = 'D:\logs\agents'
$WorkerDir    = 'D:\temp\cell_workers'
$DlqDir       = 'D:\databases\cell_dlq'      # dead letter queue — durable
$RestartCooldownSecs = 60                     # minimum seconds between restarts
$MaxRestartsPerWindow = 3                     # restarts before cooldown escalates
$RestartWindowSecs   = 300                    # window for counting rapid restarts (5 min)

# ── Logging ───────────────────────────────────────────────────────────────────

function Write-CellLog {
    param([string]$Msg, [string]$Level = 'INFO')
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $colour = switch ($Level) {
        'OK'    { 'Green'  }
        'WARN'  { 'Yellow' }
        'ERROR' { 'Red'    }
        default { 'Cyan'   }
    }
    Write-Host "[$ts] [$Level] $Msg" -ForegroundColor $colour
}

# ── Registry helpers ──────────────────────────────────────────────────────────

function Get-Registry {
    if (-not (Test-Path $RegistryPath)) {
        Write-CellLog "Registry not found. Run .\New-AgentCells.ps1 first." 'ERROR'
        exit 1
    }
    return Get-Content $RegistryPath -Raw | ConvertFrom-Json
}

function Save-Registry {
    param($Registry)
    $Registry | ConvertTo-Json -Depth 10 | Set-Content -Path $RegistryPath -Encoding UTF8
}

function Get-CellRecord {
    param([string]$CellName, $Registry)
    return @($Registry.cells) | Where-Object { $_.name -eq $CellName } | Select-Object -First 1
}

function Test-PidAlive {
    param([int]$ProcessId)
    if ($ProcessId -le 0) { return $false }
    try { $null = Get-Process -Id $ProcessId -ErrorAction Stop; return $true } catch { return $false }
}

# ── Live status from worker process ──────────────────────────────────────────

function Get-LiveStatus {
    param([string]$CellName)
    $f = Join-Path $StatusDir "$CellName.json"
    if (Test-Path $f) {
        try { return Get-Content $f -Raw | ConvertFrom-Json } catch {}
    }
    return $null
}

# ── Worker script template ────────────────────────────────────────────────────
#
#  Written to D:\temp\cell_workers\<Cell>.ps1 then launched as a detached
#  pwsh process — survives beyond the invoking script's lifetime.

function New-WorkerScript {
    param([string]$CellName)

    $workerPath = Join-Path $WorkerDir "$CellName.ps1"
    $cellDlqDir = Join-Path $DlqDir $CellName

    $content = @"
`$CellName  = '$CellName'
`$InboxDir  = '$InboxDir'
`$StatusDir = '$StatusDir'
`$LogDir    = '$LogDir'
`$DlqDir    = '$cellDlqDir'

`$statusFile = Join-Path `$StatusDir "`$CellName.json"
`$logFile    = Join-Path `$LogDir    "`$CellName.log"

# Always run claude from the repo root so relative paths in tasks resolve correctly
Set-Location 'C:\dev'

# Ensure DLQ dir exists
if (-not (Test-Path `$DlqDir)) { New-Item -ItemType Directory -Path `$DlqDir -Force | Out-Null }

`$lastTask     = ''
`$failureCounts = @{}   # task-hash -> failure count (per process lifetime)

function Write-Status {
    param([string]`$Status, [string]`$CurrentTask = '', [string]`$Err = '')
    [ordered]@{
        cell          = `$CellName
        status        = `$Status
        currentTask   = `$CurrentTask
        lastTask      = `$script:lastTask
        error         = `$Err
        lastHeartbeat = (Get-Date -Format 'o')
        updatedAt     = (Get-Date -Format 'o')
    } | ConvertTo-Json | Set-Content -Path `$statusFile -Encoding UTF8
}

function Append-Log {
    param(`$Text)
    if (`$null -ne `$Text) { Add-Content -Path `$logFile -Value `$Text -Encoding UTF8 }
}

# FileSystemWatcher — zero-latency task arrival, zero idle CPU
`$watcher = [System.IO.FileSystemWatcher]::new('$InboxDir')
`$watcher.Filter = "`$CellName.task"
`$watcher.EnableRaisingEvents = `$true

Write-Status 'idle'

while (`$true) {
    # Heartbeat write every 30s regardless of activity
    Write-Status 'idle'

    `$taskFile = Join-Path `$InboxDir "`$CellName.task"
    if (-not (Test-Path `$taskFile)) {
        # Block up to 30s waiting for a file event, then loop for heartbeat
        `$null = `$watcher.WaitForChanged([System.IO.WatcherChangeTypes]::Created, 30000)
    }

    if (-not (Test-Path `$taskFile)) { continue }

    # Atomic claim: rename before reading so no other cell can grab it
    `$tmpFile = Join-Path `$InboxDir "`$CellName.task.processing"
    try {
        Move-Item -Path `$taskFile -Destination `$tmpFile -Force -ErrorAction Stop
    } catch {
        Start-Sleep -Milliseconds 500
        continue
    }

    `$taskText = (Get-Content `$tmpFile -Raw -ErrorAction SilentlyContinue).Trim()
    Remove-Item `$tmpFile -ErrorAction SilentlyContinue
    if (-not `$taskText) { continue }

    # DLQ check — 3-strike rule
    `$taskKey = `$taskText.Substring(0, [Math]::Min(120, `$taskText.Length))
    `$strikes  = if (`$failureCounts.ContainsKey(`$taskKey)) { `$failureCounts[`$taskKey] } else { 0 }

    if (`$strikes -ge 3) {
        `$dlqTs = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        Append-Log "[`$dlqTs] ==== DLQ: escalated after 3 failures, task poisoned ===="
        Append-Log "[`$dlqTs] `$taskText"
        [ordered]@{ cell = `$CellName; task = `$taskText; failures = `$strikes; escalatedAt = (Get-Date -Format 'o') } |
            ConvertTo-Json | Set-Content (Join-Path `$DlqDir "$(Get-Date -Format 'yyyyMMdd-HHmmssfff').json") -Encoding UTF8
        & 'C:\dev\scripts\New-Issue.ps1' -Title "DLQ: task failed 3 times on `$CellName" ``
            -Description `$taskText.Substring(0,[Math]::Min(200,`$taskText.Length)) ``
            -Severity 'high' -FoundBy `$CellName | Out-Null
        continue
    }

    `$attempt = `$strikes + 1
    Write-Status 'busy' -CurrentTask `$taskText

    `$ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Append-Log ''
    Append-Log "[`$ts] ==== TASK (attempt `$attempt/3) ================================"
    Append-Log "[`$ts] `$taskText"
    Append-Log "[`$ts] ================================================================"

    try {
        `$output = `$taskText | & claude --print 2>&1

        # Guard against silent empty output
        `$nonEmpty = @(`$output) | Where-Object { `$_ -match '\S' }
        if (-not `$nonEmpty) { throw "claude --print returned no output (silent failure)" }

        Append-Log `$output

        # Auto-log any __ISSUE__ markers
        `$issueScript = 'C:\dev\scripts\New-Issue.ps1'
        if (Test-Path `$issueScript) {
            @(`$output) | Where-Object { `$_ -match '^__ISSUE__\s*\{' } | ForEach-Object {
                try {
                    `$j = (`$_ -replace '^__ISSUE__\s*', '') | ConvertFrom-Json
                    & `$issueScript ``
                        -Title        `$j.title ``
                        -File         (if (`$j.PSObject.Properties['file'])          { `$j.file }          else { '' }) ``
                        -Description  (if (`$j.PSObject.Properties['description'])   { `$j.description }   else { '' }) ``
                        -Severity     (if (`$j.PSObject.Properties['severity'])       { `$j.severity }      else { 'medium' }) ``
                        -SuggestedFix (if (`$j.PSObject.Properties['suggestedFix'])  { `$j.suggestedFix }  else { '' }) ``
                        -ReproContext (if (`$j.PSObject.Properties['reproContext'])   { `$j.reproContext }  else { '' }) ``
                        -FoundBy      `$CellName | Out-Null
                } catch { }
            }
        }

        `$failureCounts[`$taskKey] = 0   # reset on success
        `$script:lastTask = `$taskText
        `$doneTs = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        Append-Log "[`$doneTs] ==== DONE ================================================="
        Write-Status 'idle'

    } catch {
        `$failureCounts[`$taskKey] = `$attempt
        `$errTs = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        Append-Log "[`$errTs] ==== ERROR (attempt `$attempt/3): `$(`$_.Exception.Message) ===="
        Write-Status 'failed' -Err `$_.Exception.Message

        if (`$attempt -lt 3) {
            # Exponential backoff: 2s, 4s before 3rd attempt
            `$backoff = [Math]::Pow(2, `$attempt)
            Append-Log "[`$errTs] Retrying in `$backoff s (attempt `$(`$attempt+1)/3)..."
            Start-Sleep -Seconds `$backoff
            `$taskText | Set-Content -Path `$taskFile -Encoding UTF8 -NoNewline
        }
    }
}
"@
    $content | Set-Content -Path $workerPath -Encoding UTF8
    return $workerPath
}

# ── Action: doctor ────────────────────────────────────────────────────────────

function Invoke-Doctor {
    Write-Host ''
    Write-Host '  Power Cell NATO — Doctor Check' -ForegroundColor Cyan
    Write-Host '  ─────────────────────────────' -ForegroundColor DarkGray
    $ok = $true

    if ($PSVersionTable.PSVersion.Major -ge 7) {
        Write-Host "  [OK] PowerShell $($PSVersionTable.PSVersion)" -ForegroundColor Green
    } else {
        Write-Host "  [!!] PowerShell 7+ required (have $($PSVersionTable.PSVersion))" -ForegroundColor Red
        $ok = $false
    }

    $claudeCmd = Get-Command claude -ErrorAction SilentlyContinue
    if ($claudeCmd) {
        Write-Host "  [OK] claude: $($claudeCmd.Source)" -ForegroundColor Green
    } else {
        Write-Host '  [!!] claude not on PATH' -ForegroundColor Red
        $ok = $false
    }

    if (Test-Path $RegistryPath) {
        Write-Host "  [OK] Registry: $RegistryPath" -ForegroundColor Green
    } else {
        Write-Host "  [!!] Registry missing — run .\New-AgentCells.ps1" -ForegroundColor Yellow
        $ok = $false
    }

    foreach ($dir in @($InboxDir, $StatusDir, $LogDir, $WorkerDir)) {
        if (Test-Path $dir) {
            Write-Host "  [OK] $dir" -ForegroundColor Green
        } else {
            Write-Host "  [--] $dir (created on first start)" -ForegroundColor DarkGray
        }
    }

    $registry = if (Test-Path $RegistryPath) { Get-Registry } else { $null }
    $cellCount = if ($registry) { @($registry.cells).Count } else { 0 }
    $aliveCount = 0
    if ($registry -and $cellCount -gt 0) {
        foreach ($c in $registry.cells) {
            $procPid = [int]($c.pid ?? 0)
            if (Test-PidAlive $procPid) { $aliveCount++ }
        }
    }
    Write-Host "  [OK] Cells: $cellCount registered, $aliveCount running" -ForegroundColor Green

    Write-Host ''
    if ($ok) {
        Write-Host '  All checks passed.' -ForegroundColor Green
    } else {
        Write-Host '  Some checks failed — see above.' -ForegroundColor Yellow
    }
    Write-Host ''
}

# ── Action: start ─────────────────────────────────────────────────────────────

function Start-AgentCell {
    param([string]$CellName)

    $registry = Get-Registry

    # Guard: already running
    $record = Get-CellRecord $CellName $registry
    if ($record) {
        $procPid = [int]($record.pid ?? 0)
        if (Test-PidAlive $procPid) {
            Write-CellLog "$CellName is already running (PID $procPid)" 'WARN'
            return
        }
    }

    # Ensure dirs exist (including per-cell DLQ dir)
    $cellDlqDir = Join-Path $DlqDir $CellName
    foreach ($dir in @($InboxDir, $StatusDir, $LogDir, $WorkerDir, $DlqDir, $cellDlqDir)) {
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    }

    # Remove stale inbox files
    Remove-Item (Join-Path $InboxDir "$CellName.task") -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $InboxDir "$CellName.task.processing") -ErrorAction SilentlyContinue

    # Write worker script and launch as detached process
    $workerScript = New-WorkerScript -CellName $CellName
    $proc = Start-Process pwsh -ArgumentList @(
        '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
        '-File', $workerScript
    ) -PassThru -WindowStyle Hidden

    # Wait briefly for status file to appear (worker writes 'idle' on startup)
    $deadline = (Get-Date).AddSeconds(5)
    while ((Get-Date) -lt $deadline) {
        if (Test-Path (Join-Path $StatusDir "$CellName.json")) { break }
        Start-Sleep -Milliseconds 200
    }

    # Update registry
    if ($record) {
        $record.pid       = $proc.Id
        $record.startedAt = (Get-Date -Format 'o')
        $record.status    = 'idle'
    } else {
        $newCell = [ordered]@{
            name      = $CellName
            pid       = $proc.Id
            startedAt = (Get-Date -Format 'o')
            status    = 'idle'
        }
        $registry.cells = @($registry.cells) + $newCell
    }
    Save-Registry $registry

    Write-CellLog "$CellName started (PID $($proc.Id))" 'OK'
    Write-CellLog "Log: $LogDir\$CellName.log" 'INFO'

    if ($Visual) {
        $logFile = Join-Path $LogDir "$CellName.log"
        if (-not (Test-Path $logFile)) { '' | Set-Content $logFile -Encoding UTF8 }
        $wtCmd = "Get-Content '$logFile' -Wait -Tail 40"
        try {
            Start-Process wt.exe -ArgumentList @(
                '-w', '0', 'new-tab', '--title', "Agent $CellName",
                '--', 'pwsh', '-NoExit', '-Command', $wtCmd
            )
            Write-CellLog "Opened Windows Terminal tab for $CellName" 'OK'
        } catch {
            Write-CellLog "Could not open Windows Terminal: $($_.Exception.Message)" 'WARN'
            Write-CellLog "Tail manually: Get-Content '$logFile' -Wait -Tail 40" 'INFO'
        }
    }
}

# ── Action: stop ──────────────────────────────────────────────────────────────

function Stop-AgentCell {
    param([string]$CellName)

    $registry = Get-Registry
    $record   = Get-CellRecord $CellName $registry

    $procPid = if ($record) { [int]($record.pid ?? 0) } else { 0 }
    if ($procPid -gt 0 -and (Test-PidAlive $procPid)) {
        try {
            Stop-Process -Id $procPid -Force -ErrorAction Stop
            Write-CellLog "$CellName stopped (PID $procPid)" 'OK'
        } catch {
            Write-CellLog "Could not stop PID $procPid : $($_.Exception.Message)" 'WARN'
        }
    } else {
        Write-CellLog "$CellName has no running process" 'WARN'
    }

    if ($record) {
        $record.status = 'stopped'
        $record.pid    = 0
        Save-Registry $registry
    }

    $statusFile = Join-Path $StatusDir "$CellName.json"
    if (Test-Path $statusFile) {
        [ordered]@{ cell = $CellName; status = 'stopped'; updatedAt = (Get-Date -Format 'o') } |
            ConvertTo-Json | Set-Content $statusFile -Encoding UTF8
    }
}

# ── Action: assign ────────────────────────────────────────────────────────────

function Invoke-Assign {
    param([string]$CellName, [string]$TaskText)

    $registry = Get-Registry
    $record   = Get-CellRecord $CellName $registry

    if (-not $record) {
        Write-CellLog "$CellName not found in registry. Start it first: -Action start -Cell $CellName" 'ERROR'
        exit 1
    }

    $procPid = [int]($record.pid ?? 0)
    if (-not (Test-PidAlive $procPid)) {
        Write-CellLog "$CellName is not running (PID $procPid dead). Restart: -Action start -Cell $CellName" 'ERROR'
        exit 1
    }

    $live = Get-LiveStatus $CellName
    if ($live -and $live.status -eq 'busy') {
        Write-CellLog "$CellName is busy with: $($live.currentTask)" 'WARN'
        Write-CellLog 'Wait for it to finish or choose another cell.' 'INFO'
        exit 1
    }

    $taskFile = Join-Path $InboxDir "$CellName.task"
    if (Test-Path $taskFile) {
        Write-CellLog "Inbox already has a pending task for $CellName" 'WARN'
        exit 1
    }

    $TaskText | Set-Content -Path $taskFile -Encoding UTF8 -NoNewline

    # Persist pendingTask in registry so restart can resume it after a reboot
    $record | Add-Member -NotePropertyName pendingTask -NotePropertyValue $TaskText -Force
    Save-Registry $registry

    Write-CellLog "Task assigned to $CellName" 'OK'
    Write-CellLog "Task: $TaskText" 'INFO'
    Write-CellLog "Log:  $LogDir\$CellName.log" 'INFO'
}

# ── Action: monitor ───────────────────────────────────────────────────────────

function Invoke-Monitor {
    param([string]$CellName, [bool]$FollowMode, [bool]$AllCells)

    if ($AllCells) {
        $registry  = Get-Registry
        $cellNames = @($registry.cells | ForEach-Object { $_.name })
        if (-not $cellNames) { Write-CellLog 'No cells registered.' 'WARN'; return }

        Write-CellLog "Tailing all cells: $($cellNames -join ', ')" 'INFO'
        Write-Host '  Press Ctrl+C to stop.' -ForegroundColor DarkGray

        $tailJobs = $cellNames | ForEach-Object {
            $logFile = Join-Path $LogDir "$_.log"
            if (-not (Test-Path $logFile)) { '' | Set-Content $logFile -Encoding UTF8 }
            $n = $_
            Start-Job -ScriptBlock {
                param($f, $n)
                Get-Content $f -Wait -Tail 20 | ForEach-Object { "[$n] $_" }
            } -ArgumentList $logFile, $n
        }

        try {
            while ($true) {
                $tailJobs | ForEach-Object { Receive-Job $_ }
                Start-Sleep -Milliseconds 500
            }
        } finally {
            $tailJobs | Stop-Job  -ErrorAction SilentlyContinue
            $tailJobs | Remove-Job -ErrorAction SilentlyContinue
        }
        return
    }

    $logFile = Join-Path $LogDir "$CellName.log"
    if (-not (Test-Path $logFile)) {
        Write-CellLog "No log yet for $CellName. Assign a task first." 'WARN'
        return
    }

    if ($FollowMode) {
        Write-CellLog "Following $CellName (Ctrl+C to stop)" 'INFO'
        Get-Content $logFile -Wait -Tail $Lines
    } else {
        Get-Content $logFile -Tail $Lines
    }
}

# ── Action: list ──────────────────────────────────────────────────────────────

function Invoke-List {
    $registry = Get-Registry
    $cells    = @($registry.cells)

    if ($cells.Count -eq 0) {
        Write-Host ''
        Write-Host '  No cells registered. Start one with:' -ForegroundColor DarkGray
        Write-Host '    .\Manage-Agents.ps1 -Action start -Cell CELL_01' -ForegroundColor Gray
        Write-Host ''
        return
    }

    Write-Host ''
    Write-Host ('  {0,-12} {1,-10} {2,-8} {3,-50}' -f 'CELL', 'STATUS', 'PID', 'CURRENT TASK') -ForegroundColor White
    Write-Host ('  {0,-12} {1,-10} {2,-8} {3,-50}' -f '────────────', '──────────', '────────', '──────────────────────────────────────────────────') -ForegroundColor DarkGray

    foreach ($cell in $cells) {
        $live   = Get-LiveStatus $cell.name
        $status = if ($live) { $live.status } else { $cell.status ?? 'unknown' }
        $task   = if ($live -and $live.currentTask) { $live.currentTask }
                  elseif ($status -in @('dead','stopped') -and $cell.PSObject.Properties['pendingTask'] -and $cell.pendingTask) { "[resume] $($cell.pendingTask)" }
                  else { '' }
        $procPid    = [int]($cell.pid ?? 0)
        $procPidStr = if ($procPid -gt 0) { "$procPid" } else { '-' }

        # Verify process is still alive
        if ($status -notin @('stopped', 'failed') -and $procPid -gt 0 -and -not (Test-PidAlive $procPid)) {
            $status = 'dead'
        }

        # Detect stuck-alive: PID up but heartbeat stale
        # Use [datetimeoffset] to handle timezone offset in ISO 8601 strings correctly.
        # Thresholds: idle > 3 min = stuck (loop runs every 30s); busy > 30 min = stuck.
        if ($live -and $live.PSObject.Properties['lastHeartbeat'] -and $live.lastHeartbeat) {
            try {
                $hbAge = ([datetimeoffset]::Now - [datetimeoffset]::Parse($live.lastHeartbeat)).TotalSeconds
                $stuckThreshold = if ($status -eq 'busy') { 1800 } else { 180 }
                if ($hbAge -gt $stuckThreshold -and $status -notin @('stopped','failed','dead')) {
                    $status = 'stuck'
                }
            } catch { }
        }

        $colour = switch ($status) {
            'idle'    { 'Green'    }
            'busy'    { 'Yellow'   }
            'stuck'   { 'Magenta'  }
            'failed'  { 'Red'      }
            'dead'    { 'Red'      }
            'stopped' { 'DarkGray' }
            default   { 'White'    }
        }

        $taskShort = if ($task.Length -gt 48) { $task.Substring(0, 45) + '...' } else { $task }
        Write-Host ('  {0,-12} ' -f $cell.name) -NoNewline -ForegroundColor White
        Write-Host ('{0,-10} ' -f $status.ToUpper()) -NoNewline -ForegroundColor $colour
        Write-Host ('{0,-8} ' -f $procPidStr)            -NoNewline -ForegroundColor DarkGray
        Write-Host $taskShort                                    -ForegroundColor DarkGray
    }

    Write-Host ''
}

# ── Action: restart ───────────────────────────────────────────────────────────

function Restart-AgentCell {
    param([string]$CellName)

    # ── Restart cooldown / storm prevention ───────────────────────────────────
    $registry = Get-Registry
    $record   = Get-CellRecord $CellName $registry

    if ($record) {
        # Enforce minimum cooldown between restarts
        $lastRestart = if ($record.PSObject.Properties['lastRestartAt']) { [datetime]$record.lastRestartAt } else { [datetime]::MinValue }
        $secsSince   = ([datetime]::UtcNow - $lastRestart.ToUniversalTime()).TotalSeconds
        if ($secsSince -lt $RestartCooldownSecs) {
            $wait = [int]($RestartCooldownSecs - $secsSince)
            Write-CellLog "$CellName restarted ${secsSince}s ago — cooldown active (${wait}s remaining). Waiting..." 'WARN'
            Start-Sleep -Seconds $wait
        }

        # Track rapid restarts — warn if 3+ in 5 min
        $recentRestarts = if ($record.PSObject.Properties['recentRestarts']) {
            @(@($record.recentRestarts) | Where-Object { ([datetime]::UtcNow - [datetime]$_).TotalSeconds -lt $RestartWindowSecs })
        } else { @() }

        if (@($recentRestarts).Count -ge $MaxRestartsPerWindow) {
            Write-CellLog "$CellName has restarted $($recentRestarts.Count) times in ${RestartWindowSecs}s — possible crash loop. Proceeding with caution." 'WARN'
        }

        $recentRestarts = @($recentRestarts) + @((Get-Date -Format 'o'))
        $record | Add-Member -NotePropertyName recentRestarts -NotePropertyValue $recentRestarts -Force
        $record | Add-Member -NotePropertyName lastRestartAt  -NotePropertyValue (Get-Date -Format 'o') -Force
        Save-Registry $registry
    }

    Write-CellLog "Restarting $CellName..." 'INFO'
    Stop-AgentCell  -CellName $CellName
    Start-Sleep -Milliseconds 500
    Start-AgentCell -CellName $CellName

    # Auto-resume any task that was in-flight or queued before the shutdown
    $registry = Get-Registry
    $record   = Get-CellRecord $CellName $registry
    $pending  = if ($record -and $record.PSObject.Properties['pendingTask']) { $record.pendingTask } else { $null }

    if ($pending) {
        $live     = Get-LiveStatus $CellName
        $lastTask = if ($live -and $live.PSObject.Properties['lastTask']) { $live.lastTask } else { '' }

        if ($lastTask -eq $pending) {
            # Task already completed before the shutdown — clear stale pending entry
            $record | Add-Member -NotePropertyName pendingTask -NotePropertyValue '' -Force
            Save-Registry $registry
            Write-CellLog "Pending task already completed — nothing to resume." 'INFO'
        } else {
            Write-CellLog "Resuming pending task for $CellName..." 'INFO'
            Start-Sleep -Milliseconds 800   # let worker reach idle before assigning
            Invoke-Assign -CellName $CellName -TaskText $pending
        }
    }
}

# ── Action: broadcast ─────────────────────────────────────────────────────────

function Invoke-Broadcast {
    param([string]$TaskText)

    $registry  = Get-Registry
    $idleCells = @($registry.cells) | Where-Object {
        $live    = Get-LiveStatus $_.name
        $status  = if ($live) { $live.status } else { $_.status }
        $procPid = [int]($_.pid ?? 0)
        $status -eq 'idle' -and (Test-PidAlive $procPid)
    }

    if (-not $idleCells) {
        Write-CellLog 'No idle cells available to broadcast to.' 'WARN'
        exit 1
    }

    foreach ($cell in $idleCells) {
        Invoke-Assign -CellName $cell.name -TaskText $TaskText
    }

    Write-CellLog "Broadcast sent to $(@($idleCells).Count) cell(s): $($idleCells.name -join ', ')" 'OK'
}

# ── Action: clear-log ─────────────────────────────────────────────────────────

function Clear-CellLog {
    param([string]$CellName, [bool]$AllCells)

    if ($AllCells) {
        $registry = Get-Registry
        foreach ($cell in @($registry.cells)) {
            $logFile = Join-Path $LogDir "$($cell.name).log"
            if (Test-Path $logFile) {
                '' | Set-Content $logFile -Encoding UTF8
                Write-CellLog "Cleared log: $($cell.name)" 'OK'
            }
        }
        return
    }

    $logFile = Join-Path $LogDir "$CellName.log"
    if (Test-Path $logFile) {
        '' | Set-Content $logFile -Encoding UTF8
        Write-CellLog "Cleared log: $CellName" 'OK'
    } else {
        Write-CellLog "No log found for $CellName" 'WARN'
    }
}

# ── Action: purge ─────────────────────────────────────────────────────────────

function Remove-AgentCell {
    param([string]$CellName)

    $registry = Get-Registry
    $record   = Get-CellRecord $CellName $registry

    if (-not $record) {
        Write-CellLog "$CellName not found in registry" 'WARN'
        return
    }

    # Stop the process if alive
    $procPid = [int]($record.pid ?? 0)
    if ($procPid -gt 0 -and (Test-PidAlive $procPid)) {
        Stop-Process -Id $procPid -Force -ErrorAction SilentlyContinue
        Write-CellLog "Stopped PID $procPid" 'OK'
    }

    # Remove registry entry
    $registry.cells = @($registry.cells) | Where-Object { $_.name -ne $CellName }
    Save-Registry $registry

    # Remove status, worker, inbox files
    Remove-Item (Join-Path $StatusDir "$CellName.json")       -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $WorkerDir  "$CellName.ps1")       -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $InboxDir   "$CellName.task")      -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $InboxDir   "$CellName.task.processing") -ErrorAction SilentlyContinue

    Write-CellLog "$CellName purged from registry and disk" 'OK'
    Write-CellLog "Log preserved at: $LogDir\$CellName.log" 'INFO'
}

# ── Action: dlq ──────────────────────────────────────────────────────────────

function Invoke-Dlq {
    param([string]$CellName, [bool]$ClearAll)

    if (-not (Test-Path $DlqDir)) { Write-Host '  Dead letter queue is empty.' -ForegroundColor Green; return }

    $pattern = if ($CellName) { "$CellName\*.json" } else { '*\*.json' }
    $files   = @(Get-ChildItem $DlqDir -Recurse -Filter '*.json' -ErrorAction SilentlyContinue)

    if (-not $files) { Write-Host '  Dead letter queue is empty.' -ForegroundColor Green; return }

    if ($ClearAll) {
        $files | Remove-Item -Force -ErrorAction SilentlyContinue
        Write-CellLog "DLQ cleared ($($files.Count) entries removed)" 'OK'
        return
    }

    Write-Host ''
    Write-Host '  Dead Letter Queue' -ForegroundColor Red
    Write-Host '  ─────────────────────────────────────────────────' -ForegroundColor DarkGray
    foreach ($f in $files) {
        try {
            $entry = Get-Content $f.FullName -Raw | ConvertFrom-Json
            $ts    = if ($entry.PSObject.Properties['escalatedAt']) { $entry.escalatedAt } else { $f.LastWriteTime }
            Write-Host "  [$($entry.cell)] failures=$($entry.failures)  at $ts" -ForegroundColor Yellow
            $preview = $entry.task.Substring(0, [Math]::Min(100, $entry.task.Length))
            Write-Host "    $preview" -ForegroundColor DarkGray
        } catch { Write-Host "  $($f.Name)" -ForegroundColor DarkGray }
        Write-Host ''
    }
    Write-Host "  To retry: delete the DLQ file and reassign the task." -ForegroundColor DarkGray
    Write-Host "  To clear: .\Manage-Agents.ps1 -Action dlq -All" -ForegroundColor DarkGray
    Write-Host ''
}

# ── Issue tracker helpers ─────────────────────────────────────────────────────

$IssuesDir = 'D:\databases\agent_issues'

function Get-IssueFile {
    param([string]$IssueId)
    if (-not (Test-Path $IssuesDir)) { return $null }
    return Get-ChildItem $IssuesDir -Filter "$IssueId*.json" | Select-Object -First 1
}

# ── Action: issues ────────────────────────────────────────────────────────────

function Invoke-Issues {
    if (-not (Test-Path $IssuesDir)) {
        Write-Host '  No issues logged yet.' -ForegroundColor DarkGray
        return
    }

    $all = @(Get-ChildItem $IssuesDir -Filter '*.json' | ForEach-Object {
        try { Get-Content $_.FullName -Raw | ConvertFrom-Json } catch { $null }
    } | Where-Object { $_ -and $_.status -eq 'open' } | Sort-Object {
        switch ($_.severity) { 'critical' { 0 } 'high' { 1 } 'medium' { 2 } 'low' { 3 } default { 4 } }
    })

    if (-not $all) { Write-Host '  No open issues.' -ForegroundColor Green; return }

    Write-Host ''
    Write-Host ('  {0,-22} {1,-8} {2,-10} {3}' -f 'ID', 'SEV', 'FOUND BY', 'TITLE') -ForegroundColor White
    Write-Host ('  {0,-22} {1,-8} {2,-10} {3}' -f '──────────────────────', '────────', '──────────', '─────────────────────────────────────────') -ForegroundColor DarkGray

    foreach ($issue in $all) {
        $colour = switch ($issue.severity) {
            'critical' { 'Red' } 'high' { 'Yellow' } 'medium' { 'Cyan' } default { 'White' }
        }
        $titleShort = if ($issue.title.Length -gt 48) { $issue.title.Substring(0,45) + '...' } else { $issue.title }
        Write-Host ('  {0,-22} ' -f $issue.id)               -NoNewline -ForegroundColor DarkGray
        Write-Host ('{0,-8} '    -f $issue.severity.ToUpper()) -NoNewline -ForegroundColor $colour
        Write-Host ('{0,-10} '   -f $issue.foundBy)            -NoNewline -ForegroundColor DarkGray
        Write-Host $titleShort                                              -ForegroundColor White
        if ($issue.file) {
            Write-Host ('  {0,-22}   {1}' -f '', $issue.file) -ForegroundColor DarkGray
        }
        if ($issue.description) {
            $desc = if ($issue.description.Length -gt 80) { $issue.description.Substring(0,77) + '...' } else { $issue.description }
            Write-Host ('  {0,-22}   {1}' -f '', $desc) -ForegroundColor DarkGray
        }
        Write-Host ''
    }
}

# ── Action: issue-assign ──────────────────────────────────────────────────────

function Invoke-IssueAssign {
    param([string]$IssueId, [string]$CellName, [bool]$AutoPick)

    $issueFile = Get-IssueFile $IssueId
    if (-not $issueFile) {
        Write-CellLog "Issue '$IssueId' not found in $IssuesDir" 'ERROR'
        exit 1
    }

    $issue = Get-Content $issueFile.FullName -Raw | ConvertFrom-Json

    if ($issue.status -ne 'open') {
        Write-CellLog "Issue $IssueId is already $($issue.status)" 'WARN'
    }

    # Build a focused fix task from the issue details
    $fixTask = "Fix the following issue in $($issue.file):`n`nTitle: $($issue.title)`n"
    if ($issue.description) { $fixTask += "Details: $($issue.description)`n" }
    $fixTask += "`nApply the fix directly in the file. Do not leave stubs or TODOs."

    # Resolve target cell
    $targetCell = $CellName
    if ($AutoPick -or -not $targetCell) {
        $registry  = Get-Registry
        $autoCell  = @($registry.cells) | Where-Object {
            $live    = Get-LiveStatus $_.name
            $status  = if ($live) { $live.status } else { $_.status }
            $procId  = [int]($_.pid ?? 0)
            $status -eq 'idle' -and (Test-PidAlive $procId)
        } | Select-Object -First 1
        if (-not $autoCell) {
            Write-CellLog 'No idle cells available. Start one first.' 'ERROR'
            exit 1
        }
        $targetCell = $autoCell.name
    }

    Invoke-Assign -CellName $targetCell -TaskText $fixTask

    # Mark issue as assigned
    $issue | Add-Member -NotePropertyName assignedTo -NotePropertyValue $targetCell -Force
    $issue | Add-Member -NotePropertyName status     -NotePropertyValue 'assigned'  -Force
    $issue | ConvertTo-Json | Set-Content $issueFile.FullName -Encoding UTF8

    Write-CellLog "Issue $IssueId assigned to $targetCell" 'OK'
}

# ── Action: issue-close ───────────────────────────────────────────────────────

function Close-Issue {
    param([string]$IssueId)

    $issueFile = Get-IssueFile $IssueId
    if (-not $issueFile) {
        Write-CellLog "Issue '$IssueId' not found" 'ERROR'
        exit 1
    }

    $issue = Get-Content $issueFile.FullName -Raw | ConvertFrom-Json
    $issue | Add-Member -NotePropertyName status  -NotePropertyValue 'fixed'           -Force
    $issue | Add-Member -NotePropertyName closedAt -NotePropertyValue (Get-Date -Format 'o') -Force
    $issue | ConvertTo-Json | Set-Content $issueFile.FullName -Encoding UTF8

    Write-CellLog "Issue $IssueId closed." 'OK'
    Write-CellLog "$($issue.title)" 'INFO'
}

# ── Dispatch ──────────────────────────────────────────────────────────────────

switch ($Action) {
    'doctor'  { Invoke-Doctor }
    'start'   {
        if (-not $Cell) { Write-CellLog '-Cell is required for -Action start' 'ERROR'; exit 1 }
        Start-AgentCell -CellName $Cell
    }
    'stop'    {
        if (-not $Cell) { Write-CellLog '-Cell is required for -Action stop' 'ERROR'; exit 1 }
        Stop-AgentCell -CellName $Cell
    }
    'restart' {
        if (-not $Cell) { Write-CellLog '-Cell is required for -Action restart' 'ERROR'; exit 1 }
        Restart-AgentCell -CellName $Cell
    }
    'assign'  {
        if (-not $Task) { Write-CellLog '-Task is required for -Action assign' 'ERROR'; exit 1 }
        if ($Auto) {
            # Find first idle+alive cell automatically
            $registry  = Get-Registry
            $autoCell  = @($registry.cells) | Where-Object {
                $live    = Get-LiveStatus $_.name
                $status  = if ($live) { $live.status } else { $_.status }
                $procPid = [int]($_.pid ?? 0)
                $status -eq 'idle' -and (Test-PidAlive $procPid)
            } | Select-Object -First 1
            if (-not $autoCell) {
                Write-CellLog 'No idle cells available. Start one with: -Action start -Cell CELL_01' 'ERROR'
                exit 1
            }
            Invoke-Assign -CellName $autoCell.name -TaskText $Task
        } else {
            if (-not $Cell) { Write-CellLog '-Cell or -Auto is required for -Action assign' 'ERROR'; exit 1 }
            Invoke-Assign -CellName $Cell -TaskText $Task
        }
    }
    'broadcast' {
        if (-not $Task) { Write-CellLog '-Task is required for -Action broadcast' 'ERROR'; exit 1 }
        Invoke-Broadcast -TaskText $Task
    }
    'monitor' {
        if (-not $All -and -not $Cell) {
            Write-CellLog '-Cell or -All is required for -Action monitor' 'ERROR'
            exit 1
        }
        Invoke-Monitor -CellName $Cell -FollowMode $Follow.IsPresent -AllCells $All.IsPresent
    }
    'list'      { Invoke-List }
    'clear-log' { Clear-CellLog -CellName $Cell -AllCells $All.IsPresent }
    'purge'     {
        if (-not $Cell) { Write-CellLog '-Cell is required for -Action purge' 'ERROR'; exit 1 }
        Remove-AgentCell -CellName $Cell
    }
    'dlq'          { Invoke-Dlq -CellName $Cell -ClearAll $All.IsPresent }
    'issues'       { Invoke-Issues }
    'issue-assign' {
        if (-not $IssueId) { Write-CellLog '-IssueId is required for -Action issue-assign' 'ERROR'; exit 1 }
        Invoke-IssueAssign -IssueId $IssueId -CellName $Cell -AutoPick ($Auto.IsPresent -or -not $Cell)
    }
    'issue-close'  {
        if (-not $IssueId) { Write-CellLog '-IssueId is required for -Action issue-close' 'ERROR'; exit 1 }
        Close-Issue -IssueId $IssueId
    }
}
