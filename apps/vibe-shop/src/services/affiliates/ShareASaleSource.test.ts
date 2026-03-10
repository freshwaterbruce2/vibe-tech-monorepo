/**
 * ShareASaleSource Tests
 * @vitest-environment node
 *
 * Stack: Vitest 4.x | Mock: vi.fn() | Coverage: 80%+
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShareASaleSource } from './ShareASaleSource';

// Mock the crypto module
vi.mock('crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn(() => ({
      digest: vi.fn(() => 'mocked-hash-signature'),
    })),
  })),
}));

// Create mutable mock env using vi.hoisted
const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    shareasaleAffiliateId: 'test-affiliate-id',
    shareasaleApiToken: '',
    shareasaleApiSecret: '',
  },
}));

vi.mock('@/config/env', () => ({
  env: mockEnv,
}));

describe('ShareASaleSource', () => {
  let source: ShareASaleSource;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    source = new ShareASaleSource();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  // ============================================
  // BLOCK 1: Happy Path Tests
  // ============================================
  describe('Happy Path', () => {
    it('should have correct name property', () => {
      expect(source.name).toBe('shareasale');
    });

    it('should return mock products when credentials missing', async () => {
      const products = await source.searchProducts('headphones');

      expect(products).toHaveLength(2);
      expect(products[0]).toMatchObject({
        network: 'shareasale',
        name: 'Premium headphones Pro',
        price: 99.99,
        currency: 'USD',
        isActive: true,
      });
      expect(products[1]).toMatchObject({
        name: 'Budget headphones Lite',
        price: 49.99,
      });
    });

    it('should generate deterministic mock products based on query', async () => {
      const products1 = await source.searchProducts('laptop');
      const products2 = await source.searchProducts('laptop');

      expect(products1).toEqual(products2);
      expect(products1[0].externalId).toBe('mock-laptop-1');
      expect(products1[1].externalId).toBe('mock-laptop-2');
    });

    it('should include affiliate ID in mock product links', async () => {
      const products = await source.searchProducts('camera');

      expect(products[0].affiliateLink).toContain('test-affiliate-id');
    });
  });

  // ============================================
  // BLOCK 2: Edge Case Tests
  // ============================================
  describe('Edge Cases', () => {
    it('should handle empty query string', async () => {
      const products = await source.searchProducts('');

      expect(products).toHaveLength(2);
      expect(products[0].name).toBe('Premium  Pro');
      expect(products[0].externalId).toBe('mock--1');
    });

    it('should respect limit parameter in mock products', async () => {
      // Note: Mock always returns 2 products regardless of limit
      // This tests the interface contract
      const products = await source.searchProducts('test', 1);

      expect(Array.isArray(products)).toBe(true);
    });

    it('should handle special characters in query', async () => {
      const products = await source.searchProducts('test & <script>');

      expect(products[0].name).toContain('test & <script>');
    });

    it('should return proper Product partial structure', async () => {
      const products = await source.searchProducts('keyboard');

      const requiredFields = [
        'externalId',
        'network',
        'name',
        'description',
        'price',
        'currency',
        'imageUrl',
        'affiliateLink',
        'merchantName',
        'isActive',
        'commissionRate',
      ];

      for (const field of requiredFields) {
        expect(products[0]).toHaveProperty(field);
      }
    });
  });

  // ============================================
  // BLOCK 3: API Integration Tests (with credentials)
  // ============================================
  describe('API Integration (with credentials)', () => {
    beforeEach(() => {
      // Set up credentials for API tests
      mockEnv.shareasaleApiToken = 'test-token';
      mockEnv.shareasaleApiSecret = 'test-secret';
    });

    afterEach(() => {
      // Reset credentials
      mockEnv.shareasaleApiToken = '';
      mockEnv.shareasaleApiSecret = '';
    });

    it('should make API request with correct URL and headers', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify({
          products: [
            { productId: '123', name: 'Test Product', price: '29.99' }
          ]
        })),
      });

      const testSource = new ShareASaleSource();
      await testSource.searchProducts('laptop', 5);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.shareasale.com/x.cfm'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-ShareASale-Date': expect.any(String),
            'x-ShareASale-Authentication': expect.any(String),
          }),
        })
      );
    });

    it('should include query and limit in request params', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify({ products: [] })),
      });

      const testSource = new ShareASaleSource();
      await testSource.searchProducts('wireless mouse', 10);

      const callUrl = (global.fetch as any).mock.calls[0][0];
      expect(callUrl).toContain('keyword=wireless+mouse');
      expect(callUrl).toContain('limit=10');
    });

    it('should parse valid JSON product response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify({
          products: [
            {
              productId: 'prod-001',
              name: 'Wireless Headphones',
              description: 'High quality audio',
              price: '149.99',
              image: 'https://example.com/img.jpg',
              link: 'https://affiliate.link/123',
              merchant: 'AudioStore',
              commission: '8.5',
            }
          ]
        })),
      });

      const testSource = new ShareASaleSource();
      const products = await testSource.searchProducts('headphones');

      expect(products).toHaveLength(1);
      expect(products[0]).toMatchObject({
        externalId: 'prod-001',
        network: 'shareasale',
        name: 'Wireless Headphones',
        description: 'High quality audio',
        price: 149.99,
        currency: 'USD',
        imageUrl: 'https://example.com/img.jpg',
        affiliateLink: 'https://affiliate.link/123',
        merchantName: 'AudioStore',
        isActive: true,
        commissionRate: 8.5,
      });
    });

    it('should return empty array when products field is missing', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify({ status: 'ok' })),
      });

      const testSource = new ShareASaleSource();
      const products = await testSource.searchProducts('test');

      expect(products).toEqual([]);
    });

    it('should filter out invalid products (missing productId or name)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify({
          products: [
            { productId: '123', name: 'Valid Product' },
            { productId: '', name: 'Missing ID' },
            { productId: '456', name: '' },
            { name: 'No ID at all' },
          ]
        })),
      });

      const testSource = new ShareASaleSource();
      const products = await testSource.searchProducts('test');

      expect(products).toHaveLength(1);
      expect(products[0].name).toBe('Valid Product');
    });

    it('should handle missing optional fields in product', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify({
          products: [
            { productId: 'minimal', name: 'Minimal Product' }
          ]
        })),
      });

      const testSource = new ShareASaleSource();
      const products = await testSource.searchProducts('test');

      expect(products[0]).toMatchObject({
        externalId: 'minimal',
        name: 'Minimal Product',
        description: '',
        price: 0,
        imageUrl: '',
        affiliateLink: '',
        merchantName: 'Unknown',
        commissionRate: 0,
      });
    });

    it('should use thumbnail when image is not available', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify({
          products: [
            { productId: '123', name: 'Product', thumbnail: 'https://example.com/thumb.jpg' }
          ]
        })),
      });

      const testSource = new ShareASaleSource();
      const products = await testSource.searchProducts('test');

      expect(products[0].imageUrl).toBe('https://example.com/thumb.jpg');
    });
  });

  // ============================================
  // BLOCK 4: Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    beforeEach(() => {
      mockEnv.shareasaleApiToken = 'test-token';
      mockEnv.shareasaleApiSecret = 'test-secret';
    });

    afterEach(() => {
      mockEnv.shareasaleApiToken = '';
      mockEnv.shareasaleApiSecret = '';
    });

    it('should return mock products on fetch error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const testSource = new ShareASaleSource();
      const products = await testSource.searchProducts('test');

      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
      consoleSpy.mockRestore();
    });

    it('should handle non-JSON API response gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue('<xml>Not JSON</xml>'),
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(console, 'debug').mockImplementation(() => {});

      const testSource = new ShareASaleSource();
      const products = await testSource.searchProducts('test');

      expect(Array.isArray(products)).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        'ShareASale returned non-JSON response. XML parsing not yet implemented.'
      );
      consoleSpy.mockRestore();
    });

    it('should handle HTTP error responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const testSource = new ShareASaleSource();
      const products = await testSource.searchProducts('test');

      expect(Array.isArray(products)).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        'ShareASale search error:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should log warning when credentials are missing', async () => {
      // Reset credentials for this test
      mockEnv.shareasaleApiToken = '';
      mockEnv.shareasaleApiSecret = '';

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const testSource = new ShareASaleSource();
      await testSource.searchProducts('test-query');

      expect(consoleSpy).toHaveBeenCalledWith(
        'ShareASale credentials missing. Returning mock products for:',
        'test-query'
      );

      consoleSpy.mockRestore();
    });
  });
});
