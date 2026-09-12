import { Bot, GraduationCap, Heart, Send, Sparkles, X } from 'lucide-react';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GradientIcon } from '../ui/icons/GradientIcon';
import { useChatMessages } from '../../hooks/useChatMessages';
import { secureClient } from '../../services/secureClient';
import { BuddyToolsOverlay } from './chat/BuddyToolsOverlay';
import { ChatHeader } from './chat/ChatHeader';
import { ChatMessageBubble } from './chat/ChatMessageBubble';
import { ReportModal } from './chat/ReportModal';
import { logger } from '../../utils/logger';
import type { ChatMessage } from '../../types';

interface ChatWindowProps {
  title: string;
  description: string;
  onSendMessage: (message: string) => Promise<string>;
  type?: 'tutor' | 'friend';
  assignmentHelp?: {
    id: number;
    subject: string;
    title: string;
    draftApplied: boolean;
  } | null;
  onAssignmentDraftApplied?: (intentId: number) => void;
  onBackToAssignment?: () => void;
}

type ConnectionStatus = 'checking' | 'connected' | 'disconnected';

const ChatWindow = ({
  title,
  description,
  onSendMessage,
  type = 'tutor',
  assignmentHelp = null,
  onAssignmentDraftApplied,
  onBackToAssignment,
}: ChatWindowProps) => {
  const {
    messages,
    input,
    setInput,
    isLoading,
    historyStatus,
    historyError,
    persistenceError,
    showLifeSkills,
    setShowLifeSkills,
    showSocialTips,
    setShowSocialTips,
    messagesEndRef,
    handleSend,
    handleAskBuddy,
    retryHistoryLoad,
    clearChat,
  } = useChatMessages({ type, onSendMessage });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [reportedTimestamps, setReportedTimestamps] = useState<Set<number>>(new Set());
  const [reportingTimestamp, setReportingTimestamp] = useState<number | null>(null);
  const [pendingReport, setPendingReport] = useState<ChatMessage | null>(null);
  const [includeReportContent, setIncludeReportContent] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<number, 'helpful' | 'unhelpful'>>({});
  const chatLabel = type === 'tutor' ? 'AI Tutor' : 'AI Buddy';
  const appliedIntentId = useRef<number | null>(null);
  const editedIntentId = useRef<number | null>(null);

  const handleFeedback = useCallback((timestamp: number, feedback: 'helpful' | 'unhelpful') => {
    setFeedbackState((prev) => ({
      ...prev,
      [timestamp]: prev[timestamp] === feedback ? undefined as any : feedback,
    }));
  }, []);

  const setComposerInput = useCallback((nextInput: string) => {
    if (type === 'tutor' && assignmentHelp && !assignmentHelp.draftApplied) {
      editedIntentId.current = assignmentHelp.id;
    }
    setInput(nextInput);
  }, [assignmentHelp, setInput, type]);

  useEffect(() => {
    if (
      type !== 'tutor' ||
      !assignmentHelp ||
      assignmentHelp.draftApplied ||
      historyStatus !== 'ready' ||
      appliedIntentId.current === assignmentHelp.id
    ) {
      return;
    }

    appliedIntentId.current = assignmentHelp.id;
    if (editedIntentId.current !== assignmentHelp.id) {
      setInput(
        `Help me understand my ${assignmentHelp.subject} assignment: “${assignmentHelp.title}”. Please explain the first step.`,
      );
    }
    onAssignmentDraftApplied?.(assignmentHelp.id);
  }, [assignmentHelp, historyStatus, onAssignmentDraftApplied, setInput, type]);

  const handleReport = useCallback(
    async (msg: ChatMessage) => {
      if (reportingTimestamp !== null || reportedTimestamps.has(msg.timestamp)) return;
      setReportingTimestamp(msg.timestamp);
      setReportError(null);
      try {
        await secureClient.reportMessage({
          category: `${type}-chat-message`,
          includeContent: includeReportContent,
          ...(includeReportContent ? { content: msg.content } : {}),
        });
        setReportedTimestamps((prev) => new Set(prev).add(msg.timestamp));
        setPendingReport(null);
      } catch (error) {
        logger.error('Failed to report message:', error);
        setReportError('Your report was not sent. Please try again.');
      } finally {
        setReportingTimestamp(null);
      }
    },
    [includeReportContent, reportingTimestamp, reportedTimestamps, type],
  );

  const checkConnection = useCallback(async () => {
    // If the device itself reports offline, skip the network round-trip.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setConnectionStatus('disconnected');
      setShowOfflineBanner(true);
      return;
    }

    const CHECK_TIMEOUT_MS = 3000;
    try {
      const timeoutPromise = new Promise<false>((resolve) =>
        setTimeout(() => resolve(false), CHECK_TIMEOUT_MS),
      );
      const isHealthy = await Promise.race([secureClient.healthCheck(), timeoutPromise]);
      if (isHealthy) {
        setConnectionStatus('connected');
        setShowOfflineBanner(false);
      } else {
        setConnectionStatus('disconnected');
        setShowOfflineBanner(true);
      }
    } catch {
      setConnectionStatus('disconnected');
      setShowOfflineBanner(true);
    }
  }, []);

  useEffect(() => {
    void checkConnection();

    // React to device connectivity changes so the chat re-enables on reconnect
    // and locks down immediately when the network drops.
    const handleOnline = () => void checkConnection();
    const handleOffline = () => {
      setConnectionStatus('disconnected');
      setShowOfflineBanner(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  return (
    <div className="h-full flex flex-col p-4 md:p-8 pb-24 md:pb-8 relative">
      {type === 'friend' && (
        <BuddyToolsOverlay
          showLifeSkills={showLifeSkills}
          showSocialTips={showSocialTips}
          onClose={() => {
            setShowLifeSkills(false);
            setShowSocialTips(false);
          }}
          onTaskComplete={(taskId) =>
            setInput(`I completed ${taskId.replace(/-/g, ' ')}. Help me keep this routine going.`)
          }
          onAskBuddy={handleAskBuddy}
        />
      )}

      <ChatHeader
        title={title}
        description={description}
        type={type}
        connectionStatus={connectionStatus}
        chatLabel={chatLabel}
        messagesCount={messages.length}
        onClearChat={() => void clearChat()}
        onBackToAssignment={onBackToAssignment}
        onOpenLifeSkills={() => setShowLifeSkills(true)}
        onOpenSocialTips={() => setShowSocialTips(true)}
      />

      {/* Offline connection banner */}
      {showOfflineBanner && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 mb-3 px-4 py-3 rounded-xl border text-sm"
          style={{
            backgroundColor: 'var(--error-surface)',
            borderColor: 'var(--error-accent)',
            color: 'var(--error-accent)',
          }}
        >
          <span>{chatLabel} is offline — check your connection</span>
          <button
            type="button"
            onClick={() => setShowOfflineBanner(false)}
            className="shrink-0 min-h-[44px] min-w-[44px] p-1 rounded hover:bg-white/10 transition-colors"
            aria-label="Dismiss offline warning"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {historyStatus === 'loading' && (
        <div role="status" className="mb-3 text-sm text-text-secondary">Loading saved {chatLabel} history…</div>
      )}
      {historyError && (
        <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <span>{historyError}</span>
          <button type="button" className="min-h-[44px] px-3 underline" onClick={retryHistoryLoad}>Retry history</button>
        </div>
      )}
      {persistenceError && (
        <div
          role="alert"
          className={`mb-3 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm ${
            /quiet hours/i.test(persistenceError)
              ? 'border border-indigo-400/30 bg-indigo-950/40 text-indigo-200'
              : 'border border-amber-400/40 bg-amber-500/10 text-amber-50'
          }`}
        >
          {/quiet hours/i.test(persistenceError) && (
            <span className="text-base leading-none select-none" aria-hidden="true">🌙</span>
          )}
          <span className="flex-1">{persistenceError}</span>
        </div>
      )}

      <div aria-live="polite" className="flex-1 overflow-y-auto mb-4 p-6 glass-card space-y-6">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            {type === 'tutor' ? (
              <GradientIcon
                Icon={GraduationCap}
                size={64}
                gradientId="vibe-gradient-primary"
                className="mb-4 opacity-60"
              />
            ) : (
              <GradientIcon
                Icon={Heart}
                size={64}
                gradientId="vibe-gradient-secondary"
                className="mb-4 opacity-60"
              />
            )}
            <p className="text-text-muted text-lg mb-6">
              {type === 'tutor'
                ? 'Ask me anything about your studies!'
                : "I'm here to chat and help you out!"}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {(type === 'tutor'
                ? ['Help me with math', 'Explain photosynthesis', 'Quiz me on history']
                : ['How are you today?', 'I need some advice', 'Tell me something fun']
              ).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setComposerInput(prompt)}
                  className="min-h-[44px] px-4 py-2 text-sm rounded-xl bg-white/5 border border-[var(--glass-border)] text-text-secondary hover:bg-white/10 hover:text-text-primary transition-all duration-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, index) => {
          const prevMsg = index > 0 ? messages[index - 1] : null;
          const msgDate = new Date(msg.timestamp);
          const prevDate = prevMsg ? new Date(prevMsg.timestamp) : null;

          // Check if we need a date separator
          const showDateSep = msgDate.toDateString() !== prevDate?.toDateString();

          // Check for session gap (>1hr between messages on same day)
          const showSessionGap =
            !showDateSep && msg.timestamp - (prevMsg?.timestamp ?? msg.timestamp) > 3600000;

          // Format the date label
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          let dateLabel = '';
          if (showDateSep) {
            if (msgDate.toDateString() === today.toDateString()) {
              dateLabel = 'Today';
            } else if (msgDate.toDateString() === yesterday.toDateString()) {
              dateLabel = 'Yesterday';
            } else {
              dateLabel = msgDate.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
            }
          }

          return (
            <React.Fragment key={msg.timestamp}>
              {showDateSep && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent" />
                  <span className="text-xs font-medium text-text-muted px-3 py-1 rounded-full bg-[var(--glass-surface)] border border-[var(--glass-border)]">
                    {dateLabel}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent" />
                </div>
              )}
              {showSessionGap && (
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-[var(--glass-border)] opacity-40" />
                  <span className="text-[10px] text-text-muted opacity-50 uppercase tracking-wider">
                    New Session
                  </span>
                  <div className="flex-1 h-px bg-[var(--glass-border)] opacity-40" />
                </div>
              )}
              <ChatMessageBubble
                message={msg}
                index={index}
                type={type}
                feedback={feedbackState[msg.timestamp] ?? null}
                onFeedback={handleFeedback}
                onReportRequest={(targetMsg) => {
                  setPendingReport(targetMsg);
                  setIncludeReportContent(false);
                  setReportError(null);
                }}
                isReported={reportedTimestamps.has(msg.timestamp)}
                isReporting={reportingTimestamp === msg.timestamp}
              />
            </React.Fragment>
          );
        })}
        {isLoading && (
          <div className="flex justify-start animate-[fadeInUp_0.3s_ease-out]">
            <div className="group max-w-xl relative">
              <div className="flex items-center gap-2 mb-2">
                {type === 'tutor' ? (
                  <GradientIcon
                    Icon={Bot}
                    size={24}
                    gradientId="vibe-gradient-primary"
                    className="animate-pulse"
                  />
                ) : (
                  <GradientIcon
                    Icon={Sparkles}
                    size={24}
                    gradientId="vibe-gradient-secondary"
                    className="animate-pulse"
                  />
                )}
                <span className="text-xs text-text-muted">
                  {type === 'tutor' ? 'AI Tutor is thinking...' : 'AI Buddy is typing...'}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] backdrop-blur-md">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-[var(--primary-accent)] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-3 h-3 bg-[var(--secondary-accent)] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-3 h-3 bg-[var(--tertiary-accent)] rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-auto">
        <div className="flex items-center glass-card p-3 border-[var(--glass-border)] hover:border-[var(--border-hover)] transition-all duration-300">
          <textarea
            rows={type === 'tutor' && assignmentHelp ? 4 : 2}
            id="chat-input"
            name="chat-input"
            value={input}
            onChange={(e) => setComposerInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={
              connectionStatus === 'disconnected'
                ? "You're offline — reconnect to chat"
                : `Message ${type === 'tutor' ? 'your AI Tutor' : 'your AI Buddy'}... (Enter to send, Shift+Enter for new line)`
            }
            className="flex-1 resize-none bg-transparent px-4 py-3 text-text-primary outline-none focus:ring-2 focus:ring-[var(--primary-accent)] focus:ring-inset rounded placeholder-text-muted"
            disabled={isLoading || historyStatus !== 'ready' || connectionStatus === 'disconnected'}
            aria-label="Chat input"
          />
          <button
            onClick={() => void handleSend()}
            disabled={isLoading || historyStatus !== 'ready' || !input.trim() || connectionStatus === 'disconnected'}
            className="glass-button p-3 ml-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
            aria-label="Send message"
          >
            <GradientIcon Icon={Send} size={20} gradientId="vibe-gradient-mobile" />
          </button>
        </div>
        <div className="mt-2 text-center">
          <span className="text-xs text-text-muted opacity-70">
            Enter sends • Shift+Enter adds a new line • {messages.length} messages
          </span>
        </div>
      </div>
      {pendingReport && (
        <ReportModal
          pendingReport={pendingReport}
          includeReportContent={includeReportContent}
          setIncludeReportContent={setIncludeReportContent}
          reportError={reportError}
          reportingTimestamp={reportingTimestamp}
          onCancel={() => setPendingReport(null)}
          onReport={(msg) => void handleReport(msg)}
        />
      )}
    </div>
  );
};

export default ChatWindow;
