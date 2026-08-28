import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { parseStatusPayload, statusLabel, STATUS_EVENT, type StatusPayload } from './status';

const containerStyle: React.CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  padding: '2rem',
  color: '#e6e6e6',
  background: '#111318',
  minHeight: '100vh',
  boxSizing: 'border-box',
};

export const App = () => {
  const [status, setStatus] = useState<StatusPayload>({ status: 'idle' });

  useEffect(() => {
    const unlisten = listen(STATUS_EVENT, (event) => {
      const payload = parseStatusPayload(event.payload);
      if (payload) setStatus(payload);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <main style={containerStyle}>
      <h1>Vibe-Flow</h1>
      <p>Local voice dictation — Phase 0 integration spike.</p>
      <p data-testid="status">{statusLabel(status)}</p>
      <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>
        Hold <kbd>Ctrl+Shift+Space</kbd> in any app; on release, &quot;Hello World from
        Vibe-Flow&quot; is typed into the focused window.
      </p>
    </main>
  );
};
