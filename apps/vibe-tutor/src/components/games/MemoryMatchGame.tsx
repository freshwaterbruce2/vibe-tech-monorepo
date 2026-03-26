import { animated, useSpring } from '@react-spring/web';
import confetti from 'canvas-confetti';
import { ArrowLeft, Clock, Layers3, RotateCcw, Sparkles, Zap } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { MemoryCard } from '../../services/puzzleGenerator';
import { calculateMemoryScore, generateMemoryCards } from '../../services/puzzleGenerator';
import { getRandomWords } from '../../services/wordBanks';
import { useGameAudio } from '../../hooks/useGameAudio';
import { type GameDifficulty } from '../settings/gameSettingsConfig';
import GameCompletionModal from './GameCompletionModal';

interface MemoryMatchGameProps {
  subject: string;
  onComplete: (score: number, stars: number, timeSpent: number) => void;
  onBack: () => void;
  initialDifficulty?: GameDifficulty;
}

type MemoryDifficulty = GameDifficulty;

interface MemoryDifficultyConfig {
  pairCount: number;
  scoreBonus: number;
  label: string;
  helper: string;
  wordDifficulty?: 'easy' | 'medium' | 'hard';
}

interface FinalResult {
  score: number;
  stars: number;
  time: number;
  comboBonus: number;
  difficultyBonus: number;
}

const MEMORY_DIFFICULTIES: Record<MemoryDifficulty, MemoryDifficultyConfig> = {
  easy: {
    pairCount: 6,
    scoreBonus: 0,
    label: 'Easy',
    helper: 'Warm up with six quick word-clue pairs.',
    wordDifficulty: 'easy',
  },
  medium: {
    pairCount: 8,
    scoreBonus: 10,
    label: 'Medium',
    helper: 'A longer board with tighter recall pressure.',
    wordDifficulty: 'medium',
  },
  hard: {
    pairCount: 10,
    scoreBonus: 20,
    label: 'Hard',
    helper: 'Ten pairs and a bigger bonus if you stay sharp.',
    wordDifficulty: 'hard',
  },
};

function buildDeck(
  subject: string,
  difficulty: MemoryDifficulty,
  roundSeed: number,
): MemoryCard[] {
  const config = MEMORY_DIFFICULTIES[difficulty];
  const preferred = getRandomWords(subject, config.pairCount, config.wordDifficulty);
  const words =
    preferred.length >= config.pairCount ? preferred : getRandomWords(subject, config.pairCount);

  if (words.length === 0) {
    return [];
  }

  const rotation = roundSeed % words.length;
  const reshuffledWords =
    rotation === 0 ? words : [...words.slice(rotation), ...words.slice(0, rotation)];

  return generateMemoryCards(reshuffledWords);
}

