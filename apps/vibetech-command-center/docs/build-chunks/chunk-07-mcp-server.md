# Chunk 7 — MCP Server Exposure

**Goal:** Expose the dashboard's service layer as an MCP server via stdio transport, registered in `C:\dev\.mcp.json` so Claude Desktop and Claude Code can both call it. Runs as a separate Node process (not inside the Electron main process) so it works whether the dashboard window is open or not.

**Session time budget:** ~1.5 hours.

**Explicitly NOT in this chunk:** Playwright E2E, packaging, tray icon. Those are Chunk 8.

**Prerequisite:** Chunk 6 complete. 62+ tests green. All 7 panels live.

---

## 0. Backup first

```powershell
Compress-Archive -Path C:\dev\apps\vibetech-command-center -DestinationPath C:\dev\_backups\pre-chunk07_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip -CompressionLevel Optimal
```

Also back up the monorepo MCP registration file specifically, since we're about to modify it:

```powershell
Copy-Item C:\dev\.mcp.json C:\dev\_backups\mcp.json.pre-chunk07_$(Get-Date -Format 'yyyyMMdd_HHmmss').bak
```

---

## 1. Architectural decision: standalone process, not in-Electron

Two ways to expose the dashboard as MCP:

**Option A — embed inside Electron main.** Cute, but the MCP server only runs when the dashboard window is open. Claude Desktop launches MCP servers on demand via stdio; it can't tell Electron to boot up first.

**Option B — standalone Node entry point.** Same `src/main/services` code, different shell. A new `src/mcp/server.ts` file imports the services directly and exposes them as MCP tools. Runs anywhere, no Electron required. This is the right choice.

The services are deliberately framework-agnostic (no Electron imports in `services/`), so Option B is straightforward. Both Electron main and the MCP server entry instantiate their own `ServiceContainer`.

**Trade-off:** two independent instances of each service. File watchers don't share state between the MCP server and the dashboard window. That's fine — each instance runs its own chokidar watcher, its own cache. No coordination needed because reads are idempotent and writes (backups) are naturally serialized via the filesystem.

---

## 2. Install MCP SDK server bits

```powershell
cd C:\dev\apps\vibetech-command-center
pnpm add @modelcontextprotocol/sdk
# Already installed as a dep for rag-client, but ensure the version supports server-side SDK exports
```

Confirm the SDK version exports `/server/index.js` and `/server/stdio.js`:

```powershell
Test-Path C:\dev\apps\vibetech-command-center\node_modules\@modelcontextprotocol\sdk\dist\esm\server\index.js
Test-Path C:\dev\apps\vibetech-command-center\node_modules\@modelcontextprotocol\sdk\dist\esm\server\stdio.js
```

Both should return `True`. If not, `pnpm add @modelcontextprotocol/sdk@latest` and re-check.

---

## 3. MCP server entry point

**Path:** `src/mcp/server.ts`

The entry Claude Desktop launches. Stdio transport, ~10 tools, shared service container.

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { createServiceContainer, disposeServiceContainer, type ServiceContainer } from '../main/service-container';
import { registerTools, type McpTool } from './tools';

const MONOREPO_ROOT = 'C:\\dev';

