import {
  Brain,
  Calculator,
  ChevronLeft,
  Flame,
  Gamepad2,
  Gift,
  Grid3X3,
  Music,
  Puzzle,
  Search,
  Shapes,
  Sparkles,
  Star,
  Trophy,
  Type,
  Zap,
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TOKEN_REWARDS } from '../../services/tokenService';
import { appStore } from '../../utils/electronStore';

/* ---------- Lazy game imports ---------- */
const MemoryMatchGame = lazy(async () => import('./MemoryMatchGame'));
const WordSearchGame = lazy(async () => import('./WordSearchGame'));
const AnagramsGame = lazy(async () => import('./AnagramsGame'));
const CrosswordGame = lazy(async () => import('./CrosswordGame'));
const MathAdventureGame = lazy(async () => import('./MathAdventureGame'));
const WordBuilderGame = lazy(async () => import('./WordBuilderGame'));
const SudokuGame = lazy(async () => import('./SudokuGame'));
const PatternQuestGame = lazy(async () => import('./PatternQuestGame'));
const MusicNotesGame = lazy(async () => import('./MusicNotesGame'));
const BossBattleGame = lazy(async () => import('./BossBattleGame'));
const AvatarProfile = lazy(async () => import('../avatar/AvatarProfile'));
const AvatarShop = lazy(async () => import('../avatar/AvatarShop'));

/* ---------- Types ---------- */
type Zone = 'chill' | 'focus' | 'challenge' | 'rpg';
type ZoneFilter = 'all' | Zone;

interface GameDef {
  id: string;
  name: string;
  description: string;
  icon: typeof Brain;
  color: string;
  zone: Zone;
  tokens: number;
  minLevel: number;
}

interface HubStats {
  xp: number;
  level: number;
  streak: number;
  lastPlayDate: string;
  gamesPlayed: number;
  chestsOpened: number;
  chestProgress: number; // 0-4, unlock at 5
}

/* ---------- Zone definitions ---------- */
const ZONE_CONFIG: Record<Zone, { emoji: string; label: string; desc: string; color: string }> = {
  chill: { emoji: '🧘', label: 'Chill Zone', desc: 'Calm & steady. No rush.', color: '#38bdf8' },
  focus: { emoji: '🎯', label: 'Focus Zone', desc: 'Build your skills!', color: '#22c55e' },
  challenge: { emoji: '🔥', label: 'Challenge Zone', desc: 'Push your brain!', color: '#f97316' },
  rpg: { emoji: '⚔️', label: 'Boss Battles', desc: 'Use your avatar stats!', color: '#ef4444' },
};

const ZONE_ORDER: Zone[] = ['chill', 'focus', 'challenge', 'rpg'];

/* ---------- Constants ---------- */
const GAMES: GameDef[] = [
  // Chill Zone — calm, steady focus
  {
    id: 'memory',
    name: 'Memory Match',
    description: 'Find matching pairs!',
    icon: Grid3X3,
    color: '#10b981',
    zone: 'chill',
    tokens: 10,
    minLevel: 0,
  },
  {
    id: 'wordsearch',
    name: 'Word Search',
    description: 'Find hidden words!',
    icon: Search,
    color: '#3b82f6',
    zone: 'chill',
    tokens: 10,
    minLevel: 0,
  },
  {
    id: 'crossword',
    name: 'Crossword',
    description: 'Fill in the clues!',
    icon: Type,
    color: '#ec4899',
    zone: 'chill',
    tokens: 10,
    minLevel: 0,
  },
  // Focus Zone — engaged concentration
  {
    id: 'anagrams',
    name: 'Anagrams',
    description: 'Unscramble the words!',
    icon: Puzzle,
    color: '#8b5cf6',
    zone: 'focus',
    tokens: 15,
    minLevel: 0,
  },
  {
    id: 'wordbuilder',
    name: 'Word Builder',
    description: 'Build words letter by letter!',
    icon: Sparkles,
    color: '#14b8a6',
    zone: 'focus',
    tokens: 15,
    minLevel: 0,
  },
  {
    id: 'musicnotes',
    name: 'Music Notes',
    description: 'Read notes on the staff!',
    icon: Music,
    color: '#06b6d4',
    zone: 'focus',
    tokens: 15,
    minLevel: 0,
  },
  {
    id: 'math',
    name: 'Math Adventure',
    description: 'Solve math puzzles!',
    icon: Calculator,
    color: '#f59e0b',
    zone: 'focus',
    tokens: 15,
    minLevel: 0,
  },
  // Challenge Zone — high energy
  {
    id: 'sudoku',
    name: 'Sudoku',
    description: 'Number logic puzzles!',
    icon: Brain,
    color: '#6366f1',
    zone: 'challenge',
    tokens: 20,
    minLevel: 0,
  },
  {
    id: 'pattern',
    name: 'Pattern Quest',
    description: 'Discover the pattern!',
    icon: Shapes,
    color: '#f97316',
    zone: 'challenge',
    tokens: 20,
    minLevel: 2,
  },
  // RPG Zone - Boss Battles
  {
    id: 'boss-math',
    name: 'The Math Menace',
    description: 'Defeat the math boss using your Avatar!',
    icon: Flame,
    color: '#ef4444',
    zone: 'rpg',
    tokens: 0,
    minLevel: 1,
  },
  {
    id: 'boss-science',
    name: 'The Mad Scientist',
    description: 'Test your science knowledge in battle!',
    icon: Flame,
    color: '#ef4444',
    zone: 'rpg',
    tokens: 0,
    minLevel: 1,
  },
  {
    id: 'boss-history',
    name: 'The Time Bandit',
    description: 'A historical showdown awaits!',
    icon: Flame,
    color: '#ef4444',
    zone: 'rpg',
    tokens: 0,
    minLevel: 1,
  },
];

