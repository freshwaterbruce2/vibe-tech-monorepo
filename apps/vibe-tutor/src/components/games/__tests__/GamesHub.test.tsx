import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  storeDelete: vi.fn(),
  storeGet: vi.fn(),
  storeRemove: vi.fn(),
  storeSet: vi.fn(),
}));

vi.mock('../../../services/tokenService', () => ({
  TOKEN_REWARDS: {
    GAME_PERFECT: 25,
    SEVEN_DAY_STREAK: 75,
    THIRTY_DAY_STREAK: 200,
    THREE_DAY_STREAK: 30,
  },
}));

vi.mock('../../../utils/electronStore', () => ({
  appStore: {
    delete: mocks.storeDelete,
    get: mocks.storeGet,
    remove: mocks.storeRemove,
    set: mocks.storeSet,
  },
}));

vi.mock('../MemoryMatchGame', () => ({
  default: ({ onBack, onComplete }: { onBack?: () => void; onComplete?: (score: number, stars: number, timeSpent: number) => void }) => (
    <div data-testid="memory-game">
      <button onClick={() => onComplete?.(100, 3, 45)}>Complete Memory</button>
      <button onClick={() => onBack?.()}>Exit Memory</button>
    </div>
  ),
}));

vi.mock('../WordSearchGame', () => ({ default: () => <div data-testid="wordsearch-game" /> }));
vi.mock('../AnagramsGame', () => ({ default: () => <div data-testid="anagrams-game" /> }));
vi.mock('../CrosswordGame', () => ({ default: () => <div data-testid="crossword-game" /> }));
vi.mock('../MathAdventureGame', () => ({ default: () => <div data-testid="math-game" /> }));
vi.mock('../WordBuilderGame', () => ({ default: () => <div data-testid="wordbuilder-game" /> }));
vi.mock('../SudokuGame', () => ({ default: () => <div data-testid="sudoku-game" /> }));
vi.mock('../PatternQuestGame', () => ({ default: () => <div data-testid="pattern-game" /> }));
vi.mock('../MusicNotesGame', () => ({ default: () => <div data-testid="musicnotes-game" /> }));

import BrainGymHub from '../BrainGymHub';

describe('BrainGymHub', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.storeSet.mockReset();
    mocks.storeDelete.mockReset();
    mocks.storeRemove.mockReset();
    mocks.storeGet.mockReset();
    mocks.storeGet.mockReturnValue(null);
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it('calls onClose when hub back button is clicked', () => {
    const onClose = vi.fn();
    render(<BrainGymHub userTokens={100} onEarnTokens={vi.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows Pattern Quest as locked at level 0', () => {
    render(<BrainGymHub userTokens={0} onEarnTokens={vi.fn()} onClose={vi.fn()} />);

    const lockedButton = screen.getByRole('button', { name: /pattern quest.*unlock at level 2/i });
    expect(lockedButton).toBeDisabled();
  });

  it('unlocks Pattern Quest when saved level is 2 or higher', () => {
    mocks.storeGet.mockReturnValue({
      chestProgress: 0,
      chestsOpened: 0,
      gamesPlayed: 9,
      lastPlayDate: '2026-03-05',
      level: 2,
      streak: 2,
      xp: 220,
    });

    render(<BrainGymHub userTokens={40} onEarnTokens={vi.fn()} onClose={vi.fn()} />);

    const unlockedButton = screen.getByRole('button', { name: /play pattern quest/i });
    expect(unlockedButton).toBeEnabled();
  });

  it('shows a featured drill recommendation in the hub', () => {
    render(<BrainGymHub userTokens={12} onEarnTokens={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText(/featured drill/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /launch memory match/i })).toBeInTheDocument();
  });

  it('awards completion rewards and returns to hub after group A game complete', async () => {
    const onEarnTokens = vi.fn();
    render(<BrainGymHub userTokens={0} onEarnTokens={onEarnTokens} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /play memory match/i }));
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    expect(screen.getByTestId('memory-game')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /complete memory/i }));
    expect(onEarnTokens).toHaveBeenCalledWith(35, 'Played Memory Match');

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText(/brain gym/i)).toBeInTheDocument();
    expect(mocks.storeSet).toHaveBeenCalledWith(
      'gamesHub_stats',
      expect.objectContaining({
        chestProgress: 1,
        gameStats: expect.objectContaining({
          memory: expect.objectContaining({
            bestScore: 100,
            bestStars: 3,
            lastTokens: 35,
            plays: 1,
            totalTokens: 35,
          }),
        }),
        gamesPlayed: 1,
        level: 0,
        xp: 10,
      }),
    );
  });
});
