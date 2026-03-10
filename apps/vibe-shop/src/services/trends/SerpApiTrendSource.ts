import { env } from '@/config/env';
import type { TrendingKeyword } from '@/types';
import type { TrendSource } from '../types';

interface SerpApiTrendResult {
  query: string;
  value: string; // e.g. "+3,500%"
  extracted_value: number;
  link: string;
  serpapi_link: string;
}

export class SerpApiTrendSource implements TrendSource {
  name = 'serpapi';
  private apiKey: string;
  private baseUrl = 'https://serpapi.com/search.json';

  constructor() {
    this.apiKey = env.serpapiKey;
  }

  async getTrendingKeywords(category: string = 'h'): Promise<Partial<TrendingKeyword>[]> {
    // 'h' is often used for 'Top Charts' or general trends, but let's use 'google_trends_trending_now' engine
    // or standard google_trends with date=now 1-d and type=related_queries for a broad term if needed.
    // For "Daily Trends", engine="google_trends_trending_now" is best.

    if (!this.apiKey) {
      console.warn('SerpApi Key missing. Returning mock trends.');
      return this.getMockTrends();
    }

    try {
      const params = new URLSearchParams({
        engine: 'google_trends_trending_now',
        frequency: 'daily',
        geo: 'US', // Default to US
        api_key: this.apiKey,
      });

      const response = await fetch(`${this.baseUrl}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`SerpApi failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
         throw new Error(`SerpApi error: ${data.error}`);
      }

      // Parse response. Structure typically:
      // daily_searches: [ { query: "topic", traffic: "100K+", articles: [...] }, ... ]

      if (!data.daily_searches) {
          console.log('No daily searches found via SerpApi', Object.keys(data));
          return [];
      }

      return data.daily_searches.map((item: any) => ({
        keyword: item.query,
        trendScore: this.parseTraffic(item.traffic),
        categoryId: null, // We'd need to map this if provided
        discoveredAt: new Date(),
        lastChecked: new Date(),
      }));

    } catch (error) {
      console.error('Failed to fetch trends from SerpApi:', error);
      return this.getMockTrends();
    }
  }

  private parseTraffic(traffic: string): number {
    // e.g. "100K+" -> 100000. normalize to 0-100 scale?
    // Let's just return raw volume log-scaled or capped for "Score"
    // Or just return 100 for top, decrementing?
    // Let's keep it simple: 100 (High), 75 (Med), 50 (Low) based on K+
    if (traffic.includes('M+')) return 100;
    if (traffic.includes('500K+')) return 95;
    if (traffic.includes('200K+')) return 90;
    if (traffic.includes('100K+')) return 85;
    if (traffic.includes('50K+')) return 80;
    return 70;
  }

  private getMockTrends(): Partial<TrendingKeyword>[] {
    return [
      { keyword: 'smart gardening system', trendScore: 95, discoveredAt: new Date() },
      { keyword: 'ai noise cancelling headphones', trendScore: 92, discoveredAt: new Date() },
      { keyword: 'portable espresso maker', trendScore: 88, discoveredAt: new Date() },
      { keyword: 'drone with camera 4k', trendScore: 85, discoveredAt: new Date() },
      { keyword: 'ergonomic standing desk', trendScore: 80, discoveredAt: new Date() },
    ];
  }
}
