/**
 * Application configuration for TrendMart
 */

export const config = {
  // Application
  app: {
    name: 'Vibe-shop',
    description: 'Discover trending products with the best deals',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },

  // Trending Engine Settings
  trending: {
    refreshIntervalHours: 24,
    minTrendScore: 20, // Minimum score to include a keyword
    maxProductsPerTrend: 10,
    categories: [
      'electronics',
      'home-garden',
      'fashion',
      'beauty',
      'sports',
      'toys',
      'automotive',
    ],
  },

  // Product Settings
  products: {
    defaultPageSize: 24,
    maxPageSize: 100,
    expirationDays: 7, // Products expire after 7 days without refresh
    minImageWidth: 300,
  },

  // Affiliate Networks
  networks: {
    shareasale: {
      enabled: true,
      apiUrl: 'https://api.shareasale.com/w.cfm',
      affiliateId: process.env.SHAREASALE_AFFILIATE_ID || '',
      apiToken: process.env.SHAREASALE_API_TOKEN || '',
      apiSecret: process.env.SHAREASALE_API_SECRET || '',
    },
    awin: {
      enabled: false,
      apiUrl: 'https://api.awin.com',
      publisherId: process.env.AWIN_PUBLISHER_ID || '',
      apiToken: process.env.AWIN_API_TOKEN || '',
    },
    cj: {
      enabled: false,
      apiUrl: 'https://advertiser-lookup.api.cj.com',
      websiteId: process.env.CJ_WEBSITE_ID || '',
      apiKey: process.env.CJ_API_KEY || '',
    },
  },

  // Trending Data Sources
  trendingSources: {
    serpapi: {
      enabled: true,
      apiKey: process.env.SERPAPI_KEY || '',
      endpoint: 'https://serpapi.com/search',
    },
    googleTrends: {
      enabled: false, // Use SerpAPI instead
    },
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || '',
  },

  // FTC Compliance
  compliance: {
    disclosureText: `As an Amazon Associate and affiliate of other programs, we earn from qualifying purchases. This means we may receive a small commission at no extra cost to you when you purchase through our links.`,
    disclosurePage: '/affiliate-disclosure',
  },

  // Analytics
  analytics: {
    enabled: process.env.NODE_ENV === 'production',
    plausibleDomain: process.env.PLAUSIBLE_DOMAIN || '',
  },
} as const;

export type Config = typeof config;
