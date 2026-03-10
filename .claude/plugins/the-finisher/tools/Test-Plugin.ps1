# Test-Plugin.ps1
# Automated validation script for The Finisher plugin

<#
.SYNOPSIS
    Validates The Finisher plugin structure, components, and configuration.

.DESCRIPTION
    Comprehensive testing script that validates:
    - Directory structure
    - Manifest correctness
    - Component files existence and format
    - JSON/YAML syntax validation
    - PowerShell script execution
    - Security checks
    - Best practices compliance

.PARAMETER PluginPath
    Path to plugin root directory. Defaults to script location's parent.

.PARAMETER Verbose
    Show detailed test output.

.EXAMPLE
    .\Test-Plugin.ps1

.EXAMPLE
    .\Test-Plugin.ps1 -PluginPath "C:\dev\.claude\plugins\the-finisher" -Verbose
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$PluginPath = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),

    [Parameter(Mandatory = $false)]
    [switch]$DetailedOutput
)

$ErrorActionPreference = "Continue"

# Test results
$script:totalTests = 0
$script:passedTests = 0
$script:failedTests = 0
$script:warnings = 0

# Color output functions
function Write-TestHeader {
    param([string]$Message)
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor Cyan
}

function Write-TestPass {
    param([string]$Message)
    $script:totalTests++
    $script:passedTests++
    Write-Host "  [PASS] $Message" -ForegroundColor Green
}

function Write-TestFail {
    param([string]$Message)
    $script:totalTests++
    $script:failedTests++
    Write-Host "  [FAIL] $Message" -ForegroundColor Red
}

function Write-TestWarning {
    param([string]$Message)
    $script:warnings++
    Write-Host "  [WARN] $Message" -ForegroundColor Yellow
}

function Write-TestInfo {
    param([string]$Message)
    if ($DetailedOutput) {
        Write-Host "      $Message" -ForegroundColor Gray
    }
}

# Test functions
function Test-PluginStructure {
    Write-TestHeader "1. Testing Plugin Directory Structure"

    # Check plugin root exists
    if (Test-Path $PluginPath) {
        Write-TestPass "Plugin root directory exists: $PluginPath"
    } else {
        Write-TestFail "Plugin root directory not found: $PluginPath"
        return $false
    }

    # Check required directories
    $requiredDirs = @(
        ".claude-plugin",
        "commands",
        "hooks",
        "prompts",
        "tools"
    )

    foreach ($dir in $requiredDirs) {
        $dirPath = Join-Path $PluginPath $dir
        if (Test-Path $dirPath) {
            Write-TestPass "Directory exists: $dir"
        } else {
            Write-TestFail "Required directory missing: $dir"
        }
    }

    # Check optional directories
    $optionalDirs = @("examples", "agents", "skills")
    foreach ($dir in $optionalDirs) {
        $dirPath = Join-Path $PluginPath $dir
        if (Test-Path $dirPath) {
            Write-TestInfo "Optional directory found: $dir"
        }
    }

    return $true
}

function Test-ManifestFile {
    Write-TestHeader "2. Testing Plugin Manifest"

    $manifestPath = Join-Path $PluginPath ".claude-plugin\plugin.json"

    if (-not (Test-Path $manifestPath)) {
        Write-TestFail "Manifest file not found: $manifestPath"
        return $false
    }

    Write-TestPass "Manifest file exists"

    # Validate JSON syntax
    try {
        $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
        Write-TestPass "Manifest JSON syntax is valid"
    } catch {
        Write-TestFail "Manifest JSON syntax error: $_"
        return $false
    }

    # Check required fields
    if ($manifest.name) {
        Write-TestPass "Required field 'name' present: $($manifest.name)"

        # Validate kebab-case
        if ($manifest.name -match '^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$') {
            Write-TestPass "Name follows kebab-case convention"
        } else {
            Write-TestFail "Name does not follow kebab-case: $($manifest.name)"
        }
    } else {
        Write-TestFail "Required field 'name' missing"
    }

    # Check optional but recommended fields
    if ($manifest.version) {
        if ($manifest.version -match '^\d+\.\d+\.\d+$') {
            Write-TestPass "Version follows semantic versioning: $($manifest.version)"
        } else {
            Write-TestWarning "Version does not follow semver: $($manifest.version)"
        }
    } else {
        Write-TestWarning "Version field missing (recommended)"
    }

    if ($manifest.description) {
        Write-TestPass "Description present"
        Write-TestInfo "Description: $($manifest.description)"
    } else {
        Write-TestWarning "Description missing (recommended)"
    }

    if ($manifest.author) {
        Write-TestPass "Author information present"
    } else {
        Write-TestWarning "Author information missing (recommended)"
    }

    if ($manifest.license) {
        Write-TestPass "License specified: $($manifest.license)"
    } else {
        Write-TestWarning "License missing (recommended)"
    }

    return $true
}

