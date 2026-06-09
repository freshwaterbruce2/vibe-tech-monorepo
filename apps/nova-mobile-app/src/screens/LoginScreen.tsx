import * as Haptics from 'expo-haptics';
import { Lock, ShieldAlert } from 'lucide-react-native';
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
import { useAuthStore } from '../stores/authStore';

const T = config.THEME;

export function LoginScreen() {
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setError(null);
    try {
      await login(email, password);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err.message || 'Login failed';
      setError(errMsg);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
            <View style={styles.iconContainer}>
              <Lock size={36} color={T.ACCENT_CYAN} />
            </View>
            <Text style={styles.title}>NOVA</Text>
            <Text style={styles.subtitle}>Enter your credentials to connect</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="developer@vibetech.com"
                placeholderTextColor={T.TEXT_MUTED}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={T.TEXT_MUTED}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
              />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <ShieldAlert size={18} color={T.STATUS_ERROR} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => void handleLogin()}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={T.BACKGROUND} />
              ) : (
                <Text style={styles.loginText}>Sign In</Text>
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
    marginBottom: 40,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.BORDER,
  },
  title: {
    color: T.ACCENT_CYAN,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 16,
  },
  subtitle: {
    color: T.TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
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
    fontSize: 12,
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
    backgroundColor: T.STATUS_ERROR + '15',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: T.STATUS_ERROR + '30',
  },
  errorText: {
    color: T.STATUS_ERROR,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  loginBtn: {
    backgroundColor: T.ACCENT_CYAN,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginText: {
    color: T.BACKGROUND,
    fontSize: 16,
    fontWeight: '700',
  },
});
