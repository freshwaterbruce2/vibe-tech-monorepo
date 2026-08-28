import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  FirebaseAuthService,
  FirebaseDoorService,
  FirebasePalletService,
  FirebaseUserService,
  FirebaseSyncService
} from '@/firebase/services';
import { useTenantApi } from '@/services/tenantApiService';

interface FirebaseSyncState {
  user: User | null;
  isLoading: boolean;
  isOnline: boolean;
  lastSyncAt: Date | null;
  syncError: string | null;
}

interface UseFirebaseSyncReturn extends FirebaseSyncState {
  // Authentication methods
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;

  // Sync methods
  syncToFirebase: () => Promise<void>;
  syncFromFirebase: () => Promise<void>;
  enableOfflineMode: () => Promise<void>;
  enableOnlineMode: () => Promise<void>;

  // Data methods
  saveDoorEntry: (entry: any) => Promise<void>;
  updatePalletCount: (doorNumber: number, count: number) => Promise<void>;
}

/**
 * Custom hook for Firebase integration with existing shipping PWA
 * Provides seamless sync between localStorage and Firebase
 */
export const useFirebaseSync = (): UseFirebaseSyncReturn => {
  const [state, setState] = useState<FirebaseSyncState>({
    user: null,
    isLoading: true,
    isOnline: navigator.onLine,
    lastSyncAt: null,
    syncError: null
  });

  const tenantApi = useTenantApi();

  // Monitor authentication state
  useEffect(() => {
    const unsubscribe = FirebaseAuthService.onAuthStateChange((user) => {
      setState(prev => ({
        ...prev,
        user,
        isLoading: false
      }));

      // Update last login if user is signed in
      if (user) {
        FirebaseUserService.updateLastLogin(user.uid).catch(console.error);
      }
    });

    return unsubscribe;
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      // Auto-sync when coming back online
      if (state.user) {
        syncToFirebase().catch(console.error);
      }
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [state.user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Authentication methods
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, syncError: null }));
      await FirebaseAuthService.signIn(email, password);

      // Try to sync data after successful login
      await syncFromFirebase();
    } catch (error) {
      setState(prev => ({
        ...prev,
        syncError: error instanceof Error ? error.message : 'Sign in failed'
      }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, syncError: null }));
      const user = await FirebaseAuthService.signUp(email, password);

      // Create user profile
      const tenantCredentials = tenantApi.getCredentials();
      await FirebaseUserService.createUserProfile(user.uid, {
        email: user.email ?? email,
        tenantId: tenantCredentials?.tenantId,
        role: 'user'
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        syncError: error instanceof Error ? error.message : 'Sign up failed'
      }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [tenantApi]);

  const signOut = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, syncError: null }));
      await FirebaseAuthService.signOut();
    } catch (error) {
      setState(prev => ({
        ...prev,
        syncError: error instanceof Error ? error.message : 'Sign out failed'
      }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Sync methods
  const syncToFirebase = useCallback(async () => {
    if (!state.user) {
      throw new Error('User must be authenticated to sync data');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, syncError: null }));

      const tenantCredentials = tenantApi.getCredentials();
      if (!tenantCredentials?.tenantId) {
        throw new Error('No tenant ID available for sync');
      }

      await FirebaseSyncService.syncLocalDataToFirebase(tenantCredentials.tenantId);

      setState(prev => ({
        ...prev,
        lastSyncAt: new Date(),
        syncError: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        syncError: error instanceof Error ? error.message : 'Sync to Firebase failed'
      }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.user, tenantApi]);

  const syncFromFirebase = useCallback(async () => {
    if (!state.user) {
      throw new Error('User must be authenticated to sync data');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, syncError: null }));

      const tenantCredentials = tenantApi.getCredentials();
      if (!tenantCredentials?.tenantId) {
        throw new Error('No tenant ID available for sync');
      }

      await FirebaseSyncService.syncFirebaseToLocalData(tenantCredentials.tenantId);

      setState(prev => ({
        ...prev,
        lastSyncAt: new Date(),
        syncError: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        syncError: error instanceof Error ? error.message : 'Sync from Firebase failed'
      }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.user, tenantApi]);

  const enableOfflineMode = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, syncError: null }));
      // Note: Firebase offline is automatically handled, this is for UI state
      setState(prev => ({ ...prev, isOnline: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        syncError: error instanceof Error ? error.message : 'Failed to enable offline mode'
      }));
      throw error;
    }
  }, []);

  const enableOnlineMode = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, syncError: null }));
      setState(prev => ({ ...prev, isOnline: true }));

      // Auto-sync when going online
      if (state.user) {
        await syncToFirebase();
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        syncError: error instanceof Error ? error.message : 'Failed to enable online mode'
      }));
      throw error;
    }
  }, [state.user, syncToFirebase]);

  // Data methods
  const saveDoorEntry = useCallback(async (entry: any) => {
    if (!state.user) {
      // Save to localStorage only if not authenticated
      const doorEntries = JSON.parse(localStorage.getItem('doorEntries') ?? '[]');
      doorEntries.push({ ...entry, id: Date.now().toString() });
      localStorage.setItem('doorEntries', JSON.stringify(doorEntries));
      return;
    }

    try {
      const tenantCredentials = tenantApi.getCredentials();
      if (!tenantCredentials?.tenantId) {
        throw new Error('No tenant ID available');
      }

      // Save to Firebase
      await FirebaseDoorService.saveDoorEntry({
        ...entry,
        tenantId: tenantCredentials.tenantId
      });

      // Also save to localStorage for offline access
      const doorEntries = JSON.parse(localStorage.getItem('doorEntries') ?? '[]');
      doorEntries.push(entry);
      localStorage.setItem('doorEntries', JSON.stringify(doorEntries));
    } catch (error) {
      setState(prev => ({
        ...prev,
        syncError: error instanceof Error ? error.message : 'Failed to save door entry'
      }));
      throw error;
    }
  }, [state.user, tenantApi]);

  const updatePalletCount = useCallback(async (doorNumber: number, count: number) => {
    if (!state.user) {
      // Save to localStorage only if not authenticated
      const palletData = JSON.parse(localStorage.getItem('palletData') ?? '{}');
      palletData[doorNumber.toString()] = count;
      localStorage.setItem('palletData', JSON.stringify(palletData));
      return;
    }

    try {
      const tenantCredentials = tenantApi.getCredentials();
      if (!tenantCredentials?.tenantId) {
        throw new Error('No tenant ID available');
      }

      // Update in Firebase
      await FirebasePalletService.updatePalletCount(
        tenantCredentials.tenantId,
        doorNumber,
        count
      );

      // Also update localStorage for offline access
      const palletData = JSON.parse(localStorage.getItem('palletData') ?? '{}');
      palletData[doorNumber.toString()] = count;
      localStorage.setItem('palletData', JSON.stringify(palletData));
    } catch (error) {
      setState(prev => ({
        ...prev,
        syncError: error instanceof Error ? error.message : 'Failed to update pallet count'
      }));
      throw error;
    }
  }, [state.user, tenantApi]);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    syncToFirebase,
    syncFromFirebase,
    enableOfflineMode,
    enableOnlineMode,
    saveDoorEntry,
    updatePalletCount
  };
};