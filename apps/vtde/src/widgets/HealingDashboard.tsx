import { useCallback, useEffect, useState } from 'react';
import {
  getHealingLogs,
  getHealingSummary,
  getSelfHealingRunStatus,
  startSelfHealingRun,
} from '../lib/tauri-bridge';
import type { HealingCycle, HealingSummary, SelfHealingRunStatus } from '../types/vtde';
import { Sparkline } from './Sparkline';

const DASHBOARD_POLL_INTERVAL_MS = 10_000;
type SelfHealingLoopName = 'lint' | 'typecheck' | 'dependencies' | 'staleness';

const LOOP_OPTIONS: Array<{ id: SelfHealingLoopName; label: string }> = [
  { id: 'lint', label: 'Lint' },
  { id: 'typecheck', label: 'Typecheck' },
  { id: 'dependencies', label: 'Dependencies' },
  { id: 'staleness', label: 'Staleness' },
];

function formatDate(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function projectName(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || path;
}

const TYPE_COLORS: Record<string, string> = {
  lint_failure: '#f59e0b',
  stale_cache: '#8b5cf6',
  missing_dependency: '#ef4444',
  type_error: '#ec4899',
  lock_drift: '#06b6d4',
};

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="heal-stat-card" style={{ borderTopColor: accent }}>
      <span className="heal-stat-value">{value}</span>
      <span className="heal-stat-label">{label}</span>
    </div>
  );
}

