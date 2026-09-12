import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../hooks/useGameAudio', () => ({ useGameAudio: () => ({ playSound: vi.fn() }) }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

import { usePatternQuestGame } from '../usePatternQuestGame';

type Award = (amount: number, key: string) => Promise<boolean>;

describe('package usePatternQuestGame durable award', () => {
  it('does not advance a correct pattern until accepted and retries its stable key after rejection', async () => {
    let settle: ((value: boolean) => void) | undefined;
    const award = vi.fn<Award>(async () => new Promise<boolean>((resolve) => { settle = resolve; }));
    const { result } = renderHook(() => usePatternQuestGame({ onEarnTokens: award }));
    const answer = result.current.currentPattern?.answer;
    expect(answer).toBeTruthy();
    await act(async () => { void result.current.handleAnswer(answer!); });
    expect(result.current.questsCompleted).toBe(0);
    await act(async () => { settle?.(false); });
    expect(result.current.feedback).toMatch(/could not be saved/i);
    await act(async () => { void result.current.handleAnswer(answer!); });
    expect(award.mock.calls[1]?.[1]).toBe(award.mock.calls[0]?.[1]);
    await act(async () => { settle?.(true); });
    expect(result.current.questsCompleted).toBe(1);
  });
});
