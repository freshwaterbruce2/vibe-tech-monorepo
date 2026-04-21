import path from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom log format
const logFormat = printf(
	({ level, message, timestamp, stack, ...metadata }) => {
		let log = `${timestamp} [${level}]: ${message}`;

		if (Object.keys(metadata).length > 0) {
			log += ` ${JSON.stringify(metadata)}`;
		}

		if (stack) {
			log += `\n${stack}`;
		}

		return log;
	},
);

// Dynamically determine log directory
const serviceName = 'business-booking-platform-backend';
const bookingPlatformLogDir = process.env.ANTIGRAVITY_LOGS
	? path.join(process.env.ANTIGRAVITY_LOGS, serviceName)
	: path.join(__dirname, '..', '..', 'logs');

// Create logger instance
export const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || 'info',
	format: combine(
		errors({ stack: true }),
		timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
		logFormat,
	),
	transports: [
		// Console transport
		new winston.transports.Console({
			format: combine(
				colorize(),
				errors({ stack: true }),
				timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
				logFormat,
			),
		}),
		// File transport for errors (only if LOG_FILE is set)
		...(process.env.LOG_FILE
			? [
					new winston.transports.File({
						filename: path.join(bookingPlatformLogDir, 'error.log'),
						level: 'error',
						maxsize: 5242880, // 5MB
						maxFiles: 5,
					}),
					// File transport for all logs
					new winston.transports.File({
						filename: path.join(bookingPlatformLogDir, 'combined.log'),
						maxsize: 5242880, // 5MB
						maxFiles: 5,
					}),
				]
			: []),
	],
	// Handle uncaught exceptions
	exceptionHandlers: [
		new winston.transports.File({
			filename: path.join(bookingPlatformLogDir, 'exceptions.log'),
		}),
	],
	// Handle unhandled promise rejections
	rejectionHandlers: [
		new winston.transports.File({
			filename: path.join(bookingPlatformLogDir, 'rejections.log'),
		}),
	],
});

// Minimal constructor signature for winston-transport-sentry-node (no published types).
type SentryTransportConstructor = new (options: {
		sentry: { dsn: string; environment: string };
		level: string;
	}) => winston.transport;

// Add Sentry transport in production (using dynamic import for ESM)
if (config.monitoring.sentryDsn && config.environment === 'production') {
	(import('winston-transport-sentry-node') as Promise<{ default: SentryTransportConstructor }>)
		.then((module) => {
			const Sentry = module.default;
			logger.add(
				new Sentry({
					sentry: {
						dsn: config.monitoring.sentryDsn as string,
						environment: config.environment,
					},
					level: 'error',
				}),
			);
			logger.info('Sentry transport initialized');
		})
		.catch((error) => {
			logger.error('Failed to load Sentry transport:', error);
		});
}

// Create a stream object for Morgan
export const stream = {
	write: (message: string) => {
		logger.info(message.trim());
	},
};
