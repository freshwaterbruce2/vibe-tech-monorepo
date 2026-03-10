import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { config } from '../config';

interface MemoryCardProps {
  content: string;
}

const T = config.THEME;

function MemoryCardInner({ content }: MemoryCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardText}>{content}</Text>
    </View>
  );
}

export const MemoryCard = memo(MemoryCardInner);

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.SURFACE_ELEVATED,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: T.BORDER,
  },
  cardText: { color: T.TEXT_PRIMARY, fontSize: 14, lineHeight: 20 },
});
