/**
 * Tenant Identification and Validation Middleware
 * Extracted from server.ts (lines 781-863)
 *
 * Supports multiple tenant identification methods:
 * 1. Authorization Bearer token
 * 2. X-API-Key header
 * 3. Subdomain-based routing
 * 4. Query parameter (development only)
 */

import type { NextFunction, Response } from 'express'
import type { TenantConfig } from '../types/tenant.types'
import type { RateLimiter } from '../utils/RateLimiter'

interface TenantMiddlewareDependencies {
  rateLimiter: RateLimiter
  tenantManager: any // Will be typed when TenantService is extracted
  healthService: any // Will be typed when HealthService is extracted
}

export function createTenantMiddleware(deps: TenantMiddlewareDependencies) {
  return (req: any, res: Response, next: NextFunction): void => {
    const clientId = req.ip ?? 'unknown'

    // Rate limiting
    if (!deps.rateLimiter.isAllowed(clientId)) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: 60,
        remaining: deps.rateLimiter.getRemainingRequests(clientId),
      })
      return
    }

    // Tenant identification - multiple methods supported
    let tenant: TenantConfig | undefined

    // Method 1: API Key in Authorization header
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.substring(7)
      tenant = deps.tenantManager.getTenantByApiKey(apiKey)
    }

    // Method 2: API Key in X-API-Key header
    if (!tenant && req.headers['x-api-key']) {
      tenant = deps.tenantManager.getTenantByApiKey(
        req.headers['x-api-key'] as string
      )
    }

    // Method 3: Subdomain-based identification
    if (!tenant) {
      const host = req.headers.host ?? ''
      const subdomain = host.split('.')[0]
      if (
        subdomain &&
        subdomain !== 'localhost' &&
        subdomain !== '127' &&
        !subdomain.includes(':')
      ) {
        tenant = deps.tenantManager.getTenantBySubdomain(subdomain)
      }
    }

    // Method 4: Tenant ID in query parameter (for development/testing)
    if (!tenant && req.query.tenantId) {
      tenant = deps.tenantManager.getTenant(req.query.tenantId as string)
    }

    // Skip tenant validation for health checks, public endpoints, and admin endpoints
    const publicEndpoints = [
      '/api/health',
      '/api/metrics',
      '/api/tenants/create',
      '/api/payment/plans',
      '/api/payment/webhook',
    ]
    const adminEndpoints = ['/api/admin']
    const isPublicEndpoint = publicEndpoints.some(endpoint =>
      req.path.startsWith(endpoint)
    )
    const isAdminEndpoint = adminEndpoints.some(endpoint =>
      req.path.startsWith(endpoint)
    )

    if (!tenant && !isPublicEndpoint && !isAdminEndpoint) {
      res.status(401).json({
        error: 'Tenant identification required',
        message: 'Please provide a valid API key or use a configured subdomain',
        methods: [
          'Authorization: Bearer <api-key>',
          'X-API-Key: <api-key>',
          'Subdomain: <tenant-subdomain>.yourdomain.com',
          'Query parameter: ?tenantId=<tenant-id> (development only)',
        ],
      })
      return
    }

    // Validate subscription for non-public endpoints
    if (tenant && !isPublicEndpoint) {
      const validation = deps.tenantManager.validateSubscription(tenant)
      if (!validation.valid) {
        res.status(403).json({
          error: 'Subscription invalid',
          reason: validation.reason,
          tenant: {
            id: tenant.id,
            name: tenant.name,
            subscription: tenant.subscription,
          },
        })
        return
      }
    }

    // Attach tenant to request for later use
    req.tenant = tenant

    deps.healthService.incrementRequest()
    console.warn(
      `[${new Date().toISOString()}] ${req.method} ${req.url} - ${clientId} - Tenant: ${tenant?.name ?? 'none'}`
    )
    next()
  }
}
