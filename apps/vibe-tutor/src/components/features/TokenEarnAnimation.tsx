import React, { useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { Coins } from 'lucide-react';

interface TokenEarnAnimationProps {
  amount: number;
  triggerId: number; // Increment this to trigger the animation again
  onComplete?: () => void;
}

export function TokenEarnAnimation({ amount, triggerId, onComplete }: TokenEarnAnimationProps) {
  const [props, api] = useSpring(() => ({
    opacity: 0,
    transform: 'translateY(0px) scale(0.5)',
    config: { tension: 300, friction: 20 },
  }));

  useEffect(() => {
    if (triggerId > 0 && amount > 0) {
      void api.start({
        opacity: 1,
        transform: 'translateY(-100px) scale(1.5)',
        reset: true,
      });

      const timer = setTimeout(() => {
        void api.start({ opacity: 0 });
        onComplete?.();
      }, 2000);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [triggerId, amount, api, onComplete]);

  if (triggerId === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <animated.div
        style={props}
        className="flex items-center gap-3 bg-[var(--background-card)]/90 backdrop-blur-md px-6 py-4 rounded-full border-2 border-yellow-500/50 shadow-[0_0_40px_rgba(250,204,21,0.6)]"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 flex items-center justify-center shadow-inner">
          <Coins className="w-8 h-8 text-yellow-900" />
        </div>
        <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-500 drop-shadow-md">
          +{amount}
        </span>
      </animated.div>
    </div>
  );
};
