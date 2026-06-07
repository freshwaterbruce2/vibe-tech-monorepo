import { useEffect, useRef, useState } from 'react';
import {
  AgentLogPayload,
  AgentStatus,
  getAgentStatus,
  listenToAgentLogs,
  startAgent,
  stopAgent,
} from '../../lib/orchestrator';
import { getSelfHealingRunStatus, startSelfHealingRun } from '../../lib/tauri-bridge';
import type { SelfHealingRunStatus } from '../../types/vtde';

const AGENTS = [
  {
    id: 'dev-server',
    label: 'Dashboard Dev Server',
    type: 'command',
    command: 'pnpm dev',
    cwd: 'C:\\dev\\apps\\monorepo-dashboard',
  },
  {
    id: 'backend-server',
    label: 'Backend Server',
    type: 'command',
    command: 'pnpm server',
    cwd: 'C:\\dev\\apps\\monorepo-dashboard',
  },
  {
    id: 'memory-mcp',
    label: 'Memory MCP Server',
    type: 'mcp',
    command: 'pnpm start',
    cwd: 'C:\\dev\\packages\\memory',
  },
  {
    id: 'skills-mcp',
    label: 'Skills MCP Server',
    type: 'mcp',
    command: 'pnpm start',
    cwd: 'C:\\dev\\packages\\mcp-skills-server',
  },
  {
    id: 'learning-service',
    label: 'Learning Service',
    type: 'system',
    command: 'python learning_service.py',
    cwd: 'C:\\dev\\packages\\vibe-learning',
  },
  {
    id: 'nova-agent',
    label: 'Nova Agent',
    type: 'agent',
    command: 'cargo run',
    cwd: 'C:\\dev\\apps\\nova-agent\\src-tauri',
  },
  {
    id: 'vibe-code-studio',
    label: 'Vibe Code Studio',
    type: 'agent',
    command: 'pnpm dev',
    cwd: 'C:\\dev\\apps\\vibe-code-studio',
  },
];

export function AgentOrchestrator() {
  const [statuses, setStatuses] = useState<AgentStatus[]>([]);
  const [logs, setLogs] = useState<Record<string, string[]>>({});
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [healingStatus, setHealingStatus] = useState<SelfHealingRunStatus | null>(null);

  useEffect(() => {
    const poll = () => {
      getSelfHealingRunStatus()
        .then(setHealingStatus)
        .catch(() => setHealingStatus(null));
    };
    poll();
    const id = setInterval(poll, 10_000);
    return () => clearInterval(id);
  }, []);

  const handleRunHealing = async () => {
    try {
      const result = await startSelfHealingRun({ dryRun: true });
      setHealingStatus(result);
    } catch (e) {
      console.error('Failed to start healing:', e);
    }
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, selectedAgent]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setup = async () => {
      try {
        const initialStatuses = await getAgentStatus();
        setStatuses(initialStatuses);

        unlisten = await listenToAgentLogs((payload: AgentLogPayload) => {
          setLogs((prev) => {
            const agentLogs = prev[payload.id] || [];
            return {
              ...prev,
              [payload.id]: [...agentLogs, payload.log].slice(-1000),
            };
          });
        });
      } catch (e) {
        console.error('Failed to setup orchestrator:', e);
      }
    };

    void setup();
    const interval = setInterval(() => {
      getAgentStatus()
        .then(setStatuses)
        .catch((e) => console.error('Failed to refresh statuses:', e));
    }, 3000);

    return () => {
      clearInterval(interval);
      if (unlisten) unlisten();
    };
  }, []);

  const handleStart = async (agent: (typeof AGENTS)[0]) => {
    try {
      await startAgent(agent.id, agent.command, agent.cwd);
      setStatuses(await getAgentStatus());
    } catch (e) {
      console.error(`Failed to start ${agent.id}:`, e);
    }
  };

  const handleStop = async (id: string) => {
    try {
      await stopAgent(id);
      setStatuses(await getAgentStatus());
    } catch (e) {
      console.error(`Failed to stop ${id}:`, e);
    }
  };

  return (
    <div className="cp-root cp-root--row">
      {/* Sidebar */}
      <div className="orch-sidebar">
        <div className="cp-header">
          <h2 className="cp-title">
            <span>🎛️</span> Orchestrator
          </h2>
          <button
            onClick={() => void handleRunHealing()}
            disabled={!!healingStatus?.running}
            className={`orch-btn ${healingStatus?.running ? 'orch-btn--heal' : 'orch-btn--heal'}`}
          >
            {healingStatus?.running
              ? `🔄 Healing (${healingStatus.mode ?? 'running'})`
              : '🛡️ Run Self-Healing'}
          </button>
        </div>
        <div className="orch-list">
          {AGENTS.map((agent) => {
            const isRunning = statuses.some((s) => s.id === agent.id);
            const isSelected = selectedAgent === agent.id;

            return (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent.id)}
                className={`orch-card${isSelected ? ' orch-card--selected' : ''}`}
              >
                <div className="orch-card__head">
                  <h3 className="orch-card__name">{agent.label}</h3>
                  <div className={`orch-card__dot${isRunning ? ' orch-card__dot--running' : ''}`} />
                </div>
                <div className="orch-card__cmd">{agent.command}</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isRunning) {
                      void handleStop(agent.id);
                    } else {
                      void handleStart(agent);
                    }
                  }}
                  className={`orch-btn ${isRunning ? 'orch-btn--stop' : 'orch-btn--start'}`}
                >
                  {isRunning ? 'Stop' : 'Start'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Logs pane */}
      <div className="orch-logs">
        {selectedAgent ? (
          <>
            <div className="orch-logs__bar">
              <span className="orch-logs__path">~/logs/{selectedAgent}.log</span>
              <button
                onClick={() => setLogs((p) => ({ ...p, [selectedAgent]: [] }))}
                className="orch-logs__clear"
              >
                Clear
              </button>
            </div>
            <div className="orch-logs__content">
              {logs[selectedAgent]?.length ? (
                logs[selectedAgent].map((log, i) => (
                  <div
                    key={i}
                    className={`orch-logs__line${log.startsWith('ERROR:') ? ' orch-logs__line--error' : ''}`}
                  >
                    {log}
                  </div>
                ))
              ) : (
                <div className="cp-loading">
                  <div className="cp-spinner" />
                  Waiting for logs...
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
          </>
        ) : (
          <div className="cp-empty">Select an agent to view logs</div>
        )}
      </div>
    </div>
  );
}
