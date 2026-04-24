<#
.SYNOPSIS
  Applies local OpenClaw Control UI fixes to the installed OpenClaw package.

.DESCRIPTION
  OpenClaw's npm package is installed outside this repository, so direct edits
  under AppData are not durable. This script keeps the local patch source in git
  and reapplies it idempotently after OpenClaw is installed or upgraded.

  The patch is intentionally small:
  - persist tokenized dashboard URLs before the bundled app starts
  - improve narrow-width chat layout without changing API behavior

.PARAMETER OpenClawPackageRoot
  Optional path to the installed openclaw package root. When omitted, the script
  searches the pnpm global package directory for the newest OpenClaw install.

.PARAMETER VerifyOnly
  Verify that the patch is already applied. No files are written.

.EXAMPLE
  pwsh .\scripts\openclaw\Apply-ControlUiLocalFixes.ps1

.EXAMPLE
  pwsh .\scripts\openclaw\Apply-ControlUiLocalFixes.ps1 -VerifyOnly
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$OpenClawPackageRoot,
    [switch]$VerifyOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$TokenAssetName = 'openclaw-local-token.js'
$CssAssetName = 'openclaw-local-fixes.css'

$TokenAssetContent = @'
/* Persist tokenized OpenClaw dashboard URLs before the bundled app starts. */
(function () {
  try {
    var token = "";
    var rawHash = window.location.hash || "";

    if (rawHash.length > 1) {
      token = (new URLSearchParams(rawHash.slice(1)).get("token") || "").trim();
    }

    if (!token) {
      token = (new URLSearchParams(window.location.search || "").get("token") || "").trim();
    }

    if (!token || /[\r\n]/.test(token)) {
      return;
    }

    var gatewayUrl = (window.location.protocol === "https:" ? "wss:" : "ws:") + "//" + window.location.host;
    var tokenKey = "openclaw.control.token.v1:" + gatewayUrl;
    var settingsKey = "openclaw.control.settings.v1:" + gatewayUrl;
    var legacySettingsKey = "openclaw.control.settings.v1";
    var settings = {};

    localStorage.setItem(tokenKey, token);
    localStorage.removeItem("openclaw.control.token.v1");

    try {
      settings = JSON.parse(localStorage.getItem(settingsKey) || localStorage.getItem(legacySettingsKey) || "{}") || {};
    } catch (error) {
      settings = {};
    }

    settings.gatewayUrl = gatewayUrl;
    settings.token = token;
    settings.sessionKey = settings.sessionKey || "main";
    settings.lastActiveSessionKey = settings.lastActiveSessionKey || settings.sessionKey;
    settings.theme = settings.theme || "claw";
    settings.themeMode = settings.themeMode || "system";

    var serialized = JSON.stringify(settings);
    localStorage.setItem(settingsKey, serialized);
    localStorage.setItem(legacySettingsKey, serialized);
  } catch (error) {
    // Keep startup non-fatal; the built-in login form remains the fallback.
  }
})();
'@

$CssAssetContent = @'
/* Local OpenClaw Control UI patch for narrow embedded browsers. */
openclaw-app { min-width: 0; }

.topnav-shell,
.topnav-shell__content,
.chat,
.chat-main,
.chat-thread,
.chat-thread-inner,
.chat-group,
.chat-msg,
.chat-bubble,
.chat-text,
.cm-preview { min-width: 0; }

