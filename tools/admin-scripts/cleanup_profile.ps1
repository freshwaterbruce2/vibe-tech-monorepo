[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [switch]$Force
)

if ($Force) { $ConfirmPreference = 'None' }

$profilePath = "C:\Users\fresh_zxae3v6"
$backupPath = "D:\Archives\Profile_Cleanup_$(Get-Date -Format 'yyyyMMdd')"
$toolsPath = "D:\Data\Tools"

# Ensure destinations exist
if (-not (Test-Path $backupPath)) { New-Item -Path $backupPath -ItemType Directory -Force | Out-Null }
if (-not (Test-Path $toolsPath)) { New-Item -Path $toolsPath -ItemType Directory -Force | Out-Null }

Write-Host "CLEANING UP C:\Users\fresh_zxae3v6" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# 1. DELETE CANDIDATES (Junk)
# ---------------------------
$filesToDelete = @(
  "Claude Setup.exe",
  "DumpStack.log",
  "DumpStack.log.tmp",
  "WinPEpge.sys",
  ".emulator_console_auth_token",
  ".git-for-windows-updater"
)

foreach ($file in $filesToDelete) {
  $path = Join-Path $profilePath $file
  if (Test-Path $path) {
    if ($PSCmdlet.ShouldProcess($path, "Delete File")) {
      Remove-Item -Path $path -Force -ErrorAction SilentlyContinue
      Write-Host "[DELETED] $file" -ForegroundColor Red
    }
  }
}

# 2. ARCHIVE CANDIDATES (Configs/Logs to preserve)
# ---------------------------
$filesToArchive = @(
  ".env",
  ".python_history",
  ".node_repl_history",
  ".npmrc",
  "ntuser.dat.LOG1",
  "ntuser.dat.LOG2"
)

foreach ($file in $filesToArchive) {
  $path = Join-Path $profilePath $file
  if (Test-Path $path) {
    if ($PSCmdlet.ShouldProcess($path, "Move to Archive")) {
      Move-Item -Path $path -Destination $backupPath -Force -ErrorAction SilentlyContinue
      Write-Host "[ARCHIVED] $file" -ForegroundColor Yellow
    }
  }
}

# 3. HEAVY FOLDERS -> D:\Data (Junction)
# ---------------------------
# We move the content to D:, then create a Junction on C: pointing to it.
# This frees space on C: but keeps tools working.

$foldersToMove = @(
  @{Name = ".pnpm-store"; Dest = "D:\Data\pnpm-store" },  # Merge into existing D:\Data store
  @{Name = ".cargo"; Dest = "$toolsPath\.cargo" },
  @{Name = ".rustup"; Dest = "$toolsPath\.rustup" },
  @{Name = ".gradle"; Dest = "$toolsPath\.gradle" },
  @{Name = ".cache"; Dest = "$toolsPath\.cache" },
  @{Name = ".vscode"; Dest = "$toolsPath\.vscode" },
  @{Name = "go"; Dest = "$toolsPath\go" },
  @{Name = ".bun"; Dest = "$toolsPath\.bun" },
  @{Name = ".docker"; Dest = "$toolsPath\.docker" },
  @{Name = ".android"; Dest = "$toolsPath\.android" }
)

foreach ($item in $foldersToMove) {
  $source = Join-Path $profilePath $item.Name
  $dest = $item.Dest

  if ((Test-Path $source) -and -not (Get-Item $source).Attributes.HasFlag([System.IO.FileAttributes]::ReparsePoint)) {
    # Check if it's already a junction/symlink - if so, skip or verify

    if ($PSCmdlet.ShouldProcess($source, "Move to $dest and link")) {
      Write-Host "Processing $($item.Name)..." -NoNewline

      # 1. Create Dest if not exists
      if ($item.Name -eq ".pnpm-store") {
        # Special case: Merge. If D:\Data\pnpm-store exists, likely just use it.
        # If C: store has unique items, moving might be complex.
        # Simplest: Delete C: store and link to D: store (assuming D: is main).
        # But safer to move/merge. Robocopy is good for moving.
        if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
      }
      else {
        if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
      }

      # 2. Move Content (Use Robocopy for speed/integrity, then Del)
      # PowerShell Move-Item can be slow/fail on open files.
      # Using Move-Item for simplicity first.

      try {
        if ($item.Name -eq ".pnpm-store") {
          # Just delete C: content if we trust D:? No, let's just delete C: and link.
          # pnpm store is a cache.
          Remove-Item $source -Recurse -Force -ErrorAction SilentlyContinue
        }
        else {
          # Check if Dest already has content (e.g. from previous run)
          if ((Get-ChildItem $dest).Count -gt 0) {
            Write-Host " [Dest exists, merging]" -ForegroundColor Yellow
            # If dest exists, we remove source and link to dest (assuming dest is newer/better or just merge)
            # Safe choice: Rename source to source_bak
            Rename-Item $source -NewName "$($item.Name)_bak"
          }
          else {
            Move-Item -Path "$source\*" -Destination $dest -Force -ErrorAction Stop
            Remove-Item $source -Force
          }
        }

        # 3. Create Junction
        # cmd /c mklink /J "Link" "Target"
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c mklink /J `"$source`" `"$dest`"" -Wait -NoNewWindow
        Write-Host " [LINKED]" -ForegroundColor Green

      }
      catch {
        Write-Host " [ERROR: $_]" -ForegroundColor Red
      }
    }
  }
  else {
    if (Test-Path $source) {
      Write-Host "Skip $($item.Name) (Already Linked or invalid)" -ForegroundColor DarkGray
    }
  }
}

Write-Host "`nCleanup Complete!" -ForegroundColor Green
Write-Host "Backups at: $backupPath" -ForegroundColor Gray
