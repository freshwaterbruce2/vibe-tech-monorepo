import { useEffect, useState } from 'react';
import { api, type ActionResult } from '../lib/api';

export type RemediationAction = 'maintenance' | 'cleanup';

const TITLES: Record<RemediationAction, string> = {
  maintenance: 'Align Dependencies',
  cleanup: 'Clean Stale Artifacts',
};
const RUN: Record<RemediationAction, (dryRun: boolean) => Promise<ActionResult>> = {
  maintenance: async (dryRun) => api.runMaintenance(dryRun),
  cleanup: async (dryRun) => api.runCleanup(dryRun),
};

interface Props {
  action: RemediationAction;
  onClose: () => void;
  onComplete: () => void;
}

/**
 * Gated remediation: on open it runs the dry-run to show the PowerShell preview;
 * "Execute Live" runs the real action and bubbles the handler's {success, log}.
 */
export function RemediationModal({ action, onClose, onComplete }: Props) {
  const [preview, setPreview] = useState<ActionResult>();
  const [busy, setBusy] = useState(true);
  const [result, setResult] = useState<{ ok: boolean; text: string }>();

  const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

  useEffect(() => {
    // `busy` starts true; App remounts this modal per action (key={action}).
    RUN[action](true)
      .then(setPreview)
      .catch((e: unknown) => setResult({ ok: false, text: errText(e) }))
      .finally(() => setBusy(false));
  }, [action]);

  const executeLive = () => {
    setBusy(true);
    RUN[action](false)
      .then((r) => {
        setResult({
          ok: r.success,
          text: r.success ? (r.message ?? 'Done.') : (r.error ?? 'Failed.'),
        });
        if (r.success) onComplete();
      })
      .catch((e: unknown) => setResult({ ok: false, text: errText(e) }))
      .finally(() => setBusy(false));
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-label={TITLES[action]}>
      <div className="modal">
        <h2>{TITLES[action]}</h2>
        {busy && !result ? <p className="muted">Working…</p> : null}
        {preview && !result ? (
          <>
            <p className="muted">{preview.message}</p>
            <pre className="out">{preview.script}</pre>
          </>
        ) : null}
        {result ? <p className={result.ok ? 'ok' : 'err'}>{result.text}</p> : null}
        <div className="actions">
          {preview && !result ? (
            <button className="btn danger" disabled={busy} onClick={executeLive}>
              Execute Live
            </button>
          ) : null}
          <button className="btn" onClick={onClose}>
            {result ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
