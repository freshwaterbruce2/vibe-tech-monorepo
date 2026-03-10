import { ProductGrid } from "@/components/products/product-grid";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import type { Product } from "@/types";

export const dynamic = 'force-dynamic';

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

async function searchProducts(query: string): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query } },
        { description: { contains: query } },
        { merchantName: { contains: query } },
      ],
    },
    orderBy: { trendScore: 'desc' },
    take: 50,
  });

  return products.map(p => ({
    ...p,
    price: Number(p.price),
    trendScore: Number(p.trendScore),
    commissionRate: p.commissionRate ? Number(p.commissionRate) : null,
  })) as Product[];
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q ?? "";
  const products = query ? await searchProducts(query) : [];

  return (
    <div className="min-h-screen py-10">
      <div className="container">
        <div className="mb-8">
          <Badge variant="secondary" className="mb-2">
            Search Results
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            {query ? `Results for "${query}"` : "Search Products"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {products.length} products found
          </p>
        </div>

        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <div className="text-center py-20 bg-muted/30 rounded-xl">
            <p className="text-lg text-muted-foreground">
              {query
                ? `No products found matching "${query}"`
                : "Enter a search term above to find products."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
