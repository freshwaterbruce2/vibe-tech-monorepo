import express from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';

import { tenantMiddleware } from './middleware/index.js';
import { adminRoutes, tenantRoutes, paymentRoutes, healthRoutes } from './routes/index.js';
import { adminManager, tenantManager, healthService } from './services/index.js';
import type { TenantConfig } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.deepseek.com", "https://connect.squareup.com"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [/\.yourdomain\.com$/]
    : ['http://localhost:5173', 'http://localhost:3002', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'dist')));

// Tenant middleware for all /api routes (except some public ones)
app.use('/api', tenantMiddleware);

// Mount routes
app.use('/api/admin', adminRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api', healthRoutes);

// Generate dynamic manifest.json for tenant
app.get('/manifest.json', (req: any, res) => {
  try {
    const tenant: TenantConfig | undefined = req.tenant;

    let manifest: any = {
      name: "Warehouse Management System",
      short_name: "WMS",
      description: "Door scheduling and pallet tracking system",
      start_url: "/",
      display: "standalone",
      orientation: "portrait-primary",
      background_color: "#ffffff",
      theme_color: "#1f2937",
      scope: "/",
      lang: "en-US",
      categories: ["productivity", "business"],
      display_override: ["window-controls-overlay", "standalone"],
      prefer_related_applications: false,
      icons: [
        { src: "icons/icon-72x72.png", sizes: "72x72", type: "image/png", purpose: "any" },
        { src: "icons/icon-96x96.png", sizes: "96x96", type: "image/png", purpose: "any" },
        { src: "icons/icon-128x128.png", sizes: "128x128", type: "image/png", purpose: "any" },
        { src: "icons/icon-144x144.png", sizes: "144x144", type: "image/png", purpose: "any" },
        { src: "icons/icon-152x152.png", sizes: "152x152", type: "image/png", purpose: "any" },
        { src: "icons/icon-180x180.png", sizes: "180x180", type: "image/png", purpose: "any" },
        { src: "icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
        { src: "icons/icon-384x384.png", sizes: "384x384", type: "image/png", purpose: "any" },
        { src: "icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
      ]
    };

    if (tenant && tenant.config) {
      manifest = {
        ...manifest,
        name: tenant.config.appName || tenant.name,
        short_name: tenant.config.appShortName || tenant.config.warehouseCode,
        description: tenant.config.appDescription,
        background_color: tenant.config.brandColors?.background || "#ffffff",
        theme_color: tenant.config.brandColors?.primary || "#1f2937"
      };
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(manifest);
  } catch (error) {
    console.error('Generate manifest error:', error);
    res.json({
      name: "Warehouse Management System",
      short_name: "WMS",
      start_url: "/",
      display: "standalone",
      icons: []
    });
  }
});

// Serve dynamic HTML with tenant-specific meta tags
app.get('/', (req: any, res) => {
  try {
    const htmlPath = path.join(__dirname, '..', 'index.html');
    let html = readFileSync(htmlPath, 'utf8');

    const tenant: TenantConfig | undefined = req.tenant;

    let appName = "Warehouse Management System";
    let appDescription = "Door scheduling and pallet tracking system";
    let themeColor = "#1f2937";
    let brandPrimary = "#1f2937";
    let brandSecondary = "#3f4f5f";
    let brandAccent = "#6b7280";
    let brandBackground = "#ffffff";
    let brandText = "#333333";

    if (tenant && tenant.config) {
      appName = tenant.config.appName || tenant.name;
      appDescription = tenant.config.appDescription || `Warehouse management for ${tenant.name}`;
      themeColor = tenant.config.brandColors?.primary || "#1f2937";

      if (tenant.config.brandColors) {
        brandPrimary = tenant.config.brandColors.primary || "#1f2937";
        brandSecondary = tenant.config.brandColors.secondary || "#3f4f5f";
        brandAccent = tenant.config.brandColors.accent || "#6b7280";
        brandBackground = tenant.config.brandColors.background || "#ffffff";
        brandText = tenant.config.brandColors.text || "#333333";
      }
    }

    html = html.replace(/{{APP_NAME}}/g, appName);
    html = html.replace(/{{APP_DESCRIPTION}}/g, appDescription);
    html = html.replace(/{{THEME_COLOR}}/g, themeColor);
    html = html.replace(/{{BRAND_PRIMARY}}/g, brandPrimary);
    html = html.replace(/{{BRAND_SECONDARY}}/g, brandSecondary);
    html = html.replace(/{{BRAND_ACCENT}}/g, brandAccent);
    html = html.replace(/{{BRAND_BACKGROUND}}/g, brandBackground);
    html = html.replace(/{{BRAND_TEXT}}/g, brandText);

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(html);
  } catch (error) {
    console.error('Serve dynamic HTML error:', error);
    res.status(500).send('Error loading application');
  }
});

// Fallback for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// Global error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  healthService.incrementError();
  console.error('Unhandled error:', error);

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Multi-Tenant Shipping PWA Server starting...`);
  console.log(`[${new Date().toISOString()}] Server running on http://localhost:${PORT}`);
  console.log(`[${new Date().toISOString()}] Health check: http://localhost:${PORT}/api/health`);
  console.log(`[${new Date().toISOString()}] Tenant onboarding: http://localhost:${PORT}/api/tenants/create`);

  // Set up periodic session cleanup (every 15 minutes)
  setInterval(() => {
    adminManager.cleanupExpiredSessions();
  }, 15 * 60 * 1000);

  console.log(`[${new Date().toISOString()}] Features enabled:`);
  console.log(`  - Multi-tenant architecture with data isolation`);
  console.log(`  - Subscription-based access control and limits`);
  console.log(`  - API key and subdomain-based tenant identification`);
  console.log(`  - Circuit Breaker Pattern for API resilience`);
  console.log(`  - Rate limiting (100 requests/minute per IP)`);
  console.log(`  - DeepSeek AI integration with tenant context`);
  console.log(`  - Comprehensive error handling and recovery`);
  console.log(`  - Performance monitoring and health checks`);

  const tenants = tenantManager.getAllTenants();
  console.log(`[${new Date().toISOString()}] Loaded ${tenants.length} existing tenants`);
  if (tenants.length > 0) {
    console.log(`[${new Date().toISOString()}] Active tenants:`);
    tenants.forEach(tenant => {
      console.log(`  - ${tenant.name} (${tenant.subdomain}) - ${tenant.subscription.tier} tier`);
    });
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[SIGTERM] Graceful shutdown initiated...');
  server.close(() => {
    console.log('Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[SIGINT] Graceful shutdown initiated...');
  server.close(() => {
    console.log('Server closed successfully');
    process.exit(0);
  });
});

export default app;
