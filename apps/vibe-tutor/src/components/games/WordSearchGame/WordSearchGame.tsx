import { ArrowLeft, CheckCircle, Clock, Lightbulb, Pause, Play, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { updateGameStats } from '../../../services/gameAchievements';
import { initializeAudio, playSound } from '../../../services/gameSounds';
import { learningAnalytics } from '../../../services/learningAnalytics';
import type { WordSearchGrid as WordSearchGridType } from '../../../services/puzzleGenerator';
import { calculateWordSearchScore, generateWordSearch } from '../../../services/puzzleGenerator';
import { getRandomWords } from '../../../services/wordBanks';
import { appStore } from '../../../utils/electronStore';
import GameSettings, {
  getSavedGameConfig,
  saveGameConfig,
  type GameConfig,
} from '../../settings/GameSettings';
import CelebrationEffect from '../../ui/CelebrationEffect';
import WordSearchGrid from './WordSearchGrid';
import WordSearchWordList from './WordSearchWordList';
import { useWordSearchInput } from './useWordSearchInput';

interface WordSearchGameProps {
  subject: string;
  onComplete: (score: number, stars: number, timeSpent: number) => void;
  onBack: () => void;
}

const WordSearchGame = ({ subject, onComplete, onBack }: WordSearchGameProps) => {
  // Game configuration
  const [config, setConfig] = useState<GameConfig>(() => getSavedGameConfig('wordsearch'));
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
  const [showTutorial, setShowTutorial] = useState(() => {
    return !appStore.get('wordsearch-tutorial-seen');
  });

  // Input handling (mouse + touch)
  const input = useWordSearchInput({
    puzzle,
    foundWords,
    setFoundWords,
    setCelebrate,
    config,
  });

  // Generate puzzle based on config
  useEffect(() => {
    if (!gameStarted) return;

    const words = getRandomWords(subject, config.wordCount ?? 8, 'easy');
    const wordSearch = generateWordSearch(words, config.gridSize ?? 12);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate init: effect needs both state update and side effects (analytics, audio)
    setPuzzle(wordSearch);
    setStartTime(Date.now());

    learningAnalytics.startSession('wordsearch', subject, config.difficulty);
    initializeAudio();
  }, [subject, config.gridSize, config.wordCount, config.difficulty, gameStarted]);

  const handleFinish = useCallback(() => {
    if (!puzzle) return;
    const timeSpent = elapsedTime;

    const baseResult = calculateWordSearchScore(foundWords.size, puzzle.words.length, timeSpent);
    const hintPenalty = hintsUsed * 50;
    const finalScore = Math.max(0, baseResult.score - hintPenalty);

    saveGameConfig('wordsearch', config);

    if (config.soundEnabled) {
      playSound('game-complete');
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

    onComplete(finalScore, baseResult.stars, timeSpent);
  }, [puzzle, elapsedTime, foundWords.size, hintsUsed, config, subject, onComplete]);

  // Timer effect
  useEffect(() => {
    if (!gameStarted || isPaused || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);

      if (config.timerMode === 'timed' && config.timeLimit && elapsed >= config.timeLimit) {
        handleFinish();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStarted, isPaused, startTime, config.timerMode, config.timeLimit, handleFinish]);

  const handlePauseToggle = () => setIsPaused(!isPaused);

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
      playSound('hint-used');
    }
  }, [puzzle, foundWords, config.hintsEnabled, config.soundEnabled, revealedCells]);

  const startGame = () => {
    setShowSettings(false);
    setGameStarted(true);
  };

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
                desc="Use the hint button to reveal the first letter of a word (costs 10 points)"
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
                className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play size={20} /> : <Pause size={20} />}
              </button>
              {config.hintsEnabled && (
                <button
                  onClick={handleUseHint}
                  disabled={wordsRemaining === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                  title="Reveal first letter (10 points)"
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
                <span className="text-sm text-gray-400">-{hintsUsed * 10} pts (hints)</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
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
            onFinish={handleFinish}
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
  return (
    <div
      className={`flex items-start gap-4 p-4 bg-${color}-500/10 border border-${color}-500/30 rounded-lg`}
    >
      <span className="text-3xl">{emoji}</span>
      <div>
        <div className={`font-bold text-${color}-400 mb-1`}>{title}</div>
        <div className="text-sm text-gray-300">{desc}</div>
      </div>
    </div>
  );
}

export default WordSearchGame;
