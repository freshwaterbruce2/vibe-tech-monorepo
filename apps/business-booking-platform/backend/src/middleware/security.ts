import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Enhanced security middleware for PCI-DSS compliance
 */
export const securityMiddleware = [
	// Basic helmet configuration WITHOUT CSP (we'll handle CSP separately)
	helmet({
		contentSecurityPolicy: false, // Disable CSP to prevent meta tag injection
		crossOriginEmbedderPolicy: false, // Allow Stripe iframes
		hsts: {
			maxAge: 31536000, // 1 year
			includeSubDomains: true,
			preload: true,
		},
		noSniff: true,
		frameguard: { action: 'deny' },
		xssFilter: true,
		referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
	}),

	// Custom CSP middleware (HTTP headers only - no meta tags)
	(req: Request, res: Response, next: NextFunction) => {
		const cspDirectives = [
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline' https://js.squareup.com https://connect.squareup.com https://web.squarecdn.com https://sandbox.web.squarecdn.com",
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
			"font-src 'self' https://fonts.gstatic.com",
			"img-src 'self' data: https: https://images.unsplash.com",
			"connect-src 'self' https://api.liteapi.travel https://connect.squareup.com wss://localhost:*",
			"frame-src 'self' https://js.squareup.com",
			"object-src 'none'",
			"base-uri 'self'",
			"form-action 'self'",
			'upgrade-insecure-requests',
			'block-all-mixed-content',
		];

		res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

		// Additional security headers (avoid duplicates with Helmet)
		res.setHeader(
			'Permissions-Policy',
			'camera=(), microphone=(), geolocation=()',
		);
		res.setHeader('X-DNS-Prefetch-Control', 'off');
		res.setHeader('X-Download-Options', 'noopen');
		res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

		// Cache control for sensitive data - apply to all sensitive endpoints
		if (
			req.path.includes('/payment') ||
			req.path.includes('/admin') ||
			req.path.includes('/auth') ||
			req.path.includes('/user')
		) {
			res.setHeader(
				'Cache-Control',
				'no-store, no-cache, must-revalidate, proxy-revalidate',
			);
			res.setHeader('Pragma', 'no-cache');
			res.setHeader('Expires', '0');
			res.setHeader('Surrogate-Control', 'no-store');
		}

		next();
	},
];

/**
 * Rate limiting for different endpoints
 */
export const paymentRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // Max 5 payment attempts per 15 minutes
	message: {
		error: 'Too many payment attempts',
		message: 'Please wait before trying again',
		retryAfter: '15 minutes',
	},
	standardHeaders: true,
	legacyHeaders: false,
	handler: (req, res) => {
		logger.warn('Payment rate limit exceeded', {
			ip: req.ip,
			userAgent: req.get('User-Agent'),
			path: req.path,
		});

		res.status(429).json({
			error: 'Too many payment attempts',
			message: 'Please wait 15 minutes before trying again',
		});
	},
});

export const apiRateLimit = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minute
	max: 100, // Max 100 requests per minute
	message: {
		error: 'Too many requests',
		message: 'Please slow down',
	},
	standardHeaders: true,
	legacyHeaders: false,
});

export const authRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10, // Max 10 auth attempts per 15 minutes
	message: {
		error: 'Too many authentication attempts',
		message: 'Please wait before trying again',
	},
	standardHeaders: true,
	legacyHeaders: false,
});

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	// Remove potentially dangerous characters from string inputs
	const sanitizeString = (str: string): string => {
		if (typeof str !== 'string') {
return str;
}

		// Remove script tags and other potentially dangerous content
		return str
			.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
			.replace(/javascript:/gi, '')
			.replace(/on\w+\s*=/gi, '')
			.trim();
	};

	const sanitizeObject = (obj: any): any => {
		if (typeof obj !== 'object' || obj === null) {
return obj;
}

		if (Array.isArray(obj)) {
			return obj.map((item) => sanitizeObject(item));
		}

		const sanitized: any = {};
		for (const [key, value] of Object.entries(obj)) {
			if (typeof value === 'string') {
				sanitized[key] = sanitizeString(value);
			} else if (typeof value === 'object') {
				sanitized[key] = sanitizeObject(value);
			} else {
				sanitized[key] = value;
			}
		}
		return sanitized;
	};

	// Sanitize request body
	if (req.body && typeof req.body === 'object') {
		req.body = sanitizeObject(req.body);
	}

	// Sanitize query parameters
	if (req.query && typeof req.query === 'object') {
		req.query = sanitizeObject(req.query);
	}

	next();
};

