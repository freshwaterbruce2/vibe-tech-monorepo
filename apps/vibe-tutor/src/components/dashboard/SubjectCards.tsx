import {
  Atom,
  BookOpen,
  Clock,
  Heart,
  PlayCircle,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BLAKE_CONFIG } from '../../config/blakeConfig';
import { getAllProgress } from '../../services/progressionService';
import { getTodayEarnings } from '../../services/tokenService';
import type { SubjectProgress, SubjectType } from '../../types';

interface SubjectCardsProps {
  onStartWorksheet: (subject: SubjectType) => void;
  userTokens: number;
}

const CARD_CONFIG: Record<SubjectType, { icon: typeof Zap; color: string; bgColor: string }> = {
  Math: { icon: Zap, color: 'from-yellow-500 to-orange-500', bgColor: 'bg-yellow-500/10' },
  Science: { icon: Atom, color: 'from-green-500 to-emerald-500', bgColor: 'bg-green-500/10' },
  History: { icon: Clock, color: 'from-purple-500 to-pink-500', bgColor: 'bg-purple-500/10' },
  Bible: { icon: Heart, color: 'from-pink-500 to-rose-500', bgColor: 'bg-pink-500/10' },
  'Language Arts': {
    icon: BookOpen,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
  },
};

const SUBJECTS: SubjectType[] = ['Math', 'Science', 'History', 'Bible', 'Language Arts'];

/** Render n stars: filled up to `filledCount`, the rest gray */
function Stars({
  filled,
  total = 5,
  size = 20,
}: {
  filled: number;
  total?: number;
  size?: number;
}) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: total }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={i < filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}
        />
      ))}
    </div>
  );
}

