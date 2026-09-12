import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({ getStrict: vi.fn(), setStrict: vi.fn() }));
vi.mock('../../../utils/electronStore', () => ({ appStore: store }));
vi.mock('../../games/AnagramsGame', () => ({
  default: ({
    onComplete,
  }: {
    onComplete: (score: number, stars: number, time: number) => void;
  }) => <button onClick={() => onComplete(90, 3, 10)}>Finish mocked anagrams</button>,
}));

import RealmView, { allocateRealmSession } from '../RealmView';

type Award = (amount: number, reason: string, operationId: string) => Promise<boolean>;

describe('RealmView durable completion award', () => {
  beforeEach(() => {
    store.getStrict.mockReset();
    store.setStrict.mockReset();
    store.getStrict.mockReturnValue(0);
  });

  it('rejects a game outside the current subject before reading or writing the Realm session sequence', async () => {
    await expect(allocateRealmSession('Language Arts', 'boss-math')).resolves.toBeNull();
    expect(store.getStrict).not.toHaveBeenCalled();
    expect(store.setStrict).not.toHaveBeenCalled();
  });

  it('keeps the active realm open for pending/rejected awards and retries with its persisted session ID', async () => {
    let settle: ((value: boolean) => void) | undefined;
    const onEarnTokens = vi.fn<Award>(
      async () =>
        new Promise<boolean>((resolve) => {
          settle = resolve;
        }),
    );
    render(
      <RealmView
        subject="Language Arts"
        onBack={vi.fn()}
        onStartWorksheet={vi.fn()}
        onEarnTokens={onEarnTokens}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /anagrams/i }));
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    fireEvent.click(screen.getByRole('button', { name: /finish mocked anagrams/i }));
    expect(onEarnTokens).toHaveBeenCalledWith(
      expect.any(Number),
      'Played Anagrams',
      'realm:1:completion',
    );
    expect(screen.getByRole('button', { name: /finish mocked anagrams/i })).toBeInTheDocument();

    await act(async () => {
      settle?.(false);
    });
    fireEvent.click(screen.getByRole('button', { name: /finish mocked anagrams/i }));
    expect(onEarnTokens.mock.calls[1]?.[2]).toBe('realm:1:completion');
    expect(store.setStrict).toHaveBeenCalledWith('realm_game_session_sequence', 1);
  });

  it('passes the persisted no-space completion identity after a completed Realm game', async () => {
    const onGameCompleted = vi.fn();
    render(
      <RealmView
        subject="Language Arts"
        onBack={vi.fn()}
        onStartWorksheet={vi.fn()}
        onEarnTokens={vi.fn().mockResolvedValue(true)}
        onGameCompleted={onGameCompleted}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /anagrams/i }));
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    fireEvent.click(screen.getByRole('button', { name: /finish mocked anagrams/i }));

    await waitFor(() =>
      expect(onGameCompleted).toHaveBeenCalledWith(
        'anagrams',
        90,
        expect.objectContaining({ source: 'learning-realm', sessionId: 'realm:1' }),
      ),
    );
  });
});
