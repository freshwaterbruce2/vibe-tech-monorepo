import { Coins, Heart, Star, Trophy, Zap } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useGameAudio } from '../../hooks/useGameAudio';
import confetti from 'canvas-confetti';

interface MathAdventureProps {
  onEarnTokens?: (amount: number) => void;
  onClose?: () => void;
}

type Difficulty = 'easy' | 'medium' | 'hard';
type Operation = '+' | '-' | '×' | '÷';

interface Problem {
  num1: number;
  num2: number;
  operation: Operation;
  answer: number;
  choices: number[];
}

function createProblem(difficulty: Difficulty): Problem {
  let num1 = 0;
  let num2 = 0;
  let answer = 0;
  let operation: Operation = '+';

  const ranges = {
    easy: { min: 1, max: 10 },
    medium: { min: 5, max: 20 },
    hard: { min: 10, max: 50 },
  };

  const range = ranges[difficulty];
  const operations: Operation[] =
    difficulty === 'easy'
      ? ['+', '-']
      : difficulty === 'medium'
        ? ['+', '-', '×']
        : ['+', '-', '×', '÷'];

  operation = operations[Math.floor(Math.random() * operations.length)] ?? '+';

  switch (operation) {
    case '+':
      num1 = Math.floor(Math.random() * range.max) + range.min;
      num2 = Math.floor(Math.random() * range.max) + range.min;
      answer = num1 + num2;
      break;
    case '-':
      num1 = Math.floor(Math.random() * range.max) + range.min;
      num2 = Math.floor(Math.random() * num1) + 1;
      answer = num1 - num2;
      break;
    case '×':
      num1 = Math.floor(Math.random() * (range.max / 2)) + range.min;
      num2 = Math.floor(Math.random() * (range.max / 2)) + range.min;
      answer = num1 * num2;
      break;
    case '÷':
      num2 = Math.floor(Math.random() * 10) + 1;
      answer = Math.floor(Math.random() * 10) + 1;
      num1 = num2 * answer;
      break;
  }

  const choices = [answer];
  while (choices.length < 4) {
    const variation = Math.floor(Math.random() * 10) - 5;
    const wrongAnswer = answer + variation;
    if (!choices.includes(wrongAnswer) && wrongAnswer > 0) {
      choices.push(wrongAnswer);
    }
  }
  choices.sort(() => Math.random() - 0.5);

  return { num1, num2, operation, answer, choices };
}

const MathAdventureGame = ({ onEarnTokens, onClose }: MathAdventureProps) => {
  const { playSound } = useGameAudio();
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(() => createProblem('easy'));
  const [feedback, setFeedback] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [totalTokensEarned, setTotalTokensEarned] = useState(0);

  // Roblox-themed level names
  const levelNames = [
    '🏝️ Noob Island',
    '🏰 Builder Town',
    '🚀 Space Station',
    '🌋 Lava Parkour',
    '💎 Diamond Mine',
    '🏆 Pro Server',
    '⚡ Speed Run Zone',
    '🌟 Legend Arena',
  ];

  const handleAnswer = useCallback((selectedAnswer: number) => {
    if (!currentProblem) return;

    if (selectedAnswer === currentProblem.answer) {
      // Correct answer
      playSound('success');
      const points = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 30;
      const tokens = Math.floor((points + streak * 5) / 10);

      setScore((prev) => prev + points + streak * 5);
      setStreak((prev) => prev + 1);
      setTotalTokensEarned((prev) => prev + tokens);

      if (onEarnTokens) {
        onEarnTokens(tokens);
      }

      setFeedback('🎉 Correct! Amazing job!');

      // Level up every 5 correct answers
      if ((score + points) % 50 === 0) {
        playSound('levelUp');
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899']
        });
        setLevel((prev) => Math.min(prev + 1, levelNames.length));
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }

      // Generate new problem after short delay
      setTimeout(() => {
        setCurrentProblem(createProblem(difficulty));
        setFeedback('');
      }, 1500);
    } else {
      // Wrong answer
      playSound('error');
      setLives((prev) => prev - 1);
      setStreak(0);
      setFeedback('💔 Try again! You can do it!');

      if (lives <= 1) {
        // Game over
        setFeedback(`Game Over! You earned ${totalTokensEarned} Robux! 🪙`);
        setTimeout(() => {
          if (onClose) onClose();
        }, 3000);
      }
    }
  }, [currentProblem, difficulty, lives, onClose, onEarnTokens, playSound, score, streak, totalTokensEarned, levelNames.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="text-white">
            <span className="text-2xl font-bold">Level {level}</span>
            <div className="text-sm opacity-80">{levelNames[level - 1]}</div>
          </div>
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                className={`w-6 h-6 ${i < lives ? 'text-red-500 fill-red-500' : 'text-gray-600'}`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6 text-white">
          <div className="flex items-center gap-2">
            <Zap
              className={`w-5 h-5 ${streak >= 3 ? 'text-orange-400 animate-pulse drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]' : 'text-yellow-400'}`}
            />
            <span>Streak: {streak}</span>
            {streak >= 2 && (
              <span className="text-xs bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-full font-bold">
                x{(1 + streak * 0.5).toFixed(1)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            <span>{score}</span>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-400" />
            <span>{totalTokensEarned} Robux</span>
          </div>
        </div>
      </div>

      {/* Difficulty Selector */}
      <div className="flex justify-center gap-4 mb-8">
        {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
          <button
            key={diff}
            onClick={() => {
              setDifficulty(diff);
              setCurrentProblem(createProblem(diff));
              setFeedback('');
            }}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${
              difficulty === diff
                ? 'bg-gradient-to-r from-green-400 to-blue-500 text-white scale-110'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {diff.charAt(0).toUpperCase() + diff.slice(1)}
            {diff === 'easy' && ' ⭐'}
            {diff === 'medium' && ' ⭐⭐'}
            {diff === 'hard' && ' ⭐⭐⭐'}
          </button>
        ))}
      </div>

      {/* Game Area */}
      <div className="max-w-2xl mx-auto">
        {currentProblem && (
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-3xl p-8 border-2 border-purple-500/50">
            <div className="text-center mb-8">
              <div className="text-6xl font-bold text-white mb-4">
                {currentProblem.num1} {currentProblem.operation} {currentProblem.num2} = ?
              </div>
              {feedback && (
                <div
                  className={`text-2xl mt-4 animate-bounce ${
                    feedback.includes('Correct')
                      ? 'text-green-400 bg-green-400/10 rounded-xl px-4 py-2 inline-block'
                      : 'text-red-300 bg-red-400/10 rounded-xl px-4 py-2 inline-block animate-[shake_0.3s_ease]'
                  }`}
                >
                  {feedback}
                </div>
              )}
            </div>

            {/* Answer Choices */}
            <div className="grid grid-cols-2 gap-4">
              {currentProblem.choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(choice)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500
                           text-white text-3xl font-bold py-6 rounded-2xl transform hover:scale-105
                           transition-all duration-200 shadow-lg hover:shadow-2xl"
                  disabled={!!feedback}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Celebration */}
        {showCelebration && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="text-8xl animate-bounce">
              <Trophy className="w-32 h-32 text-yellow-400 drop-shadow-2xl" />
              <div className="text-white text-4xl font-bold mt-4">Level Up!</div>
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="mt-8 text-center text-white/70">
        <p>💡 Tip: Maintain your streak to earn bonus Robux!</p>
      </div>
    </div>
  );
};

export default MathAdventureGame;
