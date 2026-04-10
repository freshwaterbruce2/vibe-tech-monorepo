import { useState, useCallback, useRef } from 'react';
import { TaskInput } from './components/TaskInput';
import { CostTracker } from './components/CostTracker';
import { IterationTimeline } from './components/IterationTimeline';
import { ReflectionPanel } from './components/ReflectionPanel';
import { DiffView } from './components/DiffView';
import { useReflectionStream } from './hooks/useReflectionStream';

// Dark-theme CSS vars scoped to this component tree
const REFLECTION_VARS: React.CSSProperties = {
  '--bg': '#0a0a0f',
  '--surface': '#12121a',
  '--surface-2': '#1a1a26',
  '--border': '#2a2a3a',
  '--text': '#e8e8f0',
  '--text-muted': '#8888a8',
  '--accent': '#7c6af5',
  '--accent-dim': '#3d3578',
  '--success': '#4ade80',
  '--warning': '#fbbf24',
  '--danger': '#f87171',
  '--critic-a': '#60a5fa',
  '--critic-b': '#a78bfa',
} as React.CSSProperties;

// Resizable split using pointer events — no library needed
function useSplit(initial = 50) {
  const [pct, setPct] = useState(initial);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newPct = Math.min(80, Math.max(20, ((e.clientX - rect.left) / rect.width) * 100));
    setPct(newPct);
  }, []);

  const onPointerUp = useCallback(() => { dragging.current = false; }, []);

  return { pct, containerRef, dividerProps: { onPointerDown, onPointerMove, onPointerUp } };
}

export function ReflectionApp() {
  const { state, start, cancel } = useReflectionStream();
  const { pct, containerRef, dividerProps } = useSplit(50);
  const [selectedPass, setSelectedPass] = useState(1);
  const [showDiff, setShowDiff] = useState(false);

  const { passes, status, totalCost, costLimit } = state;

  const latestPass = passes[passes.length - 1];
  const leftPass = passes.find(p => p.pass === selectedPass) ?? passes[0];
  const rightPass = latestPass?.pass !== leftPass?.pass ? latestPass : undefined;

  const handleSubmit = useCallback((task: string) => {
    setSelectedPass(1);
    setShowDiff(false);
    start(task);
  }, [start]);

  const prevPassCount = useRef(0);
  if (passes.length > prevPassCount.current) {
    prevPassCount.current = passes.length;
    setSelectedPass(passes[passes.length - 1]?.pass ?? 1);
  }

  const diffPasses = passes.filter(p => p.output.length > 0);
  const canShowDiff = diffPasses.length >= 2 && status !== 'running';

  return (
    <div style={{ ...REFLECTION_VARS, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 20px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)' }}>⟳</span>
        <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          Cross-Agent Reflection
        </h2>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>
          Kimi K2.5 generator · dual Gemini Flash Lite critics
        </span>
        {canShowDiff && (
          <button
            onClick={() => setShowDiff(v => !v)}
            style={{
              marginLeft: 'auto',
              padding: '4px 12px',
              fontSize: '12px',
              background: showDiff ? 'var(--accent-dim)' : 'var(--surface-2)',
              color: showDiff ? 'var(--accent)' : 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            {showDiff ? 'Hide diff' : 'Show diff'}
          </button>
        )}
      </header>

      <TaskInput
        onSubmit={handleSubmit}
        onCancel={cancel}
        running={status === 'running'}
      />

      <CostTracker totalCost={totalCost} costLimit={costLimit} status={status} />

      <IterationTimeline
        passes={passes}
        status={status}
        onSelectPass={setSelectedPass}
        selectedPass={selectedPass}
      />

      {status === 'error' && state.errorMessage && (
        <div style={{ padding: '8px 20px', background: '#3a1010', color: 'var(--danger)', fontSize: '13px', flexShrink: 0 }}>
          ✗ {state.errorMessage}
        </div>
      )}

      {/* Scoped scrollbar + token animation styles */}
      <style>{`
        .reflection-root ::-webkit-scrollbar { width: 6px; height: 6px; }
        .reflection-root ::-webkit-scrollbar-track { background: #0a0a0f; }
        .reflection-root ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 3px; }
        .reflection-root .token { animation: reflectionTokenIn 0.12s ease-out forwards; }
        @keyframes reflectionTokenIn { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }
        .reflection-root .divider { width: 5px; cursor: col-resize; background: #2a2a3a; transition: background 0.15s; flex-shrink: 0; }
        .reflection-root .divider:hover { background: #7c6af5; }
      `}</style>

      <div
        className="reflection-root"
        ref={containerRef}
        {...dividerProps}
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          padding: '12px',
          gap: '0',
          userSelect: 'none',
        }}
        onPointerMove={dividerProps.onPointerMove}
        onPointerUp={dividerProps.onPointerUp}
      >
        <div style={{ width: rightPass ? `${pct}%` : '100%', overflow: 'hidden', padding: '0 6px 0 0' }}>
          {leftPass
            ? <ReflectionPanel passState={leftPass} isLatest={!rightPass} />
            : <EmptyState />}
        </div>

        {rightPass && (
          <div
            className="divider"
            onPointerDown={dividerProps.onPointerDown}
            style={{ cursor: 'col-resize' }}
          />
        )}

        {rightPass && (
          <div style={{ width: `${100 - pct}%`, overflow: 'hidden', padding: '0 0 0 6px' }}>
            <ReflectionPanel passState={rightPass} isLatest />
          </div>
        )}
      </div>

      {showDiff && diffPasses.length >= 2 && (
        <DiffView
          before={diffPasses[0]!.output}
          after={diffPasses[diffPasses.length - 1]!.output}
          beforeLabel="Pass 1 (generator)"
          afterLabel={`Pass ${diffPasses[diffPasses.length - 1]!.pass} (final)`}
        />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-muted)',
      gap: '8px',
    }}>
      <span style={{ fontSize: '36px', opacity: 0.3 }}>⟳</span>
      <p style={{ margin: 0, fontSize: '13px' }}>Enter a task above to start reflecting</p>
      <p style={{ margin: 0, fontSize: '12px', opacity: 0.6 }}>Dual Gemini critics run in parallel · Kimi K2.5 generates &amp; revises</p>
    </div>
  );
}
