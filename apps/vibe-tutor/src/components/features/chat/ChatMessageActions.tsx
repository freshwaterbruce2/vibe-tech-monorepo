import { Check, Copy, Flag, ThumbsDown, ThumbsUp } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import type { ChatMessage } from '../../../types';

export interface ChatMessageActionsProps {
  message: ChatMessage;
  feedback?: 'helpful' | 'unhelpful' | null;
  onFeedback?: (timestamp: number, feedback: 'helpful' | 'unhelpful') => void;
  onReportRequest: (msg: ChatMessage) => void;
  isReported: boolean;
  isReporting: boolean;
  role: 'user' | 'model';
}

export const ChatMessageActions: React.FC<ChatMessageActionsProps> = ({
  message,
  feedback = null,
  onFeedback,
  onReportRequest,
  isReported,
  isReporting,
  role,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message.content);
      } else {
        // Fallback for restricted clipboard contexts
        const textArea = document.createElement('textarea');
        textArea.value = message.content;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Non-fatal if copy fails or is denied
    }
  }, [message.content]);

  return (
    <div className="flex items-center justify-end gap-2 mt-2 pt-1 border-t border-[var(--glass-border)]/40">
      {/* Copy Action */}
      <button
        type="button"
        onClick={handleCopy}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-1 text-xs opacity-70 hover:opacity-100 transition-opacity p-2 rounded hover:bg-white/10"
        aria-label={copied ? 'Message copied' : 'Copy message text'}
        title={copied ? 'Copied to clipboard' : 'Copy message text'}
      >
        {copied ? (
          <>
            <Check size={14} className="text-emerald-400" />
            <span className="text-emerald-400 font-medium">Copied</span>
          </>
        ) : (
          <>
            <Copy size={14} />
            <span>Copy</span>
          </>
        )}
      </button>

      {/* Helpful / Not Helpful Feedback (Model messages only) */}
      {role !== 'user' && onFeedback && (
        <div className="flex items-center gap-1 border-l border-[var(--glass-border)]/50 pl-2">
          <button
            type="button"
            onClick={() => onFeedback(message.timestamp, 'helpful')}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center gap-1 text-xs p-2 rounded transition-all ${
              feedback === 'helpful'
                ? 'text-emerald-400 font-semibold opacity-100 bg-emerald-500/10'
                : 'opacity-70 hover:opacity-100 hover:bg-white/10'
            }`}
            aria-label="Mark helpful"
            title="Helpful explanation"
          >
            <ThumbsUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => onFeedback(message.timestamp, 'unhelpful')}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center gap-1 text-xs p-2 rounded transition-all ${
              feedback === 'unhelpful'
                ? 'text-amber-400 font-semibold opacity-100 bg-amber-500/10'
                : 'opacity-70 hover:opacity-100 hover:bg-white/10'
            }`}
            aria-label="Mark unhelpful"
            title="Not helpful"
          >
            <ThumbsDown size={14} />
          </button>
        </div>
      )}

      {/* Report Button (Model messages only) */}
      {role !== 'user' && (
        <button
          type="button"
          onClick={() => onReportRequest(message)}
          disabled={isReporting || isReported}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-1 text-xs opacity-70 hover:opacity-100 disabled:opacity-40 transition-opacity p-2 rounded hover:bg-white/10"
          aria-label={isReported ? 'Message reported' : 'Report this message'}
          title={isReported ? 'Reported — thank you' : 'Report inappropriate response'}
        >
          <Flag size={14} />
          <span>{isReported ? 'Reported' : 'Report'}</span>
        </button>
      )}

      {/* Timestamp */}
      <span className="text-xs opacity-60 ml-1">
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    </div>
  );
};

export default ChatMessageActions;
