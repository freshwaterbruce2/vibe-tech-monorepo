import confetti from 'canvas-confetti';
import { useCallback, useEffect, useState } from 'react';
import { useSpring } from '@react-spring/web';
import { useGameAudio } from '../../hooks/useGameAudio';

type PatternType = 'color' | 'shape' | 'number' | 'mixed';
type Shape = '■' | '●' | '▲' | '★' | '♦' | '❤';
type Color = 'red' | 'blue' | 'fuchsia' | 'yellow' | 'purple' | 'orange';

export interface PatternElement {
  shape: Shape;
  color: Color;
  number?: number;
}

export interface Pattern {
  sequence: PatternElement[];
  answer: PatternElement;
  options: PatternElement[];
  type: PatternType;
  difficulty: number;
  isBossRound: boolean;
  prompt: string;
}

const shapes: Shape[] = ['■', '●', '▲', '★', '♦', '❤'];
const colors: Color[] = ['red', 'blue', 'fuchsia', 'yellow', 'purple', 'orange'];

// Roblox-themed world names
export const worldNames = [
  '🌴 Starter Beach',
  '🏗️ Build Battle Arena',
  '🎮 Arcade World',
  '🏰 Medieval Kingdom',
  '🚀 Galaxy Station',
  '💎 Crystal Caverns',
  '⚡ Speed Run City',
  '🌟 Master League',
];

export const getColorClass = (color: Color): string => {
  const colorMap = {
    red: 'text-red-500',
    blue: 'text-blue-500',
    fuchsia: 'text-fuchsia-500',
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

interface UsePatternQuestGameProps {
  onEarnTokens?: (amount: number) => void;
}

export function usePatternQuestGame({ onEarnTokens }: UsePatternQuestGameProps) {
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
          colors: ['#22d3ee', '#ec4899', '#ff5fd2'],
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
      case 'number': {
        const diff =
          currentPattern.sequence.length > 1 &&
          currentPattern.sequence[0]?.number &&
          currentPattern.sequence[1]?.number
            ? currentPattern.sequence[1].number - currentPattern.sequence[0].number
            : 0;
        return diff > 0
          ? `The numbers are increasing by ${diff}`
          : 'Look at how the numbers change!';
      }
      case 'mixed':
        return currentPattern.isBossRound
          ? 'Boss clue: both the symbol and the color are moving in their own loops.'
          : 'Track two rules at once: shape order and color order.';
      default:
        return 'Study the pattern carefully!';
    }
  };

  const requestHint = () => {
    void playSound('pop');
    setShowHint(true);
  };

  return {
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
  };
}
