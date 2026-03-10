import { Eye, Palette, RotateCcw, Smartphone, Type, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { appStore } from '../../utils/electronStore';

interface SensoryPreferences {
  animationSpeed: 'normal' | 'reduced' | 'none';
  soundEnabled: boolean;
  hapticEnabled: boolean;
  fontSize: 'small' | 'medium' | 'large';
  dyslexiaFont: boolean;
  colorMode: 'default' | 'high-contrast' | 'warm' | 'cool';
}

const DEFAULTS: SensoryPreferences = {
  animationSpeed: 'normal',
  soundEnabled: true,
  hapticEnabled: true,
  fontSize: 'medium',
  dyslexiaFont: false,
  colorMode: 'default',
};

function Toggle({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={enabled ? 'true' : 'false'}
      aria-label={label}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-emerald-500' : 'bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex gap-1 bg-black/20 rounded-lg p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          role="radio"
          aria-checked={opt.value === value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            opt.value === value
              ? 'bg-emerald-500/80 text-white shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const SensorySettings = () => {
  const [prefs, setPrefs] = useState<SensoryPreferences>(() => {
    const saved = appStore.get<SensoryPreferences>('sensory-prefs');
    return saved ?? { ...DEFAULTS };
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-animation-speed', prefs.animationSpeed);
    root.setAttribute('data-font-size', prefs.fontSize);
    root.setAttribute('data-color-mode', prefs.colorMode);
    document.body.classList.toggle('dyslexia-font', prefs.dyslexiaFont);

    appStore.set('sensory-prefs', JSON.stringify(prefs));
  }, [prefs]);

  const isDefaults = useMemo(() => JSON.stringify(prefs) === JSON.stringify(DEFAULTS), [prefs]);

  const update = <K extends keyof SensoryPreferences>(key: K, val: SensoryPreferences[K]) =>
    setPrefs((p) => ({ ...p, [key]: val }));

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header — no animations on the sensory page */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="w-6 h-6 text-emerald-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">Sensory Settings</h2>
            <p className="text-sm text-gray-400">Customize the experience for comfort</p>
          </div>
        </div>
        {!isDefaults && (
          <button
            onClick={() => setPrefs({ ...DEFAULTS })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            title="Reset to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* Animation Speed */}
      <div className="glass-card p-5 rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-400" />
          <h3 className="font-medium text-white">Animation Speed</h3>
        </div>
        <p className="text-sm text-gray-400">Reduce or disable animations and transitions</p>
        <SegmentedControl
          ariaLabel="Animation speed"
          options={[
            { value: 'normal' as const, label: 'Normal' },
            { value: 'reduced' as const, label: 'Reduced' },
            { value: 'none' as const, label: 'None' },
          ]}
          value={prefs.animationSpeed}
          onChange={(v) => update('animationSpeed', v)}
        />
      </div>

      {/* Sound & Haptics */}
      <div className="glass-card p-5 rounded-xl space-y-4">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-amber-400" />
          <h3 className="font-medium text-white">Sound & Haptics</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm">Sound Effects</p>
            <p className="text-xs text-gray-500">UI sounds and notifications</p>
          </div>
          <Toggle
            enabled={prefs.soundEnabled}
            onToggle={() => update('soundEnabled', !prefs.soundEnabled)}
            label="Sound effects"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm">Haptic Feedback</p>
            <p className="text-xs text-gray-500">Vibration on interactions</p>
          </div>
          <Toggle
            enabled={prefs.hapticEnabled}
            onToggle={() => update('hapticEnabled', !prefs.hapticEnabled)}
            label="Haptic feedback"
          />
        </div>
      </div>

      {/* Font Size */}
      <div className="glass-card p-5 rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-violet-400" />
          <h3 className="font-medium text-white">Typography</h3>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-400 mb-2">Font Size</p>
            <SegmentedControl
              ariaLabel="Font size"
              options={[
                { value: 'small' as const, label: 'Small' },
                { value: 'medium' as const, label: 'Medium' },
                { value: 'large' as const, label: 'Large' },
              ]}
              value={prefs.fontSize}
              onChange={(v) => update('fontSize', v)}
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-white text-sm">Dyslexia-Friendly Font</p>
              <p className="text-xs text-gray-500">Uses OpenDyslexic typeface</p>
            </div>
            <Toggle
              enabled={prefs.dyslexiaFont}
              onToggle={() => update('dyslexiaFont', !prefs.dyslexiaFont)}
              label="Dyslexia-friendly font"
            />
          </div>
        </div>
      </div>

      {/* Color Mode */}
      <div className="glass-card p-5 rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-pink-400" />
          <h3 className="font-medium text-white">Color Mode</h3>
        </div>
        <p className="text-sm text-gray-400">Adjust colors for visual comfort</p>
        <SegmentedControl
          ariaLabel="Color mode"
          options={[
            { value: 'default' as const, label: 'Default' },
            { value: 'high-contrast' as const, label: 'High Contrast' },
            { value: 'warm' as const, label: 'Warm' },
            { value: 'cool' as const, label: 'Cool' },
          ]}
          value={prefs.colorMode}
          onChange={(v) => update('colorMode', v)}
        />
      </div>

      {/* Live Preview */}
      <div className="glass-card p-5 rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <h3 className="font-medium text-white">Live Preview</h3>
        </div>
        <div className="bg-black/20 rounded-lg p-4 space-y-2 border border-white/5">
          <p className="text-white font-medium">How does this look?</p>
          <p className="text-gray-300 text-sm">
            This text updates in real time as you change font size, color mode, and dyslexia font
            above. Try changing each setting to see the effect here.
          </p>
          <div className="flex gap-2 pt-1">
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">
              {prefs.fontSize}
            </span>
            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs">
              {prefs.colorMode}
            </span>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
              {prefs.animationSpeed}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SensorySettings;