async function main(): Promise<void> {
  // MCP servers communicate on stdin/stdout. Anything we log to console.log would corrupt
  // the protocol stream — send diagnostics to stderr only.
  const log = (msg: string): void => { process.stderr.write(`[mcp-command-center] ${msg}\n`); };

  log('starting');

  const container: ServiceContainer = createServiceContainer({
    monorepoRoot: MONOREPO_ROOT,
    wsPort: 0  // WS not used in MCP mode
  });
  // Watcher isn't useful for MCP (no subscribers) — skip starting it to save resources.

  const tools: McpTool[] = registerTools(container);

  const server = new Server(
    { name: 'vibetech-command-center', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema
    }))
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = tools.find((t) => t.name === req.params.name);
    if (!tool) {
      return {
        content: [{ type: 'text', text: `unknown tool: ${req.params.name}` }],
        isError: true
      };
    }
    try {
      const result = await tool.handler(req.params.arguments ?? {});
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      log(`tool ${req.params.name} error: ${message}`);
      return {
        content: [{ type: 'text', text: `error: ${message}` }],
        isError: true
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log('ready');

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    log('shutting down');
    try { await server.close(); } catch {}
    try { await disposeServiceContainer(container); } catch {}
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('beforeExit', shutdown);
}

main().catch((err) => {
  process.stderr.write(`[mcp-command-center] fatal: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
```

---

## 4. Tool registry

**Path:** `src/mcp/tools.ts`

All 10 tools in one file. Each tool has a name, description, JSON Schema for inputs, and a handler closing over the service container.

```typescript
import type { ServiceContainer } from '../main/service-container';
import type {
  ClaudeAllowedTool, ServiceName, NxGraph, DbMetric,
  ProbeResult, BackupResult, BackupLogEntry, RagSearchResult
} from '@shared/types';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export function registerTools(c: ServiceContainer): McpTool[] {
  return [
    // ---------- observability ----------
    {
      name: 'dashboard_list_apps',
      description:
        'List all applications in the vibetech monorepo. Returns name, type, root path, and tags. Use this to discover what apps exist before acting on them.',
      inputSchema: {
        type: 'object',
        properties: {
          filter_tag: { type: 'string', description: 'Optional: only return apps with this tag (e.g., "scope:ai")' }
        },
        additionalProperties: false
      },
      handler: async (args): Promise<unknown> => {
        const graph: NxGraph = await c.nxGraph.getGraph();
        const apps = Object.values(graph.projects).filter((p) => p.type === 'app');
        const filtered = typeof args['filter_tag'] === 'string'
          ? apps.filter((a) => a.tags.includes(args['filter_tag'] as string))
          : apps;
        return {
          count: filtered.length,
          apps: filtered.map((a) => ({
            name: a.name,
            root: a.root,
            absolute_path: `C:\\dev\\${a.root.replace(/\//g, '\\')}`,
            tags: a.tags,
            dependencies: graph.dependencies[a.name]?.map((d) => d.target) ?? []
          }))
        };
      }
    },

    {
      name: 'dashboard_health_check',
      description:
        'Probe all known dashboard-tracked services (frontend-vite on 5173, backend-express on 5177, openrouter-proxy on 3001, memory-mcp on 3200, dashboard-ui on 5180, dashboard-ipc on 3210) and return reachability and latency for each.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      handler: async (): Promise<unknown> => {
        const results: ProbeResult[] = await c.health.probeAll();
        return {
          checked_at: Date.now(),
          reachable_count: results.filter((r) => r.reachable).length,
          total_count: results.length,
          services: results
        };
      }
    },

    {
      name: 'dashboard_db_metrics',
      description:
        'Return size, WAL size, table row counts, and journal mode for each SQLite database on D:\\ tracked by the dashboard (nova_activity, nova_shared, trading, learning). Read-only. Flags databases with WAL > 100 MB or total size > 500 MB.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Optional: return metrics for only this database' }
        },
        additionalProperties: false
      },
      handler: async (args): Promise<unknown> => {
        const all: DbMetric[] = await c.dbMetrics.collectAll();
        const filtered = typeof args['name'] === 'string'
          ? all.filter((m) => m.name === args['name'])
          : all;
        return filtered.map((m) => ({
          ...m,
          warnings: [
            m.walSizeBytes > 100 * 1024 * 1024 ? 'WAL_LARGE' : null,
            m.sizeBytes > 500 * 1024 * 1024 ? 'SIZE_LARGE' : null,
            m.error ? `ERROR: ${m.error}` : null
          ].filter((w) => w !== null)
        }));
      }
    },

    {
      name: 'dashboard_stat_path',
      description:
        'Get filesystem metadata (exists, isDirectory, isFile, sizeBytes, mtimeMs) for a given Windows path. Read-only. Use for checking whether a dist/ directory exists, when a file was last modified, etc.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute Windows path, e.g., C:\\dev\\apps\\nova-agent\\dist' }
        },
        required: ['path'],
        additionalProperties: false
      },
      handler: async (args): Promise<unknown> => {
        const path = args['path'];
        if (typeof path !== 'string' || !path) throw new Error('path required');
        const { existsSync, statSync } = await import('node:fs');
        if (!existsSync(path)) {
          return { path, exists: false, isDirectory: false, isFile: false, sizeBytes: 0, mtimeMs: null };
        }
        const s = statSync(path);
        return {
          path,
          exists: true,
          isDirectory: s.isDirectory(),
          isFile: s.isFile(),
          sizeBytes: s.size,
          mtimeMs: s.mtimeMs
        };
      }
    },

    {
      name: 'dashboard_recent_backups',
      description:
        'List recent zip backups from C:\\dev\\_backups sorted newest-first. Each entry includes the zip filename, size, and creation time. Use to check whether a recent change was backed up.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max entries to return (default 20, max 100)' }
        },
        additionalProperties: false
      },
      handler: async (args): Promise<unknown> => {
        const limit = Math.min(
          Math.max(typeof args['limit'] === 'number' ? args['limit'] : 20, 1),
          100
        );
        const entries: BackupLogEntry[] = c.backup.listRecent(limit);
        return { count: entries.length, backups: entries };
      }
    },

    // ---------- actions ----------
    {
      name: 'dashboard_create_backup',
      description:
        'Create a zip backup of a directory or file. Uses PowerShell Compress-Archive under the hood (Bruce\'s standard command). Destination defaults to C:\\dev\\_backups. Filenames are deterministic: <source>_<label>_<yyyymmdd_hhmmss>.zip. USE THIS BEFORE ANY DESTRUCTIVE CHANGE.',
      inputSchema: {
        type: 'object',
        properties: {
          source_path: { type: 'string', description: 'Absolute path to back up (file or directory)' },
          label: { type: 'string', description: 'Optional label appended to filename (sanitized to alnum+dash)' }
        },
        required: ['source_path'],
        additionalProperties: false
      },
      handler: async (args): Promise<unknown> => {
        const sourcePath = args['source_path'];
        const label = args['label'];
        if (typeof sourcePath !== 'string' || !sourcePath) throw new Error('source_path required');
        const result: BackupResult = await c.backup.createBackup({
          sourcePath,
          label: typeof label === 'string' ? label : undefined
        });
        return result;
      }
    },

    {
      name: 'dashboard_search_rag',
      description:
        'Semantic search across the C:\\dev monorepo using the local RAG index (mcp-rag-server). Returns file paths, snippets, and similarity scores. Prefer this over reading entire files when looking for a specific concept, pattern, or symbol.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Natural language query, e.g., "claude code bridge spawn logic"' },
          top_k: { type: 'number', description: 'Max hits to return (default 8)' },
          app_filter: { type: 'string', description: 'Optional: restrict results to an app name' }
        },
        required: ['query'],
        additionalProperties: false
      },
      handler: async (args): Promise<unknown> => {
        const query = args['query'];
        if (typeof query !== 'string' || !query) throw new Error('query required');
        const topK = typeof args['top_k'] === 'number' ? args['top_k'] : 8;
        const appFilter = typeof args['app_filter'] === 'string' ? args['app_filter'] : undefined;
        const result: RagSearchResult = await c.rag.search({
          query,
          topK,
          filter: appFilter ? { app: appFilter } : undefined
        });
        return result;
      }
    },

    {
      name: 'dashboard_invoke_claude',
      description:
        'Spawn Claude Code headless (claude -p) against a monorepo app and return the result. Stream events are logged to stderr for debugging but not returned. Use for scripted sub-tasks where you want Claude Code to do focused work in one app. PRECAUTION: this spawns a real Claude Code session and incurs cost.',
      inputSchema: {
        type: 'object',
        properties: {
          app_name: { type: 'string', description: 'Nx project name (must be type:app). Determines cwd.' },
          prompt: { type: 'string', description: 'The full prompt passed via -p' },
          allowed_tools: {
            type: 'array',
            items: { type: 'string', enum: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebFetch', 'WebSearch'] },
            description: 'Tools Claude Code may use. Defaults to Read,Glob,Grep (read-only).'
          },
          permission_mode: {
            type: 'string',
            enum: ['plan', 'acceptEdits', 'bypassPermissions', 'default'],
            description: 'Permission mode. "plan" is read-only (recommended default).'
          },
          timeout_ms: { type: 'number', description: 'Max runtime in ms (default 600000 = 10 min)' }
        },
        required: ['app_name', 'prompt'],
        additionalProperties: false
      },
      handler: async (args): Promise<unknown> => {
        const appName = args['app_name'];
        const prompt = args['prompt'];
        if (typeof appName !== 'string' || !appName) throw new Error('app_name required');
        if (typeof prompt !== 'string' || !prompt) throw new Error('prompt required');

        const graph = await c.nxGraph.getGraph();
        const app = graph.projects[appName];
        if (!app || app.type !== 'app') {
          throw new Error(`not an app: ${appName}`);
        }
        const cwd = `C:\\dev\\${app.root.replace(/\//g, '\\')}`;

        const allowedTools = Array.isArray(args['allowed_tools'])
          ? (args['allowed_tools'] as ClaudeAllowedTool[])
          : (['Read', 'Glob', 'Grep'] as ClaudeAllowedTool[]);
        const permissionMode = typeof args['permission_mode'] === 'string'
          ? (args['permission_mode'] as 'plan' | 'acceptEdits' | 'bypassPermissions' | 'default')
          : 'plan';
        const timeoutMs = typeof args['timeout_ms'] === 'number' ? args['timeout_ms'] : 10 * 60 * 1000;

        const result = await c.claude.invoke({
          prompt,
          cwd,
          allowedTools,
          permissionMode,
          timeoutMs
        });
        return result;
      }
    },

    {
      name: 'dashboard_list_processes',
      description:
        'List all processes the dashboard has spawned since it (or this MCP server) started. Includes running and exited processes with command, args, status, exit code, and runtime.',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['running', 'exited', 'killed', 'error'],
            description: 'Optional: filter by status'
          }
        },
        additionalProperties: false
      },
      handler: async (args): Promise<unknown> => {
        const all = c.runner.list();
        const status = args['status'];
        const filtered = typeof status === 'string' ? all.filter((p) => p.status === status) : all;
        return { count: filtered.length, processes: filtered };
      }
    },

    // ---------- meta ----------
    {
      name: 'dashboard_overview',
      description:
        'Return a one-shot situational overview of the monorepo: app count, database sizes (with any alerts), reachable services, recent backup count, processes running. Use this as the first call when Bruce asks "what\'s the state of things?"',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      handler: async (): Promise<unknown> => {
        const [graph, dbs, probes, backups] = await Promise.all([
          c.nxGraph.getGraph().catch((e: Error) => ({ error: e.message, projects: {}, dependencies: {}, generatedAt: 0 })),
          c.dbMetrics.collectAll().catch((e: Error) => [{ error: e.message }]),
          c.health.probeAll().catch((e: Error) => [{ error: e.message }]),
          Promise.resolve(c.backup.listRecent(5))
        ]);

        const projects = 'projects' in graph ? graph.projects : {};
        const apps = Object.values(projects).filter((p: unknown) => (p as { type?: string }).type === 'app');
        const libs = Object.values(projects).filter((p: unknown) => (p as { type?: string }).type === 'lib');

        const dbArray = Array.isArray(dbs) ? dbs as DbMetric[] : [];
        const dbAlerts = dbArray
          .filter((d) => !('error' in d && d.error))
          .filter((d) => d.walSizeBytes > 100 * 1024 * 1024 || d.sizeBytes > 500 * 1024 * 1024)
          .map((d) => ({ name: d.name, size_mb: (d.sizeBytes / 1024 / 1024).toFixed(1), wal_mb: (d.walSizeBytes / 1024 / 1024).toFixed(1) }));

        const probeArray = Array.isArray(probes) ? probes as ProbeResult[] : [];
        const reachable = probeArray.filter((p) => p.reachable).map((p) => p.service);
        const unreachable = probeArray.filter((p) => !p.reachable).map((p) => p.service);

        return {
          timestamp: Date.now(),
          monorepo: {
            apps_count: apps.length,
            libs_count: libs.length,
            root: 'C:\\dev'
          },
          databases: {
            tracked: dbArray.length,
            alerts: dbAlerts,
            missing: dbArray.filter((d) => 'error' in d && d.error === 'file not found').map((d) => d.name)
          },
          services: {
            reachable,
            unreachable
          },
          backups: {
            recent: backups.length,
            most_recent: backups[0]
              ? { file: backups[0].zipPath.split('\\').pop(), at: new Date(backups[0].createdAt).toISOString() }
              : null
          },
          processes: {
            running: c.runner.list().filter((p) => p.status === 'running').length,
            total: c.runner.list().length
          }
        };
      }
    }
  ];
}
```

---

## 5. Build script for the MCP entry

Add a build step that compiles `src/mcp/server.ts` to `dist/mcp/server.js`. electron-vite doesn't cover this — it only builds main/preload/renderer. We need a standalone tsc compile for this one entry point.

### Add a dedicated tsconfig for the MCP build

**Path:** `tsconfig.mcp.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist/mcp",
    "rootDir": "src",
    "declaration": false,
    "sourceMap": true,
    "target": "ES2022",
    "isolatedModules": false,
    "noEmit": false,
    "types": ["node"]
  },
  "include": [
    "src/mcp/**/*.ts",
    "src/main/service-container.ts",
    "src/main/services/**/*.ts",
    "src/shared/**/*.ts"
  ],
  "exclude": ["**/*.spec.ts", "**/*.spec.tsx", "src/main/services/**/*.spec.ts"]
}
```

> **Why Node16 module resolution here:** MCP SDK subpath exports (`@modelcontextprotocol/sdk/server/index.js` etc.) resolve cleanly under Node16's conditional exports. `Bundler` mode works for Vite builds but misbehaves for standalone tsc.

### Resolve the `@shared/*` alias for the MCP build

The tsconfig extends the root which has `@shared/*` aliases, but `tsc` doesn't rewrite imports. We have two options:

**Option A (simple)**: change `@shared/*` imports in `src/main/services/**` and `src/main/service-container.ts` to relative imports (`../../shared/types`). This also helps future packaging.

**Option B (keep aliases, use `tsc-alias`)**: add a post-build rewrite. More moving parts.

Go with **Option A**. Run this find-and-replace in PowerShell:

```powershell
cd C:\dev\apps\vibetech-command-center\src

# main/services/*.ts → ../../shared/types
Get-ChildItem -Path main\services -Filter *.ts -Recurse | ForEach-Object {
  (Get-Content $_.FullName -Raw) -replace "from '@shared/types'", "from '../../shared/types'" | Set-Content $_.FullName -Encoding UTF8
}

# main/service-container.ts → ../shared/types (one directory up from main/)
$svc = 'main\service-container.ts'
if (Test-Path $svc) {
  (Get-Content $svc -Raw) -replace "from '@shared/types'", "from '../shared/types'" | Set-Content $svc -Encoding UTF8
}

# main/ipc/index.ts → ../../shared/types
$ipc = 'main\ipc\index.ts'
if (Test-Path $ipc) {
  (Get-Content $ipc -Raw) -replace "from '@shared/types'", "from '../../shared/types'" | Set-Content $ipc -Encoding UTF8
}

# main/stream-bridge.ts and main/ws-hub.ts → ../shared/types
foreach ($f in @('main\stream-bridge.ts', 'main\ws-hub.ts')) {
  if (Test-Path $f) {
    (Get-Content $f -Raw) -replace "from '@shared/types'", "from '../shared/types'" | Set-Content $f -Encoding UTF8
  }
}
```

**Verify the Electron build still resolves these** — electron-vite picks them up fine because the aliases were only a convenience, not a requirement. Run `pnpm run typecheck` after the rewrite to confirm zero new errors.

Renderer files keep the `@shared/*` alias since Vite handles it. We only rewrote main and shared-consumers of shared.

### Add build script to `package.json`

Inside the `"scripts"` block, add:

```json
"build:mcp": "tsc -p tsconfig.mcp.json",
"mcp:start": "node dist/mcp/server.js"
```

Run the build:

```powershell
cd C:\dev\apps\vibetech-command-center
pnpm run build:mcp
```

Verify the output exists:

```powershell
Test-Path dist\mcp\server.js
Test-Path dist\mcp\tools.js
Test-Path dist\main\services\db-metrics.js
```

All three should be `True`.

---

## 6. Register the MCP server in `C:\dev\.mcp.json`

The file already contains the `rag` entry. Add a `command-center` entry alongside it. Read the existing file first:

```powershell
Get-Content C:\dev\.mcp.json
```

Add (merge with existing `mcpServers` object):

```json
{
  "mcpServers": {
    "command-center": {
      "command": "node.exe",
      "args": ["C:\\dev\\apps\\vibetech-command-center\\dist\\mcp\\server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Do not remove or modify existing entries** (`rag`, etc.). Use a proper JSON merge — PowerShell example:

```powershell
$mcpPath = 'C:\dev\.mcp.json'
$json = Get-Content $mcpPath -Raw | ConvertFrom-Json
if (-not $json.mcpServers) { $json | Add-Member -MemberType NoteProperty -Name mcpServers -Value (New-Object PSObject) }
$json.mcpServers | Add-Member -MemberType NoteProperty -Name 'command-center' -Value @{
  command = 'node.exe'
  args = @('C:\dev\apps\vibetech-command-center\dist\mcp\server.js')
  env = @{ NODE_ENV = 'production' }
} -Force
$json | ConvertTo-Json -Depth 10 | Set-Content $mcpPath -Encoding UTF8
```

Verify:

```powershell
Get-Content C:\dev\.mcp.json | ConvertFrom-Json | Select-Object -ExpandProperty mcpServers
```

Should list both `rag` (or whatever existed) and `command-center`.

---

## 7. Smoke test the MCP server directly

Before wiring Claude Desktop, verify the server boots and lists tools via stdio. Create a quick test script:

**Path:** `scripts/probe-mcp-server.mjs`

```javascript
// Smoke test: boot the MCP server, list tools, call dashboard_overview, exit.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const proc = spawn('node.exe', ['dist/mcp/server.js'], { shell: false, windowsHide: true });

let requestId = 1;
const pending = new Map();

const send = (method, params) => {
  const id = requestId++;
  const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params });
  proc.stdin.write(msg + '\n');
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout on ${method}`)), 30_000);
    pending.set(id, { resolve: (v) => { clearTimeout(t); resolve(v); }, reject });
  });
};

const rl = createInterface({ input: proc.stdout });
rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    if (typeof msg.id === 'number' && pending.has(msg.id)) {
      pending.get(msg.id).resolve(msg);
      pending.delete(msg.id);
    }
  } catch (e) {
    process.stderr.write(`parse failed: ${line}\n`);
  }
});

proc.stderr.on('data', (d) => { process.stderr.write(d); });

(async () => {
  try {
    // 1. Initialize
    const init = await send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'probe', version: '1.0.0' }
    });
    console.log('[probe] init ok:', init.result?.serverInfo?.name);

    // 2. List tools
    const list = await send('tools/list', {});
    const tools = list.result?.tools ?? [];
    console.log(`[probe] ${tools.length} tools:`, tools.map((t) => t.name).join(', '));

    if (tools.length < 10) {
      console.error(`[probe] FAIL: expected at least 10 tools, got ${tools.length}`);
      proc.kill();
      process.exit(1);
    }

    // 3. Call dashboard_overview
    const overview = await send('tools/call', {
      name: 'dashboard_overview',
      arguments: {}
    });
    const text = overview.result?.content?.[0]?.text ?? '';
    console.log('[probe] overview result length:', text.length);
    console.log('[probe] sample:', text.slice(0, 500));

    console.log('[probe] PASS');
    proc.kill();
    process.exit(0);
  } catch (e) {
    console.error('[probe] FAIL:', e.message);
    proc.kill();
    process.exit(1);
  }
})();

setTimeout(() => {
  console.error('[probe] hard timeout, killing');
  proc.kill();
  process.exit(1);
}, 60_000);
```

Add to `package.json` scripts:

```json
"probe:mcp": "node scripts/probe-mcp-server.mjs"
```

Run it:

```powershell
cd C:\dev\apps\vibetech-command-center
pnpm run probe:mcp
```

**Expected final line:** `[probe] PASS`

If it fails, the stderr output from the MCP server will tell you exactly where — missing imports, schema errors, service instantiation problems.

---

## 8. Claude Desktop integration check

After the probe passes:

1. **Fully quit Claude Desktop** (Task Manager → ensure no `Claude.exe` process remains; the MCP config is only re-read on cold start).
2. Relaunch Claude Desktop.
3. Open a new conversation.
4. Type: `use the command-center MCP to give me an overview of my monorepo`

**Expected behavior:** Claude recognizes `command-center` as an available MCP server, calls `dashboard_overview`, and returns the app count, DB alerts, reachable services, and recent backup info.

If Claude says it doesn't see the server, check:
- Claude Desktop's log (Windows: `%APPDATA%\Claude\logs\mcp*.log`)
- Common cause: `node.exe` not on PATH in the environment Claude launches MCP servers under. Fix: use absolute path to `node.exe` in `.mcp.json`:
  ```json
  "command": "C:\\Program Files\\nodejs\\node.exe"
  ```
  Verify with `(Get-Command node.exe).Source`.

---

## 9. Test the MCP server

**Path:** `src/mcp/tools.spec.ts`

Tests tool registration, schema validity, and handler behavior with a mocked service container.

```typescript
import { describe, it, expect, vi } from 'vitest';
import { registerTools } from './tools';
import type { ServiceContainer } from '../main/service-container';

function makeFakeContainer(): ServiceContainer {
  return {
    watcher: {} as ServiceContainer['watcher'],
    nxGraph: {
      getGraph: vi.fn().mockResolvedValue({
        projects: {
          'nova-agent':  { name: 'nova-agent',  type: 'app', root: 'apps/nova-agent',  tags: ['scope:ai'], implicitDependencies: [] },
          'shared-ui':   { name: 'shared-ui',   type: 'lib', root: 'packages/shared-ui', tags: [], implicitDependencies: [] }
        },
        dependencies: { 'nova-agent': [{ source: 'nova-agent', target: 'shared-ui', type: 'static' }], 'shared-ui': [] },
        generatedAt: Date.now()
      })
    } as unknown as ServiceContainer['nxGraph'],
    health: {
      probeAll: vi.fn().mockResolvedValue([
        { service: 'dashboard-ui', host: '127.0.0.1', port: 5180, reachable: true, latencyMs: 1, checkedAt: 1 }
      ]),
      probe: vi.fn()
    } as unknown as ServiceContainer['health'],
    dbMetrics: {
      collectAll: vi.fn().mockResolvedValue([
        { name: 'trading', path: 'D:\\databases\\trading.db', sizeBytes: 10_000_000, walSizeBytes: 1_000_000, pageCount: 100, pageSize: 4096, tables: [], journalMode: 'wal', lastCheckedAt: Date.now() },
        { name: 'bloated', path: 'D:\\databases\\bloated.db', sizeBytes: 600 * 1024 * 1024, walSizeBytes: 200 * 1024 * 1024, pageCount: 100, pageSize: 4096, tables: [], journalMode: 'wal', lastCheckedAt: Date.now() }
      ])
    } as unknown as ServiceContainer['dbMetrics'],
    backup: {
      createBackup: vi.fn().mockResolvedValue({ success: true, zipPath: 'C:\\dev\\_backups\\x.zip', sizeBytes: 1024, sourcePath: '.', label: 'unit', startedAt: 1, completedAt: 2, durationMs: 1 }),
      listRecent: vi.fn().mockReturnValue([{ zipPath: 'C:\\dev\\_backups\\x.zip', sizeBytes: 1024, createdAt: Date.now(), label: null }])
    } as unknown as ServiceContainer['backup'],
    runner: {
      list: vi.fn().mockReturnValue([
        { id: 'p1', command: 'node.exe', args: [], cwd: '.', pid: 1, status: 'running',  startedAt: 1, exitCode: null },
        { id: 'p2', command: 'node.exe', args: [], cwd: '.', pid: 2, status: 'exited',  startedAt: 2, exitCode: 0 }
      ]),
      spawn: vi.fn(), kill: vi.fn()
    } as unknown as ServiceContainer['runner'],
    claude: {
      invoke: vi.fn().mockResolvedValue({ invocationId: 'inv', sessionId: 's1', success: true, exitCode: 0, resultText: 'ok', durationMs: 100, totalCostUsd: 0.01, numTurns: 1 })
    } as unknown as ServiceContainer['claude'],
    rag: {
      search: vi.fn().mockResolvedValue({ query: 'test', hits: [], latencyMs: 10, source: 'unavailable' })
    } as unknown as ServiceContainer['rag'],
    wsPort: 0
  };
}

describe('MCP tool registry', () => {
  it('registers at least 10 tools', () => {
    const tools = registerTools(makeFakeContainer());
    expect(tools.length).toBeGreaterThanOrEqual(10);
  });

  it('every tool has unique name, description, and valid schema', () => {
    const tools = registerTools(makeFakeContainer());
    const names = new Set<string>();
    for (const t of tools) {
      expect(t.name).toMatch(/^dashboard_[a-z_]+$/);
      expect(names.has(t.name)).toBe(false);
      names.add(t.name);
      expect(t.description.length).toBeGreaterThan(20);
      expect(t.inputSchema.type).toBe('object');
      expect(t.inputSchema.properties).toBeDefined();
    }
  });

  it('dashboard_list_apps filters out libs', async () => {
    const tools = registerTools(makeFakeContainer());
    const t = tools.find((x) => x.name === 'dashboard_list_apps')!;
    const result = await t.handler({}) as { count: number; apps: Array<{ name: string }> };
    expect(result.count).toBe(1);
    expect(result.apps[0]?.name).toBe('nova-agent');
  });

  it('dashboard_list_apps respects filter_tag', async () => {
    const tools = registerTools(makeFakeContainer());
    const t = tools.find((x) => x.name === 'dashboard_list_apps')!;
    const r1 = await t.handler({ filter_tag: 'scope:ai' }) as { count: number };
    expect(r1.count).toBe(1);
    const r2 = await t.handler({ filter_tag: 'scope:nothing' }) as { count: number };
    expect(r2.count).toBe(0);
  });

  it('dashboard_db_metrics flags bloated databases', async () => {
    const tools = registerTools(makeFakeContainer());
    const t = tools.find((x) => x.name === 'dashboard_db_metrics')!;
    const result = await t.handler({}) as Array<{ name: string; warnings: string[] }>;
    const bloated = result.find((d) => d.name === 'bloated');
    expect(bloated?.warnings).toContain('WAL_LARGE');
    expect(bloated?.warnings).toContain('SIZE_LARGE');
    const trading = result.find((d) => d.name === 'trading');
    expect(trading?.warnings).toHaveLength(0);
  });

  it('dashboard_stat_path reports missing paths', async () => {
    const tools = registerTools(makeFakeContainer());
    const t = tools.find((x) => x.name === 'dashboard_stat_path')!;
    const result = await t.handler({ path: 'C:\\does\\not\\exist\\anywhere\\xyz' }) as { exists: boolean };
    expect(result.exists).toBe(false);
  });

  it('dashboard_invoke_claude rejects non-app names', async () => {
    const tools = registerTools(makeFakeContainer());
    const t = tools.find((x) => x.name === 'dashboard_invoke_claude')!;
    await expect(t.handler({ app_name: 'shared-ui', prompt: 'hi' })).rejects.toThrow(/not an app/);
  });

  it('dashboard_invoke_claude passes correct cwd for valid app', async () => {
    const c = makeFakeContainer();
    const tools = registerTools(c);
    const t = tools.find((x) => x.name === 'dashboard_invoke_claude')!;
    await t.handler({ app_name: 'nova-agent', prompt: 'review' });
    expect(c.claude.invoke).toHaveBeenCalledWith(expect.objectContaining({
      cwd: 'C:\\dev\\apps\\nova-agent',
      allowedTools: ['Read', 'Glob', 'Grep'],
      permissionMode: 'plan'
    }));
  });

  it('dashboard_list_processes filters by status', async () => {
    const tools = registerTools(makeFakeContainer());
    const t = tools.find((x) => x.name === 'dashboard_list_processes')!;
    const running = await t.handler({ status: 'running' }) as { count: number };
    expect(running.count).toBe(1);
    const exited = await t.handler({ status: 'exited' }) as { count: number };
    expect(exited.count).toBe(1);
    const all = await t.handler({}) as { count: number };
    expect(all.count).toBe(2);
  });

  it('dashboard_overview aggregates without throwing on partial failures', async () => {
    const c = makeFakeContainer();
    (c.nxGraph.getGraph as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('nx down'));
    const tools = registerTools(c);
    const t = tools.find((x) => x.name === 'dashboard_overview')!;
    const result = await t.handler({}) as { monorepo: { apps_count: number } };
    expect(result).toBeDefined();
    expect(result.monorepo.apps_count).toBe(0);
  });

  it('dashboard_overview flags bloated DBs in alerts', async () => {
    const tools = registerTools(makeFakeContainer());
    const t = tools.find((x) => x.name === 'dashboard_overview')!;
    const result = await t.handler({}) as { databases: { alerts: Array<{ name: string }> } };
    expect(result.databases.alerts.some((a) => a.name === 'bloated')).toBe(true);
  });
});
```

---

## 10. Run everything

```powershell
cd C:\dev\apps\vibetech-command-center
pnpm run typecheck
pnpm run test
pnpm run build:mcp
pnpm run probe:mcp
```

**Expected:**
- typecheck clean
- tests: 73+ passed (62 prior + ~11 new)
- build:mcp produces `dist/mcp/server.js`
- probe:mcp prints `[probe] PASS`

Then manually verify Claude Desktop integration per section 8.

---

## Acceptance criteria

1. `pnpm run typecheck` clean after the `@shared/*` → relative import rewrite.
2. `pnpm run test` — all tests pass.
3. `pnpm run build:mcp` produces `dist/mcp/server.js` and `dist/main/services/*.js`.
4. `pnpm run probe:mcp` prints `[probe] PASS` with at least 10 tools listed.
5. `C:\dev\.mcp.json` contains a `command-center` entry alongside existing entries; no existing entries were removed.
6. Claude Desktop, after a full restart, can call `dashboard_overview` and returns a populated summary.
7. `src/mcp/tools.ts` and `src/mcp/server.ts` each under 500 lines.
8. The Electron app (`pnpm run dev`) still launches cleanly — no regressions from the import rewrite.
9. All 10 tools have `inputSchema` with `additionalProperties: false` (strict schemas).

---

## Hazards to flag

1. **MCP SDK subpath resolution under Node16** — the `@modelcontextprotocol/sdk/server/index.js` imports need the SDK's `exports` field to resolve correctly. If TS errors with "Cannot find module", check the installed version's `package.json` for the `exports` map. Fallback: import from the full internal path. Report the exact error and the SDK version (`pnpm list @modelcontextprotocol/sdk`).

2. **Claude Desktop cold-start requirement** — MCP servers defined in `.mcp.json` are launched on app startup. Reloading the conversation, or even opening a new chat, does not re-read the config. Fully quit Claude Desktop (check Task Manager) before relaunching.

3. **`node.exe` not on PATH under Claude's launcher** — Claude Desktop may launch MCP servers in an environment missing PATH entries. If the probe script works but Claude Desktop can't reach the server, switch the `.mcp.json` `"command"` to an absolute `node.exe` path. Memory note: you previously fixed this same issue for other MCP servers by hardcoding absolute paths. Apply the same fix here.

4. **Service container instantiation cost on every MCP call** — the MCP server boots the container once at process start, but Claude Desktop re-launches the server process on each cold start. If boot is slow (nx graph takes 3-5s on cold cache), the first tool call Claude Desktop makes after startup will feel laggy. That's acceptable — subsequent calls reuse the in-memory cache.

5. **Filesystem watcher not started in MCP mode** — by design; no subscribers. Don't be surprised if `dashboard_overview` doesn't mention recent file edits. If you want that, add a short-lived watcher invocation that samples for 2s. Defer to later iteration.

6. **`dashboard_invoke_claude` is real money** — this tool spawns actual `claude.cmd -p` sessions. If Claude Desktop calls it mid-conversation (e.g., to "help debug my app"), it costs real tokens. The description warns about this. Consider whether you want a confirmation-required variant or a restrictive `allowedTools` default. Current default is read-only tools + `plan` mode, which is the safest posture.

---

## Post-chunk backup

```powershell
Compress-Archive -Path C:\dev\apps\vibetech-command-center -DestinationPath C:\dev\_backups\command-center-chunk07-complete_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip -CompressionLevel Optimal
Copy-Item C:\dev\.mcp.json C:\dev\_backups\mcp.json.chunk07-complete_$(Get-Date -Format 'yyyyMMdd_HHmmss').bak
```

Ping me with `chunk 7 complete` (plus any Claude Desktop integration oddities) and I'll write Chunk 8 — Playwright E2E tests plus electron-builder packaging to a single `.exe` you pin to the taskbar. That's the ship chunk. After Chunk 8, the Command Center is a daily-driver app with both a UI and an MCP surface, fully tested end-to-end, installed as a native Windows app.
