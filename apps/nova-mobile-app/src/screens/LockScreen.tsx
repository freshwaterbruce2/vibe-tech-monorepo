import * as Haptics from 'expo-haptics';
import { Fingerprint } from 'lucide-react-native';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { config } from '../config';
import { useAuthStore } from '../stores/authStore';

const T = config.THEME;

export function LockScreen() {
  const { authenticate } = useAuthStore();

  const handleUnlock = async () => {
    const success = await authenticate();
    if (success) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>NOVA</Text>
        <Text style={styles.subtitle}>Locked</Text>

        <TouchableOpacity style={styles.unlockBtn} onPress={() => void handleUnlock()}>
          <Fingerprint size={48} color={T.ACCENT_CYAN} />
        </TouchableOpacity>

        <Text style={styles.hint}>Tap to unlock with biometrics</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.BACKGROUND,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    color: T.ACCENT_CYAN,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 4,
  },
  subtitle: {
    color: T.TEXT_MUTED,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 32,
  },
  unlockBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: T.SURFACE_ELEVATED,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: T.ACCENT_CYAN + '44',
  },
  hint: {
    color: T.TEXT_MUTED,
    fontSize: 13,
    marginTop: 16,
  },
});
