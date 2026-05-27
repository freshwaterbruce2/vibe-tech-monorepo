import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { soundEffects } from '../lib/soundEffects';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'quest' | 'achievement' | 'levelup' | 'purchase';
  title: string;
  description?: string;
  icon?: string;
  coins?: number;
  level?: number;
}

export default function CelebrationModal({
  isOpen,
  onClose,
  type,
  title,
  description,
  icon,
  coins,
  level,
}: CelebrationModalProps) {
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; delay: number }>>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Generate confetti particles
    const particles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
    }));
    setConfetti(particles);

    // Play appropriate sound effect
    switch (type) {
      case 'quest':
        soundEffects.playSuccess();
        break;
      case 'achievement':
        soundEffects.playAchievement();
        break;
      case 'levelup':
        soundEffects.playLevelUp();
        break;
      case 'purchase':
        soundEffects.playPurchase();
        break;
    }

    // Auto-close after 3 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [isOpen, onClose, type]);

  const getColors = () => {
    switch (type) {
      case 'quest':
        return {
          bg: 'bg-green-primary/20',
          border: 'border-green-primary',
          text: 'text-green-primary',
        };
      case 'achievement':
        return {
          bg: 'bg-purple/20',
          border: 'border-purple',
          text: 'text-purple',
        };
      case 'levelup':
        return { bg: 'bg-gold/20', border: 'border-gold', text: 'text-gold' };
      case 'purchase':
        return {
          bg: 'bg-blue-primary/20',
          border: 'border-blue-primary',
          text: 'text-blue-primary',
        };
    }
  };

  const colors = getColors();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4"
          >
            <div
              className={`relative overflow-hidden rounded-2xl border-2 ${colors.border} ${colors.bg} bg-bg-card p-8 text-center shadow-2xl`}
            >
              {/* Confetti */}
              {confetti.map((particle) => (
                <motion.div
                  key={particle.id}
                  initial={{ y: -20, opacity: 1 }}
                  animate={{ y: 400, opacity: 0 }}
                  transition={{
                    duration: 2,
                    delay: particle.delay,
                    ease: 'easeIn',
                  }}
                  className="absolute text-2xl"
                  style={{ left: `${particle.x}%` }}
                >
                  {['🎉', '✨', '⭐', '💫', '🌟'][particle.id % 5]}
                </motion.div>
              ))}

              {/* Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', damping: 15 }}
                className="mb-4 text-7xl"
              >
                {icon ||
                  (type === 'quest'
                    ? '✅'
                    : type === 'achievement'
                      ? '🏆'
                      : type === 'levelup'
                        ? '⭐'
                        : '🎁')}
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`mb-2 text-2xl font-bold ${colors.text}`}
              >
                {title}
              </motion.h2>

              {/* Description */}
              {description && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mb-4 text-text-secondary"
                >
                  {description}
                </motion.p>
              )}

              {/* Coins */}
              {coins !== undefined && coins > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring', damping: 10 }}
                  className="mb-4 inline-block rounded-full bg-gold/20 px-6 py-2"
                >
                  <span className="text-2xl font-bold text-gold">+{coins} VC</span>
                </motion.div>
              )}

              {/* Level */}
              {level !== undefined && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring', damping: 10 }}
                  className="mb-4"
                >
                  <span className="text-3xl font-bold text-gold">Level {level}!</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
