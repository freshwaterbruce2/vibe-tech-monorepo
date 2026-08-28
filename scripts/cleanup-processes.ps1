<#
.SYNOPSIS
  Kills duplicate/stale Node, Bun, and Python processes from MCP servers and dev tools.

.DESCRIPTION
  Safe-by-default: dry-run unless -Force is passed.
  Default mode deduplicates MCP server types (keeps newest).
  -Agents mode targets workspace orphans on V:\monorepo and D:\ with age/CPU filters.

.PARAMETER Force
  Actually kill processes. Without this flag, only preview (dry-run).

.PARAMETER Agents
  Workspace-scoped orphan cleanup (path + age + CPU filters).

.PARAMETER All
  Kill ALL matching node/bun/python dev processes (nuclear option). Still requires -Force.

.PARAMETER MinAgeMinutes
  Skip processes younger than this many minutes (default 15).

.PARAMETER MaxCpuPercent
  Skip processes at or above this CPU percentage (default 10). Set 0 to disable.

.PARAMETER LogDir
  Directory for run logs (default D:\logs\process-cleanup).

.EXAMPLE
  .\cleanup-processes.ps1                    # Dry-run, smart MCP dedup
  .\cleanup-processes.ps1 -Force             # Kill duplicate MCP servers
  .\cleanup-processes.ps1 -Agents            # Dry-run workspace orphan scan
  .\cleanup-processes.ps1 -Agents -Force   # Kill workspace orphans
  .\cleanup-processes.ps1 -All -Force        # Nuclear
#>
param(
    [switch]$Force,
    [switch]$Agents,
    [switch]$All,
    [int]$MinAgeMinutes = 15,
    [double]$MaxCpuPercent = 10,
    [string]$LogDir = 'D:\logs\process-cleanup'
)

$ErrorActionPreference = 'SilentlyContinue'

$DryRun = -not $Force
$WorkspaceRoots = @('V:\monorepo', 'D:\')

$SafelistPatterns = @(
    '*\docker\*',
    '*docker*',
    '*com.docker*',
    '*\wsl\*',
    '*wsl.exe*',
    '*vmmem*',
    '*\Windows\*',
    '*\System32\*',
    '*\Program Files\Windows*',
    '*\Program Files\Microsoft*',
    '*Cursor.exe*',
    '*Code.exe*',
    '*postgres.exe*',
    '*mongod.exe*',
    '*redis-server*'
)

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Add-Content -LiteralPath $script:LogFile -Value $line -Encoding UTF8
    switch ($Level) {
        'WARN'  { Write-Host $line -ForegroundColor Yellow }
        'ERROR' { Write-Host $line -ForegroundColor Red }
        'KILL'  { Write-Host $line -ForegroundColor DarkYellow }
        default { Write-Host $line }
    }
}

