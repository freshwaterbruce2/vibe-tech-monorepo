import * as Haptics from 'expo-haptics';
import { Activity, RefreshCw, Wifi, WifiOff } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { config } from '../config';
import { useConnectionStore } from '../stores/connectionStore';

export function StatusScreen() {
  const { adapter, isConnected, agentStatus, checkConnection } = useConnectionStore();
  const [health, setHealth] = useState<{ ok: boolean; uptime: number } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!adapter) return;
    setIsRefreshing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await checkConnection();
      const h = await adapter.getHealth();
      setHealth(h);
    } catch {
      setHealth(null);
    } finally {
      setIsRefreshing(false);
    }
  }, [adapter, checkConnection]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const formatUptime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Activity size={22} color={T.ACCENT_CYAN} />
        <Text style={styles.headerTitle}>Status</Text>
        <TouchableOpacity
          onPress={() => void refresh()}
          style={styles.refreshBtn}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator color={T.ACCENT_CYAN} size="small" />
          ) : (
            <RefreshCw size={18} color={T.ACCENT_CYAN} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={!!isRefreshing} onRefresh={() => void refresh()} />}
      >
        {/* Connection card */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            {isConnected ? (
              <Wifi size={20} color={T.STATUS_ONLINE} />
            ) : (
              <WifiOff size={20} color={T.STATUS_OFFLINE} />
            )}
            <Text style={styles.cardLabel}>Connection</Text>
          </View>
          <Text
            style={[styles.cardValue, { color: isConnected ? T.STATUS_ONLINE : T.STATUS_OFFLINE }]}
          >
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>

        {/* Agent status */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Agent Status</Text>
          <Text style={styles.cardValue}>{agentStatus?.status ?? 'Unknown'}</Text>
          {!!agentStatus?.currentTask && (
            <Text style={styles.cardSub}>Task: {agentStatus.currentTask}</Text>
          )}
        </View>

        {/* Health / uptime */}
        {health && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Server Uptime</Text>
            <Text style={styles.cardValue}>{formatUptime(health.uptime)}</Text>
          </View>
        )}

        {/* Server URL display */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Server URL</Text>
          <Text style={styles.cardMono}>{useConnectionStore.getState().serverUrl}</Text>
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
  headerTitle: { color: T.TEXT_PRIMARY, fontSize: 18, fontWeight: '700', flex: 1 },
  refreshBtn: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { padding: 16, gap: 12 },
  card: {
    backgroundColor: T.SURFACE_ELEVATED,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.BORDER,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardLabel: { color: T.TEXT_SECONDARY, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  cardValue: { color: T.TEXT_PRIMARY, fontSize: 20, fontWeight: '700' },
  cardSub: { color: T.TEXT_MUTED, fontSize: 13, marginTop: 4 },
  cardMono: { color: T.ACCENT_CYAN, fontSize: 14, fontFamily: 'monospace', marginTop: 2 },
});