function Test-CommandFiles {
    Write-TestHeader "3. Testing Command Files"

    $commandsPath = Join-Path $PluginPath "commands"

    if (-not (Test-Path $commandsPath)) {
        Write-TestWarning "Commands directory not found (may not have commands)"
        return $true
    }

    $commandFiles = Get-ChildItem -Path $commandsPath -Filter "*.md" -Recurse

    if ($commandFiles.Count -eq 0) {
        Write-TestWarning "No command files found"
        return $true
    }

    Write-TestInfo "Found $($commandFiles.Count) command file(s)"

    foreach ($cmdFile in $commandFiles) {
        Write-Host ""
        Write-Host "  Testing command: $($cmdFile.Name)" -ForegroundColor White

        $content = Get-Content $cmdFile.FullName -Raw

        # Check for YAML frontmatter
        if ($content -match '^---\s*\n') {
            Write-TestPass "YAML frontmatter present"

            # Extract frontmatter
            if ($content -match '^---\s*\n([\s\S]*?)\n---') {
                $frontmatter = $Matches[1]

                # Check required fields
                if ($frontmatter -match 'description:\s*(.+)') {
                    Write-TestPass "Description field present"
                } else {
                    Write-TestFail "Description field missing"
                }

                # Check optional fields
                if ($frontmatter -match 'allowed-tools:') {
                    Write-TestPass "allowed-tools field present"
                }
                if ($frontmatter -match 'argument-hint:') {
                    Write-TestInfo "argument-hint field present"
                }
            }
        } else {
            Write-TestFail "YAML frontmatter missing"
        }

        # Check for markdown content
        $hasContent = ($content -replace '^---[\s\S]*?---', '').Trim().Length -gt 0
        if ($hasContent) {
            Write-TestPass "Markdown content present"
        } else {
            Write-TestFail "No markdown content found"
        }
    }

    return $true
}

function Test-HookConfiguration {
    Write-TestHeader "4. Testing Hook Configuration"

    $hooksPath = Join-Path $PluginPath "hooks\hooks.json"

    if (-not (Test-Path $hooksPath)) {
        Write-TestWarning "hooks.json not found (plugin may not have hooks)"
        return $true
    }

    Write-TestPass "hooks.json file exists"

    # Validate JSON syntax
    try {
        $hooks = Get-Content $hooksPath -Raw | ConvertFrom-Json
        Write-TestPass "hooks.json JSON syntax is valid"
    } catch {
        Write-TestFail "hooks.json JSON syntax error: $_"
        return $false
    }

    # Check hook structure
    $hookEvents = @("Stop", "PreToolUse", "PostToolUse", "SessionStart", "SessionEnd")

    foreach ($event in $hookEvents) {
        if ($hooks.$event) {
            Write-TestPass "Hook event '$event' configured"

            foreach ($hookConfig in $hooks.$event) {
                if ($hookConfig.matcher) {
                    Write-TestInfo "Matcher: $($hookConfig.matcher)"
                }
                if ($hookConfig.hooks) {
                    foreach ($hook in $hookConfig.hooks) {
                        if ($hook.command) {
                            # Check for portable path reference
                            if ($hook.command -like '*CLAUDE_PLUGIN_ROOT*') {
                                Write-TestPass "Uses portable path reference"
                            } else {
                                Write-TestWarning "Command may not use portable path"
                            }
                        }
                    }
                }
            }
        }
    }

    return $true
}

function Test-PowerShellScripts {
    Write-TestHeader "5. Testing PowerShell Scripts"

    $scriptFiles = Get-ChildItem -Path $PluginPath -Filter "*.ps1" -Recurse

    if ($scriptFiles.Count -eq 0) {
        Write-TestWarning "No PowerShell scripts found"
        return $true
    }

    Write-TestInfo "Found $($scriptFiles.Count) PowerShell script(s)"

    foreach ($script in $scriptFiles) {
        Write-Host ""
        Write-Host "  Testing script: $($script.Name)" -ForegroundColor White

        # Test syntax by parsing
        try {
            $null = [System.Management.Automation.PSParser]::Tokenize((Get-Content $script.FullName -Raw), [ref]$null)
            Write-TestPass "PowerShell syntax is valid"
        } catch {
            Write-TestFail "PowerShell syntax error: $_"
        }

        # Check for help comment block
        $content = Get-Content $script.FullName -Raw
        if ($content -match '<#[\s\S]*?#>') {
            Write-TestPass "Help comment block present"
        } else {
            Write-TestWarning "Help comment block missing (recommended)"
        }

        # Check for dangerous patterns
        $dangerousPatterns = @(
            @{ Pattern = 'Remove-Item.*-Recurse.*-Force'; Desc = "Dangerous recursive deletion" },
            @{ Pattern = 'Invoke-Expression'; Desc = "Code injection risk" },
            @{ Pattern = 'iex\s'; Desc = "Code injection risk (iex alias)" }
        )

        foreach ($pattern in $dangerousPatterns) {
            if ($content -match $pattern.Pattern) {
                Write-TestWarning "Found potentially dangerous pattern: $($pattern.Desc)"
            }
        }
    }

    return $true
}

