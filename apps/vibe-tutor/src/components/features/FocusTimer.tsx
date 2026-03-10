import { Clock, Pause, Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { triggerVibration } from '../../services/uiService';
import type { FocusSession } from '../../types';
import ProgressBar from '../ui/ProgressBar';

import { appStore } from '../../utils/electronStore';

interface FocusTimerProps {
  onSessionComplete?: (minutes: number) => void;
}

const FocusTimer = ({ onSessionComplete }: FocusTimerProps) => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleComplete = useCallback(() => {
    setIsActive(false);

    // Get sensory preferences
    const sensoryPrefs = appStore.get<Record<string, unknown>>('sensory-prefs') ?? {};

    // Play sound if enabled
    if (sensoryPrefs.soundEnabled !== false && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }

    // Vibrate if enabled
    if (sensoryPrefs.hapticEnabled !== false) {
      triggerVibration([200, 100, 200]);
    }

    // Award points if focus session
    if (mode === 'focus') {
      const sessionMinutes = 25;
      const pointsEarned = sessionMinutes; // 1 point per minute

      // Update points in localStorage (App.tsx reads from here)
      const currentPoints = Number(appStore.get('studentPoints') ?? '0');
      appStore.set('studentPoints', String(currentPoints + pointsEarned));

      // Notify parent component
      onSessionComplete?.(sessionMinutes);

      // Save session history
      const sessions: FocusSession[] = appStore.get<FocusSession[]>('focusSessions') ?? [];
      sessions.push({
        id: `session_${Date.now()}`,
        startTime: Date.now() - sessionMinutes * 60 * 1000,
        endTime: Date.now(),
        duration: sessionMinutes,
        completed: true,
      });
      appStore.set('focusSessions', JSON.stringify(sessions));

      // Switch to break
      setMode('break');
      setMinutes(5);
    } else {
      // Switch back to focus
      setMode('focus');
      setMinutes(25);
    }

    setSeconds(0);
  }, [mode, onSessionComplete]);

  useEffect(() => {
    let interval: number;

    if (isActive && (minutes > 0 || seconds > 0)) {
      interval = window.setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            handleComplete();
          } else {
            setMinutes((m) => m - 1);
            setSeconds(59);
          }
        } else {
          setSeconds((s) => s - 1);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, minutes, seconds, handleComplete]);

  const toggle = () => setIsActive(!isActive);
  const reset = () => {
    setIsActive(false);
    setMinutes(mode === 'focus' ? 25 : 5);
    setSeconds(0);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background-main via-background-main to-surface-dark">
      <div className="glass-card p-8 text-center space-y-6 max-w-md w-full">
        <div className="flex items-center justify-center gap-3">
          <Clock size={32} className={mode === 'focus' ? 'text-blue-400' : 'text-green-400'} />
          <h2 className="text-2xl font-bold">{mode === 'focus' ? 'Focus Time' : 'Break Time'}</h2>
        </div>

        {/* Big Timer */}
        <div className="text-7xl font-bold tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-accent)] to-[var(--secondary-accent)]">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>

        {/* Controls */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={toggle}
            className="p-4 bg-[var(--primary-accent)] hover:bg-[var(--primary-accent)]/80 rounded-full transition-all hover:scale-110"
            aria-label={isActive ? 'Pause timer' : 'Start timer'}
          >
            {isActive ? <Pause size={28} /> : <Play size={28} />}
          </button>
          <button
            onClick={reset}
            className="p-4 bg-surface-lighter hover:bg-surface-light rounded-full transition-all hover:scale-110"
            aria-label="Reset timer"
          >
            <RotateCcw size={28} />
          </button>
        </div>

        {/* Progress Bar */}
        <ProgressBar
          percent={
            (((mode === 'focus' ? 25 : 5) - minutes - seconds / 60) / (mode === 'focus' ? 25 : 5)) *
            100
          }
          barClassName="bg-gradient-to-r from-blue-500 to-purple-500"
          label={`${mode === 'focus' ? 'Focus' : 'Break'} session progress`}
        />

        {mode === 'focus' && (
          <p className="text-sm text-text-secondary">Complete this session to earn {25} points</p>
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
