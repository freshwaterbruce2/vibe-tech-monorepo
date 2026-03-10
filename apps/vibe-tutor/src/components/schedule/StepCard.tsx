import { CheckCircle2, ChevronDown, ChevronUp, Circle, Pause, Play, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ScheduleStep } from '../../types/schedule';

interface StepCardProps {
  step: ScheduleStep;
  stepNumber: number;
  isActive: boolean;
  onToggle: () => void;
  onStart: () => void;
}

export const StepCard = ({
  step,
  stepNumber,
  isActive,
  onToggle,
  onStart,
}: StepCardProps) => {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (timerRunning && timeRemaining !== null && timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null) return prev;
          if (prev <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [timerRunning, timeRemaining]);

  const handleStartTimer = () => {
    if (step.estimatedMinutes) {
      setTimeRemaining(step.estimatedMinutes * 60);
      setTimerRunning(true);
      onStart();
    }
  };

  const handleToggleTimer = () => {
    setTimerRunning(prev => !prev);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isCompleted = step.status === 'completed';

  return (
    <div
      className={`glass-card p-4 transition-all ${
        isActive ? 'ring-2 ring-cyan-500' : ''
      } ${isCompleted ? 'bg-green-600/10' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className="flex-shrink-0 mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-full"
        >
          {isCompleted ? (
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          ) : (
            <Circle className="w-6 h-6 text-white/40 hover:text-white/70 transition-colors" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4
                className={`font-semibold ${
                  isCompleted ? 'text-green-300 line-through' : 'text-white'
                }`}
              >
                {stepNumber}. {step.title}
              </h4>
              {step.description && (
                <p className="text-sm text-white/60 mt-1">{step.description}</p>
              )}
            </div>

            {/* Timer badge */}
            {step.estimatedMinutes && (
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-600/30 rounded text-xs text-white/80">
                <Timer className="w-3 h-3" />
                {step.estimatedMinutes}m
              </div>
            )}
          </div>

          {/* Timer controls */}
          {step.estimatedMinutes && !isCompleted && (
            <div className="mt-3 space-y-2">
              {timeRemaining === null ? (
                <button
                  onClick={handleStartTimer}
                  className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Start Timer
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-2xl font-mono font-bold text-cyan-400">
                      {formatTime(timeRemaining)}
                    </div>
                    <div className="h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-1000"
                        style={{
                          width: `${
                            (((step.estimatedMinutes ?? 0) * 60 - timeRemaining) /
                              ((step.estimatedMinutes ?? 1) * 60)) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleToggleTimer}
                    className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    {timerRunning ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Microsteps (collapsible) */}
          {step.microsteps && step.microsteps.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setExpanded(prev => !prev)}
                className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {step.microsteps.length} sub-steps
              </button>
              {expanded && (
                <ul className="mt-2 space-y-1 pl-4 border-l-2 border-purple-600/30">
                  {step.microsteps.map((microstep, idx) => (
                    <li key={idx} className="text-sm text-white/70 flex items-start gap-2">
                      <span className="text-purple-400 flex-shrink-0">•</span>
                      <span>{microstep}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
