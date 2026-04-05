import { ArrowLeft, CheckCircle2, Gift, Lock, Sparkles, Star, Target, Trophy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Achievement, ClaimedReward, Reward } from '../../types';

interface AchievementCenterProps {
  achievements: Achievement[];
  rewards: Reward[];
  claimedRewards: ClaimedReward[];
  userTokens: number;
  onClaimReward: (rewardId: string) => boolean;
  onClose?: () => void;
}

/* ─── Animated count-up hook ─── */
function useCountUp(target: number, durationMs = 800) {
  const [value, setValue] = useState(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [target, durationMs]);

  return value;
}

/* ─── Badge sub-component ─── */
function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const { icon: Icon, name, description, unlocked, progress, goal } = achievement;
  const pct = goal && progress ? Math.round((progress / goal) * 100) : 0;

  return (
    <div
      className={`relative rounded-2xl p-5 transition-all duration-300 border ${
        unlocked
          ? 'bg-gradient-to-br from-[var(--token-color)]/10 to-[var(--quaternary-accent)]/10 border-[var(--token-color)]/40 shadow-lg shadow-[var(--token-color)]/20'
          : 'bg-slate-800/40 border-slate-700/40 opacity-75'
      }`}
    >
      {/* Unlocked glow */}
      {unlocked && (
        <div className="absolute -top-1 -right-1">
          <CheckCircle2 className="w-6 h-6 text-[var(--token-color)] drop-shadow-lg" />
        </div>
      )}
      <div className="flex items-start gap-4">
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
            unlocked
              ? 'bg-gradient-to-br from-[var(--token-color)]/30 to-[var(--quaternary-accent)]/30 shadow-inner'
              : 'bg-slate-700/60'
          }`}
        >
          <Icon className={`w-7 h-7 ${unlocked ? 'text-[var(--token-color)]' : 'text-slate-500'}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className={`font-bold text-base leading-tight ${
              unlocked ? 'text-[var(--token-color)]' : 'text-slate-300'
            }`}
          >
            {name}
          </h3>
          <p className="text-sm text-slate-400 mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
      {/* Progress bar for locked achievements */}
      {!unlocked && goal && progress !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{pct}% complete</span>
            <span>
              {progress}/{goal}
            </span>
          </div>
          <div className="w-full bg-slate-700/60 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-[var(--token-color)] to-[var(--quaternary-accent)] h-2 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Reward card ─── */
function RewardCard({
  reward,
  tokens,
  onClaim,
}: {
  reward: Reward;
  tokens: number;
  onClaim: (id: string) => boolean;
}) {
  const canClaim = tokens >= reward.cost;
  const [justClaimed, setJustClaimed] = useState(false);

  const handleClaim = () => {
    if (onClaim(reward.id)) setJustClaimed(true);
  };

  return (
    <div className="rounded-2xl p-5 bg-slate-800/40 border border-slate-700/40 flex items-center justify-between transition-all duration-300 hover:border-[var(--success-accent)]/40">
      <div>
        <h3 className="text-lg font-bold text-slate-200">{reward.name}</h3>
        <p className="text-sm text-[var(--success-accent)] font-semibold">{reward.cost} Tokens</p>
      </div>
      {justClaimed ? (
        <div className="flex items-center gap-1.5 text-fuchsia-400 font-semibold text-sm">
          <CheckCircle2 className="w-5 h-5" /> Claimed!
        </div>
      ) : (
        <button
          onClick={handleClaim}
          disabled={!canClaim}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white hover:shadow-lg hover:shadow-purple-500/20"
        >
          Claim
        </button>
      )}
    </div>
  );
}

/* ─── Main component ─── */
const AchievementCenter = ({
  achievements,
  rewards,
  onClaimReward,
  claimedRewards,
  userTokens,
  onClose,
}: AchievementCenterProps) => {
  const [activeTab, setActiveTab] = useState<'achievements' | 'rewards'>('achievements');
  const tokens = userTokens;
  const animatedPoints = useCountUp(tokens);

  const unlockedAchievements = achievements.filter((a) => a.unlocked);
  const lockedAchievements = achievements.filter((a) => !a.unlocked);
  const availableRewards = rewards.filter((r) => !claimedRewards.some((cr) => cr.id === r.id));

  const motivationalMsg =
    unlockedAchievements.length >= 10
      ? "🌟 You're an achievement legend!"
      : unlockedAchievements.length >= 5
        ? '🔥 On fire! Keep unlocking!'
        : unlockedAchievements.length > 0
          ? '⭐ Great start — keep going!'
          : '🚀 Start your journey!';

  const tabs = [
    {
      key: 'achievements' as const,
      label: 'Achievements',
      icon: Trophy,
      count: unlockedAchievements.length,
    },
    { key: 'rewards' as const, label: 'Rewards', icon: Gift, count: availableRewards.length },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden animate-fade-in">
      {/* ─── Header ─── */}
      <div className="shrink-0 px-5 pt-5 pb-4 bg-gradient-to-b from-slate-900/80 to-transparent">
        <div className="flex items-center justify-between mb-5">
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="w-5 h-5" /> Back
            </button>
          )}
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Star className="w-4 h-4 text-[var(--token-color)]" />
            {unlockedAchievements.length}/{achievements.length} unlocked
          </div>
        </div>

        {/* Points hero */}
        <div className="text-center py-5 px-4 rounded-2xl bg-gradient-to-br from-[var(--token-color)]/10 via-[var(--quaternary-accent)]/10 to-[var(--token-color)]/10 border border-[var(--token-color)]/20">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy className="w-10 h-10 text-[var(--token-color)] animate-pulse" />
            <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--token-color)] via-[var(--quaternary-accent)] to-[var(--token-color)] tabular-nums">
              {animatedPoints}
            </span>
          </div>
          <p className="text-[var(--token-color)]/70 text-sm font-medium flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4" /> Vibe Tokens <Sparkles className="w-4 h-4" />
          </p>
          <p className="text-slate-400 text-sm mt-2">{motivationalMsg}</p>
        </div>

        {/* Tab pills */}
        <div className="flex gap-2 mt-5">
          {tabs.map(({ key, label, icon: TabIcon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === key
                  ? 'bg-gradient-to-r from-[var(--token-color)]/20 to-[var(--quaternary-accent)]/20 text-[var(--token-color)] border border-[var(--token-color)]/30'
                  : 'bg-slate-800/40 text-slate-400 border border-slate-700/30 hover:text-slate-200'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === key
                    ? 'bg-[var(--token-color)]/20 text-[var(--token-color)]'
                    : 'bg-slate-700/60 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {activeTab === 'achievements' && (
          <div className="animate-fade-in">
            {/* Unlocked */}
            {unlockedAchievements.length > 0 && (
              <div className="mb-8">
                <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--token-color)] mb-4">
                  <CheckCircle2 className="w-5 h-5" /> Unlocked
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unlockedAchievements.map((ach) => (
                    <AchievementBadge key={ach.id} achievement={ach} />
                  ))}
                </div>
              </div>
            )}

            {/* Locked */}
            {lockedAchievements.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-400 mb-4">
                  <Lock className="w-5 h-5" /> In Progress
                  <span className="text-sm font-normal text-slate-500">
                    ({lockedAchievements.length} remaining)
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lockedAchievements.map((ach) => (
                    <AchievementBadge key={ach.id} achievement={ach} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {achievements.length === 0 && (
              <div className="text-center py-16">
                <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">No achievements yet.</p>
                <p className="text-slate-500 text-sm mt-1">
                  Complete tasks and worksheets to unlock your first badge!
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="animate-fade-in space-y-4">
            {/* Available */}
            {availableRewards.length > 0 ? (
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--success-accent)] mb-4">
                  <Gift className="w-5 h-5" /> Available Rewards
                </h2>
                <div className="space-y-3">
                  {availableRewards.map((reward) => (
                    <RewardCard
                      key={reward.id}
                      reward={reward}
                      tokens={tokens}
                      onClaim={onClaimReward}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <Gift className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">No rewards available right now.</p>
                <p className="text-slate-500 text-sm mt-1">Check back later!</p>
              </div>
            )}

            {/* Pending */}
            {claimedRewards.length > 0 && (
              <div className="mt-8">
                <h2 className="flex items-center gap-2 text-lg font-bold text-amber-300/70 mb-4">
                  ⏳ Pending Approval
                </h2>
                <div className="space-y-3">
                  {claimedRewards.map((reward) => (
                    <div
                      key={reward.id}
                      className="rounded-2xl p-5 bg-slate-800/30 border border-dashed border-slate-600/40 flex items-center justify-between opacity-70"
                    >
                      <div>
                        <h3 className="font-bold text-slate-400">{reward.name}</h3>
                        <p className="text-sm text-slate-500">{reward.cost} Tokens</p>
                      </div>
                      <span className="text-sm text-amber-400/60 font-medium">Pending…</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementCenter;
