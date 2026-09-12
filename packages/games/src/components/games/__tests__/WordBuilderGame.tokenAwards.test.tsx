import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('../../../hooks/useGameAudio', () => ({ useGameAudio: () => ({ playSound: vi.fn() }) }));
import WordBuilderGame from '../WordBuilderGame';

type Award = (amount: number, key: string) => Promise<boolean>;

describe('package WordBuilderGame durable award', () => {
  afterEach(() => { vi.restoreAllMocks(); });
  it('holds a solved word while pending and retries the same key after rejection', async () => {
    // `BADGE` is the first eligible level-one word; subsequent 0.5 comparator
    // values preserve its letter order instead of relying on engine sort behavior.
    vi.spyOn(Math, 'random').mockImplementationOnce(() => 0).mockReturnValue(0.5);
    let settle: ((value: boolean) => void) | undefined;
    const award = vi.fn<Award>(() => new Promise<boolean>((resolve) => { settle = resolve; }));
    const { container } = render(<WordBuilderGame onEarnTokens={award} />);
    const choose = (letter: string) => {
      const button = Array.from(container.querySelectorAll('button:not([disabled])')).find(
        (node) => node.textContent?.trim() === letter && node.getAttribute('class')?.includes('from-purple-600'),
      );
      expect(button).toBeTruthy();
      fireEvent.click(button!);
    };
    for (const letter of 'BADGE') choose(letter);
    expect(award).toHaveBeenCalledTimes(1);
    await act(async () => { settle?.(false); });
    expect(container.textContent).toMatch(/could not be saved/i);
    // Rebuild the unchanged word; this is the explicit retry gesture.
    fireEvent.click(Array.from(container.querySelectorAll('button')).find((node) => node.textContent?.includes('Reset'))!);
    for (const letter of 'BADGE') choose(letter);
    expect(award.mock.calls[1]?.[1]).toBe(award.mock.calls[0]?.[1]);
    await act(async () => { settle?.(true); });
    expect(container.textContent).toMatch(/Awesome/i);
  });
});
