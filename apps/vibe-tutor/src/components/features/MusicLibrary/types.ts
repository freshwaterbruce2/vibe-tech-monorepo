/**
 * MusicLibrary Types
 * Centralized type definitions for the MusicLibrary module
 */

import type { RadioStatus } from '../../../services/audioStreamService';
import type { MusicPlaylist } from '../../../types';

// Component Props
export interface MusicLibraryProps {
  playlists: MusicPlaylist[];
  onAddPlaylist: (playlist: MusicPlaylist) => void;
  onRemovePlaylist: (id: string) => void;
}

// Radio streaming state
export interface RadioStreamingState {
  radioStatus: RadioStatus;
}

// Re-export types from services for convenience
export type { RadioStatus } from '../../../services/audioStreamService';
export type { MusicPlaylist, RadioStation } from '../../../types';
