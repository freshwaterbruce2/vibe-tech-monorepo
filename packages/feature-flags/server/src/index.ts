import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';

import { SQLiteStorage } from './storage/sqlite.js';
import { FlagService } from './services/flag-service.js';
import { EvaluationService } from './services/evaluation.js';
import { KillSwitchService } from './services/kill-switch.js';
import { RealTimeService } from './websocket/real-time.js';
import { createRoutes } from './api/routes.js';

export interface ServerConfig {
  port?: number;
  dbPath?: string;
  corsOrigins?: string[];
  rateLimit?: {
    windowMs?: number;
    max?: number;
  };
}

export class FeatureFlagServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private storage: SQLiteStorage;
  private flagService: FlagService;
  private evaluationService: EvaluationService;
  private killSwitchService: KillSwitchService;
  private realTimeService: RealTimeService;
  private config: Required<ServerConfig>;

  constructor(config: ServerConfig = {}) {
    this.config = {
      port: config.port ?? parseInt(process.env.FF_PORT ?? '3100'),
      dbPath: config.dbPath ?? process.env.FF_DB_PATH ?? 'D:/databases/feature_flags.db',
      corsOrigins: config.corsOrigins ?? ['http://localhost:3000', 'http://localhost:5173'],
      rateLimit: {
        windowMs: config.rateLimit?.windowMs ?? 60000,
        max: config.rateLimit?.max ?? 100,
      },
    };

    // Initialize storage and services
    this.storage = new SQLiteStorage(this.config.dbPath);
    this.flagService = new FlagService(this.storage);
    this.evaluationService = new EvaluationService(this.flagService);
    this.killSwitchService = new KillSwitchService(this.storage, this.flagService);

    // Initialize Express
    this.app = express();
    this.server = createServer(this.app);

    // Initialize WebSocket
    this.realTimeService = new RealTimeService(this.server);

    // Wire up event listeners
    this.setupEventListeners();

    // Setup middleware and routes
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupEventListeners(): void {
    // Broadcast flag changes via WebSocket
    this.flagService.setChangeListener((flag, action) => {
      console.log(`[Flag] ${action}: ${flag.key}`);
      this.realTimeService.broadcastFlagUpdate(flag);
    });

    // Broadcast kill switch events via WebSocket
    this.killSwitchService.setKillSwitchListener((event) => {
      console.log(`[KillSwitch] ${event.action}: ${event.flagKey}`);
      this.realTimeService.broadcastKillSwitch(event);
    });
  }

  private setupMiddleware(): void {
    // Security
    this.app.use(helmet({
      contentSecurityPolicy: false, // Allow dashboard
    }));

    // CORS
    this.app.use(cors({
      origin: this.config.corsOrigins,
      credentials: true,
    }));

    // Rate limiting
    this.app.use('/api/', rateLimit({
      windowMs: this.config.rateLimit.windowMs,
      max: this.config.rateLimit.max,
      message: { error: 'Too many requests, please try again later' },
    }) as any);

    // Body parsing
    this.app.use(express.json({ limit: '1mb' }));
  }

  private setupRoutes(): void {
    // API routes
    const apiRoutes = createRoutes(
      this.flagService,
      this.evaluationService,
      this.killSwitchService
    );
    this.app.use('/api', apiRoutes);

    // WebSocket clients info
    this.app.get('/api/ws/clients', (_req, res) => {
      res.json(this.realTimeService.getConnectedClients());
    });

    // Root info
    this.app.get('/', (_req, res) => {
      res.json({
        name: 'Feature Flags Server',
        version: '0.1.0',
        endpoints: {
          flags: '/api/flags',
          evaluate: '/api/evaluate',
          killSwitch: '/api/kill-switch',
          health: '/api/health',
          websocket: '/ws/flags',
        },
      });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.config.port, () => {
        console.log(`Feature Flags Server running on port ${this.config.port}`);
        console.log(`  REST API: http://localhost:${this.config.port}/api`);
        console.log(`  WebSocket: ws://localhost:${this.config.port}/ws/flags`);
        console.log(`  Database: ${this.config.dbPath}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.realTimeService.close();
      this.storage.close();
      this.server.close(() => {
        console.log('Feature Flags Server stopped');
        resolve();
      });
    });
  }

  getApp(): express.Application {
    return this.app;
  }

  getFlagService(): FlagService {
    return this.flagService;
  }

  getEvaluationService(): EvaluationService {
    return this.evaluationService;
  }

  getKillSwitchService(): KillSwitchService {
    return this.killSwitchService;
  }
}

// Export all services for programmatic use
export { SQLiteStorage } from './storage/sqlite.js';
export { FlagService } from './services/flag-service.js';
export { EvaluationService } from './services/evaluation.js';
export { KillSwitchService } from './services/kill-switch.js';
export { RealTimeService } from './websocket/real-time.js';
export { createRoutes } from './api/routes.js';

// Start server if run directly
const isMainModule = process.argv[1]?.includes('feature-flags') ||
                     process.argv[1]?.endsWith('index.ts') ||
                     process.argv[1]?.endsWith('index.js');

if (isMainModule) {
  const server = new FeatureFlagServer();

  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });
}