import { Clock, Lock, Palette, Save, Shield, Unlock, X } from 'lucide-react';
import { useState } from 'react';

import { appStore } from '../../utils/electronStore';

interface ParentRulesPageProps {
  onClose?: () => void;
}

interface ParentRulesState {
  firstThenEnabled: boolean;
  firstThenSteps: number;
  dailyCapEnabled: boolean;
  dailyGameMinutes: number;
  dailyTotalMinutes: number;
  calmModeEnabled: boolean;
  animationLevel: 'none' | 'reduced' | 'normal';
  soundsEnabled: boolean;
  scheduleRequired: boolean;
}

function getInitialParentRulesState(): ParentRulesState {
  const firstThen = appStore.get('firstThenEnabled');
  const firstThenStepsVal = appStore.get('firstThenSteps');
  const dailyCap = appStore.get('dailyCapEnabled');
  const gameMinutes = appStore.get('dailyGameMinutes');
  const totalMinutes = appStore.get('dailyTotalMinutes');
  const calmMode = appStore.get('calmModeEnabled');
  const animLevel = appStore.get('animationLevel');
  const sounds = appStore.get('soundsEnabled');
  const scheduleReq = appStore.get('scheduleRequired');

  const animationLevel =
    animLevel === 'none' || animLevel === 'normal' || animLevel === 'reduced'
      ? animLevel
      : 'reduced';

  return {
    firstThenEnabled: firstThen !== null ? firstThen === 'true' : true,
    firstThenSteps: firstThenStepsVal ? Number.parseInt(firstThenStepsVal, 10) || 3 : 3,
    dailyCapEnabled: dailyCap !== null ? dailyCap === 'true' : false,
    dailyGameMinutes: gameMinutes ? Number.parseInt(gameMinutes, 10) || 60 : 60,
    dailyTotalMinutes: totalMinutes ? Number.parseInt(totalMinutes, 10) || 180 : 180,
    calmModeEnabled: calmMode !== null ? calmMode === 'true' : true,
    animationLevel,
    soundsEnabled: sounds !== null ? sounds === 'true' : true,
    scheduleRequired: scheduleReq !== null ? scheduleReq === 'true' : true,
  };
}

