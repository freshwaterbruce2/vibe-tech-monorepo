---
name: powershell-operations
description: High-confidence PowerShell patterns from learning system - proven workflows with 100% success rate across 305 executions
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: "1.0.0"
  generated_from: learning_system_tool_analysis
  success_rate: 1.0
  category: devops
  source_tool: PowerShell
  executions_analyzed: 305
  avg_execution_time_ms: 18349
---

# PowerShell Operations

**Auto-generated from 305 successful PowerShell executions with 100% success rate**

## Overview

This skill captures high-confidence PowerShell command patterns identified by the learning system. These patterns have been validated across hundreds of executions in the VibeTech monorepo environment and represent the most reliable approaches for Windows system administration and automation.

## Core Capabilities

### 1. Use PowerShell Tool (Not Bash Shell for Windows Ops)
- Native Windows administration
- Access to COM/WMI/.NET objects
- Pipeline with objects (not text)
- Works with MSYS/bash terminal

### 2. Windows-Specific Operations
- Registry manipulation
- Service management
- File system with ACLs
- Process management
- Scheduled tasks
- Event log queries

### 3. Path Handling (Windows)
- Use native paths: `C:\Users\...` or `V:\monorepo\...`
- Convert MSYS paths when needed: `\/c\/Users\...` → `C:\Users\...`
- Use `$env:VAR` for environment variables
- Use `Join-Path` for safe path concatenation

## Usage Examples

### Example 1: Listing directory contents
```powershell
# Instead of: ls -la
# Use:
Get-ChildItem -Path "C:\Users\fresh_zxae3v6" -Force
```

### Example 2: Searching file contents
```powershell
# Instead of: grep -r "pattern" src/
# Use:
Select-String -Pattern "pattern" -Path "src\*" -Recurse
```

### Example 3: Managing Windows services
```powershell
# Check service status
Get-Service -Name "wuauserv"
# Start service
Start-Service -Name "wuauserv"
```

### Example 4: Registry operations
```powershell
# Read registry value
Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion" -Name "ProgramFilesDir"
```

## Integration with Monorepo

- **Monorepo Root**: `V:\monorepo` (native Windows path)
- **Data Drive**: `D:\` for databases, logs, backups
- **Terminal**: Runs in MSYS/bash but PowerShell commands work natively
- **Package Manager**: pnpm 9.15.0 (use `pnpm` not `pnpm.exe` in PS)

## Safety Measures

1. **Execution Policy**: Use `-ExecutionPolicy Bypass` for scripts
2. **No Profile**: Use `-NoProfile` for faster startup
3. **Error Handling**: Use `try/catch` with `$ErrorActionPreference = "Stop"`
4. **Admin Rights**: Some operations require elevated PowerShell

## Related Skills

- `powershell-patterns` - High-confidence PowerShell automation patterns
- `bash-command-patterns` - High-confidence Bash command patterns
- `terminal-operations` - Execute commands in terminal
- `file-edit-patterns` - High-confidence file editing patterns

## Generation Metadata

- **Source**: Learning system agent_executions table
- **Tool**: PowerShell
- **Total Executions**: 305
- **Successes**: 305
- **Success Rate**: 100%
- **Avg Execution Time**: 18,349ms
- **Last Analyzed**: 2026-06-18
- **Confidence**: 1.0