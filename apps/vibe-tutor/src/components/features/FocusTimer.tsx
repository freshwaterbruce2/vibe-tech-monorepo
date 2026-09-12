import { Clock, Pause, Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { triggerVibration } from '../../services/uiService';
import { isSoundFeedbackEnabled } from '../../services/sensoryPreferences';
import { dataStore } from '../../services/dataStore';
import { prepareFocusCompletionDelivery } from '../../services/completionDeliveryService';
import type { FocusSession } from '../../types';
import { useCountdownTimer } from '../../hooks/useCountdownTimer';
import ProgressBar from '../ui/ProgressBar';

import { logger } from '../../utils/logger';

interface FocusTimerProps {
  onDurableFocusCompletion: (session: FocusSession) => void | Promise<void>;
}

const FocusTimer = ({ onDurableFocusCompletion }: FocusTimerProps) => {
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingFocusSessionRef = useRef<FocusSession | null>(null);
  const persistedFocusSessionRef = useRef<FocusSession | null>(null);
  const focusCompletionSucceededRef = useRef(false);
  const completionInFlightRef = useRef(false);
  const pendingCompletionTimeRef = useRef<number | null>(null);
  const [pendingFocusSession, setPendingFocusSession] = useState<FocusSession | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  // Ref breaks the circular dep: handleComplete needs reset, reset comes from the hook
  // that takes handleComplete as onComplete. The ref is synced after the hook call.
  const resetTimerRef = useRef<(newDuration?: number) => void>(() => {});

  const playCompletionFeedback = useCallback(() => {
    if (isSoundFeedbackEnabled() && audioRef.current) {
      audioRef.current.play().catch((err) => logger.error('Audio play failed:', err));
    }
    triggerVibration([200, 100, 200]);
  }, []);

  const persistCompletedFocusSession = useCallback(
    async (session: FocusSession) => {
      if (completionInFlightRef.current || focusCompletionSucceededRef.current) return;
      completionInFlightRef.current = true;
      setCompletionError(null);
      let persisted = false;
      try {
        if (persistedFocusSessionRef.current) {
          session = persistedFocusSessionRef.current;
        } else {
          await prepareFocusCompletionDelivery(session);
          const canonical = await dataStore.saveFocusSession(session);
          if (
            canonical.id !== session.id || canonical.startTime !== session.startTime ||
            canonical.endTime !== session.endTime || canonical.duration !== session.duration ||
            canonical.completed !== true
          ) throw new Error('Focus persistence returned a conflicting session');
          persistedFocusSessionRef.current = canonical;
          session = canonical;
        }
        persisted = true;
      } catch (error) {
        logger.error('Failed to save focus session:', error);
        setCompletionError(
          'Your completed focus session was not saved. Retry to save it before earning tokens.',
        );
      } finally {
        completionInFlightRef.current = false;
      }
      if (!persisted) return;
      focusCompletionSucceededRef.current = true;
      pendingFocusSessionRef.current = session;
      setPendingFocusSession(session);
      playCompletionFeedback();
      pendingFocusSessionRef.current = null;
      setPendingFocusSession(null);
      persistedFocusSessionRef.current = null;
      setMode('break');
      resetTimerRef.current(5 * 60);
      void Promise.resolve()
        .then(async () => onDurableFocusCompletion(session))
        .catch((error) => {
          logger.error('Focus completion follow-up failed:', error);
        });
    },
    [onDurableFocusCompletion, playCompletionFeedback],
  );

  const handleComplete = useCallback(() => {
    if (mode === 'break') {
      playCompletionFeedback();
      focusCompletionSucceededRef.current = false;
      persistedFocusSessionRef.current = null;
      setMode('focus');
      resetTimerRef.current(25 * 60);
      return;
    }

    if (pendingFocusSessionRef.current || focusCompletionSucceededRef.current) return;

    const sessionMinutes = 25;
    const completedAt = pendingCompletionTimeRef.current ?? Date.now();
    pendingCompletionTimeRef.current = completedAt;
    const uuid = globalThis.crypto?.randomUUID;
    if (typeof uuid !== 'function') {
      setCompletionError('Focus session identity is unavailable. Please retry.');
      return;
    }
    const session: FocusSession = {
      id: `focus:${uuid.call(globalThis.crypto)}`,
      startTime: completedAt - sessionMinutes * 60 * 1000,
      endTime: completedAt,
      duration: sessionMinutes,
      completed: true,
    };
    pendingCompletionTimeRef.current = null;
    pendingFocusSessionRef.current = session;
    setPendingFocusSession(session);
    void persistCompletedFocusSession(session);
  }, [mode, persistCompletedFocusSession, playCompletionFeedback]);

  const totalSeconds = mode === 'focus' ? 25 * 60 : 5 * 60;
  const { timeRemaining, isRunning, start, pause, reset } = useCountdownTimer({
    initialSeconds: totalSeconds,
    onComplete: handleComplete,
  });

  useEffect(() => {
    resetTimerRef.current = reset;
  }, [reset]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background-main via-background-main to-surface-dark">
      <div className="glass-card p-8 text-center space-y-6 max-w-md w-full">
        <div className="flex items-center justify-center gap-3">
          <Clock size={32} className={mode === 'focus' ? 'text-blue-400' : 'text-violet-400'} />
          <h2 className="text-2xl font-bold">{mode === 'focus' ? 'Focus Time' : 'Break Time'}</h2>
        </div>

        {/* Big Timer */}
        <div className="text-7xl font-bold tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-accent)] to-[var(--secondary-accent)]">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>

        {/* Controls */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => (isRunning ? pause() : start())}
            className="p-4 bg-[var(--primary-accent)] hover:bg-[var(--primary-accent)]/80 rounded-full transition-all hover:scale-110"
            aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          >
            {isRunning ? <Pause size={28} /> : <Play size={28} />}
          </button>
          <button
            onClick={() => reset()}
            className="p-4 bg-surface-lighter hover:bg-surface-light rounded-full transition-all hover:scale-110"
            aria-label="Reset timer"
          >
            <RotateCcw size={28} />
          </button>
        </div>

        {/* Progress Bar */}
        <ProgressBar
          percent={((totalSeconds - timeRemaining) / totalSeconds) * 100}
          barClassName="bg-gradient-to-r from-blue-500 to-purple-500"
          label={`${mode === 'focus' ? 'Focus' : 'Break'} session progress`}
        />

        {mode === 'focus' && (
          <p className="text-sm text-text-secondary">Complete this session to earn {25} tokens</p>
        )}
        {completionError && (
          <div
            role="alert"
            className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100"
          >
            <p>{completionError}</p>
            <button
              type="button"
              className="mt-2 min-h-[44px] px-3 underline disabled:opacity-50"
              disabled={completionInFlightRef.current}
              onClick={() => {
                if (pendingFocusSession) void persistCompletedFocusSession(pendingFocusSession);
                else handleComplete();
              }}
            >
              Retry saving session
            </button>
          </div>
        )}

        <audio
          ref={audioRef}
          src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGK0fPTgjMGHm7A7+OZUQ4MW6zo7bBgGws+ltryxnMpBSx+zPLaizsIGGS57OihUhELTqXh8LRnHwU2jdXzzn0vBSV3yPDcjj4KE12z6OuyYBoKPpbY8sV0KgUqfsrz2Yk2Bxhlue3oolIRC06k4fG2aCAFNo3V88t9LgUldsny3I0+ChRemOjqtmMcBjiP1vLFdSkEKn7K89qLOwcYZLjt6KNSEQtNpOHxt2ohBTWL1PLJfiwGJHfJ89yOPgoTXrTo67ZjHAU4jtbyxnUpBCp+yvPaizsFGGS47OikUREKTaPi8LdpIQU2i9Tyx3wsBSR3yfPcjz4KE1206uuzYx0FOI7V8sV1KQQqfsnz24s6Bhlkue3ooldCAw=="
          preload="auto"
        />
      </div>
    </div>
  );
};

export default FocusTimer;
