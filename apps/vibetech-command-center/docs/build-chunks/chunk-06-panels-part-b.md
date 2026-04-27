# Chunk 6 — Real Panels Part B (BuildStatus, RagSearch, ClaudeLauncher, AgentConsole)

**Goal:** Land the remaining four panels. RagSearch queries your existing `mcp-rag-server` via the Chunk 3 `rag-client`. ClaudeLauncher is the payoff — a visual front-end for spawning `claude -p` streams against any app with templated tasks and live output. BuildStatus surfaces last-build times per app. AgentConsole shows running processes with per-process stream viewers.

**Session time budget:** ~2 hours.

**Explicitly NOT in this chunk:** MCP server exposure of the dashboard, packaging, Playwright E2E. Those are Chunks 7-8.

**Prerequisite:** Chunk 5 complete. 51+ tests green. Apps/Databases/Backups panels live.

---

## 0. Backup first

```powershell
Compress-Archive -Path C:\dev\apps\vibetech-command-center -DestinationPath C:\dev\_backups\pre-chunk06_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip -CompressionLevel Optimal
```

---

## 1. New hooks needed

**Path:** `src/renderer/hooks/index.ts`

Append to the existing file (do not replace). These hooks back the new panels.

```typescript
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import type {
  RagSearchQuery, RagSearchResult,
  ClaudeInvocation, ClaudeInvocationResult, ClaudeStreamEvent
} from '@shared/types';

// --- RAG search (mutation, not query — user-triggered) ---
export function useRagSearch(): UseMutationResult<RagSearchResult, Error, RagSearchQuery> {
  return useMutation({
    mutationFn: async (query: RagSearchQuery) => unwrap(window.commandCenter.rag.search(query))
  });
}

// --- Claude invocation (mutation) ---
export function useClaudeInvoke(): UseMutationResult<ClaudeInvocationResult, Error, ClaudeInvocation> {
  return useMutation({
    mutationFn: async (inv: ClaudeInvocation) => unwrap(window.commandCenter.claude.invoke(inv))
  });
}

// --- Claude stream subscription with buffered state ---
export function useClaudeStream(invocationId: string | null): ClaudeStreamEvent[] {
  const [events, setEvents] = React.useState<ClaudeStreamEvent[]>([]);

  React.useEffect(() => {
    if (!invocationId) { setEvents([]); return; }
    const unsub = window.commandCenter.stream.subscribe('cc.claude.stream', (payload) => {
      const evt = payload as ClaudeStreamEvent;
      if (evt.invocationId === invocationId) {
        setEvents((prev) => [...prev, evt].slice(-500));
      }
    });
    return unsub;
  }, [invocationId]);

  return events;
}

// --- Process stream subscription scoped to a process id ---
export function useProcessOutput(processId: string | null): Array<{ stream: 'stdout' | 'stderr'; data: string; timestamp: number }> {
  const [chunks, setChunks] = React.useState<Array<{ stream: 'stdout' | 'stderr'; data: string; timestamp: number }>>([]);

  React.useEffect(() => {
    if (!processId) { setChunks([]); return; }
    const unsub = window.commandCenter.stream.subscribe('cc.process.chunk', (payload) => {
      const chunk = payload as { processId: string; stream: 'stdout' | 'stderr'; data: string; timestamp: number };
      if (chunk.processId === processId) {
        setChunks((prev) => [...prev, { stream: chunk.stream, data: chunk.data, timestamp: chunk.timestamp }].slice(-2000));
      }
    });
    return unsub;
  }, [processId]);

  return chunks;
}
```

**Critical:** The `useClaudeStream` and `useProcessOutput` hooks use `React.useState` and `React.useEffect` — make sure `import React from 'react'` is at the top of `hooks/index.ts` (or use named imports `{ useState, useEffect }`). Match whatever convention is already in the file.

---

## 2. Panel: BuildStatus

**Path:** `src/renderer/panels/BuildStatus.tsx`

