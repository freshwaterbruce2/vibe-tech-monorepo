import { syncService } from '@/services';
import { Bot, GraduationCap, Heart, Send, Sparkles, X } from 'lucide-react';
import React, { useEffect, useRef, useState, useTransition } from 'react';
import { hydrateBuddyHistory } from '../../services/buddyService';
import { dataStore } from '../../services/dataStore';
import { hydrateTutorHistory } from '../../services/tutorService';
import type { ChatMessage } from '../../types';
import { GradientIcon } from '../ui/icons/GradientIcon';
import LifeSkillsChecklist from './LifeSkillsChecklist';
import SocialSkillsTips from './SocialSkillsTips';

interface ChatWindowProps {
  title: string;
  description: string;
  onSendMessage: (message: string) => Promise<string>;
  type?: 'tutor' | 'friend';
}

const formatAIResponse = (text: string): string => {
  // Ensure proper spacing
  let formatted = text.replace(/\n{3,}/g, '\n\n'); // Max 2 newlines

  // Limit emojis (keep first 2, remove rest)
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
  const emojis = formatted.match(emojiRegex) ?? [];
  if (emojis.length > 2) {
    let count = 0;
    formatted = formatted.replace(emojiRegex, (match) => {
      count++;
      return count > 2 ? '' : match;
    });
  }

  return formatted;
};

const ChatWindow = ({ title, description, onSendMessage, type = 'tutor' }: ChatWindowProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLifeSkills, setShowLifeSkills] = useState(false);
  const [showSocialTips, setShowSocialTips] = useState(false);
  const [_isPending, startTransition] = useTransition();

  const messagesRef = useRef<ChatMessage[]>([]);
  // Guards against saving stale messages when type prop changes
  const typeRef = useRef(type);
  const requestEpochRef = useRef(0);
  const isLoadingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from dataStore on mount or when type changes
  useEffect(() => {
    requestEpochRef.current += 1;
    const epoch = requestEpochRef.current;
    typeRef.current = type;
    isLoadingRef.current = true;
    setIsLoading(false);
    setInput('');
    setMessages([]);
    messagesRef.current = [];
    console.debug(`[ChatWindow] Loading chat history for type="${type}"`);
    startTransition(async () => {
      try {
        const savedMessages = await dataStore.getChatHistory(type);
        console.debug(
          `[ChatWindow] Received ${savedMessages?.length ?? 0} messages for type="${type}"`,
        );
        // Only apply if type hasn't changed again while loading
        if (typeRef.current === type && requestEpochRef.current === epoch) {
          const validMessages = savedMessages && Array.isArray(savedMessages) ? savedMessages : [];
          setMessages(validMessages);

          // Hydrate AI service so it remembers past conversation context
          if (type === 'tutor') {
            hydrateTutorHistory(validMessages);
          } else {
            hydrateBuddyHistory(validMessages);
          }
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      } finally {
        if (requestEpochRef.current === epoch) {
          isLoadingRef.current = false;
        }
      }
    });
  }, [type]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Memory capture: on session end/unmount, persist a lightweight summary for Android hub sync.
  useEffect(() => {
    return () => {
      try {
        const count = messagesRef.current.length;
        if (count <= 0) return;

        const date = new Date().toLocaleDateString();
        const topic = title ? ` Topic: ${title}.` : '';
        const summary = `Chat Session: ${date} - ${count} messages exchanged.${topic}`;

        // Fire-and-forget to avoid blocking navigation.
        void (async () => {
          try {
            await syncService.logEvent(summary, ['chat', 'session_end', 'android_client']);
          } catch (error) {
            // Never block navigation if SQLite/filesystem is unavailable.
            console.warn('SyncService.logEvent failed (non-fatal):', error);
          }
        })();
      } catch (error) {
        console.warn('ChatWindow memory capture failed (non-fatal):', error);
      }
    };
  }, [title]);

  // Save chat history whenever messages change — but NEVER during a type switch.
  // When type changes, the save effect fires with stale messages from the old type,
  // which would overwrite the new type's storage (the root cause of the collision bug).
  useEffect(() => {
    // Skip saving when we're in the middle of loading history for a new type
    if (isLoadingRef.current) {
      console.debug(`[ChatWindow] Skipping save — type switch in progress (type="${type}")`);
      return;
    }
    if (messages.length > 0) {
      console.debug(`[ChatWindow] Saving ${messages.length} messages for type="${type}"`);
      startTransition(async () => {
        try {
          // Double-check type hasn't changed since this effect was queued
          if (typeRef.current === type) {
            await dataStore.saveChatHistory(type, messages);
          } else {
            console.debug(
              `[ChatWindow] Aborted save — type mismatch: ref="${typeRef.current}" vs effect="${type}"`,
            );
          }
        } catch (error) {
          console.error('Failed to save chat history:', error);
        }
      });
    }
  }, [messages, type]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (trimmedInput === '' || isLoading) return;

    const requestEpoch = requestEpochRef.current;
    const requestType = typeRef.current;

    const userMessage: ChatMessage = { role: 'user', content: trimmedInput, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const responseContent = await onSendMessage(trimmedInput);
      if (requestEpochRef.current !== requestEpoch || typeRef.current !== requestType) {
        return;
      }
      if (!responseContent) {
        throw new Error('No response received');
      }
      const formattedResponse = formatAIResponse(responseContent);
      const modelMessage: ChatMessage = {
        role: 'model',
        content: formattedResponse,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      if (requestEpochRef.current !== requestEpoch || typeRef.current !== requestType) {
        return;
      }
      console.error('Chat error:', error);

      const errorMessages = [
        "I'm having trouble connecting right now. Please try again in a moment.",
        'Something went wrong on my end. Let me try to help you again.',
        "I'm experiencing some technical difficulties. Please retry your message.",
        "Oops! I couldn't process that. Mind giving it another shot?",
      ];

      const randomError = errorMessages[Math.floor(Math.random() * errorMessages.length)];
      const errorMessage: ChatMessage = {
        role: 'model',
        content: randomError ?? 'Something went wrong. Please try again.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      if (requestEpochRef.current === requestEpoch && typeRef.current === requestType) {
        setIsLoading(false);
      }
    }
  };

  const handleAskBuddy = (question: string) => {
    setInput(question);
    setShowSocialTips(false);
    setShowLifeSkills(false);
  };

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
        <div className="flex items-center justify-center gap-4 mb-4">
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
                  className="glass-card px-3 py-1.5 rounded-lg hover:bg-purple-500/20 transition-all text-sm flex items-center gap-1"
                  title="Daily Life Skills Checklist"
                >
                  <span>📋</span>
                  <span className="text-gray-300 text-xs">Life Skills</span>
                </button>
                <button
                  onClick={() => setShowSocialTips(true)}
                  className="glass-card px-3 py-1.5 rounded-lg hover:bg-purple-500/20 transition-all text-sm flex items-center gap-1"
                  title="Social Skills Tips"
                >
                  <span>💡</span>
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
                    console.error('Failed to clear chat history:', error);
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
                ? ['Help me with maths', 'Explain photosynthesis', 'Quiz me on history']
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
