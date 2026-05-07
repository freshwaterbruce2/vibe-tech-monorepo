import { useCallback, useEffect, useState } from 'react';
import { updateGameStats } from '../../../services/gameAchievements';
import { learningAnalytics } from '../../../services/learningAnalytics';
import type { WordSearchGrid as WordSearchGridType } from '../../../services/puzzleGenerator';
import { calculateWordSearchScore, generateWordSearch } from '../../../services/puzzleGenerator';
import { getRandomWords } from '../../../services/wordBanks';
import { appStore } from '../../../utils/electronStore';
import { useGameAudio } from '../../../hooks/useGameAudio';
import confetti from 'canvas-confetti';
import {
  getSavedGameConfig,
  getDifficultyHintPenalty,
  saveGameConfig,
  type GameConfig,
} from '../../settings/gameSettingsConfig';
import { useWordSearchInput } from './useWordSearchInput';

export interface WordSearchFinalResult {
  score: number;
  stars: number;
  accuracy: number;
  hintsPenalty: number;
  time: number;
}

interface UseWordSearchGameProps {
  subject: string;
  onComplete: (score: number, stars: number, timeSpent: number) => void;
  onBack: () => void;
  initialConfig?: Partial<GameConfig>;
}

export function useWordSearchGame({ subject, onComplete, onBack, initialConfig = {} }: UseWordSearchGameProps) {
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
      colors: ['#22d3ee', '#ec4899', '#fbbf24', '#ff5fd2'],
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
  }, [config, subject]);

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

  return {
    config,
    setConfig,
    showSettings,
    gameStarted,
    isPaused,
    puzzle,
    foundWords,
    celebrate,
    hintsUsed,
    revealedCells,
    showQuitConfirm,
    setShowQuitConfirm,
    showComplete,
    finalResult,
    showTutorial,
    elapsedTime,
    hintPenalty,
    isBoardBlocked,
    input,
    playSound,
    handleFinish,
    handleContinue,
    resetGame,
    handlePauseToggle,
    handleBackClick,
    handleUseHint,
    startGame,
    closeTutorial,
    onBack,
    isCompleting,
  };
}
