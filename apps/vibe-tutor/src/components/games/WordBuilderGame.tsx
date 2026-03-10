import { BookOpen, Coins, RefreshCw, Sparkles, Star, Trophy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface WordBuilderProps {
  onEarnTokens?: (amount: number) => void;
  onClose?: () => void;
}

interface WordChallenge {
  word: string;
  hint: string;
  category: string;
  points: number;
}

const WordBuilderGame = ({ onEarnTokens, onClose: _onClose }: WordBuilderProps) => {
  const [score, setScore] = useState(0);
  const [currentChallenge, setCurrentChallenge] = useState<WordChallenge | null>(null);
  const [scrambledLetters, setScrambledLetters] = useState<string[]>([]);
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState('');
  const [streak, setStreak] = useState(0);
  const [totalTokensEarned, setTotalTokensEarned] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [level, setLevel] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);

  // Word categories with Roblox theme
  const wordCategories = {
    roblox: [
      { word: 'AVATAR', hint: 'Your character in the game', category: 'Roblox', points: 10 },
      { word: 'ROBUX', hint: 'In-game currency', category: 'Roblox', points: 10 },
      { word: 'BADGE', hint: 'Achievement reward', category: 'Roblox', points: 10 },
      { word: 'STUDIO', hint: 'Where you create games', category: 'Roblox', points: 15 },
      { word: 'OBBY', hint: 'Obstacle course game', category: 'Roblox', points: 10 },
      { word: 'SCRIPT', hint: 'Code that makes things work', category: 'Roblox', points: 15 },
      { word: 'BUILD', hint: 'Create structures', category: 'Roblox', points: 10 },
      { word: 'SPAWN', hint: 'Where you start', category: 'Roblox', points: 10 },
    ],
    school: [
      { word: 'STUDY', hint: 'Prepare for a test', category: 'School', points: 10 },
      { word: 'LEARN', hint: 'Gain knowledge', category: 'School', points: 10 },
      { word: 'HOMEWORK', hint: 'Assignment to do at home', category: 'School', points: 20 },
      { word: 'PENCIL', hint: 'Writing tool', category: 'School', points: 15 },
      { word: 'TEACHER', hint: 'Person who helps you learn', category: 'School', points: 15 },
      { word: 'LIBRARY', hint: 'Place with many books', category: 'School', points: 15 },
      { word: 'SCIENCE', hint: 'Study of the natural world', category: 'School', points: 15 },
    ],
    positive: [
      { word: 'HAPPY', hint: 'Feeling joy', category: 'Emotions', points: 10 },
      { word: 'BRAVE', hint: 'Showing courage', category: 'Emotions', points: 10 },
      { word: 'KIND', hint: 'Being nice to others', category: 'Emotions', points: 10 },
      { word: 'SMART', hint: 'Intelligent', category: 'Emotions', points: 10 },
      { word: 'STRONG', hint: 'Having power', category: 'Emotions', points: 15 },
      { word: 'CREATIVE', hint: 'Having imagination', category: 'Emotions', points: 20 },
    ],
  };

  const getAllWords = () => {
    return [...wordCategories.roblox, ...wordCategories.school, ...wordCategories.positive];
  };

  const selectNewWord = useCallback(() => {
    const words = getAllWords();
    const filteredWords = words.filter((w) => {
      // Increase difficulty based on level
      if (level <= 2) return w.word.length <= 5;
      if (level <= 4) return w.word.length <= 7;
      return true;
    });

    const randomWord = filteredWords[Math.floor(Math.random() * filteredWords.length)];
    if (!randomWord) return;
    setCurrentChallenge(randomWord);

    // Scramble the letters
    const letters = randomWord.word.split('');
    const scrambled = [...letters].sort(() => Math.random() - 0.5);
    setScrambledLetters(scrambled);
    setSelectedLetters([]);
    setUsedIndices(new Set());
    setHintUsed(false);
    setFeedback('');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getAllWords is a pure helper using only static data
  }, [level]);

  useEffect(() => {
    selectNewWord();
  }, [level, selectNewWord]);

  const handleLetterClick = (letter: string, index: number) => {
    if (usedIndices.has(index)) return;

    setSelectedLetters([...selectedLetters, letter]);
    setUsedIndices(new Set([...usedIndices, index]));

    // Check if word is complete
    const newWord = [...selectedLetters, letter].join('');
    if (newWord.length === currentChallenge?.word.length) {
      checkWord(newWord);
    }
  };

  const handleSelectedLetterClick = (letterIndex: number) => {
    // Return letter to available pool
    const letterToReturn = selectedLetters[letterIndex];
    const newSelected = selectedLetters.filter((_, i) => i !== letterIndex);
    setSelectedLetters(newSelected);

    // Find and remove the first matching index from usedIndices
    const indexToRemove = Array.from(usedIndices).find(
      (idx) => scrambledLetters[idx] === letterToReturn,
    );
    if (indexToRemove !== undefined) {
      const newUsedIndices = new Set(usedIndices);
      newUsedIndices.delete(indexToRemove);
      setUsedIndices(newUsedIndices);
    }
  };

  const checkWord = (word: string) => {
    if (!currentChallenge) return;

    if (word === currentChallenge.word) {
      // Correct!
      const basePoints = currentChallenge.points;
      const streakBonus = streak * 5;
      const hintPenalty = hintUsed ? 5 : 0;
      const points = Math.max(basePoints + streakBonus - hintPenalty, 5);
      const tokens = Math.floor(points / 5);

      setScore((prev) => prev + points);
      setStreak((prev) => prev + 1);
      setTotalTokensEarned((prev) => prev + tokens);

      if (onEarnTokens) {
        onEarnTokens(tokens);
      }

      setFeedback('🎉 Awesome! You built the word!');

      // Level up every 100 points
      if (score + points >= level * 100) {
        setLevel((prev) => prev + 1);
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }

      setTimeout(() => {
        selectNewWord();
      }, 2000);
    } else {
      setFeedback('❌ Not quite right, try again!');
      setStreak(0);
      setTimeout(() => setFeedback(''), 2000);
    }
  };

  const useHint = () => {
    if (hintUsed || !currentChallenge) return;
    setHintUsed(true);
    setFeedback(`Hint: ${currentChallenge.hint}`);
  };

  const resetWord = () => {
    setSelectedLetters([]);
    setUsedIndices(new Set());
    setFeedback('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-white">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-8 h-8" />
            Word Builder
          </h1>
          <p className="text-sm opacity-80">Level {level} - Build words to earn Robux!</p>
        </div>

        <div className="flex items-center gap-6 text-white">
          <div className="flex items-center gap-2">
            <Sparkles
              className={`w-5 h-5 ${streak >= 3 ? 'text-orange-400 animate-pulse' : 'text-yellow-400'}`}
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

      {/* Game Area */}
      <div className="max-w-4xl mx-auto">
        {currentChallenge && (
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-3xl p-8 border-2 border-purple-500/50">
            {/* Category & Points */}
            <div className="text-center mb-6">
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                {currentChallenge.category} - {currentChallenge.points} points
              </span>
            </div>

            {/* Selected Letters Display */}
            <div className="bg-gray-900/50 rounded-2xl p-6 mb-8 min-h-[100px]">
              <div className="flex justify-center gap-2 flex-wrap">
                {selectedLetters.length === 0 ? (
                  <div className="text-gray-500 text-2xl">
                    Click letters below to build the word
                  </div>
                ) : (
                  selectedLetters.map((letter, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectedLetterClick(index)}
                      className="bg-gradient-to-r from-green-500 to-blue-500 text-white text-3xl font-bold
                               w-16 h-16 rounded-xl hover:scale-110 transition-transform cursor-pointer
                               shadow-lg hover:shadow-2xl"
                    >
                      {letter}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Feedback */}
            {feedback && (
              <div
                className={`text-center text-2xl font-bold mb-6 animate-pulse ${
                  feedback.includes('Awesome')
                    ? 'text-green-400'
                    : feedback.includes('Hint')
                      ? 'text-yellow-400'
                      : 'text-red-400'
                }`}
              >
                {feedback}
              </div>
            )}

            {/* Available Letters */}
            <div className="flex justify-center gap-3 flex-wrap mb-8">
              {scrambledLetters.map((letter, index) => (
                <button
                  key={index}
                  onClick={() => handleLetterClick(letter, index)}
                  disabled={usedIndices.has(index)}
                  className={`text-3xl font-bold w-16 h-16 rounded-xl transition-all
                    ${
                      usedIndices.has(index)
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-110 shadow-lg hover:shadow-2xl cursor-pointer'
                    }`}
                >
                  {letter}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={useHint}
                disabled={hintUsed}
                className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2
                  ${
                    hintUsed
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:scale-105'
                  }`}
              >
                💡 Hint (-5 points)
              </button>
              <button
                onClick={resetWord}
                className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-gray-600 to-gray-700
                         text-white hover:scale-105 transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Reset
              </button>
              <button
                onClick={selectNewWord}
                className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600
                         text-white hover:scale-105 transition-all"
              >
                Skip Word (-10 points)
              </button>
            </div>
          </div>
        )}

        {/* Celebration */}
        {showCelebration && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="text-center animate-bounce">
              <Trophy className="w-32 h-32 text-yellow-400 drop-shadow-2xl mx-auto" />
              <div className="text-white text-4xl font-bold mt-4">Level {level} Reached!</div>
              <div className="text-white text-2xl mt-2">Keep building words!</div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mt-8 bg-gray-800/50 rounded-xl p-4">
          <div className="flex justify-between text-white mb-2">
            <span>Progress to Level {level + 1}</span>
            <span>
              {score} / {level * 100} points
            </span>
          </div>
          <div className="bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-400 to-blue-500 h-full transition-all duration-500"
              style={{ width: `${Math.min(score % 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordBuilderGame;
