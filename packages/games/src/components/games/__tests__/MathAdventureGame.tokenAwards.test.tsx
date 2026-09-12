import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const frame = vi.hoisted(() => ({ callback: undefined as FrameRequestCallback | undefined }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('../../../hooks/useGameAudio', () => ({ useGameAudio: () => ({ playSound: vi.fn() }) }));
vi.mock('../../../utils/electronStore', () => ({ appStore: { get: vi.fn() } }));
import MathAdventureGame from '../MathAdventureGame';

type Award = (amount: number, key: string) => Promise<boolean>;

describe('package MathAdventureGame durable encounter award', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); frame.callback = undefined; });
  it('does not commit a correct gate before acceptance and retains its encounter key for retry', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame.callback = callback; return 1; });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    let settle: ((value: boolean) => void) | undefined;
    const award = vi.fn<Award>(async () => new Promise<boolean>((resolve) => { settle = resolve; }));
    render(<MathAdventureGame onEarnTokens={award} />);
    const selectLaneA = () => {
      const button = screen.getAllByRole('button').find((node) => node.textContent?.trim().startsWith('A'));
      expect(button).toBeTruthy();
      fireEvent.click(button!);
    };
    selectLaneA();
    for (let time = 0; time <= 3_600; time += 40) await act(async () => { frame.callback?.(time); });
    expect(award).toHaveBeenCalledTimes(1);
    await act(async () => { settle?.(false); });
    // The responsive HUD renders this same persisted error in both layouts.
    expect(screen.getAllByText(/could not be saved/i).length).toBeGreaterThanOrEqual(1);
    selectLaneA();
    await act(async () => { frame.callback?.(3_640); });
    expect(award.mock.calls[1]?.[1]).toBe(award.mock.calls[0]?.[1]);
    await act(async () => { settle?.(true); });
  });
});
