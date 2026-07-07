/**
 * Theme picker — a grid of curated TextMate preset themes (spec 01, AC #1) plus
 * a "Custom JSON" entry that routes to the existing custom-theme import flow.
 * Phase 2 (AC #2): a VS Code theme `.json` can be file-picked via "Import
 * theme…" or dropped onto the Custom JSON card; parse failures show an inline
 * error and leave the current theme untouched (AC #8).
 * Presentational + controlled: it renders from the registry and reports the
 * chosen theme id via `onChange` / imported themes via `onImport`; persistence
 * lives in the parent Settings panel.
 */

import { useRef, useState } from 'react';

import type { ThemeImportResult } from '../../services/theme/ThemeImporter';

import { importVSCodeThemeFile, ThemeImportError } from '../../services/theme/ThemeImporter';
import { THEME_PRESETS } from '../../services/theme/ThemeRegistry';

export interface ThemeSectionProps {
  /** Currently selected theme id (a preset id or `'custom'`). */
  value: string;
  /** Called with the chosen theme id when a card is activated. */
  onChange: (themeId: string) => void;
  /** Called with the parsed theme after a successful VS Code JSON import. */
  onImport?: (result: ThemeImportResult) => void;
}

const CUSTOM_ID = 'custom';

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: '8px',
  width: '100%',
};

function cardStyle(selected: boolean, type: 'dark' | 'light'): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '10px',
    borderRadius: '6px',
    cursor: 'pointer',
    textAlign: 'left',
    border: selected ? '1px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)',
    background: type === 'light' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.25)',
    outline: selected ? '1px solid #8b5cf6' : 'none',
  };
}

const badgeStyle: React.CSSProperties = {
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '#9ca3af',
};

const PREVIEW = 'const vibe = () => 42;';

const importButtonStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  padding: '6px 12px',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.06)',
  color: '#e5e7eb',
  fontSize: '12px',
  cursor: 'pointer',
};

export const ThemeSection = ({ value, onChange, onImport }: ThemeSectionProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleThemeFile = async (file: File) => {
    try {
      const result = await importVSCodeThemeFile(file);
      setImportError(null);
      onImport?.(result);
    } catch (error) {
      const message =
        error instanceof ThemeImportError ? error.message : 'Could not read theme file';
      setImportError(message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      <div style={gridStyle} role="listbox" aria-label="Editor theme">
        {THEME_PRESETS.map(preset => {
          const selected = preset.id === value;
          return (
            <button
              key={preset.id}
              type="button"
              role="option"
              aria-selected={selected}
              aria-label={`${preset.label} theme`}
              onClick={() => onChange(preset.id)}
              style={cardStyle(selected, preset.type)}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>
                {preset.label}
              </span>
              <code style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace' }}>
                {PREVIEW}
              </code>
              <span style={badgeStyle}>{preset.type}</span>
            </button>
          );
        })}
        <button
          key={CUSTOM_ID}
          type="button"
          role="option"
          aria-selected={value === CUSTOM_ID}
          aria-label="Custom JSON theme"
          onClick={() => onChange(CUSTOM_ID)}
          onDragOver={event => event.preventDefault()}
          onDrop={event => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (file) {
              void handleThemeFile(file);
            }
          }}
          style={cardStyle(value === CUSTOM_ID, 'dark')}
        >
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>Custom JSON</span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Import or drop a VS Code theme</span>
          <span style={badgeStyle}>custom</span>
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          aria-label="Theme file"
          style={{ display: 'none' }}
          onChange={event => {
            const file = event.target.files?.[0];
            if (file) {
              void handleThemeFile(file);
            }
            event.target.value = '';
          }}
        />
        <button
          type="button"
          style={importButtonStyle}
          onClick={() => fileInputRef.current?.click()}
        >
          Import theme…
        </button>
        {importError && (
          <span role="alert" style={{ fontSize: '12px', color: '#f87171' }}>
            {importError}
          </span>
        )}
      </div>
    </div>
  );
};

export default ThemeSection;
