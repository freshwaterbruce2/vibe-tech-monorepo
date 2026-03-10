import { WifiOff } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { config } from '../config';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const T = config.THEME;

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <WifiOff size={14} color="#fff" />
      <Text style={styles.text}>No internet — messages will be queued</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: T.STATUS_OFFLINE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
