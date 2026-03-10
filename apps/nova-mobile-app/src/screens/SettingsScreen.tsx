import * as Haptics from 'expo-haptics';
import {
  Fingerprint,
  Info,
  Key,
  Save,
  Server,
  Shield,
  Settings as SettingsIcon,
  Trash2,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { config } from '../config';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useConnectionStore } from '../stores/connectionStore';

export function SettingsScreen() {
  const { serverUrl, bridgeToken, setServerUrl, setBridgeToken, checkConnection } =
    useConnectionStore();
  const { clearHistory } = useChatStore();
  const { biometricEnabled, toggleBiometric } = useAuthStore();
  const [urlInput, setUrlInput] = useState(serverUrl);
  const [tokenInput, setTokenInput] = useState(bridgeToken);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const url = urlInput.trim();
    if (!url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      Alert.alert('Invalid URL', 'URL must start with http:// or https://');
      return;
    }

    setServerUrl(url);
    if (tokenInput.trim()) setBridgeToken(tokenInput.trim());

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    await checkConnection();
  };

  const handleClearHistory = () => {
    Alert.alert('Clear Chat History', 'This will delete all messages. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          clearHistory();
        },
      },
    ]);
  };

  const handleBiometricToggle = async () => {
    await toggleBiometric();
    void Haptics.selectionAsync();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <SettingsIcon size={22} color={T.ACCENT_CYAN} />
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Server URL */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Server size={16} color={T.TEXT_SECONDARY} />
            <Text style={styles.sectionTitle}>Server URL</Text>
          </View>
          <Text style={styles.hint}>
            iOS Sim: localhost {'\u2022'} Android Emu: 10.0.2.2 {'\u2022'} Device: LAN IP or use
            ADB reverse
          </Text>
          <TextInput
            style={styles.urlInput}
            value={urlInput}
            onChangeText={setUrlInput}
            placeholder="http://10.0.2.2:3000"
            placeholderTextColor={T.TEXT_MUTED}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <View style={[styles.sectionHeader, { marginTop: 12 }]}>
            <Key size={16} color={T.TEXT_SECONDARY} />
            <Text style={styles.sectionTitle}>Bridge Token</Text>
          </View>
          <Text style={styles.hint}>
            The secret token used to authenticate with the desktop server.
          </Text>
          <TextInput
            style={styles.urlInput}
            value={tokenInput}
            onChangeText={setTokenInput}
            placeholder="nova_default_secret_token_change_me"
            placeholderTextColor={T.TEXT_MUTED}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => void handleSave()}
          >
            <Save size={16} color="#fff" />
            <Text style={styles.saveBtnText}>{saved ? 'Saved \u2713' : 'Save & Reconnect'}</Text>
          </TouchableOpacity>
        </View>

        {/* Security */}
        {config.FEATURES.BIOMETRIC_AUTH && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield size={16} color={T.TEXT_SECONDARY} />
              <Text style={styles.sectionTitle}>Security</Text>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLabel}>
                <Fingerprint size={18} color={T.TEXT_SECONDARY} />
                <Text style={styles.settingText}>Biometric Lock</Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={() => void handleBiometricToggle()}
                trackColor={{ false: T.BORDER, true: T.ACCENT_CYAN + '66' }}
                thumbColor={biometricEnabled ? T.ACCENT_CYAN : T.TEXT_MUTED}
              />
            </View>
            <Text style={styles.hint}>
              Require fingerprint or face ID to open the app after backgrounding.
            </Text>
          </View>
        )}

        {/* Chat history */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chat History</Text>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={handleClearHistory}
          >
            <Trash2 size={16} color={T.STATUS_ERROR} />
            <Text style={styles.dangerBtnText}>Clear All Messages</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={16} color={T.TEXT_SECONDARY} />
            <Text style={styles.sectionTitle}>About</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>App Version</Text>
            <Text style={styles.aboutValue}>{config.APP_VERSION}</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Architecture</Text>
            <Text style={styles.aboutValue}>Bridge (HTTP → Desktop)</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Ecosystem</Text>
            <Text style={styles.aboutValue}>Vibe Tech</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const T = config.THEME;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.BACKGROUND },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: T.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: T.BORDER,
    gap: 10,
  },
  headerTitle: { color: T.TEXT_PRIMARY, fontSize: 18, fontWeight: '700' },
  content: { padding: 16, gap: 20 },
  section: {
    backgroundColor: T.SURFACE_ELEVATED,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.BORDER,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { color: T.TEXT_PRIMARY, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  hint: { color: T.TEXT_MUTED, fontSize: 12, marginBottom: 10, lineHeight: 16 },
  urlInput: {
    backgroundColor: T.BACKGROUND,
    color: T.TEXT_PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 14,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: T.BORDER,
    marginBottom: 12,
  },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: T.ACCENT_CYAN,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
    marginBottom: 4,
  },
  settingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingText: { color: T.TEXT_PRIMARY, fontSize: 15 },
  dangerBtn: {
    flexDirection: 'row',
    minHeight: 44,
    alignItems: 'center',
    gap: 8,
  },
  dangerBtnText: { color: T.STATUS_ERROR, fontWeight: '600', fontSize: 14 },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  aboutLabel: { color: T.TEXT_SECONDARY, fontSize: 14 },
  aboutValue: { color: T.TEXT_PRIMARY, fontSize: 14, fontWeight: '600' },
});
