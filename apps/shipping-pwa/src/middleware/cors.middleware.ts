/**
 * CORS Middleware Configuration
 * Extracted from server.ts (lines 754-771)
 */

import cors from 'cors';

const allowedOrigins = process.env['NODE_ENV'] === 'production'
  ? (process.env.ALLOWED_ORIGINS?.split(',') ?? [])
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:8080'];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
});
