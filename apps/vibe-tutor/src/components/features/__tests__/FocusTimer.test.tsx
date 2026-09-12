import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { onCompleteRef, reset, triggerVibration, isSoundFeedbackEnabled, dataStore, prepareFocusCompletionDelivery, logger } = vi.hoisted(
  () => ({
    onCompleteRef: { current: null as (() => void) | null },
    reset: vi.fn(),
    triggerVibration: vi.fn(),
    isSoundFeedbackEnabled: vi.fn(),
    dataStore: { saveFocusSession: vi.fn() },
    prepareFocusCompletionDelivery: vi.fn(),
    logger: { error: vi.fn() },
  }),
);

vi.mock('../../../hooks/useCountdownTimer', () => ({
  useCountdownTimer: ({ onComplete }: { onComplete: () => void }) => {
    onCompleteRef.current = onComplete;
    return { timeRemaining: 1500, isRunning: false, start: vi.fn(), pause: vi.fn(), reset };
  },
}));
vi.mock('../../../services/uiService', () => ({ triggerVibration }));
vi.mock('../../../services/sensoryPreferences', () => ({ isSoundFeedbackEnabled }));
vi.mock('../../../services/dataStore', () => ({ dataStore }));
vi.mock('../../../services/completionDeliveryService', () => ({ prepareFocusCompletionDelivery }));
vi.mock('../../../utils/logger', () => ({ logger }));

import FocusTimer from '../FocusTimer';

const UUID = '11111111-1111-4111-8111-111111111111';
const COMPLETED_AT = 1_725_000_000_000;
const expectedSession = () => ({
  id: `focus:${UUID}`,
  startTime: COMPLETED_AT - 25 * 60 * 1000,
  endTime: COMPLETED_AT,
  duration: 25,
  completed: true,
});
const renderTimer = (onDurableFocusCompletion = vi.fn()) =>
  render(<FocusTimer onDurableFocusCompletion={onDurableFocusCompletion} />);
const complete = () => act(() => onCompleteRef.current?.());

