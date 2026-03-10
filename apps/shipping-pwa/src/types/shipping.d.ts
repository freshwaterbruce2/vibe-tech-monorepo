// Basic types for the shipping application

export interface PalletEntry {
  id: string;
  count: number;
  timestamp: string;
  doorNumber: number; // Replaced name
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  isActive?: boolean;
  startTime?: string | null; // ISO 8601
  endTime?: string | null; // ISO 8601
  elapsedTime?: number; // duration in seconds
}

// Additional types for the shipping application go here...
