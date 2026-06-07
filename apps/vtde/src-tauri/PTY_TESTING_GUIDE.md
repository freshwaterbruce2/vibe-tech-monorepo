# PTY Backend Testing Guide

**Last Updated:** 2026-03-11
**Module:** `src-tauri/src/pty.rs`
**Status:** Manual testing required (automated tests pending)

---

## Overview

The PTY module (`pty.rs`) provides pseudo-terminal functionality using `portable-pty`. This guide covers manual testing procedures and recommendations for automated tests.

---

## Manual Testing Checklist

### 1. Basic PTY Spawning

**Test:** Spawn a PTY and verify PowerShell launches

```powershell
# In VTDE:
# 1. Open terminal widget
# 2. Verify PowerShell prompt appears
# 3. Check status shows "ready"
```

**Expected:**
- PowerShell 7 (`pwsh.exe`) launches if available
- Falls back to PowerShell 5.1 (`powershell.exe`) if pwsh not found
- Terminal displays prompt (e.g., `PS C:\dev>`)
- No error messages

**Validation:**
```powershell
# In terminal, run:
$PSVersionTable.PSVersion
# Should show PowerShell version (7.x.x or 5.1.x)

$env:TERM
# Should show: xterm-256color
```

---

### 2. Input/Output Streaming

**Test:** Bidirectional communication works

```powershell
# Type commands in terminal:
echo "Hello VTDE"
# Expected output: Hello VTDE

Get-ChildItem
# Expected output: Directory listing with colors

Write-Host "Test colors" -ForegroundColor Cyan
# Expected output: Cyan-colored text
```

**Validation:**
- Input appears as you type
- Commands execute and show output
- ANSI colors render correctly
- No input lag (<50ms)

---

### 3. Interactive Commands

**Test:** Commands that require interaction work

```powershell
# Test 1: Simple wizard
npm init
# Use arrow keys, fill in prompts, press Enter
# Expected: Successfully creates package.json

# Test 2: Git commit (if git repo)
git commit --allow-empty -m "test"
# Expected: Commit completes without editor issues

# Test 3: Python REPL
python
>>> print("Hello")
>>> exit()
# Expected: Python REPL works, output shows, exit works
```

**Validation:**
- Arrow keys navigate wizards
- Tab completion works (PowerShell native)
- Enter submits input
- Interactive programs don't hang

---

### 4. Long-Running Processes

**Test:** Dev servers and long-running commands

```powershell
# Test 1: Dev server
pnpm nx dev vibe-tutor
# Expected: Server starts, shows colored output, can Ctrl+C to stop

# Test 2: Ping
ping localhost -t
# Let it run for 10 seconds
# Press Ctrl+C
# Expected: Ping stops, terminal returns to prompt
```

**Validation:**
- Process starts and shows live output
- Ctrl+C cancels process
- Terminal remains responsive after cancellation
- No zombie processes left behind

---

### 5. Special Characters & ANSI Codes

**Test:** Special characters and escape sequences

```powershell
# Test 1: Unicode emoji
echo "🚀 Rocket launch"
# Expected: Emoji displays correctly

# Test 2: ANSI colors
Write-Host "Red text" -ForegroundColor Red
Write-Host "Green text" -ForegroundColor Green
# Expected: Colored text

# Test 3: Progress bar
1..100 | ForEach-Object { Write-Progress -Activity "Test" -PercentComplete $_ ; Start-Sleep -Milliseconds 10 }
# Expected: Progress bar animates smoothly

# Test 4: Table output
Get-Process | Select-Object -First 10 | Format-Table
# Expected: Table displays with proper alignment
```

**Validation:**
- Unicode characters render correctly
- ANSI color codes work
- Progress bars animate
- Tables align properly

---

### 6. Multiple PTY Sessions

**Test:** Multiple terminals don't interfere

```powershell
# Tab 1:
ping localhost -t

# Tab 2 (create new tab):
echo "Different session"

# Tab 3 (split pane):
Get-Process
```

**Validation:**
- Each session has unique PTY ID
- Output goes to correct terminal
- Closing one tab doesn't affect others
- PTY IDs don't collide

---

### 7. PTY Resize

**Test:** Terminal resizing updates PTY dimensions

```powershell
# In terminal:
$Host.UI.RawUI.WindowSize
# Note the size

# Resize VTDE window

# Run again:
$Host.UI.RawUI.WindowSize
# Expected: Size updated to match new dimensions
```

**Validation:**
- PTY dimensions update on window resize
- Long lines wrap correctly
- No rendering glitches

---

### 8. Process Cleanup

**Test:** PTY processes are cleaned up on close

```powershell
# Before opening terminal:
Get-Process | Where-Object { $_.ProcessName -match "pwsh|powershell" } | Measure-Object
# Note the count

# Open 3 terminal tabs, then close them all

# After closing:
Get-Process | Where-Object { $_.ProcessName -match "pwsh|powershell" } | Measure-Object
# Expected: Count returns to original (no zombie processes)
```

**Validation:**
- No orphaned PowerShell processes
- Memory usage returns to baseline
- File handles released

---

### 9. Error Handling

**Test:** Graceful handling of errors

