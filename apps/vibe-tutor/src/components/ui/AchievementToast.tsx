import { Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Achievement } from '../../types';

interface AchievementToastProps {
  achievement: Achievement | null;
  bonusPoints: number;
  onClose: () => void;
}

interface ConfettiPiece {
  id: number;
  left: string;
  animationDelay: string;
  backgroundColor: string;
}

const AchievementToast = ({ achievement, bonusPoints, onClose }: AchievementToastProps) => {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const Icon = achievement?.icon ?? Trophy;

  useEffect(() => {
    if (!achievement) {
      return;
    }

    // Generate confetti only on client side after mount
    const pieces = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 0.5}s`,
      backgroundColor: ['#FFD700', '#FFA500', '#FF69B4', '#00CED1'][Math.floor(Math.random() * 4)]!,
    }));
    const confettiTimer = setTimeout(() => {
      setConfetti(pieces);
    }, 0);

    const timer = setTimeout(onClose, 4000);
    return () => {
      clearTimeout(confettiTimer);
      clearTimeout(timer);
    };
  }, [achievement, onClose]);

  if (!achievement) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className="glass-card p-4 border-2 border-yellow-400/50 bg-gradient-to-r from-yellow-500/20 to-purple-500/20 shadow-[0_0_20px_rgba(255,215,0,0.3)] relative overflow-hidden">
        {/* Confetti Effect */}
        <div className="absolute inset-0 pointer-events-none">
          {confetti.map((piece) => (
            <div
              key={piece.id}
              className="confetti"
              style={{
                left: piece.left,
                animationDelay: piece.animationDelay,
                backgroundColor: piece.backgroundColor,
              }}
            />
          ))}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-yellow-900 hover:text-yellow-950 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="flex items-center gap-4">
          {/* Achievement Icon */}
          <div className="w-16 h-16 rounded-full bg-yellow-400/30 flex items-center justify-center flex-shrink-0 animate-bounce-slow">
            <Icon className="w-10 h-10 text-yellow-900" />
          </div>

          {/* Achievement Info */}
          <div className="flex-1">
            <div className="text-sm font-semibold text-yellow-900 mb-1">Achievement Unlocked!</div>
            <div className="text-xl font-bold text-yellow-950">{achievement.name}</div>
            <div className="text-sm text-yellow-800 mt-1">{achievement.description}</div>
            {bonusPoints > 0 && (
              <div className="text-lg font-bold text-yellow-950 mt-2 flex items-center gap-1">
                <span>+{bonusPoints}</span>
                <span className="text-sm">points</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-down {
          0% {
            transform: translate(-50%, -100px);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(300px) rotate(360deg);
            opacity: 0;
          }
        }

        .animate-slide-down {
          animation: slide-down 0.5s ease-out forwards;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .confetti-container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
        }

        .confetti {
          position: absolute;
          width: 8px;
          height: 8px;
          top: -10px;
          animation: confetti-fall 3s linear forwards;
        }
      `}</style>
    </div>
  );
};

export default AchievementToast;
