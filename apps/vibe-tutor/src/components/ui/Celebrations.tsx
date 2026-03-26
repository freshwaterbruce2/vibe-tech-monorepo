import { animated, useSpring } from '@react-spring/web';
import confetti from 'canvas-confetti';
import React, { useEffect, useTransition } from 'react';
import { dataStore } from '../../services/dataStore';
import { playSoundEffect } from '../../services/soundEffects';

interface CelebrationProps {
  type: 'taskComplete' | 'pointGain' | 'levelUp' | 'badgeUnlock' | 'streakMilestone';
  points?: number;
  message?: string;
  onComplete?: () => void;
}

/**
 * Celebration Component - ABCya-style interactive animations
 * Provides positive reinforcement for ADHD/autism users
 * Respects sensory settings for animation control
 */
export const Celebration = ({ type, points, message, onComplete }: CelebrationProps) => {
  const [animationEnabled, setAnimationEnabled] = React.useState(true);
  const [visible, setVisible] = React.useState(true);
  const [_isPending, startTransition] = useTransition();

  // Load sensory preferences from dataStore
  useEffect(() => {
    startTransition(async () => {
      try {
        const prefs = await dataStore.getSensoryPreferences();
        if (prefs) {
          const { animationSpeed } = prefs;
          setAnimationEnabled(animationSpeed !== 'none');
        }
      } catch (error) {
        console.error('Could not load animation preferences:', error);
      }
    });
  }, []);

  // Trigger celebration effects
  useEffect(() => {
    if (!animationEnabled) {
      onComplete?.();
      return;
    }

    // Play sound effect
    playSoundEffect(type);

    // Trigger confetti based on type
    switch (type) {
      case 'taskComplete':
        fireConfetti({ particleCount: 50, spread: 60 });
        break;
      case 'pointGain':
        fireConfetti({ particleCount: 30, spread: 40, colors: ['#22D3EE', '#ec4899'] });
        break;
      case 'levelUp':
        fireLevelUpAnimation();
        break;
      case 'badgeUnlock':
        fireBadgeAnimation();
        break;
      case 'streakMilestone':
        fireStreakAnimation();
        break;
    }

    // Auto-complete after animation
    const timeout = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [type, animationEnabled, onComplete]);

  // Spring animation for popup
  const popupAnimation = useSpring({
    from: { opacity: 0, transform: 'scale(0.5) translateY(50px)' },
    to: visible
      ? { opacity: 1, transform: 'scale(1) translateY(0px)' }
      : { opacity: 0, transform: 'scale(0.9) translateY(-20px)' },
    config: { tension: 300, friction: 20 },
  });

  if (!animationEnabled || !visible) return null;

  return (
    <animated.div
      style={popupAnimation}
      className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
    >
      <div className="glass-card p-8 max-w-md mx-4 pointer-events-auto animate-pulse-glow">
        {type === 'taskComplete' && (
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce">✓</div>
            <h2 className="text-2xl font-bold neon-text-primary">Task Complete!</h2>
            {points && <p className="text-lg mt-2 text-cyan-400">+{points} points</p>}
          </div>
        )}

        {type === 'pointGain' && points && (
          <div className="text-center">
            <div className="text-6xl mb-4 animate-spin">🌟</div>
            <h2 className="text-3xl font-bold neon-text-primary">+{points}</h2>
            <p className="text-lg mt-2 text-cyan-300">Points Earned!</p>
          </div>
        )}

        {type === 'levelUp' && (
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-2xl font-bold neon-text-primary">Level Up!</h2>
            {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty message needs fallback */}
            <p className="text-lg mt-2 text-pink-400">{message || "You're on fire! 🔥"}</p>
          </div>
        )}

        {type === 'badgeUnlock' && (
          <div className="text-center">
            <div className="text-6xl mb-4 animate-pulse">🏆</div>
            <h2 className="text-2xl font-bold neon-text-primary">Badge Unlocked!</h2>
            {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty message needs fallback */}
            <p className="text-lg mt-2 text-yellow-400">{message || 'Amazing achievement!'}</p>
          </div>
        )}

        {type === 'streakMilestone' && (
          <div className="text-center">
            <div className="text-6xl mb-4 animate-pulse">🔥</div>
            <h2 className="text-2xl font-bold neon-text-primary">Streak Milestone!</h2>
            {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty message needs fallback */}
            <p className="text-lg mt-2 text-orange-400">{message || 'Keep the momentum going!'}</p>
          </div>
        )}
      </div>
    </animated.div>
  );
};

// Confetti helper functions
function fireConfetti(options: confetti.Options = {}) {
  const defaults: confetti.Options = {
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#22D3EE', '#38BDF8', '#FF5FD2', '#FBBF24', '#ec4899'],
  };

  void confetti({
    ...defaults,
    ...options,
  });
}

// Special animation for level up
function fireLevelUpAnimation() {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval: NodeJS.Timeout = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // Shoot confetti from both sides
    void confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    });
    void confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    });
  }, 250);
}

// Badge unlock animation
function fireBadgeAnimation() {
  void confetti({
    particleCount: 100,
    startVelocity: 40,
    spread: 100,
    origin: { y: 0.5 },
    colors: ['#FFD700', '#FFA500', '#FF6347'],
    shapes: ['star'],
  });
}

// Streak milestone animation
function fireStreakAnimation() {
  const end = Date.now() + 2 * 1000;
  const colors = ['#FF4500', '#FF6347', '#FFD700'];

  (function frame() {
    void confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors,
    });
    void confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

export default Celebration;
