/**
 * useRadioStreaming Hook
 * Handles radio station streaming operations
 */

import { useEffect, useState } from 'react';
import { logger } from '../../../../utils/logger';
import { audioStream, type RadioStatus } from '../../../../services/audioStreamService';
import { mediaSession } from '../../../../services/mediaSessionService';
import type { LocalTrack } from '../../../../types';
import type { RadioStation } from '../types';

export interface UseRadioStreamingReturn {
  radioStatus: RadioStatus;
  handlePlayRadio: (station: RadioStation) => Promise<void>;
  handleStopRadio: () => Promise<void>;
  setRadioError: (error: string | null) => void;
}

/** Convert a RadioStation to the LocalTrack shape expected by MediaSessionService */
function stationToTrack(station: RadioStation): LocalTrack {
  return {
    id: station.id,
    name: station.name,
    downloadUrl: station.streamUrl,
    downloadStatus: 'completed',
    createdAt: 0,
    metadata: {
      artist: station.genre,
      album: station.description ?? 'Radio',
    },
  };
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

  // Register media key handlers once; play/pause/stop reference latest state via closure refs
  useEffect(() => {
    mediaSession.registerActionHandlers({
      play: () => { void audioStream.resume(); },
      pause: () => { void audioStream.pause(); },
      // Radio has no track list, so next/prev stop the stream
      nexttrack: () => { void audioStream.stop(); },
      previoustrack: () => { void audioStream.stop(); },
    });

    return () => {
      mediaSession.clear();
    };
  }, []);

  // Sync media session state whenever radioStatus changes
  useEffect(() => {
    if (radioStatus.station) {
      mediaSession.updateMetadata(stationToTrack(radioStatus.station));
      mediaSession.updatePlaybackState(radioStatus.isPlaying ? 'playing' : 'paused');
    } else {
      mediaSession.updatePlaybackState('none');
    }
  }, [radioStatus.isPlaying, radioStatus.station]);

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
      logger.error('Radio playback failed:', err);
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
      logger.error('Radio stop failed:', err);
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
