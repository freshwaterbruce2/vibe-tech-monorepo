import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
	statusCode?: number;
	isOperational?: boolean;
	code?: string;
}

export const errorHandler = (
	err: AppError,
	req: Request,
	res: Response,
	_next: NextFunction,
) => {
	// Default error values
	let error = { ...err };
	error.message = err.message;

	// Log error
	logger.error('Error caught by error handler', {
		error: error.message,
		stack: error.stack,
		url: req.originalUrl,
		method: req.method,
		ip: req.ip,
		userAgent: req.get('User-Agent'),
		userId: req.user?.id,
	});

	// Mongoose bad ObjectId
	if (err.name === 'CastError') {
		const message = 'Resource not found';
		error = { name: 'ValidationError', message, statusCode: 404 } as AppError;
	}

	// Mongoose duplicate key
	if (err.code === '11000') {
		const message = 'Duplicate field value entered';
		error = { name: 'ValidationError', message, statusCode: 400 } as AppError;
	}

	// Mongoose validation error
	if (err.name === 'ValidationError') {
		const message = 'Invalid input data';
		error = { name: 'ValidationError', message, statusCode: 400 } as AppError;
	}

	// JWT errors
	if (err.name === 'JsonWebTokenError') {
		const message = 'Invalid token. Please log in again';
		error = {
			name: 'AuthenticationError',
			message,
			statusCode: 401,
		} as AppError;
	}

	if (err.name === 'TokenExpiredError') {
		const message = 'Token expired. Please log in again';
		error = {
			name: 'AuthenticationError',
			message,
			statusCode: 401,
		} as AppError;
	}

	// Stripe errors
	if (err.type?.startsWith('Stripe')) {
		const message = 'Payment processing failed';
		error = { name: 'PaymentError', message, statusCode: 400 } as AppError;
	}

	// Don't send error details in production
	const isDevelopment = process.env.NODE_ENV === 'development';

	res.status(error.statusCode || 500).json({
		success: false,
		error: error.name || 'ServerError',
		message: error.message || 'Internal server error',
		...(isDevelopment && {
			stack: error.stack,
			details: error,
		}),
	});
};

export const notFoundHandler = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const error: AppError = new Error(`Not Found - ${req.originalUrl}`);
	error.statusCode = 404;
	next(error);
};

export const asyncHandler =
	(fn: Function) => (req: Request, res: Response, next: NextFunction) => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};
