# CLAUDE CODE CONFIGURATION

@.agent/rules/finisher_mode.md
@DEV_CONTEXT.md
@.antigravity/stack.md
@RUST_DEBUGGING_SETUP.md

## CLI Specific Overrides

- When asked to "think", use the Architect persona (Opus).
- When asked to "fix", use the Operator persona (Gemini).

## Debugging Configuration

**See RUST_DEBUGGING_SETUP.md for complete debugging setup instructions.**

Nova Agent uses Tauri (Rust backend + React frontend). For optimal LLDB debugging experience:

1. **Frontend Debugging**: Use Chrome DevTools via "Nova Agent (Tauri - Frontend)" launch config
2. **Rust Backend Debugging**:
   - **Recommended**: Install GNU toolchain (`x86_64-pc-windows-gnu`) for better LLDB support
   - **Current**: MSVC toolchain (`x86_64-pc-windows-msvc`) has limited LLDB support
   - **Launch Configs**:
     - "Nova Agent (Tauri - Rust Backend - LLDB)" - For GNU builds (DWARF format)
     - "Nova Agent (Tauri - Rust Backend - MSVC)" - For MSVC builds (PDB format)

**Quick Setup** (for LLDB debugging):

```powershell
rustup toolchain install stable-x86_64-pc-windows-gnu
choco install mingw
cd apps/nova-agent
pnpm tauri build --debug
```

See RUST_DEBUGGING_SETUP.md for detailed instructions.
