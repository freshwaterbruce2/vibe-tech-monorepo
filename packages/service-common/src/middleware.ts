// Shared Express middleware for all microservices

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { logger } from './logger';
import { ZodError } from 'zod';

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
    });
  });
  
  next();
};

// Error handling middleware
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation Error',
      details: err.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({ error: 'Token expired' });
    return;
  }

  // Default error response
  const statusCode = err.statusCode ?? 500;
  res.status(statusCode).json({
    error: err.message ?? 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Health check endpoint factory
export const createHealthCheck = (serviceName: string) => {
  return (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: serviceName,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  };
};

// Async handler wrapper (avoids try-catch in every route)
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Rate limit config helper
export const createRateLimitConfig = (options?: {
  windowMs?: number;
  max?: number;
  message?: string;
}) => ({
  windowMs: options?.windowMs ?? 15 * 60 * 1000, // 15 minutes
  max: options?.max ?? 100, // 100 requests per window
  message: options?.message ?? 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Service-to-service auth middleware
export const serviceAuth = (validServices: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const serviceKey = req.headers['x-service-key'] as string;
    const serviceName = req.headers['x-service-name'] as string;

    if (!serviceKey || serviceKey !== process.env.INTERNAL_SERVICE_KEY) {
      res.status(401).json({ error: 'Invalid service key' });
      return;
    }

    if (!serviceName || !validServices.includes(serviceName)) {
      res.status(403).json({ error: 'Service not authorized' });
      return;
    }

    next();
  };
};
