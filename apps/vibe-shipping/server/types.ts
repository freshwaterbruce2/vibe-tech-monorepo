// Admin User Types
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'superadmin' | 'admin';
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Tenant Management Types
export interface TenantConfig {
  id: string;
  name: string;
  subdomain: string;
  apiKey: string;
  isActive: boolean;
  ownerEmail?: string;
  adminUsers?: string[];
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
    ownerName?: string;
    ownerEmail?: string;
  };
  subscription: {
    tier: 'free' | 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'suspended' | 'cancelled';
    expiresAt: string;
    maxUsers: number;
    maxDoors: number;
  };
  audit: {
    createdBy?: string;
    lastModifiedBy?: string;
    suspendedBy?: string;
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

export interface AdminAuthRequest {
  username: string;
  password: string;
}

export interface AdminAuthResponse {
  success: boolean;
  token?: string;
  admin?: {
    id: string;
    username: string;
    email: string;
    role: string;
    permissions: string[];
  };
  error?: string;
}

export interface UsageMetrics {
  tenantId: string;
  period: string;
  doorsProcessed: number;
  palletsTracked: number;
  apiCalls: number;
  storageUsedMB: number;
  lastUpdated: string;
}

// Express request extensions
declare module 'express-serve-static-core' {
  interface Request {
    tenant?: TenantConfig;
    admin?: AdminUser;
  }
}
