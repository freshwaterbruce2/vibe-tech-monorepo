import React from 'react';
import type { Achievement } from '../../types';

interface AchievementPopupProps {
  achievement: Achievement;
}

const AchievementPopup = ({ achievement }: AchievementPopupProps) => {
  const { icon: Icon, name, description } = achievement;
  
  return (
    <div className="fixed bottom-5 right-5 bg-gradient-to-br from-slate-800 to-background-surface border border-[var(--token-color)]/50 rounded-xl shadow-2xl shadow-[var(--token-color)]/50 p-4 w-full max-w-sm flex items-center z-[100] animate-slide-in-up">
      <div className="w-12 h-12 rounded-lg flex items-center justify-center mr-4 bg-[var(--token-color)]/20 flex-shrink-0">
        <Icon className="w-7 h-7 text-[var(--token-color)]" />
      </div>
      <div>
        <p className="font-bold text-sm text-[var(--token-color)]">ACHIEVEMENT UNLOCKED</p>
        <h3 className="text-lg font-semibold text-text-primary">{name}</h3>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
      <style>{`
        @keyframes slide-in-up {
          0% { transform: translateY(100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-in-up {
          animation: slide-in-up 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
      `}</style>
    </div>
  );
};

export default AchievementPopup;
