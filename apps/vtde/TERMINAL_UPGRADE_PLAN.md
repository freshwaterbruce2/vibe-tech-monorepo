# VTDE Terminal Upgrade Plan
## xterm.js + Tauri PTY Integration

**Last Updated:** 2026-03-05
**Status:** Phase 3 Implemented (Tabs, panes, and layout restore)
**Priority:** High Impact

---

## Current State

**Implemented:**
- `src/widgets/Terminal.tsx` uses **xterm.js** + **FitAddon**
- `src-tauri/src/pty.rs` uses **portable-pty** to spawn a real shell (prefers `pwsh.exe`, falls back to `powershell.exe`)
- Bidirectional streaming over Tauri IPC:
  - `spawn_pty` returns a `pty_id` (u32)
  - `write_pty`, `resize_pty`, `close_pty` take `pty_id`
  - `pty-output` event payload includes `pty_id` + `data`

**Remaining Gaps / Follow-Ups:**
- Deeper terminal polish: link handling, tab rename, richer context menu actions
- Optional pane ergonomics: drag-resize, arbitrary nested splits, pane move/merge
- Environment reliability: keep validating Tauri packaging on Windows after system changes

---

## Proposed Architecture

### Technology Stack

**Frontend:**
- **xterm.js v5.x** - Terminal emulator in the browser
- **xterm-addon-fit** - Auto-resize terminal to fit container
- **xterm-addon-web-links** - Clickable URLs in terminal
- **xterm-addon-webgl** (optional) - Hardware-accelerated rendering

**Backend (Tauri):**
- **node-pty** (via Rust bindings) - Pseudo-terminal for Windows
- **tauri-plugin-shell** (extended) - Process spawning
- OR **custom Tauri command** using `pty` crate (Rust native)

**Communication:**
- Tauri IPC (invoke/listen pattern)
- Streaming stdout/stderr via Tauri events
- Bidirectional: send input to PTY, receive output from PTY

---

## Implementation Phases

### Phase 1: Basic xterm.js Integration (Done)

**Goals:**
- Replace custom terminal UI with xterm.js
- Maintain current one-off command execution
- Add ANSI color support

**Steps:**
1. Install xterm.js dependencies:
   ```bash
   pnpm add xterm xterm-addon-fit xterm-addon-web-links
   ```

2. Update `Terminal.tsx`:
   - Import xterm.js and create Terminal instance
   - Use FitAddon for auto-sizing
   - Render xterm container
   - Keep current Command.create() backend
   - Parse ANSI colors in output

3. Test:
   - Run `pnpm nx dev vibe-shop` (colored output)
   - Run `git status` (colored output)
   - Verify colors render correctly

**Expected Result:** Same functionality, but with proper colored output.

---

### Phase 2: Tauri PTY Backend (Done, multi-session backend)

**Goals:**
- Replace one-off commands with persistent PTY session
- Support interactive commands
- Enable ctrl+c, arrow keys, tab completion

**Option A: Use Rust `pty` crate** (Recommended)

Create Tauri command to spawn PowerShell PTY:

```rust
// src-tauri/src/pty.rs
use std::process::Command;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

#[tauri::command]
async fn spawn_pty(app: AppHandle) -> Result<u32, String> {
    // Spawn PTY with PowerShell
    let mut pty = pty_process::Pty::new()?;
    let mut child = pty.spawn(Command::new("pwsh"))?;

    // Read PTY output in background thread
    std::thread::spawn(move || {
        let mut buf = [0; 1024];
        loop {
            match pty.read(&mut buf) {
                Ok(n) if n > 0 => {
                    let output = String::from_utf8_lossy(&buf[..n]);
                    app.emit("pty-output", output.to_string()).ok();
                }
                _ => break,
            }
        }
    });

    Ok(child.id())
}

#[tauri::command]
async fn write_pty(pty_id: u32, data: String) -> Result<(), String> {
    // Write to PTY stdin
    PTY_MANAGER.lock().unwrap().write(pty_id, data.as_bytes())?;
    Ok(())
}
```

**Option B: tauri-plugin-pty** (if available)

Check if community plugin exists for Tauri v2.

**Frontend Integration:**