function Test-SecurityIssues {
    Write-TestHeader "6. Testing Security"

    # Check for hardcoded secrets
    $secretPatterns = @('password\s*=', 'api[_-]?key\s*=', 'secret\s*=', 'token\s*=')
    $allFiles = Get-ChildItem -Path $PluginPath -Recurse -File -Include "*.json", "*.md", "*.ps1", "*.js", "*.ts"

    $foundSecrets = $false
    foreach ($file in $allFiles) {
        $content = Get-Content $file.FullName -Raw
        foreach ($pattern in $secretPatterns) {
            if ($content -match $pattern) {
                Write-TestWarning "Potential secret pattern in $($file.Name): $pattern"
                $foundSecrets = $true
            }
        }
    }

    if (-not $foundSecrets) {
        Write-TestPass "No hardcoded secrets detected"
    }

    # Check file sizes
    $largeFiles = Get-ChildItem -Path $PluginPath -Recurse -File | Where-Object { $_.Length -gt 5MB }
    if ($largeFiles) {
        foreach ($file in $largeFiles) {
            Write-TestWarning "Large file detected: $($file.Name) - $([Math]::Round($file.Length / 1MB, 2)) MB"
        }
    } else {
        Write-TestPass "No files exceed 5MB limit"
    }

    return $true
}

function Test-Documentation {
    Write-TestHeader "7. Testing Documentation"

    # Check README
    $readmePath = Join-Path $PluginPath "README.md"
    if (Test-Path $readmePath) {
        Write-TestPass "README.md exists"

        $content = Get-Content $readmePath -Raw
        $sections = @("Installation", "Usage", "Features", "Examples")

        foreach ($section in $sections) {
            if ($content -match "#{1,3}\s+$section") {
                Write-TestPass "README section: $section"
            } else {
                Write-TestWarning "README missing section: $section"
            }
        }

        # Check size
        $size = (Get-Item $readmePath).Length
        if ($size -gt 1KB) {
            Write-TestPass "README is substantial ($([Math]::Round($size / 1KB, 2)) KB)"
        } else {
            Write-TestWarning "README is very short ($size bytes)"
        }
    } else {
        Write-TestFail "README.md not found"
    }

    # Check LICENSE
    $licensePath = Join-Path $PluginPath "LICENSE"
    if (Test-Path $licensePath) {
        Write-TestPass "LICENSE file exists"
    } else {
        Write-TestWarning "LICENSE file missing (recommended)"
    }

    # Check .gitignore
    $gitignorePath = Join-Path $PluginPath ".gitignore"
    if (Test-Path $gitignorePath) {
        Write-TestPass ".gitignore file exists"
    } else {
        Write-TestWarning ".gitignore file missing (recommended)"
    }

    return $true
}

# Main execution
function Invoke-PluginTests {
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host "      THE FINISHER PLUGIN - AUTOMATED VALIDATION SUITE" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Plugin Path: $PluginPath" -ForegroundColor White
    Write-Host "Test Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White

    # Run all tests
    Test-PluginStructure
    Test-ManifestFile
    Test-CommandFiles
    Test-HookConfiguration
    Test-PowerShellScripts
    Test-SecurityIssues
    Test-Documentation

    # Summary
    Write-TestHeader "TEST SUMMARY"
    Write-Host ""
    Write-Host "  Total Tests:   $script:totalTests" -ForegroundColor White
    Write-Host "  Passed:        $script:passedTests" -ForegroundColor Green
    Write-Host "  Failed:        $script:failedTests" -ForegroundColor $(if ($script:failedTests -gt 0) { "Red" } else { "Green" })
    Write-Host "  Warnings:      $script:warnings" -ForegroundColor Yellow
    Write-Host ""

    # Calculate pass rate
    if ($script:totalTests -gt 0) {
        $passRate = [Math]::Round(($script:passedTests / $script:totalTests) * 100, 1)
        Write-Host "  Pass Rate:     $passRate%" -ForegroundColor $(if ($passRate -ge 90) { "Green" } elseif ($passRate -ge 70) { "Yellow" } else { "Red" })
    }

    Write-Host ""

    # Overall result
    if ($script:failedTests -eq 0) {
        Write-Host ("=" * 70) -ForegroundColor Green
        Write-Host "                    ALL TESTS PASSED" -ForegroundColor Green
        Write-Host ("=" * 70) -ForegroundColor Green

        if ($script:warnings -gt 0) {
            Write-Host ""
            Write-Host "[!] $script:warnings warning(s) found - see above for details" -ForegroundColor Yellow
        }

        return 0
    } else {
        Write-Host ("=" * 70) -ForegroundColor Red
        Write-Host "                    TESTS FAILED" -ForegroundColor Red
        Write-Host ("=" * 70) -ForegroundColor Red
        Write-Host ""
        Write-Host "Please review the failures above and fix them." -ForegroundColor Red

        return 1
    }
}

# Run tests
$exitCode = Invoke-PluginTests

# Exit with appropriate code
exit $exitCode
