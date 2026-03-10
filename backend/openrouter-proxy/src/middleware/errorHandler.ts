import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  const statusCode = error.response?.status ?? error.statusCode ?? 500;
  const message = error.message ?? 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error.response?.data
    })
  });
}
