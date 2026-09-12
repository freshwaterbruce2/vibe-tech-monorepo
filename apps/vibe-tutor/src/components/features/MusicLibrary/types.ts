/**
 * MusicLibrary Types
 * Centralized type definitions for the MusicLibrary module
 */

import type { RadioStatus } from '../../../services/audioStreamService';

// Radio streaming state
export interface RadioStreamingState {
  radioStatus: RadioStatus;
}

// Re-export types from services for convenience
export type { RadioStatus } from '../../../services/audioStreamService';
export type { RadioStation } from '../../../types';
