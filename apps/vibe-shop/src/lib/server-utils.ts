import { config } from "@/config";
import crypto from "crypto";
import { prisma } from "./prisma";

/**
 * Ensures all categories from config exist in the database
 */
export async function seedCategories() {
  console.log("Seeding categories...");
  const categories = config.trending.categories;

  for (const slug of categories) {
    const name = slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    await prisma.category.upsert({
      where: { slug },
      update: { name },
      create: {
        slug,
        name,
      },
    });
  }
  console.log("Categories seeded successfully.");
}

/**
 * Mock data for product synchronization when API keys are missing
 */
const MOCK_TRENDING_PRODUCTS = [
  {
    externalId: "mock-1",
    network: "shareasale",
    name: "AI-Powered Smart Watch Series X",
    description: "The latest in wearable technology with integrated AI assistant",
    price: 199.99,
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
    affiliateLink: "#",
    categoryId: "electronics",
    trendScore: 95,
    commissionRate: 10,
    merchantName: "TechFuture",
  },
  {
    externalId: "mock-2",
    network: "shareasale",
    name: "Ergonomic Standing Desk Pro",
    description: "Height-adjustable desk with memory presets for a healthier workspace",
    price: 349.00,
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=400&h=400&fit=crop",
    affiliateLink: "#",
    categoryId: "home-garden",
    trendScore: 88,
    commissionRate: 5,
    merchantName: "WorkWell",
  }
];

interface AffiliateProduct {
  externalId: string;
  network: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  affiliateLink: string;
  categoryId: string;
  trendScore: number;
  commissionRate?: number;
  merchantName: string;
}

/**
 * Generates authentication headers for the ShareASale API
 */
function generateShareASaleAuth(action: string): Record<string, string> | null {
  const { apiToken, apiSecret, affiliateId } = config.networks.shareasale;
  if (!apiToken || !apiSecret || !affiliateId) return null;

  const timestamp = new Date().toUTCString();
  const sigString = `${apiToken}:${timestamp}:${action}:${apiSecret}`;
  const signature = crypto.createHash("sha256").update(sigString).digest("hex").toUpperCase();

  return {
    "x-ShareASale-Date": timestamp,
    "x-ShareASale-Authentication": signature,
    "publisherId": affiliateId,
    "token": apiToken,
    "version": "1.7",
  };
}

/**
 * Fetches trending keywords from SerpAPI based on a category
 */
async function fetchTrendingKeywords(category: string): Promise<string[]> {
  const { apiKey, endpoint } = config.trendingSources.serpapi;
  if (!apiKey) return [];

  console.log(`Fetching trends for ${category}...`);
  try {
    const url = new URL(endpoint);
    url.searchParams.append("engine", "google_shopping");
    url.searchParams.append("q", `trending ${category} 2025`);
    url.searchParams.append("api_key", apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    const keywords = data.shopping_results
      ?.slice(0, 5)
      .map((item: unknown) => (item as { title: string }).title) ?? [];

    return keywords;
  } catch (error) {
    console.error(`SerpAPI failed for ${category}:`, error);
    return [];
  }
}

/**
 * Fetches products from ShareASale for a specific keyword
 */
async function fetchAffiliateProducts(keyword: string): Promise<AffiliateProduct[]> {
  const headers = generateShareASaleAuth("getProducts");
  if (!headers) return [];

  console.log(`Searching ShareASale for: ${keyword}`);
  try {
    const url = new URL(config.networks.shareasale.apiUrl);
    url.searchParams.append("action", "getProducts");
    url.searchParams.append("keyword", keyword);
    url.searchParams.append("format", "xml"); // XML is more reliable for w.cfm

    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      console.warn(`ShareASale API returned ${response.status} for ${keyword}`);
    }
    // Note: Parsing XML in Node can be verbose, simplified for this skeleton
    // In production, use an XML parser like 'xml2js'
    return [];
  } catch (error) {
    console.error(`ShareASale failed for ${keyword}:`, error);
    return [];
  }
}

/**
 * Primary synchronization orchestrator
 */
export async function syncProducts() {
  console.log("Starting product sync...");

  try {
    // 1. Log the sync attempt
    const syncLog = await prisma.syncLog.create({
      data: {
        syncType: 'products',
        status: 'running',
        startedAt: new Date(),
      }
    });

    const hasKeys = !!(config.networks.shareasale.apiToken && config.trendingSources.serpapi.apiKey);
    let syncedCount = 0;

    if (hasKeys) {
      const categories = config.trending.categories;
      for (const cat of categories) {
        const keywords = await fetchTrendingKeywords(cat);
        for (const kw of keywords) {
          // Save keyword
          await prisma.trendingKeyword.upsert({
            where: { id: `tk-${cat}-${kw}`.slice(0, 36) },
            update: { trendScore: 80, lastChecked: new Date() },
            create: { keyword: kw, trendScore: 80, categoryId: cat }
          });

          // Fetch and store products (Real API)
          const products = await fetchAffiliateProducts(kw);
          for (const prod of products) {
            await prisma.product.upsert({
              where: { network_externalId: { network: prod.network, externalId: prod.externalId } },
              update: { ...prod, isActive: true, updatedAt: new Date() },
              create: { ...prod, isActive: true },
            });
            syncedCount++;
          }
        }
      }
    } else {
      console.log("No API keys found, using mock data...");
      for (const prod of MOCK_TRENDING_PRODUCTS) {
        await prisma.product.upsert({
          where: {
            network_externalId: {
              network: prod.network,
              externalId: prod.externalId
            }
          },
          update: { ...prod, isActive: true, updatedAt: new Date() },
          create: { ...prod, isActive: true },
        });
        syncedCount++;
      }
    }

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'success',
        completedAt: new Date(),
        productsAdded: syncedCount,
      }
    });

    console.log(`Product sync completed. Synced ${syncedCount} products.`);
    return { success: true, count: syncedCount };
  } catch (error) {
    console.error("Product sync failed:", error);
    return { success: false, error };
  }
}
