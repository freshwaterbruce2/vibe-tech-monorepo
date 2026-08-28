import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ChatInputBar } from '../components/ChatInputBar';
import { MessageBubble } from '../components/MessageBubble';
import { TypingIndicator } from '../components/TypingIndicator';
import { config } from '../config';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useRelativeTimeMap } from '../hooks/useRelativeTime';
import { useChatStore, type ChatMessage } from '../stores/chatStore';
import { useConnectionStore } from '../stores/connectionStore';
import { useOfflineQueueStore } from '../stores/offlineQueueStore';

export function ChatScreen() {
  const flatListRef = useRef<FlatList>(null);
  const [dotOpacity] = useState(() => new Animated.Value(1));

  const { messages, isLoading, addMessage, updateMessageStatus, removeMessage, setLoading } =
    useChatStore();
  const { adapter, isConnected } = useConnectionStore();
  const { isOnline } = useNetworkStatus();
  const { queue, enqueue, dequeue } = useOfflineQueueStore();

  useEffect(() => {
    if (isConnected) {
      dotOpacity.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(dotOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [isConnected, dotOpacity]);

  // Relative time map for all message timestamps
  const timestamps = useMemo(() => messages.map((m) => m.timestamp), [messages]);
  const relativeTimeMap = useRelativeTimeMap(timestamps);

  useEffect(() => {
    if (messages.length !== 0) {
      return;
    }

    addMessage({
      id: 'welcome',
      role: 'assistant',
      content: "Welcome to NOVA! I'm your AI assistant. How can I help you today?",
      timestamp: new Date().toISOString(),
      status: 'sent',
    });
  }, [addMessage, messages.length]);

  const executeSend = useCallback(
    async (messageText: string, messageId: string) => {
      if (!adapter) return;

      setLoading(true);
      updateMessageStatus(messageId, 'sending');

      try {
        const response = await adapter.chat(messageText);
        updateMessageStatus(messageId, 'sent');
        addMessage({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString(),
          status: 'sent',
        });
      } catch {
        updateMessageStatus(messageId, 'error');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoading(false);
      }
    },
    [adapter, addMessage, setLoading, updateMessageStatus],
  );

  // Flush offline queue when back online
  useEffect(() => {
    if (!isOnline || !adapter || queue.length === 0) return;

    const flush = async () => {
      for (const queuedMsg of [...queue]) {
        try {
          updateMessageStatus(queuedMsg.id, 'sending');
          const response = await adapter.chat(queuedMsg.content);
          updateMessageStatus(queuedMsg.id, 'sent');
          addMessage({
            id: (Date.now() + Math.random()).toString(),
            role: 'assistant',
            content: response,
            timestamp: new Date().toISOString(),
            status: 'sent',
          });
          dequeue(queuedMsg.id);
        } catch {
          updateMessageStatus(queuedMsg.id, 'error');
          dequeue(queuedMsg.id);
        }
      }
    };

    void flush();
  }, [adapter, addMessage, dequeue, isOnline, queue, updateMessageStatus]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text || isLoading) return;

      const newId = Date.now().toString();
      const userMsg: ChatMessage = {
        id: newId,
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
        status: 'sending',
      };

      addMessage(userMsg);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // If offline, queue the message
      if (!isOnline || !adapter) {
        updateMessageStatus(newId, 'queued');
        enqueue({ id: newId, content: text, timestamp: new Date().toISOString() });
        return;
      }

      void executeSend(text, newId);
    },
    [adapter, addMessage, enqueue, executeSend, isLoading, isOnline, updateMessageStatus],
  );

  const retryMessage = useCallback(
    (item: ChatMessage) => {
      if (!isLoading && adapter) {
        void executeSend(item.content, item.id);
      }
    },
    [adapter, executeSend, isLoading],
  );

  const handleRemoveMessage = useCallback(
    (id: string) => {
      removeMessage(id);
    },
    [removeMessage],
  );

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      return (
        <MessageBubble
          item={item}
          relativeTime={relativeTimeMap.get(item.timestamp) ?? ''}
          onRetry={retryMessage}
          onRemove={handleRemoveMessage}
        />
      );
    },
    [relativeTimeMap, retryMessage, handleRemoveMessage],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NOVA</Text>
        <Animated.View
          style={[
            styles.dot,
            isConnected ? styles.dotOnline : styles.dotOffline,
            { opacity: dotOpacity },
          ]}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          removeClippedSubviews={Platform.OS !== 'web'}
          maxToRenderPerBatch={15}
          windowSize={11}
          initialNumToRender={20}
          ListFooterComponent={isLoading ? <TypingIndicator /> : null}
        />

        <ChatInputBar isOnline={isOnline} isLoading={isLoading} onSend={sendMessage} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const T = config.THEME;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.BACKGROUND },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: T.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: T.BORDER,
    gap: 8,
  },
  headerTitle: {
    color: T.ACCENT_CYAN,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOnline: { backgroundColor: T.STATUS_ONLINE },
  dotOffline: { backgroundColor: T.STATUS_OFFLINE },
  chatArea: { flex: 1 },
  messageList: { padding: 16, paddingBottom: 8 },

});
