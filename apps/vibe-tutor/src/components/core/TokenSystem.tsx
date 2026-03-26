import { BLAKE_CONFIG } from '@/config';
import { animated, config, useSpring } from '@react-spring/web';
import confetti from 'canvas-confetti';
import React, { useEffect, useState } from 'react';

interface TokenSystemProps {
  currentTokens: number;
  onTokensUpdate?: (tokens: number) => void;
}

/**
 * Blake's Token System - Visual, rewarding, and motivating!
 * Shows tokens like Roblox currency with animations and effects
 */
export const TokenSystem = ({ currentTokens, onTokensUpdate }: TokenSystemProps) => {
  const [tokens, setTokens] = useState(currentTokens);
  const [showRewardPreview, setShowRewardPreview] = useState(false);
  const [recentEarnings, setRecentEarnings] = useState<number[]>([]);

  // Animate token counter
  const tokenAnimation = useSpring({
    from: { number: 0 },
    to: { number: tokens },
    config: { tension: 280, friction: 60 },
  });

  // Pulse animation for token display
  const pulseAnimation = useSpring({
    from: { scale: 1, glow: '0 0 10px rgba(0, 255, 0, 0.5)' },
    to: async (next) => {
      while (true) {
        await next({ scale: 1.05, glow: '0 0 20px rgba(0, 255, 0, 0.8)' });
        await next({ scale: 1, glow: '0 0 10px rgba(0, 255, 0, 0.5)' });
      }
    },
    config: config.slow,
  });

  // Find next reward
  const nextReward = BLAKE_CONFIG.rewards.find((r) => r.pointsRequired > tokens);
  const allRewards = BLAKE_CONFIG.rewards;
  const earnedRewards = allRewards.filter((r) => r.pointsRequired <= tokens);

  // Progress to next reward
  const progress = nextReward ? ((tokens % 100) / nextReward.pointsRequired) * 100 : 100;

  // Add tokens with animation
  const addTokens = (amount: number, reason: string = 'Task Complete!') => {
    setTokens((prev) => {
      const newTotal = prev + amount;

      // Show earning animation
      setRecentEarnings((prev) => [...prev, amount]);
      setTimeout(() => {
        setRecentEarnings((prev) => prev.slice(1));
      }, 3000);

      // Fire confetti for big earnings
      if (amount >= 50) {
                void confetti({
          particleCount: amount,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00FF00', '#FFD700', '#FF0000'],
        });
      }

      // Check for reward unlocks
      const wasUnlocked = earnedRewards.length;
      const nowUnlocked = allRewards.filter((r) => r.pointsRequired <= newTotal).length;

      if (nowUnlocked > wasUnlocked) {
        celebrateRewardUnlock();
      }

      onTokensUpdate?.(newTotal);
      return newTotal;
    });

    // Show notification
    showEarningNotification(amount, reason);
  };

  // Celebrate reward unlock
  const celebrateRewardUnlock = () => {
    // Epic confetti burst
    const duration = 3000;
    const end = Date.now() + duration;

    (function frame() {
              void confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD700'],
      });
              void confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FFD700'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

  // Show earning notification
  const showEarningNotification = (amount: number, reason: string) => {
    const notification = document.createElement('div');
    notification.className = 'token-earn-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(135deg, #00FF00, #00AA00);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        font-size: 20px;
        font-weight: bold;
        box-shadow: 0 10px 30px rgba(0, 255, 0, 0.5);
        animation: slideInRight 0.5s ease-out;
        z-index: 9999;
      ">
        <div>+${amount} 💎 Tokens!</div>
        <div style="font-size: 14px; opacity: 0.9;">${reason}</div>
      </div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.5s ease-out';
      setTimeout(() => notification.remove(), 500);
    }, 2500);
  };

  // Simulate earning tokens (for testing)
  useEffect(() => {
    // Example: Add tokens every time Blake completes something
    window.addBlakeTokens = addTokens;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="token-system glass-card p-6">
      {/* Main Token Display */}
      <animated.div
        className="token-display text-center mb-6"
        style={{
          transform: pulseAnimation.scale.to((s) => `scale(${s})`),
          boxShadow: pulseAnimation.glow,
        }}
      >
        <div
          className="text-6xl font-bold mb-2"
          style={{
            background: 'linear-gradient(135deg, #00FF00, #FFD700)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          <animated.span>{tokenAnimation.number.to((n) => `💎 ${Math.floor(n)}`)}</animated.span>
        </div>
        <div className="text-xl text-gray-300">Blake's Tokens</div>
      </animated.div>

      {/* Recent Earnings Animation */}
      {recentEarnings.map((amount, index) => (
        <animated.div
          key={index}
          className="recent-earning absolute text-3xl font-bold text-fuchsia-400"
          style={{
            animation: 'floatUp 3s ease-out',
            right: '50%',
            bottom: '50%',
          }}
        >
          +{amount} 💎
        </animated.div>
      ))}

      {/* Next Reward Progress */}
      {nextReward && (
        <div className="next-reward mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{nextReward.icon}</span>
              <div>
                <div className="font-bold text-white">Next: {nextReward.name}</div>
                <div className="text-sm text-gray-400">
                  {nextReward.pointsRequired - tokens} tokens to go!
                </div>
              </div>
            </div>
            <div className="text-xl font-bold text-cyan-400">{Math.round(progress)}%</div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
            <animated.div
              className="h-full bg-gradient-to-r from-fuchsia-400 to-cyan-400"
              style={{
                width: `${progress}%`,
                transition: 'width 0.5s ease-out',
              }}
            >
              <div className="h-full bg-white/20 animate-pulse" />
            </animated.div>
          </div>
        </div>
      )}

      {/* Available Rewards */}
      <div className="rewards-preview">
        <button
          onClick={() => setShowRewardPreview(!showRewardPreview)}
          className="w-full glass-button mb-4 py-2 px-4 flex items-center justify-between"
        >
          <span>🎁 View Rewards Shop</span>
          <span className="text-yellow-400">{earnedRewards.length} Available!</span>
        </button>

        {showRewardPreview && (
          <div className="rewards-grid grid grid-cols-2 gap-4 mt-4">
            {allRewards.map((reward) => {
              const canAfford = tokens >= reward.pointsRequired;
              const isNext = reward === nextReward;

              return (
                <div
                  key={reward.id}
                  className={`reward-card p-4 rounded-lg transition-all ${
                    canAfford
                      ? 'bg-violet-900/50 border-2 border-violet-400 hover:scale-105 cursor-pointer'
                      : isNext
                        ? 'bg-gray-800/50 border-2 border-yellow-400'
                        : 'bg-gray-900/50 opacity-50'
                  }`}
                >
                  <div className="text-3xl text-center mb-2">{reward.icon}</div>
                  <div className="font-bold text-sm">{reward.name}</div>
                  <div className="text-xs text-gray-400 mb-2">{reward.description}</div>
                  <div
                    className={`text-center font-bold ${
                      canAfford ? 'text-fuchsia-400' : 'text-gray-500'
                    }`}
                  >
                    💎 {reward.pointsRequired}
                  </div>
                  {canAfford && (
                    <button className="w-full mt-2 py-1 px-2 bg-violet-600 hover:bg-violet-500 rounded text-xs font-bold">
                      CLAIM!
                    </button>
                  )}
                  {isNext && (
                    <div className="text-xs text-center mt-2 text-yellow-400">Next Goal!</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Token Multipliers Info */}
      <div className="multipliers mt-6 p-4 bg-purple-900/30 rounded-lg">
        <div className="text-sm font-bold text-purple-400 mb-2">🎮 Active Multipliers</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Perfect Score</span>
            <span className="text-fuchsia-400">2.0x</span>
          </div>
          <div className="flex justify-between">
            <span>Good Work</span>
            <span className="text-blue-400">1.5x</span>
          </div>
          <div className="flex justify-between">
            <span>Streak Bonus</span>
            <span className="text-orange-400">+10/day</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions mt-6 grid grid-cols-3 gap-2">
        <button
          onClick={() => addTokens(10, 'Test Bonus!')}
          className="glass-button py-2 px-3 text-xs"
        >
          +10 Test
        </button>
        <button
          onClick={() => addTokens(50, 'Achievement!')}
          className="glass-button py-2 px-3 text-xs"
        >
          +50 Test
        </button>
        <button
          onClick={() => addTokens(100, 'Epic Win!')}
          className="glass-button py-2 px-3 text-xs"
        >
          +100 Test
        </button>
      </div>
    </div>
  );
};

// Add styles
const styles = `
@keyframes floatUp {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-100px) scale(1.5);
  }
}

@keyframes slideInRight {
  from {
    transform: translateX(100px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOutRight {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100px);
    opacity: 0;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default TokenSystem;