/**
 * Environment variable validation using Zod
 * This ensures all required environment variables are present and valid at startup
 */

import { z } from 'zod';

// Define the environment schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Application
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL must be a valid URL')
    .default('http://localhost:3000'),

  // Security
  CRON_SECRET: z.string().min(1, 'CRON_SECRET is required for production').optional(),

  // API Keys - Optional for development (will use mocks)
  SHAREASALE_AFFILIATE_ID: z.string().optional(),
  SHAREASALE_API_TOKEN: z.string().optional(),
  SHAREASALE_API_SECRET: z.string().optional(),

  // AI Service (OpenRouter)
  OPENROUTER_API_KEY: z.string().optional(),

  // Trend Sources
  SERPAPI_KEY: z.string().optional(),
});

// Type for the validated environment
export type Env = z.infer<typeof envSchema>;

// Validate environment variables
function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.issues.map(
      (err: any) => `  - ${err.path.join('.')}: ${err.message}`,
    );

    console.error('❌ Invalid environment variables:\n' + errors.join('\n'));

    // In production, throw an error to prevent the app from starting
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment variables. Check the console for details.');
    }

    // In development, log a warning but continue
    console.warn('⚠️  Running with missing environment variables. Some features may not work.');
  }

  return parsed.data as Env;
}

// Export validated environment
export const env = validateEnv();

// Helper to check if we're in development mode with mock data
export function isMockMode(): boolean {
  return !env.SHAREASALE_API_TOKEN || !env.SHAREASALE_API_SECRET;
}

// Helper to check if AI features are available
export function isAIAvailable(): boolean {
  return !!env.OPENROUTER_API_KEY;
}

// Helper to check if trend discovery is available
export function isTrendDiscoveryAvailable(): boolean {
  return !!env.SERPAPI_KEY;
}
