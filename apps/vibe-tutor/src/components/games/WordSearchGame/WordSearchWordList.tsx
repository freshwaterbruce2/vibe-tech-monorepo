import { CheckCircle } from 'lucide-react';

interface WordEntry {
  word: string;
  clue?: string;
}

interface WordSearchWordListProps {
  words: WordEntry[];
  foundWords: Set<string>;
  onFinish: () => void;
}

const WordSearchWordList = ({ words, foundWords, onFinish }: WordSearchWordListProps) => {
  const allFound = foundWords.size === words.length;

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
                  ? 'bg-green-500/20 border-2 border-green-500/50 text-green-300'
                  : 'bg-purple-800/50 text-white border border-purple-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`font-bold text-lg ${isFound ? 'opacity-70' : ''}`}>
                  <span className="relative inline-block">
                    {w.word}
                    {isFound && (
                      <span className="absolute left-0 top-1/2 h-[2px] bg-green-400 rounded-full animate-strikethrough" />
                    )}
                  </span>
                </div>
                {isFound && <CheckCircle className="w-5 h-5 text-green-400 animate-bounce" />}
              </div>
              {w.clue && <div className="text-sm opacity-80 mt-1">{w.clue}</div>}
            </div>
          );
        })}
      </div>

      {allFound && (
        <div className="mt-4 p-4 bg-green-500/20 border-2 border-green-500/50 rounded-xl text-center animate-bounce">
          <p className="text-green-400 font-bold text-lg">🎉 All words found!</p>
          <p className="text-sm text-gray-300 mt-1">Tap Finish to see your score!</p>
        </div>
      )}

      <button
        onClick={onFinish}
        className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-bold text-white transition-all transform hover:scale-105"
      >
        Finish Game
      </button>
    </div>
  );
};

export default WordSearchWordList;