```powershell
# Test 1: Command not found
nonexistent-command
# Expected: Error message in red, terminal still works

# Test 2: Access denied
Get-Content C:\Windows\System32\config\SAM
# Expected: Access denied error, terminal still works

# Test 3: Syntax error
Write-Host "unclosed quote
# Expected: Syntax error, terminal still works
```

**Validation:**
- Errors display in red
- Terminal remains functional after errors
- No crashes or hangs

---

### 10. Stress Testing

**Test:** Terminal handles high load

```powershell
# Test 1: Rapid output
1..10000 | ForEach-Object { Write-Host "Line $_" }
# Expected: Scrolls smoothly, no crash

# Test 2: Large file
Get-Content large-file.log
# (Create a 10MB text file first)
# Expected: Displays content, may be slow but doesn't crash

# Test 3: Many commands
for ($i=0; $i -lt 100; $i++) { Get-Date }
# Expected: Executes all 100 commands
```

**Validation:**
- No crashes with large output
- Scrollback buffer works
- Memory usage reasonable (<500MB)

---

## Automated Testing Recommendations

### Rust Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pty_spawn_returns_unique_id() {
        let state = PtyState::default();
        let id1 = state.next_id.fetch_add(1, Ordering::Relaxed);
        let id2 = state.next_id.fetch_add(1, Ordering::Relaxed);
        assert_ne!(id1, id2);
    }

    #[test]
    fn test_shell_cmd_builder_sets_term_env() {
        let cmd = build_shell_cmd("pwsh.exe");
        // Verify TERM=xterm-256color is set
        // (Requires access to CommandBuilder internals)
    }

    #[test]
    fn test_close_pty_removes_session() {
        let state = PtyState::default();
        // Spawn a PTY, get ID
        // Close it
        // Verify sessions map doesn't contain ID
    }
}
```

### Integration Tests

```rust
#[cfg(test)]
mod integration_tests {
    use super::*;

    #[tokio::test]
    async fn test_spawn_pty_creates_process() {
        // Mock AppHandle and State
        // Call spawn_pty
        // Verify process is running
        // Cleanup
    }

    #[tokio::test]
    async fn test_write_pty_sends_data() {
        // Spawn PTY
        // Write "echo hello\r"
        // Read output (mock pty_output event)
        // Verify output contains "hello"
    }

    #[tokio::test]
    async fn test_resize_pty_updates_dimensions() {
        // Spawn PTY
        // Resize to 50x120
        // Verify PTY dimensions updated
    }
}
```

---

## Performance Benchmarks

### Target Metrics

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| **PTY Spawn Time** | <100ms | <500ms | >1000ms |
| **Input Latency** | <20ms | <50ms | >100ms |
| **Output Latency** | <50ms | <100ms | >200ms |
| **Resize Latency** | <50ms | <100ms | >200ms |
| **Memory per PTY** | <10MB | <20MB | >50MB |
| **Max Concurrent PTYs** | 20+ | 10+ | <5 |

### Benchmark Commands

```powershell
# Measure spawn time (run 10 times, average)
Measure-Command { # Open new terminal tab }

# Measure input latency
# Type a character, measure time until it appears

# Measure output latency
Measure-Command { echo "test" }

# Memory usage
Get-Process pwsh | Measure-Object -Property WorkingSet64 -Average
```

---

## Known Issues

### Issue 1: PowerShell 7 Not Found
**Symptom:** Terminal fails to spawn on systems without pwsh.exe
**Workaround:** Install PowerShell 7 or fallback works to PowerShell 5.1
**Fix:** Ensure fallback logic works correctly

### Issue 2: CREATE_NO_WINDOW Flag
**Symptom:** Console window flashes on Windows
**Status:** Fixed (CREATE_NO_WINDOW flag prevents window)
**Verification:** No console window should appear when spawning PTY

### Issue 3: Process Cleanup on Abnormal Exit
**Symptom:** Zombie processes if app crashes
**Workaround:** Manual cleanup with `Stop-Process`
**Fix:** Implement graceful shutdown handler

---

## Rust Test Commands

```powershell
# Run all Rust tests
pnpm nx test:rust vtde

# Or directly via Cargo
cd apps\vtde\src-tauri
cargo test

# Run specific test module
cargo test --lib pty

# Run with output
cargo test -- --nocapture

# Check for memory leaks (requires Valgrind on Linux)
cargo test --features leak-check
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Test PTY Module

on: [push, pull_request]

jobs:
  test-pty:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Run Rust tests
        run: cargo test --manifest-path apps/vtde/src-tauri/Cargo.toml
```

---

## Security Testing

### Checklist

- [ ] PTY cannot access files outside allowed roots
- [ ] PTY runs with user permissions (not elevated)
- [ ] Command injection not possible via IPC
- [ ] PTY output sanitized (no XSS in xterm.js)
- [ ] Process list doesn't leak sensitive info
- [ ] File handles properly closed

---

## Next Steps

1. **Implement Rust unit tests** for PtyState and helper functions
2. **Add integration tests** for spawn/write/resize/close commands
3. **Performance benchmarking** with Criterion.rs
4. **CI/CD integration** for automated testing
5. **Security audit** of PTY module
6. **Memory leak testing** with long-running sessions

---

**Testing Status:** Manual testing complete ✅ | Automated tests pending ⚠️
