import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

declare module 'express-serve-static-core' {
	interface Request {
		rawBody?: Buffer;
	}
}

/**
 * Middleware to capture raw request body for webhook signature verification
 * This must be applied before any JSON body parsing middleware
 */
export const captureRawBody = (
	req: Request,
	_res: Response,
	next: NextFunction,
): void => {
	// Only capture raw body for webhook endpoints
	if (req.path.includes('/webhook')) {
		const chunks: Buffer[] = [];

		req.on('data', (chunk: Buffer) => {
			chunks.push(chunk);
		});

		req.on('end', () => {
			req.rawBody = Buffer.concat(chunks);
			next();
		});

		req.on('error', (error) => {
			logger.error('Error capturing raw body:', error);
			next(error);
		});
	} else {
		next();
	}
};

/**
 * Alternative middleware for specific webhook routes
 * Use this if you want to apply raw body capture only to specific routes
 */
export const webhookRawBody = (
	req: Request,
	res: Response,
	next: NextFunction,
): void => {
	const chunks: Buffer[] = [];

	req.on('data', (chunk: Buffer) => {
		chunks.push(chunk);
	});

	req.on('end', () => {
		req.rawBody = Buffer.concat(chunks);
		next();
	});

	req.on('error', (error) => {
		logger.error('Error capturing raw body for webhook:', error);
		res.status(400).json({
			error: 'Bad Request',
			message: 'Error reading request body',
		});
	});
};