const XP_PER_GAME = 10;
const XP_PER_LEVEL = 100;
const CHEST_THRESHOLD = 5;
const CONTINUOUS_GAMES = new Set(['math', 'wordbuilder', 'pattern', 'musicnotes']);

const DEFAULT_STATS: HubStats = {
  xp: 0,
  level: 0,
  streak: 0,
  lastPlayDate: '',
  gamesPlayed: 0,
  chestsOpened: 0,
  chestProgress: 0,
};

/* ---------- Helpers ---------- */
function loadStats(): HubStats {
  try {
    const saved = appStore.get<HubStats>('gamesHub_stats');
    if (saved) return { ...DEFAULT_STATS, ...saved };
  } catch {
    /* use defaults */
  }
  return { ...DEFAULT_STATS };
}

function saveStats(stats: HubStats) {
  appStore.set('gamesHub_stats', stats);
}

/** Map game IDs to subject names for Group A games */
const GAME_SUBJECT_MAP: Record<string, string> = {
  memory: 'General',
  wordsearch: 'General',
  anagrams: 'English',
  crossword: 'English',
  sudoku: 'Math',
  'boss-math': 'Math',
  'boss-science': 'Science',
  'boss-history': 'History',
};

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0];
}

/* ---------- Props ---------- */
interface GamesHubProps {
  userTokens: number;
  onEarnTokens: (amount: number, reason?: string) => void;
  onSpendTokens?: (amount: number, reason?: string) => boolean;
  onGameCompleted?: (gameId: string, score: number) => void;
  onClose: () => void;
}

