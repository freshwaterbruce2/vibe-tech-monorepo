import { Bot, GraduationCap, Heart, Send, Sparkles, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { dataStore } from '../../services/dataStore';
import { GradientIcon } from '../ui/icons/GradientIcon';
import { useChatMessages } from '../../hooks/useChatMessages';
import { secureClient } from '../../services/secureClient';
import LifeSkillsChecklist from './LifeSkillsChecklist';
import SocialSkillsTips from './SocialSkillsTips';
import { logger } from '../../utils/logger';

interface ChatWindowProps {
  title: string;
  description: string;
  onSendMessage: (message: string) => Promise<string>;
  type?: 'tutor' | 'friend';
}

type ConnectionStatus = 'checking' | 'connected' | 'disconnected';

const ChatWindow = ({ title, description, onSendMessage, type = 'tutor' }: ChatWindowProps) => {
  const {
    messages, setMessages, input, setInput, isLoading,
    showLifeSkills, setShowLifeSkills, showSocialTips, setShowSocialTips,
    messagesEndRef, handleSend, handleAskBuddy, startTransition,
  } = useChatMessages({ title, type, onSendMessage });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const CHECK_TIMEOUT_MS = 3000;

    const checkConnection = async () => {
      try {
        const timeoutPromise = new Promise<false>((resolve) =>
          setTimeout(() => resolve(false), CHECK_TIMEOUT_MS),
        );
        const healthPromise = secureClient.healthCheck();
        const isHealthy = await Promise.race([healthPromise, timeoutPromise]);

        if (cancelled) return;

        if (isHealthy) {
          setConnectionStatus('connected');
          setShowOfflineBanner(false);
        } else {
          setConnectionStatus('disconnected');
          setShowOfflineBanner(true);
        }
      } catch {
        if (cancelled) return;
        setConnectionStatus('disconnected');
        setShowOfflineBanner(true);
      }
    };

    void checkConnection();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-full flex flex-col p-4 md:p-8 pb-24 md:pb-8 relative">
      {/* AI Buddy Tools Overlay (Life Skills + Social Tips) */}
      {type === 'friend' && (showLifeSkills || showSocialTips) && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-sm z-50 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">
                {showLifeSkills ? '📋 Daily Life Skills' : '💡 Social Skills Tips'}
              </h2>
              <button
                onClick={() => {
                  setShowLifeSkills(false);
                  setShowSocialTips(false);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Close panel"
                aria-label="Close panel"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            {showLifeSkills && <LifeSkillsChecklist />}
            {showSocialTips && <SocialSkillsTips onAskBuddy={handleAskBuddy} />}
          </div>
        </div>
      )}

      <header className="mb-4 md:mb-8 text-center">
        <div className="relative flex items-center justify-center gap-4 mb-4">
          {/* Connection status dot */}
          <div
            className="absolute right-0 top-0"
            role="status"
            aria-label={
              connectionStatus === 'checking'
                ? 'Checking AI connection'
                : connectionStatus === 'connected'
                  ? 'AI Tutor connected'
                  : 'AI Tutor offline'
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
                  ? 'AI Tutor connected'
                  : connectionStatus === 'disconnected'
                    ? 'AI Tutor offline'
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
            {type === 'friend' && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowLifeSkills(true)}
                  className="glass-card px-3 py-1.5 rounded-lg hover:bg-violet-500/20 transition-all text-sm flex items-center gap-1"
                  title="Daily Life Skills Checklist"
                  aria-label="Daily Life Skills Checklist"
                >
                  <span aria-hidden="true">📋</span>
                  <span className="text-gray-300 text-xs">Life Skills</span>
                </button>
                <button
                  onClick={() => setShowSocialTips(true)}
                  className="glass-card px-3 py-1.5 rounded-lg hover:bg-violet-500/20 transition-all text-sm flex items-center gap-1"
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
        {messages.length > 0 && (
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="px-3 py-1 bg-[var(--primary-accent)]/20 border border-[var(--primary-accent)]/40 rounded-full text-xs text-[var(--primary-accent)] font-medium flex items-center gap-2">
              <Sparkles size={14} className="icon-spin" />
              {messages.length} saved
            </div>
            <button
              onClick={() => {
                setMessages([]);
                startTransition(async () => {
                  try {
                    await dataStore.saveChatHistory(type, []);
                  } catch (error) {
                    logger.error('Failed to clear chat history:', error);
                  }
                });
              }}
              className="px-4 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-200 transition-all duration-200 hover:scale-105"
            >
              Clear Chat
            </button>
          </div>
        )}
      </header>

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
          <span>AI Tutor is offline — check your connection</span>
          <button
            type="button"
            onClick={() => setShowOfflineBanner(false)}
            className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
            aria-label="Dismiss offline warning"
          >
            <X size={14} />
          </button>
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
                  onClick={() => setInput(prompt)}
                  className="px-4 py-2 text-sm rounded-xl bg-white/5 border border-[var(--glass-border)] text-text-secondary hover:bg-white/10 hover:text-text-primary transition-all duration-200"
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
              <div
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-[fadeInUp_0.3s_ease-out] chat-stagger-delay`}
                style={{ '--stagger-delay': `${index * 0.1}s` } as React.CSSProperties}
              >
                <div
                  className={`group max-w-xl relative ${msg.role === 'user' ? 'order-1' : 'order-2'}`}
                >
                  {msg.role !== 'user' && (
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
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-[var(--primary-accent)] to-[var(--tertiary-accent)] text-white border-[var(--primary-accent)]/30 shadow-lg shadow-[var(--primary-accent)]/20'
                        : 'bg-[var(--glass-surface)] text-text-primary border-[var(--glass-border)] hover:border-[var(--border-hover)]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <div className="flex justify-end mt-2">
                      <span className="text-xs opacity-60">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
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
          <input
            type="text"
            id="chat-input"
            name="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={`Message ${type === 'tutor' ? 'your AI Tutor' : 'your AI Buddy'}... (Enter to send, Shift+Enter for new line)`}
            className="flex-1 bg-transparent px-4 py-3 text-text-primary outline-none placeholder-text-muted"
            disabled={isLoading}
            aria-label="Chat input"
          />
          <button
            onClick={() => void handleSend()}
            disabled={isLoading || !input.trim()}
            className="glass-button p-3 ml-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
            aria-label="Send message"
          >
            <GradientIcon Icon={Send} size={20} gradientId="vibe-gradient-mobile" />
          </button>
        </div>
        <div className="mt-2 text-center">
          <span className="text-xs text-text-muted opacity-70">
            Press Ctrl+Enter or click send • {messages.length} messages
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
