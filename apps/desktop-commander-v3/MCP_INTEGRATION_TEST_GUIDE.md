# MCP Integration Testing Guide

**Purpose:** Verify desktop-commander-v3 MCP server works correctly with Claude Desktop

**Estimated Time:** 15-20 minutes

**Prerequisites:**

- Claude Desktop installed
- Node.js 20.x installed
- desktop-commander-v3 built (`npm run build`)

---

## Quick Start (5 Minutes)

### Step 1: Build Project

```bash
cd C:\dev\apps\desktop-commander-v3
npm install
npm run build
```

Verify: `dist/mcp.js` file exists (should be ~15KB)

### Step 2: Test MCP Server Startup

```bash
node dist/mcp.js
```

Expected:

- No errors
- No console output (normal for stdio mode)
- Press Ctrl+C to stop

If errors occur, check:

- Node.js version: `node --version` (should be v20.x)
- Missing dependencies: Run `npm install` again

### Step 3: Configure Claude Desktop

**Windows:** Open/create `C:\Users\[YourUsername]\.claude\settings.json`

**Mac/Linux:** Open/create `~/.claude/settings.json`

**Add Configuration:**

```json
{
  "mcpServers": {
    "desktop-commander": {
      "command": "node",
      "args": ["C:\\dev\\apps\\desktop-commander-v3\\dist\\mcp.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Important:** Replace `C:\\dev\\apps\\desktop-commander-v3` with your actual path. Use double backslashes on Windows.

### Step 4: Restart Claude Desktop

1. Fully quit Claude Desktop (right-click system tray icon → Quit)
2. Wait 5 seconds
3. Relaunch Claude Desktop

### Step 5: Verify Connection

In Claude Desktop, type:

```
Can you list the available MCP tools?
```

Expected response: Claude should list 30+ tools starting with `dc_` (desktop commander)

**If not working:**

- Check Claude Desktop logs (usually in `~/.claude/logs/`)
- Verify config file location
- Ensure JSON syntax is valid
- Restart Claude Desktop again

---

## Detailed Integration Tests

### Test 1: System Information (Auto-Approve)

**Purpose:** Verify auto-approve tools work without confirmation

**Command to Claude:**

```
Show me system information using desktop commander
```

**Expected Behavior:**

- Claude uses `dc_get_system_info` tool
- No confirmation prompt (auto-approved)
- Returns CPU, memory, disk, network info
- Response time < 2 seconds

**Success Criteria:**

- Tool executes immediately
- Accurate system information returned
- No errors

---

### Test 2: File Operations (Path Validation)

**Purpose:** Verify file system operations and path security

**Test 2A: Read Allowed File**

**Command:**

```
Read the contents of C:\dev\apps\desktop-commander-v3\README.md
```

**Expected:**

- Uses `dc_read_file` tool
- Auto-approved (read operation)
- Returns file contents
- No errors

**Test 2B: List Directory**

**Command:**

```
List all files in C:\dev\apps\desktop-commander-v3\src
```

**Expected:**

- Uses `dc_list_directory` tool
- Auto-approved
- Returns list of .ts files
- No errors

**Test 2C: Block Unauthorized Path (Security Test)**

**Command:**

```
Read the file C:\Windows\System32\config\SAM
```

**Expected:**

- Attempts `dc_read_file` tool
- **ERROR:** "Path not in allowed directories"
- No file access (security validation working)
- Claude explains path is restricted

**Success Criteria:**

- Allowed paths work correctly
- Blocked paths return security errors
- No bypass possible

---

### Test 3: Window Management

**Purpose:** Verify window listing and process control

**Test 3A: List Windows**

**Command:**

```
Show me all open windows using desktop commander
```

**Expected:**

- Uses `dc_list_windows` tool
- Auto-approved
- Returns list of windows with titles and process names
- Response time < 1 second

**Test 3B: Get Active Window**

**Command:**

```
What window is currently active?
```

**Expected:**

- Uses `dc_get_active_window` tool
- Returns currently focused window information
- Includes window title and process name

---

### Test 4: Clipboard Operations

**Purpose:** Verify clipboard read/write functionality

**Test 4A: Read Clipboard**

1. Copy some text to clipboard manually (Ctrl+C)
2. Ask Claude:

   ```
   What's currently in my clipboard?
   ```

**Expected:**

- Uses `dc_get_clipboard` tool
- Auto-approved
- Returns clipboard contents accurately

**Test 4B: Write Clipboard**

**Command:**

```
Set my clipboard to "Test from Claude Desktop"
```

**Expected:**

- Uses `dc_set_clipboard` tool
- May ask for confirmation (check MCP_CONFIG.json)
- After approval, clipboard contains "Test from Claude Desktop"
- Can verify by pasting (Ctrl+V)

---

### Test 5: Permission System (Critical Security Test)

**Purpose:** Verify always-ask permissions work correctly

**Test 5A: File Deletion (Always-Ask)**

**Command:**

```
Delete the file C:\dev\test\temp.txt
```

**Expected:**

- Uses `dc_delete_file` tool
- **PROMPTS FOR CONFIRMATION** (always-ask permission)
- Shows warning message
- Only executes if user approves
- If approved, file is deleted

**Test 5B: Process Termination (Always-Ask)**

**Command:**

```
Terminate the notepad process
```

**Expected:**

- Uses `dc_terminate_app` tool
- **PROMPTS FOR CONFIRMATION** (always-ask permission)
- Only executes if user approves

**Success Criteria:**

- Dangerous operations require confirmation
- Confirmation prompt appears before execution
- User can deny the operation

---

### Test 6: Screenshot Capture

**Purpose:** Verify screenshot functionality

**Command:**

```
Take a screenshot and save it to D:\screenshots\test.png
```

**Expected:**

- Uses `dc_take_screenshot` tool
- May ask for confirmation (check permissions)
- Creates D:\screenshots\ directory if needed
- Saves screenshot as test.png
- Returns confirmation message

**Verify:**

- File D:\screenshots\test.png exists
- Image contains current screen contents
- File size reasonable (typically 100KB-2MB)

---

### Test 7: Command Execution

**Purpose:** Verify safe shell command execution

**Test 7A: Safe Command**

**Command:**

```
Run the command "echo Hello World" using desktop commander
```

**Expected:**

- Uses `dc_execute_command` or `dc_run_powershell` tool
- May auto-approve or ask (check permissions)
- Returns "Hello World"
- No errors

**Test 7B: Blocked Command (Security Test)**

**Command:**

```
Run the command "format C:"
```

**Expected:**

- **ERROR:** Command blocked (dangerous command)
- No execution
- Security validation working

**Success Criteria:**

- Safe commands execute
- Dangerous commands blocked
- Proper error messages

---

## Performance Benchmarks

| Operation | Target | Acceptable | Needs Improvement |
|-----------|--------|------------|-------------------|
| System info | <500ms | <1s | >1s |
| File read (small) | <100ms | <500ms | >500ms |
| File read (large) | <1s | <3s | >3s |
| Directory listing | <200ms | <1s | >1s |
| Window listing | <300ms | <1s | >1s |
| Clipboard operations | <200ms | <500ms | >500ms |
| Screenshot | <1s | <3s | >3s |

**How to measure:**

- Note timestamp before sending message to Claude
- Note timestamp when Claude returns response
- Calculate difference

**Typical response time:** 500ms-2s (includes Claude's processing time)

---

## Troubleshooting

### Problem: MCP server not showing in Claude Desktop

**Diagnosis:**

1. Check config file location:

   ```powershell
   Test-Path C:\Users\$env:USERNAME\.claude\settings.json
   ```

2. Validate JSON syntax:

   ```powershell
   Get-Content C:\Users\$env:USERNAME\.claude\settings.json | ConvertFrom-Json
   ```

3. Check Node.js in PATH:

   ```powershell
   node --version
   ```

**Solutions:**

- Ensure config file exists in correct location
- Fix JSON syntax errors (common: trailing commas, missing quotes)
- Add Node.js to system PATH
- Restart Claude Desktop completely (not just close window)

---

### Problem: Tools not executing

**Diagnosis:**

1. Check MCP connection status in Claude Desktop
2. View Claude Desktop logs (stderr output)
3. Test MCP server standalone:

   ```bash
   node dist/mcp.js
   # Should start without errors
   ```

**Solutions:**

- Verify MCP server is running
- Check permission configuration (MCP_CONFIG.json)
- Review path validation rules (PathValidator.ts)
- Ensure tools are registered in mcp.ts

---

### Problem: Path validation errors

**Diagnosis:**

1. Check error message (should indicate path issue)
2. Verify path format (use backslashes on Windows)
3. Check if path is in allowed directories

**Common Issues:**

- Relative paths (use absolute paths)
- Forward slashes on Windows (use backslashes: `C:\dev\`)
- Attempting to access restricted directories

**Allowed Paths (Default):**

- `C:\dev\` (read/write)
- `D:\` (read/write)
- `C:\Users\[user]\OneDrive\` (read-only)
- `C:\Users\[user]\Documents\` (read/write)
- `C:\Users\[user]\Desktop\` (read/write)

**Blocked Paths:**

- `C:\Windows\`
- `C:\Program Files\`
- `C:\ProgramData\`
- Other system directories

---

### Problem: Performance issues (slow response times)

**Diagnosis:**

1. Check system resource usage (CPU, memory)
2. Test operation standalone (without Claude)
3. Review operation complexity (large file reads, recursive directory listings)

**Solutions:**

- Close unnecessary applications
- Use smaller file operations
- Avoid recursive operations on large directories
- Check network latency (if applicable)

---

## Test Results Template

Copy this template and fill in results:

```markdown
# MCP Integration Test Results

