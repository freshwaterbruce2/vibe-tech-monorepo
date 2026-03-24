/**
 * PersonalityConfig — Post-hatch voice & visual identity editor.
 *
 * Lets the operator fine-tune the channel personality that was
 * set during the Hatch Sequence. Edits voice config (formality,
 * pacing, emotion, perspective) and visual identity (colors,
 * typography, thumbnail style).
 */

import { useCallback, useState } from 'react';
import { useAVGEStore } from '../stores/avge-store';

/* ── Option Maps ── */

const VOICE_OPTIONS: Record<
  string,
  { label: string; choices: { value: string; label: string; desc: string }[] }
> = {
  formality: {
    label: 'Formality',
    choices: [
      { value: 'casual', label: 'Casual', desc: 'Conversational, like talking to a friend' },
      { value: 'professional', label: 'Professional', desc: 'Corporate, clean, authority-driven' },
      { value: 'academic', label: 'Academic', desc: 'Research-backed, precise vocabulary' },
      { value: 'street', label: 'Street', desc: 'Raw, unfiltered, culturally sharp' },
    ],
  },
  pacing: {
    label: 'Pacing',
    choices: [
      { value: 'fast-cut', label: 'Fast-Cut', desc: '< 3s per thought, rapid-fire' },
      { value: 'steady', label: 'Steady', desc: '5-8s beats, natural rhythm' },
      { value: 'cinematic', label: 'Cinematic', desc: 'Long holds, dramatic spacing' },
    ],
  },
  emotion: {
    label: 'Emotion',
    choices: [
      { value: 'energetic', label: 'Energetic', desc: 'High energy, hype-driven' },
      { value: 'calm', label: 'Calm', desc: 'Soothing, composed delivery' },
      { value: 'dramatic', label: 'Dramatic', desc: 'Tension and release, storytelling' },
      { value: 'witty', label: 'Witty', desc: 'Sharp humor, clever observations' },
    ],
  },
  perspective: {
    label: 'Perspective',
    choices: [
      { value: 'first-person', label: '1st Person', desc: '"I think…" — personal authority' },
      { value: 'second-person', label: '2nd Person', desc: '"You need…" — direct engagement' },
      { value: 'third-person', label: '3rd Person', desc: '"They discovered…" — narrator' },
    ],
  },
};

const TYPOGRAPHY_OPTIONS = [
  { value: 'modern-sans', label: 'Modern Sans', desc: 'Inter, Outfit — clean tech' },
  {
    value: 'editorial-serif',
    label: 'Editorial Serif',
    desc: 'Playfair, Merriweather — authority',
  },
  { value: 'display-bold', label: 'Display Bold', desc: 'Oswald, Impact — maximum contrast' },
  { value: 'mono-terminal', label: 'Mono Terminal', desc: 'JetBrains Mono — hacker aesthetic' },
];

const THUMBNAIL_STYLES = [
  { value: 'cinematic', label: 'Cinematic', desc: 'Wide shots, dramatic lighting' },
  { value: 'talking-head', label: 'Talking Head', desc: 'Face-forward, bold text overlay' },
  { value: 'graphic', label: 'Graphic', desc: 'Illustrated, abstract visuals' },
  { value: 'meme-format', label: 'Meme Format', desc: 'Text-heavy, reaction-style' },
];

/* ── Component ── */