const ParentRulesPage = ({ onClose }: ParentRulesPageProps) => {
  const [initialRules] = useState<ParentRulesState>(() => getInitialParentRulesState());
  // First-Then gate
  const [firstThenEnabled, setFirstThenEnabled] = useState(initialRules.firstThenEnabled);
  const [firstThenSteps, setFirstThenSteps] = useState(initialRules.firstThenSteps);

  // Daily caps
  const [dailyCapEnabled, setDailyCapEnabled] = useState(initialRules.dailyCapEnabled);
  const [dailyGameMinutes, setDailyGameMinutes] = useState(initialRules.dailyGameMinutes);
  const [dailyTotalMinutes, setDailyTotalMinutes] = useState(initialRules.dailyTotalMinutes);

  // Calm mode
  const [calmModeEnabled, setCalmModeEnabled] = useState(initialRules.calmModeEnabled);
  const [animationLevel, setAnimationLevel] = useState<'none' | 'reduced' | 'normal'>(
    initialRules.animationLevel,
  );
  const [soundsEnabled, setSoundsEnabled] = useState(initialRules.soundsEnabled);

  // Schedule requirements
  const [scheduleRequired, setScheduleRequired] = useState(initialRules.scheduleRequired);

  const handleSave = () => {
    try {
      // Save to localStorage
      appStore.set('firstThenEnabled', String(firstThenEnabled));
      appStore.set('firstThenSteps', String(firstThenSteps));
      appStore.set('dailyCapEnabled', String(dailyCapEnabled));
      appStore.set('dailyGameMinutes', String(dailyGameMinutes));
      appStore.set('dailyTotalMinutes', String(dailyTotalMinutes));
      appStore.set('calmModeEnabled', String(calmModeEnabled));
      appStore.set('animationLevel', animationLevel);
      appStore.set('soundsEnabled', String(soundsEnabled));
      appStore.set('scheduleRequired', String(scheduleRequired));

      // Update sensory preferences for calm mode
      const sensoryPrefs = appStore.get<Record<string, unknown>>('sensory-prefs') ?? {};
      sensoryPrefs.animationSpeed = animationLevel;
      sensoryPrefs.soundEnabled = soundsEnabled;
      appStore.set('sensory-prefs', JSON.stringify(sensoryPrefs));

      alert('Rules saved successfully!');
      if (onClose) onClose();
    } catch (error) {
      console.error('Failed to save parent rules:', error);
      alert('Failed to save rules. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="glass-card p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Parent Controls</h1>
                <p className="text-white/70">Manage rules and preferences</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Close parent controls"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>
            )}
          </div>

          <div className="space-y-6">
            {/* First-Then Gate */}
            <div className="glass-card p-5 bg-white/5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {firstThenEnabled ? (
                    <Lock className="w-6 h-6 text-fuchsia-400" />
                  ) : (
                    <Unlock className="w-6 h-6 text-red-400" />
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-white">First-Then Gate</h3>
                    <p className="text-sm text-white/60">
                      Require routine steps before Brain Games
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setFirstThenEnabled(!firstThenEnabled)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    firstThenEnabled
                      ? 'bg-violet-600 hover:bg-violet-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {firstThenEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {firstThenEnabled && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <label
                    htmlFor="first-then-steps"
                    className="block text-sm font-semibold text-white/80 mb-2"
                  >
                    Steps Required Before Unlock
                  </label>
                  <input
                    id="first-then-steps"
                    type="number"
                    value={firstThenSteps}
                    onChange={(e) => setFirstThenSteps(parseInt(e.target.value, 10) || 0)}
                    min="1"
                    max="10"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-white/50 mt-1">
                    Child must complete {firstThenSteps} routine step
                    {firstThenSteps !== 1 ? 's' : ''} to unlock games
                  </p>
                </div>
              )}
            </div>

            {/* Daily Caps */}
            <div className="glass-card p-5 bg-white/5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-cyan-400" />
                  <div>
                    <h3 className="text-lg font-bold text-white">Daily Time Limits</h3>
                    <p className="text-sm text-white/60">Set maximum daily usage</p>
                  </div>
                </div>
                <button
                  onClick={() => setDailyCapEnabled(!dailyCapEnabled)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    dailyCapEnabled
                      ? 'bg-violet-600 hover:bg-violet-700'
                      : 'bg-gray-600 hover:bg-gray-700'
                  }`}
                >
                  {dailyCapEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {dailyCapEnabled && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                  <div>
                    <label
                      htmlFor="daily-game-minutes"
                      className="block text-sm font-semibold text-white/80 mb-2"
                    >
                      Daily Game Time (minutes)
                    </label>
                    <input
                      id="daily-game-minutes"
                      type="number"
                      value={dailyGameMinutes}
                      onChange={(e) => setDailyGameMinutes(parseInt(e.target.value, 10) || 0)}
                      min="15"
                      max="240"
                      step="15"
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="daily-total-minutes"
                      className="block text-sm font-semibold text-white/80 mb-2"
                    >
                      Daily Total Time (minutes)
                    </label>
                    <input
                      id="daily-total-minutes"
                      type="number"
                      value={dailyTotalMinutes}
                      onChange={(e) => setDailyTotalMinutes(parseInt(e.target.value, 10) || 0)}
                      min="30"
                      max="480"
                      step="30"
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Calm Mode */}
            <div className="glass-card p-5 bg-white/5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Palette className="w-6 h-6 text-purple-400" />
                  <div>
                    <h3 className="text-lg font-bold text-white">Calm Mode (Sensory Friendly)</h3>
                    <p className="text-sm text-white/60">Reduce stimulation for focus</p>
                  </div>
                </div>
                <button
                  onClick={() => setCalmModeEnabled(!calmModeEnabled)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    calmModeEnabled
                      ? 'bg-violet-600 hover:bg-violet-700'
                      : 'bg-gray-600 hover:bg-gray-700'
                  }`}
                >
                  {calmModeEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {calmModeEnabled && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-white/80 mb-2">
                      Animation Level
                    </label>
                    <select
                      aria-label="Animation level"
                      value={animationLevel}
                      onChange={(e) =>
                        setAnimationLevel(e.target.value as 'none' | 'reduced' | 'normal')
                      }
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="none">None (Most calming)</option>
                      <option value="reduced">Reduced (Recommended)</option>
                      <option value="normal">Normal</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-white/80">Sound Effects</label>
                    <button
                      onClick={() => setSoundsEnabled(!soundsEnabled)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        soundsEnabled
                          ? 'bg-cyan-600 hover:bg-cyan-700'
                          : 'bg-gray-600 hover:bg-gray-700'
                      }`}
                    >
                      {soundsEnabled ? 'On' : 'Off'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Schedule Required */}
            <div className="glass-card p-5 bg-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Require Active Schedule</h3>
                  <p className="text-sm text-white/60">
                    Child must have a morning or evening schedule set up
                  </p>
                </div>
                <button
                  onClick={() => setScheduleRequired(!scheduleRequired)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    scheduleRequired
                      ? 'bg-violet-600 hover:bg-violet-700'
                      : 'bg-gray-600 hover:bg-gray-700'
                  }`}
                >
                  {scheduleRequired ? 'Required' : 'Optional'}
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 flex justify-end gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-bold transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-lg font-bold hover:scale-105 transition-transform"
            >
              <Save className="w-5 h-5" />
              Save Rules
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentRulesPage;
