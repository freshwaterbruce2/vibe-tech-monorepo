import path from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import type { TenantConfig, TenantData } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Tenant Management Service
 * Handles multi-tenant configuration, data isolation, and subscription management
 */
export class TenantManager {
  private tenantsDir = path.join(__dirname, '..', '..', 'data', 'tenants');
  private tenants = new Map<string, TenantConfig>();

  constructor() {
    this.ensureDataDirectories();
    this.loadTenants();
  }

  private ensureDataDirectories() {
    const baseDir = path.join(__dirname, '..', '..', 'data');
    const dirs = [
      baseDir,
      this.tenantsDir,
      path.join(baseDir, 'tenant-data')
    ];

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  private loadTenants() {
    try {
      const tenantsFile = path.join(this.tenantsDir, 'tenants.json');
      if (existsSync(tenantsFile)) {
        const data = JSON.parse(readFileSync(tenantsFile, 'utf8'));
        data.forEach((tenant: TenantConfig) => {
          this.tenants.set(tenant.id, tenant);
        });
      }
    } catch (error) {
      console.error('Failed to load tenants:', error);
    }
  }

  private saveTenants() {
    try {
      const tenantsFile = path.join(this.tenantsDir, 'tenants.json');
      const data = Array.from(this.tenants.values());
      writeFileSync(tenantsFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save tenants:', error);
      throw error;
    }
  }

  createTenant(config: Omit<TenantConfig, 'id' | 'createdAt' | 'updatedAt'>, createdBy?: string): TenantConfig {
    const id = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const tenant: TenantConfig = {
      id,
      ...config,
      isActive: config.isActive !== undefined ? config.isActive : true,
      audit: {
        createdBy
      },
      createdAt: now,
      updatedAt: now
    };

    this.tenants.set(id, tenant);
    this.saveTenants();

    const baseDir = path.join(__dirname, '..', '..', 'data');
    const tenantDataDir = path.join(baseDir, 'tenant-data', id);
    if (!existsSync(tenantDataDir)) {
      mkdirSync(tenantDataDir, { recursive: true });
    }

    this.saveTenantData(id, {
      tenantId: id,
      doorEntries: [],
      palletData: {},
      users: [],
      lastSyncAt: now
    });

    return tenant;
  }

  getTenantBySubdomain(subdomain: string): TenantConfig | undefined {
    return Array.from(this.tenants.values()).find(t => t.subdomain === subdomain);
  }

  getTenantByApiKey(apiKey: string): TenantConfig | undefined {
    return Array.from(this.tenants.values()).find(t => t.apiKey === apiKey);
  }

  getTenant(id: string): TenantConfig | undefined {
    return this.tenants.get(id);
  }

  updateTenant(id: string, updates: Partial<TenantConfig>, updatedBy?: string): TenantConfig | undefined {
    const tenant = this.tenants.get(id);
    if (!tenant) return undefined;

    const updatedTenant = {
      ...tenant,
      ...updates,
      audit: {
        ...tenant.audit,
        lastModifiedBy: updatedBy
      },
      updatedAt: new Date().toISOString()
    };

    this.tenants.set(id, updatedTenant);
    this.saveTenants();
    return updatedTenant;
  }

  suspendTenant(id: string, reason: string, suspendedBy?: string): TenantConfig | undefined {
    const tenant = this.tenants.get(id);
    if (!tenant) return undefined;

    const updatedTenant = {
      ...tenant,
      isActive: false,
      subscription: {
        ...tenant.subscription,
        status: 'suspended' as const
      },
      audit: {
        ...tenant.audit,
        suspendedBy,
        suspendedAt: new Date().toISOString(),
        suspensionReason: reason,
        lastModifiedBy: suspendedBy
      },
      updatedAt: new Date().toISOString()
    };

    this.tenants.set(id, updatedTenant);
    this.saveTenants();
    return updatedTenant;
  }

  reactivateTenant(id: string, reactivatedBy?: string): TenantConfig | undefined {
    const tenant = this.tenants.get(id);
    if (!tenant) return undefined;

    const updatedTenant = {
      ...tenant,
      isActive: true,
      subscription: {
        ...tenant.subscription,
        status: 'active' as const
      },
      audit: {
        ...tenant.audit,
        suspendedBy: undefined,
        suspendedAt: undefined,
        suspensionReason: undefined,
        lastModifiedBy: reactivatedBy
      },
      updatedAt: new Date().toISOString()
    };

    this.tenants.set(id, updatedTenant);
    this.saveTenants();
    return updatedTenant;
  }

  getAllTenants(): TenantConfig[] {
    return Array.from(this.tenants.values());
  }

  validateSubscription(tenant: TenantConfig): { valid: boolean; reason?: string } {
    if (tenant.subscription.status !== 'active') {
      return { valid: false, reason: 'Subscription not active' };
    }

    if (new Date(tenant.subscription.expiresAt) < new Date()) {
      return { valid: false, reason: 'Subscription expired' };
    }

    return { valid: true };
  }

  getTenantData(tenantId: string): TenantData | undefined {
    try {
      const baseDir = path.join(__dirname, '..', '..', 'data');
      const dataFile = path.join(baseDir, 'tenant-data', tenantId, 'data.json');
      if (existsSync(dataFile)) {
        return JSON.parse(readFileSync(dataFile, 'utf8'));
      }
    } catch (error) {
      console.error(`Failed to load data for tenant ${tenantId}:`, error);
    }
    return undefined;
  }

  saveTenantData(tenantId: string, data: TenantData): void {
    try {
      const baseDir = path.join(__dirname, '..', '..', 'data');
      const dataFile = path.join(baseDir, 'tenant-data', tenantId, 'data.json');
      writeFileSync(dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Failed to save data for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  generateApiKey(): string {
    return `sk_${Date.now()}_${Math.random().toString(36).substr(2, 32)}`;
  }
}

export const tenantManager = new TenantManager();
