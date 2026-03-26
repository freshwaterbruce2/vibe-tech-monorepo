/**
 * Visual Timer Component for Brain Games
 * Optimized for neurodivergent learners (ADHD/autism)
 *
 * Features:
 * - Color-coded countdown (green → yellow → red)
 * - Visual progress bar
 * - Pause/resume functionality for regulation breaks
 * - Optional gentle audio alerts (sensory-aware)
 * - Time remaining announcements (accessibility)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface VisualTimerProps {
  /** Total duration in seconds */
  duration: number;

  /** Callback when timer completes */
  onComplete?: () => void;

  /** Callback on each tick (optional for parent tracking) */
  onTick?: (secondsRemaining: number) => void;

  /** Whether timer starts automatically */
  autoStart?: boolean;

  /** Whether to show pause button (allows breaks) */
  allowPause?: boolean;

  /** Whether to enable sound alerts */
  soundEnabled?: boolean;

  /** Warning threshold in seconds (turns yellow) */
  warningThreshold?: number;

  /** Critical threshold in seconds (turns red) */
  criticalThreshold?: number;
}

export const VisualTimer = ({
  duration,
  onComplete,
  onTick,
  autoStart = false,
  allowPause = true,
  soundEnabled = false,
  warningThreshold = 60,
  criticalThreshold = 30,
}: VisualTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isPaused, setIsPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(soundEnabled);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const targetTimeRef = useRef<number>(0);

  // Initialize target time if autoStart is true
  useEffect(() => {
    if (autoStart && targetTimeRef.current === 0) {
      targetTimeRef.current = Date.now() + duration * 1000;
    }
  }, [autoStart, duration]);

  // Calculate time color based on remaining time
  const getTimeColor = (): string => {
    if (timeRemaining <= criticalThreshold) {
      return 'text-red-400';
    } else if (timeRemaining <= warningThreshold) {
      return 'text-yellow-400';
    }
    return 'text-fuchsia-400';
  };

  // Calculate progress bar color
  const getProgressColor = (): string => {
    if (timeRemaining <= criticalThreshold) {
      return 'bg-red-500';
    } else if (timeRemaining <= warningThreshold) {
      return 'bg-yellow-500';
    }
    return 'bg-fuchsia-500';
  };

  // Calculate progress percentage
  const getProgressPercentage = (): number => {
    return (timeRemaining / duration) * 100;
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Play gentle beep sound (simple tone)
  const playBeep = useCallback((frequency = 440, beepDuration = 200) => {
    if (!soundOn) return;

    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      // Gentle volume
      gainNode.gain.value = 0.1;

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + beepDuration / 1000);
    } catch (error) {
      console.warn('[VisualTimer] Audio playback not supported:', error);
    }
  }, [soundOn]);

  // Start timer
  const start = () => {
    setIsRunning(true);
    setIsPaused(false);
    targetTimeRef.current = Date.now() + timeRemaining * 1000;
  };

  // Pause timer
  const pause = () => {
    setIsPaused(true);
    setIsRunning(false);
  };

  // Reset timer
  const reset = () => {
    setTimeRemaining(duration);
    setIsRunning(false);
    setIsPaused(false);
    targetTimeRef.current = Date.now() + duration * 1000;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Timer effect
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((targetTimeRef.current - now) / 1000));

        setTimeRemaining(remaining);

        // Call tick callback
        if (onTick) {
          onTick(remaining);
        }

        // Sound alerts
        if (soundOn) {
          if (remaining === criticalThreshold) {
            playBeep(440, 300); // Warning beep
          } else if (remaining === 10 || remaining === 5 || remaining === 3) {
            playBeep(600, 150); // Countdown beeps
          }
        }

        // Timer complete
        if (remaining === 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          setIsRunning(false);

          if (soundOn) {
            // Completion tone (3 ascending beeps)
            setTimeout(() => playBeep(440, 200), 0);
            setTimeout(() => playBeep(554, 200), 250);
            setTimeout(() => playBeep(659, 300), 500);
          }

          if (onComplete) {
            onComplete();
          }
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isPaused, timeRemaining, criticalThreshold, onComplete, onTick, playBeep, soundOn]);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
      {/* Timer Display */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Clock className={`w-6 h-6 ${getTimeColor()}`} />
          <h3 className="text-lg font-semibold text-gray-200">Time Remaining</h3>
        </div>

        <div className={`text-6xl font-bold ${getTimeColor()} transition-colors duration-300`}>
          {formatTime(timeRemaining)}
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-4 w-full h-4 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-1000 ease-linear`}
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>

        {/* Progress Percentage */}
        <p className="text-sm text-gray-400 mt-2">
          {Math.round(getProgressPercentage())}% remaining
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {!isRunning && timeRemaining === duration && (
          <button
            onClick={start}
            className="px-6 py-3 bg-fuchsia-500 hover:bg-violet-600 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            Start
          </button>
        )}

        {isRunning && !isPaused && allowPause && (
          <button
            onClick={pause}
            className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
          >
            <Pause className="w-5 h-5" />
            Pause
          </button>
        )}

        {isPaused && (
          <button
            onClick={start}
            className="px-6 py-3 bg-fuchsia-500 hover:bg-violet-600 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            Resume
          </button>
        )}

        {(isRunning || isPaused || timeRemaining !== duration) && (
          <button
            onClick={reset}
            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Reset
          </button>
        )}

        {/* Sound Toggle */}
        <button
          onClick={() => setSoundOn(!soundOn)}
          className={`p-3 rounded-xl transition-all ${
            soundOn
              ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
              : 'bg-white/5 border-white/10 text-gray-400'
          } border`}
          title={soundOn ? 'Sound alerts on' : 'Sound alerts off'}
        >
          {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* Status Messages */}
      {timeRemaining === 0 && (
        <div className="text-center p-3 bg-fuchsia-500/20 border border-fuchsia-500/40 rounded-xl">
          <p className="text-fuchsia-300 font-semibold">⏰ Time's up! Great job!</p>
        </div>
      )}

      {isPaused && (
        <div className="text-center p-3 bg-yellow-500/20 border border-yellow-500/40 rounded-xl">
          <p className="text-yellow-300 text-sm">
            ⏸️ Paused - Take a break if you need to!
          </p>
        </div>
      )}

      {isRunning && timeRemaining <= criticalThreshold && timeRemaining > 0 && (
        <div className="text-center p-3 bg-red-500/20 border border-red-500/40 rounded-xl animate-pulse">
          <p className="text-red-300 font-semibold">⚠️ Almost out of time!</p>
        </div>
      )}

      {isRunning && timeRemaining <= warningThreshold && timeRemaining > criticalThreshold && (
        <div className="text-center p-3 bg-yellow-500/20 border border-yellow-500/40 rounded-xl">
          <p className="text-yellow-300 text-sm">⏳ Less than a minute left!</p>
        </div>
      )}
    </div>
  );
};

export default VisualTimer;
