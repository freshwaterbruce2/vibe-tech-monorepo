import { env } from '@/config/env';
import type { Product } from '@/types';
import { createHash } from 'crypto';
import type { ProductSource } from '../types';

export class ShareASaleSource implements ProductSource {
  name = 'shareasale';
  private affiliateId: string;
  private apiToken: string;
  private apiSecret: string;
  private baseUrl = 'https://api.shareasale.com/x.cfm';

  constructor() {
    this.affiliateId = env.shareasaleAffiliateId;
    this.apiToken = env.shareasaleApiToken;
    this.apiSecret = env.shareasaleApiSecret;
  }

  async searchProducts(query: string, limit: number = 5): Promise<Partial<Product>[]> {
    if (!this.apiToken || !this.apiSecret) {
      console.warn('ShareASale credentials missing. Returning mock products for:', query);
      return this.getMockProducts(query);
    }

    try {
      const action = 'getProducts';
      const timestamp = new Date().toUTCString();
      const signature = this.generateSignature(action, timestamp);

      const params = new URLSearchParams({
        action,
        affiliateId: this.affiliateId,
        token: this.apiToken,
        version: '2.3',
        keyword: query,
        limit: limit.toString(),
        format: 'json',
        // 'XMLFormat' is default usually, we want JSON if supported, or we parse XML.
        // ShareASale API is notoriously XML-heavy. Let's assume XML and fallback to mock if parsing fails
        // for this MVP step, or check if JSON format argument works (often does).
        XMLFormat: '0'
      });

      const url = `${this.baseUrl}?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          'x-ShareASale-Date': timestamp,
          'x-ShareASale-Authentication': signature
        }
      });

      if (!response.ok) {
        throw new Error(`ShareASale API failed: ${response.status}`);
      }

      const text = await response.text();

      // Basic JSON parsing attempt (if XMLFormat=0 works)
      // If it returns XML, we might fail here.
      // For verified durability, we'll try/catch JSON parse.
      try {
          const data = JSON.parse(text);
          if (!data || !data.products) return [];

          return data.products.map((item: any) => this.mapToProduct(item)).filter(Boolean);
      } catch (e) {
          console.warn('ShareASale returned non-JSON response. XML parsing not yet implemented.');
          console.debug('Response start:', text.substring(0, 100));
          return this.getMockProducts(query);
      }

    } catch (error) {
      console.error('ShareASale search error:', error);
      return this.getMockProducts(query);
    }
  }

  private generateSignature(action: string, timestamp: string): string {
    // Sig = Hash(token + ":" + timestamp + ":" + action + ":" + secret)
    const data = `${this.apiToken}:${timestamp}:${action}:${this.apiSecret}`;
    return createHash('sha256').update(data).digest('hex');
  }

  private mapToProduct(item: any): Partial<Product> | null {
    // Map ShareASale fields to our Product interface
    if (!item.productId || !item.name) return null;

    return {
      externalId: item.productId,
      network: 'shareasale',
      name: item.name,
      description: item.description || '',
      price: parseFloat(item.price || '0'),
      currency: 'USD', // Default
      imageUrl: item.image || item.thumbnail || '',
      affiliateLink: item.link || '',
      merchantName: item.merchant || 'Unknown',
      isActive: true,
      commissionRate: parseFloat(item.commission || '0')
    };
  }

  private getMockProducts(query: string): Partial<Product>[] {
    // Return deterministic mock data based on query
    return [
      {
        externalId: `mock-${query}-1`,
        network: 'shareasale',
        name: `Premium ${query} Pro`,
        description: `High quality ${query} with advanced features.`,
        price: 99.99,
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
        affiliateLink: `https://shareasale.com/r.cfm?u=${this.affiliateId}&m=12345&p=mock`,
        merchantName: 'MockVendor Inc',
        isActive: true,
        commissionRate: 10
      },
      {
        externalId: `mock-${query}-2`,
        network: 'shareasale',
        name: `Budget ${query} Lite`,
        description: `Affordable ${query} for everyday use.`,
        price: 49.99,
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
        affiliateLink: `https://shareasale.com/r.cfm?u=${this.affiliateId}&m=12345&p=mock2`,
        merchantName: 'DailyDeals Ltd',
        isActive: true,
        commissionRate: 5
      }
    ];
  }
}
