/**
 * Cloudflare Workers Entry Point for DC8980 Shipping API
 * Converts Express.js server to Workers-compatible format using node:http
 */

import { httpServerHandler } from 'cloudflare:node';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { EmailService } from './email-service';

// Types for Cloudflare environment
export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespaces
  SESSIONS: KVNamespace;

  // Environment variables
  ENVIRONMENT: string;
  CORS_ORIGINS: string;
  SQUARE_ACCESS_TOKEN: string;
  SQUARE_WEBHOOK_SECRET: string;
  SENDGRID_API_KEY: string;
  SMTP_PASSWORD: string;
  JWT_SECRET: string;
  ADMIN_PASSWORD_HASH: string;
  FIREBASE_SERVICE_ACCOUNT: string;

  // Rate limiter
  RATE_LIMITER: any;

  // Analytics
  ANALYTICS: AnalyticsEngine;
}

// Initialize Express app
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
const configureCors = (env: Env) => {
  const origins = env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'];
  return cors({
    origin: (origin, callback) => {
      if (!origin || origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-API-Key']
  });
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.ENVIRONMENT || 'development',
    version: '2.0.0'
  });
});

// Tenant Authentication Middleware
const authenticateTenant = async (req: any, res: any, next: any, env: Env) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const tenantId = req.headers['x-tenant-id'];

    if (!apiKey || !tenantId) {
      return res.status(401).json({ error: 'Missing authentication credentials' });
    }

    // Query D1 database for tenant
    const result = await env.DB.prepare(
      'SELECT * FROM tenants WHERE id = ? AND status = ?'
    ).bind(tenantId, 'active').first();

    if (!result) {
      return res.status(401).json({ error: 'Invalid tenant' });
    }

    // Verify API key
    const validKey = await bcrypt.compare(apiKey, result.api_key_hash);
    if (!validKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    req.tenant = result;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Create new tenant endpoint
app.post('/api/tenants/create', async (req, res, env: Env) => {
  try {
    const { name, subdomain, config, subscription } = req.body;

    // Validate required fields
    if (!name || !subdomain || !config) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'subdomain', 'config']
      });
    }

    // Check if subdomain exists
    const existing = await env.DB.prepare(
      'SELECT id FROM tenants WHERE subdomain = ?'
    ).bind(subdomain).first();

    if (existing) {
      return res.status(409).json({
        error: 'Subdomain already exists',
        message: 'Please choose a different subdomain'
      });
    }

    // Generate tenant ID and API key
    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const apiKey = `sk_live_${Math.random().toString(36).substr(2, 32)}`;
    const hashedApiKey = await bcrypt.hash(apiKey, 10);

    // Insert tenant into database
    await env.DB.prepare(`
      INSERT INTO tenants (
        id, name, subdomain, api_key_hash, config,
        subscription_tier, subscription_status, subscription_expires_at,
        max_users, max_doors, created_at, updated_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      name,
      subdomain,
      hashedApiKey,
      JSON.stringify(config),
      subscription?.tier || 'free',
      subscription?.status || 'active',
      subscription?.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      subscription?.maxUsers || 5,
      subscription?.maxDoors || 20,
      new Date().toISOString(),
      new Date().toISOString(),
      'active'
    ).run();

    // Send welcome email if configured
    if (config.ownerEmail && env.SENDGRID_API_KEY) {
      const emailService = new EmailService(env);
      await emailService.sendWelcomeEmail(config.ownerEmail, {
        tenantName: name,
        apiKey,
        subdomain
      });
    }

    res.status(201).json({
      success: true,
      tenant: {
        id: tenantId,
        name,
        subdomain,
        apiKey,
        subscription: subscription || {
          tier: 'free',
          status: 'active',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      },
      message: 'Tenant created successfully'
    });

  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({
      error: 'Failed to create tenant',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Track usage metrics
app.post('/api/tenants/:tenantId/usage', async (req, res, env: Env) => {
  try {
    const { tenantId } = req.params;
    const { doorsProcessed, palletsTracked, apiCalls, storageUsed } = req.body;

    // Insert usage record
    await env.DB.prepare(`
      INSERT INTO usage_metrics (
        tenant_id, doors_processed, pallets_tracked,
        api_calls, storage_used, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      doorsProcessed || 0,
      palletsTracked || 0,
      apiCalls || 0,
      storageUsed || 0,
      new Date().toISOString()
    ).run();

    // Check usage limits
    const tenant = await env.DB.prepare(
      'SELECT max_doors, subscription_tier FROM tenants WHERE id = ?'
    ).bind(tenantId).first();

    if (tenant) {
      const monthlyUsage = await env.DB.prepare(`
        SELECT SUM(doors_processed) as total_doors
        FROM usage_metrics
        WHERE tenant_id = ?
        AND timestamp >= datetime('now', '-30 days')
      `).bind(tenantId).first();

      if (monthlyUsage && monthlyUsage.total_doors > tenant.max_doors) {
        // Send usage warning email
        if (env.SENDGRID_API_KEY) {
          const emailService = new EmailService(env);
          await emailService.sendUsageWarning(tenantId, {
            currentUsage: monthlyUsage.total_doors,
            limit: tenant.max_doors
          });
        }
      }
    }

    res.json({
      success: true,
      message: 'Usage tracked successfully'
    });

  } catch (error) {
    console.error('Track usage error:', error);
    res.status(500).json({
      error: 'Failed to track usage',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get tenant subscription details
app.get('/api/tenants/:tenantId/subscription', async (req, res, env: Env) => {
  try {
    const { tenantId } = req.params;

    const tenant = await env.DB.prepare(`
      SELECT
        subscription_tier,
        subscription_status,
        subscription_expires_at,
        max_users,
        max_doors
      FROM tenants
      WHERE id = ?
    `).bind(tenantId).first();

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Get current month usage
    const usage = await env.DB.prepare(`
      SELECT
        SUM(doors_processed) as doors_used,
        SUM(pallets_tracked) as pallets_tracked,
        SUM(api_calls) as api_calls,
        SUM(storage_used) as storage_used
      FROM usage_metrics
      WHERE tenant_id = ?
      AND timestamp >= datetime('now', '-30 days')
    `).bind(tenantId).first();

    res.json({
      subscription: {
        tier: tenant.subscription_tier,
        status: tenant.subscription_status,
        expiresAt: tenant.subscription_expires_at,
        limits: {
          maxUsers: tenant.max_users,
          maxDoors: tenant.max_doors
        },
        usage: {
          doorsUsed: usage?.doors_used || 0,
          palletsTracked: usage?.pallets_tracked || 0,
          apiCalls: usage?.api_calls || 0,
          storageUsed: usage?.storage_used || 0
        }
      }
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      error: 'Failed to get subscription details',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Admin login endpoint
app.post('/api/admin/login', async (req, res, env: Env) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Query admin from database
    const admin = await env.DB.prepare(
      'SELECT * FROM admins WHERE username = ?'
    ).bind(username).first();

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        role: admin.role
      },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Export handler for Cloudflare Workers
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Configure CORS with environment
    app.use(configureCors(env));

    // Pass environment to all routes
    app.use((req: any, res: any, next: any) => {
      req.env = env;
      next();
    });

    // Use httpServerHandler to handle the request
    const handler = httpServerHandler({
      port: 3001,
      hostname: 'localhost'
    });

    return handler(request, env, ctx);
  }
};