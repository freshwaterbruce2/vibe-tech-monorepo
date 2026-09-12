import { logger } from '../utils/logger';
import { isHapticFeedbackEnabled } from './sensoryPreferences';

/**
 * Triggers haptic feedback on supported devices.
 * @param pattern The vibration pattern. Can be a single number or an array of numbers.
 */
export const triggerVibration = (pattern: number | number[]) => {
    if (isHapticFeedbackEnabled() && 'vibrate' in navigator) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            logger.warn("Vibration failed", e);
        }
    }
};
