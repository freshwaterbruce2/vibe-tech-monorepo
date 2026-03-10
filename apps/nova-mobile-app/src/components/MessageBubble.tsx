import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { RefreshCcw, Trash2, Volume2 } from 'lucide-react-native';
import { memo, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { config } from '../config';
import type { ChatMessage } from '../stores/chatStore';

interface MessageBubbleProps {
  item: ChatMessage;
  relativeTime: string;
  onRetry: (item: ChatMessage) => void;
  onRemove: (id: string) => void;
  /** Animated style for entrance animation */
  entranceStyle?: Animated.WithAnimatedObject<{ opacity: number; transform: { translateY: number }[] }>;
}

const T = config.THEME;

function MessageBubbleInner({ item, relativeTime, onRetry, onRemove, entranceStyle }: MessageBubbleProps) {
  const isUser = item.role === 'user';
  const isError = item.status === 'error';
  const isSending = item.status === 'sending';
  const isQueued = item.status === 'queued';
  const isSpeakingRef = useRef(false);

  const handleSpeak = () => {
    if (isSpeakingRef.current) {
      Speech.stop();
      isSpeakingRef.current = false;
      return;
    }
    isSpeakingRef.current = true;
    Speech.speak(item.content, {
      onDone: () => { isSpeakingRef.current = false; },
      onStopped: () => { isSpeakingRef.current = false; },
    });
  };

  const handleRetry = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRetry(item);
  };

  const handleRemove = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onRemove(item.id);
  };

  const content = (
    <View style={[styles.bubbleWrapper, isUser ? styles.userWrapper : styles.assistantWrapper]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          isError && styles.errorBubble,
        ]}
      >
        <Text style={[styles.bubbleText, isUser ? styles.userText : styles.assistantText]}>
          {item.content}
        </Text>
        <View style={styles.metaContainer}>
          <Text style={[styles.timestamp, isError && styles.errorText]}>
            {relativeTime}
            {isSending && ' \u2022 Sending...'}
            {isQueued && ' \u2022 Queued'}
            {isError && ' \u2022 Failed to send'}
          </Text>

          {/* TTS button on assistant messages */}
          {!isUser && config.FEATURES.VOICE_INPUT && (
            <TouchableOpacity
              onPress={handleSpeak}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.speakerBtn}
            >
              <Volume2 size={13} color={T.TEXT_MUTED} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isError && (
        <View style={styles.errorControls}>
          <TouchableOpacity
            onPress={handleRetry}
            style={styles.actionBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <RefreshCcw size={16} color={T.STATUS_OFFLINE} />
            <Text style={styles.actionBtnText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRemove}
            style={styles.actionBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Trash2 size={16} color={T.TEXT_MUTED} />
            <Text style={[styles.actionBtnText, { color: T.TEXT_MUTED }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (entranceStyle) {
    return <Animated.View style={entranceStyle}>{content}</Animated.View>;
  }
  return content;
}

export const MessageBubble = memo(MessageBubbleInner);

const styles = StyleSheet.create({
  bubbleWrapper: {
    marginVertical: 4,
    maxWidth: '82%',
  },
  userWrapper: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  assistantWrapper: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: {
    padding: 14,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: T.ACCENT_CYAN + '22',
    borderColor: T.ACCENT_CYAN + '44',
    borderWidth: 1,
  },
  assistantBubble: { backgroundColor: T.SURFACE_ELEVATED },
  errorBubble: {
    backgroundColor: T.STATUS_OFFLINE + '11',
    borderColor: T.STATUS_OFFLINE + '66',
    borderWidth: 1,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: T.TEXT_PRIMARY },
  assistantText: { color: T.TEXT_PRIMARY },
  metaContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  timestamp: { fontSize: 10, color: T.TEXT_MUTED },
  errorText: { color: T.STATUS_OFFLINE },
  speakerBtn: {
    padding: 2,
  },
  errorControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 6,
    marginRight: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  actionBtnText: { fontSize: 12, color: T.STATUS_OFFLINE, fontWeight: '500' },
});
