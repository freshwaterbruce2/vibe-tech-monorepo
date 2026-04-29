import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Security Configuration Validator
 * Ensures the application is configured with secure defaults
 */
export class SecurityConfigValidator {
	private static readonly MINIMUM_SECRET_LENGTH = 32;
	private static readonly MINIMUM_SECRET_ENTROPY = 4.0; // bits per character

	/**
	 * Validate all security configurations on startup
	 */
	static validateSecurityConfig(): void {
		const issues: string[] = [];

		// Validate JWT secrets
		issues.push(...SecurityConfigValidator.validateJWTSecrets());

		// Validate CORS configuration
		issues.push(...SecurityConfigValidator.validateCORSConfig());

		// Validate encryption settings
		issues.push(...SecurityConfigValidator.validateEncryptionConfig());

		// Validate environment-specific settings
		issues.push(...SecurityConfigValidator.validateEnvironmentConfig());

		if (issues.length > 0) {
			const isProduction = config.environment === 'production';

			if (isProduction) {
				// In production, security issues are critical
				logger.error('CRITICAL SECURITY CONFIGURATION ISSUES DETECTED', {
					issues,
					environment: config.environment,
					severity: 'CRITICAL',
				});
				throw new Error(
					`Production deployment blocked due to security configuration issues: ${issues.join(', ')}`,
				);
			} else {
				// In development, log warnings but allow startup
				logger.warn('Security configuration issues detected', {
					issues,
					environment: config.environment,
					severity: 'WARNING',
				});
			}
		} else {
			logger.info('Security configuration validation passed', {
				environment: config.environment,
				validatedAt: new Date().toISOString(),
			});
		}
	}

	/**
	 * Validate JWT secret configuration
	 */
	private static validateJWTSecrets(): string[] {
		const issues: string[] = [];

		// Check main JWT secret
		const jwtSecret = config.jwt.secret;
		if (SecurityConfigValidator.isWeakSecret(jwtSecret)) {
			issues.push('JWT secret is weak or using default value');
		}

		// Check refresh token secret
		const {refreshSecret} = config.jwt;
		if (SecurityConfigValidator.isWeakSecret(refreshSecret)) {
			issues.push('JWT refresh secret is weak or using default value');
		}

		// Check reset token secret
		const {resetSecret} = config.jwt;
		if (SecurityConfigValidator.isWeakSecret(resetSecret)) {
			issues.push('JWT reset secret is weak or using default value');
		}

		// Ensure secrets are different
		if (
			jwtSecret === refreshSecret ||
			jwtSecret === resetSecret ||
			refreshSecret === resetSecret
		) {
			issues.push(
				'JWT secrets must be unique - using same secret for multiple purposes',
			);
		}

		return issues;
	}

	/**
	 * Validate CORS configuration
	 */
	private static validateCORSConfig(): string[] {
		const issues: string[] = [];
		const origins = Array.isArray(config.cors.origin)
			? config.cors.origin
			: [config.cors.origin];

		if (config.environment === 'production') {
			// In production, ensure no localhost origins
			const hasLocalhost = origins.some(
				(origin) =>
					origin.includes('localhost') || origin.includes('127.0.0.1'),
			);

			if (hasLocalhost) {
				issues.push('Production CORS includes localhost origins');
			}

			// Ensure HTTPS origins in production
			const hasInsecureOrigins = origins.some(
				(origin) =>
					origin.startsWith('http://') && !origin.includes('localhost'),
			);

			if (hasInsecureOrigins) {
				issues.push('Production CORS allows insecure HTTP origins');
			}

			// Check for wildcard origins
			if (origins.includes('*')) {
				issues.push('Production CORS allows wildcard (*) origins');
			}
		}

		return issues;
	}

	/**
	 * Validate encryption configuration
	 */
	private static validateEncryptionConfig(): string[] {
		const issues: string[] = [];

		// Validate Stripe keys
		if (!config.stripe) {
			issues.push('Stripe configuration is missing');
		} else {
			const stripeSecretKey = config.stripe.secretKey;
			if (!stripeSecretKey || stripeSecretKey.length < 10) {
				issues.push('Stripe secret key is missing or too short');
			}

			if (
				!config.stripe.webhookSecret ||
				config.stripe.webhookSecret.length < 10
			) {
				issues.push('Stripe webhook secret is missing or too short');
			}

			// Check for test keys in production
			if (config.environment === 'production') {
				if (stripeSecretKey?.includes('sk_test_')) {
					issues.push('Production environment using Stripe test keys');
				}
			}
		}

		return issues;
	}

