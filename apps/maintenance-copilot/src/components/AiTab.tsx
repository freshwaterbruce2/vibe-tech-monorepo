import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { StatusBadge } from './StatusBadge';

/** AI tab: offline stub. Reflects the real /api/diagnose contract ({active:false, notice}). */
export function AiTab() {
  const [notice, setNotice] = useState('AI Diagnostics offline');

  useEffect(() => {
    api
      .diagnose()
      .then((r) => setNotice(r.notice))
      .catch(() => undefined);
  }, []);

  return (
    <section>
      <h2>AI Diagnostics</h2>
      <StatusBadge tone="info">{notice}</StatusBadge>
      <p className="muted">
        On-device AI diagnostics are disabled in this build (no LLM proxy bundled).
      </p>
    </section>
  );
}
