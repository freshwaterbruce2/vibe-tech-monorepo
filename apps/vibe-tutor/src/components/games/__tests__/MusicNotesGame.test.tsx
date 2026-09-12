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

  it('awaits token acceptance before recording a correct answer', async () => {
    const onEarnTokens = vi.fn().mockResolvedValue(true);
    render(<MusicNotesGame onEarnTokens={onEarnTokens} />);

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'C' })); });
    expect(mocks.playCorrect).toHaveBeenCalledTimes(1);
    expect(onEarnTokens).toHaveBeenNthCalledWith(1, 2, 'music:C:0');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'C' })); });
    expect(onEarnTokens).toHaveBeenNthCalledWith(2, 2, 'music:C:1');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'C' })); });
    expect(onEarnTokens).toHaveBeenNthCalledWith(3, 3, 'music:C:2');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'D' })); });
    expect(mocks.playWrong).toHaveBeenCalledTimes(1);
    expect(onEarnTokens).toHaveBeenCalledTimes(3);
    expect(screen.getByText(/75% accuracy/i)).toBeInTheDocument();
  });

  it('keeps the same note retryable while a durable award is pending or rejected', async () => {
    let settle: ((accepted: boolean) => void) | undefined;
    const onEarnTokens = vi.fn(async () => new Promise<boolean>((resolve) => { settle = resolve; }));
    render(<MusicNotesGame onEarnTokens={onEarnTokens} />);

    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    expect(onEarnTokens).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/0 answered/i)).toBeInTheDocument();

    await act(async () => { settle?.(false); });
    expect(screen.getByText(/could not be saved/i)).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'C' })); });
    expect(onEarnTokens).toHaveBeenCalledTimes(2);
    expect(onEarnTokens.mock.calls[0]?.[1]).toBe(onEarnTokens.mock.calls[1]?.[1]);
  });
});