export function PersonalityConfig() {
  const voiceConfig = useAVGEStore((s) => s.voiceConfig);
  const visualIdentity = useAVGEStore((s) => s.visualIdentity);
  const projectName = useAVGEStore((s) => s.projectName);
  const setVoiceConfig = useAVGEStore((s) => s.setVoiceConfig);
  const setVisualIdentity = useAVGEStore((s) => s.setVisualIdentity);
  const addLogEntry = useAVGEStore((s) => s.addLogEntry);

  const [tab, setTab] = useState<'voice' | 'visual'>('voice');
  const [colorInput, setColorInput] = useState('');

  const addColor = useCallback(
    (field: 'primaryColors' | 'accentColors') => {
      const hex = colorInput.trim();
      if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
      const current = visualIdentity[field];
      if (!current.includes(hex)) {
        setVisualIdentity({ [field]: [...current, hex] });
        addLogEntry(
          'info',
          `Added ${field === 'primaryColors' ? 'primary' : 'accent'} color: ${hex}`,
        );
      }
      setColorInput('');
    },
    [colorInput, visualIdentity, setVisualIdentity, addLogEntry],
  );

  const removeColor = useCallback(
    (field: 'primaryColors' | 'accentColors', hex: string) => {
      setVisualIdentity({ [field]: visualIdentity[field].filter((c) => c !== hex) });
    },
    [visualIdentity, setVisualIdentity],
  );

  return (
    <div className="glass-card" style={{ gridArea: 'personality' }}>
      {/* Header */}
      <div className="card-header">
        <span>🎭 Personality</span>
        {projectName && (
          <span className="mono" style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>
            {projectName}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: 'var(--space-3)' }}>
        <button
          className={`tab-btn ${tab === 'voice' ? 'active' : ''}`}
          onClick={() => setTab('voice')}
        >
          🎙️ Voice
        </button>
        <button
          className={`tab-btn ${tab === 'visual' ? 'active' : ''}`}
          onClick={() => setTab('visual')}
        >
          🎨 Visual
        </button>
      </div>

      {/* ── Voice Tab ── */}
      {tab === 'voice' && (
        <div className="personality-sections">
          {Object.entries(VOICE_OPTIONS).map(([key, group]) => (
            <div key={key} className="personality-group">
              <div className="personality-label">{group.label}</div>
              <div className="personality-choices">
                {group.choices.map((choice) => (
                  <button
                    key={choice.value}
                    className={`personality-chip ${voiceConfig[key as keyof typeof voiceConfig] === choice.value ? 'selected' : ''}`}
                    onClick={() => {
                      setVoiceConfig({ [key]: choice.value });
                      addLogEntry('info', `Voice ${group.label} → ${choice.label}`);
                    }}
                    title={choice.desc}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Voice Preview */}
          <div className="personality-preview">
            <span className="personality-label">Active Voice</span>
            <div
              className="mono"
              style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.6 }}
            >
              {voiceConfig.formality} · {voiceConfig.emotion} · {voiceConfig.pacing} ·{' '}
              {voiceConfig.perspective}
            </div>
          </div>
        </div>
      )}

      {/* ── Visual Tab ── */}
      {tab === 'visual' && (
        <div className="personality-sections">
          {/* Colors */}
          <div className="personality-group">
            <div className="personality-label">Primary Colors</div>
            <div className="color-swatches">
              {visualIdentity.primaryColors.map((hex) => (
                <button
                  key={hex}
                  className="color-swatch"
                  style={{ background: hex }}
                  onClick={() => removeColor('primaryColors', hex)}
                  title={`${hex} — click to remove`}
                />
              ))}
            </div>
          </div>

          <div className="personality-group">
            <div className="personality-label">Accent Colors</div>
            <div className="color-swatches">
              {visualIdentity.accentColors.map((hex) => (
                <button
                  key={hex}
                  className="color-swatch"
                  style={{ background: hex }}
                  onClick={() => removeColor('accentColors', hex)}
                  title={`${hex} — click to remove`}
                />
              ))}
            </div>
          </div>

          {/* Add color */}
          <div className="personality-group">
            <div className="personality-label">Add Color</div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                className="hatch-input"
                type="text"
                placeholder="#ff6b2b"
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addColor('primaryColors')}
                maxLength={7}
                style={{ flex: 1 }}
              />
              <button className="tab-btn" onClick={() => addColor('primaryColors')}>
                1°
              </button>
              <button className="tab-btn" onClick={() => addColor('accentColors')}>
                Acc
              </button>
            </div>
          </div>

          {/* Typography */}
          <div className="personality-group">
            <div className="personality-label">Typography</div>
            <div className="personality-choices">
              {TYPOGRAPHY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`personality-chip ${visualIdentity.typography === opt.value ? 'selected' : ''}`}
                  onClick={() => {
                    setVisualIdentity({ typography: opt.value });
                    addLogEntry('info', `Typography → ${opt.label}`);
                  }}
                  title={opt.desc}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Thumbnail Style */}
          <div className="personality-group">
            <div className="personality-label">Thumbnail Style</div>
            <div className="personality-choices">
              {THUMBNAIL_STYLES.map((opt) => (
                <button
                  key={opt.value}
                  className={`personality-chip ${visualIdentity.thumbnailStyle === opt.value ? 'selected' : ''}`}
                  onClick={() => {
                    setVisualIdentity({ thumbnailStyle: opt.value });
                    addLogEntry('info', `Thumbnail → ${opt.label}`);
                  }}
                  title={opt.desc}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
