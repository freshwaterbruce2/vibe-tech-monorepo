import type { Request, Response, NextFunction } from 'express';
import { rateLimiter, healthService, adminManager, tenantManager } from '../services/index.js';
import type { TenantConfig } from '../types.js';

/**
 * Tenant identification middleware
 * Identifies tenant from API key, subdomain, or query parameter
 */
export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientId = req.ip || 'unknown';

  // Rate limiting
  if (!rateLimiter.isAllowed(clientId)) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: 60,
      remaining: rateLimiter.getRemainingRequests(clientId)
    });
  }

  // Tenant identification - multiple methods supported
  let tenant: TenantConfig | undefined;

  // Method 1: API Key in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const apiKey = authHeader.substring(7);
    tenant = tenantManager.getTenantByApiKey(apiKey);
  }

  // Method 2: API Key in X-API-Key header
  if (!tenant && req.headers['x-api-key']) {
    tenant = tenantManager.getTenantByApiKey(req.headers['x-api-key'] as string);
  }

  // Method 3: Subdomain-based identification
  if (!tenant) {
    const host = req.headers.host || '';
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'localhost' && subdomain !== '127' && !subdomain.includes(':')) {
      tenant = tenantManager.getTenantBySubdomain(subdomain);
    }
  }

  // Method 4: Tenant ID in query parameter (for development/testing)
  if (!tenant && req.query.tenantId) {
    tenant = tenantManager.getTenant(req.query.tenantId as string);
  }

  // Skip tenant validation for health checks, public endpoints, and admin endpoints
  const publicEndpoints = ['/api/health', '/api/metrics', '/api/tenants/create', '/api/payment/plans', '/api/payment/webhook'];
  const adminEndpoints = ['/api/admin'];
  const isPublicEndpoint = publicEndpoints.some(endpoint => req.path.startsWith(endpoint));
  const isAdminEndpoint = adminEndpoints.some(endpoint => req.path.startsWith(endpoint));

  if (!tenant && !isPublicEndpoint && !isAdminEndpoint) {
    return res.status(401).json({
      error: 'Tenant identification required',
      message: 'Please provide a valid API key or use a configured subdomain',
      methods: [
        'Authorization: Bearer <api-key>',
        'X-API-Key: <api-key>',
        'Subdomain: <tenant-subdomain>.yourdomain.com',
        'Query parameter: ?tenantId=<tenant-id> (development only)'
      ]
    });
  }

  // Validate subscription for non-public endpoints
  if (tenant && !isPublicEndpoint) {
    const validation = tenantManager.validateSubscription(tenant);
    if (!validation.valid) {
      return res.status(403).json({
        error: 'Subscription invalid',
        reason: validation.reason,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subscription: tenant.subscription
        }
      });
    }
  }

  // Attach tenant to request for later use
  (req as any).tenant = tenant;

  healthService.incrementRequest();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${clientId} - Tenant: ${tenant?.name || 'none'}`);
  next();
}

/**
 * Admin authentication middleware
 */
export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Admin ')) {
    return res.status(401).json({
      error: 'Admin authentication required',
      message: 'Please provide a valid admin token: Authorization: Admin <token>'
    });
  }

  const token = authHeader.substring(6);
  const admin = adminManager.validateSession(token);

  if (!admin) {
    return res.status(401).json({
      error: 'Invalid or expired admin token',
      message: 'Please login again'
    });
  }

  (req as any).admin = admin;
  next();
}

/**
 * Permission check middleware factory
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const admin = (req as any).admin;
    if (!admin || !adminManager.hasPermission(admin, permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permission,
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
}
