import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

export interface RequestWithId extends Request {
	id: string;
	startTime: number;
}

export const requestLogger = (
	req: RequestWithId,
	res: Response,
	next: NextFunction,
) => {
	// Add unique request ID
	req.id = randomUUID();
	req.startTime = Date.now();

	// Add request ID to response headers
	res.setHeader('X-Request-ID', req.id);

	// Log incoming request
	logger.info('Incoming request', {
		requestId: req.id,
		method: req.method,
		url: req.originalUrl,
		ip: req.ip,
		userAgent: req.get('User-Agent'),
		contentType: req.get('Content-Type'),
		contentLength: req.get('Content-Length'),
		userId: req.user?.id,
	});

	// Override res.json to log response data
	const originalJson = res.json;
	res.json = function (body: any) {
		const duration = Date.now() - req.startTime;

		// Log response
		logger.info('Outgoing response', {
			requestId: req.id,
			method: req.method,
			url: req.originalUrl,
			statusCode: res.statusCode,
			duration: `${duration}ms`,
			userId: req.user?.id,
			responseSize: JSON.stringify(body).length,
		});

		return originalJson.call(this, body);
	};

	// Log when request finishes
	res.on('finish', () => {
		const duration = Date.now() - req.startTime;

		logger.info('Request completed', {
			requestId: req.id,
			method: req.method,
			url: req.originalUrl,
			statusCode: res.statusCode,
			duration: `${duration}ms`,
			userId: req.user?.id,
		});
	});

	next();
};
