/**
 * useRadioStreaming Hook
 * Handles radio station streaming operations
 */

import { useEffect, useState } from 'react';
import { audioStream, type RadioStatus } from '../../../../services/audioStreamService';
import type { RadioStation } from '../types';

export interface UseRadioStreamingReturn {
  radioStatus: RadioStatus;
  handlePlayRadio: (station: RadioStation) => Promise<void>;
  handleStopRadio: () => Promise<void>;
  setRadioError: (error: string | null) => void;
}

export function useRadioStreaming(): UseRadioStreamingReturn {
  const [radioStatus, setRadioStatus] = useState<RadioStatus>({
    isPlaying: false,
    station: null,
    error: null,
  });

  // Subscribe to radio status changes
  useEffect(() => {
    audioStream.onStatusChange(setRadioStatus);
  }, []);

  const handlePlayRadio = async (station: RadioStation) => {
    try {
      // If same station is playing, stop it
      if (radioStatus.station?.id === station.id && radioStatus.isPlaying) {
        void audioStream.stop();
      } else {
        // Play new station
        await audioStream.play(station);
      }
    } catch (err: unknown) {
      console.error('Radio playback failed:', err);
      const message =
        err instanceof Error
          ? err.message
          : `Failed to start ${station.name}. Try another station.`;
      setRadioStatus((prev) => ({ ...prev, error: message }));
    }
  };

  const handleStopRadio = async () => {
    try {
      await audioStream.stop();
    } catch (err: unknown) {
      console.error('Radio stop failed:', err);
    }
  };

  const setRadioError = (error: string | null) => {
    setRadioStatus((prev) => ({ ...prev, error }));
  };

  return {
    radioStatus,
    handlePlayRadio,
    handleStopRadio,
    setRadioError,
  };
}
