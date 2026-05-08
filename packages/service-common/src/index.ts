// @vibetech/service-common - Shared utilities for microservices

// DeepSeek AI Client
export { 
  DeepSeekClient, 
  createDeepSeekClient,
  type DeepSeekConfig,
  type ChatMessage,
  type CompletionOptions,
} from './deepseek.js';

// Logger
export { logger, createChildLogger } from './logger.js';

// Middleware
export {
  requestLogger,
  errorHandler,
  createHealthCheck,
  asyncHandler,
  createRateLimitConfig,
  serviceAuth,
} from './middleware.js';

// Types
export * from './types.js';

// Re-export commonly used external types
export { z } from 'zod';
