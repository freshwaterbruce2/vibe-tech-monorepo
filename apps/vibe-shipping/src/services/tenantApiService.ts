import { WarehouseConfig } from '@/config/warehouse';

export interface TenantCredentials {
  apiKey?: string;
  tenantId?: string;
  subdomain?: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  subdomain: string;
  subscription: {
    tier: 'free' | 'basic' | 'pro' | 'enterprise';
    status: 'active' | 'suspended' | 'cancelled';
    expiresAt: string;
    maxUsers: number;
    maxDoors: number;
  };
}

export interface TenantData {
  tenantId: string;
  doorEntries: any[];
  palletData: any;
  users: any[];
  lastSyncAt: string;
}

export interface CreateTenantRequest {
  name: string;
  subdomain: string;
  config: WarehouseConfig;
  subscription?: {
    tier: 'free' | 'basic' | 'pro' | 'enterprise';
    status: 'active' | 'suspended' | 'cancelled';
    expiresAt: string;
    maxUsers: number;
    maxDoors: number;
  };
}

export interface CreateTenantResponse {
  success: boolean;
  tenant: {
    id: string;
    name: string;
    subdomain: string;
    apiKey: string;
    subscription: TenantInfo['subscription'];
    createdAt: string;
  };
  onboarding: {
    apiEndpoint: string;
    adminPanel: string;
    documentation: string;
  };
}

class TenantApiService {
  private baseUrl: string;
  private credentials: TenantCredentials | null = null;

  constructor(baseUrl?: string) {
    // Use environment variable or fallback to localhost for development
    this.baseUrl = baseUrl ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
    this.loadCredentialsFromStorage();
  }

  private loadCredentialsFromStorage() {
    try {
      const stored = localStorage.getItem('tenant_credentials');
      if (stored) {
        this.credentials = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load credentials from storage:', error);
    }
  }

  private saveCredentialsToStorage(credentials: TenantCredentials) {
    try {
      localStorage.setItem('tenant_credentials', JSON.stringify(credentials));
      this.credentials = credentials;
    } catch (error) {
      console.error('Failed to save credentials to storage:', error);
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.credentials?.apiKey) {
      headers['Authorization'] = `Bearer ${this.credentials.apiKey}`;
    }

    return headers;
  }

  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getAuthHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ?? errorData.error ?? `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response.json();
  }

  // Authentication methods
  setCredentials(credentials: TenantCredentials) {
    this.saveCredentialsToStorage(credentials);
  }

  getCredentials(): TenantCredentials | null {
    return this.credentials;
  }

  clearCredentials() {
    localStorage.removeItem('tenant_credentials');
    this.credentials = null;
  }

  isAuthenticated(): boolean {
    return !!(this.credentials?.apiKey ?? this.credentials?.tenantId);
  }

  // Tenant management methods
  async createTenant(data: CreateTenantRequest): Promise<CreateTenantResponse> {
    return this.apiRequest<CreateTenantResponse>('/tenants/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTenantConfig(): Promise<{ success: boolean; config: WarehouseConfig; tenant: TenantInfo }> {
    return this.apiRequest('/tenant/config');
  }

  async updateTenantConfig(config: WarehouseConfig): Promise<{ success: boolean; config: WarehouseConfig; updatedAt: string }> {
    return this.apiRequest('/tenant/config', {
      method: 'PUT',
      body: JSON.stringify({ config }),
    });
  }

  async getTenantData(): Promise<{ success: boolean; data: TenantData }> {
    return this.apiRequest('/tenant/data');
  }

  async updateTenantData(data: Partial<TenantData>): Promise<{
    success: boolean;
    data: TenantData;
    limits: { doors: { used: number; max: number }; users: { used: number; max: number } }
  }> {
    return this.apiRequest('/tenant/data', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTenantSubscription(): Promise<{
    success: boolean;
    subscription: TenantInfo['subscription'];
    usage: { doors: number; users: number };
    limits: { doors: { used: number; max: number }; users: { used: number; max: number } };
    upgradeAvailable: boolean;
  }> {
    return this.apiRequest('/tenant/subscription');
  }

  // Health check
  async healthCheck(): Promise<any> {
    return this.apiRequest('/health');
  }

  // Analyze shipment data
  async analyzeShipment(data: { doorEntries: any[]; palletData: any }): Promise<{
    success: boolean;
    analysis: string;
    recommendations: string[];
    tenantContext: any;
    timestamp: string;
  }> {
    return this.apiRequest('/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Create singleton instance
export const tenantApi = new TenantApiService();

// Hook for React components
export const useTenantApi = () => {
  return tenantApi;
};

export default TenantApiService;