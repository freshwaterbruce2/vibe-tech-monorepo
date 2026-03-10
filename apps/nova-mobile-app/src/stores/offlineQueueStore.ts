import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface QueuedMessage {
  id: string;
  content: string;
  timestamp: string;
}

interface OfflineQueueState {
  queue: QueuedMessage[];
  enqueue: (msg: QueuedMessage) => void;
  dequeue: (id: string) => void;
  clearQueue: () => void;
}

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set) => ({
      queue: [],

      enqueue: (msg) =>
        set((state) => ({
          queue: [...state.queue, msg],
        })),

      dequeue: (id) =>
        set((state) => ({
          queue: state.queue.filter((m) => m.id !== id),
        })),

      clearQueue: () => set({ queue: [] }),
    }),
    {
      name: 'nova-offline-queue',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
