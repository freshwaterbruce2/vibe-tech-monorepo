import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:4300'),
  APP_DB_PATH: z.string().default('D:\\databases\\ai-avatar-youtube-saas.db'),
  GCS_CREDENTIALS: z.string().default('{}'),
  GCS_BUCKET_NAME: z.string().default('vibetech-avatar-assets'),
  GEMINI_API_KEY: z.string().optional(),
  FIREBASE_APP_ID: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ID: z.string().optional(),
  RENDER_WORKER_URL: z.string().url().default('http://localhost:8000'),
  REDIS_URL: z.string().default('redis://localhost:6379/0'),
  YOUTUBE_CLIENT_ID: z.string().optional(),
  YOUTUBE_CLIENT_SECRET: z.string().optional(),
  YOUTUBE_REDIRECT_URI: z.string().url().default('http://localhost:4300/api/auth/youtube/callback'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTUP: z.string().optional(),
  STRIPE_PRICE_GROWTH: z.string().optional(),
  STRIPE_PRICE_SAAS_SCALE: z.string().optional(),
  AUTH_SECRET: z.string().min(32).default('change-me-min-32-characters-long'),
  DPOP_SECRET: z.string().min(32).default('change-me-min-32-characters-long'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  if (process.env.SKIP_ENV_VALIDATION !== 'true') {
    throw new Error('Invalid environment variables');
  }
}

export const env: z.infer<typeof envSchema> = parsed.success
  ? parsed.data
  : {
      NODE_ENV: 'development',
      NEXT_PUBLIC_APP_URL: 'http://localhost:4300',
      APP_DB_PATH: 'D:\\databases\\ai-avatar-youtube-saas.db',
      GCS_CREDENTIALS: '{}',
      GCS_BUCKET_NAME: 'vibetech-avatar-assets',
      RENDER_WORKER_URL: 'http://localhost:8000',
      FIREBASE_APP_ID: '1:000000000000:web:0000000000000000000000',
      REDIS_URL: 'redis://localhost:6379/0',
      YOUTUBE_REDIRECT_URI: 'http://localhost:4300/api/auth/youtube/callback',
      AUTH_SECRET: 'change-me-min-32-characters-long',
      DPOP_SECRET: 'change-me-min-32-characters-long',
    };