const SubjectCards = ({ onStartWorksheet, userTokens }: SubjectCardsProps) => {
  const [allProgress, setAllProgress] = useState<Partial<Record<SubjectType, SubjectProgress>>>({});
  const todayEarnings = getTodayEarnings();

  useEffect(() => {
    const load = async () => {
      try {
        const progress = await getAllProgress();
        setAllProgress(progress);
      } catch (error) {
        console.error('[SubjectCards] Failed to load progress:', error);
      }
    };
    void load();
  }, []);

  // Pick today's daily challenge from blakeConfig (rotate by day-of-year, stable per mount)
  const [dailyChallenge] = useState(() => {
    const challenges = BLAKE_CONFIG.dailyChallenges;
    if (!challenges || challenges.length === 0) {
      return { task: 'Complete any quest today!', reward: 10 };
    }
    const dayIndex = Math.floor(Date.now() / 86_400_000) % challenges.length;
    return challenges[dayIndex]!;
  });

  // Count today's total worksheets completed across all subjects
  const todayWorksheets = useMemo(() => {
    return Object.values(allProgress).reduce(
      (sum, p) => sum + (p?.totalWorksheetsCompleted ?? 0),
      0,
    );
  }, [allProgress]);

  return (
    <div className="min-h-screen p-4 md:p-8 pb-36 md:pb-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-900/20 via-[#0a0f1c] to-[#0a0f1c]">
      {/* Header — Gaming Style */}
      <div className="text-center mb-8 md:mb-12">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
          <Trophy size={40} className="text-yellow-500 animate-bounce" />
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 drop-shadow-lg tracking-wide">
            Learning Realms
          </h1>
          <Sparkles size={32} className="text-purple-500 animate-pulse" />
        </div>
        <p className="text-gray-300 font-medium text-base md:text-lg px-4">
          Embark on epic quests to earn stars, collect tokens, and level up! 🚀
        </p>

        {/* Token Balance HUD */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
          <div className="glass-card px-5 py-2.5 rounded-full flex items-center gap-2 border-[1px] border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
            <span className="text-2xl animate-pulse">🪙</span>
            <span className="font-black text-xl text-yellow-400 tracking-wider">{userTokens}</span>
            <span className="text-sm font-bold tracking-widest uppercase text-gray-400">Tokens</span>
          </div>
          {todayEarnings > 0 && (
            <div className="glass-card px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs">
              <TrendingUp size={14} className="text-green-400" />
              <span className="text-green-400 font-medium">+{todayEarnings} today</span>
            </div>
          )}
        </div>
      </div>

      {/* Subject Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {SUBJECTS.map((subject) => {
          const progress = allProgress[subject];
          const config = CARD_CONFIG[subject];
          const Icon = config.icon;

          if (!progress) return null;

          const starsToNextLevel = 5 - progress.starsCollected;
          const progressPct = (progress.starsCollected / 5) * 100;
          const isMaxLevel =
            progress.currentDifficulty === 'Master' && progress.starsCollected >= 5;

          return (
            <div
              key={subject}
              className={`relative group glass-card p-6 md:p-8 rounded-3xl border-2 border-[var(--glass-border)] hover:border-yellow-500/70 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(234,179,8,0.3)] ${config.bgColor}`}
            >
              {/* Subject Icon & Name */}
              <div className="text-center mb-5">
                <div
                  className={`inline-flex p-5 rounded-3xl bg-gradient-to-br ${config.color} mb-4 shadow-xl group-hover:scale-110 transition-transform duration-300 group-hover:rotate-3`}
                >
                  <Icon size={48} className="text-white drop-shadow-md" />
                </div>
                <h3
                  className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${config.color}`}
                >
                  {subject}
                </h3>
              </div>

              {/* Difficulty Badge */}
              <div className="text-center mb-4">
                <span
                  className={`inline-block px-4 py-1.5 rounded-full bg-gradient-to-r ${config.color} text-white text-sm font-bold shadow-sm`}
                >
                  {progress.currentDifficulty} Level
                </span>
              </div>

              {/* Stars Display */}
              <div className="mb-4">
                <div className="flex justify-center mb-2">
                  <Stars filled={progress.starsCollected} size={24} />
                </div>
                <p className="text-center text-sm text-gray-400">
                  {isMaxLevel
                    ? '🌟 Max Level!'
                    : `${starsToNextLevel} star${starsToNextLevel !== 1 ? 's' : ''} to next level`}
                </p>
              </div>

              {/* Progress Bar */}
              {!isMaxLevel && (
                <div className="mb-4">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${config.color} transition-all duration-500 progress-bar-fill`}
                      style={{ '--bar-width': `${progressPct}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="space-y-1.5 mb-4 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Quests</span>
                  <span className="font-bold text-white">{progress.totalWorksheetsCompleted}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Avg Score</span>
                  <span className="font-bold text-white">
                    {globalThis.Math.round(progress.averageScore)}%
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Best</span>
                  <span className="font-bold text-white">
                    {globalThis.Math.round(progress.bestScore)}%
                  </span>
                </div>
                {progress.currentStreak > 0 && (
                  <div className="flex justify-between text-gray-400">
                    <span>Streak</span>
                    <span className="font-bold text-orange-400">{progress.currentStreak} 🔥</span>
                  </div>
                )}
              </div>

              {/* Motivational Message */}
              <div className="mb-4 p-2.5 bg-white/5 rounded-lg border border-white/10">
                <p className="text-xs text-center text-gray-400">
                  {isMaxLevel
                    ? "🌟 You're a master! Try another subject!"
                    : progress.starsCollected === 0
                      ? '🚀 Start your journey!'
                      : starsToNextLevel === 1
                        ? '🎯 One more star to level up!'
                        : '💪 Keep practicing!'}
                </p>
              </div>

              {/* Start Worksheet Button */}
              <button
                onClick={() => onStartWorksheet(subject)}
                className={`w-full px-6 py-4 rounded-2xl font-black text-xl flex items-center justify-center gap-3 active:scale-95 transition-all bg-gradient-to-r ${config.color} shadow-lg hover:shadow-xl hover:brightness-110 text-white touch-manipulation group-hover:animate-pulse`}
              >
                <PlayCircle size={28} className="drop-shadow-sm" />
                <span className="tracking-wide text-shadow-sm">Enter Realm!</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Real Daily Challenge Banner */}
      <div className="mt-10 max-w-4xl mx-auto px-2 md:px-0">
        <div className="glass-card p-4 md:p-6 rounded-2xl border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-4xl md:text-5xl shrink-0">🎯</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg md:text-xl font-bold text-yellow-400 mb-1 truncate">Daily Challenge</h3>
              <p className="text-white text-xs md:text-base mb-3 break-words">{dailyChallenge.task}</p>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-500 progress-bar-fill"
                    style={
                      {
                        '--bar-width': `${Math.min((todayWorksheets / 3) * 100, 100)}%`,
                      } as React.CSSProperties
                    }
                  />
                </div>
                <span className="text-sm font-medium text-gray-300">
                  {Math.min(todayWorksheets, 3)}/3
                </span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">+{dailyChallenge.reward}</div>
              <div className="text-xs text-gray-400">tokens</div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="mt-10 max-w-4xl mx-auto glass-card p-6 rounded-xl">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Sparkles size={20} className="text-yellow-500" />
          How It Works
        </h3>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li className="flex items-start gap-2">
            <Star className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
            <span>Complete 10-question quests to earn 1–5 stars based on your score</span>
          </li>
          <li className="flex items-start gap-2">
            <TrendingUp className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
            <span>Collect 5 stars to explore new zones and unlock harder challenges</span>
          </li>
          <li className="flex items-start gap-2">
            <Trophy className="text-purple-500 flex-shrink-0 mt-0.5" size={16} />
            <span>Difficulty tiers: Beginner → Intermediate → Advanced → Expert → Master</span>
          </li>
          <li className="flex items-start gap-2">
            <PlayCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
            <span>Practice makes perfect! Embark on as many quests as you want</span>
          </li>
        </ul>

        {/* Star Rating Guide — collapsed with loop */}
        <div className="mt-5 pt-5 border-t border-white/10">
          <h4 className="font-bold mb-3 text-white text-sm">Star Rating Guide</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {[
              { filled: 5, label: '90–100%' },
              { filled: 4, label: '80–89%' },
              { filled: 3, label: '70–79%' },
              { filled: 2, label: '60–69%' },
              { filled: 1, label: '50–59%' },
            ].map(({ filled, label }) => (
              <div key={filled} className="flex items-center gap-2">
                <Stars filled={filled} size={14} />
                <span className="text-gray-400">
                  {label} = {filled} star{filled !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubjectCards;
