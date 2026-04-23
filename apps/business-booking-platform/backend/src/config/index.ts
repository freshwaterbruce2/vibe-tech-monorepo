import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

const requireEnv = (name: string): string => {
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
};

const databaseUrl = process.env.DATABASE_URL?.trim();
const parsedDatabaseUrl =
	databaseUrl && databaseUrl !== ':memory:' ? new URL(databaseUrl) : null;
const databaseNameFromUrl = parsedDatabaseUrl?.pathname.replace(/^\/+/, '');
const databasePassword =
	process.env.DB_PASSWORD?.trim() ||
	parsedDatabaseUrl?.password ||
	undefined;

if (!databasePassword) {
	throw new Error('Missing required environment variable: DB_PASSWORD or DATABASE_URL');
}

// Configuration schema
const configSchema = z.object({
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
		host: z.string(),
		port: z.number(),
		name: z.string(),
		user: z.string(),
		password: z.string(),
		ssl: z.boolean(),
		poolSize: z.number(),
	}),
	redis: z.object({
		host: z.string(),
		port: z.number(),
		password: z.string().optional(),
		db: z.number(),
		ttl: z.number(),
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
	// Stripe (legacy) kept optional for transitional compile; will be removed when fully Square-only
	stripe: z
		.object({
			secretKey: z.string().optional(),
			webhookSecret: z.string().optional(),
			currency: z.string().length(3).default('USD'),
		})
		.optional(),
	square: z.object({
		accessToken: z.string(),
		applicationId: z.string(),
		environment: z.enum(['sandbox', 'production']),
		locationId: z.string().optional(),
		webhookSignatureKey: z.string().optional(),
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

// Build configuration object
const rawConfig = {
	environment: process.env.NODE_ENV || 'development',
	version: process.env.API_VERSION || '1.0.0',
	server: {
		port: parseInt(process.env.PORT || '3001', 10),
		baseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
	},
	cors: {
		origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
	},
	database: {
		host: process.env.DB_HOST || parsedDatabaseUrl?.hostname || 'localhost',
		port: parseInt(
			process.env.DB_PORT || parsedDatabaseUrl?.port || '5432',
			10,
		),
		name:
			process.env.DB_NAME ||
			(databaseNameFromUrl ? decodeURIComponent(databaseNameFromUrl) : 'hotelbooking'),
		user:
			process.env.DB_USER ||
			(parsedDatabaseUrl?.username
				? decodeURIComponent(parsedDatabaseUrl.username)
				: 'postgres'),
		password: databasePassword,
		ssl:
			process.env.DB_SSL === 'true' ||
			parsedDatabaseUrl?.searchParams.get('sslmode') === 'require',
		poolSize: parseInt(process.env.DB_POOL_SIZE || '20', 10),
	},
	redis: {
		host: process.env.REDIS_HOST || 'localhost',
		port: parseInt(process.env.REDIS_PORT || '6379', 10),
		password: process.env.REDIS_PASSWORD,
		db: parseInt(process.env.REDIS_DB || '0', 10),
		ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
	},
	jwt: {
		secret: requireEnv('JWT_SECRET'),
		expiresIn: process.env.JWT_EXPIRES_IN || '1h',
		refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
		refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
		resetSecret: requireEnv('JWT_RESET_SECRET'),
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
	stripe: {
		secretKey: process.env.STRIPE_SECRET_KEY,
		webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
		currency: process.env.STRIPE_CURRENCY || 'USD',
	},
	square: {
		accessToken: process.env.SQUARE_ACCESS_TOKEN || '',
		applicationId: process.env.SQUARE_APPLICATION_ID || '',
		environment: (process.env.SQUARE_ENVIRONMENT || 'sandbox') as
			| 'sandbox'
			| 'production',
		locationId: process.env.SQUARE_LOCATION_ID,
		webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
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

// Validate and export configuration
export const config = configSchema.parse(rawConfig);

// Export type for TypeScript support
export type Config = typeof config;