function CycleRow({ cycle }: { cycle: HealingCycle }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="heal-cycle-row" onClick={() => setExpanded(!expanded)}>
      <div className="heal-cycle-header">
        <span className="heal-cycle-time">{formatDate(cycle.timestamp)}</span>
        <span className={`heal-mode-badge ${cycle.dry_run ? 'dry' : 'live'}`}>
          {cycle.dry_run ? '🔒 Dry Run' : '⚡ Live'}
        </span>
        <span className="heal-cycle-metric">{cycle.fixable_issues} issues</span>
        <span className="heal-cycle-metric">{cycle.fixes_attempted} fixed</span>
        <span className="heal-cycle-elapsed">{cycle.elapsed_seconds.toFixed(0)}s</span>
        <span className="heal-expand">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && cycle.results.length > 0 && (
        <div className="heal-results">
          {cycle.results.map((r, i) => (
            <div key={i} className="heal-result-row">
              <span className="heal-project">{projectName(r.project)}</span>
              <span
                className="heal-error-chip"
                style={{
                  backgroundColor: (TYPE_COLORS[r.error_type] || '#64748b') + '33',
                  color: TYPE_COLORS[r.error_type] || '#94a3b8',
                }}
              >
                {r.error_type.replace('_', ' ')}
              </span>
              <span className="heal-confidence">{(r.confidence * 100).toFixed(0)}%</span>
              <span
                className={`heal-status-dot ${r.verified ? 'verified' : r.approved ? 'applied' : 'blocked'}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HealingDashboard({ onClose }: { onClose: () => void }) {
  const [summary, setSummary] = useState<HealingSummary | null>(null);
  const [logs, setLogs] = useState<HealingCycle[]>([]);
  const [runStatus, setRunStatus] = useState<SelfHealingRunStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [runTriggering, setRunTriggering] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [lastUpdatedMs, setLastUpdatedMs] = useState<number | null>(null);

  const loadHealingData = useCallback(async () => {
    const [summaryData, logsData, statusData] = await Promise.all([
      getHealingSummary(),
      getHealingLogs(),
      getSelfHealingRunStatus(),
    ]);
    setSummary(summaryData);
    setLogs(logsData);
    setRunStatus(statusData);
    setLastUpdatedMs(Date.now());
  }, []);

  useEffect(() => {
    let cancelled = false;
    let initialLoad = true;

    const refresh = async () => {
      try {
        await loadHealingData();
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to refresh healing dashboard:', err);
        }
      } finally {
        if (!cancelled && initialLoad) {
          setLoading(false);
          initialLoad = false;
        }
      }
    };

    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, DASHBOARD_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [loadHealingData]);

  const runSelfHealing = useCallback(
    async (dryRun: boolean, loopName: SelfHealingLoopName | null = null) => {
      setRunError(null);
      const triggerKey = `${dryRun ? 'dry' : 'live'}:${loopName ?? 'all'}`;
      setRunTriggering(triggerKey);
      try {
        const status = await startSelfHealingRun({
          dryRun,
          skipNotify: true,
          loopName: loopName ?? undefined,
        });
        setRunStatus(status);
        await loadHealingData();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setRunError(message);
      } finally {
        setRunTriggering(null);
      }
    },
    [loadHealingData],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="heal-backdrop" onClick={onClose}>
      <div className="healing-dashboard" onClick={(e) => e.stopPropagation()}>
        <div className="heal-header">
          <h2>🛡️ Self-Healing Monitor</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {lastUpdatedMs && (
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                Updated {new Date(lastUpdatedMs).toLocaleTimeString()}
              </span>
            )}
            <button className="heal-close" onClick={onClose} title="Close (Esc)">
              ✕
            </button>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            {runStatus?.running
              ? `Run in progress (${runStatus.mode ?? 'unknown'})${runStatus.pid ? ` · PID ${runStatus.pid}` : ''}`
              : runStatus && runStatus.last_exit_code !== null
                ? `Last run exit code: ${runStatus.last_exit_code}`
                : 'No run currently active'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                void runSelfHealing(true);
              }}
              disabled={runTriggering !== null}
              style={{
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                padding: '6px 10px',
                background: '#1f293733',
                color: '#e2e8f0',
                fontSize: 12,
                cursor: runTriggering ? 'not-allowed' : 'pointer',
                opacity: runTriggering ? 0.55 : 1,
              }}
              title="Run dry-run self-healing (safe mode)"
            >
              {runTriggering === 'dry:all' ? 'Starting…' : 'Run Dry'}
            </button>
            <button
              onClick={() => {
                void runSelfHealing(false);
              }}
              disabled={runTriggering !== null}
              style={{
                border: '1px solid rgba(16,185,129,0.45)',
                borderRadius: 8,
                padding: '6px 10px',
                background: '#10b98126',
                color: '#d1fae5',
                fontSize: 12,
                cursor: runTriggering ? 'not-allowed' : 'pointer',
                opacity: runTriggering ? 0.55 : 1,
              }}
              title="Run live self-healing (auto-apply fixes)"
            >
              {runTriggering === 'live:all' ? 'Starting…' : 'Run Live'}
            </button>
          </div>
        </div>
        <div
          style={{
            marginBottom: 12,
            borderRadius: 8,
            border: '1px solid rgba(148,163,184,0.25)',
            padding: '10px 12px',
            background: 'rgba(15,23,42,0.35)',
          }}
        >
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Run Specific Loop</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {LOOP_OPTIONS.map((loop) => (
              <div
                key={loop.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 12, color: '#e2e8f0' }}>{loop.label}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => {
                      void runSelfHealing(true, loop.id);
                    }}
                    disabled={runTriggering !== null}
                    style={{
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 8,
                      padding: '4px 8px',
                      background: '#1f293733',
                      color: '#e2e8f0',
                      fontSize: 12,
                      cursor: runTriggering ? 'not-allowed' : 'pointer',
                      opacity: runTriggering ? 0.55 : 1,
                    }}
                    title={`Run ${loop.label} in dry-run mode`}
                  >
                    {runTriggering === `dry:${loop.id}` ? 'Starting…' : 'Dry'}
                  </button>
                  <button
                    onClick={() => {
                      void runSelfHealing(false, loop.id);
                    }}
                    disabled={runTriggering !== null}
                    style={{
                      border: '1px solid rgba(16,185,129,0.45)',
                      borderRadius: 8,
                      padding: '4px 8px',
                      background: '#10b98126',
                      color: '#d1fae5',
                      fontSize: 12,
                      cursor: runTriggering ? 'not-allowed' : 'pointer',
                      opacity: runTriggering ? 0.55 : 1,
                    }}
                    title={`Run ${loop.label} with auto-apply`}
                  >
                    {runTriggering === `live:${loop.id}` ? 'Starting…' : 'Live'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {runError && (
          <div
            style={{
              marginBottom: 12,
              borderRadius: 8,
              border: '1px solid rgba(239, 68, 68, 0.45)',
              background: '#7f1d1d66',
              color: '#fecaca',
              padding: '8px 10px',
              fontSize: 12,
            }}
          >
            {runError}
          </div>
        )}

        {loading ? (
          <div className="heal-loading">Loading healing data…</div>
        ) : (
          <>
            {summary && (
              <div className="heal-stats-grid">
                <StatCard label="Total Cycles" value={summary.total_cycles} accent="#06b6d4" />
                <StatCard label="Issues Found" value={summary.total_issues} accent="#f59e0b" />
                <StatCard label="Fixes Applied" value={summary.total_fixes} accent="#10b981" />
                <StatCard label="Verified" value={summary.total_verified} accent="#8b5cf6" />
              </div>
            )}

            {logs.length >= 2 && (
              <div className="heal-sparkline-row">
                <Sparkline
                  data={logs
                    .slice(0, 15)
                    .reverse()
                    .map((c) => c.fixable_issues)}
                  color="#f59e0b"
                  label="Issues trend"
                />
                <Sparkline
                  data={logs
                    .slice(0, 15)
                    .reverse()
                    .map((c) => c.fixes_attempted)}
                  color="#10b981"
                  label="Fixes trend"
                />
              </div>
            )}

            <div className="heal-timeline">
              <h3>Recent Cycles</h3>
              {logs.length === 0 ? (
                <p className="heal-empty">No healing cycles found</p>
              ) : (
                logs.slice(0, 15).map((cycle, i) => <CycleRow key={i} cycle={cycle} />)
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
