/**
 * Advanced Security Utilities
 * Content Security Policy, XSS protection, and security headers management
 */

import { analytics } from './analytics';
import { logger } from './logger';

export interface SecurityConfig {
	csp: {
		enabled: boolean;
		reportOnly?: boolean;
		directives: CSPDirectives;
	};
	xssProtection: boolean;
	clickjacking: boolean;
	contentTypeSniffing: boolean;
	referrerPolicy: string;
	hsts: {
		enabled: boolean;
		maxAge: number;
		includeSubDomains: boolean;
	};
}

export interface CSPDirectives {
	defaultSrc?: string[];
	scriptSrc?: string[];
	styleSrc?: string[];
	imgSrc?: string[];
	connectSrc?: string[];
	fontSrc?: string[];
	mediaSrc?: string[];
	objectSrc?: string[];
	frameSrc?: string[];
	baseUri?: string[];
	formAction?: string[];
	upgradeInsecureRequests?: boolean;
	blockAllMixedContent?: boolean;
}

export interface SecurityViolation {
	type: 'csp' | 'xss' | 'clickjacking' | 'mixed-content';
	details: unknown;
	userAgent: string;
	timestamp: number;
	url: string;
}

class SecurityManager {
	private static instance: SecurityManager;
	private config: SecurityConfig;
	private violations: SecurityViolation[] = [];
	private nonceValue: string | null = null;

	constructor() {
		this.config = this.getDefaultConfig();
		this.initialize();
	}

	static getInstance(): SecurityManager {
		if (!SecurityManager.instance) {
			SecurityManager.instance = new SecurityManager();
		}
		return SecurityManager.instance;
	}

	/**
	 * Initialize security measures
	 */
	initialize(): void {
		this.setupCSP();
		this.setupXSSProtection();
		this.setupClickjackingProtection();
		this.setupSecurityEventListeners();
		this.generateNonce();

		logger.info('Security measures initialized', {
			component: 'SecurityManager',
			cspEnabled: this.config.csp.enabled,
			xssProtection: this.config.xssProtection,
		});
	}

	/**
	 * Update security configuration
	 */
	updateConfig(newConfig: Partial<SecurityConfig>): void {
		this.config = { ...this.config, ...newConfig };
		this.initialize(); // Re-initialize with new config

		logger.info('Security configuration updated', {
			component: 'SecurityManager',
			changes: Object.keys(newConfig),
		});
	}

	/**
	 * Get current security nonce for inline scripts
	 */
	getNonce(): string {
		if (!this.nonceValue) {
			this.generateNonce();
		}
		return this.nonceValue as string;
	}

	/**
	 * Sanitize HTML content to prevent XSS
	 */
	sanitizeHTML(html: string): string {
		// Create a temporary div element
		const temp = document.createElement('div');
		temp.textContent = html;

		// Remove dangerous attributes and elements
		const sanitized = temp.innerHTML
			.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
			.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
			.replace(/javascript:/gi, '')
			.replace(/on\w+="[^"]*"/gi, '')
			.replace(/on\w+='[^']*'/gi, '');

		logger.debug('HTML content sanitized', {
			component: 'SecurityManager',
			originalLength: html.length,
			sanitizedLength: sanitized.length,
		});

		return sanitized;
	}

	/**
	 * Validate and sanitize user input
	 */
	sanitizeInput(
		input: string,
		type: 'text' | 'email' | 'url' | 'number' = 'text',
	): string {
		let sanitized = input.trim();

		// Remove potentially dangerous characters
		sanitized = sanitized
			.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
			.replace(/javascript:/gi, '')
			.replace(/data:/gi, '')
			.replace(/vbscript:/gi, '');

		// Type-specific validation
		switch (type) {
			case 'email':
				sanitized = sanitized.replace(/[^\w@.-]/g, '');
				break;
			case 'url':
				try {
					const url = new URL(sanitized);
					if (!['http:', 'https:'].includes(url.protocol)) {
						throw new Error('Invalid protocol');
					}
				} catch {
					sanitized = '';
				}
				break;
			case 'number':
				sanitized = sanitized.replace(/[^\d.-]/g, '');
				break;
		}

		return sanitized;
	}

