import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { squarePaymentService } from './src/services/squarePaymentService.js';
import { emailService } from './src/services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Admin User Types
interface AdminUser {
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
interface TenantConfig {
  id: string;
  name: string;
  subdomain: string;
  apiKey: string;
  isActive: boolean;
  ownerEmail?: string;
  adminUsers?: string[]; // Admin user IDs who can manage this tenant
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
  };
  subscription: {
    tier: 'free' | 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'suspended' | 'cancelled';
    expiresAt: string;
    maxUsers: number;
    maxDoors: number;
  };
  audit: {
    createdBy?: string; // Admin user ID
    lastModifiedBy?: string; // Admin user ID
    suspendedBy?: string; // Admin user ID
    suspendedAt?: string;
    suspensionReason?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TenantData {
  tenantId: string;
  doorEntries: any[];
  palletData: any;
  users: any[];
  lastSyncAt: string;
}

interface AdminAuthRequest {
  username: string;
  password: string;
}

interface AdminAuthResponse {
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

// Circuit Breaker Pattern for API calls
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly threshold = 5,
    private readonly timeout = 60000,
    private readonly retryTimeout = 10000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime < this.retryTimeout) {
        throw new Error('Circuit breaker is OPEN - API temporarily unavailable');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout)
        )
      ]);

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  getStatus() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailTime: this.lastFailTime
    };
  }
}

// DeepSeek API Integration with Advanced Error Handling
class DeepSeekService {
  private circuitBreaker = new CircuitBreaker(3, 30000, 60000);
  private readonly apiKey = process.env.DEEPSEEK_API_KEY;
  private readonly baseUrl = 'https://api.deepseek.com/v1';

  async analyzeShipment(data: any): Promise<any> {
    if (!this.apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    return this.circuitBreaker.execute(async () => {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a logistics optimization assistant. Analyze shipping data and provide efficiency recommendations.'
            },
            {
              role: 'user',
              content: `Analyze this shipping schedule: ${JSON.stringify(data)}`
            }
          ],
          max_tokens: 500,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      return result.choices?.[0]?.message?.content || 'No analysis available';
    });
  }

  getCircuitBreakerStatus() {
    return this.circuitBreaker.getStatus();
  }
}

// Request Rate Limiter
class RateLimiter {
  private requests = new Map<string, number[]>();

  constructor(private readonly windowMs = 60000, private readonly maxRequests = 100) {}

  isAllowed(clientId: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    if (!this.requests.has(clientId)) {
      this.requests.set(clientId, []);
    }

    const clientRequests = this.requests.get(clientId)!;

    // Remove old requests outside the window
    while (clientRequests.length > 0 && clientRequests[0] < windowStart) {
      clientRequests.shift();
    }

    if (clientRequests.length >= this.maxRequests) {
      return false;
    }

    clientRequests.push(now);
    return true;
  }

  getRemainingRequests(clientId: string): number {
    const clientRequests = this.requests.get(clientId) || [];
    return Math.max(0, this.maxRequests - clientRequests.length);
  }
}

// Health Check Service
class HealthService {
  private startTime = Date.now();
  private requestCount = 0;
  private errorCount = 0;

  incrementRequest() {
    this.requestCount++;
  }

  incrementError() {
    this.errorCount++;
  }

