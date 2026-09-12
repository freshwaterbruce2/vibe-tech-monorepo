import { logger } from '../utils/logger';
import { useEffect, useRef, useState, useTransition } from 'react';
import { clearBuddyHistory, hydrateBuddyHistory } from '../services/buddyService';
import { dataStore } from '../services/dataStore';
import { clearTutorHistory, hydrateTutorHistory } from '../services/tutorService';
import { isDevBuild } from '../config';
import type { ChatMessage } from '../types';

const formatAIResponse = (text: string): string => {
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

interface UseChatMessagesProps {
  type: "tutor" | "friend";
  onSendMessage: (message: string) => Promise<string>;
}

export function useChatMessages({ type, onSendMessage }: UseChatMessagesProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyStatus, setHistoryStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [showLifeSkills, setShowLifeSkills] = useState(false);
  const [showSocialTips, setShowSocialTips] = useState(false);
  const [, startTransition] = useTransition();

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
    setHistoryStatus('loading');
    setHistoryError(null);
    setInput('');
    setMessages([]);
    messagesRef.current = [];
    logger.debug(`[ChatWindow] Loading chat history for type="${type}"`);
    startTransition(async () => {
      try {
        const savedMessages = await dataStore.getChatHistory(type);
        logger.debug(
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
          setHistoryStatus('ready');
        }
      } catch (error) {
        logger.error('Failed to load chat history:', error);
        if (requestEpochRef.current === epoch) {
          setHistoryStatus('error');
          setHistoryError('Your saved chat could not be loaded. Retry before sending a message.');
        }
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

  // Save chat history whenever messages change — but NEVER during a type switch.
  // When type changes, the save effect fires with stale messages from the old type,
  // which would overwrite the new type's storage (the root cause of the collision bug).
  useEffect(() => {
    // Skip saving when we're in the middle of loading history for a new type
    if (isLoadingRef.current) {
      logger.debug(`[ChatWindow] Skipping save — type switch in progress (type="${type}")`);
      return;
    }
    if (messages.length > 0) {
      logger.debug(`[ChatWindow] Saving ${messages.length} messages for type="${type}"`);
      startTransition(async () => {
        try {
          // Double-check type hasn't changed since this effect was queued
          if (typeRef.current === type) {
            await dataStore.saveChatHistory(type, messages);
          } else {
            logger.debug(
              `[ChatWindow] Aborted save — type mismatch: ref="${typeRef.current}" vs effect="${type}"`,
            );
          }
        } catch (error) {
          logger.error('Failed to save chat history:', error);
          if (typeRef.current === type) {
            setPersistenceError('Your message is visible, but saving it failed. Retry after checking storage.');
          }
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
    if (trimmedInput === '' || isLoading || isLoadingRef.current || historyStatus !== 'ready') return;

    const requestEpoch = requestEpochRef.current;
    const requestType = typeRef.current;

    const userMessage: ChatMessage = { role: 'user', content: trimmedInput, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setPersistenceError(null);
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
      setPersistenceError(null);
    } catch (error) {
      if (requestEpochRef.current !== requestEpoch || typeRef.current !== requestType) {
        return;
      }
      logger.error('Chat error:', error);

      const detail = error instanceof Error ? error.message.trim() : '';
      if (/quiet hours/i.test(detail)) {
        setPersistenceError(detail);
      } else if (/daily .*limit|usage controls|included AI allowance/i.test(detail)) {
        setPersistenceError(detail);
      } else if (/401|entitlement|license|unauthorized/i.test(detail)) {
        const base = 'Google Play purchase could not be verified. Please ensure you are signed in to the Play Store account used to purchase Vibe Tutor.';
        setPersistenceError(isDevBuild && detail ? `${base} [HTTP 401: ${detail}]` : base);
      } else if (/ai_unavailable|temporarily unavailable|quota-contention|503/i.test(detail)) {
        const base = 'The AI service is temporarily busy. Retrying in a moment...';
        setPersistenceError(isDevBuild && detail ? `${base} [HTTP 503: ${detail}]` : base);
      } else if (/timeout|abort|network|connection|failed to fetch/i.test(detail)) {
        const base = 'Trouble connecting to the network. Please check your connection and retry.';
        setPersistenceError(isDevBuild && detail ? `${base} [Network: ${detail}]` : base);
      } else {
        const base = 'The response did not arrive. Your message was not saved as an AI reply; please retry.';
        setPersistenceError(isDevBuild && detail ? `${base} [Debug: ${detail}]` : base);
      }
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

  const retryHistoryLoad = () => {
    // A new epoch makes any previous load or reply ineligible to update this chat.
    requestEpochRef.current += 1;
    const epoch = requestEpochRef.current;
    isLoadingRef.current = true;
    setHistoryStatus('loading');
    setHistoryError(null);
    void dataStore
      .getChatHistory(type)
      .then((savedMessages) => {
        if (typeRef.current !== type || requestEpochRef.current !== epoch) return;
        const validMessages = Array.isArray(savedMessages) ? savedMessages : [];
        setMessages(validMessages);
        if (type === 'tutor') hydrateTutorHistory(validMessages);
        else hydrateBuddyHistory(validMessages);
        setHistoryStatus('ready');
      })
      .catch(() => {
        if (requestEpochRef.current === epoch) {
          setHistoryStatus('error');
          setHistoryError('Your saved chat could not be loaded. Retry before sending a message.');
        }
      })
      .finally(() => {
        if (requestEpochRef.current === epoch) isLoadingRef.current = false;
      });
  };

  const clearChat = async (): Promise<void> => {
    requestEpochRef.current += 1;
    const epoch = requestEpochRef.current;
    const previousMessages = messagesRef.current;
    setMessages([]);
    messagesRef.current = [];
    setPersistenceError(null);
    try {
      await dataStore.saveChatHistory(type, []);
      if (requestEpochRef.current !== epoch || typeRef.current !== type) return;
      if (type === 'tutor') clearTutorHistory();
      else clearBuddyHistory();
    } catch (error) {
      logger.error('Failed to clear chat history:', error);
      if (requestEpochRef.current === epoch && typeRef.current === type) {
        setMessages(previousMessages);
        messagesRef.current = previousMessages;
        setPersistenceError('Could not clear this chat. Your messages were restored; please retry.');
      }
    }
  };

  return {
    messages,
    setMessages,
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
    startTransition,
  };
}
