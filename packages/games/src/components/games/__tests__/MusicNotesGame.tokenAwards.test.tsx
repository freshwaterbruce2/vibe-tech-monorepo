import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../musicNotesAudio', () => ({ playCorrect: vi.fn(), playTone: vi.fn(), playWrong: vi.fn() }));
vi.mock('../musicNotesData', () => ({
  getTier: () => ({ name: 'Test', threshold: 0, optionCount: 2, notes: [
    { name: 'C', accidental: '', staffPos: 0, label: 'C' }, { name: 'D', accidental: '', staffPos: 1, label: 'D' },
  ] }),
  pick: <T,>(items: T[]) => items[0], shuffle: <T,>(items: T[]) => items,
}));
vi.mock('../MusicNotesStaff', () => ({ default: () => <div /> }));
vi.mock('../../../hooks/useGameAudio', () => ({ useGameAudio: () => ({ playSound: vi.fn() }) }));

import MusicNotesGame from '../MusicNotesGame';

type Award = (amount: number, awardKey: string) => Promise<boolean>;

describe('package MusicNotesGame durable award', () => {
  it('does not advance while pending and retries the same note key after rejection', async () => {
    let settle: ((value: boolean) => void) | undefined;
    const award = vi.fn<Award>(async () => new Promise<boolean>((resolve) => { settle = resolve; }));
    render(<MusicNotesGame onEarnTokens={award} />);
    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    expect(award).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/0 answered/i)).toBeTruthy();
    await act(async () => { settle?.(false); });
    expect(screen.getByText(/could not be saved/i)).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'C' })); });
    expect(award.mock.calls[0]?.[1]).toBe(award.mock.calls[1]?.[1]);
    await act(async () => { settle?.(true); });
    expect(screen.getByText(/1 answered/i)).toBeTruthy();
  });
});
