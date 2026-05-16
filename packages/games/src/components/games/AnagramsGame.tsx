import { animated, useSpring } from '@react-spring/web';
import confetti from 'canvas-confetti';
import { ArrowLeft, CheckCircle, Clock, Lightbulb, XCircle } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import { useGameAudio } from '../../hooks/useGameAudio';
import type { AnagramChallenge } from '../../services/puzzleGenerator';
import { calculateAnagramScore, generateAnagrams } from '../../services/puzzleGenerator';
import { getAnagramWords } from '../../services/wordBanks';
import GameCompletionModal from './GameCompletionModal';

interface AnagramsGameProps {
  subject: string;
  onComplete: (score: number, stars: number, timeSpent: number) => void;
  onBack: () => void;
}

interface AnagramFinalResult {
  score: number;
  stars: number;
  time: number;
  solved: number;
  hintsUsed: number;
}

const AnagramsGame = memo(function AnagramsGame({ subject, onComplete, onBack }: AnagramsGameProps) {
  const [roundSeed, setRoundSeed] = useState(0);
  const [startTime, setStartTime] = useState(() => Date.now());
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const { playSound } = useGameAudio();

  const [anagramProps, api] = useSpring(() => ({
    from: { opacity: 0, y: 50 },
    to: { opacity: 1, y: 0 },
    config: { tension: 300, friction: 15 },
  }));
  const anagrams = useMemo<AnagramChallenge[]>(() => {
    const words = getAnagramWords(subject, 10);
    if (words.length === 0) {
      return [];
    }

    const rotation = roundSeed % words.length;
    const reshuffledWords =
      rotation === 0 ? words : [...words.slice(rotation), ...words.slice(0, rotation)];

    return generateAnagrams(reshuffledWords);
  }, [subject, roundSeed]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [solved, setSolved] = useState<Set<number>>(new Set());
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [finalResult, setFinalResult] = useState<AnagramFinalResult | null>(null);

  useEffect(() => {
    if (showComplete) return;
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [showComplete]);

  const currentAnagram = anagrams[currentIndex];

  useEffect(() => {
    setCurrentIndex(0);
    setUserAnswer('');
    setSolved(new Set());
    setHintsUsed(0);
    setShowHint(false);
    setFeedback(null);
    setShowComplete(false);
    setFinalResult(null);
    setStartTime(Date.now());
    setCurrentTime(Date.now());
    void api.start({ from: { opacity: 0, y: 50 }, to: { opacity: 1, y: 0 } });
  }, [anagrams, api]);

  const finalizeGame = (solvedCount: number, celebrate: boolean) => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const result = calculateAnagramScore(solvedCount, anagrams.length, hintsUsed, timeSpent);

    if (celebrate) {
      void playSound('victory');
      void confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#22d3ee', '#38BDF8', '#F97316'],
      });
    } else {
      void playSound(result.stars >= 3 ? 'success' : 'pop');
    }

    setShowComplete(true);
    setFinalResult({
      score: result.score,
      stars: result.stars,
      time: timeSpent,
      solved: solvedCount,
      hintsUsed,
    });
  };

  const handleContinue = () => {
    if (!finalResult) return;
    onComplete(finalResult.score, finalResult.stars, finalResult.time);
  };

  const resetGame = () => {
    setRoundSeed((seed) => seed + 1);
  };

  const handleSubmit = () => {
    if (!currentAnagram || !userAnswer.trim() || showComplete) return;

    if (userAnswer.toUpperCase() === currentAnagram.original) {
      // Correct!
      void playSound('success');
      setFeedback('correct');
      setSolved((prev) => new Set([...prev, currentIndex]));

      setTimeout(() => {
        if (currentIndex < anagrams.length - 1) {
          setCurrentIndex((i) => i + 1);
          setUserAnswer('');
          setShowHint(false);
          setFeedback(null);
          void api.start({ from: { opacity: 0, y: 50 }, to: { opacity: 1, y: 0 } });
        } else {
          finalizeGame(solved.size + 1, true);
        }
      }, 1000);
    } else {
      setFeedback('wrong');
      void playSound('error');
      setTimeout(() => setFeedback(null), 1000);
    }
  };

  const handleSkip = () => {
    if (showComplete) return;
    void playSound('pop');
    if (currentIndex < anagrams.length - 1) {
      setCurrentIndex((i) => i + 1);
      setUserAnswer('');
      setShowHint(false);
      setFeedback(null);
      void api.start({ from: { opacity: 0, y: 50 }, to: { opacity: 1, y: 0 } });
    } else {
      finalizeGame(solved.size, false);
    }
  };

  const handleHint = () => {
    if (showComplete) return;
    void playSound('pop');
    setShowHint(true);
    setHintsUsed((h) => h + 1);
  };

  if (!currentAnagram) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-sky-900 p-6 flex items-center justify-center">
        <div className="text-white text-xl">Loading anagrams...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-sky-900 p-6 pb-36 md:pb-8">
      <div className="max-w-4xl mx-auto">
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
              <CheckCircle size={20} className="text-sky-400" />
              <span className="text-white font-medium">
                {solved.size}/{anagrams.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Lightbulb size={20} className="text-yellow-400" />
              <span className="text-white font-medium">{hintsUsed} hints</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-cyan-400" />
              <span className="text-white font-medium">
                {Math.floor((currentTime - startTime) / 1000)}s
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-3xl font-bold text-center mb-6 neon-text-primary">
            {subject} Anagrams
          </h2>

          {/* Progress */}
          <div className="mb-6 text-center">
            <div className="text-white/80 mb-2">
              Question {currentIndex + 1} of {anagrams.length}
            </div>
            <div className="flex justify-center gap-1.5">
              {anagrams.map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    solved.has(i)
                      ? 'bg-sky-400 scale-110'
                      : i === currentIndex
                        ? 'bg-cyan-400 animate-pulse'
                        : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Scrambled Word */}
          <div className="mb-8 text-center">
            <animated.div className="inline-flex gap-2 mb-4" style={anagramProps}>
              {currentAnagram.scrambled.split('').map((letter, i) => (
                <div
                  key={i}
                  className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg text-white text-2xl sm:text-3xl font-bold shadow-lg hover:scale-110 hover:-translate-y-1 transition-transform cursor-default"
                >
                  {letter}
                </div>
              ))}
            </animated.div>
            <p className="text-white/80 text-lg">Unscramble the letters!</p>
          </div>

          {/* Clue */}
          <div className="mb-6 p-4 bg-purple-800/30 rounded-lg border border-purple-500/30">
            <div className="text-sm text-white/60 mb-1">Clue:</div>
            <div className="text-white font-medium">{currentAnagram.clue}</div>
          </div>

          {/* Hint */}
          {showHint && (
            <div className="mb-6 p-4 bg-yellow-800/30 rounded-lg border border-yellow-500/30">
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <Lightbulb size={20} />
                <span className="font-bold">Hint</span>
              </div>
              <div className="text-white">
                First letter:{' '}
                <span className="font-bold text-xl">{currentAnagram.original[0]}</span>
              </div>
              <div className="text-white">
                Length: <span className="font-bold">{currentAnagram.original.length} letters</span>
              </div>
            </div>
          )}

          {/* Answer Input */}
          <div className="mb-6">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Type your answer..."
              className={`w-full px-6 py-4 bg-white/10 border-2 rounded-lg text-white text-xl font-bold text-center placeholder-white/50 focus:outline-none focus:ring-2 transition-all ${
                feedback === 'correct'
                  ? 'border-sky-500 focus:ring-sky-500'
                  : feedback === 'wrong'
                    ? 'border-red-500 focus:ring-red-500 shake'
                    : 'border-purple-500 focus:ring-cyan-500'
              }`}
              autoFocus
            />

            {feedback === 'correct' && (
              <div className="mt-2 flex items-center justify-center gap-2 text-sky-400">
                <CheckCircle size={20} />
                <span className="font-bold">Correct!</span>
              </div>
            )}
            {feedback === 'wrong' && (
              <div className="mt-2 flex items-center justify-center gap-2 text-red-400">
                <XCircle size={20} />
                <span className="font-bold">Try again!</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleHint}
              disabled={showHint}
              className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${
                showHint
                  ? 'bg-gray-600 cursor-not-allowed opacity-50'
                  : 'bg-yellow-600 hover:bg-yellow-700 transform hover:scale-105'
              }`}
            >
              Get Hint
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-600 to-violet-600 hover:from-violet-700 hover:to-violet-700 rounded-lg font-bold transition-all transform hover:scale-105"
            >
              Submit
            </button>
            <button
              onClick={handleSkip}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-lg font-bold transition-all transform hover:scale-105"
            >
              Skip
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .shake {
          animation: shake 0.5s;
        }
      `}</style>

      <GameCompletionModal
        open={showComplete && !!finalResult}
        title="Round Complete"
        subtitle={`You solved ${finalResult?.solved ?? 0} of ${anagrams.length} anagrams in ${finalResult?.time ?? 0}s.`}
        stars={finalResult?.stars ?? 0}
        stats={[
          { label: 'Score', value: finalResult?.score ?? 0 },
          { label: 'Solved', value: `${finalResult?.solved ?? 0}/${anagrams.length}` },
          { label: 'Time', value: `${finalResult?.time ?? 0}s` },
          { label: 'Hints Used', value: finalResult?.hintsUsed ?? 0 },
        ]}
        primaryLabel="Continue"
        primaryAction={handleContinue}
        secondaryLabel="Play Again"
        secondaryAction={resetGame}
      />
    </div>
  );
});

export default AnagramsGame;
