import confetti from 'canvas-confetti';
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useGameAudio } from '../../hooks/useGameAudio';
import { getCrosswordWords } from '../../services/wordBanks';

interface CrosswordGameProps {
  subject: string;
  onComplete: (score: number, stars: number, timeSpent: number) => void;
  onBack: () => void;
}

interface CrosswordClue {
  number: number;
  word: string;
  clue: string;
  solved: boolean;
}

const CrosswordGame = ({ subject, onComplete, onBack }: CrosswordGameProps) => {
  const { playSound } = useGameAudio();
  const [startTime] = useState(Date.now());
  const [clues, setClues] = useState<CrosswordClue[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [previousCorrectCount, setPreviousCorrectCount] = useState(0);

  useEffect(() => {
    // Generate simple crossword clues
    const words = getCrosswordWords(subject, 8);
    const crosswordClues: CrosswordClue[] = words.map((wordEntry, index) => ({
      number: index + 1,
      word: wordEntry.word,
      clue: wordEntry.clue,
      solved: false,
    }));
    setClues(crosswordClues);
  }, [subject]);

  useEffect(() => {
    let currentCorrectCount = 0;
    clues.forEach((clue) => {
      if (answers[clue.number] === clue.word) {
        currentCorrectCount++;
      }
    });

    if (currentCorrectCount > previousCorrectCount) {
      playSound('success');
    }
    setPreviousCorrectCount(currentCorrectCount);
  }, [answers, clues, playSound, previousCorrectCount]);

  const handleAnswerChange = (number: number, value: string) => {
    playSound('pop');
    setAnswers((prev) => ({
      ...prev,
      [number]: value.toUpperCase(),
    }));
  };

  const handleSubmit = () => {
    let correct = 0;
    clues.forEach((clue) => {
      if (answers[clue.number] === clue.word) {
        correct++;
      }
    });

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const percentage = (correct / clues.length) * 100;
    const score = Math.round(percentage);
    const stars =
      percentage >= 90 ? 5 : percentage >= 75 ? 4 : percentage >= 60 ? 3 : percentage >= 40 ? 2 : 1;

    if (percentage === 100) {
      void confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      playSound('victory');
    } else {
      playSound('error');
    }

    onComplete(score, stars, timeSpent);
  };

  const checkAnswer = (number: number): boolean => {
    const clue = clues.find((c) => c.number === number);
    return !!clue && answers[number] === clue.word;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-6 pb-36 md:pb-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="glass-card p-4 mb-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white"
          >
            <ArrowLeft size={20} />
            Back
          </button>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-400" />
              <span className="text-white font-medium">
                {clues.filter((c) => checkAnswer(c.number)).length}/{clues.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-cyan-400" />
              <span className="text-white font-medium">
                {Math.floor((Date.now() - startTime) / 1000)}s
              </span>
            </div>
          </div>
        </div>

        {/* Crossword Clues */}
        <div className="glass-card p-8">
          <h2 className="text-3xl font-bold text-center mb-6 neon-text-primary">
            {subject} Crossword
          </h2>

          <p className="text-center text-white/80 mb-6">Solve the clues below:</p>

          <div className="space-y-4">
            {clues.map((clue) => {
              const isCorrect = checkAnswer(clue.number);
              const hasAnswer = !!answers[clue.number];

              return (
                <div
                  key={clue.number}
                  className={`p-4 rounded-lg transition-all duration-300 ${
                    isCorrect ? 'bg-green-800/20 border border-green-500/30' : 'bg-purple-800/30'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-2xl font-bold text-cyan-400 min-w-[40px]">
                      {clue.number}.
                    </div>
                    <div className="flex-1">
                      <p className="text-white mb-3">{clue.clue}</p>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={answers[clue.number] ?? ''}
                          onChange={(e) => handleAnswerChange(clue.number, e.target.value)}
                          placeholder={`${clue.word.length} letters`}
                          maxLength={clue.word.length}
                          className={`flex-1 px-4 py-2 bg-white/10 border-2 rounded-lg text-white font-mono uppercase placeholder-white/50 focus:outline-none focus:ring-2 transition-all ${
                            hasAnswer && isCorrect
                              ? 'border-green-500 focus:ring-green-500'
                              : hasAnswer
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-purple-500 focus:ring-cyan-500'
                          }`}
                        />
                        {hasAnswer && isCorrect && (
                          <CheckCircle size={24} className="text-green-400" />
                        )}
                      </div>
                      <div className="mt-2 text-sm text-white/60">
                        {clue.word.split('').map((_, i) => (
                          <span
                            key={i}
                            className="inline-block w-6 h-6 border-b-2 border-white/30 mx-0.5"
                          ></span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleSubmit}
            className="w-full mt-8 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-bold text-white text-xl transition-all transform hover:scale-105"
          >
            Check Answers
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrosswordGame;
