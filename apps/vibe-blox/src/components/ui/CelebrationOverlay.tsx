import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { createPortal } from 'react-dom';

export interface CelebrationOverlayProps {
  isOpen: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
  duration?: number;
  className?: string;
}

export const CelebrationOverlay = ({
  isOpen,
  onClose,
  children,
  duration = 3000,
  className,
}: CelebrationOverlayProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      if (duration > 0 && onClose) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
    return undefined;
  }, [isOpen, duration, onClose]);

  if (!isOpen && !isVisible) return null;

  return createPortal(
    <div
      className={clsx(
        'fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0',
        className,
      )}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Confetti effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-confetti"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `-10px`,
              animationDelay: `${((i * 13) % 20) / 10}s`,
              animationDuration: `${2 + ((i * 17) % 20) / 10}s`,
            }}
          >
            <div
              className={clsx(
                'w-3 h-3 rounded-sm',
                ['bg-gold', 'bg-purple', 'bg-blue-primary', 'bg-green-primary', 'bg-orange'][i % 5],
              )}
              style={{
                transform: `rotate(${(i * 53) % 360}deg)`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Content */}
      <div
        className={clsx(
          'relative z-10 transform transition-all duration-300',
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
};

// Preset celebration components
export const QuestCompletionCelebration = ({
  questName,
  xpEarned,
  coinsEarned,
  isOpen,
  onClose,
}: {
  questName: string;
  xpEarned: number;
  coinsEarned: number;
  isOpen: boolean;
  onClose?: () => void;
}) => (
  <CelebrationOverlay isOpen={isOpen} onClose={onClose} duration={4000}>
    <div className="text-center p-8 bg-bg-card rounded-2xl border-2 border-green-primary/50 shadow-2xl max-w-md mx-4">
      <div className="text-6xl mb-4">🎉</div>
      <h2 className="text-2xl font-heading font-bold text-green-primary mb-2">
        Quest Completed!
      </h2>
      <p className="text-text-secondary mb-6">{questName}</p>
      <div className="flex justify-center gap-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-light">+{xpEarned}</div>
          <div className="text-sm text-text-muted">XP</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gold">+{coinsEarned}</div>
          <div className="text-sm text-text-muted">Coins</div>
        </div>
      </div>
    </div>
  </CelebrationOverlay>
);

export const LevelUpCelebration = ({
  newLevel,
  isOpen,
  onClose,
}: {
  newLevel: number;
  isOpen: boolean;
  onClose?: () => void;
}) => {
  const levelTitles: Record<number, string> = {
    1: 'Rookie',
    2: 'Explorer',
    3: 'Achiever',
    4: 'Champion',
    5: 'Hero',
    6: 'Legend',
    7: 'Master',
    8: 'Grandmaster',
  };
  const title = levelTitles[newLevel] || 'Master';

  return (
    <CelebrationOverlay isOpen={isOpen} onClose={onClose} duration={5000}>
      <div className="text-center p-8 bg-bg-card rounded-2xl border-2 border-gold/50 shadow-2xl shadow-gold/20 max-w-md mx-4">
        <div className="text-6xl mb-4">👑</div>
        <h2 className="text-3xl font-heading font-bold text-gold mb-2">Level Up!</h2>
        <div className="text-5xl font-bold text-text-primary mb-2">Level {newLevel}</div>
        <p className="text-lg text-text-secondary">You are now a {title}!</p>
      </div>
    </CelebrationOverlay>
  );
};

export const RewardRedemptionCelebration = ({
  rewardName,
  cost,
  isOpen,
  onClose,
}: {
  rewardName: string;
  cost: number;
  isOpen: boolean;
  onClose?: () => void;
}) => (
  <CelebrationOverlay isOpen={isOpen} onClose={onClose} duration={4000}>
    <div className="text-center p-8 bg-bg-card rounded-2xl border-2 border-purple/50 shadow-2xl max-w-md mx-4">
      <div className="text-6xl mb-4">🎁</div>
      <h2 className="text-2xl font-heading font-bold text-purple mb-2">Reward Unlocked!</h2>
      <p className="text-text-primary font-medium mb-4">{rewardName}</p>
      <div className="text-gold">
        <span className="text-2xl font-bold">{cost}</span>
        <span className="text-sm ml-1">🪙 spent</span>
      </div>
    </div>
  </CelebrationOverlay>
);

export const StreakMilestoneCelebration = ({
  streak,
  multiplier,
  isOpen,
  onClose,
}: {
  streak: number;
  multiplier: number;
  isOpen: boolean;
  onClose?: () => void;
}) => (
  <CelebrationOverlay isOpen={isOpen} onClose={onClose} duration={4000}>
    <div className="text-center p-8 bg-bg-card rounded-2xl border-2 border-orange/50 shadow-2xl max-w-md mx-4">
      <div className="text-6xl mb-4">🔥</div>
      <h2 className="text-2xl font-heading font-bold text-orange mb-2">
        {streak} Day Streak!
      </h2>
      <p className="text-text-secondary mb-4">You&apos;re on fire!</p>
      <div className="bg-orange/10 rounded-lg p-3">
        <span className="text-orange font-bold">x{multiplier.toFixed(1)}</span>
        <span className="text-text-secondary ml-2">multiplier active</span>
      </div>
    </div>
  </CelebrationOverlay>
);