	/**
	 * Validate environment-specific configuration
	 */
	private static validateEnvironmentConfig(): string[] {
		const issues: string[] = [];

		if (config.environment === 'production') {
			// Ensure HTTPS base URL
			if (!config.server.baseUrl.startsWith('https://')) {
				issues.push('Production base URL must use HTTPS');
			}

			// Ensure database SSL is enabled
			if (!config.database.ssl) {
				issues.push('Production database must use SSL');
			}
		}

		return issues;
	}

	/**
	 * Check if a secret is weak or using default values
	 */
	private static isWeakSecret(secret: string): boolean {
		if (
			!secret ||
			secret.length < SecurityConfigValidator.MINIMUM_SECRET_LENGTH
		) {
			return true;
		}

		// Check for common default patterns
		const defaultPatterns = [
			'your-super-secret',
			'change-this-in-production',
			'default-secret',
			'secret-key',
			'123456',
			'password',
		];

		const lowerSecret = secret.toLowerCase();
		if (defaultPatterns.some((pattern) => lowerSecret.includes(pattern))) {
			return true;
		}

		// Calculate entropy
		const entropy = SecurityConfigValidator.calculateEntropy(secret);
		if (entropy < SecurityConfigValidator.MINIMUM_SECRET_ENTROPY) {
			return true;
		}

		return false;
	}

	/**
	 * Calculate entropy of a string (bits per character)
	 */
	private static calculateEntropy(str: string): number {
		const frequencies: Record<string, number> = {};

		// Count character frequencies
		for (const char of str) {
			frequencies[char] = (frequencies[char] || 0) + 1;
		}

		// Calculate Shannon entropy
		let entropy = 0;
		const {length} = str;

		for (const freq of Object.values(frequencies)) {
			const probability = freq / length;
			entropy -= probability * Math.log2(probability);
		}

		return entropy;
	}
}

/**
 * Runtime security checks middleware
 */
export const runtimeSecurityChecks = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	// Check for suspicious request patterns
	const suspiciousPatterns = [
		// SQL injection patterns
		/(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bUPDATE\b|\bDROP\b)/gi,
		// XSS patterns
		/<script[^>]*>.*?<\/script>/gi,
		/javascript:/gi,
		/on\w+\s*=/gi,
		// Path traversal
		/\.\.[/\\]/g,
		// Command injection
		/[;&|`$()]/g,
	];

	const userInput = JSON.stringify({
		body: req.body,
		query: req.query,
		params: req.params,
	});

	const suspiciousPattern = suspiciousPatterns.find((pattern) =>
		pattern.test(userInput),
	);

	if (suspiciousPattern) {
		logger.warn('Suspicious request pattern detected', {
			pattern: suspiciousPattern.toString(),
			path: req.path,
			method: req.method,
			ip: req.ip,
			userAgent: req.get('User-Agent'),
			userId: req.user?.id,
		});

		// In production, you might want to block these requests
		if (config.environment === 'production') {
			return res.status(400).json({
				error: 'Invalid request format',
				message: 'Request contains potentially malicious content',
			});
		}
	}

	// Check for oversized requests
	const contentLength = parseInt(req.get('Content-Length') || '0', 10);
	const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB

	if (contentLength > MAX_REQUEST_SIZE) {
		logger.warn('Oversized request detected', {
			contentLength,
			maxSize: MAX_REQUEST_SIZE,
			path: req.path,
			ip: req.ip,
		});

		return res.status(413).json({
			error: 'Request too large',
			message: 'Request exceeds maximum allowed size',
		});
	}

	return next();
};

/**
 * Generate secure random secrets for development
 */
export const generateSecureSecret = (length = 64): string => {
	return crypto.randomBytes(length).toString('hex');
};

/**
 * Middleware to validate API key format and strength
 */
export const validateApiKey = (keyName: string, required = true) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const apiKey = req.headers[keyName.toLowerCase()] as string;

		if (!apiKey) {
			if (required) {
				return res.status(401).json({
					error: 'Missing API key',
					message: `${keyName} header is required`,
				});
			}
			return next();
		}

		// Validate API key format
		if (apiKey.length < 32) {
			return res.status(401).json({
				error: 'Invalid API key',
				message: 'API key format is invalid',
			});
		}

		// Check for test keys in production
		if (config.environment === 'production' && apiKey.includes('test')) {
			logger.error('Test API key used in production', {
				keyName,
				keyPrefix: apiKey.substring(0, 8),
				ip: req.ip,
			});

			return res.status(401).json({
				error: 'Invalid API key',
				message: 'Test API keys not allowed in production',
			});
		}

		return next();
	};
};

export default SecurityConfigValidator;
