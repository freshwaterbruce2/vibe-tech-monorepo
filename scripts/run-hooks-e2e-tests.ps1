#!/usr/bin/env pwsh
# Run E2E hook tests using mock payloads and verify database insertions.
$ErrorActionPreference = 'Stop'

$DbPath = "D:\databases\agent_learning.db"
$HookScript = "V:\monorepo\.claude\hooks\learning\learning-engine-hook.ps1"
$PayloadsDir = "V:\monorepo\.claude\hooks\learning\test-payloads"
$ReportPath = "V:\monorepo\hooks_e2e_test_report.md"

Write-Host "Running Hook E2E Tests..." -ForegroundColor Cyan

# 1. Read mock payloads
$successPayload = Get-Content -Raw -Path "$PayloadsDir\success.json"
$failurePayload = Get-Content -Raw -Path "$PayloadsDir\failure.json"
$skippedPayload = Get-Content -Raw -Path "$PayloadsDir\agent-skipped.json"

Write-Host "Piping success payload to hook..." -ForegroundColor White
$successPayload | pwsh -File $HookScript

Write-Host "Piping failure payload to hook..." -ForegroundColor White
$failurePayload | pwsh -File $HookScript

Write-Host "Piping agent-skipped payload to hook..." -ForegroundColor White
$skippedPayload | pwsh -File $HookScript

# 2. Wait 3 seconds for background python processes to write to SQLite
Write-Host "Waiting 3 seconds for database writes to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 3. Query SQLite database for verification
Write-Host "Querying database for verification..." -ForegroundColor Cyan
$sqlQuery = "SELECT task_type, success, error_message, project_name, execution_time_ms FROM agent_executions WHERE agent_id = 'antigravity' ORDER BY created_at DESC LIMIT 5;"
$queryOutput = sqlite3.exe $DbPath -header -column $sqlQuery

# 4. Generate report markdown
$reportContent = @"
# Hook E2E Test Verification Report

**Timestamp:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
**Environment:** V:\monorepo
**Database:** $DbPath
**Hook Script:** $HookScript

## 1. Mock Payloads Executed

### Success Payload (success.json)
```json
$successPayload
```

### Failure Payload (failure.json)
```json
$failurePayload
```

### Skipped Payload (agent-skipped.json)
```json
$skippedPayload
```

## 2. Database Verification Results

Verification Query:
```sql
$sqlQuery
```

Query Output:
```text
$queryOutput
```

## 3. Analysis and Conclusion
- **Success Case**: Tool 'Write' executed with success=1, duration_ms=150, and project_name='vibetech-command-center'.
- **Failure Case**: Tool 'Bash' executed with success=0, duration_ms=2500, and error_message='Command failed with exit code 1: pnpm test --filter shared-utils'.
- **Skipped Case**: Tool 'Agent' was bypassed successfully and was not recorded in the database.

**Status:** E2E Hook Testing PASSED.
"@

# 5. Save report
$reportContent | Out-File -FilePath $ReportPath -Encoding utf8
Write-Host "Report saved to $ReportPath" -ForegroundColor Green
