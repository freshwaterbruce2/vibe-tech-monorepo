import { Brain, Search } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MemoryCard } from '../components/MemoryCard';
import { config } from '../config';
import { useConnectionStore } from '../stores/connectionStore';

interface MemoryResult {
  id: string;
  content: string;
}

/** Simple string hash for stable key generation */
function hashKey(str: string, index: number): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return `mem-${hash}-${index}`;
}

export function MemoryScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemoryResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { adapter, isConnected } = useConnectionStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchMemories = useCallback(async () => {
    const text = query.trim();
    if (!text || !adapter) return;

    // Debounce: cancel any pending search
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setHasSearched(true);

      try {
        const memories = await adapter.searchMemories(text);
        setResults(
          memories.map((m, i) => {
            const content = typeof m === 'string' ? m : JSON.stringify(m);
            return {
              id: hashKey(content, i),
              content,
            };
          }),
        );
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [query, adapter]);

  const renderItem = useCallback(
    ({ item }: { item: MemoryResult }) => <MemoryCard content={item.content} />,
    [],
  );

  const keyExtractor = useCallback((item: MemoryResult) => item.id, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Brain size={22} color={T.ACCENT_CYAN} />
        <Text style={styles.headerTitle}>Memory Search</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search Nova's memory\u2026"
          placeholderTextColor={T.TEXT_MUTED}
          onSubmitEditing={() => void searchMemories()}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={[styles.searchBtn, (!query.trim() || !isConnected) && styles.btnDisabled]}
          onPress={() => void searchMemories()}
          disabled={!query.trim() || isSearching || !isConnected}
        >
          {isSearching ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Search size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {!isConnected && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Not connected — check Settings</Text>
        </View>
      )}

      {/* Results */}
      {hasSearched && results.length === 0 && !isSearching ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No memories found for &quot;{query}&quot;</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
        />
      )}
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
  searchBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: T.SURFACE,
  },
  searchInput: {
    flex: 1,
    backgroundColor: T.SURFACE_ELEVATED,
    color: T.TEXT_PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 15,
    borderWidth: 1,
    borderColor: T.BORDER,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.ACCENT_CYAN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  banner: {
    backgroundColor: T.STATUS_ERROR + '22',
    padding: 10,
    alignItems: 'center',
  },
  bannerText: { color: T.STATUS_ERROR, fontSize: 13, fontWeight: '600' },
  list: { padding: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: T.TEXT_MUTED, fontSize: 15, textAlign: 'center' },
});
