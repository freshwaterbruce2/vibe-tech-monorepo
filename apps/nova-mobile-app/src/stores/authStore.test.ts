import { Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore } from './authStore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: (obj: Record<string, any>) => obj.ios ?? obj.default,
  },
  Alert: {
    alert: vi.fn(),
  },
}));

vi.mock('expo-local-authentication', () => ({
  hasHardwareAsync: vi.fn(),
  isEnrolledAsync: vi.fn(),
  authenticateAsync: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the store state to defaults
    useAuthStore.setState({
      biometricEnabled: false,
      isUnlocked: true,
    });
  });

  describe('toggleBiometric', () => {
    it('should disable biometrics without hardware check if already enabled', async () => {
      useAuthStore.setState({ biometricEnabled: true });

      await useAuthStore.getState().toggleBiometric();

      expect(useAuthStore.getState().biometricEnabled).toBe(false);
      expect(useAuthStore.getState().isUnlocked).toBe(true);
      expect(LocalAuthentication.hasHardwareAsync).not.toHaveBeenCalled();
    });

    it('should alert and not enable if device has no biometric hardware', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(false);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);

      await useAuthStore.getState().toggleBiometric();

      expect(useAuthStore.getState().biometricEnabled).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Not Available',
        expect.stringContaining('Biometric authentication is not set up'),
      );
    });

    it('should alert and not enable if device has no enrolled biometrics', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(false);

      await useAuthStore.getState().toggleBiometric();

      expect(useAuthStore.getState().biometricEnabled).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Not Available',
        expect.stringContaining('Biometric authentication is not set up'),
      );
    });

    it('should not enable if authentication fails when trying to turn it on', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });

      await useAuthStore.getState().toggleBiometric();

      expect(useAuthStore.getState().biometricEnabled).toBe(false);
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Verify to enable biometric lock',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
    });

    it('should enable if authentication succeeds when trying to turn it on', async () => {
      vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
      vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({
        success: true,
      });

      await useAuthStore.getState().toggleBiometric();

      expect(useAuthStore.getState().biometricEnabled).toBe(true);
      expect(useAuthStore.getState().isUnlocked).toBe(true);
    });
  });

  describe('authenticate', () => {
    it('should unlock and return true if authentication is successful', async () => {
      useAuthStore.setState({ isUnlocked: false });
      vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({
        success: true,
      });

      const result = await useAuthStore.getState().authenticate();

      expect(result).toBe(true);
      expect(useAuthStore.getState().isUnlocked).toBe(true);
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Unlock NOVA',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
    });

    it('should remain locked and return false if authentication fails', async () => {
      useAuthStore.setState({ isUnlocked: false });
      vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({
        success: false,
        error: 'unknown',
      });

      const result = await useAuthStore.getState().authenticate();

      expect(result).toBe(false);
      expect(useAuthStore.getState().isUnlocked).toBe(false);
    });
  });

  describe('lock and unlock', () => {
    it('should lock the store', () => {
      useAuthStore.getState().lock();
      expect(useAuthStore.getState().isUnlocked).toBe(false);
    });

    it('should unlock the store', () => {
      useAuthStore.setState({ isUnlocked: false });
      useAuthStore.getState().unlock();
      expect(useAuthStore.getState().isUnlocked).toBe(true);
    });
  });
});
