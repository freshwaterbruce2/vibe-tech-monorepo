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
vi.mock('../../../services/puzzleGenerator', () => ({
  generateMemoryCards: () => [],
  calculateMemoryScore: () => ({ score: 0, stars: 0 }),
}));
vi.mock('../../../services/wordBanks', () => ({
  getRandomWords: () => [],
}));
vi.mock('../GameCompletionModal', () => ({
  default: () => null,
}));

import MemoryMatchGame from '../MemoryMatchGame';

describe('MemoryMatchGame', () => {
  const defaultProps = {
    subject: 'math',
    onComplete: vi.fn(),
    onBack: vi.fn(),
  };

  it('renders without crashing', () => {
    const { container } = render(<MemoryMatchGame {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with initialDifficulty prop', () => {
    const { container } = render(
      <MemoryMatchGame {...defaultProps} initialDifficulty="hard" />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('has at least one interactive button', () => {
    render(<MemoryMatchGame {...defaultProps} />);
    expect(document.querySelector('button')).toBeTruthy();
  });
});
