import { Send } from 'lucide-react-native';
import { memo, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { config } from '../config';

interface ChatInputBarProps {
  isOnline: boolean;
  isLoading: boolean;
  onSend: (text: string) => void;
}

export const ChatInputBar = memo(function ChatInputBar({
  isOnline,
  isLoading,
  onSend,
}: ChatInputBarProps) {
  const [inputText, setInputText] = useState('');

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    onSend(text);
    setInputText('');
  }, [inputText, isLoading, onSend]);

  return (
    <View style={styles.inputBar}>
      <TextInput
        style={styles.input}
        value={inputText}
        onChangeText={setInputText}
        placeholder={isOnline ? 'Message NOVA\u2026' : 'Offline \u2022 Messages will queue'}
        placeholderTextColor={config.THEME.TEXT_MUTED}
        multiline
        maxLength={5000}
        onSubmitEditing={handleSend}
        returnKeyType="send"
      />
      <TouchableOpacity
        style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={isLoading || !inputText.trim()}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Send size={20} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
});

const T = config.THEME;

const styles = StyleSheet.create({
  inputBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: T.SURFACE,
    borderTopWidth: 1,
    borderTopColor: T.BORDER,
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: T.SURFACE_ELEVATED,
    color: T.TEXT_PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: T.BORDER,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.ACCENT_CYAN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
