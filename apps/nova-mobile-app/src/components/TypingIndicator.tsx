import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { config } from '../config';

const T = config.THEME;
const DOT_SIZE = 6;
const DOTS = [0, 1, 2] as const;

export function TypingIndicator() {
  const anims = useRef(DOTS.map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    const animations = DOTS.map((i) => {
      const anim = anims[i]!;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      );
    });

    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [anims]);

  return (
    <View style={styles.container}>
      {DOTS.map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            { opacity: anims[i] },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: T.SURFACE_ELEVATED,
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginVertical: 4,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: T.TEXT_MUTED,
  },
});
