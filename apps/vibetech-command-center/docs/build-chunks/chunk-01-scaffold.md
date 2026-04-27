# Chunk 1 — Scaffold + Stream-JSON Probe

**Goal:** Stand up the Electron + electron-vite + React 19 + TS 5.9 skeleton for `vibetech-command-center`, register it in the Nx workspace, and de-risk the Claude Code headless bridge by running a live `stream-json` probe.

**Session time budget:** ~30-45 minutes.

**Explicitly NOT in this chunk:** services, panels, IPC wiring, tests beyond the probe, MCP server exposure. Empty window + working probe is success.

---

## 0. Backup first (run before touching anything)

```powershell
Compress-Archive -Path C:\dev\nx.json,C:\dev\pnpm-workspace.yaml,C:\dev\.mcp.json,C:\dev\package.json -DestinationPath C:\dev\_backups\pre-command-center-chunk01_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip
```

Verify the zip exists before proceeding. If it fails, stop.

---

## 1. Scaffold directory and manifest

```powershell
cd C:\dev\apps
New-Item -ItemType Directory -Path vibetech-command-center -Force
Set-Location vibetech-command-center
```

Create `C:\dev\apps\vibetech-command-center\package.json` directly (do **not** run `pnpm init` — the template it generates doesn't match our monorepo conventions):

```json
{
  "name": "@vibetech/command-center",
  "version": "0.1.0",
  "private": true,
  "description": "Vibe-Tech Command Center — monorepo dashboard, diagnostics, and Claude Code bridge",
  "main": "out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "start": "electron-vite preview",
    "typecheck": "tsc --noEmit",
    "probe:claude": "node scripts/probe-claude-stream.mjs"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4",
    "@tanstack/react-query": "^5.62.0",
    "better-sqlite3": "^11.7.0",
    "chokidar": "^4.0.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "ws": "^8.18.0",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@types/better-sqlite3": "^7.6.12",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/ws": "^8.5.13",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "electron": "^33.2.1",
    "electron-builder": "^25.1.8",
    "electron-vite": "^2.3.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.9.0",
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  }
}
```

Install:

```powershell
pnpm install
```

**Checkpoint:** `node_modules` exists, no errors, `pnpm-lock.yaml` updated. If `better-sqlite3` fails native build, we need `windows-build-tools` — stop and flag.

---

## 2. TypeScript config

Create `C:\dev\apps\vibetech-command-center\tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "isolatedModules": true,
    "types": ["node", "electron-vite/node"],
    "baseUrl": ".",
    "paths": {
      "@main/*": ["src/main/*"],
      "@preload/*": ["src/preload/*"],
      "@renderer/*": ["src/renderer/*"],
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src/**/*", "scripts/**/*"],
  "exclude": ["node_modules", "out", "dist"]
}
```

**Note:** If `C:\dev\tsconfig.base.json` does not exist or lacks the required options, drop the `extends` line and inline everything. Verify before assuming.

---

## 3. electron-vite config

Create `C:\dev\apps\vibetech-command-center\electron.vite.config.ts`:

```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@shared': resolve('src/shared')
      }
    },
    build: {
      outDir: 'out/main'
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    },
    build: {
      outDir: 'out/preload'
    }
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer'),
        '@shared': resolve('src/shared')
      }
    },
    server: {
      port: 5180
    },
    build: {
      outDir: 'out/renderer'
    }
  }
});
```

---

## 4. Source tree (minimal for Chunk 1)

Create these files. Leave services and panels as empty `index.ts` files — they're placeholders so directory structure is locked in for later chunks.

### `src/main/index.ts`

```typescript
import { app, BrowserWindow } from 'electron';
import { join } from 'path';

const isDev = !app.isPackaged;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'Vibe-Tech Command Center',
    backgroundColor: '#0A0E1A',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

### `src/preload/index.ts`

```typescript
import { contextBridge } from 'electron';

// Chunk 1: empty bridge. Chunk 4 wires real IPC.
contextBridge.exposeInMainWorld('commandCenter', {
  version: '0.1.0'
});
```

### `src/shared/types.ts`

```typescript
// Shared types between main and renderer. Populated in later chunks.
export interface CommandCenterAPI {
  version: string;
}

declare global {
  interface Window {
    commandCenter: CommandCenterAPI;
  }
}
```

### `src/renderer/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vibe-Tech Command Center</title>
    <link rel="stylesheet" href="./index.css" />
  </head>
  <body class="bg-[#0A0E1A] text-slate-100">
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

### `src/renderer/main.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### `src/renderer/App.tsx`

```typescript
import React from 'react';

export function App(): JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#00E5FF]" style={{ fontFamily: "'Space Grotesk', system-ui" }}>
          Vibe-Tech Command Center
        </h1>
        <p className="mt-4 text-slate-400">v{window.commandCenter?.version ?? '?'} — scaffolding online</p>
      </div>
    </div>
  );
}
```

### `src/renderer/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        'pulse-cyan': '#00E5FF'
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  },
  plugins: []
};
```

### `postcss.config.js`

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

### Empty placeholder files (so later chunks drop in cleanly)

Create these as empty files with a single-line comment:

```powershell
$placeholders = @(
  'src\main\services\monorepo-watcher.ts',
  'src\main\services\nx-graph.ts',
  'src\main\services\health-probe.ts',
  'src\main\services\db-metrics.ts',
  'src\main\services\backup-service.ts',
  'src\main\services\process-runner.ts',
  'src\main\services\claude-bridge.ts',
  'src\main\services\rag-client.ts',
  'src\main\ipc\index.ts',
  'src\main\mcp-server\server.ts',
  'src\renderer\panels\AppsGrid.tsx',
  'src\renderer\panels\DbHealth.tsx',
  'src\renderer\panels\BuildStatus.tsx',
  'src\renderer\panels\RagSearch.tsx',
  'src\renderer\panels\BackupLog.tsx',
  'src\renderer\panels\AgentConsole.tsx',
  'src\renderer\panels\ClaudeLauncher.tsx',
  'src\renderer\stores\index.ts',
  'src\renderer\hooks\index.ts'
)
foreach ($p in $placeholders) {
  $full = Join-Path (Get-Location) $p
  New-Item -ItemType Directory -Path (Split-Path $full) -Force | Out-Null
  '// placeholder — populated in a later chunk' | Set-Content -Path $full -Encoding UTF8
}
```

---

## 5. CLAUDE.md (app-local invariants)

Create `C:\dev\apps\vibetech-command-center\CLAUDE.md` — every Claude Code session in this app inherits it:

```markdown
# Command Center — Session Invariants

