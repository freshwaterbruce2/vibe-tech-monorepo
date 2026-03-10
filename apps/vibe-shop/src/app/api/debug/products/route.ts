import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { trendScore: 'desc' },
      take: 20
    });

    const keywords = await prisma.trendingKeyword.findMany({
        orderBy: { trendScore: 'desc' }
    });

    return NextResponse.json({
        productCount: products.length,
        keywordCount: keywords.length,
        products: products.map(p => ({
            name: p.name,
            score: p.trendScore,
            category: p.categoryId
        })),
        keywords: keywords.map(k => ({ keyword: k.keyword, score: k.trendScore }))
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
