import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { api, type ActionResult } from '../lib/api';

export type RemediationAction = 'maintenance' | 'cleanup';

const TITLES: Record<RemediationAction, string> = {
  maintenance: 'Run Database Maintenance',
  cleanup: 'Clean Stale Artifacts',
};

interface Props {
  action: RemediationAction;
  onClose: () => void;
  onComplete: () => void;
}

interface DeepClean {
  backup: boolean;
  vacuum: boolean;
  retention: boolean;
}

/**
 * Gated remediation: on open it runs the dry-run to show the command preview;
 * "Execute Live" runs the real action and bubbles the result. The maintenance
 * action exposes opt-in deep-clean steps (backup / VACUUM / retention purge);
 * the preview re-fetches as they toggle so the user sees exactly what will run.
 */
export function RemediationModal({ action, onClose, onComplete }: Props) {
  const [opts, setOpts] = useState<DeepClean>({ backup: false, vacuum: false, retention: false });
  const [preview, setPreview] = useState<ActionResult>();
  const [busy, setBusy] = useState(true);
  const [result, setResult] = useState<{ ok: boolean; text: string }>();

  const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

  const runAction = useCallback(
    async (dryRun: boolean) =>
      action === 'maintenance' ? api.runMaintenance({ dryRun, ...opts }) : api.runCleanup(dryRun),
    [action, opts],
  );

  // Fetch the dry-run preview on open and whenever the deep-clean opts change
  // (busy is set true synchronously in the toggle handler / initial state, not
  // here — setState inside an effect body triggers cascading renders). Once
  // executed (result set), stop re-previewing.
  useEffect(() => {
    if (result) return;
    runAction(true)
      .then(setPreview)
      .catch((e: unknown) => setResult({ ok: false, text: errText(e) }))
      .finally(() => setBusy(false));
  }, [runAction, result]);

  const executeLive = () => {
    setBusy(true);
    runAction(false)
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

  const toggle = (key: keyof DeepClean) => (e: ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setBusy(true); // re-preview is about to run in the effect
    setOpts((o) => ({ ...o, [key]: checked }));
  };
  const destructive = opts.vacuum || opts.retention;

  return (
    <div className="modal-backdrop" role="dialog" aria-label={TITLES[action]}>
      <div className="modal">
        <h2>{TITLES[action]}</h2>

        {action === 'maintenance' && !result ? (
          <fieldset className="opts">
            <legend className="muted">
              Deep clean (optional — baseline is safe without these)
            </legend>
            <label>
              <input type="checkbox" checked={opts.backup} onChange={toggle('backup')} /> Backup
              (hot-copy learning DBs)
            </label>
            <label>
              <input type="checkbox" checked={opts.vacuum} onChange={toggle('vacuum')} /> VACUUM
              (rewrite to reclaim space)
            </label>
            <label>
              <input type="checkbox" checked={opts.retention} onChange={toggle('retention')} />{' '}
              Retention purge (permanently deletes old rows)
            </label>
          </fieldset>
        ) : null}

        {destructive && !result ? (
          <p className="warn">
            ⚠ Destructive: a backup runs first as a restore point, then the selected{' '}
            {opts.vacuum ? 'VACUUM' : ''}
            {opts.vacuum && opts.retention ? ' + ' : ''}
            {opts.retention ? 'retention purge (permanent)' : ''}.
          </p>
        ) : null}

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