/* ---------- Component ---------- */
export default function GamesHub({
  userTokens,
  onEarnTokens,
  onSpendTokens,
  onGameCompleted,
  onClose,
}: GamesHubProps) {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [showAvatarScreen, setShowAvatarScreen] = useState<'profile' | 'shop' | null>(null);
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>('all');
  const [stats, setStats] = useState<HubStats>(loadStats);
  const [showChestAnimation, setShowChestAnimation] = useState(false);
  const gameStartRef = useRef(0);
  const continuousGameTokensRef = useRef(0);

  // Track game start time when a game becomes active
  useEffect(() => {
    if (activeGame) {
      gameStartRef.current = Date.now();
      continuousGameTokensRef.current = 0;
    } else {
      gameStartRef.current = 0;
      continuousGameTokensRef.current = 0;
    }
  }, [activeGame]);

  // Streak calculation on mount
  const streakActive = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0] ?? '';
    const yesterday = new Date(now.getTime() - 86400_000).toISOString().split('T')[0] ?? '';
    return stats.lastPlayDate === today || stats.lastPlayDate === yesterday;
  }, [stats.lastPlayDate]);

  // Zone filtering — either show all or just games in the selected zone
  const visibleZones = useMemo(() => {
    if (zoneFilter === 'all') return ZONE_ORDER;
    return ZONE_ORDER.filter((z) => z === zoneFilter);
  }, [zoneFilter]);

  const gamesByZone = useMemo(() => {
    const map: Record<Zone, GameDef[]> = { chill: [], focus: [], challenge: [], rpg: [] };
    for (const game of GAMES) {
      map[game.zone].push(game);
    }
    return map;
  }, []);

  const xpProgress = ((stats.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;

  /* ---------- Game complete handler ---------- */
  const handleGameComplete = useCallback(
    (
      gameId: string,
      _score: number,
      stars: number,
      _timeSpent?: number,
      options?: {
        awardHubTokens?: boolean;
        autoCloseDelayMs?: number;
      },
    ) => {
      const game = GAMES.find((g) => g.id === gameId);
      if (!game) return;
      const awardHubTokens = options?.awardHubTokens ?? true;
      const autoCloseDelayMs = options?.autoCloseDelayMs ?? 1500;

      if (awardHubTokens) {
        // Calculate tokens with streak multiplier
        const streakMultiplier = 1 + stats.streak * 0.1;
        let tokens = game.tokens;
        if (stars >= 3) tokens += TOKEN_REWARDS.GAME_PERFECT;
        tokens = globalThis.Math.round(tokens * streakMultiplier);

        // Award tokens via hub callback
        onEarnTokens(tokens, `Played ${game.name}`);
      }

      // Fire achievement event
      onGameCompleted?.(gameId, _score);

      // Update stats
      setStats((prev) => {
        const today = new Date().toISOString().split('T')[0] ?? '';
        const newStreak = isToday(prev.lastPlayDate)
          ? prev.streak
          : prev.lastPlayDate === new Date(Date.now() - 86400_000).toISOString().split('T')[0]
            ? prev.streak + 1
            : 1;
        const newXp = prev.xp + XP_PER_GAME;
        const newLevel = globalThis.Math.floor(newXp / XP_PER_LEVEL);
        const newChestProgress = prev.chestProgress + 1;
        const chestUnlocked = newChestProgress >= CHEST_THRESHOLD;

        const updated: HubStats = {
          xp: newXp,
          level: newLevel,
          streak: newStreak,
          lastPlayDate: today,
          gamesPlayed: prev.gamesPlayed + 1,
          chestsOpened: chestUnlocked ? prev.chestsOpened + 1 : prev.chestsOpened,
          chestProgress: chestUnlocked ? 0 : newChestProgress,
        };

        saveStats(updated);

        if (chestUnlocked) {
          setShowChestAnimation(true);
          onEarnTokens(50, 'Chest unlocked'); // Chest bonus!
          setTimeout(() => setShowChestAnimation(false), 3000);
        }

        // Streak milestone bonuses
        if (newStreak === 3) onEarnTokens(TOKEN_REWARDS.THREE_DAY_STREAK, '3-day streak bonus');
        if (newStreak === 7) onEarnTokens(TOKEN_REWARDS.SEVEN_DAY_STREAK, '7-day streak bonus');
        if (newStreak === 30) onEarnTokens(TOKEN_REWARDS.THIRTY_DAY_STREAK, '30-day streak bonus');

        return updated;
      });

      // Back to hub after a moment
      setTimeout(() => setActiveGame(null), autoCloseDelayMs);
    },
    [onEarnTokens, onGameCompleted, stats.streak],
  );

  const closeActiveGame = useCallback(() => {
    if (activeGame && CONTINUOUS_GAMES.has(activeGame) && continuousGameTokensRef.current > 0) {
      const earnedInSession = continuousGameTokensRef.current;
      const stars = earnedInSession >= 20 ? 3 : earnedInSession >= 10 ? 2 : 1;
      handleGameComplete(activeGame, earnedInSession * 10, stars, undefined, {
        awardHubTokens: false,
        autoCloseDelayMs: 0,
      });
    }
    gameStartRef.current = 0;
    continuousGameTokensRef.current = 0;
    setActiveGame(null);
  }, [activeGame, handleGameComplete]);

  /* ---------- Render active game ---------- */
  if (activeGame) {
    const fallback = (
      <div className="gh-fallback">
        <div className="gh-fallback-inner">
          <Gamepad2 size={48} className="gh-fallback-icon" />
          <p className="gh-fallback-text">Loading game...</p>
        </div>
      </div>
    );

    // Group A games: subject + onComplete(score, stars, timeSpent) + onBack
    const groupAProps = {
      subject: GAME_SUBJECT_MAP[activeGame] ?? 'General',
      onComplete: (score: number, stars: number, timeSpent: number) => {
        gameStartRef.current = 0;
        continuousGameTokensRef.current = 0;
        handleGameComplete(activeGame, score, stars, timeSpent);
      },
      onBack: () => {
        closeActiveGame();
      },
    };

    // Group B games: onEarnTokens + onClose
    const groupBProps = {
      onEarnTokens: (amount: number) => {
        if (amount <= 0) return;
        continuousGameTokensRef.current += amount;
        onEarnTokens(amount, 'Played Continuous Game');
      },
      onClose: () => {
        closeActiveGame();
      },
    };

    return (
      <Suspense fallback={fallback}>
        <div className="gh-active-game">
          <button onClick={closeActiveGame} aria-label="Back to games hub" className="gh-back-btn">
            <ChevronLeft size={16} /> Back
          </button>
          {/* Group A: subject/onComplete/onBack */}
          {activeGame === 'memory' && <MemoryMatchGame {...groupAProps} />}
          {activeGame === 'wordsearch' && <WordSearchGame {...groupAProps} />}
          {activeGame === 'anagrams' && <AnagramsGame {...groupAProps} />}
          {activeGame === 'crossword' && <CrosswordGame {...groupAProps} />}
          {activeGame === 'sudoku' && (
            <SudokuGame onComplete={groupAProps.onComplete} onBack={groupAProps.onBack} />
          )}
          {activeGame.startsWith('boss-') && (
            <BossBattleGame
              subject={groupAProps.subject}
              onComplete={groupAProps.onComplete}
              onBack={groupAProps.onBack}
            />
          )}
          {/* Group B: onEarnTokens/onClose */}
          {activeGame === 'math' && <MathAdventureGame {...groupBProps} />}
          {activeGame === 'wordbuilder' && <WordBuilderGame {...groupBProps} />}
          {activeGame === 'pattern' && <PatternQuestGame {...groupBProps} />}
          {activeGame === 'musicnotes' && <MusicNotesGame {...groupBProps} />}
        </div>
      </Suspense>
    );
  }

  if (showAvatarScreen === 'profile') {
    return (
      <div className="gh-hub" style={{ padding: '20px', overflowY: 'auto' }}>
        <button onClick={() => setShowAvatarScreen(null)} className="gh-header-back" style={{ marginBottom: '20px' }}>
          <ChevronLeft size={18} /> Back to Hub
        </button>
        <Suspense fallback={<div>Loading Profile...</div>}>
          <AvatarProfile onOpenShop={() => setShowAvatarScreen('shop')} />
        </Suspense>
      </div>
    );
  }

  if (showAvatarScreen === 'shop') {
    return (
      <div className="gh-hub" style={{ padding: '20px', overflowY: 'auto' }}>
        <button onClick={() => setShowAvatarScreen('profile')} className="gh-header-back" style={{ marginBottom: '20px' }}>
          <ChevronLeft size={18} /> Back to Profile
        </button>
        <Suspense fallback={<div>Loading Shop...</div>}>
          <AvatarShop
            userTokens={userTokens}
            onSpendTokens={onSpendTokens ?? (() => false)}
          />
        </Suspense>
      </div>
    );
  }

  /* ---------- Hub view ---------- */
  return (
    <div className="gh-hub">
      {/* Header */}
      <div className="gh-header">
        <button onClick={onClose} className="gh-header-back">
          <ChevronLeft size={18} /> Back
        </button>
        <h2 className="gh-title">
          <Gamepad2 size={28} className="gh-title-icon" /> Games Hub
        </h2>
        <div className="gh-header-spacer" style={{ display: 'flex', justifyContent: 'flex-end', flex: 1 }}>
          <button 
            onClick={() => setShowAvatarScreen('profile')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            <Sparkles size={16} /> My Avatar
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="gh-stats-grid">
        {/* Tokens */}
        <div className="gh-stat-box" style={{ '--stat-accent': '#f59e0b' } as React.CSSProperties}>
          <Star size={18} color="#f59e0b" />
          <span className="gh-stat-value">{userTokens}</span>
          <span className="gh-stat-label">Tokens</span>
        </div>
        {/* Level */}
        <div className="gh-stat-box" style={{ '--stat-accent': '#6366f1' } as React.CSSProperties}>
          <Trophy size={18} color="#6366f1" />
          <span className="gh-stat-value">Lv.{stats.level}</span>
          <span className="gh-stat-label">Level</span>
        </div>
        {/* Streak */}
        <div
          className="gh-stat-box"
          style={{ '--stat-accent': streakActive ? '#ef4444' : '#475569' } as React.CSSProperties}
        >
          <Flame size={18} color={streakActive ? '#ef4444' : '#475569'} />
          <span className="gh-stat-value">{stats.streak}</span>
          <span className="gh-stat-label">Streak</span>
        </div>
        {/* Chest */}
        <div className="gh-stat-box" style={{ '--stat-accent': '#10b981' } as React.CSSProperties}>
          <Gift size={18} color="#10b981" />
          <span className="gh-stat-value">{stats.chestProgress}/5</span>
          <span className="gh-stat-label">Chest</span>
        </div>
      </div>

      {/* XP progress bar */}
      <div className="gh-xp-section">
        <div className="gh-xp-labels">
          <span>
            {stats.xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP
          </span>
          <span>Level {stats.level + 1}</span>
        </div>
        <div className="gh-xp-track">
          <div
            className="gh-xp-fill"
            style={{ '--xp-pct': `${xpProgress}%` } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Chest animation */}
      {showChestAnimation && (
        <div className="gh-chest-banner">
          <Gift size={32} className="gh-chest-icon" />
          <p className="gh-chest-text">🎉 Chest Unlocked! +50 Tokens!</p>
        </div>
      )}

      {/* Zone filter tabs */}
      <div className="gh-filters">
        <button
          onClick={() => setZoneFilter('all')}
          className={`gh-filter-btn ${zoneFilter === 'all' ? 'gh-filter-btn--active' : 'gh-filter-btn--inactive'}`}
        >
          🎮 All Zones
        </button>
        {ZONE_ORDER.map((z) => {
          const cfg = ZONE_CONFIG[z];
          return (
            <button
              key={z}
              onClick={() => setZoneFilter(z)}
              className={`gh-filter-btn ${zoneFilter === z ? 'gh-filter-btn--active' : 'gh-filter-btn--inactive'}`}
              style={
                zoneFilter === z
                  ? ({ '--filter-accent': cfg.color } as React.CSSProperties)
                  : undefined
              }
            >
              {cfg.emoji} {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Zone sections */}
      <div className="gh-zones">
        {visibleZones.map((zone) => {
          const cfg = ZONE_CONFIG[zone];
          const games = gamesByZone[zone];
          return (
            <section
              key={zone}
              className={`gh-zone-section gh-zone--${zone}`}
              style={{ '--zone-color': cfg.color } as React.CSSProperties}
            >
              {/* Zone header */}
              <div className="gh-zone-header">
                <span className="gh-zone-emoji">{cfg.emoji}</span>
                <div className="gh-zone-info">
                  <h3 className="gh-zone-title">{cfg.label}</h3>
                  <p className="gh-zone-desc">{cfg.desc}</p>
                </div>
                <span className="gh-zone-count">{games.length} games</span>
              </div>

              {/* Games row */}
              <div className="gh-zone-games">
                {games.map((game) => {
                  const locked = game.minLevel > stats.level;
                  const Icon = game.icon;
                  return (
                    <button
                      key={game.id}
                      disabled={locked}
                      onClick={() => !locked && setActiveGame(game.id)}
                      aria-label={
                        locked
                          ? `${game.name} — unlock at Level ${game.minLevel}`
                          : `Play ${game.name}`
                      }
                      className={`gh-game-card ${locked ? 'gh-game-card--locked' : ''}`}
                    >
                      {/* Zone accent stripe */}
                      <div
                        className="gh-card-stripe"
                        style={{ '--stripe-color': cfg.color } as React.CSSProperties}
                      />

                      <div
                        className="gh-game-icon-box"
                        style={{ '--icon-bg': `${game.color}15` } as React.CSSProperties}
                      >
                        <Icon size={28} color={game.color} />
                      </div>

                      <h3 className="gh-game-name">
                        {locked ? '🔒 ' : ''}
                        {game.name}
                      </h3>
                      <p className="gh-game-desc">
                        {locked ? `Unlock at Level ${game.minLevel}` : game.description}
                      </p>

                      {!locked && (
                        <div className="gh-token-reward">
                          <Zap size={14} className="gh-token-icon" />
                          <span className="gh-token-text">+{game.tokens} tokens</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
