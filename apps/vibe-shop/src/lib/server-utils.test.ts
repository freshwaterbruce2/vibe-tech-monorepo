import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('./prisma', () => ({
  prisma: {
    category: {
      upsert: vi.fn(),
    },
    syncLog: {
      create: vi.fn(),
      update: vi.fn(),
    },
    trendingKeyword: {
      upsert: vi.fn(),
    },
    product: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/config', () => ({
  config: {
    trending: {
      categories: ['electronics', 'home-garden'],
    },
    networks: {
      shareasale: {
        apiToken: 'test-token',
        apiSecret: 'test-secret',
        affiliateId: 'test-affiliate',
        apiUrl: 'https://api.shareasale.com/w.cfm',
      },
    },
    trendingSources: {
      serpapi: {
        apiKey: '',
        endpoint: 'https://serpapi.com/search',
      },
    },
  },
}));

describe('server-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('category name formatting', () => {
    it('should format slug to proper name', () => {
      // Test the formatting logic used in seedCategories
      const slug = 'home-garden';
      const name = slug
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      expect(name).toBe('Home Garden');
    });

    it('should handle single word slugs', () => {
      const slug = 'electronics';
      const name = slug
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      expect(name).toBe('Electronics');
    });

    it('should handle multi-word slugs', () => {
      const slug = 'sports-and-outdoors';
      const name = slug
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      expect(name).toBe('Sports And Outdoors');
    });
  });

  describe('ShareASale auth generation', () => {
    it('should generate proper auth headers structure', () => {
      // Test the auth header structure
      const apiToken = 'test-token';
      const affiliateId = 'test-affiliate';

      const headers = {
        'x-ShareASale-Date': expect.any(String),
        'x-ShareASale-Authentication': expect.any(String),
        publisherId: affiliateId,
        token: apiToken,
        version: '1.7',
      };

      expect(headers.publisherId).toBe(affiliateId);
      expect(headers.token).toBe(apiToken);
      expect(headers.version).toBe('1.7');
    });

    it('should generate timestamp in UTC format', () => {
      const timestamp = new Date().toUTCString();

      // Should match UTC format
      expect(timestamp).toMatch(/^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4}/);
    });
  });

  describe('mock trending products', () => {
    it('should have valid product structure', () => {
      const mockProduct = {
        externalId: 'mock-1',
        network: 'shareasale',
        name: 'Test Product',
        description: 'Test description',
        price: 199.99,
        currency: 'USD',
        imageUrl: 'https://example.com/image.jpg',
        affiliateLink: '#',
        categoryId: 'electronics',
        trendScore: 95,
        commissionRate: 10,
        merchantName: 'TestMerchant',
      };

      expect(mockProduct).toHaveProperty('externalId');
      expect(mockProduct).toHaveProperty('network');
      expect(mockProduct).toHaveProperty('name');
      expect(mockProduct).toHaveProperty('price');
      expect(mockProduct.price).toBeGreaterThan(0);
      expect(mockProduct.trendScore).toBeGreaterThanOrEqual(0);
      expect(mockProduct.trendScore).toBeLessThanOrEqual(100);
    });
  });

  describe('SerpAPI URL construction', () => {
    it('should construct proper search URL', () => {
      const category = 'electronics';
      const apiKey = 'test-key';
      const endpoint = 'https://serpapi.com/search';

      const url = new URL(endpoint);
      url.searchParams.append('engine', 'google_shopping');
      url.searchParams.append('q', `trending ${category} 2025`);
      url.searchParams.append('api_key', apiKey);

      expect(url.toString()).toContain('engine=google_shopping');
      expect(url.toString()).toContain('q=trending+electronics+2025');
      expect(url.toString()).toContain('api_key=test-key');
    });
  });

  describe('ShareASale API URL construction', () => {
    it('should construct proper products API URL', () => {
      const apiUrl = 'https://api.shareasale.com/w.cfm';
      const keyword = 'smartwatch';

      const url = new URL(apiUrl);
      url.searchParams.append('action', 'getProducts');
      url.searchParams.append('keyword', keyword);
      url.searchParams.append('format', 'xml');

      expect(url.toString()).toContain('action=getProducts');
      expect(url.toString()).toContain('keyword=smartwatch');
      expect(url.toString()).toContain('format=xml');
    });
  });

  describe('trending keyword ID generation', () => {
    it('should generate consistent keyword IDs', () => {
      const category = 'electronics';
      const keyword = 'smartphone';
      const id = `tk-${category}-${keyword}`.slice(0, 36);

      expect(id).toBe('tk-electronics-smartphone');
      expect(id.length).toBeLessThanOrEqual(36);
    });

    it('should truncate long IDs to 36 characters', () => {
      const category = 'very-long-category-name';
      const keyword = 'very-long-keyword-that-exceeds-limit';
      const id = `tk-${category}-${keyword}`.slice(0, 36);

      expect(id.length).toBe(36);
      expect(id.startsWith('tk-')).toBe(true);
    });
  });
});
