import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

// Create a rate limiter for general API requests
export const rateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per windowMs
	message: {
		error: 'Too Many Requests',
		message: 'Too many requests from this IP, please try again later.',
		retryAfter: '15 minutes',
	},
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	handler: (req: Request, res: Response) => {
		logger.warn('Rate limit exceeded', {
			ip: req.ip,
			userAgent: req.get('User-Agent'),
			path: req.path,
			method: req.method,
		});

		res.status(429).json({
			error: 'Too Many Requests',
			message: 'Too many requests from this IP, please try again later.',
			retryAfter: '15 minutes',
		});
	},
});

// Stricter rate limiter for authentication endpoints
export const authRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // Limit each IP to 5 auth requests per windowMs
	message: {
		error: 'Too Many Authentication Attempts',
		message: 'Too many authentication attempts, please try again later.',
		retryAfter: '15 minutes',
	},
	skipSuccessfulRequests: true, // Don't count successful requests
	handler: (req: Request, res: Response) => {
		logger.warn('Auth rate limit exceeded', {
			ip: req.ip,
			userAgent: req.get('User-Agent'),
			path: req.path,
			method: req.method,
		});

		res.status(429).json({
			error: 'Too Many Authentication Attempts',
			message: 'Too many authentication attempts, please try again later.',
			retryAfter: '15 minutes',
		});
	},
});

// Rate limiter for password reset requests
export const passwordResetRateLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 3, // Limit each IP to 3 password reset requests per hour
	message: {
		error: 'Too Many Password Reset Requests',
		message: 'Too many password reset requests, please try again later.',
		retryAfter: '1 hour',
	},
	handler: (req: Request, res: Response) => {
		logger.warn('Password reset rate limit exceeded', {
			ip: req.ip,
			userAgent: req.get('User-Agent'),
			email: req.body.email,
		});

		res.status(429).json({
			error: 'Too Many Password Reset Requests',
			message: 'Too many password reset requests, please try again later.',
			retryAfter: '1 hour',
		});
	},
});

// Rate limiter for search requests (more lenient)
export const searchRateLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minute
	max: 30, // Limit each IP to 30 search requests per minute
	message: {
		error: 'Too Many Search Requests',
		message: 'Too many search requests, please slow down.',
		retryAfter: '1 minute',
	},
	handler: (req: Request, res: Response) => {
		logger.warn('Search rate limit exceeded', {
			ip: req.ip,
			userAgent: req.get('User-Agent'),
			query: req.query,
		});

		res.status(429).json({
			error: 'Too Many Search Requests',
			message: 'Too many search requests, please slow down.',
			retryAfter: '1 minute',
		});
	},
});

// Rate limiter for booking creation (strict)
export const bookingRateLimiter = rateLimit({
	windowMs: 10 * 60 * 1000, // 10 minutes
	max: 3, // Limit each IP to 3 booking attempts per 10 minutes
	message: {
		error: 'Too Many Booking Attempts',
		message: 'Too many booking attempts, please try again later.',
		retryAfter: '10 minutes',
	},
	handler: (req: Request, res: Response) => {
		logger.warn('Booking rate limit exceeded', {
			ip: req.ip,
			userAgent: req.get('User-Agent'),
			userId: req.user?.id,
		});

		res.status(429).json({
			error: 'Too Many Booking Attempts',
			message: 'Too many booking attempts, please try again later.',
			retryAfter: '10 minutes',
		});
	},
});