describe('FocusTimer durable completion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(COMPLETED_AT);
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => UUID) });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    dataStore.saveFocusSession.mockImplementation(async (session: unknown) => session);
    prepareFocusCompletionDelivery.mockResolvedValue(undefined);
    isSoundFeedbackEnabled.mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('prepares, saves, then notifies the exact secure focus session', async () => {
    const order: string[] = [];
    prepareFocusCompletionDelivery.mockImplementation(async () => { order.push('prepare'); });
    dataStore.saveFocusSession.mockImplementation(async (session: unknown) => {
      order.push('save');
      return session;
    });
    const onDurableFocusCompletion = vi.fn(() => { order.push('notify'); });
    renderTimer(onDurableFocusCompletion);
    complete();
    await waitFor(() => expect(onDurableFocusCompletion).toHaveBeenCalledWith(expectedSession()));
    expect(prepareFocusCompletionDelivery).toHaveBeenCalledWith(expectedSession());
    expect(dataStore.saveFocusSession).toHaveBeenCalledWith(expectedSession());
    expect(order).toEqual(['prepare', 'save', 'notify']);
    expect(screen.getByRole('heading', { name: /break time/i })).toBeInTheDocument();
    expect(reset).toHaveBeenCalledWith(5 * 60);
  });

  it('honestly retries after identity is unavailable with the original completion time', async () => {
    vi.stubGlobal('crypto', undefined);
    const onDurableFocusCompletion = vi.fn();
    renderTimer(onDurableFocusCompletion);
    complete();
    await screen.findByRole('alert');
    expect(screen.getByText(/identity is unavailable/i)).toBeInTheDocument();
    expect(prepareFocusCompletionDelivery).not.toHaveBeenCalled();
    expect(dataStore.saveFocusSession).not.toHaveBeenCalled();
    expect(onDurableFocusCompletion).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => UUID) });
    fireEvent.click(screen.getByRole('button', { name: /retry saving session/i }));
    await waitFor(() => expect(onDurableFocusCompletion).toHaveBeenCalledWith(expectedSession()));
  });

  it('does not save, notify, or switch modes when preparation rejects, and retries the same candidate', async () => {
    prepareFocusCompletionDelivery.mockRejectedValueOnce(new Error('journal unavailable'));
    const onDurableFocusCompletion = vi.fn();
    renderTimer(onDurableFocusCompletion);
    complete();
    await screen.findByRole('alert');
    expect(dataStore.saveFocusSession).not.toHaveBeenCalled();
    expect(onDurableFocusCompletion).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /focus time/i })).toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /retry saving session/i }));
    await waitFor(() => expect(onDurableFocusCompletion).toHaveBeenCalledWith(expectedSession()));
    expect(prepareFocusCompletionDelivery).toHaveBeenNthCalledWith(1, expectedSession());
    expect(prepareFocusCompletionDelivery).toHaveBeenNthCalledWith(2, expectedSession());
  });

  it('re-prepares and re-saves the exact candidate when source persistence rejects', async () => {
    dataStore.saveFocusSession.mockRejectedValueOnce(new Error('storage unavailable'));
    const onDurableFocusCompletion = vi.fn();
    renderTimer(onDurableFocusCompletion);
    complete();
    await screen.findByRole('alert');
    expect(onDurableFocusCompletion).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /focus time/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry saving session/i }));
    await waitFor(() => expect(onDurableFocusCompletion).toHaveBeenCalledWith(expectedSession()));
    expect(prepareFocusCompletionDelivery).toHaveBeenNthCalledWith(1, expectedSession());
    expect(prepareFocusCompletionDelivery).toHaveBeenNthCalledWith(2, expectedSession());
    expect(dataStore.saveFocusSession).toHaveBeenNthCalledWith(1, expectedSession());
    expect(dataStore.saveFocusSession).toHaveBeenNthCalledWith(2, expectedSession());
  });

  it('treats a conflicting canonical source return as a source failure', async () => {
    dataStore.saveFocusSession.mockResolvedValue({ ...expectedSession(), id: 'focus:other' });
    const onDurableFocusCompletion = vi.fn();
    renderTimer(onDurableFocusCompletion);
    complete();
    await screen.findByRole('alert');
    expect(onDurableFocusCompletion).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /focus time/i })).toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();
  });

  it('advances to break and plays feedback before a deferred notification settles', async () => {
    let resolveNotification: () => void = () => undefined;
    const notification = new Promise<void>((resolve) => { resolveNotification = resolve; });
    const onDurableFocusCompletion = vi.fn(async () => notification);
    renderTimer(onDurableFocusCompletion);
    complete();
    await waitFor(() => expect(onDurableFocusCompletion).toHaveBeenCalledWith(expectedSession()));
    expect(screen.getByRole('heading', { name: /break time/i })).toBeInTheDocument();
    expect(reset).toHaveBeenCalledWith(5 * 60);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(triggerVibration).toHaveBeenCalledWith([200, 100, 200]);
    await act(async () => resolveNotification());
  });

  it('handles a synchronous durable-notification throw without reopening the saved source action', async () => {
    const onDurableFocusCompletion = vi.fn(() => { throw new Error('sync failure'); });
    renderTimer(onDurableFocusCompletion);
    complete();
    await waitFor(() => expect(onDurableFocusCompletion).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(logger.error).toHaveBeenCalledWith('Focus completion follow-up failed:', expect.any(Error)));
    expect(screen.getByRole('heading', { name: /break time/i })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('handles a rejected durable-notification promise without reopening the saved source action', async () => {
    const onDurableFocusCompletion = vi.fn().mockRejectedValue(new Error('async failure'));
    renderTimer(onDurableFocusCompletion);
    complete();
    await waitFor(() => expect(onDurableFocusCompletion).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(logger.error).toHaveBeenCalledWith('Focus completion follow-up failed:', expect.any(Error)));
    expect(screen.getByRole('heading', { name: /break time/i })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('deduplicates duplicate completion calls, including while the source save is deferred', async () => {
    let resolveSave: (session: unknown) => void = () => undefined;
    dataStore.saveFocusSession.mockImplementation(async () => new Promise((resolve) => { resolveSave = resolve; }));
    const onDurableFocusCompletion = vi.fn();
    renderTimer(onDurableFocusCompletion);
    act(() => { onCompleteRef.current?.(); onCompleteRef.current?.(); });
    await waitFor(() => expect(prepareFocusCompletionDelivery).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(dataStore.saveFocusSession).toHaveBeenCalledTimes(1));
    expect(onDurableFocusCompletion).not.toHaveBeenCalled();
    await act(async () => resolveSave(expectedSession()));
    await waitFor(() => expect(onDurableFocusCompletion).toHaveBeenCalledTimes(1));
  });

  it('does not make another delivery when a break completes and returns to a fresh focus timer', async () => {
    const onDurableFocusCompletion = vi.fn();
    renderTimer(onDurableFocusCompletion);
    complete();
    await waitFor(() => expect(screen.getByRole('heading', { name: /break time/i })).toBeInTheDocument());
    complete();
    expect(prepareFocusCompletionDelivery).toHaveBeenCalledTimes(1);
    expect(dataStore.saveFocusSession).toHaveBeenCalledTimes(1);
    expect(onDurableFocusCompletion).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('heading', { name: /focus time/i })).toBeInTheDocument());
    expect(reset).toHaveBeenLastCalledWith(25 * 60);
  });

  it('uses the live sensory sound gate and central haptic gate after a durable completion', async () => {
    const play = vi.mocked(HTMLMediaElement.prototype.play);
    renderTimer();
    complete();
    await waitFor(() => expect(play).toHaveBeenCalled());
    expect(triggerVibration).toHaveBeenCalledWith([200, 100, 200]);
  });
});
