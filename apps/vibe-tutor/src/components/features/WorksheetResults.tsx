import { ArrowRight, RotateCcw, Sparkles, Star, Target, TrendingUp, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DifficultyLevel, WorksheetSession } from '../../types';

interface WorksheetResultsProps {
  session: WorksheetSession;
  leveledUp: boolean;
  newDifficulty?: DifficultyLevel;
  starsToNextLevel: number; // 0-4 (how many more stars needed)
  onTryAgain: () => void;
  onNextWorksheet: () => void;
  onBackToCards: () => void;
}

const WorksheetResults = ({
  session,
  leveledUp,
  newDifficulty,
  starsToNextLevel,
  onTryAgain,
  onNextWorksheet,
  onBackToCards,
}: WorksheetResultsProps) => {
  const [showStars, setShowStars] = useState(false);
  const [animatedStars, setAnimatedStars] = useState(0);

  const { questions, answers } = session;
  const score = session.score ?? 0;
  const starsEarned = session.starsEarned ?? 0;
  let correctCount = 0;
  answers.forEach((answer, index) => {
    if (answer === questions[index]!.correctAnswer) {
      correctCount = correctCount + 1;
    }
  });
  const incorrectCount = questions.length - correctCount;

  // Animate stars appearing
  useEffect(() => {
    setTimeout(() => setShowStars(true), 500);

    // Animate stars filling up one by one
    const interval = setInterval(() => {
      setAnimatedStars((prev) => {
        if (prev < (starsEarned || 0)) {
          return prev + 1;
        }
        clearInterval(interval);
        return prev;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [starsEarned]);

  // Performance message based on score
  const getPerformanceMessage = () => {
    if (score >= 90) return { text: 'Outstanding!', emoji: '🎉', color: 'text-yellow-400' };
    if (score >= 80) return { text: 'Great Job!', emoji: '⭐', color: 'text-green-400' };
    if (score >= 70) return { text: 'Good Work!', emoji: '👍', color: 'text-blue-400' };
    if (score >= 60) return { text: 'Nice Try!', emoji: '💪', color: 'text-purple-400' };
    if (score >= 50) return { text: 'Keep Practicing!', emoji: '📚', color: 'text-orange-400' };
    return { text: 'Try Again!', emoji: '🔄', color: 'text-red-400' };
  };

  const performance = getPerformanceMessage();

  return (
    <div className="min-h-screen p-4 md:p-8 pb-32 md:pb-8 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        {/* Level Up Animation */}
        {leveledUp && (
          <div className="mb-8 glass-card p-8 rounded-2xl border-2 border-yellow-500 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 animate-[bounce_1s_ease-in-out_3]">
            <div className="text-center space-y-4">
              <Sparkles className="w-16 h-16 mx-auto text-yellow-400 animate-spin" />
              <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                Level Up!
              </h2>
              <p className="text-2xl text-white">
                You advanced to <span className="font-bold text-yellow-400">{newDifficulty}</span>{' '}
                level!
              </p>
              <div className="text-6xl">🎊</div>
            </div>
          </div>
        )}

        {/* Results Card */}
        <div className="glass-card p-8 rounded-2xl border-2 border-[var(--glass-border)] space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="text-5xl md:text-6xl">{performance.emoji}</div>
            <h1 className={`text-3xl md:text-4xl font-bold ${performance.color}`}>
              {performance.text}
            </h1>
            <p className="text-text-secondary text-lg">
              {session.subject} - {session.difficulty} Level
            </p>
          </div>

          {/* Score Display */}
          <div className="text-center py-6">
            <div className="text-7xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 mb-2">
              {score}%
            </div>
            <p className="text-text-secondary">
              {correctCount} correct, {incorrectCount} incorrect
            </p>
          </div>

          {/* Stars Display */}
          <div className="py-6 border-y border-[var(--glass-border)]">
            <p className="text-center text-text-secondary mb-4">Stars Earned</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <div
                  key={num}
                  className={`transition-all duration-500 ${
                    showStars && num <= animatedStars ? 'scale-100 rotate-0' : 'scale-0 rotate-180'
                  }`}
                  style={{ transitionDelay: `${num * 100}ms` }}
                >
                  <Star
                    size={48}
                    className={
                      num <= (starsEarned || 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-600'
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Progress to Next Level */}
          {!leveledUp && starsToNextLevel > 0 && (
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-text-secondary">
                <Target size={20} />
                <p>Progress to Next Level</p>
              </div>
              <p className="text-xl font-bold">{5 - starsToNextLevel} / 5 stars</p>
              <div className="max-w-md mx-auto h-4 bg-surface-lighter rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-1000"
                  style={{ width: `${((5 - starsToNextLevel) / 5) * 100}%` }}
                />
              </div>
              <p className="text-sm text-text-muted">
                {starsToNextLevel} more star{starsToNextLevel !== 1 ? 's' : ''} needed!
              </p>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="text-center glass-card p-4 rounded-xl">
              <p className="text-text-secondary text-sm mb-1">Time Spent</p>
              <p className="text-2xl font-bold">
                {Math.floor((session.timeSpent ?? 0) / 60)}:
                {String((session.timeSpent ?? 0) % 60).padStart(2, '0')}
              </p>
            </div>
            <div className="text-center glass-card p-4 rounded-xl">
              <p className="text-text-secondary text-sm mb-1">Accuracy</p>
              <p className="text-2xl font-bold">{score}%</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <button
              onClick={onNextWorksheet}
              className="w-full glass-button px-6 py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 hover:scale-105 transition-all"
            >
              <TrendingUp size={24} />
              <span>Next Quest</span>
              <ArrowRight size={24} />
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onTryAgain}
                className="glass-card px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:scale-105 transition-all"
              >
                <RotateCcw size={20} />
                <span>Try Again</span>
              </button>

              <button
                onClick={onBackToCards}
                className="glass-card px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:scale-105 transition-all"
              >
                <Trophy size={20} />
                <span>Back to Realms</span>
              </button>
            </div>
          </div>
        </div>

        {/* Encouragement Message */}
        <div className="mt-6 text-center">
          {score >= 90 && (
            <p className="text-text-secondary text-sm">
              Excellent work! You're really mastering this subject! 🌟
            </p>
          )}
          {score >= 70 && score < 90 && (
            <p className="text-text-secondary text-sm">Great progress! Keep up the good work! 💪</p>
          )}
          {score < 70 && (
            <p className="text-text-secondary text-sm">Don't give up! Practice makes perfect! 📚</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorksheetResults;
