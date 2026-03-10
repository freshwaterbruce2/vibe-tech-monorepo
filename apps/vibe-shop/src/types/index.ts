/**
 * Core type definitions for Vibe-shop automated store
 */

// ============ Product Types ============

export interface Product {
  id: string;
  externalId: string;
  network: AffiliateNetwork;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  imageUrl: string;
  affiliateLink: string;
  categoryId: string | null;
  trendScore: number;
  commissionRate: number | null;
  merchantName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}

export interface ProductCreateInput {
  externalId: string;
  network: AffiliateNetwork;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  imageUrl: string;
  affiliateLink: string;
  categoryId?: string;
  trendScore?: number;
  commissionRate?: number;
  merchantName: string;
  expiresAt?: Date;
}

// ============ Category Types ============

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
  productCount?: number;
}

// ============ Trending Types ============

export interface TrendingKeyword {
  id: string;
  keyword: string;
  trendScore: number; // 0-100
  categoryId: string | null;
  discoveredAt: Date;
  lastChecked: Date;
}

export interface TrendData {
  keyword: string;
  score: number;
  relatedQueries: string[];
  region: string;
  timeRange: TrendTimeRange;
}

export type TrendTimeRange = '7d' | '30d' | '90d' | '12m';

// ============ Affiliate Network Types ============

export type AffiliateNetwork =
  | 'shareasale'
  | 'awin'
  | 'cj'
  | 'impact'
  | 'amazon';

export interface AffiliateNetworkConfig {
  network: AffiliateNetwork;
  apiKey: string;
  apiSecret?: string;
  affiliateId: string;
  isEnabled: boolean;
}

export interface AffiliateProduct {
  externalId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  productUrl: string;
  merchantName: string;
  categoryName: string;
  commissionRate?: number;
}

// ============ Click Tracking Types ============

export interface ClickEvent {
  id: string;
  productId: string;
  referrer: string | null;
  userAgent: string | null;
  ipHash: string | null;
  clickedAt: Date;
}

// ============ Sync Types ============

export interface SyncLog {
  id: string;
  syncType: SyncType;
  status: SyncStatus;
  productsAdded: number;
  productsRemoved: number;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

export type SyncType = 'trending' | 'products' | 'cleanup' | 'images';
export type SyncStatus = 'running' | 'success' | 'failed' | 'partial';

// ============ API Response Types ============

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
