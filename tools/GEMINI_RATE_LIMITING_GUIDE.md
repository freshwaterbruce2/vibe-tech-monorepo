# Gemini CLI Rate Limiting Guide

**Last Updated:** 2026-01-11
**Purpose:** Prevent API quota exhaustion when using Gemini CLI

---

## 🎯 Understanding Rate Limits (2026)

### Free Tier Limits

- **Requests Per Minute (RPM):** ~60 requests
- **Tokens Per Minute (TPM):** ~32,000 tokens
- **Daily Quota:** Varies by model

### Model-Specific Limits

- **Gemini 1.5 Flash:** Higher limits (recommended for frequent use)
- **Gemini 1.5 Pro:** Lower limits, higher quality
- **Gemini 2.0 Flash:** Experimental, may have different limits

**Check your limits:** <https://ai.google.dev/>

---

## ✅ Solution 1: Use Rate-Limited Wrapper (Recommended)

### Single Query with Rate Limiting

```powershell
# Run a single query with automatic delay
.\tools\gemini-rate-limited.ps1 "What is the vibe-tutor project?"

# Custom delay (10 seconds)
.\tools\gemini-rate-limited.ps1 "Analyze this code" -DelaySeconds 10

# Debug mode (verbose output)
.\tools\gemini-rate-limited.ps1 "Help me debug" -Debug
```

**What it does:**

- Runs your query
- Automatically waits 5 seconds after (configurable)
- Prevents hitting rate limits on subsequent queries

---

## ✅ Solution 2: Batch Queries with Automatic Delays

### Multiple Queries with Rate Limiting

```powershell
# Define your queries
$queries = @(
    "Summarize vibe-tutor components",
    "Explain the database architecture",
    "Show me the AI integration patterns"
)

# Run with automatic rate limiting (5s delay between)
.\tools\gemini-batch-queries.ps1 -Queries $queries

# Custom delay (10 seconds between queries)
.\tools\gemini-batch-queries.ps1 -Queries $queries -DelayBetweenQueries 10

# Save results to file
.\tools\gemini-batch-queries.ps1 -Queries $queries -OutputFile "results.json"
```

**What it does:**

- Runs multiple queries sequentially
- Adds delay between each query (5s default)
- Tracks success/failure
- Optionally saves results to JSON file

---

## ✅ Solution 3: Check Quota Status

### Monitor Your API Usage

```powershell
# Check current quota status and recent errors
.\tools\gemini-check-quota.ps1
```

**Output includes:**

- Gemini CLI version
- API connectivity test
- Recent quota errors from logs
- Recommendations for your usage tier

---

## 📋 Common Scenarios

### Scenario 1: Analyzing Multiple Files

```powershell
# Create queries for each file
$files = Get-ChildItem C:\dev\apps\vibe-tutor\components\*.tsx -File
$queries = $files | ForEach-Object { "Analyze this React component: $($_.Name)" }

# Run with rate limiting
.\tools\gemini-batch-queries.ps1 -Queries $queries -DelayBetweenQueries 5
```

### Scenario 2: Debugging Sessions

```powershell
# Interactive debugging with manual delays
function Ask-Gemini {
    param([string]$Query)
    gemini chat $Query
    Write-Host "⏳ Waiting 5 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

# Use in PowerShell session
Ask-Gemini "What causes this error?"
Ask-Gemini "How do I fix it?"
Ask-Gemini "Show me example code"
```

### Scenario 3: CI/CD Pipeline

```powershell
# In GitHub Actions or Azure Pipelines
# Add delays between Gemini calls

# Step 1: Analyze code
gemini chat "Review this PR"
Start-Sleep -Seconds 10

# Step 2: Generate docs
gemini chat "Document these changes"
Start-Sleep -Seconds 10

# Step 3: Suggest improvements
gemini chat "Suggest optimizations"
```

---

## ⚠️ What to Do When You Hit Quota

### Immediate Actions

1. **Wait for Reset:**

   ```powershell
   # Most quota errors reset in 60 seconds
   Write-Host "⏳ Waiting 60 seconds for quota reset..."
   Start-Sleep -Seconds 60
   ```

2. **Check for Stuck Processes:**

   ```powershell
   # Kill any stuck gemini processes consuming quota
   Get-Process | Where-Object { $_.ProcessName -like "*gemini*" } | Stop-Process -Force
   ```

3. **Switch to Lower-Rate Model:**

   ```bash
   # Use Flash model (higher rate limits)
   gemini --model gemini-1.5-flash chat "your query"
   ```

### Long-term Solutions

