import { Heart, Plus, Sparkles, X } from 'lucide-react';
import { useWellnessHub } from '../../hooks/useWellnessHub';
import type { DailyAffirmationEntry } from '../../services/dailyAffirmations';
import { THOUGHT_PATTERNS_INFO } from '../../services/cbtThoughtReframing';

const MOOD_OPTIONS: { value: DailyAffirmationEntry['mood']; emoji: string; label: string }[] = [
  { value: 'great', emoji: '😄', label: 'Great' },
  { value: 'good', emoji: '🙂', label: 'Good' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'struggling', emoji: '😔', label: 'Struggling' },
];

const WellnessHub = () => {
  const {
    affirmation,
    mood,
    reflection,
    savedToday,
    recentEntries,
    showAddEntry,
    newSituation,
    newThought,
    newEmotion,
    newIntensity,
    setMood,
    setReflection,
    saveTodayEntry,
    setShowAddEntry,
    setNewSituation,
    setNewThought,
    setNewEmotion,
    setNewIntensity,
    submitThoughtEntry,
  } = useWellnessHub();

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Heart className="w-6 h-6 text-[var(--primary-accent)]" />
        <h1 className="text-2xl font-bold neon-text-primary">Wellness Hub</h1>
      </div>

      {/* Daily Affirmation Card */}
      <div className="glass-card p-5 rounded-2xl border border-[var(--glass-border)] space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--primary-accent)]" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Today's Affirmation</h2>
          <span className="ml-auto text-xs text-[var(--text-secondary)] capitalize px-2 py-0.5 rounded-full bg-white/10">
            {affirmation.category}
          </span>
        </div>

        <p className="text-[var(--text-primary)] text-base leading-relaxed italic">
          "{affirmation.text}"
        </p>

        {affirmation.reflection && (
          <p className="text-sm text-[var(--text-secondary)]">💭 {affirmation.reflection}</p>
        )}

        {/* Mood selector */}
        <div>
          <p className="text-sm text-[var(--text-secondary)] mb-2">How are you feeling today?</p>
          <div className="flex gap-2 flex-wrap">
            {MOOD_OPTIONS.map(({ value, emoji, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMood(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-all duration-200 ${
                  mood === value
                    ? 'glass-button text-white font-semibold'
                    : 'glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:scale-105'
                }`}
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reflection textarea */}
        <div>
          <label
            htmlFor="wellness-reflection"
            className="text-sm text-[var(--text-secondary)] block mb-1"
          >
            Reflection (optional)
          </label>
          <textarea
            id="wellness-reflection"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Write anything on your mind…"
            rows={2}
            className="w-full bg-white/5 border border-[var(--glass-border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] resize-none focus:outline-none focus:border-[var(--primary-accent)] transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={saveTodayEntry}
          disabled={savedToday && !mood && !reflection}
          className="glass-button px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {savedToday ? '✓ Saved today' : 'Save check-in'}
        </button>
      </div>

      {/* Thought Journal */}
      <div className="glass-card p-5 rounded-2xl border border-[var(--glass-border)] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Thought Journal</h2>
          <button
            type="button"
            onClick={() => setShowAddEntry(!showAddEntry)}
            className="glass-button p-2 rounded-xl hover:scale-105 transition-all duration-200"
            aria-label={showAddEntry ? 'Cancel' : 'Add thought entry'}
          >
            {showAddEntry ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>

        {/* Add entry form */}
        {showAddEntry && (
          <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-[var(--glass-border)]">
            <div>
              <label htmlFor="wh-situation" className="text-xs text-[var(--text-secondary)] block mb-1">
                Situation
              </label>
              <input
                id="wh-situation"
                type="text"
                value={newSituation}
                onChange={(e) => setNewSituation(e.target.value)}
                placeholder="What happened?"
                className="w-full bg-white/5 border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary-accent)]"
              />
            </div>
            <div>
              <label htmlFor="wh-thought" className="text-xs text-[var(--text-secondary)] block mb-1">
                Automatic thought
              </label>
              <input
                id="wh-thought"
                type="text"
                value={newThought}
                onChange={(e) => setNewThought(e.target.value)}
                placeholder="What went through your mind?"
                className="w-full bg-white/5 border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary-accent)]"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="wh-emotion" className="text-xs text-[var(--text-secondary)] block mb-1">
                  Emotion
                </label>
                <input
                  id="wh-emotion"
                  type="text"
                  value={newEmotion}
                  onChange={(e) => setNewEmotion(e.target.value)}
                  placeholder="e.g. anxious"
                  className="w-full bg-white/5 border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary-accent)]"
                />
              </div>
              <div className="w-28">
                <label htmlFor="wh-intensity" className="text-xs text-[var(--text-secondary)] block mb-1">
                  Intensity: {newIntensity}/10
                </label>
                <input
                  id="wh-intensity"
                  type="range"
                  min={1}
                  max={10}
                  value={newIntensity}
                  onChange={(e) => setNewIntensity(Number(e.target.value))}
                  className="w-full accent-[var(--primary-accent)] mt-2"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={submitThoughtEntry}
              disabled={!newSituation.trim() || !newThought.trim() || !newEmotion.trim()}
              className="glass-button px-4 py-2 rounded-xl text-sm font-medium hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save entry
            </button>
          </div>
        )}

        {/* Recent entries */}
        {recentEntries.length === 0 && !showAddEntry ? (
          <p className="text-sm text-[var(--text-secondary)] text-center py-4">
            No entries yet. Tap + to add your first thought.
          </p>
        ) : (
          <div className="space-y-2">
            {recentEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-xl bg-white/5 border border-[var(--glass-border)] space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[var(--text-secondary)]">
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-[var(--primary-accent)]">
                    {entry.emotion} {entry.emotionIntensity}/10
                  </span>
                </div>
                <p className="text-sm text-[var(--text-primary)] line-clamp-2">
                  {entry.automaticThought}
                </p>
                {entry.identifiedPattern && (
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-[var(--text-secondary)]">
                    {THOUGHT_PATTERNS_INFO[entry.identifiedPattern].name}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WellnessHub;