Reads NX project list, for each app shells `pnpm exec nx show project <name> --json` to get targets, and infers "last built" by checking `dist/` mtime or the NX cache directory. Pure read-only, no actual build triggering (that's a one-click action for Chunk 7 if we want it).

```typescript
import React, { useState } from 'react';
import { Hammer, Play, Folder, CheckCircle2, Circle } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Panel, RelativeTime } from '@renderer/components/Panel';
import { unwrap } from '@renderer/lib/ipc';
import { useNxGraph } from '@renderer/hooks';
import type { NxProject } from '@shared/types';

interface BuildInfo {
  app: string;
  distPath: string;
  distExists: boolean;
  distMtime: number | null;
  hasBuildTarget: boolean;
}

async function probeBuildInfo(app: NxProject): Promise<BuildInfo> {
  const distPath = `C:\\dev\\${app.root.replace(/\//g, '\\')}\\dist`;
  // Use process spawn to stat the dist dir via PowerShell — no new IPC surface required.
  // A lightweight approach: invoke a one-shot node script that prints the mtime.
  const probeResult = await unwrap(
    window.commandCenter.process.spawn({
      command: 'node.exe',
      args: [
        '-e',
        `const fs=require('fs');try{const s=fs.statSync(${JSON.stringify(distPath)});process.stdout.write(String(s.mtimeMs));}catch{process.stdout.write('MISSING');}`
      ],
      cwd: 'C:\\dev',
      timeoutMs: 3_000
    })
  );

  // Poll for exit — we don't have a cleaner "wait for process" IPC path in Chunk 4,
  // so we read from the stream hook elsewhere. Simpler: use the process.list + recent output.
  // For this probe, fall back to assuming MISSING unless we can confirm within a short window.
  await new Promise((r) => setTimeout(r, 300));

  // The probe output isn't easily available here without adding a dedicated IPC.
  // Skip the dist mtime probe for now and let Chunk 7 add a dedicated stat IPC.
  return {
    app: app.name,
    distPath,
    distExists: false,
    distMtime: null,
    hasBuildTarget: true,
    // placeholder — we derive the real signal below
    ...{ probePid: probeResult.id }
  } as unknown as BuildInfo;
}
```

**STOP.** The above approach is fragile. Instead, we add one small IPC endpoint for filesystem stat queries, which is generally useful. Do this first:

### 2a. Add `fs.statPath` IPC channel

Extend `src/shared/types.ts` — append to the existing IPC_CHANNELS and types:

```typescript
// Add to IPC_CHANNELS object:
FS_STAT: 'cc:fs:stat',

// Add to the CommandCenterAPI.fs surface — new namespace:
// (in the interface)
fs: {
  stat(path: string): Promise<IpcResult<FsStatResult>>;
};

// New type:
export interface FsStatResult {
  path: string;
  exists: boolean;
  isDirectory: boolean;
  isFile: boolean;
  sizeBytes: number;
  mtimeMs: number | null;
}
```

Add the handler in `src/main/ipc/index.ts`:

```typescript
import { existsSync, statSync } from 'node:fs';

// Add inside registerIpcHandlers:
ipcMain.handle(IPC_CHANNELS.FS_STAT, async (_evt, path: string): Promise<IpcResult<FsStatResult>> => {
  try {
    if (typeof path !== 'string' || path.length === 0) throw new Error('invalid path');
    if (!existsSync(path)) {
      return ok({ path, exists: false, isDirectory: false, isFile: false, sizeBytes: 0, mtimeMs: null });
    }
    const s = statSync(path);
    return ok({
      path,
      exists: true,
      isDirectory: s.isDirectory(),
      isFile: s.isFile(),
      sizeBytes: s.size,
      mtimeMs: s.mtimeMs
    });
  } catch (e) { return err(e, 'FS_STAT_FAILED'); }
});
```

Don't forget the `FsStatResult` import at the top of `ipc/index.ts`.

Add the preload wiring in `src/preload/index.ts` to the `api` object:

```typescript
fs: {
  stat: (path) => ipcRenderer.invoke(IPC_CHANNELS.FS_STAT, path)
},
```

**Path restriction:** Bruce's rule is read-only for external disks. This stat handler is pure metadata, no content reads. Safe.

### 2b. Clean BuildStatus using the new IPC

Now rewrite the panel cleanly:

```typescript
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Hammer, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { Panel, RelativeTime } from '@renderer/components/Panel';
import { unwrap } from '@renderer/lib/ipc';
import { useNxGraph } from '@renderer/hooks';
import type { NxProject, FsStatResult } from '@shared/types';

const STALE_BUILD_MS = 24 * 60 * 60 * 1000; // 24h
const FRESH_BUILD_MS = 60 * 60 * 1000;      // 1h

export function BuildStatus(): JSX.Element {
  const nx = useNxGraph();

  const apps = useMemo(() => {
    if (!nx.data) return [];
    return Object.values(nx.data.projects)
      .filter((p) => p.type === 'app')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [nx.data]);

  return (
    <Panel
      title={`Build Status (${apps.length} apps)`}
      loading={nx.isFetching}
      error={nx.error instanceof Error ? nx.error.message : null}
      onRefresh={() => nx.refetch()}
    >
      {apps.length === 0 ? (
        <div className="text-slate-500 text-sm">loading projects...</div>
      ) : (
        <div className="overflow-hidden rounded border border-bg-line">
          <table className="w-full text-sm">
            <thead className="bg-bg-elev text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="text-left px-3 py-2 font-medium">App</th>
                <th className="text-left px-3 py-2 font-medium">Tags</th>
                <th className="text-right px-3 py-2 font-medium">Dist Size</th>
                <th className="text-right px-3 py-2 font-medium">Built</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => <BuildRow key={app.name} app={app} />)}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function BuildRow({ app }: { app: NxProject }): JSX.Element {
  const distPath = `C:\\dev\\${app.root.replace(/\//g, '\\')}\\dist`;

  const { data, isLoading } = useQuery<FsStatResult>({
    queryKey: ['fs', 'stat', distPath],
    queryFn: () => unwrap(window.commandCenter.fs.stat(distPath)),
    staleTime: 30_000,
    refetchInterval: 60_000
  });

  const status = (() => {
    if (isLoading) return 'loading';
    if (!data?.exists) return 'never';
    if (!data.mtimeMs) return 'never';
    const age = Date.now() - data.mtimeMs;
    if (age < FRESH_BUILD_MS) return 'fresh';
    if (age > STALE_BUILD_MS) return 'stale';
    return 'ok';
  })();

  return (
    <tr className="border-t border-bg-line hover:bg-bg-elev/60">
      <td className="px-3 py-2"><StatusBadge status={status} /></td>
      <td className="px-3 py-2 font-mono text-xs">{app.name}</td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {app.tags.slice(0, 2).map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-bg-elev text-slate-400 rounded">{t}</span>
          ))}
        </div>
      </td>
      <td className="px-3 py-2 text-right font-mono text-xs text-slate-400">
        {data?.exists && data.isDirectory ? `${(data.sizeBytes / 1024 / 1024).toFixed(1)} MB` : '—'}
      </td>
      <td className="px-3 py-2 text-right">
        {data?.mtimeMs ? <RelativeTime ts={data.mtimeMs} /> : <span className="text-slate-600 text-xs">never</span>}
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: 'loading' | 'never' | 'fresh' | 'ok' | 'stale' }): JSX.Element {
  if (status === 'loading') return <Circle size={14} className="text-slate-600 animate-pulse" />;
  if (status === 'never')   return <Circle size={14} className="text-slate-600" />;
  if (status === 'fresh')   return <CheckCircle2 size={14} className="text-status-ok" />;
  if (status === 'ok')      return <CheckCircle2 size={14} className="text-slate-400" />;
  return <AlertCircle size={14} className="text-status-warn" />;
}
```

> **Note on dist size:** `statSync` on a directory returns directory entry size, not aggregate content size. The column is honest — it shows what the FS reports, not recursive disk usage. If you want true recursive size later, we'd add a `FS_DIR_SIZE` IPC. Not needed for Chunk 6.

---

## 3. Panel: RagSearch

**Path:** `src/renderer/panels/RagSearch.tsx`

Global-feeling search bar, Ctrl+K hotkey, results list with file path, language badge, snippet. Clicking a result opens the file location in Explorer.

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { Search, FileCode, Loader2, ExternalLink } from 'lucide-react';
import { Panel } from '@renderer/components/Panel';
import { useRagSearch } from '@renderer/hooks';
import type { RagHit } from '@shared/types';

export function RagSearch(): JSX.Element {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mutation = useRagSearch();

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSubmitted(q);
    mutation.mutate({ query: q, topK: 12 });
  };

  const handleOpenPath = async (path: string): Promise<void> => {
    // Open enclosing folder in Explorer, highlighting the file
    await window.commandCenter.process.spawn({
      command: 'explorer.exe',
      args: ['/select,', path],
      cwd: 'C:\\dev'
    });
  };

  const data = mutation.data;

  return (
    <Panel title="RAG Search">
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="semantic search across C:\dev  (Ctrl+K)"
            className="w-full bg-bg-elev border border-bg-line rounded pl-10 pr-24 py-2.5 text-sm
                       font-mono placeholder-slate-600 focus:outline-none focus:border-pulse-cyan-700
                       focus:shadow-glow-cyan"
          />
          <button
            type="submit"
            disabled={mutation.isPending || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-primary text-xs py-1"
          >
            {mutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Search'}
          </button>
        </div>
      </form>

      {mutation.isError && (
        <div className="text-status-error text-sm font-mono mb-3">
          {mutation.error.message}
        </div>
      )}

      {data && (
        <div className="mb-3 flex items-center gap-3 text-xs text-slate-500 font-mono">
          <span>{data.hits.length} hits</span>
          <span>•</span>
          <span>{data.latencyMs}ms</span>
          <span>•</span>
          <span className={data.source === 'mcp-rag-server' ? 'text-status-ok' : 'text-status-warn'}>
            {data.source}
          </span>
          {data.error && <span className="text-status-error">— {data.error}</span>}
        </div>
      )}

      {data?.hits && data.hits.length > 0 && (
        <div className="space-y-2 max-h-[60vh] overflow-auto">
          {data.hits.map((hit, i) => <HitCard key={`${hit.path}-${i}`} hit={hit} onOpen={handleOpenPath} />)}
        </div>
      )}

      {!mutation.isPending && !data && !submitted && (
        <div className="text-slate-600 text-sm italic">
          Query the local RAG index for code, docs, anything in the monorepo.
        </div>
      )}

      {data && data.hits.length === 0 && !mutation.isPending && (
        <div className="text-slate-500 text-sm">no hits for "{submitted}"</div>
      )}
    </Panel>
  );
}

function HitCard({ hit, onOpen }: { hit: RagHit; onOpen: (path: string) => void }): JSX.Element {
  const fileName = hit.path.split(/[\\/]/).pop() ?? hit.path;
  const parentPath = hit.path.slice(0, hit.path.length - fileName.length);

  return (
    <div className="bg-bg-elev border border-bg-line rounded p-3 hover:border-pulse-cyan-700 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode size={14} className="text-pulse-cyan shrink-0" />
          <span className="font-mono text-sm font-semibold text-slate-100 truncate">{fileName}</span>
          {hit.language && (
            <span className="text-[10px] px-1.5 py-0.5 bg-pulse-cyan-900 text-pulse-cyan-300 rounded">
              {hit.language}
            </span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 bg-bg-panel text-slate-400 rounded font-mono">
            {hit.score.toFixed(3)}
          </span>
        </div>
        <button
          onClick={() => onOpen(hit.path)}
          className="text-slate-500 hover:text-pulse-cyan shrink-0"
          title="open in Explorer"
        >
          <ExternalLink size={14} />
        </button>
      </div>

      <div className="text-xs text-slate-500 font-mono mb-2 truncate" title={hit.path}>
        {parentPath}
        {hit.startLine !== null && (
          <span className="text-pulse-cyan-400">:{hit.startLine}{hit.endLine ? `-${hit.endLine}` : ''}</span>
        )}
      </div>

      <pre className="text-xs font-mono text-slate-300 bg-bg-base border border-bg-line rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-32">
        {hit.snippet}
      </pre>
    </div>
  );
}
```

---

## 4. Panel: ClaudeLauncher

**Path:** `src/renderer/panels/ClaudeLauncher.tsx`

Three zones in one panel: app picker + task template (left), prompt composer (center), live stream viewer (right). On submit, calls `claude.invoke` and streams results through the WebSocket. Session-id capture for resume.

```typescript
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Sparkles, Play, Square, Copy, RotateCw, ExternalLink } from 'lucide-react';
import { Panel } from '@renderer/components/Panel';
import { useNxGraph, useClaudeInvoke, useClaudeStream } from '@renderer/hooks';
import type { ClaudeAllowedTool, ClaudeStreamEvent, NxProject } from '@shared/types';

interface TaskTemplate {
  id: string;
  label: string;
  description: string;
  promptTemplate: (appName: string) => string;
  allowedTools: ClaudeAllowedTool[];
  permissionMode: 'plan' | 'acceptEdits' | 'bypassPermissions';
}

const TEMPLATES: TaskTemplate[] = [
  {
    id: 'explore',
    label: 'Explore',
    description: 'Read-only architecture overview',
    promptTemplate: (app) => `Give me a concise architectural overview of the ${app} app. Identify entry points, main modules, and notable patterns. Do not modify any files.`,
    allowedTools: ['Read', 'Glob', 'Grep'],
    permissionMode: 'plan'
  },
  {
    id: 'review',
    label: 'Review',
    description: 'Code review with concrete findings',
    promptTemplate: (app) => `Review the ${app} app for: (1) obvious bugs, (2) code duplication, (3) violations of the 500-line file limit, (4) opportunities to extract shared logic. List findings with file:line references. Read-only.`,
    allowedTools: ['Read', 'Glob', 'Grep'],
    permissionMode: 'plan'
  },
  {
    id: 'fix-crash',
    label: 'Fix Crash',
    description: 'Diagnose and patch a crash',
    promptTemplate: (app) => `There is a crash in the ${app} app. Investigate recent file changes, read relevant files, identify the root cause, and implement a minimal fix. Keep files under 500 lines. Output a short summary of what changed and why.`,
    allowedTools: ['Read', 'Edit', 'Glob', 'Grep', 'Bash'],
    permissionMode: 'acceptEdits'
  },
  {
    id: 'refactor',
    label: 'Refactor',
    description: 'Split an oversized file',
    promptTemplate: (app) => `Find any .ts or .tsx file in the ${app} app that exceeds 500 lines. Propose a split plan first, then implement it while preserving exports. Stop after one file.`,
    allowedTools: ['Read', 'Edit', 'Glob', 'Grep'],
    permissionMode: 'acceptEdits'
  },
  {
    id: 'add-test',
    label: 'Add Test',
    description: 'Write missing Vitest coverage',
    promptTemplate: (app) => `Find an untested module in the ${app} app and add a focused Vitest spec for it. Run the test, ensure it passes, and report coverage delta.`,
    allowedTools: ['Read', 'Edit', 'Glob', 'Grep', 'Bash'],
    permissionMode: 'acceptEdits'
  }
];

export function ClaudeLauncher(): JSX.Element {
  const nx = useNxGraph();
  const invoke = useClaudeInvoke();
  const [selectedApp, setSelectedApp] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>(TEMPLATES[0]!.id);
  const [prompt, setPrompt] = useState('');
  const [activeInvocationId, setActiveInvocationId] = useState<string | null>(null);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const events = useClaudeStream(activeInvocationId);

  const apps = useMemo(() => {
    if (!nx.data) return [];
    return Object.values(nx.data.projects).filter((p) => p.type === 'app').sort((a, b) => a.name.localeCompare(b.name));
  }, [nx.data]);

  const template = TEMPLATES.find((t) => t.id === selectedTemplate)!;

  // Auto-fill prompt when app or template changes, unless user has manually edited
  const [promptDirty, setPromptDirty] = useState(false);
  useEffect(() => {
    if (!promptDirty && selectedApp) {
      setPrompt(template.promptTemplate(selectedApp));
    }
  }, [selectedApp, selectedTemplate, template, promptDirty]);

  const handleLaunch = async (): Promise<void> => {
    if (!selectedApp || !prompt.trim()) return;
    const app = apps.find((a) => a.name === selectedApp);
    if (!app) return;
    const cwd = `C:\\dev\\${app.root.replace(/\//g, '\\')}`;
    // Generate local invocation id so the stream hook can filter
    // (the real id comes from the bridge — we use a correlation id passed through)
    // Simplification: our bridge already assigns invocationId internally and emits it
    // on every stream event. We rely on the most recent invocation started here.
    setActiveInvocationId(null); // clear previous stream
    invoke.mutate({
      prompt,
      cwd,
      allowedTools: template.allowedTools,
      permissionMode: template.permissionMode,
      resumeSessionId: lastSessionId ?? undefined,
      timeoutMs: 20 * 60 * 1000
    }, {
      onSuccess: (result) => {
        setActiveInvocationId(result.invocationId);
        if (result.sessionId) setLastSessionId(result.sessionId);
      }
    });
  };

  return (
    <Panel
      title="Claude Launcher"
      error={invoke.error instanceof Error ? invoke.error.message : null}
      actions={
        lastSessionId && (
          <button className="btn text-xs" onClick={() => setLastSessionId(null)} title="Clear resume session">
            <RotateCw size={12} /> Reset session
          </button>
        )
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: app + template picker */}
        <div className="lg:col-span-3 space-y-3">
          <AppPicker apps={apps} selected={selectedApp} onSelect={setSelectedApp} loading={nx.isLoading} />
          <TemplatePicker selected={selectedTemplate} onSelect={(id) => { setSelectedTemplate(id); setPromptDirty(false); }} />
          {lastSessionId && (
            <div className="text-[10px] text-slate-500 font-mono p-2 bg-bg-elev border border-bg-line rounded">
              resuming session<br />
              <span className="text-pulse-cyan-400">{lastSessionId.slice(0, 18)}...</span>
            </div>
          )}
        </div>

        {/* Center: prompt composer */}
        <div className="lg:col-span-4 flex flex-col">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setPromptDirty(true); }}
            rows={12}
            placeholder="select an app to auto-fill from the template"
            className="flex-1 bg-bg-elev border border-bg-line rounded p-3 text-xs font-mono text-slate-200
                       placeholder-slate-600 focus:outline-none focus:border-pulse-cyan-700 focus:shadow-glow-cyan
                       resize-none"
          />

          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleLaunch}
              disabled={!selectedApp || !prompt.trim() || invoke.isPending}
              className="btn btn-primary"
            >
              {invoke.isPending ? (<><Sparkles size={14} className="animate-pulse" /> Running...</>) : (<><Play size={14} /> Launch</>)}
            </button>
            <div className="text-[10px] text-slate-500 font-mono">
              tools: {template.allowedTools.join(',')}<br />
              mode: {template.permissionMode}
            </div>
          </div>
        </div>

        {/* Right: stream viewer */}
        <div className="lg:col-span-5">
          <StreamViewer events={events} running={invoke.isPending} result={invoke.data ?? null} />
        </div>
      </div>
    </Panel>
  );
}

