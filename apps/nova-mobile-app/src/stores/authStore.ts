import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { apiClient, setClientAuthToken } from '../api/client';

interface UserInfo {
  id: string;
  email: string;
  fullName: string;
}

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  isLoading: boolean;
  biometricEnabled: boolean;
  isUnlocked: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleBiometric: () => Promise<void>;
  authenticate: () => Promise<boolean>;
  lock: () => void;
  unlock: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: false,
      biometricEnabled: false,
      isUnlocked: true,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.post('/auth/login', { email, password });
          const { token, user } = response.data;
          set({ token, user, isLoading: false, isUnlocked: true });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ token: null, user: null, isUnlocked: true });
      },

      toggleBiometric: async () => {
        const current = get().biometricEnabled;

        if (!current) {
          // Turning ON: check if device supports biometric
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();

          if (!hasHardware || !isEnrolled) {
            Alert.alert(
              'Not Available',
              'Biometric authentication is not set up on this device. Please configure fingerprint or face ID in your device settings.',
            );
            return;
          }

          // Verify user can authenticate before enabling
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Verify to enable biometric lock',
            cancelLabel: 'Cancel',
            disableDeviceFallback: false,
          });

          if (!result.success) return;
        }

        set({ biometricEnabled: !current, isUnlocked: true });
      },

      authenticate: async () => {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock NOVA',
          cancelLabel: 'Cancel',
          disableDeviceFallback: false,
        });

        if (result.success) {
          set({ isUnlocked: true });
          return true;
        }
        return false;
      },

      lock: () => set({ isUnlocked: false }),
      unlock: () => set({ isUnlocked: true }),
    }),
    {
      name: 'nova-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        biometricEnabled: state.biometricEnabled,
      }),
    },
  ),
);

// Subscribe to token changes to keep apiClient headers updated
useAuthStore.subscribe((state) => {
  setClientAuthToken(state.token);
});
