/**
 * Global Error Handler Middleware
 * Extracted from server.ts (lines 2054-2063)
 *
 * Must be registered AFTER all routes
 */

import type { Request, Response, NextFunction } from 'express';

interface ErrorHandlerDependencies {
  healthService: any; // Will be typed when HealthService is extracted
}

export function createErrorHandler(deps: ErrorHandlerDependencies) {
  return (error: Error, req: Request, res: Response, _next: NextFunction) => {
    deps.healthService.incrementError();
    console.error('Unhandled error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: process.env['NODE_ENV'] === 'development' ? error.message : 'Something went wrong',
      timestamp: new Date().toISOString()
    });
  };
}