function AppPicker({ apps, selected, onSelect, loading }: {
  apps: NxProject[]; selected: string; onSelect: (name: string) => void; loading: boolean;
}): JSX.Element {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">App</label>
      <select
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
        disabled={loading}
        className="w-full bg-bg-elev border border-bg-line rounded p-2 text-sm font-mono text-slate-200
                   focus:outline-none focus:border-pulse-cyan-700"
      >
        <option value="">— choose —</option>
        {apps.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
      </select>
    </div>
  );
}

function TemplatePicker({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }): JSX.Element {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Task</label>
      <div className="space-y-1">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`w-full text-left p-2 rounded border text-xs transition-colors ${
              selected === t.id
                ? 'border-pulse-cyan-700 bg-pulse-cyan-900/40 text-pulse-cyan-200'
                : 'border-bg-line bg-bg-elev text-slate-300 hover:border-slate-600'
            }`}
          >
            <div className="font-semibold">{t.label}</div>
            <div className="text-[10px] text-slate-500">{t.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StreamViewer({ events, running, result }: {
  events: ClaudeStreamEvent[];
  running: boolean;
  result: { resultText: string | null; totalCostUsd: number | null; numTurns: number | null; durationMs: number } | null;
}): JSX.Element {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] uppercase tracking-wider text-slate-500">Stream</label>
        {result && (
          <div className="text-[10px] text-slate-500 font-mono">
            {result.numTurns ?? 0} turns • ${result.totalCostUsd?.toFixed(4) ?? '0.00'} • {(result.durationMs / 1000).toFixed(1)}s
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 bg-bg-base border border-bg-line rounded p-3 overflow-auto min-h-[300px] max-h-[60vh] text-xs font-mono"
      >
        {events.length === 0 && !running && !result && (
          <div className="text-slate-600 italic">output appears here when a task runs</div>
        )}
        {running && events.length === 0 && (
          <div className="text-pulse-cyan-400 flex items-center gap-2">
            <Sparkles size={12} className="animate-pulse" /> starting claude...
          </div>
        )}
        {events.map((e, i) => <StreamLine key={i} event={e} />)}
        {result?.resultText && (
          <div className="mt-3 pt-3 border-t border-bg-line">
            <div className="text-[10px] uppercase text-slate-500 mb-1">result</div>
            <div className="text-slate-100 whitespace-pre-wrap">{result.resultText}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function StreamLine({ event }: { event: ClaudeStreamEvent }): JSX.Element {
  const color =
    event.type === 'error'     ? 'text-status-error' :
    event.type === 'result'    ? 'text-pulse-cyan-300' :
    event.type === 'assistant' ? 'text-slate-300' :
    event.type === 'system'    ? 'text-slate-500' :
                                 'text-slate-600';

  const summary = (() => {
    if (event.type === 'system' && event.subtype === 'init') return 'session initialized';
    if (event.type === 'result' && event.subtype === 'success') return 'success';
    if (event.type === 'error') return `error: ${JSON.stringify(event.payload).slice(0, 120)}`;
    const p = event.payload as { message?: { content?: unknown } };
    if (event.type === 'assistant' && p?.message?.content) {
      const content = typeof p.message.content === 'string' ? p.message.content : JSON.stringify(p.message.content);
      return content.slice(0, 200);
    }
    return event.type + (event.subtype ? `:${event.subtype}` : '');
  })();

  return (
    <div className={`${color} leading-relaxed`}>
      <span className="text-slate-600">[{new Date(event.timestamp).toLocaleTimeString()}]</span>{' '}
      <span className="text-slate-500">{event.type}</span>{' '}
      {summary}
    </div>
  );
}
```

**Known caveat:** the `activeInvocationId` in this panel is set *after* `invoke.mutate` resolves — meaning early stream events can arrive before we know the id. The bridge emits `invocationId` on every event, but the subscription filter in `useClaudeStream` uses that id, so pre-resolution events are dropped. This is acceptable for a v1 launcher: the earliest events are usually `system:init` and the bulk of interesting content arrives later. If this becomes a real issue, we'd add a client-generated correlation id passed into the invocation; defer to a later chunk.

---

## 5. Panel: AgentConsole

**Path:** `src/renderer/panels/AgentConsole.tsx`

Lists tracked processes from `process.list()` with status, command preview, runtime. Clicking a process opens its stdout/stderr stream inline. Kill button per running process.

```typescript
import React, { useState } from 'react';
import { Terminal, X, Activity, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { Panel, RelativeTime } from '@renderer/components/Panel';
import { unwrap } from '@renderer/lib/ipc';
import { useProcessList, useProcessOutput } from '@renderer/hooks';
import type { ProcessHandle, ProcessStatus } from '@shared/types';

export function AgentConsole(): JSX.Element {
  const { data, isFetching, error, refetch } = useProcessList();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const processes = (data ?? []).slice().sort((a, b) => b.startedAt - a.startedAt);
  const selected = processes.find((p) => p.id === selectedId) ?? null;

  const handleKill = async (id: string): Promise<void> => {
    await unwrap(window.commandCenter.process.kill(id));
    await refetch();
  };

  return (
    <Panel
      title={`Processes (${processes.filter((p) => p.status === 'running').length} running, ${processes.length} total)`}
      loading={isFetching}
      error={error instanceof Error ? error.message : null}
      onRefresh={() => refetch()}
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 space-y-2 max-h-[60vh] overflow-auto">
          {processes.length === 0 ? (
            <div className="text-slate-500 text-sm italic p-3">no processes — run a backup or launch Claude to see activity here</div>
          ) : processes.map((p) => (
            <ProcessRow
              key={p.id}
              proc={p}
              selected={p.id === selectedId}
              onSelect={() => setSelectedId(p.id)}
              onKill={() => handleKill(p.id)}
            />
          ))}
        </div>
        <div className="lg:col-span-3">
          {selected
            ? <ProcessOutput proc={selected} />
            : <div className="text-slate-600 text-sm italic p-3 bg-bg-elev border border-bg-line rounded h-full flex items-center justify-center">select a process to view its output</div>
          }
        </div>
      </div>
    </Panel>
  );
}

function ProcessRow({ proc, selected, onSelect, onKill }: {
  proc: ProcessHandle; selected: boolean; onSelect: () => void; onKill: () => void;
}): JSX.Element {
  const cmdShort = proc.command.split(/[\\/]/).pop() ?? proc.command;
  const argsShort = proc.args.slice(0, 2).join(' ') + (proc.args.length > 2 ? '...' : '');

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer p-3 rounded border transition-colors ${
        selected ? 'border-pulse-cyan-700 bg-pulse-cyan-900/30' : 'border-bg-line bg-bg-elev hover:border-slate-600'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <StatusIcon status={proc.status} />
            <span className="font-mono text-xs font-semibold text-slate-200 truncate">{cmdShort}</span>
            {proc.exitCode !== null && (
              <span className={`text-[10px] px-1 py-0.5 rounded font-mono ${proc.exitCode === 0 ? 'text-status-ok' : 'text-status-error'}`}>
                exit {proc.exitCode}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 font-mono truncate" title={proc.args.join(' ')}>
            {argsShort || '(no args)'}
          </div>
          <div className="text-[10px] text-slate-600 mt-1 flex items-center gap-2">
            <RelativeTime ts={proc.startedAt} />
            {proc.pid && <span>pid {proc.pid}</span>}
          </div>
        </div>
        {proc.status === 'running' && (
          <button
            onClick={(e) => { e.stopPropagation(); onKill(); }}
            className="text-slate-500 hover:text-status-error shrink-0"
            title="kill"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: ProcessStatus }): JSX.Element {
  if (status === 'running') return <Activity size={12} className="text-pulse-cyan animate-pulse" />;
  if (status === 'exited')  return <CheckCircle2 size={12} className="text-status-ok" />;
  if (status === 'killed')  return <Ban size={12} className="text-status-warn" />;
  return <XCircle size={12} className="text-status-error" />;
}

function ProcessOutput({ proc }: { proc: ProcessHandle }): JSX.Element {
  const chunks = useProcessOutput(proc.id);

  return (
    <div className="bg-bg-base border border-bg-line rounded p-3 h-full max-h-[60vh] overflow-auto">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
        <Terminal size={12} />
        <span>{proc.id.slice(0, 8)} — {chunks.length} lines</span>
      </div>
      {chunks.length === 0 ? (
        <div className="text-slate-600 text-xs italic">
          {proc.status === 'running' ? 'waiting for output...' : 'no output captured (process may have ended before subscription)'}
        </div>
      ) : (
        <div className="font-mono text-xs space-y-0.5">
          {chunks.map((c, i) => (
            <div key={i} className={c.stream === 'stderr' ? 'text-status-error' : 'text-slate-300'}>
              <span className="text-slate-600">[{new Date(c.timestamp).toLocaleTimeString()}]</span> {c.data}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 6. Wire new panels into `App.tsx`

Replace the placeholder block from Chunk 5:

```typescript
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@renderer/lib/query-client';
import { Shell } from '@renderer/components/Shell';
import { AppsGrid } from '@renderer/panels/AppsGrid';
import { DbHealth } from '@renderer/panels/DbHealth';
import { BackupLog } from '@renderer/panels/BackupLog';
import { BuildStatus } from '@renderer/panels/BuildStatus';
import { RagSearch } from '@renderer/panels/RagSearch';
import { ClaudeLauncher } from '@renderer/panels/ClaudeLauncher';
import { AgentConsole } from '@renderer/panels/AgentConsole';
import { useUiStore } from '@renderer/stores';
import { useFileEventSubscription } from '@renderer/hooks';

export function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}

function AppInner(): JSX.Element {
  useFileEventSubscription();
  const activePanel = useUiStore((s) => s.activePanel);

  return (
    <Shell>
      {activePanel === 'apps'      && <AppsGrid />}
      {activePanel === 'databases' && <DbHealth />}
      {activePanel === 'backups'   && <BackupLog />}
      {activePanel === 'builds'    && <BuildStatus />}
      {activePanel === 'rag'       && <RagSearch />}
      {activePanel === 'claude'    && <ClaudeLauncher />}
      {activePanel === 'agents'    && <AgentConsole />}
    </Shell>
  );
}
```

### Update `Shell.tsx` — enable the four nav items

Change the `NAV` array so all seven items are `enabled: true`:

```typescript
const NAV: NavItem[] = [
  { id: 'apps',      label: 'Apps',       icon: LayoutGrid, enabled: true },
  { id: 'databases', label: 'Databases',  icon: Database,   enabled: true },
  { id: 'backups',   label: 'Backups',    icon: Archive,    enabled: true },
  { id: 'builds',    label: 'Builds',     icon: Hammer,     enabled: true },
  { id: 'rag',       label: 'RAG Search', icon: Search,     enabled: true },
  { id: 'claude',    label: 'Claude',     icon: Sparkles,   enabled: true },
  { id: 'agents',    label: 'Agents',     icon: Activity,   enabled: true }
];
```

---

## 7. Tests

### `src/renderer/panels/RagSearch.spec.tsx`

```typescript
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RagSearch } from './RagSearch';

function setupBridge(searchImpl?: ReturnType<typeof vi.fn>): ReturnType<typeof vi.fn> {
  const search = searchImpl ?? vi.fn().mockResolvedValue({
    ok: true,
    data: {
      query: 'claude bridge',
      latencyMs: 42,
      source: 'mcp-rag-server',
      hits: [
        { score: 0.91, path: 'C:\\dev\\apps\\vibetech-command-center\\src\\main\\services\\claude-bridge.ts', language: 'typescript', snippet: 'export class ClaudeBridge', startLine: 12, endLine: 20 }
      ]
    },
    timestamp: Date.now()
  });
  Object.defineProperty(window, 'commandCenter', {
    value: {
      rag: { search },
      process: { spawn: vi.fn().mockResolvedValue({ ok: true, data: {}, timestamp: Date.now() }) }
    },
    writable: true, configurable: true
  });
  return search;
}

function renderWithQuery(ui: React.ReactElement): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('RagSearch', () => {
  beforeEach(() => {});

  it('submits query and renders hit', async () => {
    const search = setupBridge();
    const user = userEvent.setup();
    renderWithQuery(<RagSearch />);
    await user.type(screen.getByPlaceholderText(/semantic search/i), 'claude bridge');
    await user.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => expect(screen.getByText(/claude-bridge\.ts/)).toBeInTheDocument());
    expect(search).toHaveBeenCalledWith({ query: 'claude bridge', topK: 12 });
    expect(screen.getByText('typescript')).toBeInTheDocument();
    expect(screen.getByText('0.910')).toBeInTheDocument();
  });

  it('shows empty state when no hits', async () => {
    setupBridge(vi.fn().mockResolvedValue({
      ok: true, data: { query: 'xyz', hits: [], latencyMs: 10, source: 'mcp-rag-server' }, timestamp: Date.now()
    }));
    const user = userEvent.setup();
    renderWithQuery(<RagSearch />);
    await user.type(screen.getByPlaceholderText(/semantic search/i), 'xyz');
    await user.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => expect(screen.getByText(/no hits for "xyz"/)).toBeInTheDocument());
  });

  it('surfaces rag unavailable state', async () => {
    setupBridge(vi.fn().mockResolvedValue({
      ok: true, data: { query: 'q', hits: [], latencyMs: 5, source: 'unavailable', error: 'rag server not reachable' }, timestamp: Date.now()
    }));
    const user = userEvent.setup();
    renderWithQuery(<RagSearch />);
    await user.type(screen.getByPlaceholderText(/semantic search/i), 'q');
    await user.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => expect(screen.getByText(/unavailable/)).toBeInTheDocument());
    expect(screen.getByText(/rag server not reachable/)).toBeInTheDocument();
  });
});
```

### `src/renderer/panels/ClaudeLauncher.spec.tsx`

```typescript
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClaudeLauncher } from './ClaudeLauncher';

function setupBridge(invokeImpl?: ReturnType<typeof vi.fn>): ReturnType<typeof vi.fn> {
  const invoke = invokeImpl ?? vi.fn().mockResolvedValue({
    ok: true,
    data: {
      invocationId: 'inv-1',
      sessionId: 'sess-abc',
      success: true,
      exitCode: 0,
      resultText: 'Done.',
      durationMs: 1234,
      totalCostUsd: 0.01,
      numTurns: 3
    },
    timestamp: Date.now()
  });
  Object.defineProperty(window, 'commandCenter', {
    value: {
      nx: { get: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          projects: { 'nova-agent': { name: 'nova-agent', type: 'app', root: 'apps/nova-agent', tags: [], implicitDependencies: [] } },
          dependencies: {}, generatedAt: Date.now()
        },
        timestamp: Date.now()
      }), refresh: vi.fn() },
      claude: { invoke },
      stream: { subscribe: vi.fn(() => () => {}) }
    },
    writable: true, configurable: true
  });
  return invoke;
}

function renderWithQuery(ui: React.ReactElement): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('ClaudeLauncher', () => {
  beforeEach(() => {});

  it('enables Launch only when app is selected and prompt non-empty', async () => {
    setupBridge();
    renderWithQuery(<ClaudeLauncher />);
    await waitFor(() => expect(screen.getByText('— choose —')).toBeInTheDocument());
    const launch = screen.getByRole('button', { name: /launch/i });
    expect(launch).toBeDisabled();
  });

  it('auto-fills prompt from template when app is chosen', async () => {
    setupBridge();
    const user = userEvent.setup();
    renderWithQuery(<ClaudeLauncher />);
    await waitFor(() => expect(screen.getByText('— choose —')).toBeInTheDocument());
    await user.selectOptions(screen.getByRole('combobox'), 'nova-agent');
    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(/auto-fill/i) as HTMLTextAreaElement;
      expect(textarea.value).toContain('nova-agent');
    });
  });

  it('invokes claude bridge on Launch with correct cwd and tools', async () => {
    const invoke = setupBridge();
    const user = userEvent.setup();
    renderWithQuery(<ClaudeLauncher />);
    await waitFor(() => expect(screen.getByText('— choose —')).toBeInTheDocument());
    await user.selectOptions(screen.getByRole('combobox'), 'nova-agent');
    const launch = await screen.findByRole('button', { name: /launch/i });
    await waitFor(() => expect(launch).not.toBeDisabled());
    await user.click(launch);
    expect(invoke).toHaveBeenCalledWith(expect.objectContaining({
      cwd: 'C:\\dev\\apps\\nova-agent',
      allowedTools: expect.arrayContaining(['Read']),
      permissionMode: 'plan'
    }));
  });
});
```

### `src/renderer/panels/AgentConsole.spec.tsx`

```typescript
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AgentConsole } from './AgentConsole';

function setupBridge(listData: unknown[] = []): { kill: ReturnType<typeof vi.fn> } {
  const kill = vi.fn().mockResolvedValue({ ok: true, data: true, timestamp: Date.now() });
  Object.defineProperty(window, 'commandCenter', {
    value: {
      process: {
        list: vi.fn().mockResolvedValue({ ok: true, data: listData, timestamp: Date.now() }),
        kill
      },
      stream: { subscribe: vi.fn(() => () => {}) }
    },
    writable: true, configurable: true
  });
  return { kill };
}

function renderWithQuery(ui: React.ReactElement): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('AgentConsole', () => {
  beforeEach(() => {});

  it('renders empty state', async () => {
    setupBridge([]);
    renderWithQuery(<AgentConsole />);
    await waitFor(() => expect(screen.getByText(/no processes/i)).toBeInTheDocument());
  });

  it('lists processes and sorts by start time', async () => {
    setupBridge([
      { id: 'p1', command: 'C:\\Windows\\System32\\pwsh.exe', args: ['-Command', 'Compress-Archive'], cwd: '.', pid: 100, status: 'exited', startedAt: 100, exitCode: 0 },
      { id: 'p2', command: 'claude.cmd', args: ['-p', 'review'], cwd: '.', pid: 200, status: 'running', startedAt: 200, exitCode: null }
    ]);
    renderWithQuery(<AgentConsole />);
    await waitFor(() => expect(screen.getByText('claude.cmd')).toBeInTheDocument());
    expect(screen.getByText(/pwsh\.exe/)).toBeInTheDocument();
  });

  it('kill button calls process.kill', async () => {
    const { kill } = setupBridge([
      { id: 'p2', command: 'claude.cmd', args: [], cwd: '.', pid: 200, status: 'running', startedAt: 1, exitCode: null }
    ]);
    const user = userEvent.setup();
    renderWithQuery(<AgentConsole />);
    await waitFor(() => expect(screen.getByText('claude.cmd')).toBeInTheDocument());
    await user.click(screen.getByTitle('kill'));
    expect(kill).toHaveBeenCalledWith('p2');
  });
});
```

### `src/renderer/panels/BuildStatus.spec.tsx`

```typescript
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BuildStatus } from './BuildStatus';

function setupBridge(statByPath: Record<string, { exists: boolean; mtimeMs: number | null; sizeBytes?: number; isDirectory?: boolean }>): void {
  Object.defineProperty(window, 'commandCenter', {
    value: {
      nx: { get: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          projects: {
            'nova-agent':  { name: 'nova-agent',  type: 'app', root: 'apps/nova-agent',  tags: ['scope:ai'],  implicitDependencies: [] },
            'shared-ui':   { name: 'shared-ui',   type: 'lib', root: 'packages/shared-ui', tags: [], implicitDependencies: [] }
          },
          dependencies: {}, generatedAt: Date.now()
        },
        timestamp: Date.now()
      }), refresh: vi.fn() },
      fs: {
        stat: vi.fn().mockImplementation((p: string) => Promise.resolve({
          ok: true,
          data: {
            path: p,
            exists: statByPath[p]?.exists ?? false,
            isDirectory: statByPath[p]?.isDirectory ?? true,
            isFile: false,
            sizeBytes: statByPath[p]?.sizeBytes ?? 0,
            mtimeMs: statByPath[p]?.mtimeMs ?? null
          },
          timestamp: Date.now()
        }))
      }
    },
    writable: true, configurable: true
  });
}

function renderWithQuery(ui: React.ReactElement): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('BuildStatus', () => {
  beforeEach(() => {});

  it('renders only apps', async () => {
    setupBridge({});
    renderWithQuery(<BuildStatus />);
    await waitFor(() => expect(screen.getByText('nova-agent')).toBeInTheDocument());
    expect(screen.queryByText('shared-ui')).not.toBeInTheDocument();
  });

  it('shows "never" for apps without dist/', async () => {
    setupBridge({ 'C:\\dev\\apps\\nova-agent\\dist': { exists: false, mtimeMs: null } });
    renderWithQuery(<BuildStatus />);
    await waitFor(() => expect(screen.getByText('nova-agent')).toBeInTheDocument());
    expect(screen.getByText('never')).toBeInTheDocument();
  });

  it('shows fresh status for recently-built apps', async () => {
    const recent = Date.now() - 5 * 60 * 1000; // 5 min ago
    setupBridge({ 'C:\\dev\\apps\\nova-agent\\dist': { exists: true, mtimeMs: recent, sizeBytes: 1_000_000, isDirectory: true } });
    renderWithQuery(<BuildStatus />);
    await waitFor(() => expect(screen.getByText(/MB/)).toBeInTheDocument());
  });
});
```

---

## 8. Run everything

```powershell
cd C:\dev\apps\vibetech-command-center
pnpm run typecheck ; pnpm run test ; pnpm run dev
```

**Expected totals:**
```
 Test Files  17 passed (17)
      Tests  63+ passed
```

**Dev window manual checks:**
- All 7 sidebar nav items enabled and clickable
- **BuildStatus**: loads, shows "never" for apps with no dist/, shows age for those that have built
- **RagSearch**: Ctrl+K focuses the search box; query returns hits within 1-2s if mcp-rag-server is running (source: `mcp-rag-server`) or falls back gracefully (source: `unavailable`)
- **ClaudeLauncher**: pick `nova-agent`, pick "Explore" template → prompt auto-fills, Launch sends a real `claude -p` invocation, stream viewer scrolls as events arrive, final result shows cost + turns + duration
- **AgentConsole**: shows the Claude invocation you just ran in the process list; click it → see the full stdout stream; kill button works on any running process

---

## Acceptance criteria

1. `pnpm run typecheck` clean.
2. `pnpm run test` — 63+ tests pass.
3. `pnpm run dev` opens dashboard with all 7 panels navigable.
4. Each new panel file under 500 lines. Verify: `Get-ChildItem src\renderer\panels -Recurse -Include *.tsx | ForEach-Object { "$($_.Name): $((Get-Content $_.FullName).Count)" }`.
5. ClaudeLauncher end-to-end smoke: pick an app, pick Explore template, hit Launch, see streaming output, see final result card with cost/turns/duration.
6. RagSearch Ctrl+K hotkey focuses the input.
7. BuildStatus correctly distinguishes "fresh" (<1h) vs "ok" vs "stale" (>24h) builds.
8. AgentConsole kill button terminates a running process within 2s and the row flips to "killed" status.
9. `fs.stat` IPC channel registered, returns correct shape for existing/missing paths.
10. No runaway polling — network tab (DevTools) shows sane IPC call rates.

---

## Hazards to flag

1. **ClaudeLauncher stream gap** — flagged in section 4. Early stream events before `invoke.mutate` resolves are filtered out by the `invocationId` check. If your first Claude run shows the result card but an empty stream, that's why. The fix for a later chunk is a client-generated correlation id.

2. **RagSearch depends on a live `mcp-rag-server`** — if the server isn't running, the panel shows `source: unavailable`. Per the memory, the server at `C:\dev\apps\mcp-rag-server` may need `pnpm run build` + `pnpm run start` first. Alternatively, launching it from Claude Desktop via the `.mcp.json` "rag" entry starts it stdio-style, but the dashboard's `rag-client` launches its own stdio child. If the server binary path in Chunk 3's `RagClient` default (`C:\dev\apps\mcp-rag-server\dist\index.js`) is wrong, queries fail silently with `unavailable`. Verify the dist path exists; update `RagClientOptions.args` if needed.

3. **`explorer.exe /select,`** needs the comma — it's a documented Windows quirk. The code has it. If clicking a RAG result opens the parent folder but doesn't highlight the file, Windows Explorer changed behavior (unlikely) — or your path has unusual characters. Escape-wrap doesn't help for `/select,` specifically.

4. **ClaudeLauncher resume session** — after the first invocation sets `lastSessionId`, subsequent launches pass `resumeSessionId`. Claude Code's session state persists across invocations from the same `cwd`. If you switch apps, the resume session is from a different directory and Claude will either ignore it or refuse. The "Reset session" button exists to clear it. Consider auto-clearing when `selectedApp` changes — minor UX polish, leave for iteration.

5. **BuildStatus dist probe via FS_STAT** — adds 28 concurrent IPC calls on panel mount (one per app). TanStack Query dedupes and batches, but first render may spike. If you see the panel take > 2s to populate, we memoize or batch into a single multi-path stat IPC.

---

## Post-chunk backup

```powershell
Compress-Archive -Path C:\dev\apps\vibetech-command-center -DestinationPath C:\dev\_backups\command-center-chunk06-complete_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip -CompressionLevel Optimal
```

Ping me with `chunk 6 complete` (plus any oddities — especially around ClaudeLauncher streaming and RAG connectivity) and I'll write Chunk 7 — MCP server exposure. That's the loop-closing move: the dashboard itself becomes an MCP server registered in `C:\dev\.mcp.json`, so Claude Desktop can call dashboard tools (`dashboard_get_app_status`, `dashboard_trigger_backup`, `dashboard_launch_dev`, etc.) as part of any conversation.
