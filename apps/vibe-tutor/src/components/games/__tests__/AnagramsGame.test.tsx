import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('../../../hooks/useGameAudio', () => ({
  useGameAudio: () => ({ playSound: vi.fn() }),
}));

const stableApi = { start: vi.fn(), stop: vi.fn(), pause: vi.fn() };
vi.mock('@react-spring/web', () => ({
  animated: { div: 'div' },
  useSpring: () => [{}, stableApi],
}));
vi.mock('../../../services/puzzleGenerator', () => ({
  generateAnagrams: () => [
    { original: 'HELLO', scrambled: 'OLLEH', hint: 'A greeting' },
  ],
  calculateAnagramScore: () => ({ score: 50, stars: 2 }),
}));
vi.mock('../../../services/wordBanks', () => ({
  getAnagramWords: () => [
    { word: 'HELLO', clue: 'A greeting' },
  ],
}));
vi.mock('../GameCompletionModal', () => ({ default: () => null }));

import AnagramsGame from '../AnagramsGame';

describe('AnagramsGame', () => {
  const defaultProps = {
    subject: 'english',
    onComplete: vi.fn(),
    onBack: vi.fn(),
  };

  it('renders without crashing', () => {
    const { container } = render(<AnagramsGame {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('has interactive buttons', () => {
    render(<AnagramsGame {...defaultProps} />);
    expect(document.querySelector('button')).toBeTruthy();
  });
});
