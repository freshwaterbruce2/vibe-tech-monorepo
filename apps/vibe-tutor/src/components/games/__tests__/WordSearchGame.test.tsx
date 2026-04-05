import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('../../../hooks/useGameAudio', () => ({
  useGameAudio: () => ({ playSound: vi.fn() }),
}));
vi.mock('../../../services/puzzleGenerator', () => ({
  generateWordSearch: () => ({
    grid: Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => 'A')),
    words: [],
    placedWords: [],
  }),
  calculateWordSearchScore: () => ({ score: 0, stars: 0 }),
}));
vi.mock('../../../services/wordBanks', () => ({
  getRandomWords: () => [],
}));
vi.mock('../../../services/gameAchievements', () => ({
  updateGameStats: vi.fn(),
}));
vi.mock('../../../services/learningAnalytics', () => ({
  learningAnalytics: { trackGameComplete: vi.fn() },
}));
vi.mock('../../../utils/electronStore', () => ({
  appStore: { get: vi.fn(), set: vi.fn() },
}));
vi.mock('../../settings/GameSettings', () => ({
  default: () => null,
}));
vi.mock('../../settings/gameSettingsConfig', () => ({
  getSavedGameConfig: () => ({
    difficulty: 'medium',
    hintsEnabled: true,
    timerMode: 'timed',
  }),
  getDifficultyHintPenalty: () => 0,
  saveGameConfig: vi.fn(),
}));
vi.mock('../../ui/CelebrationEffect', () => ({
  default: () => null,
}));
vi.mock('../GameCompletionModal', () => ({
  default: () => null,
}));
vi.mock('../WordSearchGame/WordSearchGrid', () => ({
  default: () => <div data-testid="grid" />,
}));
vi.mock('../WordSearchGame/WordSearchWordList', () => ({
  default: () => <div data-testid="word-list" />,
}));
vi.mock('../WordSearchGame/useWordSearchInput', () => ({
  useWordSearchInput: () => ({
    selectedCells: [],
    handleCellPointerDown: vi.fn(),
    handleCellPointerEnter: vi.fn(),
    handlePointerUp: vi.fn(),
    resetSelection: vi.fn(),
  }),
}));

import WordSearchGame from '../WordSearchGame/WordSearchGame';

describe('WordSearchGame', () => {
  const defaultProps = {
    subject: 'math',
    onComplete: vi.fn(),
    onBack: vi.fn(),
  };

  it('renders without crashing', () => {
    const { container } = render(<WordSearchGame {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with initial config', () => {
    const { container } = render(
      <WordSearchGame {...defaultProps} initialConfig={{ difficulty: 'easy' }} />
    );
    expect(container.firstChild).toBeTruthy();
  });
});
