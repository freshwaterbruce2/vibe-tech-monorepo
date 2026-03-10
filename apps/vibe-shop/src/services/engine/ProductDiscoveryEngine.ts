import { prisma } from '@/lib/prisma';
import type { TrendingKeyword } from '@/types';
import type { ProductSource, TrendSource } from '../types';

import { ai } from '../ai';

// Simple heuristic mapping for MVP - Keeping as fallback or removal candidate
// const CATEGORY_KEYWORDS: Record<string, string[]> = { ... };

export class ProductDiscoveryEngine {
  private trendSources: TrendSource[];
  private productSources: ProductSource[];

  constructor(trendSources: TrendSource[], productSources: ProductSource[]) {
    this.trendSources = trendSources;
    this.productSources = productSources;
  }

  async runDiscovery() {
    console.log('Starting Product Discovery...');
    const logId = await this.startLog('trending');

    try {
      let totalKeywords = 0;
      let totalProducts = 0;

      // 1. Fetch Trends
      for (const source of this.trendSources) {
        console.log(`Fetching trends from ${source.name}...`);
        const keywords = await source.getTrendingKeywords();
        totalKeywords += keywords.length;

        for (const kw of keywords) {
          if (!kw.keyword) continue;

          // Save/Update Keyword
          const savedKw = await this.upsertKeyword(kw);

          // Search Products for high value trends
          if (kw.trendScore && kw.trendScore > 60) {
            const count = await this.findProductsForKeyword(savedKw);
            totalProducts += count;
          }
        }
      }

      await this.completeLog(logId, 'success', totalProducts);
      console.log(
        `Discovery Complete. Processed ${totalKeywords} keywords, Found ${totalProducts} products.`,
      );
    } catch (error) {
      console.error('Discovery Failed:', error);
      await this.completeLog(
        logId,
        'failed',
        0,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async upsertKeyword(kw: Partial<TrendingKeyword>) {
    // Check if exists logic or just upsert?
    // Using Prisma Upsert requires a unique constraint on available fields.
    // We didn't define unique on 'keyword' in schema.prisma? Let me check.
    // Yes, @@index([keyword]) but not unique. Usually keywords should be unique.

    // For now, let's look it up.
    const existing = await prisma.trendingKeyword.findFirst({
      where: { keyword: kw.keyword },
    });

    if (existing) {
      return prisma.trendingKeyword.update({
        where: { id: existing.id },
        data: {
          trendScore: kw.trendScore || existing.trendScore,
          lastChecked: new Date(),
        },
      });
    }

    return prisma.trendingKeyword.create({
      data: {
        keyword: kw.keyword!,
        trendScore: kw.trendScore || 0,
        categoryId: kw.categoryId || null,
      },
    });
  }

  private async findProductsForKeyword(kw: TrendingKeyword): Promise<number> {
    let count = 0;
    for (const source of this.productSources) {
      console.log(`  Searching ${source.name} for "${kw.keyword}"...`);
      const products = await source.searchProducts(kw.keyword, 5); // Start small

      for (const p of products) {
        if (!p.externalId || !p.network) continue;

        // Check dup
        const exists = await prisma.product.findUnique({
          where: {
            network_externalId: {
              network: p.network,
              externalId: p.externalId,
            },
          },
        });

        if (!exists) {
          await prisma.product.create({
            data: {
              externalId: p.externalId,
              network: p.network,
              name: p.name!,
              price: p.price || 0,
              description: await ai.enhanceDescription(p.name || '', p.description || ''),
              currency: p.currency || 'USD',
              imageUrl: p.imageUrl,
              affiliateLink: p.affiliateLink!,
              merchantName: p.merchantName,
              trendScore: kw.trendScore, // Inherit score from keyword
              commissionRate: p.commissionRate,
              categoryId: await this.determineCategory(p.name || '', p.description || ''),
            },
          });
          count++;
        }
      }
    }
    return count;
  }

  private async determineCategory(name: string, desc: string): Promise<string | null> {
    // 1. Fetch available categories
    const dbCategories = await prisma.category.findMany();

    // 2. Use AI for classification
    const aiCategory = await ai.classifyProduct(name, desc, dbCategories);
    if (aiCategory) return aiCategory;

    // 3. Fallback to simple matching (if needed, but for "complete automation" AI is preferred)
    // ... heuristics removed for Vibe-shop modern engine ...

    // Default to first or null if absolutely no match
    return dbCategories.length > 0 ? dbCategories[0]!.id : null;
  }

  private async startLog(type: string) {
    const log = await prisma.syncLog.create({
      data: {
        syncType: type,
        status: 'running',
      },
    });
    return log.id;
  }

  private async completeLog(id: string, status: string, added: number, error?: string) {
    await prisma.syncLog.update({
      where: { id },
      data: {
        status,
        productsAdded: added,
        completedAt: new Date(),
        errorMessage: error,
      },
    });
  }
}
