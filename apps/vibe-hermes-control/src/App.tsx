import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';

type PageId = 'memory' | 'docs' | 'cron' | 'pipeline';
type StatusTone = 'good' | 'watch' | 'danger' | 'idle';

interface NavItem {
  readonly id: PageId;
  readonly label: string;
  readonly eyebrow: string;
}

interface MemorySignal {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly tone: StatusTone;
}

interface DocLink {
  readonly title: string;
  readonly section: string;
  readonly summary: string;
  readonly command: string;
}

interface CronJob {
  readonly name: string;
  readonly schedule: string;
  readonly nextRun: string;
  readonly delivery: string;
  readonly status: 'active' | 'paused' | 'draft';
}

interface PipelineStage {
  readonly name: string;
  readonly owner: string;
  readonly state: 'queued' | 'running' | 'review' | 'complete';
  readonly checklist: readonly string[];
}

interface PipelineRun {
  readonly taskId: string;
  readonly goal: string;
  readonly status: 'queued' | 'running' | 'success' | 'failed';
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number | null;
  readonly startedAt: number;
  readonly completedAt: number | null;
}

interface SessionUser {
  readonly email: string;
  readonly id?: number;
  readonly isAdmin?: boolean;
}

const navItems: readonly NavItem[] = [
  { id: 'memory', label: 'Memory', eyebrow: 'profile + lessons' },
  { id: 'docs', label: 'Docs', eyebrow: 'operator manual' },
  { id: 'cron', label: 'Cron', eyebrow: 'scheduled runs' },
  { id: 'pipeline', label: 'Pipeline', eyebrow: 'task command' },
];

const docLinks: readonly DocLink[] = [
  {
    title: 'Hermes CLI',
    section: 'Commands',
    summary: 'Quick launch, model switching, config, status, and session management commands.',
    command: 'hermes --help',
  },
  {
    title: 'Toolsets',
    section: 'Capabilities',
    summary: 'Terminal, file, browser, cron, memory, delegation, session search, and messaging controls.',
    command: 'hermes tools list',
  },
  {
    title: 'Memory',
    section: 'Persistence',
    summary: 'Profile and memory stores that keep user preferences and environment facts across sessions.',
    command: 'hermes memory status',
  },
  {
    title: 'Cron',
    section: 'Automation',
    summary: 'Durable scheduled jobs with prompts, scripts, delivery targets, skills, models, and workdirs.',
    command: 'hermes cron list',
  },
];

const defaultNavItem: NavItem = navItems[0] as NavItem;

const toneLabel: Record<StatusTone, string> = {
  good: 'Stable',
  watch: 'Watch',
  danger: 'Blocked',
  idle: 'Idle',
};

const stateLabel: Record<PipelineStage['state'], string> = {
  queued: 'Queued',
  running: 'Running',
  review: 'Review',
  complete: 'Complete',
};

