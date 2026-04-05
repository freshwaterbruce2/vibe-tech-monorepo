import { BLAKE_CONFIG, getMotivation, getWelcomeMessage } from '@/config';
import React, { useEffect, useState } from 'react';

interface BlakeWelcomeProps {
  points: number;
  streak: number;
  onClose: () => void;
}

/**
 * Blake's Personalized Welcome Screen
 * Shows every time Blake opens the app with gaming-themed motivation
 */
export const BlakeWelcome = ({ points, streak, onClose }: BlakeWelcomeProps) => {
  const [welcomeMessage] = useState(() => getWelcomeMessage());
  const [motivation] = useState(() => getMotivation());
  const [dailyChallenge] = useState<{ task: string; reward: number } | null>(() => {
    const challenges = BLAKE_CONFIG.dailyChallenges;
    if (challenges.length === 0) return null;
    return challenges[Math.floor(Math.random() * challenges.length)] ?? null;
  });
  const [showAnimation, setShowAnimation] = useState(true);

  useEffect(() => {
    // Auto-close after 5 seconds (ADHD-friendly quick interaction)
    const timer = setTimeout(() => {
      setShowAnimation(false);
      setTimeout(onClose, 500);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  // Calculate progress to next reward
  const nextReward = BLAKE_CONFIG.rewards.find((r) => r.pointsRequired > points);
  const pointsToNext = nextReward ? nextReward.pointsRequired - points : 0;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 transition-opacity duration-500 ${showAnimation ? 'opacity-100' : 'opacity-0'}`}
    >
      <div
        className="glass-card p-8 max-w-2xl mx-4 transform transition-all duration-500"
        style={{
          animation: 'slideInUp 0.5s ease-out',
          background: 'linear-gradient(135deg, #00FF00 0%, #FF0000 100%)',
          backgroundBlendMode: 'overlay',
        }}
      >
        {/* Blake's Avatar and Name */}
        <div className="text-center mb-6">
          <div className="text-8xl mb-4 animate-bounce">{BLAKE_CONFIG.avatar}</div>
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">{welcomeMessage}</h1>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-black/30 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">💎 {points}</div>
            <div className="text-sm text-white/80">Total Points</div>
          </div>

          <div className="bg-black/30 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-orange-400">🔥 {streak}</div>
            <div className="text-sm text-white/80">Day Streak</div>
          </div>

          <div className="bg-black/30 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-fuchsia-400">🎯 {pointsToNext}</div>
            <div className="text-sm text-white/80">To Next Reward</div>
          </div>
        </div>

        {/* Daily Challenge */}
        {dailyChallenge && (
          <div className="bg-white/20 rounded-lg p-4 mb-6 border-2 border-yellow-400">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-yellow-400">⚡ Daily Challenge</div>
                <div className="text-white">{dailyChallenge.task}</div>
              </div>
              <div className="text-2xl font-bold text-fuchsia-400">+{dailyChallenge.reward} pts</div>
            </div>
          </div>
        )}

        {/* Motivation Message */}
        <div className="text-center text-xl text-white mb-6 italic">"{motivation}"</div>

        {/* Next Reward Preview */}
        {nextReward && (
          <div className="bg-gradient-to-r from-purple-500/30 to-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{nextReward.icon}</span>
                <div>
                  <div className="text-lg font-bold text-white">Next: {nextReward.name}</div>
                  <div className="text-sm text-white/80">{nextReward.description}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[var(--success-accent)]">{pointsToNext} pts</div>
                <div className="text-sm text-white/60">to go!</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 bg-black/30 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-fuchsia-400 to-purple-400 transition-all duration-500"
                style={{
                  width: `${Math.min(100, ((points % 100) / nextReward.pointsRequired) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={onClose}
            className="glass-button px-8 py-3 text-lg font-bold hover:scale-110 transition-transform"
            style={{
              background: 'linear-gradient(135deg, #00FF00, #00AA00)',
            }}
          >
            Let's Go! 🚀
          </button>
        </div>

        {/* Fun Roblox-style decorations */}
        <div className="absolute -top-10 -left-10 text-6xl animate-spin-slow opacity-20">⚙️</div>
        <div className="absolute -bottom-10 -right-10 text-6xl animate-spin-slow opacity-20">
          ⚙️
        </div>
        <div className="absolute top-10 right-10 text-4xl animate-pulse opacity-30">💎</div>
        <div className="absolute bottom-10 left-10 text-4xl animate-pulse opacity-30">🎮</div>
      </div>
    </div>
  );
};

export default BlakeWelcome;

// Add custom animations to your CSS
const styles = `
@keyframes slideInUp {
  from {
    transform: translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes spin-slow {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin-slow {
  animation: spin-slow 10s linear infinite;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