.chat-text,
.chat-bubble,
.cm-preview,
.cm-paragraph,
.cm-list-item,
.chat-tool-card__detail,
.chat-tool-card__block-content,
.chat-tool-card__raw-body,
.chat-json-content {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.chat-text code,
.cm-preview code { white-space: normal; }

.chat-tool-card__header,
.chat-tool-msg-summary,
.chat-tools-summary,
.chat-tool-card__actions,
.chat-bubble-actions { flex-wrap: wrap; }

.chat-tool-card,
.chat-json-content,
.cm-code-block,
.cm-table { max-width: 100%; }

@media (width <= 640px) {
  .shell { --shell-pad: 8px; }
  .topbar { min-width: 0; padding-inline: 8px; }
  .topnav-shell { gap: 8px; }
  .topnav-shell__actions { gap: 8px; }
  .topbar-search {
    flex: 1 1 auto;
    min-width: 0;
    max-width: none;
    padding-inline: 12px;
  }
  .topbar-search__kbd { display: none; }
  .content,
  .content--chat { padding: 8px 8px 12px; }
  .chat-main { min-width: 0; }
  .chat-thread {
    padding-inline: 0;
    padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  }
  .chat-thread-inner { width: 100%; }
  .chat-line.assistant .chat-msg,
  .chat-line.other .chat-msg,
  .chat-group.assistant .chat-msg,
  .chat-group.other .chat-msg {
    width: min(100%, 42rem);
    max-width: 100%;
  }
  .chat-line.user .chat-msg,
  .chat-group.user .chat-msg { max-width: min(92%, 34rem); }
  .chat-bubble { max-width: 100%; padding-inline: 12px; }
  .chat-bubble.has-copy { padding-right: 12px; }
  .chat-bubble-actions {
    position: static;
    justify-content: flex-end;
    margin-top: 8px;
    opacity: 1;
    pointer-events: auto;
  }
  .cm-bullet-list,
  .cm-numbered-list { padding-left: 1.25rem; }
  .chat-tool-card { max-height: none; padding: 10px 12px; }
  .chat-compose { padding-inline: 0; }
  .chat-compose__row { gap: 8px; }
  .chat-compose .chat-compose__field textarea {
    min-height: 48px;
    max-height: 38dvh;
  }
}

@media (width <= 360px) {
  .topbar { padding-inline: 6px; }
  .topnav-shell { gap: 6px; }
  .topbar-search { min-height: 36px; padding-inline: 10px; }
  .topbar-search__label {
    max-width: 9ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .content,
  .content--chat { padding-inline: 6px; }
  .chat-line.user .chat-msg,
  .chat-group.user .chat-msg { max-width: 94%; }
}
'@

function Test-OpenClawPackageRoot {
    param([string]$Root)

    if (-not $Root) {
        return $false
    }

    $indexPath = Join-Path $Root 'dist\control-ui\index.html'
    return Test-Path -LiteralPath $indexPath -PathType Leaf
}

function Resolve-OpenClawPackageRoot {
    if ($OpenClawPackageRoot) {
        $resolved = (Resolve-Path -LiteralPath $OpenClawPackageRoot).Path
        if (-not (Test-OpenClawPackageRoot -Root $resolved)) {
            throw "OpenClaw package root does not contain dist\control-ui\index.html: $resolved"
        }
        return $resolved
    }

    $localAppData = [Environment]::GetFolderPath('LocalApplicationData')
    $pnpmRoot = Join-Path $localAppData 'pnpm\global\5\.pnpm'
    if (-not (Test-Path -LiteralPath $pnpmRoot -PathType Container)) {
        throw "Could not find pnpm global package root: $pnpmRoot"
    }

    $candidates = Get-ChildItem -LiteralPath $pnpmRoot -Directory -Filter 'openclaw@*' |
        Sort-Object LastWriteTime -Descending |
        ForEach-Object { Join-Path $_.FullName 'node_modules\openclaw' }

    foreach ($candidate in $candidates) {
        if (Test-OpenClawPackageRoot -Root $candidate) {
            return $candidate
        }
    }

    throw "Could not locate an installed OpenClaw package under $pnpmRoot"
}

function Get-Utf8Text {
    param([string]$Path)
    return [IO.File]::ReadAllText($Path, [Text.UTF8Encoding]::new($false))
}

function ConvertTo-NormalizedNewlines {
    param([string]$Text)
    return $Text -replace "`r`n", "`n" -replace "`r", "`n"
}

function Set-Utf8TextIfChanged {
    param(
        [string]$Path,
        [string]$Content
    )

    if (Test-Path -LiteralPath $Path -PathType Leaf) {
        $current = Get-Utf8Text -Path $Path
        if ((ConvertTo-NormalizedNewlines -Text $current) -eq (ConvertTo-NormalizedNewlines -Text $Content)) {
            return $false
        }
    }

    if ($VerifyOnly) {
        throw "Verification failed: $Path is missing or differs from the expected local patch content."
    }

    $directory = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $directory -PathType Container)) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }

    if ($PSCmdlet.ShouldProcess($Path, 'write OpenClaw local UI patch asset')) {
        [IO.File]::WriteAllText($Path, $Content, [Text.UTF8Encoding]::new($false))
    }

    return $true
}

