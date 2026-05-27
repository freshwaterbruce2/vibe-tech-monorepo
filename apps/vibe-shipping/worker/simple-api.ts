/**
 * Simplified Cloudflare Worker API for DC8980 Shipping
 * Using native fetch API instead of Express for better compatibility
 */

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  ENVIRONMENT: string;
  CORS_ORIGINS: string;
  JWT_SECRET: string;
  SENDGRID_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-ID, X-API-Key',
    };

    // Handle OPTIONS
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Root path - provide API info
      if ((path === '/' || path === '/api' || path === '/api/') && method === 'GET') {
        return new Response(
          JSON.stringify({
            status: 'healthy',
            message: 'DC8980 Shipping API',
            version: '2.0.0',
            endpoints: {
              health: '/api/health',
              database: '/api/db/test',
              tenants: '/api/tenants/create'
            }
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }

      // Health check
      if (path === '/api/health' && method === 'GET') {
        return new Response(
          JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: env.ENVIRONMENT || 'production',
            version: '2.0.0'
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }

      // Test database connection
      if (path === '/api/db/test' && method === 'GET') {
        const result = await env.DB.prepare('SELECT 1 as test').first();
        return new Response(
          JSON.stringify({
            success: true,
            result,
            message: 'Database connection successful'
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }

      // Get all tenants (admin endpoint)
      if (path === '/api/tenants' && method === 'GET') {
        const results = await env.DB.prepare('SELECT id, name, subdomain, subscription_tier, status FROM tenants').all();
        return new Response(
          JSON.stringify({
            success: true,
            tenants: results.results
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }

      // Create tenant
      if (path === '/api/tenants/create' && method === 'POST') {
        const body = await request.json() as any;
        const { name, subdomain, config } = body;

        if (!name || !subdomain) {
          return new Response(
            JSON.stringify({
              error: 'Missing required fields',
              required: ['name', 'subdomain']
            }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            }
          );
        }

        // Check if subdomain exists
        const existing = await env.DB.prepare(
          'SELECT id FROM tenants WHERE subdomain = ?'
        ).bind(subdomain).first();

        if (existing) {
          return new Response(
            JSON.stringify({
              error: 'Subdomain already exists'
            }),
            {
              status: 409,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            }
          );
        }

        // Create tenant
        const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const apiKey = `sk_live_${Math.random().toString(36).substr(2, 32)}`;

        await env.DB.prepare(`
          INSERT INTO tenants (
            id, name, subdomain, api_key_hash, config,
            subscription_tier, subscription_status,
            max_users, max_doors, created_at, updated_at, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          tenantId,
          name,
          subdomain,
          apiKey, // Note: In production, this should be hashed
          JSON.stringify(config || {}),
          'free',
          'active',
          5,
          20,
          new Date().toISOString(),
          new Date().toISOString(),
          'active'
        ).run();

        return new Response(
          JSON.stringify({
            success: true,
            tenant: {
              id: tenantId,
              name,
              subdomain,
              apiKey,
              subscription: {
                tier: 'free',
                status: 'active',
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
              }
            }
          }),
          {
            status: 201,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }

      // Default 404
      return new Response(
        JSON.stringify({
          error: 'Not found',
          path,
          method
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }
  }
};