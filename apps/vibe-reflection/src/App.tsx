import { useState, useCallback, useRef } from 'react';
import { TaskInput } from './components/TaskInput.js';
import { CostTracker } from './components/CostTracker.js';
import { IterationTimeline } from './components/IterationTimeline.js';
import { ReflectionPanel } from './components/ReflectionPanel.js';
import { DiffView } from './components/DiffView.js';
import { useReflectionStream } from './hooks/useReflectionStream.js';

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

export function App() {
  const { state, start, cancel } = useReflectionStream();
  const { pct, containerRef, dividerProps } = useSplit(50);
  // null = follow latest automatically; number = user has pinned a specific pass
  const [userSelectedPass, setUserSelectedPass] = useState<number | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const { passes, status, totalCost, costLimit } = state;

  // Derive the effective selected pass: user's choice or the latest available
  const latestPass = passes[passes.length - 1];
  const selectedPass = userSelectedPass ?? latestPass?.pass ?? 1;
  const leftPass = passes.find(p => p.pass === selectedPass) ?? passes[0];
  const rightPass = latestPass?.pass !== leftPass?.pass ? latestPass : undefined;

  const handleSubmit = useCallback((task: string) => {
    setUserSelectedPass(null);
    setShowDiff(false);
    void start(task);
  }, [start]);

  const diffPasses = passes.filter(p => p.output.length > 0);
  const canShowDiff = diffPasses.length >= 2 && status !== 'running';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
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
        <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          Cross-Agent Reflection
        </h1>
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

      {/* Task input */}
      <TaskInput
        onSubmit={handleSubmit}
        onCancel={cancel}
        running={status === 'running'}
      />

      {/* Cost bar */}
      <CostTracker totalCost={totalCost} costLimit={costLimit} status={status} />

      {/* Timeline */}
      <IterationTimeline
        passes={passes}
        status={status}
        onSelectPass={setUserSelectedPass}
        selectedPass={selectedPass}
      />

      {/* Error banner */}
      {status === 'error' && state.errorMessage && (
        <div style={{ padding: '8px 20px', background: '#3a1010', color: 'var(--danger)', fontSize: '13px', flexShrink: 0 }}>
          ✗ {state.errorMessage}
        </div>
      )}

      {/* Main panels area */}
      <div
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
        {/* Left panel — selected pass */}
        <div style={{ width: rightPass ? `${pct}%` : '100%', overflow: 'hidden', padding: '0 6px 0 0' }}>
          {leftPass
            ? <ReflectionPanel passState={leftPass} isLatest={!rightPass} />
            : <EmptyState />}
        </div>

        {/* Draggable divider */}
        {rightPass && (
          <div
            className="divider"
            onPointerDown={dividerProps.onPointerDown}
            style={{ cursor: 'col-resize' }}
          />
        )}

        {/* Right panel — latest pass (when different from selected) */}
        {rightPass && (
          <div style={{ width: `${100 - pct}%`, overflow: 'hidden', padding: '0 0 0 6px' }}>
            <ReflectionPanel passState={rightPass} isLatest />
          </div>
        )}
      </div>

      {/* Diff view (post-completion) */}
      {showDiff && diffPasses.length >= 2 && (() => {
        const firstPass = diffPasses[0];
        const lastPass = diffPasses[diffPasses.length - 1];
        if (!firstPass || !lastPass) return null;
        return (
          <DiffView
            before={firstPass.output}
            after={lastPass.output}
            beforeLabel="Pass 1 (generator)"
            afterLabel={`Pass ${lastPass.pass} (final)`}
          />
        );
      })()}
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
