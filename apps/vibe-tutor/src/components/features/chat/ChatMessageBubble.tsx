import React from 'react';
import { GraduationCap, Heart } from 'lucide-react';
import { GradientIcon } from '../../ui/icons/GradientIcon';
import { ChatMessageActions } from './ChatMessageActions';
import { FormattedMessageContent } from './FormattedMessageContent';
import type { ChatMessage } from '../../../types';

export interface ChatMessageBubbleProps {
  message: ChatMessage;
  index: number;
  type: 'tutor' | 'friend';
  feedback: 'helpful' | 'unhelpful' | null;
  onFeedback: (timestamp: number, feedback: 'helpful' | 'unhelpful') => void;
  onReportRequest: (msg: ChatMessage) => void;
  isReported: boolean;
  isReporting: boolean;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  index,
  type,
  feedback,
  onFeedback,
  onReportRequest,
  isReported,
  isReporting,
}) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-[fadeInUp_0.3s_ease-out] chat-stagger-delay`}
      style={{ '--stagger-delay': `${index * 0.1}s` } as React.CSSProperties}
    >
      <div className={`group max-w-xl relative ${isUser ? 'order-1' : 'order-2'}`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            {type === 'tutor' ? (
              <GradientIcon
                Icon={GraduationCap}
                size={24}
                gradientId="vibe-gradient-primary"
              />
            ) : (
              <GradientIcon Icon={Heart} size={24} gradientId="vibe-gradient-accent" />
            )}
            <span className="text-xs text-text-muted">
              {type === 'tutor' ? 'AI Tutor' : 'AI Buddy'}
            </span>
          </div>
        )}
        <div
          className={`p-4 rounded-2xl backdrop-blur-md border transition-all duration-300 hover:scale-[1.02] ${
            isUser
              ? 'bg-gradient-to-br from-[var(--primary-accent)] to-[var(--tertiary-accent)] text-white border-[var(--primary-accent)]/30 shadow-lg shadow-[var(--primary-accent)]/20'
              : 'bg-[var(--glass-surface)] text-text-primary border-[var(--glass-border)] hover:border-[var(--border-hover)]'
          }`}
        >
          <FormattedMessageContent content={message.content} role={message.role} />
          <ChatMessageActions
            message={message}
            role={message.role}
            feedback={feedback}
            onFeedback={onFeedback}
            onReportRequest={onReportRequest}
            isReported={isReported}
            isReporting={isReporting}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatMessageBubble;