## Stack (do not suggest alternatives)
- Electron 33 + electron-vite
- React 19, TypeScript 5.9 strict
- Tailwind + shadcn/ui for components
- Zustand for state, TanStack Query for server state
- better-sqlite3 (read-only for external DBs), chokidar v4 for file watching
- Vitest unit, Playwright E2E
- pnpm only — npm corrupts the lockfile

## Rules
- Windows 11. All paths backslashed. PowerShell 7+, chain with `;`.
- No git. Manual zip backups via `Compress-Archive` before destructive changes.
- Hard cap 500 lines per .ts/.tsx file. Components 200-300 lines target.
- No Next.js. Ever.
- Read-only access to external SQLite DBs at `D:\databases\` and `D:\learning-system\`. Never write.
- Dashboard ports: UI dev 5180, IPC/WS 3210. MCP server is stdio.

## Paths
- App root: `C:\dev\apps\vibetech-command-center`
- Monorepo root: `C:\dev`
- Backups: `C:\dev\_backups\`
- External DBs: `D:\databases\*.db`, `D:\learning-system\*.db`
- LanceDB (RAG): `D:\nova-agent-data\lance-db\`

## Before any destructive change
Output the `Compress-Archive` command first, then the change. No exceptions.
```

---

## 6. Nx workspace registration

Open `C:\dev\nx.json`. Verify `vibetech-command-center` is auto-discovered by the `apps/*` glob. If `nx.json` uses an explicit `projects` array, add the entry. Do not modify anything else in `nx.json`.

Run:
```powershell
cd C:\dev
pnpm exec nx show projects | Select-String 'command-center'
```

Expected output: `@vibetech/command-center` (or `vibetech-command-center` depending on your naming convention).

---

## 7. First boot verification

```powershell
cd C:\dev\apps\vibetech-command-center
pnpm run typecheck
pnpm run dev
```

