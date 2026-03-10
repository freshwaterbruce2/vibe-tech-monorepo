import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { config } from '../config';
import type { AgentState } from '../services/HttpAgentAdapter';
import { HttpAgentAdapter } from '../services/HttpAgentAdapter';

const SECURE_TOKEN_KEY = 'nova-bridge-token';

/**
 * Custom storage adapter that splits sensitive data:
 * - bridgeToken → SecureStore (encrypted OS keychain)
 * - everything else → AsyncStorage
 */
const splitStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const raw = await AsyncStorage.getItem(name);
    if (!raw) return raw;

    try {
      const parsed = JSON.parse(raw) as { state?: { bridgeToken?: string } };
      // Re-inject the token from SecureStore
      if (Platform.OS !== 'web') {
        const secureToken = await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
        if (secureToken && parsed.state) {
          parsed.state.bridgeToken = secureToken;
        }
      }
      return JSON.stringify(parsed);
    } catch {
      return raw;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const parsed = JSON.parse(value) as { state?: { bridgeToken?: string } };
      // Extract token and store it securely
      if (parsed.state?.bridgeToken && Platform.OS !== 'web') {
        await SecureStore.setItemAsync(SECURE_TOKEN_KEY, parsed.state.bridgeToken);
        parsed.state.bridgeToken = ''; // Don't store token in AsyncStorage
      }
      await AsyncStorage.setItem(name, JSON.stringify(parsed));
    } catch {
      await AsyncStorage.setItem(name, value);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
    }
  },
};

interface ConnectionState {
  serverUrl: string;
  bridgeToken: string;
  adapter: HttpAgentAdapter | null;
  isConnected: boolean;
  agentStatus: AgentState | null;
  error: string | null;

  /** Initialize adapter with the current serverUrl */
  initialize: () => void;

  /** Update the server URL and re-initialize the adapter */
  setServerUrl: (url: string) => void;

  /** Update the bridge token and re-initialize the adapter */
  setBridgeToken: (token: string) => void;

  /** Check connection to the Nova bridge */
  checkConnection: () => Promise<void>;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set, get) => ({
      serverUrl: config.API_URL,
      bridgeToken: config.BRIDGE_TOKEN,
      adapter: null,
      isConnected: false,
      agentStatus: null,
      error: null,

      initialize: () => {
        const { serverUrl, bridgeToken } = get();
        const adapter = new HttpAgentAdapter(serverUrl);
        adapter.setBridgeToken(bridgeToken);
        set({ adapter });
      },

      setServerUrl: (url: string) => {
        const { bridgeToken } = get();
        const adapter = new HttpAgentAdapter(url);
        adapter.setBridgeToken(bridgeToken);
        set({ serverUrl: url, adapter, isConnected: false, error: null });
      },

      setBridgeToken: (token: string) => {
        const { serverUrl } = get();
        const adapter = new HttpAgentAdapter(serverUrl);
        adapter.setBridgeToken(token);
        set({ bridgeToken: token, adapter, isConnected: false, error: null });
      },

      checkConnection: async () => {
        const { adapter } = get();
        if (!adapter) {
          set({ isConnected: false, error: 'No adapter' });
          return;
        }

        try {
          const status = await adapter.getStatus();
          set({ isConnected: true, agentStatus: status, error: null });
        } catch (err) {
          set({
            isConnected: false,
            agentStatus: null,
            error: err instanceof Error ? err.message : 'Connection failed',
          });
        }
      },
    }),
    {
      name: 'nova-connection',
      storage: createJSONStorage(() => splitStorage),
      partialize: (state) => ({
        serverUrl: state.serverUrl,
        bridgeToken: state.bridgeToken,
      }),
    },
  ),
);

/** Resolves when the connection store has rehydrated */
export const connectionStoreHydrated = new Promise<void>((resolve) => {
  const unsub = useConnectionStore.persist.onFinishHydration(() => {
    unsub();
    resolve();
  });
  if (useConnectionStore.persist.hasHydrated()) resolve();
});
