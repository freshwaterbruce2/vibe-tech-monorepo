import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// SQLite configuration schema
const sqliteConfigSchema = z.object({
	environment: z.enum(['development', 'test', 'staging', 'production']),
	version: z.string(),
	server: z.object({
		port: z.number(),
		baseUrl: z.string().url(),
	}),
	cors: z.object({
		origin: z.union([z.string(), z.array(z.string())]),
	}),
	database: z.object({
		path: z.string(),
		enableWAL: z.boolean(),
		timeout: z.number(),
		busyTimeout: z.number(),
	}),
	cache: z.object({
		enabled: z.boolean(),
		ttl: z.number(),
		maxSize: z.number(),
	}),
	jwt: z.object({
		secret: z.string().min(32),
		expiresIn: z.string(),
		refreshSecret: z.string().min(32),
		refreshExpiresIn: z.string(),
		resetSecret: z.string().min(32),
	}),
	openai: z.object({
		apiKey: z.string(),
		model: z.string(),
		maxTokens: z.number(),
		temperature: z.number(),
	}),
	liteapi: z.object({
		apiKey: z.string(),
		baseUrl: z.string().url(),
		timeout: z.number(),
	}),
	square: z.object({
		accessToken: z.string(),
		applicationId: z.string(),
		environment: z.enum(['sandbox', 'production']),
		locationId: z.string().optional(),
	}),
	email: z.object({
		provider: z.enum(['sendgrid', 'aws-ses', 'smtp']),
		from: z.string().email(),
		apiKey: z.string().optional(),
		smtp: z
			.object({
				host: z.string(),
				port: z.number(),
				secure: z.boolean(),
				user: z.string(),
				pass: z.string(),
			})
			.optional(),
	}),
	storage: z.object({
		provider: z.enum(['s3', 'gcs', 'local']),
		bucket: z.string(),
		region: z.string().optional(),
		accessKeyId: z.string().optional(),
		secretAccessKey: z.string().optional(),
	}),
	monitoring: z.object({
		sentryDsn: z.string().optional(),
		logLevel: z.enum(['error', 'warn', 'info', 'debug']),
	}),
	rateLimit: z.object({
		windowMs: z.number(),
		maxRequests: z.number(),
		skipSuccessfulRequests: z.boolean(),
	}),
});

// Use the DATABASE_URL from environment or fallback to local directory
const dbPath =
	process.env.DATABASE_URL ||
	path.join(process.cwd(), 'database', 'vibe-booking.db');

// Ensure the database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
	fs.mkdirSync(dbDir, { recursive: true });
}

// Build SQLite configuration object
const rawSqliteConfig = {
	environment: process.env.NODE_ENV || 'development',
	version: process.env.API_VERSION || '1.0.0',
	server: {
		port: parseInt(process.env.PORT || '3001', 10),
		baseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
	},
	cors: {
		origin: process.env.CORS_ORIGIN?.split(',') || [
			'http://localhost:5173',
			'http://localhost:3000',
		],
	},
	database: {
		path: dbPath,
		enableWAL: process.env.SQLITE_ENABLE_WAL !== 'false',
		timeout: parseInt(process.env.SQLITE_TIMEOUT || '5000', 10),
		busyTimeout: parseInt(process.env.SQLITE_BUSY_TIMEOUT || '10000', 10),
	},
	cache: {
		enabled: process.env.CACHE_ENABLED !== 'false',
		ttl: parseInt(process.env.CACHE_TTL || '3600', 10),
		maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
	},
	jwt: {
		secret:
			process.env.JWT_SECRET ||
			'your-super-secret-jwt-key-change-this-in-production',
		expiresIn: process.env.JWT_EXPIRES_IN || '1h',
		refreshSecret:
			process.env.JWT_REFRESH_SECRET ||
			'your-super-secret-refresh-key-change-this-in-production',
		refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
		resetSecret:
			process.env.JWT_RESET_SECRET ||
			'your-super-secret-reset-key-change-this-in-production',
	},
	openai: {
		apiKey: process.env.OPENAI_API_KEY || '',
		model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
		maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10),
		temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
	},
	liteapi: {
		apiKey: process.env.LITEAPI_API_KEY || '',
		baseUrl: process.env.LITEAPI_BASE_URL || 'https://api.liteapi.travel/v1',
		timeout: parseInt(process.env.LITEAPI_TIMEOUT || '30000', 10),
	},
	square: {
		accessToken: process.env.SQUARE_ACCESS_TOKEN || '',
		applicationId: process.env.SQUARE_APPLICATION_ID || '',
		environment: (process.env.SQUARE_ENVIRONMENT || 'sandbox') as
			| 'sandbox'
			| 'production',
		locationId: process.env.SQUARE_LOCATION_ID,
	},
	email: {
		provider: (process.env.EMAIL_PROVIDER || 'smtp') as
			| 'sendgrid'
			| 'aws-ses'
			| 'smtp',
		from: process.env.EMAIL_FROM || 'noreply@vibebooking.com',
		apiKey: process.env.EMAIL_API_KEY,
		smtp:
			process.env.EMAIL_PROVIDER === 'smtp'
				? {
						host: process.env.SMTP_HOST || 'localhost',
						port: parseInt(process.env.SMTP_PORT || '587', 10),
						secure: process.env.SMTP_SECURE === 'true',
						user: process.env.SMTP_USER || '',
						pass: process.env.SMTP_PASS || '',
					}
				: undefined,
	},
	storage: {
		provider: (process.env.STORAGE_PROVIDER || 'local') as
			| 's3'
			| 'gcs'
			| 'local',
		bucket: process.env.STORAGE_BUCKET || 'vibebooking-uploads',
		region: process.env.AWS_REGION,
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	},
	monitoring: {
		sentryDsn: process.env.SENTRY_DSN,
		logLevel: (process.env.LOG_LEVEL || 'info') as
			| 'error'
			| 'warn'
			| 'info'
			| 'debug',
	},
	rateLimit: {
		windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
		maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
		skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true',
	},
};

// Validate and export SQLite configuration
export const sqliteConfig = sqliteConfigSchema.parse(rawSqliteConfig);

// Export type for TypeScript support
export type SqliteConfig = typeof sqliteConfig;

// Log database path for debugging
console.log(`SQLite database will be stored at: ${sqliteConfig.database.path}`);
