import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string for serialization
  status?: 'sending' | 'sent' | 'error' | 'queued';
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  addMessage: (msg: ChatMessage) => void;
  updateMessageStatus: (id: string, status: ChatMessage['status']) => void;
  removeMessage: (id: string) => void;
  clearHistory: () => void;
  setLoading: (loading: boolean) => void;
}

const MAX_PERSISTED_MESSAGES = 200;

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      isLoading: false,

      addMessage: (msg) =>
        set((state) => ({
          messages: [...state.messages, msg].slice(-MAX_PERSISTED_MESSAGES),
        })),

      updateMessageStatus: (id, status) =>
        set((state) => ({
          messages: state.messages.map((m) => (m.id === id ? { ...m, status } : m)),
        })),

      removeMessage: (id) =>
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== id),
        })),

      clearHistory: () => set({ messages: [] }),

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'nova-chat-history',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ messages: state.messages }),
    },
  ),
);

/** Resolves when the chat store has rehydrated from AsyncStorage */
export const chatStoreHydrated = new Promise<void>((resolve) => {
  const unsub = useChatStore.persist.onFinishHydration(() => {
    unsub();
    resolve();
  });
  // If already hydrated (e.g. sync storage), resolve immediately
  if (useChatStore.persist.hasHydrated()) resolve();
});
