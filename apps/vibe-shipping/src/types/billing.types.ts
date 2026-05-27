/**
 * Billing and Usage Types
 * Extracted from server.ts (lines 2066-2074)
 */

export interface UsageMetrics {
  tenantId: string;
  period: string; // YYYY-MM format
  doorsProcessed: number;
  palletsTracked: number;
  apiCalls: number;
  storageUsedMB: number;
  lastUpdated: string;
}

export interface UsageTrackingUpdate {
  doorsProcessed?: number;
  palletsTracked?: number;
  apiCalls?: number;
}
