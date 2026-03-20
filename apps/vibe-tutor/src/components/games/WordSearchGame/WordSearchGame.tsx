import { ArrowLeft, CheckCircle, Clock, Lightbulb, Pause, Play, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { updateGameStats } from '../../../services/gameAchievements';
import { learningAnalytics } from '../../../services/learningAnalytics';
import type { WordSearchGrid as WordSearchGridType } from '../../../services/puzzleGenerator';
import { calculateWordSearchScore, generateWordSearch } from '../../../services/puzzleGenerator';
import { getRandomWords } from '../../../services/wordBanks';
import { appStore } from '../../../utils/electronStore';
import { useGameAudio } from '../../../hooks/useGameAudio';
import confetti from 'canvas-confetti';
import GameSettings, {
  getSavedGameConfig,
  getDifficultyHintPenalty,
  saveGameConfig,
  type GameConfig,
} from '../../settings/GameSettings';
import CelebrationEffect from '../../ui/CelebrationEffect';
import GameCompletionModal from '../GameCompletionModal';
import WordSearchGrid from './WordSearchGrid';
import WordSearchWordList from './WordSearchWordList';
import { useWordSearchInput } from './useWordSearchInput';

interface WordSearchGameProps {
  subject: string;
  onComplete: (score: number, stars: number, timeSpent: number) => void;
  onBack: () => void;
  initialConfig?: Partial<GameConfig>;
}

interface WordSearchFinalResult {
  score: number;
  stars: number;
  accuracy: number;
  hintsPenalty: number;
  time: number;
}

const WordSearchGame = ({ subject, onComplete, onBack, initialConfig = {} }: WordSearchGameProps) => {
  const { playSound } = useGameAudio();
  // Game configuration
  const [config, setConfig] = useState<GameConfig>(() => ({
    ...getSavedGameConfig('wordsearch'),
    ...initialConfig,
  }));
  const [showSettings, setShowSettings] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);

  // Game state
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [puzzle, setPuzzle] = useState<WordSearchGridType | null>(null);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());

  // Enhancement state
  const [celebrate, setCelebrate] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [finalResult, setFinalResult] = useState<WordSearchFinalResult | null>(null);
  const [showTutorial, setShowTutorial] = useState(() => {
    return !appStore.get('wordsearch-tutorial-seen');
  });
  const [isCompleting, setIsCompleting] = useState(false);

  const hintPenalty = config.hintPenalty ?? getDifficultyHintPenalty(config.difficulty || 'medium');
  const isBoardBlocked = isPaused || showComplete;

  // Input handling (mouse + touch)
  const input = useWordSearchInput({
    puzzle,
    foundWords,
    setFoundWords,
    setCelebrate,
    config,
    isActive: gameStarted && !isBoardBlocked,
    playSound,
  });

  // Generate puzzle moved to startGame

  const handleFinish = useCallback(() => {
    if (isCompleting || !puzzle) return;
    const timeSpent = elapsedTime;
    const baseResult = calculateWordSearchScore(foundWords.size, puzzle.words.length, timeSpent);
    const finalPenalty = hintsUsed * hintPenalty;
    const finalScore = Math.max(0, baseResult.score - finalPenalty);

    setIsCompleting(true);
    setShowComplete(true);
    setFinalResult({
      score: finalScore,
      stars: baseResult.stars,
      accuracy: baseResult.accuracy,
      hintsPenalty: finalPenalty,
      time: timeSpent,
    });

    saveGameConfig('wordsearch', config);

    void confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6347', '#00FF00', '#00FFFF'],
    });

    if (config.soundEnabled) {
      playSound('victory');
    }

    const completionRate = foundWords.size / puzzle.words.length;
    void learningAnalytics.endSession(completionRate);

    updateGameStats(
      foundWords.size,
      puzzle.words.length,
      timeSpent,
      finalScore,
      config.difficulty ?? 'medium',
      subject,
      hintsUsed,
    );
  }, [
    config,
    elapsedTime,
    foundWords.size,
    hintPenalty,
    hintsUsed,
    isCompleting,
    playSound,
    puzzle,
    subject,
  ]);

  const handleContinue = useCallback(() => {
    if (!finalResult) return;
    onComplete(finalResult.score, finalResult.stars, finalResult.time);
  }, [finalResult, onComplete]);

  const resetGame = useCallback(() => {
    setShowComplete(false);
    setFinalResult(null);
    setIsCompleting(false);
    setIsPaused(false);
    setFoundWords(new Set());
    setHintsUsed(0);
    setRevealedCells(new Set());
    setElapsedTime(0);

    const words = getRandomWords(subject, config.wordCount ?? 8, config.difficulty);
    const wordSearch = generateWordSearch(words, config.gridSize ?? 12);
    setPuzzle(wordSearch);
    setStartTime(Date.now());
    learningAnalytics.startSession('wordsearch', subject, config.difficulty);
  }, [config, config.difficulty, config.gridSize, config.wordCount, subject]);

  // Timer effect
  useEffect(() => {
    if (!gameStarted || isPaused || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);

      if (
        !isCompleting &&
        config.timerMode === 'timed' &&
        config.timeLimit &&
        elapsed >= config.timeLimit
      ) {
        handleFinish();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStarted, isPaused, isCompleting, startTime, config.timerMode, config.timeLimit, handleFinish]);

  useEffect(() => {
    if (!gameStarted || !puzzle || showComplete || isCompleting) return;
    if (foundWords.size >= puzzle.words.length && puzzle.words.length > 0) {
      handleFinish();
    }
  }, [foundWords.size, gameStarted, handleFinish, isCompleting, puzzle, showComplete]);

  const handlePauseToggle = () => {
    if (showComplete) return;
    setIsPaused((current) => !current);
  };

  const handleBackClick = () => {
    // If game hasn't started or no words found, quit instantly
    if (!gameStarted || foundWords.size === 0) {
      onBack();
    } else {
      setShowQuitConfirm(true);
    }
  };

  const handleUseHint = useCallback(() => {
    if (!puzzle || !config.hintsEnabled) return;

    const unfoundWords = puzzle.words.filter((w) => !foundWords.has(w.word));
    if (unfoundWords.length === 0) return;

    const randomWord = unfoundWords[Math.floor(Math.random() * unfoundWords.length)];
    if (!randomWord) return;
    const firstCellKey = `${randomWord.startRow}-${randomWord.startCol}`;
    const newRevealed = new Set(revealedCells);
    newRevealed.add(firstCellKey);
    setRevealedCells(newRevealed);
    setHintsUsed((h) => h + 1);

    if (config.soundEnabled) {
      playSound('pop');
    }
  }, [puzzle, foundWords, config.hintsEnabled, config.soundEnabled, revealedCells, playSound]);

  const startGame = useCallback(() => {
    setShowSettings(false);
    setGameStarted(true);
    resetGame();
  }, [resetGame]);

  const closeTutorial = () => {
    setShowTutorial(false);
    appStore.set('wordsearch-tutorial-seen', 'true');
  };

  // --- Early returns for loading / error / settings / tutorial ---

  if (!puzzle) {
    if (!gameStarted) {
      // Show settings screen
      if (showSettings) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-6 flex items-center justify-center">
            <div className="max-w-2xl w-full">
              <div className="glass-card p-8 border border-purple-500/50">
                <div className="text-center mb-8">
                  <h2 className="text-4xl font-bold mb-2 neon-text-primary">Word Hunt Settings</h2>
                  <p className="text-gray-300">Configure your game before starting</p>
                </div>
                <GameSettings
                  config={config}
                  onChange={(newConfig) => {
                    setConfig(newConfig);
                    saveGameConfig('wordsearch', newConfig);
                  }}
                  gameType="wordsearch"
                />
                <div className="mt-8 flex gap-4">
                  <button
                    onClick={onBack}
                    className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-bold text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={startGame}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-bold text-white transition-all transform hover:scale-105"
                  >
                    Start Game
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-6 flex items-center justify-center">
        <div className="text-white text-xl">Generating puzzle...</div>
      </div>
    );
  }

  // Validate puzzle grid
  if (!puzzle.grid || !Array.isArray(puzzle.grid) || puzzle.grid.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Error loading puzzle</div>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-bold"
          >
            Back to Games
          </button>
        </div>
      </div>
    );
  }

  // Validate word positions
  const invalidWords = puzzle.words.filter(
    (w) =>
      w.startRow === undefined ||
      w.startCol === undefined ||
      w.endRow === undefined ||
      w.endCol === undefined,
  );
  if (invalidWords.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Error: Some words have invalid positions</div>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-bold"
          >
            Back to Games
          </button>
        </div>
      </div>
    );
  }

  // Tutorial
  if (showTutorial && gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <div className="glass-card p-8 border border-cyan-500/50">
            <div className="text-center mb-6">
              <Sparkles size={48} className="mx-auto mb-4 text-yellow-400 animate-bounce" />
              <h2 className="text-3xl font-bold mb-2 text-white">How to Play Word Hunt</h2>
              <p className="text-gray-300">Quick tutorial for first-timers</p>
            </div>
            <div className="space-y-4 mb-8">
              <TutorialStep
                emoji="👆"
                color="cyan"
                title="Swipe to Select"
                desc="Touch the first letter and drag to the last letter of the word"
              />
              <TutorialStep
                emoji="✨"
                color="green"
                title="Words Highlight Green"
                desc="When you find a word, it turns green and you get points!"
              />
              <TutorialStep
                emoji="💡"
                color="yellow"
                title="Need Help?"
                desc={`Use the hint button to reveal the first letter of a word (costs ${hintPenalty} points)`}
              />
              <TutorialStep
                emoji="🎯"
                color="purple"
                title="Words Go Any Direction"
                desc="Horizontal, vertical, or diagonal - forwards or backwards!"
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) appStore.set('wordsearch-tutorial-seen', 'true');
                  }}
                  className="rounded"
                />
                Don't show this again
              </label>
              <button
                onClick={closeTutorial}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-lg font-bold text-white transition-all"
              >
                Got it! Let's Play
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Main game render ---
  const wordsRemaining = puzzle.words.length - foundWords.size;
  const timeRemaining =
    config.timerMode === 'timed' && config.timeLimit ? config.timeLimit - elapsedTime : null;
  const progressPercent = (foundWords.size / puzzle.words.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-6 pb-36 md:pb-8">
      <CelebrationEffect trigger={celebrate} type="confetti" duration={1000} />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass-card p-4 mb-6">
           <div className="flex items-center justify-between mb-3">
              <button
                onClick={handleBackClick}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} /> Back
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePauseToggle}
                  disabled={showComplete}
                  className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
                  title={showComplete ? 'Session complete' : isPaused ? 'Resume' : 'Pause'}
                >
                  {isPaused ? <Play size={20} /> : <Pause size={20} />}
                </button>
              {config.hintsEnabled && (
                <button
                  onClick={handleUseHint}
                  disabled={wordsRemaining === 0 || showComplete}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                  title={`Reveal first letter (${hintPenalty} points)`}
                >
                  <Lightbulb size={20} />
                  <span className="hidden sm:inline">Hint</span>
                  {hintsUsed > 0 && <span className="text-xs">({hintsUsed})</span>}
                </button>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-400" />
              <span className="text-white font-medium">
                {foundWords.size}/{puzzle.words.length} words
              </span>
              {wordsRemaining > 0 && (
                <span className="text-sm text-gray-400">({wordsRemaining} left)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Clock
                size={20}
                className={
                  timeRemaining && timeRemaining < 60
                    ? 'text-red-400 animate-pulse'
                    : 'text-cyan-400'
                }
              />
              <span className="text-white font-medium">
                {config.timerMode === 'timed' && timeRemaining !== null
                  ? `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}`
                  : `${Math.floor(elapsedTime / 60)}:${(elapsedTime % 60).toString().padStart(2, '0')}`}
              </span>
            </div>
            {hintsUsed > 0 && (
              <div className="flex items-center gap-2">
                <Lightbulb size={16} className="text-yellow-400" />
                <span className="text-sm text-gray-400">
                  -{hintsUsed * hintPenalty} pts (hints)
                </span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <style>{`.wordsearch-progress-fill { width: ${progressPercent}%; }`}</style>
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500 wordsearch-progress-fill"
              />
            </div>
          </div>
        </div>

        {/* Grid + Word list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <WordSearchGrid
            puzzle={puzzle}
            foundWords={foundWords}
            selectedCells={input.selectedCells}
            revealedCells={revealedCells}
            isPaused={isPaused}
            isInteractionLocked={isBoardBlocked}
            highContrast={config.highContrast}
            onPauseToggle={handlePauseToggle}
            onCellMouseDown={input.handleCellMouseDown}
            onCellMouseEnter={input.handleCellMouseEnter}
            onCellMouseUp={input.handleCellMouseUp}
            onTouchStart={input.handleTouchStart}
            onTouchMove={input.handleTouchMove}
            onTouchEnd={input.handleTouchEnd}
            onMouseLeave={() => input.setSelecting(false)}
            getCellKey={input.getCellKey}
            subject={subject}
          />
          <WordSearchWordList
            words={puzzle.words}
            foundWords={foundWords}
            onFinish={showComplete ? handleContinue : handleFinish}
            isCompleted={showComplete}
          />
        </div>
      </div>

      {/* Quit Confirmation Modal */}
      {showQuitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-card p-6 max-w-sm w-full border border-red-500/40 animate-[fadeIn_0.2s_ease-out]">
            <h3 className="text-xl font-bold text-white mb-2">Quit Game?</h3>
            <p className="text-gray-300 mb-1">
              You've found <span className="text-green-400 font-bold">{foundWords.size}</span> of{' '}
              <span className="text-cyan-400 font-bold">{puzzle.words.length}</span> words.
            </p>
            <p className="text-gray-400 text-sm mb-6">Your progress will be lost.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-bold text-white transition-colors"
              >
                Keep Playing
              </button>
              <button
                onClick={onBack}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-white transition-colors"
              >
                Quit
              </button>
            </div>
          </div>
        </div>
        )}
      <GameCompletionModal
        open={showComplete && !!finalResult}
        title="Session Complete"
        subtitle={`You found ${foundWords.size} of ${puzzle.words.length} words in ${finalResult?.time ?? 0}s.`}
        stars={finalResult?.stars ?? 0}
        stats={[
          { label: 'Score', value: finalResult?.score ?? 0 },
          { label: 'Accuracy', value: `${Math.round(finalResult?.accuracy ?? 0)}%` },
          { label: 'Time', value: `${finalResult?.time ?? 0}s` },
          { label: 'Hint Penalty', value: `-${finalResult?.hintsPenalty ?? 0}` },
        ]}
        primaryLabel="Continue"
        primaryAction={handleContinue}
        secondaryLabel="Play Again"
        secondaryAction={resetGame}
      />
    </div>
  );
};

/** Tutorial step item */
function TutorialStep({
  emoji,
  color,
  title,
  desc,
}: {
  emoji: string;
  color: string;
  title: string;
  desc: string;
}) {
  const style = {
    cyan: {
      background: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      text: 'text-cyan-400',
    },
    green: {
      background: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
    },
    yellow: {
      background: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
    },
    purple: {
      background: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
    },
  } as const;
  const theme = style[color as keyof typeof style] ?? style.cyan;

  return (
    <div className={`flex items-start gap-4 p-4 ${theme.background} border ${theme.border} rounded-lg`}>
      <span className="text-3xl">{emoji}</span>
      <div>
        <div className={`font-bold ${theme.text} mb-1`}>{title}</div>
        <div className="text-sm text-gray-300">{desc}</div>
      </div>
    </div>
  );
}

export default WordSearchGame;
