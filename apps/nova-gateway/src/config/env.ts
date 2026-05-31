import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const envSchema = z.object({
  PORT: z.coerce.number().default(5005),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  DATABASE_URL: z.string()
    .default('D:\\databases\\nova-gateway.db')
    .refine((val) => {
      // Allow test environment bypass for unit testing sandbox
      if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') return true;
      const normalized = val.replace(/\\/g, '/');
      return normalized.startsWith('D:/');
    }, {
      message: 'Path policy violation: DATABASE_URL must reside on the D:\\ drive (e.g. D:\\databases\\nova-gateway.db).'
    }),
  
  LOG_DIR: z.string()
    .default('D:\\logs\\nova-gateway')
    .refine((val) => {
      // Allow test environment bypass for unit testing sandbox
      if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') return true;
      const normalized = val.replace(/\\/g, '/');
      return normalized.startsWith('D:/');
    }, {
      message: 'Path policy violation: LOG_DIR must reside on the D:\\ drive (e.g. D:\\logs\\nova-gateway).'
    }),
    
  IPC_BRIDGE_URL: z.string().default('ws://localhost:5004'),
  IPC_BRIDGE_SECRET: z.string({
    message: 'IPC_BRIDGE_SECRET is required to establish communication with Nova Agent.'
  }),
  
  NOVA_AGENT_URL: z.string().default('http://localhost:3000'),
  NOVA_AGENT_TOKEN: z.string().optional(),
  
  TELEGRAM_BOT_TOKEN: z.string({
    message: 'TELEGRAM_BOT_TOKEN is required for the Telegram bot adapter.'
  }),
  
  DISCORD_BOT_TOKEN: z.string({
    message: 'DISCORD_BOT_TOKEN is required for the Discord bot adapter.'
  }),
  
  DISCORD_CLIENT_ID: z.string({
    message: 'DISCORD_CLIENT_ID is required for Discord mention detection.'
  }),
  
  WEBHOOK_DOMAIN: z.string().optional(),
  GATEWAY_AUTH_TOKEN: z.string().default('nova_default_secret_token_change_me'),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  // If running in a test suite, we supply mock values to let parser boot if not provided
  const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
  if (isTest) {
    const processEnvClean = Object.fromEntries(
      Object.entries(process.env).filter(([_, v]) => v !== undefined && v !== 'undefined')
    );
    const parsePayload = {
      DATABASE_URL: ':memory:',
      LOG_DIR: './logs',
      IPC_BRIDGE_SECRET: 'mock-secret',
      TELEGRAM_BOT_TOKEN: 'mock-tg-token',
      DISCORD_BOT_TOKEN: 'mock-discord-token',
      DISCORD_CLIENT_ID: 'mock-client-id',
      GATEWAY_AUTH_TOKEN: 'nova_default_secret_token_change_me',
      ...processEnvClean
    };
    try {
      env = envSchema.parse(parsePayload);
    } catch (err) {
      console.error('❌ Zod validation failed in test mode with payload:', JSON.stringify(parsePayload, null, 2));
      throw err;
    }
  } else {
    env = envSchema.parse(process.env);
  }
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment configuration:');
    const issues = error.issues || (error as any).errors || [];
    issues.forEach((err: any) => {
      console.error(`   - ${err.path.join('.')}: ${err.message}`);
    });
  } else {
    console.error('❌ Failed to parse environment variables:', error);
  }
  process.exit(1);
}

export { env };
