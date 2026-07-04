/**
 * Theme picker — a grid of curated TextMate preset themes (spec 01, AC #1) plus
 * a "Custom JSON" entry that routes to the existing custom-theme import flow.
 * Presentational + controlled: it renders from the registry and reports the
 * chosen theme id via `onChange`; persistence lives in the parent Settings panel.
 */

import { THEME_PRESETS } from '../../services/theme/ThemeRegistry';

export interface ThemeSectionProps {
  /** Currently selected theme id (a preset id or `'custom'`). */
  value: string;
  /** Called with the chosen theme id when a card is activated. */
  onChange: (themeId: string) => void;
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

export const ThemeSection = ({ value, onChange }: ThemeSectionProps) => {
  return (
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
        style={cardStyle(value === CUSTOM_ID, 'dark')}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>Custom JSON</span>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>Import a VS Code theme</span>
        <span style={badgeStyle}>custom</span>
      </button>
    </div>
  );
};

export default ThemeSection;
