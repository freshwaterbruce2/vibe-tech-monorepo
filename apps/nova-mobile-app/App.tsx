import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Component, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  AppState,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type AppStateStatus,
} from 'react-native';
import { config } from './src/config';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthScreen } from './src/screens/AuthScreen';
import { LockScreen } from './src/screens/LockScreen';
import { registerForPushNotificationsAsync } from './src/services/pushNotificationService';
import { useAuthStore } from './src/stores/authStore';
import { chatStoreHydrated } from './src/stores/chatStore';
import { connectionStoreHydrated, useConnectionStore } from './src/stores/connectionStore';

// ── Error Boundary ──────────────────────────────────────────────────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  async render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <View style={styles.errContainer}>
          <StatusBar backgroundColor="#1a0000" barStyle="light-content" />
          <Text style={styles.errTitle}>App Crash Caught</Text>
          <ScrollView style={styles.errScroll}>
            <Text style={styles.errName}>{err.name}</Text>
            <Text style={styles.errMsg}>{err.message}</Text>
            <Text style={styles.errStack}>{err.stack}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

// ── Loading Screen ──────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <StatusBar backgroundColor={config.THEME.BACKGROUND} barStyle="light-content" />
      <Text style={styles.loadingTitle}>NOVA</Text>
      <ActivityIndicator size="large" color={config.THEME.ACCENT_CYAN} style={{ marginTop: 16 }} />
    </View>
  );
}

// ── App Content ─────────────────────────────────────────────────────────────
function AppContent() {
  const [hydrated, setHydrated] = useState(false);
  const { initialize, checkConnection, isConnected } = useConnectionStore();
  const { biometricEnabled, isUnlocked, lock } = useAuthStore();

  // Wait for stores to rehydrate from AsyncStorage
  useEffect(() => {
    Promise.all([chatStoreHydrated, connectionStoreHydrated])
      .then(() => {
        setHydrated(true);
      })
      .catch((err: unknown) => console.error('Failed to rehydrate stores:', err));
  }, []);

  // Initialize connection after hydration
  useEffect(() => {
    if (!hydrated) return;

    initialize();
    void checkConnection().catch(console.error);
    void registerForPushNotificationsAsync()
      .then((token) => {
        const { adapter } = useConnectionStore.getState();
        if (token && adapter) {
          adapter
            .registerDevice(token)
            .catch((e: unknown) => console.error('Failed to register device:', e));
        }
      })
      .catch(console.error);
  }, [hydrated, initialize, checkConnection]);

  // Re-lock on app background when biometric is enabled
  useEffect(() => {
    if (!config.FEATURES.BIOMETRIC_AUTH) return;

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'background' && biometricEnabled) {
        lock();
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [biometricEnabled, lock]);

  if (!hydrated) return <LoadingScreen />;

  // Show lock screen if biometric is enabled and not unlocked
  if (config.FEATURES.BIOMETRIC_AUTH && biometricEnabled && !isUnlocked) {
    return <LockScreen />;
  }

  // Show AuthScreen if not connected to the backend
  if (!isConnected) {
    return <AuthScreen />;
  }

  return (
    <>
      <ExpoStatusBar style="light" />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errContainer: { flex: 1, backgroundColor: '#1a0000', padding: 20, paddingTop: 60 },
  errTitle: { color: '#ff4444', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  errName: { color: '#ff8888', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  errMsg: { color: '#ffaaaa', fontSize: 14, marginBottom: 12 },
  errScroll: { flex: 1 },
  errStack: { color: '#cc6666', fontSize: 11, fontFamily: 'monospace' },
  loadingContainer: {
    flex: 1,
    backgroundColor: config.THEME.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    color: config.THEME.ACCENT_CYAN,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 4,
  },
});
