import { syncService } from '@/services';
import { useEffect, useRef, useState, useTransition } from 'react';
import { hydrateBuddyHistory } from '../services/buddyService';
import { dataStore } from '../services/dataStore';
import { hydrateTutorHistory } from '../services/tutorService';
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
  title: string;
  type: "tutor" | "friend";
  onSendMessage: (message: string) => Promise<string>;
}

export function useChatMessages({ title, type, onSendMessage }: UseChatMessagesProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  return {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    showLifeSkills,
    setShowLifeSkills,
    showSocialTips,
    setShowSocialTips,
    messagesEndRef,
    handleSend,
    handleAskBuddy,
    startTransition,
  };
}
