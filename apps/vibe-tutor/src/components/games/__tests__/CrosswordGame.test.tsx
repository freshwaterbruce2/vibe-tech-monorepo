import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('../../../hooks/useGameAudio', () => ({
  useGameAudio: () => ({ playSound: vi.fn() }),
}));
vi.mock('../../../services/wordBanks', () => ({
  getCrosswordWords: () => [
    { word: 'HELLO', clue: 'A greeting' },
    { word: 'WORLD', clue: 'The earth' },
    { word: 'LEARN', clue: 'Gain knowledge' },
  ],
}));
vi.mock('../GameCompletionModal', () => ({
  default: () => null,
}));

import CrosswordGame from '../CrosswordGame';

describe('CrosswordGame', () => {
  const defaultProps = {
    subject: 'english',
    onComplete: vi.fn(),
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it('renders without crashing', () => {
    const { container } = render(<CrosswordGame {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('has interactive buttons', () => {
    render(<CrosswordGame {...defaultProps} />);
    expect(document.querySelector('button')).toBeTruthy();
  });
});
