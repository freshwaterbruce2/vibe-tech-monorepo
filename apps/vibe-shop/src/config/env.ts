/**
 * Environment variable validation
 */

const requiredEnvVars = [
  // Add required vars as you enable features
] as const;

const optionalEnvVars = [
  'NEXT_PUBLIC_APP_URL',
  'DATABASE_URL',
  'SHAREASALE_AFFILIATE_ID',
  'SHAREASALE_API_TOKEN',
  'SHAREASALE_API_SECRET',
  'AWIN_PUBLISHER_ID',
  'AWIN_API_TOKEN',
  'CJ_WEBSITE_ID',
  'CJ_API_KEY',
  'SERPAPI_KEY',
  'PLAUSIBLE_DOMAIN',
] as const;

export function validateEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    console.warn(`Environment variable ${key} is not set`);
    return '';
  }
  return value;
}

// Type-safe environment access
export const env = {
  // App
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',

  // ShareASale
  shareasaleAffiliateId: process.env.SHAREASALE_AFFILIATE_ID || '',
  shareasaleApiToken: process.env.SHAREASALE_API_TOKEN || '',
  shareasaleApiSecret: process.env.SHAREASALE_API_SECRET || '',

  // Awin
  awinPublisherId: process.env.AWIN_PUBLISHER_ID || '',
  awinApiToken: process.env.AWIN_API_TOKEN || '',

  // CJ Affiliate
  cjWebsiteId: process.env.CJ_WEBSITE_ID || '',
  cjApiKey: process.env.CJ_API_KEY || '',

  // SerpAPI (for Google Trends)
  serpapiKey: process.env.SERPAPI_KEY || '',

  // Analytics
  plausibleDomain: process.env.PLAUSIBLE_DOMAIN || '',
} as const;
