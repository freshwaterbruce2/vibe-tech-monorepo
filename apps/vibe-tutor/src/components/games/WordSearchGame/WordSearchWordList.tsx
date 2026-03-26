import { CheckCircle } from 'lucide-react';

interface WordEntry {
  word: string;
  clue?: string;
}

interface WordSearchWordListProps {
  words: WordEntry[];
  foundWords: Set<string>;
  onFinish: () => void;
  isCompleted: boolean;
}

const WordSearchWordList = ({ words, foundWords, onFinish, isCompleted }: WordSearchWordListProps) => {
  const allFound = foundWords.size === words.length;
  const actionLabel = isCompleted ? 'Continue' : 'Finish Game';

  return (
    <div className="glass-card p-6">
      <h3 className="text-xl font-bold mb-4 text-white">Find These Words:</h3>
      <div className="space-y-2">
        {words.map((w) => {
          const isFound = foundWords.has(w.word);
          return (
            <div
              key={w.word}
              className={`p-3 rounded-lg transition-all duration-300 ${
                isFound
                  ? 'bg-fuchsia-500/20 border-2 border-fuchsia-500/50 text-fuchsia-300'
                  : 'bg-purple-800/50 text-white border border-purple-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`font-bold text-lg ${isFound ? 'opacity-70' : ''}`}>
                  <span className="relative inline-block">
                    {w.word}
                    {isFound && (
                      <span className="absolute left-0 top-1/2 h-[2px] bg-fuchsia-400 rounded-full animate-strikethrough" />
                    )}
                  </span>
                </div>
                {isFound && <CheckCircle className="w-5 h-5 text-fuchsia-400 animate-bounce" />}
              </div>
              {w.clue && <div className="text-sm opacity-80 mt-1">{w.clue}</div>}
            </div>
          );
        })}
      </div>

        {allFound && (
          <div className="mt-4 p-4 bg-fuchsia-500/20 border-2 border-fuchsia-500/50 rounded-xl text-center animate-bounce">
            <p className="text-fuchsia-400 font-bold text-lg">🎉 All words found!</p>
            <p className="text-sm text-gray-300 mt-1">
              {isCompleted ? 'Tap Continue to submit your score' : 'Tap Finish to review results'}
            </p>
          </div>
        )}

      <button
        onClick={onFinish}
        className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-lg font-bold text-white transition-all transform hover:scale-105"
      >
        {actionLabel}
      </button>
    </div>
  );
};

export default WordSearchWordList;
