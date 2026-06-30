import { useState } from 'react';
import { useGatewayData } from './hooks/useGatewayData';
import { apiBaseUrl } from './lib/api';
import { Overview } from './components/Overview';
import { MonorepoTab } from './components/MonorepoTab';
import { DDriveTab } from './components/DDriveTab';
import { GitTab } from './components/GitTab';
import { AiTab } from './components/AiTab';
import { RemediationModal, type RemediationAction } from './components/RemediationModal';

type Tab = 'overview' | 'monorepo' | 'ddrive' | 'git' | 'ai';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'monorepo', label: 'Monorepo' },
  { id: 'ddrive', label: 'D-Drive' },
  { id: 'git', label: 'Git' },
  { id: 'ai', label: 'AI' },
];

export default function App() {
  const { loading, error, data, refetch } = useGatewayData();
  const [tab, setTab] = useState<Tab>('overview');
  const [remediation, setRemediation] = useState<RemediationAction | null>(null);

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>Monorepo Maintenance Co-Pilot</h1>
          <p className="sub">
            <span className={error ? 'dot bad' : 'dot ok'} /> {error ? 'Disconnected' : 'Connected'}{' '}
            · {apiBaseUrl() || 'same-origin'}
          </p>
        </div>
        <button className="btn" onClick={refetch} disabled={loading}>
          ↻ Refresh
        </button>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error ? (
        <p className="err">
          ⚠ {error}
          <br />
          <span className="muted">Is the gateway running on :8675? (pnpm build:gateway)</span>
        </p>
      ) : loading ? (
        <p className="muted">loading…</p>
      ) : (
        <>
          {tab === 'overview' && <Overview data={data} />}
          {tab === 'monorepo' && (
            <MonorepoTab
              workspace={data.workspace}
              onRepair={() => setRemediation('maintenance')}
            />
          )}
          {tab === 'ddrive' && <DDriveTab dDrive={data.dDrive} databases={data.databases} />}
          {tab === 'git' && <GitTab git={data.git} />}
          {tab === 'ai' && <AiTab />}
        </>
      )}

      <footer className="actions">
        <button className="btn warn" onClick={() => setRemediation('cleanup')}>
          Clean Stale Artifacts
        </button>
      </footer>

      {remediation ? (
        <RemediationModal
          key={remediation}
          action={remediation}
          onClose={() => setRemediation(null)}
          onComplete={refetch}
        />
      ) : null}
    </main>
  );
}
