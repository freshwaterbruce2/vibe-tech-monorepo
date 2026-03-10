/**
 * Tenant Management Types
 * Extracted from server.ts (lines 30-87)
 */

export interface TenantConfig {
  id: string;
  name: string;
  subdomain: string;
  apiKey: string;
  isActive: boolean;
  ownerEmail?: string;
  adminUsers?: string[]; // Admin user IDs who can manage this tenant
  config: {
    companyName: string;
    warehouseName: string;
    warehouseCode: string;
    appName: string;
    appShortName: string;
    appDescription: string;
    brandColors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
    };
    doorNumberRange: { min: number; max: number };
    destinationDCs: string[];
    freightTypes: string[];
    location: {
      address: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  subscription: {
    tier: 'free' | 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'suspended' | 'cancelled';
    expiresAt: string;
    maxUsers: number;
    maxDoors: number;
  };
  audit: {
    createdBy?: string; // Admin user ID
    lastModifiedBy?: string; // Admin user ID
    suspendedBy?: string; // Admin user ID
    suspendedAt?: string;
    suspensionReason?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TenantData {
  tenantId: string;
  doorEntries: any[];
  palletData: any;
  users: any[];
  lastSyncAt: string;
}

export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'suspended' | 'cancelled';