function Initialize-LogFile {
    param([string]$Directory)
    if (-not (Test-Path -LiteralPath $Directory)) {
        New-Item -ItemType Directory -Path $Directory -Force | Out-Null
    }
    return Join-Path $Directory ("cleanup-{0}.log" -f (Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'))
}

function Get-McpType {
    param([string]$Cmd)
    if (!$Cmd) { return 'unknown' }
    $map = @{
        '*cloud-run-mcp*'         = 'cloudrun-mcp'
        '*firebase*mcp*'          = 'firebase-mcp'
        '*genkit*'                = 'genkit-mcp'
        '*sequential-thinking*'   = 'sequential-thinking'
        '*playwright*mcp*'        = 'playwright-mcp'
        '*desktop-commander*'     = 'desktop-commander'
        '*neon*'                  = 'neon-mcp'
        '*perplexity*'            = 'perplexity-mcp'
        '*nx-mcp*'                = 'nx-mcp'
        '*nx.js*mcp*'             = 'nx-mcp'
        '*arize*'                 = 'arize-mcp'
        '*notebooklm*'            = 'notebooklm-mcp'
        '*mcp-skills*'            = 'skills-mcp'
        '*filesystem*'            = 'filesystem-mcp'
        '*feature-flags*server*'  = 'ff-server'
        '*run-executor*'          = 'nx-executor'
        '*server.mjs*'            = 'dev-server'
    }
    foreach ($pattern in $map.Keys) {
        if ($Cmd -like $pattern) { return $map[$pattern] }
    }
    return 'other'
}

function Test-Safelisted {
    param([string]$Cmd)
    if ([string]::IsNullOrWhiteSpace($Cmd)) { return $true }
    foreach ($pattern in $SafelistPatterns) {
        if ($Cmd -like $pattern) { return $true }
    }
    return $false
}

function Test-WorkspaceScoped {
    param([string]$Cmd)
    if ([string]::IsNullOrWhiteSpace($Cmd)) { return $false }
    foreach ($root in $WorkspaceRoots) {
        if ($Cmd -like "*$root*") { return $true }
    }
    return $false
}

function Test-AgentScoped {
    param([string]$Cmd, [string]$Type)
    if (Test-WorkspaceScoped $Cmd) { return $true }
    # MCP servers spawn from ~/.cursor plugin cache, not the monorepo tree
    if ($Cmd -like '*\.cursor\plugins\*') { return $true }
    if ($Cmd -like '*\.cursor\projects\*') { return $true }
    if ($Type -notin @('other', 'unknown')) { return $true }
    return $false
}

function Test-ProcessOldEnough {
    param([datetime]$Created, [int]$MinMinutes)
    if ($MinMinutes -le 0) { return $true }
    if (-not $Created) { return $true }
    $age = (Get-Date) - $Created
    return ($age.TotalMinutes -ge $MinMinutes)
}

function Get-ProcessCpuPercent {
    param([int]$ProcessId, [string]$ProcessName)
    if ($MaxCpuPercent -le 0) { return 0 }
    $safeName = ($ProcessName -replace '[^\w]', '_')
    if ($safeName.Length -gt 15) { $safeName = $safeName.Substring(0, 15) }
    $counterPath = "\Process($safeName*)\ID Process"
    try {
        $samples = Get-Counter -Counter $counterPath -ErrorAction Stop |
            Select-Object -ExpandProperty CounterSamples
        $match = $samples | Where-Object { $_.InstanceName -match "#$ProcessId$" -or $_.CookedValue -eq $ProcessId }
        if (-not $match) {
            $cpuPath = "\Process($safeName*)\% Processor Time"
            $cpuSamples = Get-Counter -Counter $cpuPath -ErrorAction SilentlyContinue |
                Select-Object -ExpandProperty CounterSamples
            if ($cpuSamples) {
                $idx = 0
                foreach ($idSample in $samples) {
                    if ($idSample.CookedValue -eq $ProcessId -and $idx -lt $cpuSamples.Count) {
                        return [math]::Round($cpuSamples[$idx].CookedValue / [Environment]::ProcessorCount, 2)
                    }
                    $idx++
                }
            }
            return 0
        }
    }
    catch {
        return 0
    }
    return 0
}

function Test-ProcessIdleEnough {
    param([int]$ProcessId, [string]$ProcessName)
    if ($MaxCpuPercent -le 0) { return $true }
    $cpu = Get-ProcessCpuPercent -ProcessId $ProcessId -ProcessName $ProcessName
    return ($cpu -lt $MaxCpuPercent)
}

function Get-AncestorPids {
    $ancestors = @()
    $curr = Get-CimInstance Win32_Process -Filter "ProcessId=$PID" -ErrorAction SilentlyContinue
    while ($curr) {
        $ancestors += [int]$curr.ProcessId
        if ($curr.ParentProcessId -le 0) { break }
        $curr = Get-CimInstance Win32_Process -Filter "ProcessId=$($curr.ParentProcessId)" -ErrorAction SilentlyContinue
    }
    return $ancestors
}

function Get-WinProcesses {
    param([string]$Name)
    Get-CimInstance Win32_Process -Filter "Name='$Name'" -ErrorAction SilentlyContinue |
        ForEach-Object {
            $created = $null
            if ($_.CreationDate) {
                $created = [Management.ManagementDateTimeConverter]::ToDateTime($_.CreationDate)
            }
            [PSCustomObject]@{
                PID     = [int]$_.ProcessId
                Name    = $_.Name
                Created = $created
                Cmd     = $_.CommandLine
                Type    = Get-McpType $_.CommandLine
            }
        }
}

function Test-EligibleForKill {
    param(
        $Process,
        [bool]$RequireWorkspace,
        [bool]$AgentScope,
        [int]$MinMinutes
    )
    if ($Process.PID -in $script:AncestorPids) {
        Write-Log "Skip PID $($Process.PID): ancestor of cleanup shell" 'WARN'
        return $false
    }
    if (Test-Safelisted $Process.Cmd) {
        Write-Log "Skip PID $($Process.PID): safelisted" 'WARN'
        return $false
    }
    if ($AgentScope) {
        if (-not (Test-AgentScoped -Cmd $Process.Cmd -Type $Process.Type)) {
            Write-Log "Skip PID $($Process.PID): outside agent scope" 'WARN'
            return $false
        }
    }
    elseif ($RequireWorkspace -and -not (Test-WorkspaceScoped $Process.Cmd)) {
        Write-Log "Skip PID $($Process.PID): outside workspace roots" 'WARN'
        return $false
    }
    if (-not (Test-ProcessOldEnough -Created $Process.Created -MinMinutes $MinMinutes)) {
        Write-Log "Skip PID $($Process.PID): younger than ${MinMinutes}m" 'WARN'
        return $false
    }
    if (-not (Test-ProcessIdleEnough -ProcessId $Process.PID -ProcessName $Process.Name)) {
        Write-Log "Skip PID $($Process.PID): CPU above ${MaxCpuPercent}%" 'WARN'
        return $false
    }
    return $true
}

function Stop-ProcessEntry {
    param($Process, [string]$Kind)
    $label = "$Kind PID $($Process.PID) ($($Process.Type))"
    if ($DryRun) {
        Write-Log "[WOULD KILL] $label" 'KILL'
    }
    else {
        Stop-Process -Id $Process.PID -Force -ErrorAction SilentlyContinue
        Write-Log "[KILLED] $label" 'KILL'
    }
}

# --- Main ---
$script:LogFile = Initialize-LogFile -Directory $LogDir
$script:AncestorPids = Get-AncestorPids

Write-Host '=== Process Cleanup ===' -ForegroundColor Cyan
if ($DryRun) {
    Write-Host '[DRY RUN] Pass -Force to actually kill processes' -ForegroundColor Yellow
}

Write-Log "Mode: DryRun=$DryRun Agents=$Agents All=$All MinAge=${MinAgeMinutes}m MaxCpu=${MaxCpuPercent}%"
Write-Log "Workspace roots: $($WorkspaceRoots -join ', ')"

$nodeProcs = Get-WinProcesses -Name 'node.exe'
$bunProcs = Get-WinProcesses -Name 'bun.exe'
$pyProcs = Get-WinProcesses -Name 'python.exe'
Write-Log "Found $($nodeProcs.Count) node.exe, $($bunProcs.Count) bun.exe, $($pyProcs.Count) python.exe processes"

$toKill = @()

if ($Agents) {
    # Workspace orphan mode: stale processes under monorepo/D: paths
    foreach ($proc in $nodeProcs) {
        if (Test-EligibleForKill -Process $proc -RequireWorkspace $false -AgentScope $true -MinMinutes $MinAgeMinutes) {
            $toKill += $proc
        }
    }
    foreach ($proc in $bunProcs) {
        if (Test-EligibleForKill -Process $proc -RequireWorkspace $false -AgentScope $true -MinMinutes $MinAgeMinutes) {
            $toKill += [PSCustomObject]@{
                PID     = $proc.PID
                Name    = 'bun.exe'
                Created = $proc.Created
                Cmd     = $proc.Cmd
                Type    = 'bun'
            }
        }
    }
    foreach ($proc in $pyProcs) {
        if (Test-EligibleForKill -Process $proc -RequireWorkspace $false -AgentScope $true -MinMinutes $MinAgeMinutes) {
            $toKill += [PSCustomObject]@{
                PID     = $proc.PID
                Name    = 'python.exe'
                Created = $proc.Created
                Cmd     = $proc.Cmd
                Type    = 'python'
            }
        }
    }
}
elseif ($All) {
    foreach ($proc in $nodeProcs) {
        if (Test-EligibleForKill -Process $proc -RequireWorkspace $false -AgentScope $false -MinMinutes 0) {
            $toKill += $proc
        }
    }
    foreach ($proc in $bunProcs) {
        if (Test-EligibleForKill -Process $proc -RequireWorkspace $false -AgentScope $false -MinMinutes 0) {
            $toKill += [PSCustomObject]@{
                PID     = $proc.PID
                Name    = 'bun.exe'
                Created = $proc.Created
                Cmd     = $proc.Cmd
                Type    = 'bun'
            }
        }
    }
    foreach ($proc in $pyProcs) {
        if (Test-EligibleForKill -Process $proc -RequireWorkspace $false -AgentScope $false -MinMinutes 0) {
            $toKill += [PSCustomObject]@{
                PID     = $proc.PID
                Name    = 'python.exe'
                Created = $proc.Created
                Cmd     = $proc.Cmd
                Type    = 'python'
            }
        }
    }
}
else {
    # Default: MCP dedup — keep newest of each type; kill stale executors
    $grouped = $nodeProcs | Group-Object Type
    foreach ($group in $grouped) {
        if ($group.Count -gt 1) {
            $sorted = $group.Group | Sort-Object Created -Descending
            foreach ($proc in ($sorted | Select-Object -Skip 1)) {
                if (Test-EligibleForKill -Process $proc -RequireWorkspace $false -AgentScope $false -MinMinutes $MinAgeMinutes) {
                    $toKill += $proc
                }
            }
        }
    }

    foreach ($proc in ($nodeProcs | Where-Object { $_.Type -in @('nx-executor', 'other') })) {
        if (Test-EligibleForKill -Process $proc -RequireWorkspace $false -AgentScope $false -MinMinutes $MinAgeMinutes) {
            $toKill += $proc
        }
    }

    # Python: UV cache workers, stuck notebooklm login, MCP dedup
    $pyToKill = @()
    $pyToKill += $pyProcs | Where-Object { $_.Cmd -like '*uv\cache\archive*' }
    $pyToKill += $pyProcs | Where-Object { $_.Cmd -like '*notebooklm*login*' }

    $mcpPy = $pyProcs | Where-Object {
        $_.Cmd -like '*notebooklm-mcp*' -or $_.Cmd -like '*arize*'
    }
    $pyGrouped = $mcpPy | Group-Object {
        if ($_.Cmd -like '*notebooklm*') { 'nbm' } else { 'arize' }
    }
    foreach ($group in $pyGrouped) {
        if ($group.Count -gt 1) {
            $sorted = $group.Group | Sort-Object Created -Descending
            $pyToKill += $sorted | Select-Object -Skip 1
        }
    }

    foreach ($proc in $pyToKill) {
        $wrapped = [PSCustomObject]@{
            PID     = $proc.PID
            Name    = 'python.exe'
            Created = $proc.Created
            Cmd     = $proc.Cmd
            Type    = 'python'
        }
        if (Test-EligibleForKill -Process $wrapped -RequireWorkspace $false -AgentScope $false -MinMinutes $MinAgeMinutes) {
            $toKill += $wrapped
        }
    }
}

$toKill = $toKill | Sort-Object PID -Unique

$nodeKilled = 0
$bunKilled = 0
$pyKilled = 0
foreach ($proc in $toKill) {
    if ($proc.Name -like '*python*' -or $proc.Type -eq 'python') {
        $kind = 'Python'
        Stop-ProcessEntry -Process $proc -Kind $kind
        $pyKilled++
    }
    elseif ($proc.Name -like '*bun*' -or $proc.Type -eq 'bun') {
        $kind = 'Bun'
        Stop-ProcessEntry -Process $proc -Kind $kind
        $bunKilled++
    }
    else {
        $kind = 'Node'
        Stop-ProcessEntry -Process $proc -Kind $kind
        $nodeKilled++
    }
}

Write-Host ''
Write-Host '=== Summary ===' -ForegroundColor Cyan
$verb = if ($DryRun) { 'Would kill' } else { 'Killed' }
Write-Host "  $verb $nodeKilled Node processes"
Write-Host "  $verb $bunKilled Bun processes"
Write-Host "  $verb $pyKilled Python processes"
Write-Host "  Log: $script:LogFile" -ForegroundColor DarkGray

Write-Log "Summary: $verb $nodeKilled node, $bunKilled bun, $pyKilled python"

if (-not $DryRun) {
    Start-Sleep -Seconds 1
    $remaining = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue).Count
    $bunRemaining = @(Get-CimInstance Win32_Process -Filter "Name='bun.exe'" -ErrorAction SilentlyContinue).Count
    $pyRemaining = @(Get-CimInstance Win32_Process -Filter "Name='python.exe'" -ErrorAction SilentlyContinue).Count
    Write-Host "  Remaining: $remaining Node, $bunRemaining Bun, $pyRemaining Python" -ForegroundColor Green
    Write-Log "Remaining: $remaining node, $bunRemaining bun, $pyRemaining python"
}

exit 0
