import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseCountdownTimerOptions {
  /** Total duration in seconds */
  initialSeconds: number;
  /** Called when countdown reaches zero */
  onComplete?: () => void;
  /** Called on each tick with seconds remaining */
  onTick?: (secondsRemaining: number) => void;
  /** Whether the timer starts immediately on mount */
  autoStart?: boolean;
}

export interface UseCountdownTimerReturn {
  /** Current time remaining in seconds */
  timeRemaining: number;
  /** Timer is actively counting down */
  isRunning: boolean;
  /** Timer is paused mid-countdown */
  isPaused: boolean;
  /** Start or resume the countdown */
  start: () => void;
  /** Pause the countdown */
  pause: () => void;
  /**
   * Stop and reset to initial duration, or to a new duration if provided.
   * Clears the interval immediately without waiting for the next render.
   */
  reset: (newDuration?: number) => void;
}

/**
 * Wall-clock-corrected countdown timer hook.
 *
 * Stores a target timestamp rather than decrementing state on each tick,
 * so JS timer jitter does not accumulate into visible drift over long sessions.
 *
 * @example
 * const { timeRemaining, isRunning, start, pause, reset } = useCountdownTimer({
 *   initialSeconds: 25 * 60,
 *   onComplete: handleSessionEnd,
 * });
 * const minutes = Math.floor(timeRemaining / 60);
 * const seconds = timeRemaining % 60;
 */
export function useCountdownTimer({
  initialSeconds,
  onComplete,
  onTick,
  autoStart = false,
}: UseCountdownTimerOptions): UseCountdownTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isPaused, setIsPaused] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Wall-clock deadline: Date.now() + remaining * 1000 while running. */
  const targetTimeRef = useRef<number>(
    autoStart ? Date.now() + initialSeconds * 1000 : 0,
  );
  /**
   * Mirrors timeRemaining state so callbacks can read the current value
   * without introducing stale closures in useCallback dependencies.
   */
  const timeRemainingRef = useRef(initialSeconds);

  // Keep the latest callback versions in refs so the interval never holds stale closures.
  // This lets callers change onComplete/onTick without restarting the interval.
  const onCompleteRef = useRef(onComplete);
  const onTickRef = useRef(onTick);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onTickRef.current = onTick; }, [onTick]);

  const clearTick = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    targetTimeRef.current = Date.now() + timeRemainingRef.current * 1000;
    setIsRunning(true);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    clearTick();
    setIsRunning(false);
    setIsPaused(true);
  }, [clearTick]);

  const reset = useCallback((newDuration?: number) => {
    clearTick();
    const dur = newDuration ?? initialSeconds;
    timeRemainingRef.current = dur;
    setTimeRemaining(dur);
    setIsRunning(false);
    setIsPaused(false);
    targetTimeRef.current = 0;
  }, [clearTick, initialSeconds]);

  useEffect(() => {
    if (!isRunning || isPaused) {
      clearTick();
      return;
    }

    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((targetTimeRef.current - Date.now()) / 1000));
      timeRemainingRef.current = remaining;
      setTimeRemaining(remaining);
      onTickRef.current?.(remaining);

      if (remaining === 0) {
        clearTick();
        setIsRunning(false);
        onCompleteRef.current?.();
      }
    }, 1000);

    return clearTick;
  }, [isRunning, isPaused, clearTick]);

  return { timeRemaining, isRunning, isPaused, start, pause, reset };
}
