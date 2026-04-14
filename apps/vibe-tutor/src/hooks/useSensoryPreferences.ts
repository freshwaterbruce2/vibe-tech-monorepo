import { useEffect, useState, useTransition } from 'react';
import { dataStore } from '../services/dataStore';

interface SensoryPreferences {
  animationEnabled: boolean;
}

/** Loads sensory preferences from dataStore and exposes whether animations are enabled. */
export function useSensoryPreferences(): SensoryPreferences {
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const prefs = await dataStore.getSensoryPreferences();
        if (prefs) {
          setAnimationEnabled(prefs.animationSpeed !== 'none');
        }
      } catch (error) {
        console.error('Could not load sensory preferences:', error);
      }
    });
  }, []);

  return { animationEnabled };
}
