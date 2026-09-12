import React from 'react';
import { GraduationCap, Heart, Sparkles } from 'lucide-react';
import { GradientIcon } from '../../ui/icons/GradientIcon';

export interface ChatHeaderProps {
  title: string;
  description: string;
  type: 'tutor' | 'friend';
  connectionStatus: 'checking' | 'connected' | 'disconnected';
  chatLabel: string;
  messagesCount: number;
  onClearChat: () => void;
  onBackToAssignment?: () => void;
  onOpenLifeSkills?: () => void;
  onOpenSocialTips?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  description,
  type,
  connectionStatus,
  chatLabel,
  messagesCount,
  onClearChat,
  onBackToAssignment,
  onOpenLifeSkills,
  onOpenSocialTips,
}) => {
  return (
    <header className="mb-4 md:mb-8 text-center">
      {type === 'tutor' && onBackToAssignment && (
        <button
          type="button"
          onClick={onBackToAssignment}
          className="glass-card min-h-[44px] px-4 py-2 mb-3 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--primary-accent)] focus-glow"
        >
          Back to assignment
        </button>
      )}
      <div className="relative flex items-center justify-center gap-4 mb-4">
        {/* Connection status indicator */}
        <div
          className="absolute right-0 top-0"
          role="status"
          aria-label={
            connectionStatus === 'checking'
              ? 'Checking AI connection'
              : connectionStatus === 'connected'
                ? `${chatLabel} connected`
                : `${chatLabel} offline`
          }
        >
          <span
            className={`block w-3 h-3 rounded-full${connectionStatus === 'checking' ? ' animate-pulse' : ''}`}
            style={{
              backgroundColor:
                connectionStatus === 'connected'
                  ? '#4ADE80'
                  : connectionStatus === 'disconnected'
                    ? '#EF4444'
                    : '#F59E0B',
            }}
            title={
              connectionStatus === 'connected'
                ? `${chatLabel} connected`
                : connectionStatus === 'disconnected'
                  ? `${chatLabel} offline`
                  : 'Checking connection...'
            }
          />
        </div>

        {type === 'tutor' ? (
          <GradientIcon
            Icon={GraduationCap}
            size={48}
            gradientId="vibe-gradient-primary"
            className="icon-pulse"
          />
        ) : (
          <GradientIcon
            Icon={Heart}
            size={48}
            gradientId="vibe-gradient-secondary"
            className="icon-bounce"
          />
        )}

        <div className="flex flex-col items-center">
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-accent)] to-[var(--secondary-accent)] neon-text-primary">
            {title}
          </h1>
          {type === 'friend' && onOpenLifeSkills && onOpenSocialTips && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={onOpenLifeSkills}
                className="glass-card min-h-[44px] px-3 py-2 rounded-lg hover:bg-violet-500/20 transition-all text-sm flex items-center gap-1"
                title="Daily Life Skills Checklist"
                aria-label="Daily Life Skills Checklist"
              >
                <span aria-hidden="true">📋</span>
                <span className="text-gray-300 text-xs">Life Skills</span>
              </button>
              <button
                onClick={onOpenSocialTips}
                className="glass-card min-h-[44px] px-3 py-2 rounded-lg hover:bg-violet-500/20 transition-all text-sm flex items-center gap-1"
                title="Social Skills Tips"
                aria-label="Social Skills Tips"
              >
                <span aria-hidden="true">💡</span>
                <span className="text-gray-300 text-xs">Social Tips</span>
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="text-text-secondary text-lg">{description}</p>
      {messagesCount > 0 && (
        <div className="flex items-center justify-center gap-3 mt-3">
          <div className="px-3 py-1 bg-[var(--primary-accent)]/20 border border-[var(--primary-accent)]/40 rounded-full text-xs text-[var(--primary-accent)] font-medium flex items-center gap-2">
            <Sparkles size={14} className="icon-spin" />
            {messagesCount} saved
          </div>
          <button
            onClick={onClearChat}
            className="min-h-[44px] px-4 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-200 transition-all duration-200 hover:scale-105"
          >
            Clear Chat
          </button>
        </div>
      )}
    </header>
  );
};

export default ChatHeader;
