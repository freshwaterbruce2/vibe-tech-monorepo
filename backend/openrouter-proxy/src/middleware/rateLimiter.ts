import rateLimit from 'express-rate-limit';

/**
 * Rate limiter to prevent abuse
 * Adjust these values based on your OpenRouter plan
 */
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    error: 'Too many requests',
    message: 'Please slow down and try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});