```tsx
// Terminal.tsx
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { invoke, listen } from '@tauri-apps/api/core';

useEffect(() => {
  const term = new Terminal({
    cursorBlink: true,
    theme: vtdeTheme,
  });

  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(terminalRef.current!);
  fitAddon.fit();

  // Spawn PTY
  invoke('spawn_pty').then(ptyId => {
    setPtyId(ptyId);

    // Listen for output
    listen('pty-output', (event) => {
      term.write(event.payload);
    });

    // Send input to PTY
    term.onData(data => {
      invoke('write_pty', { ptyId, data });
    });
  });

  return () => term.dispose();
}, []);
```

---

### Phase 3: Advanced Features (4-5 hours)

**Features:**
1. **Multiple Tabs**
   - Tab bar above terminal
   - Create/close tabs
   - Switch between sessions
   - Each tab = separate PTY
   - Status badge and PTY id surfaced in the header

2. **Split Panes**
   - Horizontal/vertical splits
   - Each pane = separate PTY
   - Focus management
   - Pane close/restart/context actions

3. **Session Persistence**
   - Save terminal layout to localStorage
   - Restore tabs/panes on startup
   - Respawn PTYs into the restored layout

4. **Custom Keybindings**
   - Ctrl+Shift+C/V for copy/paste
   - Ctrl+Shift+T for new tab
   - Ctrl+Shift+W to close tab
   - Ctrl+Shift+PageUp/PageDown to switch tabs

5. **Context Menu**
   - Right-click menu
   - Copy/paste
   - Clear terminal
   - Restart/close tab

---

## File Structure

```
apps/vtde/
├── src/
│   ├── widgets/
│   │   ├── Terminal/
│   │   │   ├── Terminal.tsx          # Main component
│   │   │   ├── TerminalTab.tsx       # Tab component
│   │   │   ├── TerminalPane.tsx      # Split pane
│   │   │   ├── TerminalTheme.ts      # xterm.js theme
│   │   │   └── usePTY.ts            # PTY hook
│   │   └── ...
│   └── ...
├── src-tauri/
│   ├── src/
│   │   ├── pty.rs                   # PTY management
│   │   ├── main.rs                  # Register commands
│   │   └── ...
│   ├── Cargo.toml                   # Add pty dependencies
│   └── ...
└── TERMINAL_UPGRADE_PLAN.md (this file)
```

---

## Dependencies

### Frontend

```json
{
  "dependencies": {
    "xterm": "^5.3.0",
    "xterm-addon-fit": "^0.8.0",
    "xterm-addon-web-links": "^0.9.0",
    "xterm-addon-webgl": "^0.16.0"
  }
}
```

### Tauri (Rust)

```toml
[dependencies]
pty-process = "0.4"
tokio = { version = "1", features = ["full"] }
```

---

## xterm.js Theme (Vibe VTDE Style)

```typescript
export const vtdeTerminalTheme = {
  background: '#080c14',
  foreground: '#00f0ff',
  cursor: '#00f0ff',
  cursorAccent: '#080c14',
  selectionBackground: '#00f0ff33',
  black: '#080c14',
  red: '#ff006e',
  green: '#00f5a0',
  yellow: '#ffbe0b',
  blue: '#8338ec',
  magenta: '#ff006e',
  cyan: '#00f0ff',
  white: '#e0e0e0',
  brightBlack: '#404040',
  brightRed: '#ff3a8b',
  brightGreen: '#00ff9f',
  brightYellow: '#ffd60a',
  brightBlue: '#a367f1',
  brightMagenta: '#ff3a8b',
  brightCyan: '#00f5ff',
  brightWhite: '#ffffff',
};
```

---

## Testing Strategy

### Manual Testing

1. **Basic Commands:**
   - `ls`, `cd`, `pwd`
   - `git status`, `git log`
   - `pnpm run dev`

2. **Interactive Commands:**
   - `npm init` (wizard)
   - `git commit` (opens editor)
   - `python` (REPL)

3. **Long-Running Processes:**
   - `pnpm nx dev vibe-shop` (dev server)
   - `pnpm nx serve vibe-tutor`
   - Ctrl+C to stop

4. **ANSI Colors:**
   - Run `pnpm nx affected:graph` (colored output)
   - Run `pytest` (colored test results)

