import { useState, useMemo, useEffect, useRef } from 'react';
import { Sparkles, Play, RotateCw } from 'lucide-react';
import { Panel } from '@renderer/components/Panel';
import { useNxGraph, useClaudeInvoke, useClaudeStream } from '@renderer/hooks';
import { useUiStore } from '@renderer/stores';
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
    promptTemplate: (app) =>
      `Give me a concise architectural overview of the ${app} app. Identify entry points, main modules, and notable patterns. Do not modify any files.`,
    allowedTools: ['Read', 'Glob', 'Grep'],
    permissionMode: 'plan'
  },
  {
    id: 'review',
    label: 'Review',
    description: 'Code review with concrete findings',
    promptTemplate: (app) =>
      `Review the ${app} app for: (1) obvious bugs, (2) code duplication, (3) violations of the 500-line file limit, (4) opportunities to extract shared logic. List findings with file:line references. Read-only.`,
    allowedTools: ['Read', 'Glob', 'Grep'],
    permissionMode: 'plan'
  },
  {
    id: 'fix-crash',
    label: 'Fix Crash',
    description: 'Diagnose and patch a crash',
    promptTemplate: (app) =>
      `There is a crash in the ${app} app. Investigate recent file changes, read relevant files, identify the root cause, and implement a minimal fix. Keep files under 500 lines. Output a short summary of what changed and why.`,
    allowedTools: ['Read', 'Edit', 'Glob', 'Grep', 'Bash'],
    permissionMode: 'acceptEdits'
  },
  {
    id: 'refactor',
    label: 'Refactor',
    description: 'Split an oversized file',
    promptTemplate: (app) =>
      `Find any .ts or .tsx file in the ${app} app that exceeds 500 lines. Propose a split plan first, then implement it while preserving exports. Stop after one file.`,
    allowedTools: ['Read', 'Edit', 'Glob', 'Grep'],
    permissionMode: 'acceptEdits'
  },
  {
    id: 'add-test',
    label: 'Add Test',
    description: 'Write missing Vitest coverage',
    promptTemplate: (app) =>
      `Find an untested module in the ${app} app and add a focused Vitest spec for it. Run the test, ensure it passes, and report coverage delta.`,
    allowedTools: ['Read', 'Edit', 'Glob', 'Grep', 'Bash'],
    permissionMode: 'acceptEdits'
  }
];

export function ClaudeLauncher() {
  const nx = useNxGraph();
  const invoke = useClaudeInvoke();
  const completedRun = useUiStore((s) => s.claudeCompletedRun);
  const setCompletedRun = useUiStore((s) => s.setClaudeCompletedRun);
  const [selectedApp, setSelectedApp] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>(TEMPLATES[0]!.id);
  const [prompt, setPrompt] = useState('');
  const [promptDirty, setPromptDirty] = useState(false);
  const [activeInvocationId, setActiveInvocationId] = useState<string | null>(null);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const events = useClaudeStream(activeInvocationId);

  const apps = useMemo(() => {
    if (!nx.data) return [];
    return Object.values(nx.data.projects)
      .filter((p) => p.type === 'app')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [nx.data]);

  const template = TEMPLATES.find((t) => t.id === selectedTemplate)!;

  useEffect(() => {
    if (!promptDirty && selectedApp) {
      setPrompt(template.promptTemplate(selectedApp));
    }
  }, [selectedApp, selectedTemplate, template, promptDirty]);

  const handleLaunch = (): void => {
    if (!selectedApp || !prompt.trim()) return;
    const app = apps.find((a) => a.name === selectedApp);
    if (!app) return;
    const cwd = `C:\\dev\\${app.root.replace(/\//g, '\\')}`;

    // Generate ID client-side BEFORE mutate — subscription is live before first stream event arrives.
    const invocationId = crypto.randomUUID();
    setActiveInvocationId(invocationId);

    invoke.mutate({
      invocationId,
      prompt,
      cwd,
      allowedTools: template.allowedTools,
      permissionMode: template.permissionMode,
      resumeSessionId: lastSessionId ?? undefined,
      timeoutMs: 20 * 60 * 1000
    }, {
      onSuccess: (result) => {
        if (result.sessionId) setLastSessionId(result.sessionId);
        setCompletedRun({ invocationId, result });
      }
    });
  };

  return (
    <Panel
      title="Claude Launcher"
      error={invoke.error instanceof Error ? invoke.error.message : null}
      actions={
        lastSessionId ? (
          <button className="btn text-xs" onClick={() => setLastSessionId(null)} title="Clear resume session">
            <RotateCw size={12} /> Reset session
          </button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-3 space-y-3">
          <AppPicker apps={apps} selected={selectedApp} onSelect={setSelectedApp} loading={nx.isLoading} />
          <TemplatePicker
            selected={selectedTemplate}
            onSelect={(id) => { setSelectedTemplate(id); setPromptDirty(false); }}
          />
          {lastSessionId && (
            <div className="text-[10px] text-slate-500 font-mono p-2 bg-bg-elev border border-bg-line rounded">
              resuming session<br />
              <span className="text-pulse-cyan-400">{lastSessionId.slice(0, 18)}...</span>
            </div>
          )}
        </div>

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
              {invoke.isPending
                ? (<><Sparkles size={14} className="animate-pulse" /> Running...</>)
                : (<><Play size={14} /> Launch</>)
              }
            </button>
            <div className="text-[10px] text-slate-500 font-mono">
              tools: {template.allowedTools.join(',')}<br />
              mode: {template.permissionMode}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <StreamViewer
            events={events}
            running={invoke.isPending}
            result={invoke.isPending ? null : (completedRun?.result ?? null)}
          />
        </div>
      </div>
    </Panel>
  );
}

function AppPicker({ apps, selected, onSelect, loading }: {
  apps: NxProject[];
  selected: string;
  onSelect: (name: string) => void;
  loading: boolean;
}) {
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

function TemplatePicker({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Task</label>
      <div className="space-y-1">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
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
}) {
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

function StreamLine({ event }: { event: ClaudeStreamEvent }) {
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
      const content = typeof p.message.content === 'string'
        ? p.message.content
        : JSON.stringify(p.message.content);
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