function Add-LineBeforeMatch {
    param(
        [string]$Content,
        [string]$Pattern,
        [string]$LineToAdd,
        [string]$Description
    )

    $match = [regex]::Match($Content, $Pattern, [Text.RegularExpressions.RegexOptions]::Multiline)
    if (-not $match.Success) {
        throw "Could not find insertion point for $Description in index.html."
    }

    $indent = $match.Groups[1].Value
    $insert = "$indent$LineToAdd$([Environment]::NewLine)$($match.Value)"
    return $Content.Remove($match.Index, $match.Length).Insert($match.Index, $insert)
}

function Add-LineAfterMatch {
    param(
        [string]$Content,
        [string]$Pattern,
        [string]$LineToAdd,
        [string]$Description
    )

    $match = [regex]::Match($Content, $Pattern, [Text.RegularExpressions.RegexOptions]::Multiline)
    if (-not $match.Success) {
        throw "Could not find insertion point for $Description in index.html."
    }

    $indent = $match.Groups[1].Value
    $insert = "$($match.Value)$([Environment]::NewLine)$indent$LineToAdd"
    return $Content.Remove($match.Index, $match.Length).Insert($match.Index, $insert)
}

function Update-IndexHtml {
    param([string]$IndexPath)

    $content = Get-Utf8Text -Path $IndexPath
    $updated = $content

    if ($updated -notmatch [regex]::Escape($TokenAssetName)) {
        $updated = Add-LineBeforeMatch `
            -Content $updated `
            -Pattern '^(\s*)<script type="module" crossorigin src="\./assets/index-[^"]+\.js"></script>' `
            -LineToAdd ('<script src="./assets/{0}"></script>' -f $TokenAssetName) `
            -Description $TokenAssetName
    }

    if ($updated -notmatch [regex]::Escape($CssAssetName)) {
        $updated = Add-LineAfterMatch `
            -Content $updated `
            -Pattern '^(\s*)<link rel="stylesheet" crossorigin href="\./assets/index-[^"]+\.css">' `
            -LineToAdd ('<link rel="stylesheet" crossorigin href="./assets/{0}">' -f $CssAssetName) `
            -Description $CssAssetName
    }

    if ($updated -eq $content) {
        return $false
    }

    if ($VerifyOnly) {
        throw "Verification failed: index.html is missing one or more local patch tags."
    }

    if ($PSCmdlet.ShouldProcess($IndexPath, 'insert OpenClaw local UI patch tags')) {
        [IO.File]::WriteAllText($IndexPath, $updated, [Text.UTF8Encoding]::new($false))
    }

    return $true
}

$packageRoot = Resolve-OpenClawPackageRoot
$controlUiRoot = Join-Path $packageRoot 'dist\control-ui'
$assetsRoot = Join-Path $controlUiRoot 'assets'
$indexPath = Join-Path $controlUiRoot 'index.html'
$tokenAssetPath = Join-Path $assetsRoot $TokenAssetName
$cssAssetPath = Join-Path $assetsRoot $CssAssetName

$changes = @()
if (Set-Utf8TextIfChanged -Path $tokenAssetPath -Content $TokenAssetContent) {
    $changes += $tokenAssetPath
}
if (Set-Utf8TextIfChanged -Path $cssAssetPath -Content $CssAssetContent) {
    $changes += $cssAssetPath
}
if (Update-IndexHtml -IndexPath $indexPath) {
    $changes += $indexPath
}

$index = Get-Utf8Text -Path $indexPath
foreach ($needle in @($TokenAssetName, $CssAssetName)) {
    if ($index -notmatch [regex]::Escape($needle)) {
        throw "Verification failed: index.html does not reference $needle."
    }
}

if ((Get-Utf8Text -Path $tokenAssetPath) -notmatch 'openclaw\.control\.token\.v1:') {
    throw "Verification failed: $TokenAssetName does not contain the expected token storage key."
}

if ((Get-Utf8Text -Path $cssAssetPath) -notmatch 'overflow-wrap: anywhere') {
    throw "Verification failed: $CssAssetName does not contain the narrow-layout wrapping fix."
}

if ($VerifyOnly) {
    Write-Host "[OK] OpenClaw Control UI local fixes are applied: $packageRoot" -ForegroundColor Green
} elseif ($changes.Count -eq 0) {
    Write-Host "[OK] OpenClaw Control UI local fixes were already current: $packageRoot" -ForegroundColor Green
} else {
    Write-Host "[OK] Applied OpenClaw Control UI local fixes: $packageRoot" -ForegroundColor Green
    foreach ($change in $changes) {
        Write-Host "  $change"
    }
}