**Expected:** Electron window opens. Black/navy background. Cyan heading "Vibe-Tech Command Center". Subtitle reads `v0.1.0 — scaffolding online`. DevTools opens detached. No console errors.

If any of: native build failures, missing preload, blank window — stop and debug before moving on. Close the window to exit.

---

## 8. Claude Code stream-json probe (the de-risk)

This is the most important part of Chunk 1. We prove the bridge works in isolation before wiring a UI to it.

Create `C:\dev\apps\vibetech-command-center\scripts\probe-claude-stream.mjs`:

```javascript
// Probe: verify `claude -p --output-format stream-json` produces parseable,
// line-buffered JSONL on Windows. Exits 0 on clean parse, 1 otherwise.

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const PROMPT = 'Respond with exactly this text and nothing else: PROBE_OK';
const ALLOWED_TOOLS = 'Read';
const TIMEOUT_MS = 60_000;

console.log('[probe] spawning claude...');
const start = Date.now();

const proc = spawn(
  'claude.cmd',
  [
    '-p', PROMPT,
    '--output-format', 'stream-json',
    '--verbose',
    '--allowedTools', ALLOWED_TOOLS,
    '--permission-mode', 'bypassPermissions'
  ],
  { shell: false, windowsHide: true }
);

let sawResult = false;
let sawProbeOk = false;
let messageCount = 0;
let stderrBuf = '';

const rl = createInterface({ input: proc.stdout });

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    messageCount++;
    console.log(`[probe] msg #${messageCount} type=${msg.type} subtype=${msg.subtype ?? '-'}`);
    if (msg.type === 'result') {
      sawResult = true;
      if (typeof msg.result === 'string' && msg.result.includes('PROBE_OK')) {
        sawProbeOk = true;
      }
    }
  } catch (err) {
    console.error(`[probe] FAILED to parse line: ${line.slice(0, 200)}`);
    console.error(`[probe] error: ${err.message}`);
    proc.kill();
    process.exit(1);
  }
});

proc.stderr.on('data', (d) => { stderrBuf += d.toString(); });

const timeout = setTimeout(() => {
  console.error('[probe] TIMEOUT — killing process');
  proc.kill();
  process.exit(1);
}, TIMEOUT_MS);

proc.on('close', (code) => {
  clearTimeout(timeout);
  const elapsed = Date.now() - start;
  console.log(`\n[probe] exit=${code} elapsed=${elapsed}ms messages=${messageCount}`);
  if (stderrBuf) console.log(`[probe] stderr:\n${stderrBuf}`);

  if (code !== 0) {
    console.error('[probe] FAIL: non-zero exit');
    process.exit(1);
  }
  if (!sawResult) {
    console.error('[probe] FAIL: no result message in stream');
    process.exit(1);
  }
  if (!sawProbeOk) {
    console.error('[probe] FAIL: result did not contain PROBE_OK');
    process.exit(1);
  }
  console.log('[probe] PASS — Claude Code stream-json bridge is viable');
  process.exit(0);
});
```

Run it:

```powershell
cd C:\dev\apps\vibetech-command-center
pnpm run probe:claude
```

**Expected final line:** `[probe] PASS — Claude Code stream-json bridge is viable`

---

## Acceptance criteria (all must pass)

1. `pnpm install` completes without errors. `better-sqlite3` native module built.
2. `pnpm run typecheck` exits 0.
3. `pnpm run dev` opens an Electron window with the cyan heading. No console errors.
4. `pnpm run probe:claude` prints `[probe] PASS`.
5. Directory tree matches the structure in section 4. Placeholder files exist.
6. `CLAUDE.md` exists at app root.
7. Nx sees the project: `pnpm exec nx show projects` includes it.

---

## If something fails, report back with

- Exact error text
- Which step number it occurred at
- PowerShell transcript or screenshot

I'll adapt Chunk 2 accordingly. Do not proceed to Chunk 2 until every acceptance item is green.

---

## Post-chunk backup

```powershell
Compress-Archive -Path C:\dev\apps\vibetech-command-center -DestinationPath C:\dev\_backups\command-center-chunk01-complete_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip -CompressionLevel Optimal
```

Then ping me with `chunk 1 complete` (plus any oddities) and I'll write Chunk 2.