**Date:** YYYY-MM-DD
**Tester:** [Your Name]
**Environment:**
- OS: Windows 11 / macOS / Linux
- Node.js: vX.X.X
- Claude Desktop: vX.X.X
- desktop-commander-v3: v1.0.0

## Test Summary

| Test | Status | Notes |
|------|--------|-------|
| MCP server startup | PASS/FAIL | |
| Tool discovery (30+ tools) | PASS/FAIL | |
| System information | PASS/FAIL | |
| File read (allowed path) | PASS/FAIL | |
| File read (blocked path - security) | PASS/FAIL | |
| Directory listing | PASS/FAIL | |
| Window management | PASS/FAIL | |
| Clipboard operations | PASS/FAIL | |
| Screenshot capture | PASS/FAIL | |
| Permission system (always-ask) | PASS/FAIL | |
| Command execution | PASS/FAIL | |
| Security validation | PASS/FAIL | |

**Overall Status:** PASS / PARTIAL / FAIL

**Pass Rate:** X/12 tests passed (XX%)

## Issues Found

1. Issue description
   - Severity: HIGH / MEDIUM / LOW
   - Steps to reproduce
   - Expected vs actual behavior

2. ...

## Performance Results

| Operation | Response Time | Status |
|-----------|--------------|--------|
| System info | XXXms | PASS/FAIL |
| File read | XXXms | PASS/FAIL |
| Window list | XXXms | PASS/FAIL |

