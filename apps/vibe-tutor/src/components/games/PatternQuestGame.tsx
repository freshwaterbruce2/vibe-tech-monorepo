import { animated, useSpring } from '@react-spring/web';
import confetti from 'canvas-confetti';
import { Brain, Coins, Grid, HelpCircle, Star, Trophy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useGameAudio } from '../../hooks/useGameAudio';

interface PatternQuestProps {
  onEarnTokens?: (amount: number) => void;
  onClose?: () => void;
}

type PatternType = 'color' | 'shape' | 'number' | 'mixed';
type Shape = '■' | '●' | '▲' | '★' | '♦' | '❤';
type Color = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

interface PatternElement {
  shape: Shape;
  color: Color;
  number?: number;
}

interface Pattern {
  sequence: PatternElement[];
  answer: PatternElement;
  options: PatternElement[];
  type: PatternType;
  difficulty: number;
  isBossRound: boolean;
  prompt: string;
}

const PatternQuestGame = ({ onEarnTokens, onClose: _onClose }: PatternQuestProps) => {
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [currentPattern, setCurrentPattern] = useState<Pattern | null>(null);
  const [feedback, setFeedback] = useState('');
  const [totalTokensEarned, setTotalTokensEarned] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [questsCompleted, setQuestsCompleted] = useState(0);
  const { playSound } = useGameAudio();

  const [patternProps, api] = useSpring(() => ({
    from: { opacity: 0, scale: 0.8 },
    to: { opacity: 1, scale: 1 },
    config: { tension: 300, friction: 20 },
  }));

  const shapes: Shape[] = ['■', '●', '▲', '★', '♦', '❤'];
  const colors: Color[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

  // Roblox-themed world names
  const worldNames = [
    '🌴 Starter Beach',
    '🏗️ Build Battle Arena',
    '🎮 Arcade World',
    '🏰 Medieval Kingdom',
    '🚀 Galaxy Station',
    '💎 Crystal Caverns',
    '⚡ Speed Run City',
    '🌟 Master League',
  ];

  const getColorClass = (color: Color): string => {
    const colorMap = {
      red: 'text-red-500',
      blue: 'text-blue-500',
      green: 'text-green-500',
      yellow: 'text-yellow-400',
      purple: 'text-purple-500',
      orange: 'text-orange-500',
    };
    return colorMap[color];
  };

  const generateColorPattern = (difficulty: number): Pattern => {
    const sequenceLength = Math.min(3 + Math.floor(difficulty / 2), 7);
    const shape = shapes[0]!; // Use square for color patterns

    // Generate a color pattern
    const colorPattern: Color[] = [];
    const patternColors = colors.slice(0, Math.min(2 + difficulty, colors.length));
    let nextColor: Color;

    if (difficulty <= 2) {
      // Simple alternating pattern
      const basePattern = [patternColors[0]!, patternColors[1]!];
      for (let i = 0; i < sequenceLength; i++) {
        colorPattern.push(basePattern[i % basePattern.length]!);
      }
      nextColor = basePattern[sequenceLength % basePattern.length]!;
    } else if (difficulty <= 4) {
      // Repeating sequence
      const basePattern = patternColors.slice(0, 3);
      for (let i = 0; i < sequenceLength; i++) {
        colorPattern.push(basePattern[i % basePattern.length]!);
      }
      nextColor = basePattern[sequenceLength % basePattern.length]!;
    } else {
      // Complex pattern
      const basePattern = patternColors.slice(0, 4);
      for (let i = 0; i < sequenceLength; i++) {
        colorPattern.push(basePattern[Math.floor(i / 2) % basePattern.length]!);
      }
      nextColor = basePattern[Math.floor(sequenceLength / 2) % basePattern.length]!;
    }

    const sequence: PatternElement[] = colorPattern.map((color) => ({ shape: shape, color }));
    const answer: PatternElement = {
      shape: shape,
      color: nextColor,
    };

    // Generate wrong options
    const options = [answer];
    while (options.length < 4) {
      const wrongColor = colors[Math.floor(Math.random() * colors.length)]!;
      const wrongOption: PatternElement = { shape: shape, color: wrongColor };
      if (!options.some((opt) => opt.color === wrongOption.color)) {
        options.push(wrongOption);
      }
    }

    return {
      sequence,
      answer,
      options: options.sort(() => Math.random() - 0.5),
      type: 'color',
      difficulty,
      isBossRound: false,
      prompt: 'Follow the color cycle and choose the next one.',
    };
  };

  const generateShapePattern = (difficulty: number): Pattern => {
    const sequenceLength = Math.min(3 + Math.floor(difficulty / 2), 7);
    const color: Color = 'blue';

    // Generate a shape pattern
    const shapePattern: Shape[] = [];
    const patternShapes = shapes.slice(0, Math.min(2 + difficulty, shapes.length));
    let nextShape: Shape;

    if (difficulty <= 2) {
      // Simple alternating pattern
      const basePattern = [patternShapes[0]!, patternShapes[1]!];
      for (let i = 0; i < sequenceLength; i++) {
        shapePattern.push(basePattern[i % basePattern.length]!);
      }
      nextShape = basePattern[sequenceLength % basePattern.length]!;
    } else {
      // More complex pattern
      const basePattern = patternShapes.slice(0, 3);
      for (let i = 0; i < sequenceLength; i++) {
        shapePattern.push(basePattern[i % basePattern.length]!);
      }
      nextShape = basePattern[sequenceLength % basePattern.length]!;
    }

    const sequence: PatternElement[] = shapePattern.map((shape) => ({ shape, color }));
    const answer: PatternElement = {
      shape: nextShape,
      color,
    };

    // Generate wrong options
    const options = [answer];
    while (options.length < 4) {
      const wrongShape = shapes[Math.floor(Math.random() * shapes.length)]!;
      const wrongOption = { shape: wrongShape, color };
      if (!options.some((opt) => opt.shape === wrongOption.shape)) {
        options.push(wrongOption);
      }
    }

    return {
      sequence,
      answer,
      options: options.sort(() => Math.random() - 0.5),
      type: 'shape',
      difficulty,
      isBossRound: false,
      prompt: 'Track the symbol pattern and pick what comes next.',
    };
  };

  const generateNumberPattern = (difficulty: number): Pattern => {
    const sequenceLength = Math.min(3 + Math.floor(difficulty / 2), 7);
    const shape: Shape = '●';
    const color: Color = 'purple';

    // Generate number pattern
    const numberPattern: number[] = [];
    let nextNumber = 1;

    if (difficulty <= 2) {
      // Count by 1s or 2s
      const step = difficulty === 1 ? 1 : 2;
      const start = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < sequenceLength; i++) {
        numberPattern.push(start + i * step);
      }
      nextNumber = start + sequenceLength * step;
    } else if (difficulty <= 4) {
      // Count by 3s or 5s
      const step = difficulty === 3 ? 3 : 5;
      const start = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < sequenceLength; i++) {
        numberPattern.push(start + i * step);
      }
      nextNumber = start + sequenceLength * step;
    } else {
      // Fibonacci or doubling
      if (Math.random() < 0.5) {
        // Doubling
        const start = Math.floor(Math.random() * 3) + 1;
        let num = start;
        for (let i = 0; i < sequenceLength; i++) {
          numberPattern.push(num);
          num *= 2;
        }
        nextNumber = num;
      } else {
        // Simple Fibonacci-like
        numberPattern.push(1, 1);
        for (let i = 2; i < sequenceLength; i++) {
          numberPattern.push(numberPattern[i - 1]! + numberPattern[i - 2]!);
        }
        nextNumber = numberPattern[numberPattern.length - 1]! + numberPattern[numberPattern.length - 2]!;
      }
    }

    const sequence = numberPattern.map((num) => ({ shape, color, number: num }));
    const answer = { shape, color, number: nextNumber };

    // Generate wrong options
    const options = [answer];
    while (options.length < 4) {
      const variance = Math.floor(Math.random() * 10) - 5;
      const wrongNumber = Math.max(1, nextNumber + variance);
      const wrongOption = { shape, color, number: wrongNumber };
      if (!options.some((opt) => opt.number === wrongOption.number)) {
        options.push(wrongOption);
      }
    }

    return {
      sequence,
      answer,
      options: options.sort(() => Math.random() - 0.5),
      type: 'number',
      difficulty,
      isBossRound: false,
      prompt: 'Find the next number in the sequence.',
    };
  };

  const generateMixedPattern = (difficulty: number, isBossRound: boolean): Pattern => {
    const sequenceLength = Math.min(4 + difficulty, 8);
    const shapeCycle = shapes.slice(0, Math.min(2 + difficulty, shapes.length));
    const colorCycle = colors.slice(0, Math.min(2 + difficulty, colors.length));

    const sequence: PatternElement[] = Array.from({ length: sequenceLength }, (_, index) => ({
      shape: shapeCycle[index % shapeCycle.length] ?? shapes[0]!,
      color: colorCycle[(index + (difficulty >= 4 ? 1 : 0)) % colorCycle.length] ?? colors[0]!,
    }));

    const answer: PatternElement = {
      shape: shapeCycle[sequenceLength % shapeCycle.length] ?? shapes[0]!,
      color:
        colorCycle[(sequenceLength + (difficulty >= 4 ? 1 : 0)) % colorCycle.length] ??
        colors[0]!,
    };

    const options = [answer];
    const optionCount = isBossRound ? 6 : 4;
    while (options.length < optionCount) {
      const wrongOption: PatternElement = {
        shape: shapeCycle[Math.floor(Math.random() * shapeCycle.length)] ?? shapes[0]!,
        color: colorCycle[Math.floor(Math.random() * colorCycle.length)] ?? colors[0]!,
      };
      if (
        !options.some(
          (option) => option.shape === wrongOption.shape && option.color === wrongOption.color,
        )
      ) {
        options.push(wrongOption);
      }
    }

    return {
      sequence,
      answer,
      options: options.sort(() => Math.random() - 0.5),
      type: 'mixed',
      difficulty,
      isBossRound,
      prompt: isBossRound
        ? 'Boss round: track shape and color at the same time.'
        : 'Watch how both shape and color evolve together.',
    };
  };

  const generatePattern = useCallback((): Pattern => {
    const nextQuestNumber = questsCompleted + 1;
    const isBossRound = nextQuestNumber % 5 === 0;
    const baseDifficulty = Math.min(Math.floor(level / 2) + 1, 5);
    const difficulty = isBossRound ? Math.min(baseDifficulty + 1, 5) : baseDifficulty;

    if (isBossRound) {
      return generateMixedPattern(difficulty, true);
    }

    const types: PatternType[] =
      level <= 2 ? ['color', 'shape'] : level <= 4 ? ['color', 'shape', 'number'] : ['color', 'shape', 'number', 'mixed'];
    const type = types[Math.floor(Math.random() * types.length)];

    switch (type) {
      case 'color':
        return generateColorPattern(difficulty);
      case 'shape':
        return generateShapePattern(difficulty);
      case 'number':
        return generateNumberPattern(difficulty);
      case 'mixed':
        return generateMixedPattern(difficulty, false);
      default:
        return generateColorPattern(difficulty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helper functions are pure and use only local constants
  }, [level, questsCompleted]);

  useEffect(() => {
    setCurrentPattern(generatePattern());
    void api.start({ from: { opacity: 0, scale: 0.8 }, to: { opacity: 1, scale: 1 } });
  }, [level, generatePattern, api]);

  const handleAnswer = (selected: PatternElement) => {
    if (!currentPattern) return;

    const isCorrect =
      currentPattern.type === 'number'
        ? selected.number === currentPattern.answer.number
        : currentPattern.type === 'color'
          ? selected.color === currentPattern.answer.color
          : currentPattern.type === 'mixed'
            ? selected.shape === currentPattern.answer.shape &&
              selected.color === currentPattern.answer.color
          : selected.shape === currentPattern.answer.shape;

    if (isCorrect) {
      // Correct answer
      void playSound('success');
      const bossBonus = currentPattern.isBossRound ? 20 : 0;
      const points = 15 + currentPattern.difficulty * 5 + streak * 3 + bossBonus;
      const tokens = Math.max(1, Math.floor(points / 10));

      setScore((prev) => prev + points);
      setStreak((prev) => prev + 1);
      setTotalTokensEarned((prev) => prev + tokens);
      setQuestsCompleted((prev) => prev + 1);

      if (onEarnTokens) {
        onEarnTokens(tokens);
      }

      setFeedback(
        currentPattern.isBossRound
          ? `🏆 Boss cleared! +${tokens} tokens`
          : `🎉 Perfect! +${tokens} tokens`,
      );

      // Level up every 5 patterns
      if (questsCompleted > 0 && (questsCompleted + 1) % 5 === 0) {
        void playSound('levelUp');
        void confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#22d3ee', '#7cff8b', '#ff5fd2'],
        });
        setLevel((prev) => Math.min(prev + 1, worldNames.length));
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }

      setTimeout(() => {
        setCurrentPattern(generatePattern());
        void api.start({ from: { opacity: 0, scale: 0.8 }, to: { opacity: 1, scale: 1 } });
        setFeedback('');
        setShowHint(false);
      }, 2000);
    } else {
      // Wrong answer
      void playSound('error');
      setStreak(0);
      setFeedback('❌ Not quite! Look at the pattern again.');
      setTimeout(() => setFeedback(''), 2000);
    }
  };

  const getHintText = (): string => {
    if (!currentPattern) return '';

    switch (currentPattern.type) {
      case 'color':
        return 'Look at how the colors repeat or alternate!';
      case 'shape':
        return 'Notice the pattern in the shapes!';
      case 'number':
        const diff =
          currentPattern.sequence.length > 1 &&
          currentPattern.sequence[0]?.number &&
          currentPattern.sequence[1]?.number
            ? currentPattern.sequence[1].number - currentPattern.sequence[0].number
            : 0;
        return diff > 0
          ? `The numbers are increasing by ${diff}`
          : 'Look at how the numbers change!';
      case 'mixed':
        return currentPattern.isBossRound
          ? 'Boss clue: both the symbol and the color are moving in their own loops.'
          : 'Track two rules at once: shape order and color order.';
      default:
        return 'Study the pattern carefully!';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-blue-900 to-purple-900 p-6">
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
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-3xl p-8 border-2 border-teal-500/50">
            {/* Pattern Type Badge */}
            <div className="text-center mb-6">
              <span className="bg-gradient-to-r from-teal-500 to-blue-500 text-white px-6 py-2 rounded-full text-sm font-bold uppercase">
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
                  feedback.includes('❌') ? 'text-red-400' : 'text-green-400'
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
                onClick={() => {
                  void playSound('pop');
                  setShowHint(true);
                }}
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
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-teal-500/20">
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