const MemoryMatchGame = ({ subject, onComplete, onBack, initialDifficulty }: MemoryMatchGameProps) => {
  const { playSound } = useGameAudio();
  const [difficulty, setDifficulty] = useState<MemoryDifficulty>(initialDifficulty ?? 'medium');
  const [roundSeed, setRoundSeed] = useState(0);
  const [startTime, setStartTime] = useState(() => Date.now());
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [showTimer, setShowTimer] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
  const [lastMatchId, setLastMatchId] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [canFlip, setCanFlip] = useState(true);
  const [currentCombo, setCurrentCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);

  useEffect(() => {
    if (!initialDifficulty || initialDifficulty === difficulty) return;
    setDifficulty(initialDifficulty);
    setRoundSeed((seed) => seed + 1);
  }, [initialDifficulty, difficulty]);

  const cards = useMemo<MemoryCard[]>(
    () => buildDeck(subject, difficulty, roundSeed),
    [subject, difficulty, roundSeed],
  );
  const totalPairs = cards.length / 2;
  const matchedPairs = matched.size / 2;
  const elapsedSeconds = globalThis.Math.floor((currentTime - startTime) / 1000);

  useEffect(() => {
    setStartTime(Date.now());
    setCurrentTime(Date.now());
    setShowComplete(false);
    setFinalResult(null);
    setLastMatchId(null);
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setCanFlip(true);
    setCurrentCombo(0);
    setBestCombo(0);
  }, [cards]);

  useEffect(() => {
    if (!showTimer || showComplete) return;
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [showComplete, showTimer]);

  const resetRound = useCallback((nextDifficulty?: MemoryDifficulty) => {
    if (nextDifficulty) {
      setDifficulty(nextDifficulty);
    }
    setRoundSeed((seed) => seed + 1);
  }, []);

  const handleDifficultyChange = useCallback(
    (nextDifficulty: MemoryDifficulty) => {
      if (nextDifficulty === difficulty) return;
      resetRound(nextDifficulty);
    },
    [difficulty, resetRound],
  );

  const handleCardClick = useCallback(
    (cardId: string) => {
      if (!canFlip || flipped.includes(cardId) || matched.has(cardId)) return;

      void playSound('pop');
      const newFlipped = [...flipped, cardId];
      setFlipped(newFlipped);

      if (newFlipped.length !== 2) return;

      setMoves((count) => count + 1);
      setCanFlip(false);

      const card1 = cards.find((card) => card.id === newFlipped[0]);
      const card2 = cards.find((card) => card.id === newFlipped[1]);

      if (!card1 || !card2) {
        setFlipped([]);
        setCanFlip(true);
        return;
      }

      if (card1.pairId === card2.pairId) {
        void playSound('success');
        setLastMatchId(card1.pairId);

        const nextCombo = currentCombo + 1;
        setCurrentCombo(nextCombo);
        setBestCombo((combo) => globalThis.Math.max(combo, nextCombo));

        setTimeout(() => setLastMatchId(null), 800);

        setTimeout(() => {
          const updatedMatched = new Set([...matched, card1.id, card2.id]);
          const completedBoard = updatedMatched.size === cards.length;

          setMatched(updatedMatched);
          setFlipped([]);
          setCanFlip(true);

          if (completedBoard) {
            const timeSpent = globalThis.Math.floor((Date.now() - startTime) / 1000);
            const baseResult = calculateMemoryScore(totalPairs, moves + 1, timeSpent);
            const comboBonus = globalThis.Math.max(0, nextCombo - 1) * 5;
            const difficultyBonus = MEMORY_DIFFICULTIES[difficulty].scoreBonus;

            setFinalResult({
              score: baseResult.score + comboBonus + difficultyBonus,
              stars: baseResult.stars,
              time: timeSpent,
              comboBonus,
              difficultyBonus,
            });
            setShowComplete(true);
            void playSound('victory');
            void confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#22d3ee', '#ec4899', '#fbbf24', '#ff5fd2'],
            });
          }
        }, 600);
      } else {
        void playSound('error');
        setCurrentCombo(0);
        setTimeout(() => {
          setFlipped([]);
          setCanFlip(true);
        }, 1000);
      }
    },
    [canFlip, cards, currentCombo, difficulty, flipped, matched, moves, playSound, startTime, totalPairs],
  );

  const handleFinish = () => {
    if (!finalResult) return;
    onComplete(finalResult.score, finalResult.stars, finalResult.time);
  };

  const currentDifficulty = MEMORY_DIFFICULTIES[difficulty];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-6 pb-36 md:pb-8">
      <div className="mx-auto max-w-6xl">
        <div className="glass-card mb-6 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 transition-colors hover:bg-purple-700"
            >
              <ArrowLeft size={20} />
              Back
            </button>

            <div className="flex flex-wrap items-center gap-3 text-white">
              <div className="flex items-center gap-2">
                <Zap size={20} className="text-yellow-400" />
                <span className="font-medium">{moves} moves</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers3 size={20} className="text-cyan-300" />
                <span className="font-medium">
                  {matchedPairs}/{totalPairs} pairs
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-pink-300" />
                <span className="font-medium">Combo {currentCombo}x</span>
              </div>
              <button
                onClick={() => setShowTimer((enabled) => !enabled)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1 transition-colors ${
                  showTimer ? 'bg-cyan-600/40 text-cyan-300' : 'bg-white/10 text-white/60'
                }`}
                aria-label={showTimer ? 'Hide timer' : 'Show timer'}
              >
                <Clock size={18} />
                {showTimer && <span className="font-medium">{elapsedSeconds}s</span>}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="mb-2 text-3xl font-bold text-center neon-text-primary">
              {subject} Memory Match
            </h2>
            <p className="text-center text-sm text-white/70">{currentDifficulty.helper}</p>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            {(Object.entries(MEMORY_DIFFICULTIES) as [MemoryDifficulty, MemoryDifficultyConfig][])
              .map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => handleDifficultyChange(key)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] transition-colors ${
                    difficulty === key
                      ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100'
                      : 'border-white/10 bg-white/5 text-white/65 hover:border-cyan-400/40 hover:text-white'
                  }`}
                >
                  {config.label} · {config.pairCount} pairs
                </button>
              ))}
            <button
              onClick={() => resetRound()}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-white/80 transition-colors hover:border-pink-300/40 hover:text-white"
            >
              <RotateCcw size={16} />
              New Round
            </button>
          </div>

          <div className="mb-6 grid gap-3 text-center text-sm text-white/80 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-cyan-300">Best Combo</div>
              <div className="mt-1 text-xl font-bold text-white">{bestCombo}x</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-cyan-300">Difficulty Bonus</div>
              <div className="mt-1 text-xl font-bold text-white">+{currentDifficulty.scoreBonus}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-cyan-300">Board Size</div>
              <div className="mt-1 text-xl font-bold text-white">{cards.length} cards</div>
            </div>
          </div>

          <div className="mb-6 flex items-center justify-center gap-2">
            {Array.from({ length: totalPairs }).map((_, index) => (
              <div
                key={index}
                className={`h-3 w-3 rounded-full transition-all duration-300 ${
                  index < matchedPairs
                    ? 'scale-110 bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.5)]'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
            {cards.map((card) => {
              const isFlipped = flipped.includes(card.id) || matched.has(card.id);
              const isMatched = matched.has(card.id);
              const justMatched = lastMatchId === card.pairId;

              return (
                <MemoizedCardItem
                  key={card.id}
                  card={card}
                  isFlipped={isFlipped}
                  isMatched={isMatched}
                  justMatched={justMatched}
                  canFlip={canFlip}
                  onClick={handleCardClick}
                />
              );
            })}
          </div>

          <p className="mt-6 text-center text-white/80">
            Match each word with its clue. Consecutive matches build combo bonus score.
          </p>
        </div>
      </div>

      <GameCompletionModal
        open={showComplete && !!finalResult}
        title="Great Job!"
        subtitle={`${currentDifficulty.label} board complete with a ${bestCombo}x best combo streak.`}
        stars={finalResult?.stars ?? 0}
        stats={[
          { label: 'Score', value: finalResult?.score ?? 0 },
          { label: 'Time', value: `${finalResult?.time ?? 0}s` },
          { label: 'Combo Bonus', value: `+${finalResult?.comboBonus ?? 0}` },
          { label: 'Difficulty Bonus', value: `+${finalResult?.difficultyBonus ?? 0}` },
        ]}
        primaryLabel="Finish"
        primaryAction={handleFinish}
        secondaryLabel="Play Again"
        secondaryAction={() => resetRound()}
      />
    </div>
  );
};

const MemoizedCardItem = memo(
  ({
    card,
    isFlipped,
    isMatched,
    justMatched,
    canFlip,
    onClick,
  }: {
    card: MemoryCard;
    isFlipped: boolean;
    isMatched: boolean;
    justMatched: boolean;
    canFlip: boolean;
    onClick: (id: string) => void;
  }) => {
    const [{ scale }, api] = useSpring(() => ({
      scale: 1,
      config: { mass: 1, tension: 400, friction: 20 },
    }));

    return (
      <animated.div
        onClick={() => onClick(card.id)}
        onMouseEnter={() => !isFlipped && canFlip && api.start({ scale: 1.05 })}
        onMouseLeave={() => api.start({ scale: 1 })}
        onMouseDown={() => canFlip && api.start({ scale: 0.95 })}
        onMouseUp={() => canFlip && api.start({ scale: 1.05 })}
        style={{ scale, touchAction: 'manipulation' }}
        className={`aspect-square cursor-pointer [perspective:600px] ${
          isMatched && !justMatched
            ? 'opacity-30'
            : !canFlip && !isFlipped
              ? 'opacity-50'
              : ''
        } transition-opacity duration-300`}
      >
        <div
          className={`relative h-full w-full [transform-style:preserve-3d] transition-transform duration-[400ms] ease-out ${
            isFlipped ? '[transform:rotateY(180deg)]' : ''
          } ${justMatched ? 'animate-bounce' : ''}`}
        >
          <div className="absolute inset-0 flex items-center justify-center rounded-xl border-4 border-purple-400 bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg [backface-visibility:hidden]">
            <div className="text-5xl font-bold text-white drop-shadow-lg sm:text-6xl">?</div>
          </div>

          <div
            className={`absolute inset-0 flex items-center justify-center rounded-xl border-4 p-3 shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)] ${
              isMatched ? 'border-violet-600 bg-violet-400' : 'border-cyan-400 bg-white'
            }`}
          >
            {justMatched && (
              <Sparkles size={20} className="absolute right-1 top-1 animate-ping text-yellow-400" />
            )}
            <div
              className={`break-words text-center leading-tight ${
                card.type === 'word'
                  ? 'text-base font-bold text-purple-900 sm:text-xl'
                  : 'text-xs font-medium text-gray-800 sm:text-sm'
              }`}
            >
              {card.content}
            </div>
          </div>
        </div>
      </animated.div>
    );
  },
);

export default MemoryMatchGame;
