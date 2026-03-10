import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductDiscoveryEngine } from './ProductDiscoveryEngine';
import type { TrendSource, ProductSource } from '../types';

// Use vi.hoisted to define mocks that can be used in vi.mock factories
const { mockPrisma, mockAI } = vi.hoisted(() => ({
  mockPrisma: {
    syncLog: {
      create: vi.fn(),
      update: vi.fn(),
    },
    trendingKeyword: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
    },
  },
  mockAI: {
    enhanceDescription: vi.fn(),
    classifyProduct: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('../ai', () => ({
  ai: mockAI,
}));

describe('ProductDiscoveryEngine', () => {
  let mockTrendSource: TrendSource;
  let mockProductSource: ProductSource;
  let engine: ProductDiscoveryEngine;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTrendSource = {
      name: 'MockTrendSource',
      getTrendingKeywords: vi.fn().mockResolvedValue([
        {
          keyword: 'smart watch',
          trendScore: 85,
          categoryId: 'electronics',
        },
      ]),
    };

    mockProductSource = {
      name: 'MockProductSource',
      searchProducts: vi.fn().mockResolvedValue([
        {
          externalId: 'prod-1',
          network: 'shareasale',
          name: 'Smart Watch Pro',
          description: 'Advanced smart watch',
          price: 199.99,
          currency: 'USD',
          imageUrl: 'https://example.com/watch.jpg',
          affiliateLink: 'https://example.com/affiliate/1',
          merchantName: 'TechStore',
          commissionRate: 10,
        },
      ]),
    };

    engine = new ProductDiscoveryEngine([mockTrendSource], [mockProductSource]);

    mockPrisma.syncLog.create.mockResolvedValue({ id: 'log-1' });
    mockPrisma.syncLog.update.mockResolvedValue({ id: 'log-1' });
    mockPrisma.trendingKeyword.findFirst.mockResolvedValue(null);
    mockPrisma.trendingKeyword.create.mockResolvedValue({
      id: 'kw-1',
      keyword: 'smart watch',
      trendScore: 85,
    });
    mockPrisma.product.findUnique.mockResolvedValue(null);
    mockPrisma.category.findMany.mockResolvedValue([
      { id: 'electronics', name: 'Electronics' },
    ]);
    mockAI.enhanceDescription.mockResolvedValue('Enhanced description');
    mockAI.classifyProduct.mockResolvedValue('electronics');
  });

  it('creates discovery engine with sources', () => {
    expect(engine).toBeInstanceOf(ProductDiscoveryEngine);
  });

  it('runs discovery process successfully', async () => {
    await engine.runDiscovery();
    expect(mockTrendSource.getTrendingKeywords).toHaveBeenCalled();
    expect(mockPrisma.syncLog.create).toHaveBeenCalled();
  });

  it('saves keywords to database', async () => {
    await engine.runDiscovery();
    expect(mockPrisma.trendingKeyword.create).toHaveBeenCalled();
  });

  it('searches products for high trend score keywords', async () => {
    await engine.runDiscovery();
    expect(mockProductSource.searchProducts).toHaveBeenCalledWith('smart watch', 5);
  });

  it('enhances product descriptions using AI', async () => {
    await engine.runDiscovery();
    expect(mockAI.enhanceDescription).toHaveBeenCalled();
  });
});
