// Define types for shipping related data

// Dynamic types that can be configured per warehouse
export type DestinationDC = string;
export type FreightType = string;
export type TrailerStatus = "empty" | "25%" | "50%" | "75%" | "partial" | "shipload";
export type InteractionMode = "tap" | "swipe";
export type VoiceActivationMode = "button" | "continuous" | "hotword";
export type VoiceEngine = "browser";

export interface DoorSchedule {
  id: string;
  doorNumber: number;
  destinationDC: DestinationDC;
  freightType: FreightType;
  trailerStatus: TrailerStatus;
  palletCount: number;
  timestamp: string;
  createdBy: string;
  tcrPresent: boolean;
  updatedAt?: string;
  updatedBy?: string;
  notes?: string;
}

export interface PalletEntry {
  id: string;
  doorNumber: number; // Replaced name
  count: number;
  timestamp: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  isActive?: boolean;
  startTime?: string | null; // ISO 8601
  endTime?: string | null; // ISO 8601
  elapsedTime?: number; // duration in seconds
}

export interface UserSettings {
  interactionMode: InteractionMode;
  enableActionButton: boolean;
  lastUsedDC: DestinationDC;
  lastUsedFreightType: FreightType;
  autoExportOnShiftEnd?: boolean;
  // Voice recognition settings
  voiceRecognitionEnabled?: boolean;
  voiceEngine?: VoiceEngine;
  noiseSuppression?: boolean;
  confidenceThreshold?: number;
  commandTimeout?: number;
  useGrammar?: boolean;
  autoStop?: boolean;
  // Additional voice settings
  speakBackCommands?: boolean;
  voiceVolume?: number;
  voiceAcceptPartialResults?: boolean;
  voiceActivationMode?: VoiceActivationMode;
  voiceFeedback?: boolean;
}
