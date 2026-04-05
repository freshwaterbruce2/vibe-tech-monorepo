import {
  ChevronLeft,
  Clock3,
  Flame,
  Gamepad2,
  Gift,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import { getGameDisplayName } from '../../services/gameProgression';
import { DAILY_GOAL_BONUS, DAILY_GOAL_TARGET, ZONE_CONFIG, ZONE_ORDER, XP_PER_LEVEL } from './brainGymConstants';
import { formatSeconds, getGameStats, GAME_SUBJECT_MAP, renderStarString } from './brainGymHelpers';
import type { BrainGymHubProps } from './brainGymTypes';
import { useBrainGymState } from './useBrainGymState';

/* ---------- Lazy game imports ---------- */
const MemoryMatchGame = lazy(async () => import('./MemoryMatchGame'));
const WordSearchGame = lazy(async () => import('./WordSearchGame'));
const SudokuGame = lazy(async () => import('./SudokuGame'));
const PatternQuestGame = lazy(async () => import('./PatternQuestGame'));
const AnagramsGame = lazy(async () => import('./AnagramsGame'));
const CrosswordGame = lazy(async () => import('./CrosswordGame'));
const WordBuilderGame = lazy(async () => import('./WordBuilderGame'));
const MathAdventureGame = lazy(async () => import('./MathAdventureGame'));
const AvatarProfile = lazy(async () => import('../avatar/AvatarProfile'));
const AvatarShop = lazy(async () => import('../avatar/AvatarShop'));

/* ---------- Component ---------- */
export default function BrainGymHub(props: BrainGymHubProps) {
  const { userTokens, onEarnTokens, onSpendTokens, onClose } = props;
  const state = useBrainGymState(props);
  const {
    activeGame, activeGameLaunchConfig, showAvatarScreen, setShowAvatarScreen,
    zoneFilter, setZoneFilter, stats, showChestAnimation, continuousGameTokensRef,
    gameStartRef, streakActive, todayKey, gamesByZone, visibleZones, xpProgress,
    dailyGoalProgress, dailyGoalPct, gameTargets, totalTrackedRuns, nextUnlockGame,
    featuredRecommendation, FeaturedGameIcon, handleGameComplete, closeActiveGame, launchGame,
  } = state;

  /* ---------- Active game view ---------- */
  if (activeGame) {
    const fallback = (
      <div className="gh-fallback">
        <div className="gh-fallback-inner">
          <Gamepad2 size={48} className="gh-fallback-icon" />
          <p className="gh-fallback-text">Loading game...</p>
        </div>
      </div>
    );
    const groupAProps = {
      subject: GAME_SUBJECT_MAP[activeGame] ?? 'General',
      onComplete: (score: number, stars: number, timeSpent: number) => {
        gameStartRef.current = 0;
        continuousGameTokensRef.current = 0;
        handleGameComplete(activeGame, score, stars, timeSpent);
      },
      onBack: () => closeActiveGame(),
    };
    const memoryProps = { ...groupAProps, initialDifficulty: activeGameLaunchConfig.memoryDifficulty };
    const wordSearchProps = { ...groupAProps, initialConfig: activeGameLaunchConfig.wordsearchConfig };
    const groupBProps = {
      onEarnTokens: (amount: number) => {
        if (amount <= 0) return;
        continuousGameTokensRef.current += amount;
        onEarnTokens(amount, `Played ${getGameDisplayName(activeGame ?? 'game')}`);
      },
      onClose: () => closeActiveGame(),
    };
    return (
      <Suspense fallback={fallback}>
        <div className="gh-active-game">
          <button onClick={closeActiveGame} aria-label="Back to games hub" className="gh-back-btn">
            <ChevronLeft size={16} /> Back
          </button>
          {activeGame === 'memory' && <MemoryMatchGame {...memoryProps} />}
          {activeGame === 'wordsearch' && <WordSearchGame {...wordSearchProps} />}
          {activeGame === 'anagrams' && <AnagramsGame {...groupAProps} />}
          {activeGame === 'crossword' && <CrosswordGame {...groupAProps} />}
          {activeGame === 'sudoku' && <SudokuGame onComplete={groupAProps.onComplete} onBack={groupAProps.onBack} />}
          {activeGame === 'pattern' && <PatternQuestGame {...groupBProps} />}
          {activeGame === 'wordbuilder' && <WordBuilderGame {...groupBProps} />}
          {activeGame === 'mathadventure' && <MathAdventureGame {...groupBProps} />}
        </div>
      </Suspense>
    );
  }

  if (showAvatarScreen === 'profile') {
    return (
      <div className="gh-wrapper">
        <div className="gh-hub p-5 overflow-y-auto">
          <button onClick={() => setShowAvatarScreen(null)} className="gh-header-back mb-5">
            <ChevronLeft size={18} /> Back to Hub
          </button>
          <Suspense fallback={<div>Loading Profile...</div>}>
            <AvatarProfile onOpenShop={() => setShowAvatarScreen('shop')} />
          </Suspense>
        </div>
      </div>
    );
  }

  if (showAvatarScreen === 'shop') {
    return (
      <div className="gh-wrapper">
        <div className="gh-hub p-5 overflow-y-auto">
          <button onClick={() => setShowAvatarScreen('profile')} className="gh-header-back mb-5">
            <ChevronLeft size={18} /> Back to Profile
          </button>
          <Suspense fallback={<div>Loading Shop...</div>}>
            <AvatarShop userTokens={userTokens} onSpendTokens={onSpendTokens ?? (() => false)} />
          </Suspense>
        </div>
      </div>
    );
  }

  /* ---------- Hub view ---------- */
  return (
    <div className="gh-wrapper">
      <div className="gh-hub">
        <div className="gh-header">
          <button onClick={onClose} className="gh-header-back"><ChevronLeft size={18} /> Back</button>
          <h2 className="gh-title"><Gamepad2 size={28} className="gh-title-icon" /> Brain Gym</h2>
          <div className="gh-header-spacer flex justify-end flex-1">
            <button onClick={() => setShowAvatarScreen('profile')}
              className="flex items-center gap-2 rounded-lg border-none bg-cyan-400 px-4 py-2 font-bold text-slate-950 cursor-pointer transition-colors hover:bg-cyan-300">
              <Sparkles size={16} /> My Avatar
            </button>
          </div>
        </div>
        <p className="gh-subtitle">Synapse Station</p>

        <div className="gh-stats-grid">
          <div className="gh-stat-box" style={{ '--stat-accent': 'var(--token-color)' } as React.CSSProperties}>
            <Star size={18} color="var(--token-color)" />
            <span className="gh-stat-value">{userTokens}</span>
            <span className="gh-stat-label">Synapses</span>
          </div>
          <div className="gh-stat-box" style={{ '--stat-accent': '#22d3ee' } as React.CSSProperties}>
            <Trophy size={18} color="#22d3ee" />
            <span className="gh-stat-value">{stats.level}</span>
            <span className="gh-stat-label">Cognitive Fitness</span>
          </div>
          <div className="gh-stat-box" style={{ '--stat-accent': streakActive ? 'var(--success-accent)' : 'var(--text-tertiary)' } as React.CSSProperties}>
            <Flame size={18} color={streakActive ? 'var(--success-accent)' : 'var(--text-tertiary)'} />
            <span className="gh-stat-value">{stats.streak}</span>
            <span className="gh-stat-label">Neural Link</span>
          </div>
          <div className="gh-stat-box" style={{ '--stat-accent': '#ec4899' } as React.CSSProperties}>
            <Gift size={18} color="#ec4899" />
            <span className="gh-stat-value">{stats.chestProgress}/5</span>
            <span className="gh-stat-label">Data Cache</span>
          </div>
        </div>

        <div className="gh-xp-section">
          <div className="gh-xp-labels">
            <span>{stats.xp % XP_PER_LEVEL} / {XP_PER_LEVEL} Cognitive Load</span>
            <span>Fitness {stats.level + 1}</span>
          </div>
          <div className="gh-xp-track">
            <div className="gh-xp-fill" style={{ '--xp-pct': `${xpProgress}%` } as React.CSSProperties} />
          </div>
        </div>

        {featuredRecommendation && (
          <section className="gh-zone-section" style={{ '--zone-color': ZONE_CONFIG[featuredRecommendation.game.zone].color } as React.CSSProperties}>
            <div className="gh-zone-header">
              <span className="gh-zone-emoji">🎯</span>
              <div className="gh-zone-info">
                <h3 className="gh-zone-title flex items-center gap-2"><Target size={16} />Featured Drill</h3>
                <p className="gh-zone-desc">Recommended next run based on your recent Brain Gym data</p>
              </div>
              <span className="gh-zone-count">Recommended</span>
            </div>
            <div className="gh-featured-grid">
              <button onClick={() => launchGame(featuredRecommendation.game.id)} className="gh-game-card gh-featured-card">
                <div className="gh-card-stripe" style={{ '--stripe-color': ZONE_CONFIG[featuredRecommendation.game.zone].color } as React.CSSProperties} />
                <div className="gh-game-icon-box" style={{ '--icon-bg': `${featuredRecommendation.game.color}15` } as React.CSSProperties}>
                  <FeaturedGameIcon size={28} color={featuredRecommendation.game.color} />
                </div>
                <h3 className="gh-game-name">{featuredRecommendation.game.name}</h3>
                <p className="gh-game-desc">{featuredRecommendation.game.description}</p>
                <p className="gh-featured-reason">{featuredRecommendation.reason}.</p>
                <div className="gh-featured-meta">
                  <span className="gh-featured-pill">{featuredRecommendation.target.label}: {featuredRecommendation.target.valueText}</span>
                  <span className="gh-featured-pill">{ZONE_CONFIG[featuredRecommendation.game.zone].label}</span>
                  <span className="gh-featured-pill">{featuredRecommendation.game.difficultyLabel}</span>
                  <span className="gh-featured-pill">{featuredRecommendation.game.focus}</span>
                  <span className="gh-featured-pill">{featuredRecommendation.performance.plays > 0 ? `Best ${featuredRecommendation.performance.bestScore}` : 'First clear'}</span>
                  <span className="gh-featured-pill">Fastest {formatSeconds(featuredRecommendation.performance.fastestTime)}</span>
                </div>
                <div className="gh-token-reward"><Zap size={14} className="gh-token-icon" /><span className="gh-token-text">Launch {featuredRecommendation.game.name}</span></div>
                <div className="gh-target-block mt-3">
                  <div className="gh-target-header">
                    <span className="gh-target-label">{featuredRecommendation.target.label}</span>
                    <span className="gh-target-value">{featuredRecommendation.target.valueText}</span>
                  </div>
                  <p className="gh-target-detail">{featuredRecommendation.target.detail}</p>
                  <div className="gh-target-track"><div className="gh-target-fill" style={{ '--target-pct': `${featuredRecommendation.target.progressPct}%` } as React.CSSProperties} /></div>
                </div>
              </button>
              <div className="gh-featured-panel">
                <div className="gh-stat-box" style={{ '--stat-accent': '#ec4899' } as React.CSSProperties}>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-slate-400"><Target size={12} color="#ec4899" />Daily Goal</div>
                  <span className="gh-stat-value">{dailyGoalProgress}/{DAILY_GOAL_TARGET}</span>
                  <span className="gh-stat-label">{stats.dailyGoalCompletedOn === todayKey ? `Completed +${DAILY_GOAL_BONUS}` : `${DAILY_GOAL_TARGET - globalThis.Math.min(dailyGoalProgress, DAILY_GOAL_TARGET)} runs left`}</span>
                  <div className="gh-target-track mt-2 w-full"><div className="gh-target-fill" style={{ '--target-pct': `${dailyGoalPct}%` } as React.CSSProperties} /></div>
                </div>
                <div className="gh-stat-box" style={{ '--stat-accent': '#22d3ee' } as React.CSSProperties}>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-slate-400"><Trophy size={12} color="#22d3ee" />Total Runs</div>
                  <span className="gh-stat-value">{totalTrackedRuns}</span>
                  <span className="gh-stat-label">completed Brain Gym sessions</span>
                </div>
                <div className="gh-stat-box" style={{ '--stat-accent': '#67e8f9' } as React.CSSProperties}>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-slate-400"><Clock3 size={12} color="#67e8f9" />Next Unlock</div>
                  <span className="gh-stat-value text-base">{nextUnlockGame ? `${nextUnlockGame.minLevel}` : 'MAX'}</span>
                  <span className="gh-stat-label">{nextUnlockGame ? nextUnlockGame.name : 'All drills live'}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {showChestAnimation && (
          <div className="gh-chest-banner"><Gift size={32} className="gh-chest-icon" /><p className="gh-chest-text">🎉 Data Cache Unlocked! +50 Synapses!</p></div>
        )}

        <div className="gh-filters">
          <button onClick={() => setZoneFilter('all')} className={`gh-filter-btn ${zoneFilter === 'all' ? 'gh-filter-btn--active' : 'gh-filter-btn--inactive'}`}>🎮 All Zones</button>
          {ZONE_ORDER.map((z) => {
            const cfg = ZONE_CONFIG[z];
            return (
              <button key={z} onClick={() => setZoneFilter(z)}
                className={`gh-filter-btn ${zoneFilter === z ? 'gh-filter-btn--active' : 'gh-filter-btn--inactive'}`}
                style={zoneFilter === z ? { '--filter-accent': cfg.color } as React.CSSProperties : undefined}>
                {cfg.emoji} {cfg.label}
              </button>
            );
          })}
        </div>

        <div className="gh-zones">
          {visibleZones.map((zone) => {
            const cfg = ZONE_CONFIG[zone];
            const games = gamesByZone[zone];
            return (
              <section key={zone} className={`gh-zone-section gh-zone--${zone}`} style={{ '--zone-color': cfg.color } as React.CSSProperties}>
                <div className="gh-zone-header">
                  <span className="gh-zone-emoji">{cfg.emoji}</span>
                  <div className="gh-zone-info"><h3 className="gh-zone-title">{cfg.label}</h3><p className="gh-zone-desc">{cfg.desc}</p></div>
                  <span className="gh-zone-count">{games.length} games</span>
                </div>
                <div className="gh-zone-games">
                  {games.map((game) => {
                    const locked = game.minLevel > stats.level;
                    const Icon = game.icon;
                    const performance = getGameStats(stats, game.id);
                    const target = gameTargets[game.id];
                    return (
                      <button key={game.id} disabled={locked} onClick={() => !locked && launchGame(game.id)}
                        aria-label={locked ? `${game.name} — unlock at Level ${game.minLevel}` : `Play ${game.name}`}
                        className={`gh-game-card ${locked ? 'gh-game-card--locked' : ''}`}>
                        <div className="gh-card-stripe" style={{ '--stripe-color': cfg.color } as React.CSSProperties} />
                        <div className="gh-game-icon-box" style={{ '--icon-bg': `${game.color}15` } as React.CSSProperties}>
                          <Icon size={28} color={game.color} />
                        </div>
                        <h3 className="gh-game-name">{locked ? '🔒 ' : ''}{game.name}</h3>
                        <p className="gh-game-desc">{locked ? `Unlock at Fitness ${game.minLevel}` : game.description}</p>
                        {!locked && (<>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.12em] text-slate-300">
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{game.difficultyLabel}</span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{game.focus}</span>
                          </div>
                          {performance.plays > 0 ? (
                            <div className="mt-3 grid grid-cols-3 gap-2 text-left">
                              <div className="rounded-xl border border-white/8 bg-slate-950/30 px-2 py-2">
                                <div className="text-[10px] uppercase tracking-[0.1em] text-slate-500">Best</div>
                                <div className="text-sm font-semibold text-white">{performance.bestScore}</div>
                              </div>
                              <div className="rounded-xl border border-white/8 bg-slate-950/30 px-2 py-2">
                                <div className="text-[10px] uppercase tracking-[0.1em] text-slate-500">Mastery</div>
                                <div className="text-[11px] font-semibold text-amber-300">{renderStarString(performance.bestStars)}</div>
                              </div>
                              <div className="rounded-xl border border-white/8 bg-slate-950/30 px-2 py-2">
                                <div className="text-[10px] uppercase tracking-[0.1em] text-slate-500">Runs</div>
                                <div className="text-sm font-semibold text-white">{performance.plays}</div>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-3 text-xs text-cyan-200/85">First clear sets your personal best and fastest time.</p>
                          )}
                          {target && (
                            <div className="gh-target-block mt-3">
                              <div className="gh-target-header">
                                <span className="gh-target-label">{target.label}</span>
                                <span className="gh-target-value">{target.valueText}</span>
                              </div>
                              <p className="gh-target-detail">{target.detail}</p>
                              <div className="gh-target-track"><div className="gh-target-fill" style={{ '--target-pct': `${target.progressPct}%` } as React.CSSProperties} /></div>
                            </div>
                          )}
                          <div className="gh-token-reward"><Zap size={14} className="gh-token-icon" /><span className="gh-token-text">+{game.tokens} Synapses</span></div>
                        </>)}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