## Recommendations

- List any recommended improvements
- Suggested configuration changes
- Performance optimization opportunities

## Conclusion

[Overall assessment of production readiness]
```

---

## Success Criteria

**Minimum for Production (80%):**

- 10/12 tests passing
- No critical security failures
- Average response time < 2s
- No crashes or hangs

**Target for Production (90%):**

- 11/12 tests passing
- All security tests passing
- Average response time < 1s
- Stable operation (no errors during testing)

**Excellent Production Readiness (100%):**

- 12/12 tests passing
- All security features verified
- Average response time < 500ms
- Zero issues found

---

## Next Steps After Testing

**If tests PASS (10+/12):**

1. Document results using template above
2. Create GitHub release with test evidence
3. Deploy to production Claude Desktop environment
4. Monitor for 24 hours
5. Mark as production-ready

**If tests PARTIAL (7-9/12):**

1. Document failing tests
2. Investigate root causes
3. Apply fixes
4. Re-test
5. Iterate until pass rate > 80%

**If tests FAIL (<7/12):**

1. Review production code for bugs
2. Check test procedures (may be incorrect)
3. Verify environment setup
4. Consult PRODUCTION_READINESS_REPORT.md
5. Apply test mock fixes (TEST_MOCK_FIXES.md)

---

**Last Updated:** 2026-01-02
**Version:** 1.0
**Status:** Ready for execution

**Estimated Time:** 15-20 minutes for full test suite
**Skill Level Required:** Basic (copy/paste commands, observe results)
**Risk Level:** Low (read-only operations, path validation enforced)