	/**
	 * Generate secure random token
	 */
	generateSecureToken(length = 32): string {
		const array = new Uint8Array(length);
		crypto.getRandomValues(array);
		return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
			'',
		);
	}

	/**
	 * Validate origin for CORS requests
	 */
	validateOrigin(origin: string): boolean {
		const allowedOrigins = [
			window.location.origin,
			'https://api.liteapi.travel',
			'https://connect.squareup.com',
			'https://js.squareup.com',
		];

		return allowedOrigins.some((allowed) => {
			if (allowed === origin) {
return true;
}
			if (allowed.endsWith('.netlify.app') && origin.endsWith('.netlify.app')) {
return true;
}
			if (allowed.endsWith('.vercel.app') && origin.endsWith('.vercel.app')) {
return true;
}
			return false;
		});
	}

	/**
	 * Check for potential security threats
	 */
	detectThreats(request: {
		url: string;
		headers: Record<string, string>;
		body?: unknown;
	}): string[] {
		const threats: string[] = [];

		// Check for XSS attempts
		if (
			this.hasXSSPatterns(request.url) ||
			this.hasXSSPatterns(JSON.stringify(request.body))
		) {
			threats.push('xss_attempt');
		}

		// Check for SQL injection patterns
		if (
			this.hasSQLInjectionPatterns(request.url) ||
			this.hasSQLInjectionPatterns(JSON.stringify(request.body))
		) {
			threats.push('sql_injection_attempt');
		}

		// Check for suspicious headers
		if (this.hasSuspiciousHeaders(request.headers)) {
			threats.push('suspicious_headers');
		}

		// Check for path traversal attempts
		if (this.hasPathTraversalPatterns(request.url)) {
			threats.push('path_traversal_attempt');
		}

		if (threats.length > 0) {
			logger.warn('Security threats detected', {
				component: 'SecurityManager',
				threats,
				url: request.url,
			});

			analytics.track('security_threat_detected', {
				threats,
				url: request.url,
				userAgent: navigator.userAgent,
			});
		}

		return threats;
	}

	/**
	 * Get security violations report
	 */
	getViolationsReport(): SecurityViolation[] {
		return [...this.violations];
	}

	/**
	 * Clear security violations
	 */
	clearViolations(): void {
		this.violations = [];
		logger.debug('Security violations cleared', {
			component: 'SecurityManager',
		});
	}

	private getDefaultConfig(): SecurityConfig {
		return {
			csp: {
				enabled: true,
				reportOnly: import.meta.env.MODE === 'development',
				directives: {
					defaultSrc: ["'self'"],
					scriptSrc: [
						"'self'",
						"'unsafe-inline'", // Needed for React in development
						'https://js.squareup.com',
						'https://connect.squareup.com',
						'https://www.googletagmanager.com',
					],
					styleSrc: [
						"'self'",
						"'unsafe-inline'",
						'https://fonts.googleapis.com',
					],
					imgSrc: ["'self'", 'data:', 'https:', 'https://images.unsplash.com'],
					connectSrc: [
						"'self'",
						'https://api.liteapi.travel',
						'https://connect.squareup.com',
						'wss://localhost:*',
					],
					fontSrc: ["'self'", 'https://fonts.gstatic.com'],
					mediaSrc: ["'self'"],
					objectSrc: ["'none'"],
					frameSrc: ["'self'", 'https://js.squareup.com'],
					baseUri: ["'self'"],
					formAction: ["'self'"],
					upgradeInsecureRequests: true,
					blockAllMixedContent: true,
				},
			},
			xssProtection: true,
			clickjacking: true,
			contentTypeSniffing: false,
			referrerPolicy: 'strict-origin-when-cross-origin',
			hsts: {
				enabled: true,
				maxAge: 31536000, // 1 year
				includeSubDomains: true,
			},
		};
	}

	private setupCSP(): void {
		if (!this.config.csp.enabled) {
return;
}

		const policy = this.buildCSPPolicy(this.config.csp.directives);
		const headerName = this.config.csp.reportOnly
			? 'Content-Security-Policy-Report-Only'
			: 'Content-Security-Policy';

		// Set CSP meta tag (fallback)
		let metaTag = document.querySelector(
			'meta[http-equiv="Content-Security-Policy"]',
		) as HTMLMetaElement;
		if (!metaTag) {
			metaTag = document.createElement('meta');
			metaTag.setAttribute('http-equiv', headerName);
			document.head.appendChild(metaTag);
		}
		metaTag.content = policy;

		logger.debug('CSP policy applied', {
			component: 'SecurityManager',
			policy: `${policy.slice(0, 200)}...`,
			reportOnly: this.config.csp.reportOnly,
		});
	}

	private buildCSPPolicy(directives: CSPDirectives): string {
		const policy: string[] = [];

		Object.entries(directives).forEach(([key, value]) => {
			if (value === true) {
				policy.push(this.camelToKebab(key));
			} else if (Array.isArray(value) && value.length > 0) {
				policy.push(`${this.camelToKebab(key)} ${value.join(' ')}`);
			}
		});

		// Add nonce for inline scripts in production
		if (import.meta.env.MODE === 'production' && this.nonceValue) {
			const scriptSrcIndex = policy.findIndex((directive) =>
				directive.startsWith('script-src'),
			);
			if (scriptSrcIndex > -1) {
				policy[scriptSrcIndex] += ` 'nonce-${this.nonceValue}'`;
			}
		}

		return policy.join('; ');
	}

	private setupXSSProtection(): void {
		if (!this.config.xssProtection) {
return;
}

		// Set XSS protection meta tag
		let metaTag = document.querySelector(
			'meta[http-equiv="X-XSS-Protection"]',
		) as HTMLMetaElement;
		if (!metaTag) {
			metaTag = document.createElement('meta');
			metaTag.setAttribute('http-equiv', 'X-XSS-Protection');
			document.head.appendChild(metaTag);
		}
		metaTag.content = '1; mode=block';
	}

	private setupClickjackingProtection(): void {
		if (!this.config.clickjacking) {
return;
}

		// Set X-Frame-Options meta tag
		let metaTag = document.querySelector(
			'meta[http-equiv="X-Frame-Options"]',
		) as HTMLMetaElement;
		if (!metaTag) {
			metaTag = document.createElement('meta');
			metaTag.setAttribute('http-equiv', 'X-Frame-Options');
			document.head.appendChild(metaTag);
		}
		metaTag.content = 'DENY';
	}

	private setupSecurityEventListeners(): void {
		// Listen for CSP violations
		document.addEventListener('securitypolicyviolation', (event) => {
			const violation: SecurityViolation = {
				type: 'csp',
				details: {
					blockedURI: event.blockedURI,
					violatedDirective: event.violatedDirective,
					originalPolicy: event.originalPolicy,
					sourceFile: event.sourceFile,
					lineNumber: event.lineNumber,
				},
				userAgent: navigator.userAgent,
				timestamp: Date.now(),
				url: window.location.href,
			};

			this.violations.push(violation);

			logger.warn('CSP violation detected', {
				component: 'SecurityManager',
				violation: violation.details,
			});

			analytics.track('csp_violation', violation.details as Record<string, unknown>);
		});

		// Listen for mixed content issues
		window.addEventListener('error', (event) => {
			if (event.message && event.message.includes('Mixed Content')) {
				const violation: SecurityViolation = {
					type: 'mixed-content',
					details: {
						message: event.message,
						filename: event.filename,
						lineno: event.lineno,
					},
					userAgent: navigator.userAgent,
					timestamp: Date.now(),
					url: window.location.href,
				};

				this.violations.push(violation);

				logger.warn('Mixed content violation', {
					component: 'SecurityManager',
					violation: violation.details,
				});
			}
		});
	}

	private generateNonce(): void {
		this.nonceValue = this.generateSecureToken(16);
	}

	private hasXSSPatterns(input: string): boolean {
		if (!input) {
return false;
}

		const xssPatterns = [
			/<script[^>]*>.*?<\/script>/gi,
			/javascript:/gi,
			/on\w+\s*=/gi,
			/<iframe/gi,
			/eval\s*\(/gi,
			/expression\s*\(/gi,
		];

		return xssPatterns.some((pattern) => pattern.test(input));
	}

	private hasSQLInjectionPatterns(input: string): boolean {
		if (!input) {
return false;
}

		const sqlPatterns = [
			/union\s+select/gi,
			/drop\s+table/gi,
			/insert\s+into/gi,
			/delete\s+from/gi,
			/update\s+set/gi,
			/or\s+1\s*=\s*1/gi,
			/and\s+1\s*=\s*1/gi,
		];

		return sqlPatterns.some((pattern) => pattern.test(input));
	}

	private hasPathTraversalPatterns(input: string): boolean {
		if (!input) {
return false;
}

		const traversalPatterns = [
			/\.\.\//g,
			/\.\.[\\/]/g,
			/%2e%2e%2f/gi,
			/%2e%2e%5c/gi,
		];

		return traversalPatterns.some((pattern) => pattern.test(input));
	}

	private hasSuspiciousHeaders(headers: Record<string, string>): boolean {
		const suspiciousPatterns = [
			'X-Forwarded-For',
			'X-Real-IP',
			'X-Originating-IP',
		];

		return Object.keys(headers).some(
			(header) =>
				suspiciousPatterns.includes(header) &&
				headers[header]?.includes('127.0.0.1'),
		);
	}

	private camelToKebab(str: string): string {
		return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
	}
}

export const securityManager = SecurityManager.getInstance();

// React hook for security utilities
export const useSecurity = () => {
	return {
		sanitizeHTML: securityManager.sanitizeHTML.bind(securityManager),
		sanitizeInput: securityManager.sanitizeInput.bind(securityManager),
		generateSecureToken:
			securityManager.generateSecureToken.bind(securityManager),
		validateOrigin: securityManager.validateOrigin.bind(securityManager),
		detectThreats: securityManager.detectThreats.bind(securityManager),
		getNonce: securityManager.getNonce.bind(securityManager),
	};
};
