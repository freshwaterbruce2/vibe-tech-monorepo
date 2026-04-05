import { animated } from '@react-spring/web';
import { Brain, Coins, Grid, HelpCircle, Star, Trophy } from 'lucide-react';
import { getColorClass, usePatternQuestGame, worldNames } from './usePatternQuestGame';

interface PatternQuestProps {
  onEarnTokens?: (amount: number) => void;
  onClose?: () => void;
}

const PatternQuestGame = ({ onEarnTokens, onClose: _onClose }: PatternQuestProps) => {
  const {
    score,
    level,
    streak,
    currentPattern,
    feedback,
    totalTokensEarned,
    showCelebration,
    showHint,
    questsCompleted,
    patternProps,
    handleAnswer,
    getHintText,
    requestHint,
  } = usePatternQuestGame({ onEarnTokens });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-900 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-white">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8" />
            Pattern Quest
          </h1>
          <p className="text-sm opacity-80">
            World {level}: {worldNames[level - 1]}
          </p>
          {currentPattern?.isBossRound && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-yellow-300/40 bg-yellow-500/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-yellow-200">
              <Trophy className="w-4 h-4" />
              Boss Round
            </div>
          )}
        </div>

        <div className="flex items-center gap-6 text-white">
          <div className="flex items-center gap-2">
            <Grid className="w-5 h-5 text-yellow-400" />
            <span>Quests: {questsCompleted}</span>
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
      <div className="max-w-5xl mx-auto">
        {currentPattern && (
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-3xl p-8 border-2 border-purple-500/50">
            {/* Pattern Type Badge */}
            <div className="text-center mb-6">
              <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-full text-sm font-bold uppercase">
                {currentPattern.isBossRound ? 'Boss Pattern' : `${currentPattern.type} Pattern`} - Level {currentPattern.difficulty}
              </span>
              <p className="mt-3 text-sm text-cyan-100/80">{currentPattern.prompt}</p>
            </div>

            {/* Pattern Display */}
            <animated.div className="bg-gray-900/50 rounded-2xl p-8 mb-8" style={patternProps}>
              <div className="flex justify-center items-center gap-4 flex-wrap">
                {currentPattern.sequence.map((element, index) => (
                  <div
                    key={index}
                    className={`text-6xl ${getColorClass(element.color)} animate-fadeIn`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {element.number ?? element.shape}
                  </div>
                ))}
                <div className="text-6xl text-gray-400 animate-pulse">?</div>
              </div>
            </animated.div>

            {/* Hint Section */}
            {showHint && (
              <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-xl p-4 mb-6 text-center text-yellow-300">
                💡 {getHintText()}
              </div>
            )}

            {/* Feedback */}
            {feedback && (
              <div
                className={`text-center text-2xl font-bold mb-6 animate-bounce ${
                  feedback.includes('❌') ? 'text-red-400' : 'text-fuchsia-400'
                }`}
              >
                {feedback}
              </div>
            )}

            {/* Answer Options */}
            <div
              className={`grid gap-4 mb-6 ${
                currentPattern.options.length > 4 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4'
              }`}
            >
              {currentPattern.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500
                           p-8 rounded-2xl transform hover:scale-105 transition-all duration-200
                           shadow-lg hover:shadow-2xl flex items-center justify-center"
                  disabled={!!feedback}
                >
                  {currentPattern.type === 'mixed' && option.number === undefined ? (
                    <span className="inline-flex flex-col items-center gap-2">
                      <span className={`text-5xl ${getColorClass(option.color)}`}>{option.shape}</span>
                      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/70">
                        {option.color}
                      </span>
                    </span>
                  ) : (
                    <span className={`text-5xl ${getColorClass(option.color)}`}>
                      {option.number ?? option.shape}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {currentPattern.type === 'mixed' && (
              <div className="mb-6 rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-center text-sm text-cyan-100/85">
                Mixed patterns are unlocked in higher worlds. The right answer must satisfy both the color rule and the shape rule.
              </div>
            )}

            {/* Help Button */}
            <div className="flex justify-center">
              <button
                onClick={requestHint}
                disabled={showHint}
                className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2
                  ${
                    showHint
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:scale-105'
                  }`}
              >
                <HelpCircle className="w-5 h-5" />
                Need a Hint?
              </button>
            </div>
          </div>
        )}

        {/* Celebration */}
        {showCelebration && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="text-center animate-bounce">
              <Trophy className="w-32 h-32 text-yellow-400 drop-shadow-2xl mx-auto" />
              <div className="text-white text-4xl font-bold mt-4">New World Unlocked!</div>
              <div className="text-white text-2xl mt-2">{worldNames[level - 1]}</div>
            </div>
          </div>
        )}

        {/* Streak Indicator */}
        {streak > 0 && (
          <animated.div className="mt-6 text-center" style={patternProps}>
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-purple-500/20">
              🔥 {streak} Pattern Streak!
              {streak >= 2 && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  x{(1 + streak * 0.3).toFixed(1)} bonus
                </span>
              )}
            </div>
          </animated.div>
        )}
      </div>
    </div>
  );
};

export default PatternQuestGame;