1. **Upgrade to Paid Tier:**
   - Visit <https://ai.google.dev/>
   - Consider Google AI Studio subscription
   - Higher RPM/TPM limits

2. **Optimize Query Batching:**
   - Group related questions into single queries
   - Use context windows more efficiently
   - Reduce redundant queries

3. **Implement Caching:**

   ```powershell
   # Cache common queries to avoid re-asking
   $cache = @{}

   function Get-CachedGeminiResponse {
       param([string]$Query)

       if ($cache.ContainsKey($Query)) {
           Write-Host "📦 Using cached response" -ForegroundColor Cyan
           return $cache[$Query]
       }

       $response = gemini chat $Query
       $cache[$Query] = $response
       Start-Sleep -Seconds 5  # Rate limiting
       return $response
   }
   ```

---

## 🔧 Advanced: Custom Rate Limiter Class

For complex applications, use a PowerShell class:

```powershell
class GeminiRateLimiter {
    [int]$RequestsPerMinute = 60
    [System.Collections.Generic.Queue[DateTime]]$RequestHistory

    GeminiRateLimiter() {
        $this.RequestHistory = [System.Collections.Generic.Queue[DateTime]]::new()
    }

    [bool] CanMakeRequest() {
        $now = Get-Date
        $oneMinuteAgo = $now.AddMinutes(-1)

        # Remove old requests
        while ($this.RequestHistory.Count -gt 0 -and
               $this.RequestHistory.Peek() -lt $oneMinuteAgo) {
            [void]$this.RequestHistory.Dequeue()
        }

        return $this.RequestHistory.Count -lt $this.RequestsPerMinute
    }

    [void] WaitForRateLimit() {
        while (-not $this.CanMakeRequest()) {
            Write-Host "⏳ Rate limit reached, waiting..." -ForegroundColor Yellow
            Start-Sleep -Seconds 1
        }
        $this.RequestHistory.Enqueue((Get-Date))
    }

    [string] MakeRequest([string]$Query) {
        $this.WaitForRateLimit()
        return (gemini chat $Query)
    }
}

# Usage
$limiter = [GeminiRateLimiter]::new()
$response1 = $limiter.MakeRequest("Query 1")
$response2 = $limiter.MakeRequest("Query 2")  # Automatically waits if needed
```

---

## 📊 Monitoring & Debugging

### Enable Debug Mode

```bash
# See detailed API calls and rate limit info
gemini --debug chat "test query"
```

### Check Logs

```powershell
# View recent Gemini logs
$logPath = "$env:USERPROFILE\.gemini\logs"
Get-ChildItem $logPath -Filter "*.log" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1 |
    Get-Content -Tail 50
```

### Track Your Usage

```powershell
# Count queries made today
$today = Get-Date -Format "yyyy-MM-dd"
$logFiles = Get-ChildItem "$env:USERPROFILE\.gemini\logs" -Filter "*$today*.log" -ErrorAction SilentlyContinue
$queryCount = ($logFiles | Get-Content | Select-String "chat").Count
Write-Host "Queries made today: $queryCount"
```

---

## 🎓 Best Practices Summary

1. **Always add delays:** 5 seconds minimum between queries
2. **Use batch scripts:** For multiple queries, use `gemini-batch-queries.ps1`
3. **Monitor quota:** Run `gemini-check-quota.ps1` daily
4. **Cache responses:** Avoid asking the same question twice
5. **Use Flash model:** Higher rate limits than Pro
6. **Upgrade if needed:** Consider paid tier for heavy usage
7. **Debug mode:** Use `--debug` flag when troubleshooting
8. **Kill stuck processes:** Check for runaway gemini processes

---

## 🔗 Quick Reference

| Tool | Command | Purpose |
|------|---------|---------|
| **Rate-limited single query** | `.\tools\gemini-rate-limited.ps1 "query"` | Run one query with delay |
| **Batch queries** | `.\tools\gemini-batch-queries.ps1 -Queries @('q1','q2')` | Multiple queries with delays |
| **Check quota** | `.\tools\gemini-check-quota.ps1` | Monitor API usage |
| **Manual delay** | `Start-Sleep -Seconds 5` | Add delay in scripts |
| **Debug mode** | `gemini --debug chat "query"` | Verbose output |
| **Kill stuck processes** | `Get-Process *gemini* \| Stop-Process -Force` | Clean up |

---

**Status:** Ready to use
**Location:** `C:\dev\tools\`
**Scripts:**

- `gemini-rate-limited.ps1` - Single query wrapper
- `gemini-batch-queries.ps1` - Batch query runner
- `gemini-check-quota.ps1` - Quota status checker
