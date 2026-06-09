import { create } from 'zustand';
import { apiClient } from '../api/client';

interface AppState {
  isConnected: boolean;
  checkConnection: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  isConnected: false,

  checkConnection: async () => {
    try {
      // Ping the backend's health check endpoint
      const response = await apiClient.get('/health');
      if (response.status === 200) {
        set({ isConnected: true });
      }
    } catch (error) {
      set({ isConnected: false });
    }
  },
}));