function App(): React.JSX.Element {
  const [activePage, setActivePage] = useState<PageId>('memory');
  const [session, setSession] = useState<{ authenticated: boolean; user: SessionUser | null } | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<{
    memorySignals: MemorySignal[];
    cronJobs: CronJob[];
    pipelineStages: PipelineStage[];
    activeRuns: PipelineRun[];
  } | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [goalText, setGoalText] = useState('');
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [docSearchQuery, setDocSearchQuery] = useState('');

  // Check session on mount and handle oauth callback from URL parameters
  useEffect(() => {
    const checkSessionAndCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const state = urlParams.get('state');
        const code = urlParams.get('code');
        let token: string | undefined;

        if (state && code) {
          const res = await fetch(`/api/auth/callback?state=${state}&code=${code}`);
          const callbackData = await res.json();
          if (callbackData.success) {
            token = callbackData.token;
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }

        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        setSession(sessionData);

        // Expose token to window object for devtools/scripts
        const activeToken = token ?? sessionData.token;
        if (activeToken) {
          (window as unknown as { __HERMES_SESSION_TOKEN__?: string }).__HERMES_SESSION_TOKEN__ = activeToken;
        }
      } catch (err) {
        console.error('Session validation failed', err);
      } finally {
        setSessionLoading(false);
      }
    };

    void checkSessionAndCallback();
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!session?.authenticated) return;
    setDashboardLoading(true);
    try {
      const res = await fetch('/api/dashboard/data');
      const data = await res.json();
      if (data.success) {
        setDashboardData({
          memorySignals: data.memorySignals,
          cronJobs: data.cronJobs,
          pipelineStages: data.pipelineStages,
          activeRuns: data.activeRuns,
        });

        // Auto-detect if any run is still active in backend
        const running = data.activeRuns.find((r: PipelineRun) => r.status === 'running');
        if (running) {
          setRunningTaskId(running.taskId);
          setSelectedTaskId(running.taskId);
        } else if (data.activeRuns.length > 0 && !selectedTaskId) {
          setSelectedTaskId(data.activeRuns[0].taskId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setDashboardLoading(false);
    }
  }, [session, selectedTaskId]);

  useEffect(() => {
    if (session?.authenticated) {
      void fetchDashboardData();
    }
  }, [session, fetchDashboardData]);

  // Poll running task
  useEffect(() => {
    if (!runningTaskId) return;
    const interval = setInterval(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/dashboard/pipeline/status/${runningTaskId}`);
          const data = await res.json();
          if (data.success) {
            setDashboardData(prev => {
              if (!prev) return null;
              const runs = prev.activeRuns.map(r => r.taskId === runningTaskId ? data.run : r);
              return { ...prev, activeRuns: runs };
            });

            if (data.run.status !== 'running') {
              setRunningTaskId(null);
              void fetchDashboardData();
            }
          }
        } catch (err) {
          console.error('Polling task failed', err);
        }
      })();
    }, 1500);

    return () => clearInterval(interval);
  }, [runningTaskId, fetchDashboardData]);

  const handleLogin = () => {
    window.location.href = `/api/auth/login?redirect_uri=${encodeURIComponent(window.location.origin + '/')}`;
  };

  const handleLogout = () => {
    void (async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        setSession({ authenticated: false, user: null });
        setDashboardData(null);
      } catch (err) {
        console.error('Logout failed', err);
      }
    })();
  };

  const handleToggleCron = (name: string) => {
    void (async () => {
      try {
        const res = await fetch('/api/dashboard/cron/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (data.success && dashboardData) {
          setDashboardData({ ...dashboardData, cronJobs: data.cronJobs });
        }
      } catch (err) {
        console.error('Failed to toggle cron', err);
      }
    })();
  };

  const handleRunCron = (name: string) => {
    void (async () => {
      try {
        const res = await fetch('/api/dashboard/cron/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (data.success && dashboardData) {
          setDashboardData({ ...dashboardData, cronJobs: data.cronJobs });
          setTimeout(() => {
            void fetchDashboardData();
          }, 2500);
        }
      } catch (err) {
        console.error('Failed to run cron', err);
      }
    })();
  };

  const handleRunGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalText.trim() || runningTaskId) return;

    void (async () => {
      try {
        const res = await fetch('/api/dashboard/pipeline/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goal: goalText }),
        });
        const data = await res.json();
        if (data.success) {
          setRunningTaskId(data.taskId);
          setSelectedTaskId(data.taskId);
          setGoalText('');
          void fetchDashboardData();
        }
      } catch (err) {
        console.error('Failed to run goal', err);
      }
    })();
  };

  const selectedRun = useMemo(() => {
    return dashboardData?.activeRuns.find(r => r.taskId === selectedTaskId) ?? null;
  }, [dashboardData, selectedTaskId]);

  const filteredDocLinks = useMemo(() => {
    return docLinks.filter(
      doc =>
        doc.title.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
        doc.summary.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
        doc.command.toLowerCase().includes(docSearchQuery.toLowerCase())
    );
  }, [docSearchQuery]);

  const activeNav = useMemo(
    () => navItems.find((item) => item.id === activePage) ?? defaultNavItem,
    [activePage],
  );

  if (sessionLoading) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="spinner" />
          <p>Verifying secure identity context...</p>
        </div>
      </div>
    );
  }

  if (!session?.authenticated) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <p className="kicker">Vibe Tech // Secure Portal</p>
          <h2>Hermes Mission Control</h2>
          <p>
            You are attempting to access the workspace orchestrator control plane.
            Authorize your secure identity to proceed.
          </p>
          <button type="button" className="login-btn" onClick={handleLogin}>
            Authorize & Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="dashboard-title">
        <div className="hero__grid" aria-hidden="true" />
        <div className="hero__content">
          <div className="hero__header">
            <p className="kicker">Vibe Tech // Hermes Agent Mission Control</p>
            <button className="signout-btn" onClick={handleLogout} type="button">
              Sign Out
            </button>
          </div>
          <h1 id="dashboard-title">Command the agent layer without losing the signal.</h1>
          <p className="hero__copy">
            Welcome, {session.user?.email ?? 'Operator'}. Inspect cognitive memory, run
            automated pulses, and dispatch tasks directly to the Antigravity CLI agent core.
          </p>
          <div className="hero__actions" aria-label="Primary dashboard actions">
            <a href="https://hermes-agent.nousresearch.com/docs" target="_blank" rel="noreferrer">
              Open Hermes docs
            </a>
            <button type="button" onClick={() => setActivePage('pipeline')}>
              View pipeline
            </button>
          </div>
        </div>
        <aside className="status-card" aria-label="Agent status summary">
          <span className={`status-card__light ${runningTaskId ? 'status-card__light--busy' : ''}`} />
          <p>Agent posture</p>
          <strong>{runningTaskId ? 'Executing Goal' : 'Ready for Vibe builds'}</strong>
          <small>
            {runningTaskId ? 'agy process running...' : 'pnpm + Nx workspace active // strict verification mode'}
          </small>
        </aside>
      </section>

      <section className="console" aria-label="Mission control workspace">
        <nav className="rail" aria-label="Dashboard pages">
          <p className="rail__label">Control surfaces</p>
          {navItems.map((item) => (
            <button
              className={item.id === activePage ? 'nav-card nav-card--active' : 'nav-card'}
              key={item.id}
              onClick={() => setActivePage(item.id)}
              type="button"
            >
              <span>{item.eyebrow}</span>
              <strong>{item.label}</strong>
            </button>
          ))}
        </nav>

        <div className="panel">
          <header className="panel__header">
            <span>{activeNav.eyebrow}</span>
            <h2>{activeNav.label}</h2>
          </header>
          {dashboardLoading && !dashboardData ? (
            <div className="panel-loading">
              <div className="spinner" />
              <p>Fetching active telemetry...</p>
            </div>
          ) : (
            <>
              {activePage === 'memory' && dashboardData && (
                <div className="grid grid--signals">
                  {dashboardData.memorySignals.map((signal) => (
                    <article className={`signal signal--${signal.tone}`} key={signal.label}>
                      <div>
                        <span>{toneLabel[signal.tone]}</span>
                        <h3>{signal.label}</h3>
                      </div>
                      <strong>{signal.value}</strong>
                      <p>{signal.detail}</p>
                    </article>
                  ))}
                </div>
              )}
              {activePage === 'docs' && (
                <div className="docs-page">
                  <div className="search-bar">
                    <input
                      type="text"
                      placeholder="Search operator manual, commands, persistence..."
                      value={docSearchQuery}
                      onChange={(e) => setDocSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="docs-list">
                    {filteredDocLinks.map((doc) => (
                      <article className="doc-card" key={doc.title}>
                        <div>
                          <span>{doc.section}</span>
                          <h3>{doc.title}</h3>
                          <p>{doc.summary}</p>
                        </div>
                        <code>{doc.command}</code>
                      </article>
                    ))}
                    {filteredDocLinks.length === 0 && (
                      <p className="empty-state">No matching documentation links found.</p>
                    )}
                  </div>
                </div>
              )}
              {activePage === 'cron' && dashboardData && (
                <div className="table" role="table" aria-label="Cron jobs overview">
                  <div className="table__row table__row--head" role="row">
                    <span role="columnheader">Job</span>
                    <span role="columnheader">Schedule</span>
                    <span role="columnheader">Next run</span>
                    <span role="columnheader">Delivery</span>
                    <span role="columnheader">Status</span>
                    <span role="columnheader">Actions</span>
                  </div>
                  {dashboardData.cronJobs.map((job) => (
                    <div className="table__row" key={job.name} role="row">
                      <strong role="cell">{job.name}</strong>
                      <span role="cell">{job.schedule}</span>
                      <span role="cell">{job.nextRun}</span>
                      <span role="cell">{job.delivery}</span>
                      <span className={`pill pill--${job.status}`} role="cell">
                        {job.status}
                      </span>
                      <span role="cell" className="actions-cell">
                        {job.status !== 'draft' && (
                          <>
                            <button
                              className="action-btn"
                              onClick={() => handleRunCron(job.name)}
                              disabled={job.nextRun === 'Running...'}
                              type="button"
                            >
                              {job.nextRun === 'Running...' ? 'Running' : 'Run'}
                            </button>
                            <button
                              className="action-btn"
                              onClick={() => handleToggleCron(job.name)}
                              type="button"
                            >
                              {job.status === 'active' ? 'Pause' : 'Resume'}
                            </button>
                          </>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {activePage === 'pipeline' && dashboardData && (
                <div className="pipeline-container">
                  <div className="pipeline">
                    {dashboardData.pipelineStages.map((stage, index) => (
                      <article className={`stage stage--${stage.state}`} key={stage.name}>
                        <div className="stage__number">{String(index + 1).padStart(2, '0')}</div>
                        <div className="stage__body">
                          <span>{stateLabel[stage.state]} // {stage.owner}</span>
                          <h3>{stage.name}</h3>
                          <ul>
                            {stage.checklist.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="orchestrator-console">
                    <h3>Orchestration CLI Command Terminal</h3>
                    <form className="goal-form" onSubmit={handleRunGoal}>
                      <textarea
                        placeholder="Define custom goal... (e.g. run typecheck for serenity-flow)"
                        value={goalText}
                        onChange={(e) => setGoalText(e.target.value)}
                        disabled={!!runningTaskId}
                      />
                      <button type="submit" disabled={!goalText.trim() || !!runningTaskId}>
                        {runningTaskId ? 'Agent Executing...' : 'Dispatch Goal'}
                      </button>
                    </form>

                    <div className="terminal-layout">
                      <div className="runs-history">
                        <h4>Execution History</h4>
                        <div className="runs-list">
                          {dashboardData.activeRuns.map((run) => (
                            <button
                              key={run.taskId}
                              className={`run-item ${selectedTaskId === run.taskId ? 'run-item--selected' : ''}`}
                              onClick={() => setSelectedTaskId(run.taskId)}
                              type="button"
                            >
                              <span className={`run-status-indicator run-status-indicator--${run.status}`} />
                              <span className="run-goal">{run.goal}</span>
                            </button>
                          ))}
                          {dashboardData.activeRuns.length === 0 && (
                            <p className="empty-state">No execution logs found.</p>
                          )}
                        </div>
                      </div>

                      <div className="terminal-display">
                        <header className="terminal-header">
                          <span>CONSOLE OUTPUT</span>
                          {selectedRun && (
                            <span className={`status-badge status-badge--${selectedRun.status}`}>
                              {selectedRun.status.toUpperCase()}
                            </span>
                          )}
                        </header>
                        <TerminalConsole logs={selectedRun ? (selectedRun.stdout + selectedRun.stderr) : 'Select a run from execution history or dispatch a new goal to see output.'} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function TerminalConsole({ logs }: { logs: string }): React.JSX.Element {
  const terminalRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <pre className="terminal-logs" ref={terminalRef}>
      <code>{logs || 'Empty output'}</code>
    </pre>
  );
}

export default App;