/**
 * Request logging middleware for audit trails (PCI-DSS requirement)
 */
export const auditLogger = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const startTime = Date.now();

	// Don't log sensitive data
	const isSensitiveRoute =
		req.path.includes('/payment') || req.path.includes('/admin');

	const originalSend = res.send;
	res.send = function (body: any) {
		const duration = Date.now() - startTime;

		// Log request details (without sensitive data)
		logger.info('HTTP Request', {
			method: req.method,
			path: req.path,
			statusCode: res.statusCode,
			duration,
			ip: req.ip,
			userAgent: req.get('User-Agent'),
			userId: req.user?.id,
			sensitive: isSensitiveRoute,
			// Don't log request/response body for sensitive routes
			requestBody: isSensitiveRoute ? '[REDACTED]' : req.body,
			responseSize: Buffer.byteLength(body || ''),
		});

		return originalSend.call(this, body);
	};

	next();
};

/**
 * IP whitelist middleware for admin endpoints with CIDR support
 */
export const ipWhitelist = (allowedIPs: string[] = []) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const clientIP = req.ip || req.connection.remoteAddress || '';

		// In development, allow all IPs (but log for awareness)
		if (config.environment === 'development') {
			logger.debug('Admin access in development mode', {
				ip: clientIP,
				path: req.path,
				environment: 'development',
			});
			return next();
		}

		// Production default admin IPs if none provided
		const defaultProductionIPs = [
			process.env.ADMIN_IP_1 || '127.0.0.1',
			process.env.ADMIN_IP_2 || '::1',
			// Add your production server IPs here
			process.env.PRODUCTION_SERVER_IP || '',
		].filter((ip) => ip.length > 0);

		const finalAllowedIPs =
			allowedIPs.length > 0 ? allowedIPs : defaultProductionIPs;

				// Check if IP is in whitelist with CIDR support
		const isAllowed = finalAllowedIPs.some((allowedIP) => {
			if (allowedIP.includes('/')) {
				// Basic CIDR notation support for common cases
				const [network, prefixLength] = allowedIP.split('/');
				if (!network || !prefixLength) {
return false;
}
				const prefix = parseInt(prefixLength, 10);

				// Simple IPv4 CIDR check (for production, consider using 'ip' library)
				if (network.includes('.') && clientIP.includes('.')) {
					const networkParts = network.split('.').map(Number);
					const clientParts = clientIP.split('.').map(Number);

					// Simplified CIDR check for /24 and /16 networks
					if (prefix === 24) {
						return networkParts
							.slice(0, 3)
							.every((part, i) => part === clientParts[i]);
					} else if (prefix === 16) {
						return networkParts
							.slice(0, 2)
							.every((part, i) => part === clientParts[i]);
					}
				}
				return false;
			}
			return clientIP === allowedIP || clientIP.includes(allowedIP);
		});

		if (!isAllowed) {
			logger.warn('Unauthorized IP access attempt to admin endpoint', {
				ip: clientIP,
				path: req.path,
				userAgent: req.get('User-Agent'),
				allowedIPs: finalAllowedIPs,
				environment: config.environment,
			});

			return res.status(403).json({
				error: 'Access denied',
				message: 'Your IP address is not authorized to access this endpoint',
				code: 'IP_NOT_WHITELISTED',
			});
		}

		// Log successful admin access for audit
		logger.info('Authorized admin access', {
			ip: clientIP,
			path: req.path,
			environment: config.environment,
		});

		next();
	};
};

/**
 * Webhook signature verification for Stripe
 */
