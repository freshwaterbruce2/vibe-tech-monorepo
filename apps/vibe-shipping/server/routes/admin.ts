import { Router } from 'express';
import type { Request, Response } from 'express';
import { adminManager, healthService, tenantManager } from '../services/index.js';
import { adminAuthMiddleware, requirePermission } from '../middleware/index.js';

const router = Router();

// Rate limiter for auth endpoints (inline for simplicity)
const authAttempts = new Map<string, { count: number; lastAttempt: number }>();

function authLimiter(req: Request, res: Response, next: Function) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const record = authAttempts.get(ip);
  if (record && now - record.lastAttempt < windowMs && record.count >= maxAttempts) {
    return res.status(429).json({ error: 'Too many login attempts', retryAfter: Math.ceil((windowMs - (now - record.lastAttempt)) / 1000) });
  }

  if (record && now - record.lastAttempt < windowMs) {
    record.count++;
    record.lastAttempt = now;
  } else {
    authAttempts.set(ip, { count: 1, lastAttempt: now });
  }
  return next();
}

// Admin login (public endpoint)
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        required: ['username', 'password']
      });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid credential format' });
    }

    if (username.length > 100 || password.length > 256) {
      return res.status(400).json({ error: 'Credentials too long' });
    }

    const sanitizedUsername = username.replace(/[<>"'&]/g, '');
    const result = await adminManager.authenticateAdmin(sanitizedUsername, password);

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(401).json(result);
    }
  } catch (error) {
    healthService.incrementError();
    console.error('Admin login error:', error);
    return res.status(500).json({
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Admin logout
router.post('/logout', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Admin ')) {
      const token = authHeader.substring(6);
      adminManager.logout(token);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    healthService.incrementError();
    console.error('Admin logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all tenants (admin only)
router.get('/tenants', adminAuthMiddleware, requirePermission('tenants:read'), (req: any, res: Response) => {
  try {
    const tenants = tenantManager.getAllTenants();
    const sanitizedTenants = tenants.map(tenant => ({
      ...tenant,
      apiKey: `${tenant.apiKey.substring(0, 8)}...`
    }));

    res.json({
      success: true,
      tenants: sanitizedTenants,
      count: tenants.length,
      admin: { id: req.admin.id, username: req.admin.username }
    });
  } catch (error) {
    healthService.incrementError();
    console.error('Get tenants error:', error);
    res.status(500).json({
      error: 'Failed to get tenants',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get specific tenant (admin only)
router.get('/tenants/:id', adminAuthMiddleware, requirePermission('tenants:read'), (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const tenant = tenantManager.getTenant(id);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found', tenantId: id });
    }

    const tenantData = tenantManager.getTenantData(id);

    return res.json({
      success: true,
      tenant: { ...tenant, apiKey: `${tenant.apiKey.substring(0, 8)}...` },
      data: tenantData,
      admin: { id: req.admin.id, username: req.admin.username }
    });
  } catch (error) {
    healthService.incrementError();
    console.error('Get tenant error:', error);
    return res.status(500).json({
      error: 'Failed to get tenant',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update tenant (admin only)
router.put('/tenants/:id', adminAuthMiddleware, requirePermission('tenants:write'), (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates.id;
    delete updates.apiKey;
    delete updates.createdAt;

    const updatedTenant = tenantManager.updateTenant(id, updates, req.admin.id);

    if (!updatedTenant) {
      return res.status(404).json({ error: 'Tenant not found', tenantId: id });
    }

    return res.json({
      success: true,
      tenant: { ...updatedTenant, apiKey: `${updatedTenant.apiKey.substring(0, 8)}...` },
      admin: { id: req.admin.id, username: req.admin.username }
    });
  } catch (error) {
    healthService.incrementError();
    console.error('Update tenant error:', error);
    return res.status(500).json({
      error: 'Failed to update tenant',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Suspend tenant (admin only)
router.post('/tenants/:id/suspend', adminAuthMiddleware, requirePermission('tenants:suspend'), (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Suspension reason required', required: ['reason'] });
    }

    const updatedTenant = tenantManager.suspendTenant(id, reason, req.admin.id);

    if (!updatedTenant) {
      return res.status(404).json({ error: 'Tenant not found', tenantId: id });
    }

    return res.json({
      success: true,
      message: 'Tenant suspended successfully',
      tenant: { ...updatedTenant, apiKey: `${updatedTenant.apiKey.substring(0, 8)}...` },
      admin: { id: req.admin.id, username: req.admin.username }
    });
  } catch (error) {
    healthService.incrementError();
    console.error('Suspend tenant error:', error);
    return res.status(500).json({
      error: 'Failed to suspend tenant',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Reactivate tenant (admin only)
router.post('/tenants/:id/reactivate', adminAuthMiddleware, requirePermission('tenants:suspend'), (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const updatedTenant = tenantManager.reactivateTenant(id, req.admin.id);

    if (!updatedTenant) {
      return res.status(404).json({ error: 'Tenant not found', tenantId: id });
    }

    return res.json({
      success: true,
      message: 'Tenant reactivated successfully',
      tenant: { ...updatedTenant, apiKey: `${updatedTenant.apiKey.substring(0, 8)}...` },
      admin: { id: req.admin.id, username: req.admin.username }
    });
  } catch (error) {
    healthService.incrementError();
    console.error('Reactivate tenant error:', error);
    return res.status(500).json({
      error: 'Failed to reactivate tenant',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Admin dashboard metrics
router.get('/metrics', adminAuthMiddleware, requirePermission('metrics:read'), (req: any, res: Response) => {
  try {
    const tenants = tenantManager.getAllTenants();
    const health = healthService.getHealth();

    const metrics = {
      tenants: {
        total: tenants.length,
        active: tenants.filter(t => t.isActive && t.subscription.status === 'active').length,
        suspended: tenants.filter(t => !t.isActive || t.subscription.status === 'suspended').length,
        byTier: {
          free: tenants.filter(t => t.subscription.tier === 'free').length,
          starter: tenants.filter(t => t.subscription.tier === 'starter').length,
          professional: tenants.filter(t => t.subscription.tier === 'professional').length,
          enterprise: tenants.filter(t => t.subscription.tier === 'enterprise').length
        }
      },
      system: {
        uptime: health.uptime,
        requests: health.requests,
        errors: health.errors,
        errorRate: health.errorRate,
        memoryUsage: health.memory
      },
      admin: {
        id: req.admin.id,
        username: req.admin.username,
        role: req.admin.role
      }
    };

    res.json({ success: true, metrics, timestamp: new Date().toISOString() });
  } catch (error) {
    healthService.incrementError();
    console.error('Get admin metrics error:', error);
    res.status(500).json({
      error: 'Failed to get metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
