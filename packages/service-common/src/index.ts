// @vibetech/service-common - Shared utilities for microservices

// DeepSeek AI Client
export { 
  DeepSeekClient, 
  createDeepSeekClient,
  type DeepSeekConfig,
  type ChatMessage,
  type CompletionOptions,
} from './deepseek';

// Logger
export { logger, createChildLogger } from './logger';

// Middleware
export {
  requestLogger,
  errorHandler,
  createHealthCheck,
  asyncHandler,
  createRateLimitConfig,
  serviceAuth,
} from './middleware';

// Types
export * from './types';

// Re-export commonly used external types
export { z } from 'zod';
