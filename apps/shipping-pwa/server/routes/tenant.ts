import { Router } from 'express';
import type { Request, Response } from 'express';
import { tenantManager, healthService } from '../services/index.js';
import { emailService } from '../../src/services/emailService.js';
import type { TenantData } from '../types.js';
import { trackUsageMetrics } from '../utils/index.js';

const router = Router();

// Create new tenant (public endpoint for onboarding)
router.post('/create', async (req: Request, res: Response) => {
  try {
    const {
      name,
      subdomain,
      config,
      subscription = {
        tier: 'free',
        status: 'active',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxUsers: 5,
        maxDoors: 20
      }
    } = req.body;

    if (!name || !subdomain || !config) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'subdomain', 'config']
      });
    }

    const existingTenant = tenantManager.getTenantBySubdomain(subdomain);
    if (existingTenant) {
      return res.status(409).json({ error: 'Subdomain already taken', subdomain });
    }

    const apiKey = tenantManager.generateApiKey();
    const tenant = tenantManager.createTenant({ name, subdomain, apiKey, config, subscription });

    if (config.ownerEmail) {
      const trialEndDate = new Date(tenant.subscription.expiresAt).toLocaleDateString();
      await emailService.sendWelcomeEmail(
        { email: config.ownerEmail, name: config.ownerName || name },
        {
          userName: config.ownerName || name,
          tenantName: name,
          warehouseName: config.warehouseName || name,
          subscriptionTier: subscription.tier,
          trialEndDate
        }
      );
    }

    return res.status(201).json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        apiKey: tenant.apiKey,
        subscription: tenant.subscription,
        createdAt: tenant.createdAt
      },
      onboarding: {
        apiEndpoint: `https://${subdomain}.yourdomain.com/api`,
        adminPanel: `https://${subdomain}.yourdomain.com/admin/warehouse-setup`,
        documentation: 'https://docs.yourdomain.com/getting-started'
      }
    });
  } catch (error) {
    healthService.incrementError();
    console.error('Tenant creation error:', error);
    return res.status(500).json({
      error: 'Failed to create tenant',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get tenant configuration
router.get('/config', (req: any, res: Response) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      return res.status(401).json({ error: 'Tenant not identified' });
    }

    return res.json({
      success: true,
      config: tenant.config,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        subscription: tenant.subscription
      }
    });
  } catch (error) {
    healthService.incrementError();
    console.error('Get tenant config error:', error);
    return res.status(500).json({
      error: 'Failed to get tenant configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update tenant configuration
router.put('/config', (req: any, res: Response) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      return res.status(401).json({ error: 'Tenant not identified' });
    }

    const { config } = req.body;
    if (!config) {
      return res.status(400).json({ error: 'Configuration data required', required: ['config'] });
    }

    const updatedTenant = tenantManager.updateTenant(tenant.id, { config });
    if (!updatedTenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    return res.json({
      success: true,
      config: updatedTenant.config,
      updatedAt: updatedTenant.updatedAt
    });
  } catch (error) {
    healthService.incrementError();
    console.error('Update tenant config error:', error);
    return res.status(500).json({
      error: 'Failed to update tenant configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get tenant data (door entries, pallets, etc.)
router.get('/data', (req: any, res: Response) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      return res.status(401).json({ error: 'Tenant not identified' });
    }

    const data = tenantManager.getTenantData(tenant.id);
    if (!data) {
      const emptyData: TenantData = {
        tenantId: tenant.id,
        doorEntries: [],
        palletData: {},
        users: [],
        lastSyncAt: new Date().toISOString()
      };
      tenantManager.saveTenantData(tenant.id, emptyData);
      return res.json({ success: true, data: emptyData });
    }

    return res.json({ success: true, data });
  } catch (error) {
    healthService.incrementError();
    console.error('Get tenant data error:', error);
    return res.status(500).json({
      error: 'Failed to get tenant data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update tenant data
router.post('/data', async (req: any, res: Response) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      return res.status(401).json({ error: 'Tenant not identified' });
    }

    const { doorEntries, palletData, users } = req.body;

    if (doorEntries && doorEntries.length > tenant.subscription.maxDoors) {
      return res.status(403).json({
        error: 'Door limit exceeded',
        limit: tenant.subscription.maxDoors,
        current: doorEntries.length,
        upgrade: 'Please upgrade your subscription to add more doors'
      });
    }

    if (users && users.length > tenant.subscription.maxUsers) {
      return res.status(403).json({
        error: 'User limit exceeded',
        limit: tenant.subscription.maxUsers,
        current: users.length,
        upgrade: 'Please upgrade your subscription to add more users'
      });
    }

    const existingData = tenantManager.getTenantData(tenant.id);
    const newDoorsProcessed = doorEntries ? doorEntries.length - (existingData?.doorEntries?.length || 0) : 0;

    if (newDoorsProcessed > 0) {
      await trackUsageMetrics(tenant.id, {
        doorsProcessed: newDoorsProcessed,
        timestamp: new Date().toISOString()
      });
    }

    const updatedData: TenantData = {
      tenantId: tenant.id,
      doorEntries: doorEntries || [],
      palletData: palletData || {},
      users: users || [],
      lastSyncAt: new Date().toISOString()
    };

    tenantManager.saveTenantData(tenant.id, updatedData);

    const usagePercentage = Math.round((doorEntries.length / tenant.subscription.maxDoors) * 100);
    if (usagePercentage >= 80 && tenant.config.ownerEmail) {
      await emailService.sendUsageLimitWarning(
        { email: tenant.config.ownerEmail },
        {
          userName: tenant.config.ownerName || tenant.name,
          doorsUsed: doorEntries.length,
          doorsLimit: tenant.subscription.maxDoors,
          usersActive: users.length,
          usersLimit: tenant.subscription.maxUsers,
          usagePercentage,
          upgradeUrl: `${process.env.APP_URL}/billing/upgrade`
        }
      );
    }

    return res.json({
      success: true,
      data: updatedData,
      limits: {
        doors: { used: updatedData.doorEntries.length, max: tenant.subscription.maxDoors },
        users: { used: updatedData.users.length, max: tenant.subscription.maxUsers }
      }
    });
  } catch (error) {
    healthService.incrementError();
    console.error('Update tenant data error:', error);
    return res.status(500).json({
      error: 'Failed to update tenant data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get tenant subscription info
router.get('/subscription', (req: any, res: Response) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      return res.status(401).json({ error: 'Tenant not identified' });
    }

    const data = tenantManager.getTenantData(tenant.id);
    const usage = {
      doors: data?.doorEntries.length || 0,
      users: data?.users.length || 0
    };

    return res.json({
      success: true,
      subscription: tenant.subscription,
      usage,
      limits: {
        doors: { used: usage.doors, max: tenant.subscription.maxDoors },
        users: { used: usage.users, max: tenant.subscription.maxUsers }
      },
      upgradeAvailable: tenant.subscription.tier !== 'enterprise'
    });
  } catch (error) {
    healthService.incrementError();
    console.error('Get subscription error:', error);
    return res.status(500).json({
      error: 'Failed to get subscription information',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
