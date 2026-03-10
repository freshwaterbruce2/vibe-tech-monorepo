import { Pause, Play, Star, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PracticeQuestion {
  id: string;
  question: string;
  answer: string;
  hint?: string;
}

interface WorksheetPracticeProps {
  subject: string;
  difficulty: string;
  questions: PracticeQuestion[];
  onComplete: (correct: number, total: number) => void;
  onCancel: () => void;
}

const WorksheetPractice = ({
  subject,
  difficulty,
  questions,
  onComplete,
  onCancel,
}: WorksheetPracticeProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Timer
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleSubmit = () => {
    const isCorrect = userAnswer.trim().toLowerCase() === currentQuestion!.answer.toLowerCase();

    setFeedback(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) setCorrectCount((prev) => prev + 1);

    // Auto-advance after 1.5s
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setUserAnswer('');
        setFeedback(null);
        setShowHint(false);
      } else {
        // Worksheet complete
        onComplete(correctCount + (isCorrect ? 1 : 0), questions.length);
      }
    }, 1500);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen p-4 md:p-8 pb-36 md:pb-8">
      {/* Header with Timer & Progress */}
      <div className="glass-card p-4 rounded-2xl border border-white/10 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-2xl font-bold text-white">{subject} Practice</h2>
            <p className="text-sm text-gray-400">{difficulty} Level</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-400">{formatTime(timeElapsed)}</div>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="text-xs text-gray-400 hover:text-white"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-green-400">{correctCount} correct</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="glass-card p-8 rounded-2xl border border-white/10 mb-6">
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-semibold text-yellow-400">
                Question {currentIndex + 1}
              </span>
            </div>
            <p className="text-xl text-white text-center leading-relaxed">
              {currentQuestion!.question}
            </p>
          </div>

          {/* Answer Input */}
          <div>
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && userAnswer.trim() && !feedback) {
                  handleSubmit();
                }
              }}
              placeholder="Type your answer..."
              disabled={feedback !== null}
              className={`w-full px-6 py-4 bg-white/5 border-2 rounded-xl text-white text-center text-2xl placeholder-gray-500 focus:outline-none transition-all ${
                feedback === 'correct'
                  ? 'border-green-500 bg-green-500/10'
                  : feedback === 'incorrect'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-white/10 focus:border-purple-500'
              }`}
            />

            {/* Feedback */}
            {feedback === 'correct' && (
              <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-center animate-bounce">
                <p className="text-green-400 font-bold text-lg">✓ Correct! Great job! 🎉</p>
              </div>
            )}
            {feedback === 'incorrect' && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-center">
                <p className="text-red-400 font-bold">
                  ✗ Not quite. The answer was: {currentQuestion!.answer}
                </p>
              </div>
            )}
          </div>

          {/* Hint Button */}
          {!feedback && currentQuestion!.hint && (
            <div className="text-center">
              {showHint ? (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-300 text-sm">💡 Hint: {currentQuestion!.hint}</p>
                </div>
              ) : (
                <button
                  onClick={() => setShowHint(true)}
                  className="text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  Need a hint?
                </button>
              )}
            </div>
          )}

          {/* Submit Button */}
          {!feedback && (
            <button
              onClick={handleSubmit}
              disabled={!userAnswer.trim()}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Submit Answer
            </button>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex gap-4">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 rounded-xl transition-all"
        >
          Exit Practice
        </button>
        {feedback && currentIndex < questions.length - 1 && (
          <button
            onClick={() => {
              setCurrentIndex((prev) => prev + 1);
              setUserAnswer('');
              setFeedback(null);
              setShowHint(false);
            }}
            className="flex-1 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 rounded-xl transition-all"
          >
            Next Question →
          </button>
        )}
      </div>
    </div>
  );
};

export default WorksheetPractice;
