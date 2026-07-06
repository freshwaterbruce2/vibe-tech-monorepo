/**
 * SettingsSyncDialog — spec 06 Phase 1 export/import UI. Export shows the
 * versioned JSON for copying; import validates pasted JSON and previews a
 * per-key diff before anything is applied (never silent). Store-gated host
 * mounted once in AppLayout.
 * Spec: FEATURE_SPECS/competitive-gaps/06-SETTINGS-SYNC-PROFILES.md
 */
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  buildSettingsPatch,
  computeSettingsDiff,
  exportSettings,
  parseSettingsImport,
  type SettingsDiffEntry,
} from '../../services/settings/SettingsSerializer';
import { useSettingsSyncStore } from '../../stores/settingsSyncStore';
import { useEditorStore } from '../../stores/useEditorStore';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Dialog = styled.div`
  width: min(640px, 94vw);
  max-height: 84vh;
  overflow-y: auto;
  background: var(--bg-secondary, #1e1e2e);
  border: 1px solid var(--border-color, #333);
  border-radius: 10px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 15px;
`;

const Json = styled.textarea`
  min-height: 180px;
  resize: vertical;
  background: var(--bg-primary, #141420);
  color: var(--text-primary, #d4d4d4);
  border: 1px solid var(--border-color, #333);
  border-radius: 6px;
  padding: 10px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
`;

const Row = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid var(--border-color, #333);
  background: var(--accent-color, #4f8cff);
  color: white;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }

  &.secondary {
    background: transparent;
    color: var(--text-primary, #d4d4d4);
  }
`;

const Note = styled.p<{ $error?: boolean }>`
  margin: 0;
  font-size: 12px;
  color: ${({ $error }) => ($error ? '#ff6b6b' : 'var(--text-secondary, #9a9ab0)')};
  overflow-wrap: anywhere;
`;

const DiffList = styled.ul`
  margin: 0;
  padding-left: 18px;
  font-size: 12px;

  code {
    font-family: 'JetBrains Mono', Consolas, monospace;
  }
`;

const formatValue = (value: unknown): string => JSON.stringify(value) ?? 'undefined';

const DiffPreview = ({ entries }: { entries: SettingsDiffEntry[] }) => {
  if (entries.length === 0) {
    return <Note data-testid="settings-sync-no-changes">No changes — already in sync.</Note>;
  }
  return (
    <DiffList data-testid="settings-sync-diff">
      {entries.map(entry => (
        <li key={entry.key}>
          <code>{entry.key}</code>: {formatValue(entry.current)} → {formatValue(entry.incoming)}
        </li>
      ))}
    </DiffList>
  );
};

export const SettingsSyncDialog = () => {
  const mode = useSettingsSyncStore(state => state.mode);
  const close = useSettingsSyncStore(state => state.actions.close);
  const settings = useEditorStore(state => state.settings);
  const updateSettings = useEditorStore(state => state.actions.updateSettings);
  const [pasted, setPasted] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SettingsDiffEntry[] | null>(null);
  const [applied, setApplied] = useState(false);

  const exported = useMemo(
    () => (mode === 'export' ? exportSettings(settings) : ''),
    [mode, settings]
  );

  if (mode === 'closed') {
    return null;
  }

  const previewImport = () => {
    setApplied(false);
    const result = parseSettingsImport(pasted);
    if (!result.ok) {
      setError(result.error);
      setPreview(null);
      return;
    }
    setError(null);
    setPreview(computeSettingsDiff(settings, result.file.settings));
  };

  const applyImport = () => {
    if (preview && preview.length > 0) {
      updateSettings(buildSettingsPatch(preview));
      setApplied(true);
      setPreview(null);
    }
  };

  return (
    <Overlay data-testid="settings-sync-dialog">
      <Dialog>
        <Title>{mode === 'export' ? 'Export Settings (versioned JSON)' : 'Import Settings'}</Title>
        {mode === 'export' && (
          <>
            <Note>API keys are never included — they live in secure storage.</Note>
            <Json data-testid="settings-sync-export" readOnly value={exported} />
          </>
        )}
        {mode === 'import' && (
          <>
            <Json
              data-testid="settings-sync-input"
              placeholder="Paste a settings export JSON here…"
              value={pasted}
              onChange={event => setPasted(event.target.value)}
            />
            {error && (
              <Note $error data-testid="settings-sync-error">
                {error}
              </Note>
            )}
            {preview && <DiffPreview entries={preview} />}
            {applied && <Note data-testid="settings-sync-applied">Settings applied.</Note>}
          </>
        )}
        <Row>
          <Button type="button" className="secondary" onClick={close}>
            Close
          </Button>
          {mode === 'import' && (
            <>
              <Button
                type="button"
                data-testid="settings-sync-preview"
                onClick={previewImport}
                disabled={!pasted.trim()}
              >
                Preview
              </Button>
              <Button
                type="button"
                data-testid="settings-sync-apply"
                onClick={applyImport}
                disabled={!preview || preview.length === 0}
              >
                Apply
              </Button>
            </>
          )}
        </Row>
      </Dialog>
    </Overlay>
  );
};
