/**
 * Celebration Effect Component
 *
 * Modular particle effects for game celebrations.
 * Respects sensory preferences for animations.
 */

import { useEffect, useState, useTransition } from 'react';
import { dataStore } from '../../services/dataStore';

interface CelebrationEffectProps {
  trigger: boolean;
  type?: 'confetti' | 'sparkle' | 'bounce' | 'pulse';
  duration?: number;
  onComplete?: () => void;
}

const CelebrationEffect = ({
  trigger,
  type = 'confetti',
  duration = 1000,
  onComplete,
}: CelebrationEffectProps) => {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; rotation: number; color: string }[]
  >([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (trigger && !isAnimating) {
      startTransition(async () => {
        try {
          // Check sensory preferences from dataStore
          const sensoryPrefs = await dataStore.getSensoryPreferences();
          if (sensoryPrefs?.animationSpeed === 'none') {
            onComplete?.();
            return;
          }

          setIsAnimating(true);

          // Generate particles
          const particleCount = type === 'confetti' ? 20 : 10;
          const newParticles = Array.from({ length: particleCount }, (_, i) => ({
            id: i,
            x: Math.random() * 100 - 50,
            y: Math.random() * 100 - 50,
            rotation: Math.random() * 360,
            color: ['#22D3EE', '#38BDF8', '#FF5FD2', '#ec4899', '#FBBF24'][
              Math.floor(Math.random() * 5)
            ]!,
          }));

          setParticles(newParticles);

          // Clear after duration
          setTimeout(() => {
            setParticles([]);
            setIsAnimating(false);
            onComplete?.();
          }, duration);
        } catch (error) {
          console.error('Failed to load sensory preferences:', error);
          onComplete?.();
        }
      });
    }
  }, [trigger, type, duration, isAnimating, onComplete]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      {type === 'confetti' &&
        particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-3 h-3 rounded-full animate-confetti"
            style={{
              backgroundColor: particle.color,
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translate(${particle.x}px, ${particle.y}px) rotate(${particle.rotation}deg)`,
              animation: `confetti-fall ${duration}ms ease-out forwards`,
            }}
          />
        ))}

      {type === 'sparkle' && <div className="text-6xl animate-bounce">✨</div>}

      {type === 'pulse' && (
        <div className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping" />
      )}
    </div>
  );
};

export default CelebrationEffect;