  getHealth() {
    const uptime = Date.now() - this.startTime;
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    return {
      status: errorRate < 5 ? 'healthy' : 'degraded',
      uptime: Math.floor(uptime / 1000),
      requests: this.requestCount,
      errors: this.errorCount,
      errorRate: `${errorRate.toFixed(2)}%`,
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
}

// Admin Management Service
class AdminManager {
  private adminsDir = path.join(__dirname, 'data', 'admins');
  private admins = new Map<string, AdminUser>();
  private sessions = new Map<string, { adminId: string; expiresAt: number }>();

  constructor() {
    this.ensureAdminDirectories();
    this.loadAdmins();
    // Initialize async setup
    this.initializeAdmin();
  }

  private async initializeAdmin() {
    await this.createDefaultSuperAdmin();
  }

  private ensureAdminDirectories() {
    if (!existsSync(this.adminsDir)) {
      mkdirSync(this.adminsDir, { recursive: true });
    }
  }

  private loadAdmins() {
    try {
      const adminsFile = path.join(this.adminsDir, 'admins.json');
      if (existsSync(adminsFile)) {
        const data = JSON.parse(readFileSync(adminsFile, 'utf8'));
        data.forEach((admin: AdminUser) => {
          this.admins.set(admin.id, admin);
        });
      }
    } catch (error) {
      console.error('Failed to load admin users:', error);
    }
  }

  private saveAdmins() {
    try {
      const adminsFile = path.join(this.adminsDir, 'admins.json');
      const data = Array.from(this.admins.values());
      writeFileSync(adminsFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save admin users:', error);
      throw error;
    }
  }

  private async createDefaultSuperAdmin() {
    // Create default superadmin if none exists
    const superAdmins = Array.from(this.admins.values()).filter(admin => admin.role === 'superadmin');
    if (superAdmins.length === 0) {
      const defaultAdmin: AdminUser = {
        id: 'admin_superadmin_001',
        username: 'superadmin',
        email: 'admin@warehouse.system',
        passwordHash: await this.hashPassword('admin123!'), // Change in production
        role: 'superadmin',
        permissions: ['*'], // All permissions
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.admins.set(defaultAdmin.id, defaultAdmin);
      this.saveAdmins();
      console.log('Default superadmin created: username=superadmin. Please change the default password!');
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  async authenticateAdmin(username: string, password: string): Promise<AdminAuthResponse> {
    try {
      const admin = Array.from(this.admins.values()).find(a =>
        a.username === username && a.isActive
      );

      if (!admin) {
        return { success: false, error: 'Invalid credentials' };
      }

      const isPasswordValid = await this.verifyPassword(password, admin.passwordHash);
      if (!isPasswordValid) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Create session token
      const token = this.generateSessionToken();
      const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
      this.sessions.set(token, { adminId: admin.id, expiresAt });

      // Update last login
      admin.lastLoginAt = new Date().toISOString();
      this.admins.set(admin.id, admin);
      this.saveAdmins();

      return {
        success: true,
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions
        }
      };
    } catch (error) {
      console.error('Admin authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  validateSession(token: string): AdminUser | null {
    const session = this.sessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      if (session) {
        this.sessions.delete(token);
      }
      return null;
    }

    return this.admins.get(session.adminId) || null;
  }

  logout(token: string): void {
    this.sessions.delete(token);
  }

  private generateSessionToken(): string {
    return crypto.randomBytes(48).toString('base64url'); // More secure, URL-safe
  }

  // Clean up expired sessions periodically
  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [token, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(token);
      }
    }
  }

  hasPermission(admin: AdminUser, permission: string): boolean {
    if (admin.permissions.includes('*')) return true;
    return admin.permissions.includes(permission);
  }

  async createAdmin(adminData: Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'> & { password: string }): Promise<AdminUser> {
    const id = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const admin: AdminUser = {
      id,
      username: adminData.username,
      email: adminData.email,
      passwordHash: await this.hashPassword(adminData.password),
      role: adminData.role,
      permissions: adminData.permissions,
      isActive: adminData.isActive,
      createdAt: now,
      updatedAt: now
    };

    this.admins.set(id, admin);
    this.saveAdmins();
    return admin;
  }

  getAdmin(id: string): AdminUser | undefined {
    return this.admins.get(id);
  }

  getAllAdmins(): AdminUser[] {
    return Array.from(this.admins.values());
  }

  updateAdmin(id: string, updates: Partial<AdminUser>): AdminUser | undefined {
    const admin = this.admins.get(id);
    if (!admin) return undefined;

    const updatedAdmin = {
      ...admin,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.admins.set(id, updatedAdmin);
    this.saveAdmins();
    return updatedAdmin;
  }

  deactivateAdmin(id: string): boolean {
    const admin = this.admins.get(id);
    if (!admin) return false;

    admin.isActive = false;
    admin.updatedAt = new Date().toISOString();
    this.admins.set(id, admin);
    this.saveAdmins();
    return true;
  }
}

// Tenant Management Service
class TenantManager {
  private tenantsDir = path.join(__dirname, 'data', 'tenants');
  private tenants = new Map<string, TenantConfig>();

  constructor() {
    this.ensureDataDirectories();
    this.loadTenants();
  }

  private ensureDataDirectories() {
    const dirs = [
      path.join(__dirname, 'data'),
      this.tenantsDir,
      path.join(__dirname, 'data', 'tenant-data')
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

    // Create tenant data directory
    const tenantDataDir = path.join(__dirname, 'data', 'tenant-data', id);
    if (!existsSync(tenantDataDir)) {
      mkdirSync(tenantDataDir, { recursive: true });
    }

    // Initialize empty tenant data
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
      const dataFile = path.join(__dirname, 'data', 'tenant-data', tenantId, 'data.json');
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
      const dataFile = path.join(__dirname, 'data', 'tenant-data', tenantId, 'data.json');
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

// Initialize services
const deepSeek = new DeepSeekService();
const rateLimiter = new RateLimiter();
const healthService = new HealthService();
const adminManager = new AdminManager();
const tenantManager = new TenantManager();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.squareup.com", "https://connect.squareup.com"]
    }
  }
}));

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 attempts per window
  message: {
    error: 'Too many authentication attempts, please try again later',
    retryAfter: 15 * 60 * 1000
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Maximum 100 requests per window
  message: {
    error: 'Too many requests, please try again later',
    retryAfter: 15 * 60 * 1000
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// Enhanced middleware stack with environment-aware CORS
const allowedOrigins = process.env['NODE_ENV'] === 'production'
  ? (process.env.ALLOWED_ORIGINS?.split(',') || [])
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:8080'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json({
  limit: '1mb', // Reduced from 10mb for better security
  strict: true, // Only parse arrays and objects
  type: 'application/json'
}));
app.use(express.static(path.join(__dirname, 'dist')));

// Tenant identification middleware
app.use((req: any, res, next) => {
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
  req.tenant = tenant;

  healthService.incrementRequest();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${clientId} - Tenant: ${tenant?.name || 'none'}`);
  next();
});

// Admin authentication middleware
const adminAuthMiddleware = (req: any, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Admin ')) {
    return res.status(401).json({
      error: 'Admin authentication required',
      message: 'Please provide a valid admin token: Authorization: Admin <token>'
    });
  }

  const token = authHeader.substring(6); // Remove 'Admin ' prefix
  const admin = adminManager.validateSession(token);

  if (!admin) {
    return res.status(401).json({
      error: 'Invalid or expired admin token',
      message: 'Please login again'
    });
  }

  req.admin = admin;
  next();
};

// Permission check middleware
const requirePermission = (permission: string) => {
  return (req: any, res: express.Response, next: express.NextFunction) => {
    if (!req.admin || !adminManager.hasPermission(req.admin, permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permission,
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  const health = healthService.getHealth();
  const circuitBreakerStatus = deepSeek.getCircuitBreakerStatus();

  res.json({
    ...health,
    services: {
      deepseek: circuitBreakerStatus
    }
  });
});

// Admin Authentication Endpoints

// Admin login (public endpoint) - with rate limiting
app.post('/api/admin/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        required: ['username', 'password']
      });
    }

    // Input validation and sanitization
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Invalid credential format'
      });
    }

    if (username.length > 100 || password.length > 256) {
      return res.status(400).json({
        error: 'Credentials too long'
      });
    }

    // Basic sanitization - remove dangerous characters
    const sanitizedUsername = username.replace(/[<>\"'&]/g, '');

    const result = await adminManager.authenticateAdmin(sanitizedUsername, password);

    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }

  } catch (error) {
    healthService.incrementError();
    console.error('Admin login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Admin logout
app.post('/api/admin/logout', (req: any, res) => {
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

// Admin Management Endpoints (protected)

// Get all tenants (admin only)
app.get('/api/admin/tenants', adminAuthMiddleware, requirePermission('tenants:read'), (req: any, res) => {
  try {
    const tenants = tenantManager.getAllTenants();

    // Remove sensitive data
    const sanitizedTenants = tenants.map(tenant => ({
      ...tenant,
      apiKey: `${tenant.apiKey.substring(0, 8)  }...` // Mask API key
    }));

    res.json({
      success: true,
      tenants: sanitizedTenants,
      count: tenants.length,
      admin: {
        id: req.admin.id,
        username: req.admin.username
      }
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
app.get('/api/admin/tenants/:id', adminAuthMiddleware, requirePermission('tenants:read'), (req: any, res) => {
  try {
    const { id } = req.params;
    const tenant = tenantManager.getTenant(id);

    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found',
        tenantId: id
      });
    }

    // Get tenant data
    const tenantData = tenantManager.getTenantData(id);

    res.json({
      success: true,
      tenant: {
        ...tenant,
        apiKey: `${tenant.apiKey.substring(0, 8)  }...` // Mask API key
      },
      data: tenantData,
      admin: {
        id: req.admin.id,
        username: req.admin.username
      }
    });

  } catch (error) {
    healthService.incrementError();
    console.error('Get tenant error:', error);
    res.status(500).json({
      error: 'Failed to get tenant',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update tenant (admin only)
app.put('/api/admin/tenants/:id', adminAuthMiddleware, requirePermission('tenants:write'), (req: any, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating sensitive fields
    delete updates.id;
    delete updates.apiKey;
    delete updates.createdAt;

    const updatedTenant = tenantManager.updateTenant(id, updates, req.admin.id);

    if (!updatedTenant) {
      return res.status(404).json({
        error: 'Tenant not found',
        tenantId: id
      });
    }

    res.json({
      success: true,
      tenant: {
        ...updatedTenant,
        apiKey: `${updatedTenant.apiKey.substring(0, 8)  }...` // Mask API key
      },
      admin: {
        id: req.admin.id,
        username: req.admin.username
      }
    });

  } catch (error) {
    healthService.incrementError();
    console.error('Update tenant error:', error);
    res.status(500).json({
      error: 'Failed to update tenant',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Suspend tenant (admin only)
app.post('/api/admin/tenants/:id/suspend', adminAuthMiddleware, requirePermission('tenants:suspend'), (req: any, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        error: 'Suspension reason required',
        required: ['reason']
      });
    }

    const updatedTenant = tenantManager.suspendTenant(id, reason, req.admin.id);

    if (!updatedTenant) {
      return res.status(404).json({
        error: 'Tenant not found',
        tenantId: id
      });
    }

    res.json({
      success: true,
      message: 'Tenant suspended successfully',
      tenant: {
        ...updatedTenant,
        apiKey: `${updatedTenant.apiKey.substring(0, 8)  }...` // Mask API key
      },
      admin: {
        id: req.admin.id,
        username: req.admin.username
      }
    });

  } catch (error) {
    healthService.incrementError();
    console.error('Suspend tenant error:', error);
    res.status(500).json({
      error: 'Failed to suspend tenant',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Reactivate tenant (admin only)
app.post('/api/admin/tenants/:id/reactivate', adminAuthMiddleware, requirePermission('tenants:suspend'), (req: any, res) => {
  try {
    const { id } = req.params;
    const updatedTenant = tenantManager.reactivateTenant(id, req.admin.id);

    if (!updatedTenant) {
      return res.status(404).json({
        error: 'Tenant not found',
        tenantId: id
      });
    }

    res.json({
      success: true,
      message: 'Tenant reactivated successfully',
      tenant: {
        ...updatedTenant,
        apiKey: `${updatedTenant.apiKey.substring(0, 8)  }...` // Mask API key
      },
      admin: {
        id: req.admin.id,
        username: req.admin.username
      }
    });

  } catch (error) {
    healthService.incrementError();
    console.error('Reactivate tenant error:', error);
    res.status(500).json({
      error: 'Failed to reactivate tenant',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Admin dashboard metrics
app.get('/api/admin/metrics', adminAuthMiddleware, requirePermission('metrics:read'), (req: any, res) => {
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

    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    healthService.incrementError();
    console.error('Get admin metrics error:', error);
    res.status(500).json({
      error: 'Failed to get metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Tenant Management Endpoints

// Create new tenant (public endpoint for onboarding)
app.post('/api/tenants/create', async (req, res) => {
  try {
    const {
      name,
      subdomain,
      config,
      subscription = {
        tier: 'free',
        status: 'active',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        maxUsers: 5,
        maxDoors: 20
      }
    } = req.body;

    // Validate required fields
    if (!name || !subdomain || !config) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'subdomain', 'config']
      });
    }

    // Check if subdomain is already taken
    const existingTenant = tenantManager.getTenantBySubdomain(subdomain);
    if (existingTenant) {
      return res.status(409).json({
        error: 'Subdomain already taken',
        subdomain
      });
    }

    // Generate API key
    const apiKey = tenantManager.generateApiKey();

    // Create tenant
    const tenant = tenantManager.createTenant({
      name,
      subdomain,
      apiKey,
      config,
      subscription
    });

    // Send welcome email to tenant owner
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

    res.status(201).json({
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
    res.status(500).json({
      error: 'Failed to create tenant',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get tenant configuration
app.get('/api/tenant/config', (req: any, res) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      return res.status(401).json({ error: 'Tenant not identified' });
    }

    res.json({
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
    res.status(500).json({
      error: 'Failed to get tenant configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update tenant configuration
app.put('/api/tenant/config', (req: any, res) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      return res.status(401).json({ error: 'Tenant not identified' });
    }

    const { config } = req.body;
    if (!config) {
      return res.status(400).json({
        error: 'Configuration data required',
        required: ['config']
      });
    }

    // Update tenant configuration
    const updatedTenant = tenantManager.updateTenant(tenant.id, { config });
    if (!updatedTenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({
      success: true,
      config: updatedTenant.config,
      updatedAt: updatedTenant.updatedAt
    });

  } catch (error) {
    healthService.incrementError();
    console.error('Update tenant config error:', error);
    res.status(500).json({
      error: 'Failed to update tenant configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate dynamic manifest.json for tenant
app.get('/manifest.json', (req: any, res) => {
  try {
    const tenant = req.tenant;

    // Default manifest for non-tenant or fallback
    let manifest = {
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
        {
          src: "icons/icon-72x72.png",
          sizes: "72x72",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "icons/icon-96x96.png",
          sizes: "96x96",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "icons/icon-128x128.png",
          sizes: "128x128",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "icons/icon-144x144.png",
          sizes: "144x144",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "icons/icon-152x152.png",
          sizes: "152x152",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "icons/icon-180x180.png",
          sizes: "180x180",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "icons/icon-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: "icons/icon-384x384.png",
          sizes: "384x384",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "icons/icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ]
    };

    // If tenant exists, customize manifest with their config
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
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.json(manifest);

  } catch (error) {
    console.error('Generate manifest error:', error);

    // Return basic fallback manifest on error
    const fallbackManifest = {
      name: "Warehouse Management System",
      short_name: "WMS",
      description: "Door scheduling and pallet tracking system",
      start_url: "/",
      display: "standalone",
      orientation: "portrait-primary",
      background_color: "#ffffff",
      theme_color: "#1f2937",
      scope: "/",
      icons: []
    };

    res.setHeader('Content-Type', 'application/json');
    res.json(fallbackManifest);
  }
});

// Serve dynamic HTML with tenant-specific meta tags
app.get('/', (req: any, res) => {
  try {
    const fs = require('fs');
    const path = require('path');

    // Read the HTML template
    const htmlPath = path.join(__dirname, 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    const tenant = req.tenant;

    // Default values for non-tenant or fallback
    let appName = "Warehouse Management System";
    let appShortName = "WMS";
    let appDescription = "Door scheduling and pallet tracking system";
    let themeColor = "#1f2937";
    let brandPrimary = "#1f2937";
    let brandSecondary = "#3f4f5f";
    let brandAccent = "#6b7280";
    let brandBackground = "#ffffff";
    let brandText = "#333333";

    // If tenant exists, use their configuration
    if (tenant && tenant.config) {
      appName = tenant.config.appName || tenant.name;
      appShortName = tenant.config.appShortName || tenant.config.warehouseCode;
      appDescription = tenant.config.appDescription || `Warehouse management system for ${tenant.name}`;
      themeColor = tenant.config.brandColors?.primary || "#1f2937";

      // Extract brand colors
      if (tenant.config.brandColors) {
        brandPrimary = tenant.config.brandColors.primary || "#1f2937";
        brandSecondary = tenant.config.brandColors.secondary || "#3f4f5f";
        brandAccent = tenant.config.brandColors.accent || "#6b7280";
        brandBackground = tenant.config.brandColors.background || "#ffffff";
        brandText = tenant.config.brandColors.text || "#333333";
      }
    }

    // Replace placeholders
    html = html.replace(/{{APP_NAME}}/g, appName);
    html = html.replace(/{{APP_SHORT_NAME}}/g, appShortName);
    html = html.replace(/{{APP_DESCRIPTION}}/g, appDescription);
    html = html.replace(/{{THEME_COLOR}}/g, themeColor);
    html = html.replace(/{{BRAND_PRIMARY}}/g, brandPrimary);
    html = html.replace(/{{BRAND_SECONDARY}}/g, brandSecondary);
    html = html.replace(/{{BRAND_ACCENT}}/g, brandAccent);
    html = html.replace(/{{BRAND_BACKGROUND}}/g, brandBackground);
    html = html.replace(/{{BRAND_TEXT}}/g, brandText);

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(html);

  } catch (error) {
    console.error('Serve dynamic HTML error:', error);

    // Fallback to static HTML if dynamic fails
    const express = require('express');
    express.static('dist')(req, res, () => {
      res.status(500).send('Error loading application');
    });
  }
});

// Get tenant data (door entries, pallets, etc.)
app.get('/api/tenant/data', (req: any, res) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      return res.status(401).json({ error: 'Tenant not identified' });
    }

    const data = tenantManager.getTenantData(tenant.id);
    if (!data) {
      // Initialize empty data if none exists
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

    res.json({ success: true, data });

  } catch (error) {
    healthService.incrementError();
    console.error('Get tenant data error:', error);
    res.status(500).json({
      error: 'Failed to get tenant data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update tenant data
app.post('/api/tenant/data', async (req: any, res) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      return res.status(401).json({ error: 'Tenant not identified' });
    }

    const { doorEntries, palletData, users } = req.body;

    // Validate subscription limits
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

    // Track usage for billing
    const existingData = tenantManager.getTenantData(tenant.id);
    const newDoorsProcessed = doorEntries ? doorEntries.length - (existingData?.doorEntries?.length || 0) : 0;

    if (newDoorsProcessed > 0) {
      // Update usage metrics for the tenant
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

    // Check if approaching limits and send warning email
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

    res.json({
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
    res.status(500).json({
      error: 'Failed to update tenant data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get tenant subscription info
app.get('/api/tenant/subscription', (req: any, res) => {
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

    res.json({
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
    res.status(500).json({
      error: 'Failed to get subscription information',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Square Payment Endpoints

// Get available subscription plans
app.get('/api/payment/plans', (req, res) => {
  try {
    const plans = squarePaymentService.getSubscriptionPlans();

    res.json({
      success: true,
      plans: plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval,
        features: plan.features
      }))
    });

  } catch (error) {
    healthService.incrementError();
    console.error('Get payment plans error:', error);
    res.status(500).json({
      error: 'Failed to get subscription plans',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create checkout session for subscription upgrade
app.post('/api/payment/checkout', async (req: any, res) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      return res.status(401).json({ error: 'Tenant not identified' });
    }

    const { planId, redirectUrl } = req.body;

    if (!planId || !redirectUrl) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['planId', 'redirectUrl']
      });
    }

    // Verify plan exists
    const plan = squarePaymentService.getSubscriptionPlan(planId);
    if (!plan) {
      return res.status(400).json({
        error: 'Invalid subscription plan',
        planId
      });
    }

    // Create checkout session
    const result = await squarePaymentService.createCheckoutSession({
      planId,
      tenantId: tenant.id,
      redirectUrl
    });

    if (result.success) {
      res.json({
        success: true,
        checkoutUrl: result.checkoutUrl,
        plan: {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          currency: plan.currency
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    healthService.incrementError();
    console.error('Create checkout session error:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Handle Square webhooks
app.post('/api/payment/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-square-signature'] as string;
    const body = JSON.stringify(req.body);

    // Verify webhook signature
    const isValid = await squarePaymentService.verifyWebhookSignature(body, signature);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Process webhook
    const success = await squarePaymentService.handleWebhook(req.body);

    if (success) {
      res.json({ success: true, message: 'Webhook processed successfully' });
    } else {
      res.status(500).json({ error: 'Failed to process webhook' });
    }

  } catch (error) {
    healthService.incrementError();
    console.error('Webhook processing error:', error);
    res.status(500).json({
      error: 'Failed to process webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get tenant usage metrics for billing
app.get('/api/tenant/usage', (req: any, res) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      return res.status(401).json({ error: 'Tenant not identified' });
    }

    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
    const usage = getUsageMetrics(tenant.id, currentPeriod);

    // Calculate usage-based charges
    const tier = tenant.subscription.tier;
    let perDoorRate = 0;
    let baseFee = 0;

    switch (tier) {
      case 'starter':
        baseFee = 2900; // $29
        perDoorRate = 10; // $0.10 per door
        break;
      case 'professional':
        baseFee = 7900; // $79
        perDoorRate = 5; // $0.05 per door
        break;
      case 'enterprise':
        baseFee = 19900; // $199
        perDoorRate = 2; // $0.02 per door (custom negotiable)
        break;
    }

    const usageCharges = usage ? usage.doorsProcessed * perDoorRate : 0;
    const totalCharges = baseFee + usageCharges;

    res.json({
      success: true,
      period: currentPeriod,
      usage: usage || {
        tenantId: tenant.id,
        period: currentPeriod,
        doorsProcessed: 0,
        palletsTracked: 0,
        apiCalls: 0,
        storageUsedMB: 0
      },
      billing: {
        baseFee: baseFee / 100, // Convert cents to dollars
        perDoorRate: perDoorRate / 100,
        usageCharges: usageCharges / 100,
        totalCharges: totalCharges / 100,
        currency: 'USD'
      },
      limits: {
        doorsIncluded: tenant.subscription.maxDoors,
        usersIncluded: tenant.subscription.maxUsers
      }
    });

  } catch (error) {
    healthService.incrementError();
    console.error('Get usage metrics error:', error);
    res.status(500).json({
      error: 'Failed to get usage metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get payment/subscription status for tenant
app.get('/api/payment/status', (req: any, res) => {
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

    // Check if tenant needs to upgrade
    const needsUpgrade =
      usage.doors > tenant.subscription.maxDoors ||
      usage.users > tenant.subscription.maxUsers ||
      tenant.subscription.status !== 'active' ||
      new Date(tenant.subscription.expiresAt) < new Date();

    res.json({
      success: true,
      subscription: tenant.subscription,
      usage,
      limits: {
        doors: { used: usage.doors, max: tenant.subscription.maxDoors },
        users: { used: usage.users, max: tenant.subscription.maxUsers }
      },
      needsUpgrade,
      upgradeReasons: needsUpgrade ? [
        ...(usage.doors > tenant.subscription.maxDoors ? ['Door limit exceeded'] : []),
        ...(usage.users > tenant.subscription.maxUsers ? ['User limit exceeded'] : []),
        ...(tenant.subscription.status !== 'active' ? ['Subscription not active'] : []),
        ...(new Date(tenant.subscription.expiresAt) < new Date() ? ['Subscription expired'] : [])
      ] : [],
      availableUpgrades: squarePaymentService.getSubscriptionPlans().filter(
        plan => plan.id !== tenant.subscription.tier
      )
    });

  } catch (error) {
    healthService.incrementError();
    console.error('Get payment status error:', error);
    res.status(500).json({
      error: 'Failed to get payment status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DeepSeek AI Analysis endpoint (tenant-aware)
app.post('/api/analyze', async (req: any, res) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      return res.status(401).json({ error: 'Tenant not identified' });
    }

    const { doorEntries = [], palletData = {} } = req.body;

    if (!Array.isArray(doorEntries)) {
      return res.status(400).json({
        error: 'Invalid request format',
        message: 'doorEntries must be an array'
      });
    }

    // Include tenant context in analysis
    const analysisData = {
      doorEntries,
      palletData,
      tenant: {
        name: tenant.name,
        warehouseCode: tenant.config.warehouseCode,
        doorRange: tenant.config.doorNumberRange,
        freightTypes: tenant.config.freightTypes
      },
      timestamp: new Date().toISOString()
    };

    const analysis = await deepSeek.analyzeShipment(analysisData);

    res.json({
      success: true,
      analysis,
      recommendations: extractRecommendations(analysis),
      tenantContext: {
        warehouseName: tenant.config.warehouseName,
        maxDoors: tenant.subscription.maxDoors
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    healthService.incrementError();
    console.error('Analysis error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    res.status(500).json({
      error: 'Analysis failed',
      message: errorMessage,
      fallbackRecommendations: getFallbackRecommendations(req.body),
      timestamp: new Date().toISOString()
    });
  }
});

// Efficiency metrics endpoint
app.get('/api/metrics', (req, res) => {
  const health = healthService.getHealth();

  res.json({
    performance: {
      uptime: health.uptime,
      requestsPerMinute: Math.round(health.requests / (health.uptime / 60)),
      errorRate: health.errorRate,
      memoryUsage: `${Math.round(health.memory.heapUsed / 1024 / 1024)}MB`
    },
    services: {
      deepseek: deepSeek.getCircuitBreakerStatus()
    },
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown endpoint
app.post('/api/shutdown', (req, res) => {
  res.json({ message: 'Server shutting down gracefully...' });

  setTimeout(() => {
    console.log('Server shutting down...');
    process.exit(0);
  }, 1000);
});

// Fallback for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Global error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  healthService.incrementError();
  console.error('Unhandled error:', error);

  res.status(500).json({
    error: 'Internal server error',
    message: process.env['NODE_ENV'] === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Usage tracking for billing
interface UsageMetrics {
  tenantId: string;
  period: string; // YYYY-MM format
  doorsProcessed: number;
  palletsTracked: number;
  apiCalls: number;
  storageUsedMB: number;
  lastUpdated: string;
}

const usageMetricsMap = new Map<string, UsageMetrics>();

async function trackUsageMetrics(tenantId: string, metrics: { doorsProcessed?: number; palletsTracked?: number; apiCalls?: number }): Promise<void> {
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  const key = `${tenantId}-${period}`;

  const existing = usageMetricsMap.get(key) || {
    tenantId,
    period,
    doorsProcessed: 0,
    palletsTracked: 0,
    apiCalls: 0,
    storageUsedMB: 0,
    lastUpdated: new Date().toISOString()
  };

  const updated = {
    ...existing,
    doorsProcessed: existing.doorsProcessed + (metrics.doorsProcessed || 0),
    palletsTracked: existing.palletsTracked + (metrics.palletsTracked || 0),
    apiCalls: existing.apiCalls + (metrics.apiCalls || 0),
    lastUpdated: new Date().toISOString()
  };

  usageMetricsMap.set(key, updated);

  // Persist to file (in production, use database)
  try {
    const usageDir = path.join(__dirname, 'data', 'usage');
    if (!existsSync(usageDir)) {
      mkdirSync(usageDir, { recursive: true });
    }
    const usageFile = path.join(usageDir, `${key}.json`);
    writeFileSync(usageFile, JSON.stringify(updated, null, 2));
  } catch (error) {
    console.error('Failed to save usage metrics:', error);
  }
}

function getUsageMetrics(tenantId: string, period?: string): UsageMetrics | undefined {
  const targetPeriod = period || new Date().toISOString().slice(0, 7);
  const key = `${tenantId}-${targetPeriod}`;

  // Try to load from memory first
  if (usageMetricsMap.has(key)) {
    return usageMetricsMap.get(key);
  }

  // Try to load from file
  try {
    const usageFile = path.join(__dirname, 'data', 'usage', `${key}.json`);
    if (existsSync(usageFile)) {
      const data = JSON.parse(readFileSync(usageFile, 'utf8'));
      usageMetricsMap.set(key, data);
      return data;
    }
  } catch (error) {
    console.error('Failed to load usage metrics:', error);
  }

  return undefined;
}

// Utility functions
function extractRecommendations(analysis: string): string[] {
  const recommendations: string[] = [];

  // Extract numbered or bulleted recommendations
  const lines = analysis.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^[0-9]+\./) || trimmed.match(/^[-*]/) || trimmed.toLowerCase().includes('recommend')) {
      recommendations.push(trimmed.replace(/^[0-9]+\.?\s*/, '').replace(/^[-*]\s*/, ''));
    }
  }

  return recommendations.slice(0, 5); // Limit to top 5 recommendations
}

function getFallbackRecommendations(data: any): string[] {
  const fallbacks = [
    'Optimize door assignments based on destination patterns',
    'Consider consolidating shipments to reduce partial loads',
    'Review pallet counts for efficiency opportunities',
    'Implement sequential door loading for better workflow'
  ];

  const { doorEntries = [] } = data;

  if (doorEntries.length > 10) {
    fallbacks.unshift('High door count detected - consider batch processing');
  }

  if (doorEntries.some((entry: any) => entry.trailerStatus === 'partial')) {
    fallbacks.unshift('Multiple partial loads detected - consolidation opportunity');
  }

  return fallbacks.slice(0, 3);
}

// Start server with graceful startup
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

  // Load existing tenants on startup
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