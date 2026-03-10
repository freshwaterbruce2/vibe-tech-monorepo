import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  playCorrect: vi.fn(),
  playTone: vi.fn(),
  playWrong: vi.fn(),
}));

vi.mock('../musicNotesAudio', () => ({
  playCorrect: mocks.playCorrect,
  playTone: mocks.playTone,
  playWrong: mocks.playWrong,
}));

vi.mock('../musicNotesData', () => ({
  getTier: vi.fn(() => ({
    name: 'White Keys',
    threshold: 0,
    optionCount: 4,
    notes: [
      { name: 'C', accidental: '', staffPos: 0, label: 'C' },
      { name: 'D', accidental: '', staffPos: 1, label: 'D' },
      { name: 'E', accidental: '', staffPos: 2, label: 'E' },
      { name: 'F', accidental: '', staffPos: 3, label: 'F' },
    ],
  })),
  pick: vi.fn((arr: Array<{ label: string }>) => arr[0]),
  shuffle: vi.fn(<T,>(arr: T[]) => [...arr]),
}));

vi.mock('../MusicNotesStaff', () => ({
  default: ({ note }: { note: { label: string } }) => <div data-testid="staff-note">{note.label}</div>,
}));

import MusicNotesGame from '../MusicNotesGame';

describe('MusicNotesGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.playCorrect.mockReset();
    mocks.playTone.mockReset();
    mocks.playWrong.mockReset();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it('calls onClose from back button', () => {
    const onClose = vi.fn();
    render(<MusicNotesGame onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('plays current note tone when Hear it is clicked', () => {
    render(<MusicNotesGame />);

    fireEvent.click(screen.getByRole('button', { name: /hear it/i }));
    expect(mocks.playTone).toHaveBeenCalledWith('C', 0.5);
  });

  it('awards tokens on correct answers and tracks accuracy by correctness', () => {
    const onEarnTokens = vi.fn();
    render(<MusicNotesGame onEarnTokens={onEarnTokens} />);

    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    expect(mocks.playCorrect).toHaveBeenCalledTimes(1);
    expect(onEarnTokens).toHaveBeenNthCalledWith(1, 2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    expect(onEarnTokens).toHaveBeenNthCalledWith(2, 2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    expect(onEarnTokens).toHaveBeenNthCalledWith(3, 3);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'D' }));
    expect(mocks.playWrong).toHaveBeenCalledTimes(1);
    expect(onEarnTokens).toHaveBeenCalledTimes(3);
    expect(screen.getByText(/75% accuracy/i)).toBeInTheDocument();
  });
});
