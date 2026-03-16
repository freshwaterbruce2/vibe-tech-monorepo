import type { AxiosError } from 'axios';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface HttpErrorShape {
  message?: string;
  stack?: string;
  statusCode?: number;
  response?: AxiosError['response'];
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const httpError = (error ?? {}) as HttpErrorShape;

  logger.error('Request error', {
    error: httpError.message,
    stack: httpError.stack,
    path: req.path,
    method: req.method
  });

  const statusCode = httpError.response?.status ?? httpError.statusCode ?? 500;
  const message = httpError.message ?? 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: httpError.stack,
      details: httpError.response?.data
    })
  });
}
