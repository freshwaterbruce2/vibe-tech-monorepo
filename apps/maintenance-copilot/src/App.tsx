import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

const API = (import.meta.env.VITE_GATEWAY_URL as string | undefined) ?? 'http://localhost:8675';

interface PanelState<T> {
  loading: boolean;
  error?: string;
  data?: T;
}

interface WorkspaceData {
  health: { success: boolean; stdout: string; stderr: string; error?: string };
  packages: { count: number; includeGlobs: string[]; items: Array<{ name: string; relPath: string }> };
}
interface ScriptResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}
interface LogScan {
  success: boolean;
  scanned: number;
  matches: Array<{ file: string; line: number; text: string }>;
}

function useEndpoint<T>(path: string): [PanelState<T>, () => void] {
  const [state, setState] = useState<PanelState<T>>({ loading: true });
  const load = useCallback(() => {
    setState({ loading: true });
    fetch(`${API}${path}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as T;
      })
      .then((data) => setState({ loading: false, data }))
      .catch((e: unknown) => setState({ loading: false, error: e instanceof Error ? e.message : String(e) }));
  }, [path]);
  useEffect(() => load(), [load]);
  return [state, load];
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
const Loading = () => <p className="muted">loading…</p>;
const ErrBox = ({ msg }: { msg: string }) => (
  <p className="err">⚠ {msg}<br /><span className="muted">Is the gateway running on :8675? (pnpm build:gateway, then pnpm dev)</span></p>
);

export default function App() {
  const [ws, reloadWs] = useEndpoint<WorkspaceData>('/api/health/workspace');
  const [db, reloadDb] = useEndpoint<ScriptResult>('/api/health/databases');
  const [dd, reloadDd] = useEndpoint<ScriptResult>('/api/health/d-drive');
  const [logs, reloadLogs] = useEndpoint<LogScan>('/api/health/logs/errors');
  const [action, setAction] = useState('');

  const reloadAll = () => {
    reloadWs();
    reloadDb();
    reloadDd();
    reloadLogs();
  };

  const post = async (path: string, body: unknown, label: string) => {
    setAction(`${label}…`);
    try {
      const r = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as ScriptResult;
      setAction(`${label}: ${j.success ? 'done ✓' : (j.error ?? 'failed')}`);
    } catch (e) {
      setAction(`${label}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const errorCount = logs.data?.matches.length ?? 0;
  const connected = !ws.loading && !ws.error;

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>Monorepo Maintenance Co-Pilot</h1>
          <p className="sub">
            <span className={connected ? 'dot ok' : 'dot bad'} /> {connected ? 'Connected' : 'Disconnected'} · {API}
          </p>
        </div>
        <button className="btn" onClick={reloadAll}>↻ Refresh all</button>
      </header>

      <div className="grid">
        <Card title="Workspace Stability">
          {ws.loading ? <Loading /> : ws.error ? <ErrBox msg={ws.error} /> : (
            <>
              <div className="metric">{ws.data?.packages.count ?? '—'}<span> packages</span></div>
              <p className="muted">{ws.data?.packages.includeGlobs.length ?? 0} workspace globs · pnpm</p>
              <p className={ws.data?.health.success ? 'ok' : 'warnText'}>
                ● {ws.data?.health.success ? 'workspace-health.ps1 OK' : 'health script flagged issues'}
              </p>
            </>
          )}
        </Card>

        <Card title="Databases (D:\)">
          {db.loading ? <Loading /> : db.error ? <ErrBox msg={db.error} /> : (
            <>
              <p className={db.data?.success ? 'ok' : 'warnText'}>● {db.data?.success ? 'integrity OK' : 'see output'}</p>
              <pre className="out">{(db.data?.stdout ?? '').slice(0, 600) || 'no output'}</pre>
            </>
          )}
        </Card>

        <Card title="D:\ Drive">
          {dd.loading ? <Loading /> : dd.error ? <ErrBox msg={dd.error} /> : (
            <pre className="out">{(dd.data?.stdout ?? '').slice(0, 600) || 'no output'}</pre>
          )}
        </Card>

        <Card title="Error / Crash Log Scan">
          {logs.loading ? <Loading /> : logs.error ? <ErrBox msg={logs.error} /> : (
            <>
              <div className={`metric ${errorCount ? 'danger' : 'ok'}`}>{errorCount}<span> matches</span></div>
              <p className="muted">scanned {logs.data?.scanned ?? 0} logs in D:\learning-system\logs</p>
              <ul className="loglist">
                {(logs.data?.matches ?? []).slice(-6).map((m, i) => (
                  <li key={`${m.file}-${m.line}-${i}`}><code>{m.file}:{m.line}</code> {m.text.slice(0, 80)}</li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <footer className="actions">
        <button className="btn warn" onClick={() => void post('/api/health/cleanup', { dryRun: true }, 'Fix & Align (preview)')}>
          Fix &amp; Align (preview)
        </button>
        <button
          className="btn danger"
          onClick={() => {
            if (window.confirm('Run maintenance (WAL checkpoint + vacuum + backup)?')) {
              void post('/api/health/maintenance', { confirm: true, vacuum: true, backup: true }, 'Maintenance');
            }
          }}
        >
          Run Maintenance
        </button>
        <span className="actionmsg">{action}</span>
      </footer>
    </main>
  );
}
