# Rust Debugging Setup for Nova Agent

**Last Updated:** 2026-01-19
**Priority:** RECOMMENDED for LLDB debugging
**Status:** Configuration required

---

## Issue with Current Setup

Nova Agent currently uses the **MSVC toolchain** (`x86_64-pc-windows-msvc`) which:

❌ Uses PDB debug format (less complete LLDB support)
❌ May experience LLDB crashes
❌ Limited support for decoding Rust enums in LLDB
❌ Generally worse debugging experience with CodeLLDB

## Recommended: GNU Toolchain for LLDB

The **GNU toolchain** (`x86_64-pc-windows-gnu`) provides:

✅ DWARF debug format (full LLDB support)
✅ Stable LLDB debugging (no crashes)
✅ Complete Rust enum decoding
✅ Better overall debugging experience

---

## Setup Instructions

### 1. Install GNU Toolchain

```powershell
# Install the GNU toolchain
rustup toolchain install stable-x86_64-pc-windows-gnu

# Verify installation
rustup toolchain list
# Should show: stable-x86_64-pc-windows-gnu
```

### 2. Configure Nova Agent to Use GNU Toolchain

**Option A: Project Override (Recommended)**

Create `.cargo/config.toml` in `apps/nova-agent/`:

```toml
[build]
target = "x86_64-pc-windows-gnu"

[target.x86_64-pc-windows-gnu]
rustflags = ["-C", "debuginfo=2"]  # Full debug info for LLDB
```

**Option B: Set as Default (System-wide)**

```powershell
# Make GNU the default toolchain
rustup default stable-x86_64-pc-windows-gnu
```

### 3. Install MinGW-w64 (Required for GNU Toolchain)

The GNU toolchain requires MinGW-w64 for linking:

```powershell
# Using Chocolatey (recommended)
choco install mingw

# Or download from: https://www.mingw-w64.org/downloads/
```

Verify installation:

```powershell
gcc --version
# Should output: gcc (x86_64-win32-seh-rev0, Built by MinGW-W64 project) ...
```

### 4. Rebuild Nova Agent

```powershell
cd apps/nova-agent
pnpm tauri build --debug  # Or: pnpm dev
```

The binary will be at:
- GNU: `src-tauri\target\x86_64-pc-windows-gnu\debug\nova-agent.exe`
- MSVC: `src-tauri\target\debug\nova-agent.exe` (old location)

### 5. Update VS Code Launch Configuration

The LLDB debugger configuration in `.vscode/launch.json` should point to the GNU build:

```json
{
  "name": "🖥️ Nova Agent (Tauri - Rust Backend)",
  "type": "lldb",
  "request": "launch",
  "program": "${workspaceFolder}/apps/nova-agent/src-tauri/target/x86_64-pc-windows-gnu/debug/nova-agent.exe",
  "args": [],
  "cwd": "${workspaceFolder}/apps/nova-agent",
  "sourceLanguages": ["rust"]
}
```

---

## Verification

### Test LLDB Debugging

1. Set a breakpoint in Rust code (e.g., `src-tauri/src/main.rs`)
2. Press F5 or select "Nova Agent (Tauri - Rust Backend)" in debug menu
3. LLDB should hit the breakpoint and show:
   - Full variable inspection
   - Rust enum values decoded correctly
   - No crashes during step-through

### Check Debug Info Format

```powershell
# Check what format the binary uses
file src-tauri\target\x86_64-pc-windows-gnu\debug\nova-agent.exe
# Should show: PE32+ executable ... with debug_info

# Verify DWARF sections exist
llvm-objdump --section-headers src-tauri\target\x86_64-pc-windows-gnu\debug\nova-agent.exe | Select-String "debug"
# Should show: .debug_info, .debug_abbrev, etc. (DWARF sections)
```

---

## Comparison: MSVC vs GNU Toolchain

| Feature                  | MSVC (PDB)        | GNU (DWARF)       |
|--------------------------|-------------------|-------------------|
| LLDB Support             | Incomplete        | ✅ Full           |
| Rust Enum Decoding       | Limited           | ✅ Complete       |
| Stability                | May crash         | ✅ Stable         |
| CodeLLDB Experience      | Poor              | ✅ Excellent      |
| WinDbg Support           | ✅ Full           | None              |
| Visual Studio Debugger   | ✅ Full           | None              |
| Default Toolchain        | Yes               | No (must install) |

**Verdict**: Use **GNU toolchain** for LLDB/CodeLLDB debugging, use **MSVC toolchain** for WinDbg/Visual Studio debugging.

---

## Switching Between Toolchains

You can keep both toolchains installed and switch as needed:

```powershell
# Build for LLDB debugging (DWARF)
cargo +stable-x86_64-pc-windows-gnu build

# Build for WinDbg/Visual Studio (PDB)
cargo +stable-x86_64-pc-windows-msvc build
```

Or use the `.cargo/config.toml` approach (recommended) to make GNU the default for this project.

---

## Troubleshooting

### "ld.exe: cannot find -lgcc_s"

Install MinGW-w64:

```powershell
choco install mingw
```

### "error: linker `cc` not found"

MinGW-w64's `gcc` needs to be in PATH:

```powershell
$env:PATH += ";C:\ProgramData\chocolatey\lib\mingw\tools\install\mingw64\bin"
```

### "Could not find debug info"

Ensure `debuginfo=2` in `.cargo/config.toml`:

```toml
[target.x86_64-pc-windows-gnu]
rustflags = ["-C", "debuginfo=2"]
```

### LLDB still can't decode enums

Verify you're using the GNU build:

```powershell
rustc --version --verbose
# host: x86_64-pc-windows-gnu (should be GNU, not MSVC)
```

---

## References

- [Rust Windows Debugging Guide](https://github.com/vadimcn/codelldb/blob/master/MANUAL.md#debugging-rust-on-windows)
- [CodeLLDB Documentation](https://github.com/vadimcn/codelldb/blob/master/MANUAL.md)
- [Rust Toolchain Documentation](https://rust-lang.github.io/rustup/concepts/toolchains.html)
- [MinGW-w64 Official](https://www.mingw-w64.org/)

---

**Status**: Ready to implement
**Estimated Setup Time**: 10-15 minutes
**Benefit**: Significantly better LLDB debugging experience
