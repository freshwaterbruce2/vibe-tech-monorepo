import { useEffect, useRef, useState } from 'react';
import { BLAST_STAGES } from '../pipeline/orchestrator';
import type { LogEntry } from '../stores/avge-store';
import { useAVGEStore } from '../stores/avge-store';
import type { StageStatus } from '../types';

const STAGE_ICONS: Record<string, string> = {
  BLUEPRINT: '📋',
  LINK: '🔗',
  ARCHITECT: '🏗️',
  STYLE: '🎨',
  TRIGGER: '🚀',
};

export function PipelineStatus() {
  const currentRun = useAVGEStore((s) => s.currentRun);
  const isRunning = useAVGEStore((s) => s.isRunning);
  const runHistory = useAVGEStore((s) => s.runHistory);
  const logEntries = useAVGEStore((s) => s.logEntries);
  const [activeTab, setActiveTab] = useState<'stages' | 'logs'>('stages');
  const logEndRef = useRef<HTMLDivElement>(null);

  const stages =
    currentRun?.stages ??
    BLAST_STAGES.map((s) => ({
      id: s.id,
      label: s.label,
      status: 'idle' as StageStatus,
    }));

  const completedCount = stages.filter((s) => s.status === 'success').length;
  const progress = stages.length > 0 ? (completedCount / stages.length) * 100 : 0;
  const statusLabel = isRunning ? 'RUNNING' : (currentRun?.status?.toUpperCase() ?? 'STANDBY');

  // Auto-scroll logs
  useEffect(() => {
    if (activeTab === 'logs') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logEntries, activeTab]);

  return (
    <div className="glass-panel panel">
      <div className="panel-header">
        <span className="panel-title">⚡ Pipeline</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', gap: '2px' }}>
            <button
              className={`tab-btn ${activeTab === 'stages' ? 'active' : ''}`}
              onClick={() => setActiveTab('stages')}
            >
              Stages
            </button>
            <button
              className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              Logs{logEntries.length > 0 ? ` (${logEntries.length})` : ''}
            </button>
          </div>
          <span
            className={`status-dot ${isRunning ? 'running' : currentRun?.status === 'completed' ? 'success' : currentRun?.status === 'failed' ? 'error' : 'idle'}`}
          />
          <span
            className="mono"
            style={{ fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="panel-body">
        {/* BLAST Stage Bar */}
        <div
          className="blast-stages"
          style={{ marginBottom: 'var(--space-3)', justifyContent: 'center' }}
        >
          {stages.map((stage, i) => (
            <div key={stage.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                className={`blast-stage ${stage.status === 'running' ? 'active' : ''} ${stage.status === 'success' ? 'complete' : ''} ${stage.status === 'error' ? 'error' : ''}`}
              >
                <span>{STAGE_ICONS[stage.id]}</span>
                <span>{stage.id.charAt(0)}</span>
              </div>
              {i < stages.length - 1 && (
                <div className={`blast-connector ${stage.status === 'success' ? 'active' : ''}`} />
              )}
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="progress-bar-track" style={{ marginBottom: 'var(--space-3)' }}>
          <div
            className={`progress-bar-fill ${isRunning ? 'running' : progress === 100 ? 'complete' : ''}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {activeTab === 'stages' ? (
          <>
            {/* Stage Detail Rows */}
            <div
              className="stagger"
              style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
            >
              {stages.map((stage) => (
                <div
                  key={stage.id}
                  className={`stage-row ${stage.status === 'running' ? 'active' : ''} ${stage.status === 'success' ? 'complete' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ fontSize: 'var(--text-sm)' }}>{STAGE_ICONS[stage.id]}</span>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                      {stage.label}
                    </span>
                  </div>
                  <span className={`status-dot ${stage.status}`} />
                </div>
              ))}
            </div>

            {/* Run History */}
            {runHistory.length > 0 && (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <div
                  style={{
                    fontSize: '9px',
                    color: 'var(--text-tertiary)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 'var(--space-1)',
                  }}
                >
                  History ({runHistory.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  {runHistory.slice(0, 5).map((run) => (
                    <div
                      key={run.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '2px var(--space-2)',
                        fontSize: '10px',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      <span className="mono">{run.id.slice(0, 8)}</span>
                      <span className={run.status === 'completed' ? 'text-success' : 'text-danger'}>
                        {run.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Pipeline Logs */
          <div className="pipeline-log" style={{ maxHeight: '100%', flex: 1 }}>
            {logEntries.length === 0 ? (
              <div
                style={{
                  color: 'var(--text-tertiary)',
                  textAlign: 'center',
                  padding: 'var(--space-4)',
                }}
              >
                No pipeline logs yet. Launch BLAST to see real-time output.
              </div>
            ) : (
              logEntries.map((entry: LogEntry, i: number) => (
                <div key={i} className="log-entry">
                  <span className="log-time">{entry.time}</span>
                  <span className={`log-level ${entry.level}`}>
                    {entry.level === 'info'
                      ? 'INF'
                      : entry.level === 'done'
                        ? 'OK'
                        : entry.level === 'warn'
                          ? 'WRN'
                          : 'ERR'}
                  </span>
                  <span className="log-msg">{entry.message}</span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
