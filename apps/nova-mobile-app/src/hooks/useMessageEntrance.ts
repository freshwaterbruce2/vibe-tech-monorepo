import { useEffect, useState } from 'react';
import { Animated } from 'react-native';

/**
 * Returns an animated style for message entrance: fade in + slide up.
 * Should be called per-message (in the rendered item) with `isNew` = true
 * only for messages added after initial render.
 */
export function useMessageEntrance(isNew: boolean) {
  const [opacity] = useState(() => new Animated.Value(isNew ? 0 : 1));
  const [translateY] = useState(() => new Animated.Value(isNew ? 12 : 0));

  useEffect(() => {
    if (!isNew) return;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isNew, opacity, translateY]);

  return {
    opacity,
    transform: [{ translateY }],
  };
}
