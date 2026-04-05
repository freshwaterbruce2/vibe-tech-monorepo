import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('../../../hooks/useGameAudio', () => ({
  useGameAudio: () => ({ playSound: vi.fn() }),
}));
vi.mock('@react-spring/web', () => ({
  animated: {
    div: (props: Record<string, unknown>) => {
      const { style: _s, ...rest } = props;
      return <div {...rest} />;
    },
  },
  useSpring: () => [{ opacity: 1, scale: 1 }, { start: vi.fn() }],
}));
vi.mock('../usePatternQuestGame', () => ({
  usePatternQuestGame: () => ({
    score: 0,
    level: 1,
    streak: 0,
    currentPattern: null,
    feedback: '',
    totalTokensEarned: 0,
    showCelebration: false,
    showHint: false,
    questsCompleted: 0,
    patternProps: { opacity: 1, scale: 1 },
    handleOptionClick: vi.fn(),
    toggleHint: vi.fn(),
  }),
  getColorClass: (c: string) => c,
  worldNames: ['Starter Beach'],
}));

import PatternQuestGame from '../PatternQuestGame';

describe('PatternQuestGame', () => {
  const defaultProps = {
    onEarnTokens: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders without crashing', () => {
    const { container } = render(<PatternQuestGame {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with no props (all optional)', () => {
    const { container } = render(<PatternQuestGame />);
    expect(container.firstChild).toBeTruthy();
  });
});