export const verifyWebhookSignature = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	// For Stripe webhooks, we need the raw body
	if (req.path === '/api/payments/webhook') {
		const signature = req.headers['stripe-signature'] as string;

		if (!signature) {
			logger.warn('Webhook request without signature', {
				ip: req.ip,
				path: req.path,
			});

			return res.status(400).json({
				error: 'Missing signature',
				message: 'Webhook signature is required',
			});
		}

		// The actual signature verification is done in the webhook handler
		// This middleware just ensures the signature header is present
	}

	next();
};

/**
 * Session security middleware
 */
interface SessionCookie {
	secure?: boolean;
	httpOnly?: boolean;
	sameSite?: 'strict' | 'lax' | 'none';
	maxAge?: number;
}

export const sessionSecurity = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	// Set secure session cookies (express-session augments req at runtime)
	const reqWithSession = req as Request & { session?: { cookie: SessionCookie } };
	if (reqWithSession.session) {
		reqWithSession.session.cookie.secure = config.environment === 'production';
		reqWithSession.session.cookie.httpOnly = true;
		reqWithSession.session.cookie.sameSite = 'strict';
		reqWithSession.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
	}

	next();
};

/**
 * CORS configuration for payment endpoints
 */
export const paymentCors = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const allowedOrigins = Array.isArray(config.cors.origin)
		? config.cors.origin
		: [config.cors.origin];

	const {origin} = req.headers;

	if (origin && allowedOrigins.includes(origin)) {
		res.setHeader('Access-Control-Allow-Origin', origin);
	}

	res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.setHeader(
		'Access-Control-Allow-Methods',
		'GET, POST, PUT, DELETE, OPTIONS',
	);
	res.setHeader(
		'Access-Control-Allow-Headers',
		'Content-Type, Authorization, X-Requested-With',
	);
	res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

	if (req.method === 'OPTIONS') {
		res.status(200).end();
		return;
	}

	next();
};

/**
 * Data validation middleware for sensitive operations
 */
export const validateSensitiveData = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	// Validate that no sensitive card data is being sent
	const checkForCardData = (obj: any, path = ''): string | null => {
		if (typeof obj !== 'object' || obj === null) {
return null;
}

		for (const [key, value] of Object.entries(obj)) {
			const currentPath = path ? `${path}.${key}` : key;

			// Check for potential card data patterns
			if (typeof value === 'string') {
				// Credit card number pattern (simplified)
				if (/^\d{13,19}$/.test(value.replace(/\s/g, ''))) {
					return `Possible card number detected at ${currentPath}`;
				}

				// CVV pattern
				if (
					key.toLowerCase().includes('cvv') ||
					key.toLowerCase().includes('cvc')
				) {
					return `CVV/CVC data detected at ${currentPath}`;
				}

				// Expiry pattern
				if (
					/^\d{2}\/\d{2}$/.test(value) &&
					(key.toLowerCase().includes('exp') ||
						key.toLowerCase().includes('date'))
				) {
					return `Expiry date detected at ${currentPath}`;
				}
			} else if (typeof value === 'object') {
				const result = checkForCardData(value, currentPath);
				if (result) {
return result;
}
			}
		}

		return null;
	};

	if (req.body) {
		const cardDataFound = checkForCardData(req.body);
		if (cardDataFound) {
			logger.error('Sensitive card data detected in request', {
				path: req.path,
				method: req.method,
				ip: req.ip,
				detection: cardDataFound,
			});

			res.status(400).json({
				error: 'Invalid request data',
				message:
					'Sensitive payment information should not be sent directly to this endpoint',
			});
			return;
		}
	}

	next();
};

/**
 * Error handling middleware for security
 */
export const securityErrorHandler = (
	err: any,
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	// Log security-related errors
	logger.error('Security middleware error', {
		error: err.message,
		stack: err.stack,
		path: req.path,
		method: req.method,
		ip: req.ip,
	});

	// Don't expose internal error details in production
	if (config.environment === 'production') {
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An error occurred while processing your request',
		});
		return;
	}

	next(err);
};
