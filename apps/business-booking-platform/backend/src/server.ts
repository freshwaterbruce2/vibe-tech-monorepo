import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';

import { createServer } from 'http';
import morgan from 'morgan';
import { Server as SocketIOServer } from 'socket.io';
import { initializeCache } from './cache';
import { initializeDatabase } from './database/migrations';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { securityMiddleware } from './middleware/security';
import { apiRouter } from './routes';
import { logger } from './utils/logger';
import { initializeWebSocket } from './websocket';

// Conditionally load config based on LOCAL_SQLITE environment variable
const loadConfig = async () => {
	if (process.env.LOCAL_SQLITE === 'true') {
		const { sqliteConfig } = await import('./config/sqlite');
		return sqliteConfig;
	} else {
		const { config } = await import('./config');
		return config;
	}
};

export class HotelBookingServer {
	private app: Express;
	private httpServer: ReturnType<typeof createServer>;
	private io: SocketIOServer;
	private port: number;
	private config: any;

	constructor(config: any) {
		this.app = express();
		this.httpServer = createServer(this.app);
		this.config = config;
		this.io = new SocketIOServer(this.httpServer, {
			cors: {
				origin: config.cors.origin,
				credentials: true,
			},
		});
		this.port = config.server.port;
	}

	private async initializeMiddleware(): Promise<void> {
		// Apply security middleware (includes helmet with proper CSP)
		this.app.use(securityMiddleware);

		// CORS configuration with proper headers to prevent CORB
		this.app.use(
			cors({
				origin: (origin, callback) => {
					// Allow requests with no origin (like mobile apps or Postman)
					if (!origin) {
return callback(null, true);
}

					// Allow localhost origins for development
					if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
						return callback(null, true);
					}

					// Check against configured origins
					const allowedOrigins = Array.isArray(this.config.cors.origin)
						? this.config.cors.origin
						: [this.config.cors.origin];

					if (allowedOrigins.includes(origin)) {
						return callback(null, true);
					}

					// Log rejected origin for debugging
					logger.warn(`CORS: Rejected origin ${origin}`);
					callback(new Error('Not allowed by CORS'));
				},
				credentials: true,
				methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
				allowedHeaders: [
					'Content-Type',
					'Authorization',
					'X-Request-ID',
					'Accept',
					'Origin',
				],
				exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
				maxAge: 86400, // 24 hours
			}),
		);

		// Add middleware to set proper content-type headers
		this.app.use((req, res, next) => {
			// Set X-Content-Type-Options to prevent MIME sniffing
			res.setHeader('X-Content-Type-Options', 'nosniff');

			// Ensure JSON responses have correct content-type
			if (req.path.startsWith('/api')) {
				res.setHeader('Content-Type', 'application/json; charset=utf-8');
			}

			next();
		});

		// Raw body capture for Square webhooks BEFORE json parsing
		this.app.use(
			'/api/payments/webhook/square',
			express.raw({ type: '*/*', limit: '1mb' }),
		);
		// Body parsing (general)
		this.app.use(express.json({ limit: '10mb' }));
		this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

		// Compression
		this.app.use(compression());

		// Logging
		if (this.config.environment !== 'test') {
			this.app.use(
				morgan('combined', {
					stream: { write: (message) => logger.info(message.trim()) },
				}),
			);
		}

		// Custom middleware
		this.app.use(requestLogger);
		this.app.use(rateLimiter);

		// Root endpoint for testing
		this.app.get('/', (_req, res) => {
			res.json({
				message: 'Vibe Booking Backend API',
				version: '1.0.0',
				status: 'running',
				timestamp: new Date().toISOString(),
			});
		});

		// Health check
		this.app.get('/health', (_req, res) => {
			res.json({
				status: 'healthy',
				timestamp: new Date().toISOString(),
				uptime: process.uptime(),
				environment: this.config.environment,
				version: this.config.version,
			});
		});

		// API routes
		this.app.use('/api', apiRouter);

		// Error handling
		this.app.use(errorHandler);
	}

	private async initializeServices(): Promise<void> {
		try {
			// Initialize database
			if (process.env.LOCAL_SQLITE === 'true') {
				logger.info('Using SQLite database for local development');
				// SQLite is already initialized during setup
			} else {
				await initializeDatabase();
				logger.info('Database initialized successfully');
			}

			// Initialize cache (skip for local SQLite development)
			if (process.env.LOCAL_SQLITE !== 'true') {
				await initializeCache();
				logger.info('Cache initialized successfully');
			} else {
				logger.info('Skipping cache initialization for local development');
			}

			// Initialize WebSocket
			initializeWebSocket(this.io);
			logger.info('WebSocket initialized successfully');
		} catch (error) {
			logger.error('Failed to initialize services:', error);
			throw error;
		}
	}

	public async start(): Promise<void> {
		try {
			await this.initializeMiddleware();
			await this.initializeServices();

			this.httpServer.listen(this.port, () => {
				logger.info(`Vibe Booking API server running on port ${this.port}`);
				logger.info(`Environment: ${this.config.environment}`);
				logger.info(`API Base URL: ${this.config.server.baseUrl}`);
			});

			// Graceful shutdown
			process.on('SIGTERM', () => this.shutdown());
			process.on('SIGINT', () => this.shutdown());
		} catch (error) {
			logger.error('Failed to start server:', error);
			process.exit(1);
		}
	}

	private async shutdown(): Promise<void> {
		logger.info('Shutting down server...');

		this.httpServer.close(() => {
			logger.info('HTTP server closed');
		});

		// Close database connections
		// Close cache connections
		// Close other resources

		process.exit(0);
	}
}

// Start server if this file is run directly
// For ES modules, we need to check if this is the main module differently
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
	(async () => {
		try {
			const config = await loadConfig();
			const server = new HotelBookingServer(config);
			await server.start();
		} catch (error) {
			logger.error('Failed to start server:', error);
			process.exit(1);
		}
	})();
}
