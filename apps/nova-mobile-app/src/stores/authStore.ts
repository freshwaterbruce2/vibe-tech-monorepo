import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
  biometricEnabled: boolean;
  isUnlocked: boolean;
  toggleBiometric: () => Promise<void>;
  authenticate: () => Promise<boolean>;
  lock: () => void;
  unlock: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      biometricEnabled: false,
      isUnlocked: true,

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
      partialize: (state) => ({ biometricEnabled: state.biometricEnabled }),
    },
  ),
);
