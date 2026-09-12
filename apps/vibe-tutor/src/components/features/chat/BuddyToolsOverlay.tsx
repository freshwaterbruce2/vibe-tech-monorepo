import React from 'react';
import { X } from 'lucide-react';
import LifeSkillsChecklist from '../LifeSkillsChecklist';
import SocialSkillsTips from '../SocialSkillsTips';

export interface BuddyToolsOverlayProps {
  showLifeSkills: boolean;
  showSocialTips: boolean;
  onClose: () => void;
  onTaskComplete: (taskId: string) => void;
  onAskBuddy: (question: string) => void;
}

export const BuddyToolsOverlay: React.FC<BuddyToolsOverlayProps> = ({
  showLifeSkills,
  showSocialTips,
  onClose,
  onTaskComplete,
  onAskBuddy,
}) => {
  if (!showLifeSkills && !showSocialTips) return null;

  return (
    <div className="absolute inset-0 bg-black/95 backdrop-blur-sm z-50 overflow-y-auto p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">
            {showLifeSkills ? '📋 Daily Life Skills' : '💡 Social Skills Tips'}
          </h2>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Close panel"
            aria-label="Close panel"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
        {showLifeSkills && <LifeSkillsChecklist onTaskComplete={onTaskComplete} />}
        {showSocialTips && <SocialSkillsTips onAskBuddy={onAskBuddy} />}
      </div>
    </div>
  );
};

export default BuddyToolsOverlay;
