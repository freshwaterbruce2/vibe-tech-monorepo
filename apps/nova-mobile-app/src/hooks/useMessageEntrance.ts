import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Returns an animated style for message entrance: fade in + slide up.
 * Should be called per-message (in the rendered item) with `isNew` = true
 * only for messages added after initial render.
 */
export function useMessageEntrance(isNew: boolean) {
  const opacity = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(isNew ? 12 : 0)).current;

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