5. **Special Characters:**
   - Unicode emoji
   - Box-drawing characters
   - Progress bars (npm install)

### Automated Tests

```typescript
describe('Terminal PTY', () => {
  it('should spawn PowerShell session', async () => {
    const ptyId = await invoke('spawn_pty');
    expect(ptyId).toBeGreaterThan(0);
  });

  it('should execute command and receive output', async () => {
    const output = await runCommand('echo "Hello VTDE"');
    expect(output).toContain('Hello VTDE');
  });

  it('should handle ctrl+c cancellation', async () => {
    const ptyId = await invoke('spawn_pty');
    await invoke('write_pty', { ptyId, data: 'ping localhost\n' });
    await sleep(1000);
    await invoke('write_pty', { ptyId, data: '\x03' }); // Ctrl+C
    // Ping should stop
  });
});
```

---

## Performance Considerations

1. **Rendering:**
   - Use WebGL addon for smooth scrolling
   - Limit scrollback buffer (10,000 lines)
   - Virtual rendering for large outputs

2. **Memory:**
   - Dispose old terminal instances properly
   - Clear scrollback when hitting limit
   - Use streaming for large outputs

3. **Process Management:**
   - Kill PTY processes on window close
   - Clean up zombie processes
   - Limit max concurrent terminals (4-6)

---

## Security Considerations

1. **Command Injection:**
   - PTY is isolated from web context
   - No eval() or arbitrary code execution

2. **Process Sandboxing:**
   - PTY runs with user permissions
   - No elevated privileges

3. **Output Sanitization:**
   - xterm.js handles ANSI escapes safely
   - No XSS risk from terminal output

---

## Rollout Plan

### Week 1: Phase 1 (xterm.js UI)
- Replace custom UI with xterm.js
- Add color support
- Test with existing Command.create() backend

### Week 2: Phase 2 (PTY Integration)
- Implement Rust PTY backend
- Wire up bidirectional communication
- Test interactive commands

### Week 3: Phase 3 (Advanced Features)
- Add tab support
- Add split panes
- Session persistence

### Week 4: Polish & Testing
- Performance optimization
- Bug fixes
- Documentation

---

## Success Metrics

- ✅ Can run `npm init` interactively
- ✅ Can run `git commit` and write message in editor
- ✅ Can run `pnpm nx dev` and see live colored output
- ✅ Can press Ctrl+C to stop running processes
- ✅ Arrow keys work for command history
- ✅ Tab completion works (PowerShell native)
- ✅ Colors render correctly (ANSI escape codes)
- ✅ Progress bars animate smoothly (npm install)
- ✅ Can open multiple terminal tabs
- ✅ Can split terminal into panes
- ✅ Sessions persist across app restarts

---

## Alternative: Reuse Vibe Code Studio Terminal

**Vibe Code Studio already has a working xterm.js + node-pty terminal!**

Located at: `C:\dev\apps\vibe-code-studio\src\components\TerminalPanel.tsx`

**Pros:**
- Already implemented and tested
- Uses xterm.js + FitAddon + WebLinksAddon
- Has terminal session management
- Can be extracted to shared package

**Cons:**
- Uses node-pty (Node.js library), not Tauri-native
- Would need to adapt for Tauri IPC instead of Electron

**Recommendation:** Analyze TerminalPanel.tsx and extract reusable components.

---

## Next Steps

1. **Review Vibe Code Studio TerminalPanel** - understand implementation
2. **Prototype Phase 1** - Basic xterm.js integration (2-3 hours)
3. **Research Tauri PTY** - Check if tauri-plugin-pty exists, or use pty-process crate
4. **Create POC** - Single terminal with PTY (1 day)
5. **Expand** - Tabs, splits, persistence (1 week)

---

## Resources

- **xterm.js Docs:** https://xtermjs.org/
- **pty-process (Rust):** https://crates.io/crates/pty-process
- **Tauri IPC:** https://tauri.app/v1/guides/features/command
- **Vibe Code Studio Terminal:** `apps/vibe-code-studio/src/components/TerminalPanel.tsx`

---

**Plan Status:** COMPLETE ✅
**Ready for Implementation:** YES
**Estimated Total Time:** 12-16 hours (across 3 phases)
