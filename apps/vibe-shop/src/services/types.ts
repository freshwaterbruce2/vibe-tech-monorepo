import type { Product, TrendingKeyword } from '@/types';

export interface TrendSource {
  name: string;
  getTrendingKeywords(category?: string): Promise<Partial<TrendingKeyword>[]>;
}

export interface ProductSource {
  name: string;
  searchProducts(query: string, limit?: number): Promise<Partial<Product>[]>;
}

export interface TrendEngineConfig {
  minTrendScore: number;
  maxProductsPerTrend: number;
  sources: {
    trends: string[]; // e.g., ['serpapi']
    products: string[]; // e.g., ['shareasale']
  };
}
