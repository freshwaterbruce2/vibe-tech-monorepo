import { ArrowLeft, Clock, RotateCcw, Sparkles, Star, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { MemoryCard } from '../../services/puzzleGenerator';
import { calculateMemoryScore, generateMemoryCards } from '../../services/puzzleGenerator';
import { getRandomWords } from '../../services/wordBanks';

interface MemoryMatchGameProps {
  subject: string;
  onComplete: (score: number, stars: number, timeSpent: number) => void;
  onBack: () => void;
}

const MemoryMatchGame = ({ subject, onComplete, onBack }: MemoryMatchGameProps) => {
  const [startTime] = useState(() => Date.now());
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [showTimer, setShowTimer] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [finalResult, setFinalResult] = useState<{
    score: number;
    stars: number;
    time: number;
  } | null>(null);
  const [lastMatchId, setLastMatchId] = useState<string | null>(null);

  const cards = useMemo<MemoryCard[]>(() => {
    const words = getRandomWords(subject, 6);
    return generateMemoryCards(words);
  }, [subject]);

  useEffect(() => {
    if (!showTimer) return;
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [showTimer]);

  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [canFlip, setCanFlip] = useState(true);

  const totalPairs = cards.length / 2;
  const matchedPairs = matched.size / 2;

  const handleCardClick = (cardId: string) => {
    if (!canFlip || flipped.includes(cardId) || matched.has(cardId)) return;

    const newFlipped = [...flipped, cardId];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      setCanFlip(false);

      const card1 = cards.find((c) => c.id === newFlipped[0]);
      const card2 = cards.find((c) => c.id === newFlipped[1]);

      if (!card1 || !card2) return;

      if (card1.pairId === card2.pairId) {
        // Match!
        setLastMatchId(card1.pairId);
        setTimeout(() => setLastMatchId(null), 800);

        setTimeout(() => {
          setMatched((prev) => new Set([...prev, card1.id, card2.id]));
          setFlipped([]);
          setCanFlip(true);

          // Check if game complete
          if (matched.size + 2 === cards.length) {
            const timeSpent = Math.floor((Date.now() - startTime) / 1000);
            const result = calculateMemoryScore(cards.length / 2, moves + 1, timeSpent);
            setFinalResult({ score: result.score, stars: result.stars, time: timeSpent });
            setShowComplete(true);
          }
        }, 600);
      } else {
        // No match — gentle shake
        setTimeout(() => {
          setFlipped([]);
          setCanFlip(true);
        }, 1000);
      }
    }
  };

  const handleFinish = () => {
    if (finalResult) {
      onComplete(finalResult.score, finalResult.stars, finalResult.time);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-6 pb-36 md:pb-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="glass-card p-4 mb-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
            Back
          </button>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-yellow-400" />
              <span className="text-white font-medium">{moves} moves</span>
            </div>
            {/* Timer opt-in toggle */}
            <button
              onClick={() => setShowTimer((t) => !t)}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
                showTimer ? 'bg-cyan-600/40 text-cyan-300' : 'bg-white/10 text-white/50'
              }`}
              aria-label={showTimer ? 'Hide timer' : 'Show timer'}
            >
              <Clock size={18} />
              {showTimer && (
                <span className="font-medium">{Math.floor((currentTime - startTime) / 1000)}s</span>
              )}
            </button>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-3xl font-bold text-center mb-2 neon-text-primary">
            {subject} Memory Match
          </h2>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {Array.from({ length: totalPairs }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  i < matchedPairs
                    ? 'bg-emerald-400 scale-110 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                    : 'bg-white/20'
                }`}
              />
            ))}
            <span className="text-white/60 text-sm ml-2">
              {matchedPairs}/{totalPairs}
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {cards.map((card) => {
              const isFlipped = flipped.includes(card.id) || matched.has(card.id);
              const isMatched = matched.has(card.id);
              const justMatched = lastMatchId === card.pairId;

              return (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  className={`aspect-square cursor-pointer [perspective:600px] ${
                    isMatched && !justMatched
                      ? 'opacity-30'
                      : !canFlip && !isFlipped
                        ? 'opacity-50'
                        : 'hover:scale-105'
                  } transition-all`}
                  style={{ touchAction: 'manipulation' }}
                >
                  <div
                    className={`relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${
                      isFlipped ? '[transform:rotateY(180deg)]' : ''
                    } ${justMatched ? 'animate-bounce' : ''}`}
                  >
                    {/* Card Back */}
                    <div className="absolute inset-0 rounded-xl flex items-center justify-center shadow-lg border-4 bg-gradient-to-br from-purple-600 to-pink-600 border-purple-400 [backface-visibility:hidden]">
                      <div className="text-white text-5xl sm:text-6xl font-bold drop-shadow-lg">
                        ?
                      </div>
                    </div>

                    {/* Card Front */}
                    <div
                      className={`absolute inset-0 rounded-xl flex items-center justify-center p-3 shadow-lg border-4 [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                        isMatched ? 'bg-green-400 border-green-600' : 'bg-white border-cyan-400'
                      }`}
                    >
                      {justMatched && (
                        <Sparkles
                          size={20}
                          className="absolute top-1 right-1 text-yellow-400 animate-ping"
                        />
                      )}
                      <div
                        className={`text-center break-words leading-tight ${
                          card.type === 'word'
                            ? 'text-purple-900 font-bold text-base sm:text-xl'
                            : 'text-gray-800 text-xs sm:text-sm font-medium'
                        }`}
                      >
                        {card.content}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-white/80 mt-6">Match words with their definitions!</p>
        </div>
      </div>

      {/* Celebration overlay */}
      {showComplete && finalResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-[fadeIn_0.3s_ease]">
          <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl p-8 max-w-sm w-full mx-4 text-center border border-purple-500/30 shadow-2xl animate-[scaleIn_0.3s_ease]">
            <div className="text-5xl mb-3">🎉</div>
            <h3 className="text-2xl font-bold text-white mb-2">Great Job!</h3>
            <p className="text-white/70 mb-4">You matched all the pairs!</p>

            {/* Stars */}
            <div className="flex justify-center gap-1 mb-4">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  size={32}
                  className={`transition-all duration-500 ${
                    s <= finalResult.stars
                      ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]'
                      : 'text-white/20'
                  }`}
                  style={{ animationDelay: `${s * 0.15}s` }}
                />
              ))}
            </div>

            <div className="flex justify-center gap-6 mb-6 text-sm text-white/80">
              <span>
                Score: <strong className="text-white">{finalResult.score}</strong>
              </span>
              <span>
                Moves: <strong className="text-white">{moves}</strong>
              </span>
              <span>
                Time: <strong className="text-white">{finalResult.time}s</strong>
              </span>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => globalThis.location.reload()}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
              >
                <RotateCcw size={16} /> Play Again
              </button>
              <button
                onClick={handleFinish}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-medium transition-colors"
              >
                ✓ Finish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryMatchGame;
