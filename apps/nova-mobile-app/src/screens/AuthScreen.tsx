import * as Haptics from 'expo-haptics';
import { Activity, ShieldCheck, Unlink } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { config } from '../config';
import { useConnectionStore } from '../stores/connectionStore';

const T = config.THEME;

export function AuthScreen() {
  const {
    serverUrl,
    setServerUrl,
    bridgeToken,
    setBridgeToken,
    checkConnection,
    isConnected,
    error,
  } = useConnectionStore();

  const [inputUrl, setInputUrl] = useState(serverUrl);
  const [inputToken, setInputToken] = useState(bridgeToken);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    setServerUrl(inputUrl);
    setBridgeToken(inputToken);

    try {
      await checkConnection();
      if (useConnectionStore.getState().isConnected) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Activity size={48} color={T.ACCENT_CYAN} />
            <Text style={styles.title}>NOVA</Text>
            <Text style={styles.subtitle}>Connect to Agent Host</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Host URL</Text>
              <TextInput
                style={styles.input}
                value={inputUrl}
                onChangeText={setInputUrl}
                placeholder="http://10.0.2.2:3000"
                placeholderTextColor={T.TEXT_MUTED}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bridge Token</Text>
              <TextInput
                style={styles.input}
                value={inputToken}
                onChangeText={setInputToken}
                placeholder="Secret Token"
                placeholderTextColor={T.TEXT_MUTED}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {error && !isConnected && (
              <View style={styles.errorBox}>
                <Unlink size={16} color={T.STATUS_ERROR} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.connectBtn}
              onPress={() => void handleConnect()}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator color={T.BACKGROUND} />
              ) : (
                <>
                  <ShieldCheck size={20} color={T.BACKGROUND} style={{ marginRight: 8 }} />
                  <Text style={styles.connectText}>Connect to Host</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.BACKGROUND,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    color: T.ACCENT_CYAN,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 16,
  },
  subtitle: {
    color: T.TEXT_MUTED,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  form: {
    backgroundColor: T.SURFACE,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: T.BORDER,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: T.TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: T.SURFACE_ELEVATED,
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: T.TEXT_PRIMARY,
    fontSize: 16,
    borderWidth: 1,
    borderColor: T.BORDER,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.STATUS_ERROR + '20',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: T.STATUS_ERROR,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  connectBtn: {
    backgroundColor: T.ACCENT_CYAN,
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  connectText: {
    color: T.BACKGROUND,
    fontSize: 16,
    fontWeight: '700',
  },
});
